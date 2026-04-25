/**
 * Transfer Manager — High-level orchestrator for P2P file transfers.
 * 
 * Coordinates between Socket.IO signaling and WebRTC DataChannels.
 * Manages the full transfer lifecycle: session creation → signaling →
 * WebRTC connection → file transfer → completion.
 * 
 * Also handles speed calculation, ETA estimation, and resume logic.
 */

import { connectSocket, disconnectSocket } from './socket';
import { createPeerConnection, createDataChannel, sendFile, receiveFile } from './webrtc';
import { DEFAULT_CHUNK_SIZE } from './fileChunker';
import { generateKey, exportKey, importKey, encryptChunk, decryptChunk } from './encryption';

const getDynamicServerUrl = () => {
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:3001`;
    }
    return 'http://localhost:3001';
};

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || getDynamicServerUrl();

/** Transfer states */
export const TRANSFER_STATES = {
    IDLE: 'idle',
    CREATING_SESSION: 'creating_session',
    WAITING_FOR_PEER: 'waiting_for_peer',
    CONNECTING: 'connecting',
    TRANSFERRING: 'transferring',
    COMPLETE: 'complete',
    ERROR: 'error',
    CANCELLED: 'cancelled',
};

/**
 * Create a new transfer session and set up as sender.
 * 
 * @param {File} file - The file to send
 * @param {object} options
 * @param {string} [options.password] - Password for protected link
 * @param {boolean} [options.encrypt=true] - Enable E2E encryption
 * @param {function} options.onStateChange - State change callback
 * @param {function} options.onProgress - Progress callback
 * @returns {Promise<object>} { sessionId, shareLink, encryptionKey, cleanup }
 */
export async function createTransfer(file, options = {}) {
    const { password, encrypt = true, onStateChange, onProgress } = options;
    let peerConnection = null;
    let dataChannel = null;
    let encryptionKey = null;
    let keyString = '';

    onStateChange?.(TRANSFER_STATES.CREATING_SESSION);

    try {
        // 1. Create session on server
        const response = await fetch(`${SERVER_URL}/api/sessions`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                fileName: file.name,
                fileSize: file.size,
                fileType: file.type,
                password,
            }),
        });

        if (!response.ok) throw new Error('Failed to create session');
        const { sessionId, shareLink } = await response.json();

        // 2. Generate encryption key if enabled
        if (encrypt) {
            encryptionKey = await generateKey();
            keyString = await exportKey(encryptionKey);
        }

        // 3. Connect to signaling server
        const socket = connectSocket();

        onStateChange?.(TRANSFER_STATES.WAITING_FOR_PEER);

        const startHandshake = async () => {
            // Guard: prevent duplicate handshakes if peer-joined fires multiple times
            if (peerConnection && peerConnection.signalingState !== 'closed') {
                console.log('[Transfer] Peer connection already exists, ignoring duplicate peer-joined');
                return;
            }

            onStateChange?.(TRANSFER_STATES.CONNECTING);

            try {
                // Create peer connection
                peerConnection = await createPeerConnection();

                // Create data channel
                dataChannel = createDataChannel(peerConnection);

                // Handle ICE candidates
                peerConnection.onicecandidate = (event) => {
                    if (event.candidate) {
                        socket.emit('ice-candidate', { sessionId, candidate: event.candidate });
                    }
                };

                // When data channel opens, start sending
                dataChannel.onopen = async () => {
                    console.log('[Transfer] DataChannel open — starting file transfer');
                    onStateChange?.(TRANSFER_STATES.TRANSFERRING);

                    try {
                        const encryption = encrypt ? { encrypt: encryptChunk, key: encryptionKey } : null;

                        // Speed & ETA tracking
                        const speedTracker = createSpeedTracker();

                        await sendFile(file, dataChannel, DEFAULT_CHUNK_SIZE, (progress) => {
                            const { speed, eta } = speedTracker.update(progress.sent, file.size);
                            onProgress?.({
                                ...progress,
                                speed,
                                eta,
                            });
                        }, 0, encryption);

                        onStateChange?.(TRANSFER_STATES.COMPLETE);
                    } catch (err) {
                        console.error('[Transfer] Send error:', err);
                        onStateChange?.(TRANSFER_STATES.ERROR);
                    }
                };

                // Create and send offer
                const offer = await peerConnection.createOffer();
                await peerConnection.setLocalDescription(offer);
                socket.emit('offer', { sessionId, offer });

            } catch (err) {
                console.error('[Transfer] WebRTC setup error:', err);
                onStateChange?.(TRANSFER_STATES.ERROR);
            }
        };

        // Track state for ICE candidate queueing
        let pendingCandidates = [];
        let hasRemoteDescription = false;

        // 4. Join the room as sender
        const joinAsSender = () => {
            socket.emit('join-room', { sessionId, role: 'sender' }, (response) => {
                if (response?.error) {
                    onStateChange?.(TRANSFER_STATES.ERROR);
                    console.error('[Transfer] Join error:', response.error);
                    return;
                }
                
                // If receiver is already connected (e.g. we just woke up from background)
                if (response?.receiverConnected) {
                    console.log('[Transfer] Receiver already present, initiating handshake...');
                    startHandshake();
                }
            });
        };

        joinAsSender();

        const onReconnect = () => {
            console.log('[Transfer] Socket reconnected, re-joining room...');
            joinAsSender();
        };
        socket.on('connect', onReconnect);

        // 5. When receiver joins, start WebRTC handshake
        socket.on('peer-joined', async ({ role }) => {
            if (role !== 'receiver') return;
            startHandshake();
        });

        // 6. Handle answer from receiver
        socket.on('answer', async ({ answer }) => {
            try {
                // Only set remote description if we're expecting an answer
                if (!peerConnection || peerConnection.signalingState !== 'have-local-offer') {
                    console.log('[Transfer] Ignoring answer — signalingState:', peerConnection?.signalingState);
                    return;
                }
                await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
                hasRemoteDescription = true;

                // Process any candidates that arrived before the remote description was set
                for (const candidate of pendingCandidates) {
                    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => 
                        console.error('[Transfer] Error adding queued ICE candidate:', err)
                    );
                }
                pendingCandidates = [];
            } catch (err) {
                console.error('[Transfer] Error setting remote description:', err);
            }
        });

        // 7. Handle ICE candidates from receiver
        socket.on('ice-candidate', async ({ candidate }) => {
            try {
                if (peerConnection && candidate) {
                    if (!hasRemoteDescription) {
                        pendingCandidates.push(candidate);
                    } else {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                    }
                }
            } catch (err) {
                console.error('[Transfer] Error adding ICE candidate:', err);
            }
        });

        // 8. Handle peer disconnect
        socket.on('peer-disconnected', ({ role }) => {
            if (role === 'receiver') {
                console.log('[Transfer] Receiver disconnected');
            }
        });

        // Cleanup function
        const cleanup = () => {
            dataChannel?.close();
            peerConnection?.close();
            socket.off('connect', onReconnect);
            socket.off('peer-joined');
            socket.off('answer');
            socket.off('ice-candidate');
            socket.off('peer-disconnected');
        };

        return {
            sessionId,
            shareLink,
            encryptionKey: keyString,
            cleanup,
        };

    } catch (err) {
        console.error('[Transfer] Error:', err);
        onStateChange?.(TRANSFER_STATES.ERROR);
        throw err;
    }
}

/**
 * Join an existing transfer session as receiver.
 * 
 * @param {string} sessionId - The session to join
 * @param {object} options
 * @param {string} [options.password] - Password if required
 * @param {string} [options.encryptionKey] - Base64url-encoded key for decryption
 * @param {function} options.onStateChange - State change callback
 * @param {function} options.onProgress - Progress callback
 * @param {function} options.onComplete - Called with { blob, fileName, fileSize }
 * @returns {Promise<object>} { cleanup }
 */
export async function joinTransfer(sessionId, options = {}) {
    const { password, encryptionKey, onStateChange, onProgress, onComplete } = options;
    let peerConnection = null;

    onStateChange?.(TRANSFER_STATES.CONNECTING);

    try {
        // 1. Connect to signaling server
        const socket = connectSocket();

        // 2. Import decryption key if provided
        let decryptionKey = null;
        if (encryptionKey) {
            decryptionKey = await importKey(encryptionKey);
        }

        // 3. Join room as receiver
        return new Promise((resolve, reject) => {
            let hasJoined = false;

            const joinAsReceiver = () => {
                socket.emit('join-room', { sessionId, role: 'receiver', password }, (response) => {
                    if (response?.error) {
                        onStateChange?.(TRANSFER_STATES.ERROR);
                        // Only reject on the first time round
                        if (!hasJoined) reject(new Error(response.error));
                        return;
                    }
                    
                    hasJoined = true;
                    // Switch to WAITING_FOR_PEER if we haven't received an offer yet
                    // Don't downgrade state if we are already transferring!
                    if (!peerConnection) {
                        onStateChange?.(TRANSFER_STATES.WAITING_FOR_PEER);
                    }
                });
            };

            joinAsReceiver();

            const onReconnect = () => {
                console.log('[Transfer] Receiver socket reconnected, re-joining room...');
                joinAsReceiver();
            };
            socket.on('connect', onReconnect);

            let pendingCandidates = [];
            let hasRemoteDescription = false;

            // 4. Handle offer from sender
            socket.on('offer', async ({ offer }) => {
                try {
                    onStateChange?.(TRANSFER_STATES.CONNECTING);

                    peerConnection = await createPeerConnection();

                    // Handle ICE candidates
                    peerConnection.onicecandidate = (event) => {
                        if (event.candidate) {
                            socket.emit('ice-candidate', { sessionId, candidate: event.candidate });
                        }
                    };

                    // Handle incoming data channel
                    peerConnection.ondatachannel = (event) => {
                        const channel = event.channel;
                        console.log('[Transfer] DataChannel received:', channel.label);

                        channel.onopen = () => {
                            console.log('[Transfer] DataChannel open — ready to receive');
                            onStateChange?.(TRANSFER_STATES.TRANSFERRING);
                        };

                        const decryption = decryptionKey
                            ? { decrypt: decryptChunk, key: decryptionKey }
                            : null;

                        const speedTracker = createSpeedTracker();

                        receiveFile(
                            channel,
                            (progress) => {
                                const total = progress.total || 0;
                                const { speed, eta } = speedTracker.update(progress.received, total);
                                onProgress?.({ ...progress, speed, eta });
                            },
                            (result) => {
                                onStateChange?.(TRANSFER_STATES.COMPLETE);
                                onComplete?.(result);
                            },
                            (err) => {
                                onStateChange?.(TRANSFER_STATES.ERROR);
                                console.error('[Transfer] Receive error:', err);
                            },
                            decryption
                        );
                    };

                    // Set remote description and create answer
                    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
                    hasRemoteDescription = true;

                    // Process queued ICE candidates now that remote description is set
                    for (const candidate of pendingCandidates) {
                        await peerConnection.addIceCandidate(new RTCIceCandidate(candidate)).catch(err => 
                            console.error('[Transfer] Error adding queued ICE candidate:', err)
                        );
                    }
                    pendingCandidates = [];

                    const answer = await peerConnection.createAnswer();
                    await peerConnection.setLocalDescription(answer);
                    socket.emit('answer', { sessionId, answer });

                } catch (err) {
                    console.error('[Transfer] Error handling offer:', err);
                    onStateChange?.(TRANSFER_STATES.ERROR);
                }
            });

            // 5. Handle ICE candidates from sender
            socket.on('ice-candidate', async ({ candidate }) => {
                try {
                    if (candidate) {
                        if (!peerConnection || !hasRemoteDescription) {
                            pendingCandidates.push(candidate);
                        } else {
                            await peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
                        }
                    }
                } catch (err) {
                    console.error('[Transfer] Error adding ICE candidate:', err);
                }
            });

            // 6. Handle peer disconnect
            socket.on('peer-disconnected', ({ role }) => {
                if (role === 'sender') {
                    console.log('[Transfer] Sender disconnected');
                }
            });

            // Cleanup
            const cleanup = () => {
                peerConnection?.close();
                socket.off('connect', onReconnect);
                socket.off('offer');
                socket.off('ice-candidate');
                socket.off('peer-disconnected');
            };

            resolve({ cleanup });
        });

    } catch (err) {
        console.error('[Transfer] Join error:', err);
        onStateChange?.(TRANSFER_STATES.ERROR);
        throw err;
    }
}

// ─── Speed & ETA Tracking ───────────────────────────────────────

/**
 * Create a speed tracker for calculating transfer speed and ETA.
 * Uses a sliding window for smooth speed calculation.
 */
function createSpeedTracker() {
    const samples = [];
    const WINDOW_SIZE = 10; // Number of samples for averaging
    let lastBytes = 0;
    let lastTime = Date.now();

    return {
        /**
         * Update with current bytes transferred.
         * @param {number} bytesTransferred 
         * @param {number} totalBytes
         * @returns {{ speed: number, eta: number }} speed in bytes/sec, eta in seconds
         */
        update(bytesTransferred, totalBytes = 0) {
            const now = Date.now();
            const elapsed = (now - lastTime) / 1000;

            if (elapsed > 0.1) { // Sample at most every 100ms
                const bytesPerSec = (bytesTransferred - lastBytes) / Math.max(0.001, elapsed);
                samples.push(bytesPerSec);
                if (samples.length > WINDOW_SIZE) samples.shift();
                lastBytes = bytesTransferred;
                lastTime = now;
            }

            // Average speed over the window
            const avgSpeed = samples.length > 0
                ? samples.reduce((a, b) => a + b, 0) / samples.length
                : 0;

            // ETA calculation
            const remaining = Math.max(0, totalBytes - bytesTransferred);
            const eta = (avgSpeed > 0 && remaining > 0) ? (remaining / avgSpeed) : 0;

            return { speed: avgSpeed, eta };
        },
    };
}
