/**
 * WebRTC Manager — Core P2P connection and data channel management.
 * 
 * Handles the full WebRTC lifecycle:
 * 1. Create RTCPeerConnection with STUN servers
 * 2. Create/receive DataChannel for file transfer
 * 3. Send files as chunked ArrayBuffers with flow control
 * 4. Receive and reassemble chunks
 * 5. Handle connection state changes and errors
 * 
 * Flow control uses bufferedAmountLowThreshold to prevent
 * overwhelming the DataChannel buffer for large file transfers.
 */

/** STUN servers for NAT traversal */
const ICE_SERVERS = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
];

/** DataChannel buffer threshold for flow control (1MB) */
const BUFFER_THRESHOLD = 1 * 1024 * 1024;

/** Maximum buffer before pausing sends (4MB) */
const MAX_BUFFER_SIZE = 4 * 1024 * 1024;

/**
 * Create a configured RTCPeerConnection, fetching ICE servers (TURN) from the backend.
 * @returns {Promise<RTCPeerConnection>}
 */
export async function createPeerConnection() {
    let iceServers = ICE_SERVERS; // Start with default STUN

    try {
        // Build the correct API URL regardless of where Next.js is running (client or SSR)
        const getDynamicServerUrl = () => {
            if (typeof window !== 'undefined') {
                return `http://${window.location.hostname}:3001`;
            }
            return 'http://localhost:3001';
        };
        const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || getDynamicServerUrl();

        // Fetch TURN credentials
        const response = await fetch(`${SERVER_URL}/api/ice-servers`);
        if (response.ok) {
            const turnServers = await response.json();
            if (turnServers && turnServers.length > 0) {
                iceServers = [...ICE_SERVERS, ...turnServers];
                console.log('[WebRTC] Fetched TURN servers successfully');
            }
        }
    } catch (err) {
        console.warn('[WebRTC] Failed to fetch TURN credentials, falling back to STUN only', err);
    }

    const pc = new RTCPeerConnection({
        iceServers: iceServers,
        iceCandidatePoolSize: 10,
    });

    pc.addEventListener('connectionstatechange', () => {
        console.log('[WebRTC] Connection state:', pc.connectionState);
    });

    pc.addEventListener('iceconnectionstatechange', () => {
        console.log('[WebRTC] ICE state:', pc.iceConnectionState);
    });

    return pc;
}

/**
 * Create a DataChannel on the peer connection (sender side).
 * @param {RTCPeerConnection} pc 
 * @param {string} label - Channel label
 * @returns {RTCDataChannel}
 */
export function createDataChannel(pc, label = 'fileTransfer') {
    const channel = pc.createDataChannel(label, {
        ordered: true
    });

    channel.binaryType = 'arraybuffer';
    channel.bufferedAmountLowThreshold = BUFFER_THRESHOLD;

    return channel;
}

/**
 * Send a file through a WebRTC DataChannel with flow control.
 * 
 * @param {File} file - The file to send
 * @param {RTCDataChannel} channel - The DataChannel
 * @param {number} chunkSize - Size of each chunk in bytes
 * @param {function} onProgress - Progress callback
 * @param {number} [startChunk=0] - Starting chunk index (for resume)
 * @param {object} [encryption=null] - { encrypt: fn, key: CryptoKey }
 * @returns {Promise<void>}
 */
export function sendFile(file, channel, chunkSize, onProgress, startChunk = 0, encryption = null) {
    return new Promise((resolve, reject) => {
        const totalChunks = Math.ceil(file.size / chunkSize);
        let chunkIndex = startChunk;
        let cancelled = false;

        // Progress interval: small files every chunk, large files every 10
        const progressInterval = totalChunks <= 20 ? 1 : totalChunks <= 100 ? 5 : 10;

        const onClose = () => { cancelled = true; };
        channel.addEventListener('close', onClose);

        // Send file metadata first
        const metadata = JSON.stringify({
            type: 'file-meta',
            fileName: file.name,
            fileSize: file.size,
            fileType: file.type,
            chunkSize,
            totalChunks,
            startChunk,
            encrypted: !!encryption,
        });

        if (channel.readyState !== 'open') {
            channel.removeEventListener('close', onClose);
            reject(new Error('DataChannel not open'));
            return;
        }
        channel.send(metadata);

        async function sendNextChunk() {
            while (chunkIndex < totalChunks) {
                if (cancelled || channel.readyState !== 'open') {
                    channel.removeEventListener('close', onClose);
                    reject(new Error('DataChannel closed during transfer'));
                    return;
                }

                // Flow control: wait for buffer to drain
                if (channel.bufferedAmount > MAX_BUFFER_SIZE) {
                    await new Promise((res) => {
                        const timeout = setTimeout(() => {
                            channel.onbufferedamountlow = null;
                            res();
                        }, 10000);
                        channel.onbufferedamountlow = () => {
                            clearTimeout(timeout);
                            channel.onbufferedamountlow = null;
                            res();
                        };
                    });
                    continue;
                }

                // Read and optionally encrypt chunk
                const start = chunkIndex * chunkSize;
                const end = Math.min(start + chunkSize, file.size);
                const blob = file.slice(start, end);
                let chunkData = await blob.arrayBuffer();

                if (encryption) {
                    const { iv, ciphertext } = await encryption.encrypt(encryption.key, chunkData);
                    const packed = new Uint8Array(iv.length + ciphertext.byteLength);
                    packed.set(iv, 0);
                    packed.set(new Uint8Array(ciphertext), iv.length);
                    chunkData = packed.buffer;
                }

                if (channel.readyState !== 'open') {
                    channel.removeEventListener('close', onClose);
                    reject(new Error('DataChannel closed during transfer'));
                    return;
                }
                channel.send(chunkData);
                chunkIndex++;

                // Report progress
                if (chunkIndex % progressInterval === 0 || chunkIndex === totalChunks) {
                    const sent = Math.min(chunkIndex * chunkSize, file.size);
                    onProgress?.({
                        sent,
                        total: file.size,
                        percentage: Math.round((sent / file.size) * 100),
                        chunkIndex,
                        totalChunks,
                    });
                }

                // Yield to event loop periodically
                if (chunkIndex % 100 === 0) {
                    await new Promise((res) => setTimeout(res, 0));
                }
            }

            // Wait for ALL buffered data to drain before signaling completion
            await waitForDrain(channel);

            // Extra safety delay
            await new Promise((res) => setTimeout(res, 300));

            // Send completion signal
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify({
                    type: 'file-complete',
                    totalChunksSent: chunkIndex,
                }));
            }

            // Wait for completion signal to leave buffer
            await waitForDrain(channel);

            channel.removeEventListener('close', onClose);
            resolve();
        }

        sendNextChunk().catch((err) => {
            channel.removeEventListener('close', onClose);
            reject(err);
        });
    });
}

/**
 * Wait for DataChannel buffer to fully drain.
 */
function waitForDrain(channel) {
    return new Promise((resolve) => {
        const check = () => {
            if (channel.readyState !== 'open' || channel.bufferedAmount === 0) {
                resolve();
            } else {
                setTimeout(check, 50);
            }
        };
        check();
    });
}

/** How many chunks to accumulate before merging into a Blob */
const MERGE_INTERVAL = 500;

/**
 * Receive a file through a WebRTC DataChannel.
 * 
 * Uses SYNCHRONOUS processing for non-encrypted transfers (no Promise chain).
 * Only queues messages asynchronously when decryption is needed.
 * 
 * @param {RTCDataChannel} channel
 * @param {function} onProgress
 * @param {function} onComplete - Called with { blob, fileName, fileSize }
 * @param {function} onError
 * @param {object} [decryption=null] - { decrypt: fn, key: CryptoKey }  
 */
export function receiveFile(channel, onProgress, onComplete, onError, decryption = null) {
    let metadata = null;
    const mergedBlobs = [];
    let pendingChunks = [];
    let receivedSize = 0;
    let chunkCount = 0;
    let fileCompleteReceived = false;
    let expectedTotalChunks = null;
    let finalized = false;

    channel.binaryType = 'arraybuffer';

    function flushChunks() {
        if (pendingChunks.length === 0) return;
        mergedBlobs.push(new Blob(pendingChunks));
        pendingChunks = [];
    }

    function tryFinalize() {
        if (finalized) return;
        const totalExpected = expectedTotalChunks || metadata?.totalChunks;
        if (!totalExpected || chunkCount < totalExpected) {
            return;
        }

        finalized = true;
        console.log(`[WebRTC] ✅ Transfer complete! ${chunkCount}/${totalExpected} chunks, ${receivedSize} bytes`);
        flushChunks();
        const blob = new Blob(mergedBlobs, {
            type: metadata?.fileType || 'application/octet-stream'
        });
        onComplete?.({ blob, fileName: metadata.fileName, fileSize: metadata.fileSize });
    }

    function reportProgress() {
        if (!metadata) return;
        const progressInterval = metadata.totalChunks <= 20 ? 1
            : metadata.totalChunks <= 100 ? 5 : 10;

        if (chunkCount % progressInterval === 0 || chunkCount === metadata.totalChunks) {
            onProgress?.({
                received: receivedSize,
                total: metadata.fileSize || 0,
                percentage: Math.round((receivedSize / metadata.fileSize) * 100),
                chunkIndex: chunkCount,
                totalChunks: metadata.totalChunks || 0,
            });
        }
    }

    function handleStringMessage(data) {
        try {
            const msg = JSON.parse(data);

            if (msg.type === 'file-meta') {
                metadata = msg;
                console.log('[WebRTC] 📥 Receiving:', metadata.fileName,
                    `(${formatBytes(metadata.fileSize)}, ${metadata.totalChunks} chunks, encrypted: ${metadata.encrypted})`);
                return;
            }

            if (msg.type === 'file-complete') {
                console.log(`[WebRTC] 📦 file-complete signal. Sender sent: ${msg.totalChunksSent}, We have: ${chunkCount}`);
                fileCompleteReceived = true;
                expectedTotalChunks = msg.totalChunksSent || metadata?.totalChunks;
                tryFinalize();
                return;
            }
        } catch (err) {
            console.error('[WebRTC] Error parsing string message:', err);
        }
    }

    function handleBinaryChunkSync(chunkData) {
        pendingChunks.push(chunkData);
        receivedSize += chunkData.byteLength;
        chunkCount++;

        if (pendingChunks.length >= MERGE_INTERVAL) {
            flushChunks();
        }

        reportProgress();
        tryFinalize();
    }

    // For encrypted transfers, we need async processing
    let asyncQueue = Promise.resolve();

    async function handleBinaryChunkAsync(chunkData) {
        try {
            const packed = new Uint8Array(chunkData);
            const iv = packed.slice(0, 12);
            const ciphertext = packed.slice(12).buffer;
            const decrypted = await decryption.decrypt(decryption.key, iv, ciphertext);
            handleBinaryChunkSync(decrypted);
        } catch (err) {
            console.error('[WebRTC] Decryption error on chunk', chunkCount, ':', err);
            // Still count the chunk to prevent stalling
            handleBinaryChunkSync(chunkData);
        }
    }

    channel.onmessage = (event) => {
        try {
            // Handle string messages (metadata, control) synchronously
            if (typeof event.data === 'string') {
                handleStringMessage(event.data);
                return;
            }

            // Copy the ArrayBuffer immediately (browser recycles them)
            const dataCopy = event.data.slice(0);

            // Encrypted: queue async decryption (with catch to prevent chain breakage)
            if (decryption && metadata?.encrypted) {
                asyncQueue = asyncQueue
                    .then(() => handleBinaryChunkAsync(dataCopy))
                    .catch((err) => {
                        console.error('[WebRTC] Queue error:', err);
                        // Recovery: process chunk without decryption to keep chain alive
                        handleBinaryChunkSync(dataCopy);
                    });
                return;
            }

            // Non-encrypted: process synchronously (no Promise chain = no chain breakage)
            handleBinaryChunkSync(dataCopy);

        } catch (err) {
            console.error('[WebRTC] onmessage error:', err);
        }
    };

    // Safety net: periodically check if all chunks arrived but tryFinalize wasn't called
    const safetyInterval = setInterval(() => {
        if (finalized) {
            clearInterval(safetyInterval);
            return;
        }
        const totalExpected = expectedTotalChunks || metadata?.totalChunks;
        if (totalExpected && chunkCount >= totalExpected) {
            console.log('[WebRTC] ⚠️ Safety net triggered — all chunks received but not finalized. Forcing completion.');
            fileCompleteReceived = true;
            tryFinalize();
            clearInterval(safetyInterval);
        }
    }, 2000);

    channel.onerror = (err) => {
        console.error('[WebRTC] DataChannel error:', err);
        clearInterval(safetyInterval);
        onError?.(err);
    };

    channel.onclose = () => {
        console.log('[WebRTC] DataChannel closed. Chunks received:', chunkCount);
        clearInterval(safetyInterval);
        // If we have all chunks but didn't finalize yet, do it now
        if (!finalized && chunkCount > 0) {
            const totalExpected = expectedTotalChunks || metadata?.totalChunks;
            if (totalExpected && chunkCount >= totalExpected) {
                fileCompleteReceived = true;
                tryFinalize();
            }
        }
    };
}

// ─── Utility ────────────────────────────────────────────────────

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}
