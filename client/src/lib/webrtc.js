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

/** Maximum buffer before pausing sends (6MB) */
const MAX_BUFFER_SIZE = 6 * 1024 * 1024;

const BUFFER_POLL_INTERVAL_MS = 50;
const ACK_INTERVAL_CHUNKS = 8;
const SEND_WINDOW_CHUNKS = 32;
const ACK_WAIT_TIMEOUT_MS = 15000;

/**
 * Create a configured RTCPeerConnection, fetching ICE servers (TURN) from the backend.
 * @returns {Promise<RTCPeerConnection>}
 */
export async function createPeerConnection() {
    let iceServers = ICE_SERVERS; // Start with default STUN

    try {
        // Build the correct API URL regardless of where Next.js is running (client or SSR)
        const { SERVER_URL } = await import('./config');

        // Fetch TURN credentials (append timestamp to prevent caching of expired credentials)
        const response = await fetch(`${SERVER_URL}/api/ice-servers?t=${Date.now()}`);
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
        let lastProgressTime = 0;
        let ackedChunks = startChunk;
        const ackWaiters = new Set();
        const PROGRESS_THROTTLE_MS = 100;

        const onClose = () => { cancelled = true; };
        channel.addEventListener('close', onClose);

        const onAckMessage = (event) => {
            if (typeof event.data !== 'string') return;

            try {
                const msg = JSON.parse(event.data);
                if (msg.type !== 'chunk-ack') return;

                ackedChunks = Math.max(ackedChunks, Number(msg.chunkIndex) || 0);
                for (const waiter of [...ackWaiters]) {
                    if (ackedChunks >= waiter.targetChunk) {
                        waiter.resolve();
                        ackWaiters.delete(waiter);
                    }
                }
            } catch {
                // Ignore non-JSON control messages on the sender side.
            }
        };

        channel.addEventListener?.('message', onAckMessage);

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
            cleanupListeners();
            reject(new Error('DataChannel not open'));
            return;
        }
        channel.send(metadata);

        function cleanupListeners() {
            channel.removeEventListener('close', onClose);
            channel.removeEventListener?.('message', onAckMessage);
            for (const waiter of ackWaiters) {
                clearTimeout(waiter.timeout);
                waiter.resolve();
            }
            ackWaiters.clear();
        }

        async function sendNextChunk() {
            while (chunkIndex < totalChunks) {
                if (cancelled || channel.readyState !== 'open') {
                    cleanupListeners();
                    reject(new Error('DataChannel closed during transfer'));
                    return;
                }

                // Receiver ACKs keep the sender from dumping a huge burst into the browser buffer.
                if (chunkIndex - ackedChunks >= SEND_WINDOW_CHUNKS) {
                    await waitForAck(chunkIndex - SEND_WINDOW_CHUNKS + ACK_INTERVAL_CHUNKS);
                    continue;
                }

                // Flow control: wait for browser buffer to drain if the network side is lagging.
                if (channel.bufferedAmount > MAX_BUFFER_SIZE) {
                    await waitForBufferRoom(channel);
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
                    cleanupListeners();
                    reject(new Error('DataChannel closed during transfer'));
                    return;
                }
                channel.send(chunkData);
                chunkIndex++;

                // Report progress with throttling
                const now = Date.now();
                if (now - lastProgressTime >= PROGRESS_THROTTLE_MS || chunkIndex === totalChunks) {
                    lastProgressTime = now;
                    const sent = Math.min(chunkIndex * chunkSize, file.size);
                    onProgress?.({
                        sent,
                        total: file.size,
                        percentage: Math.round((sent / file.size) * 100),
                        chunkIndex,
                        totalChunks,
                    });
                }

                // Yield to event loop periodically to prevent UI freezes
                if (chunkIndex % 64 === 0) {
                    await new Promise((res) => setTimeout(res, 0));
                }
            }

            // Wait until the receiver has processed every chunk before signaling completion.
            await waitForAck(totalChunks);

            // Send completion signal
            if (channel.readyState === 'open') {
                channel.send(JSON.stringify({
                    type: 'file-complete',
                    totalChunksSent: chunkIndex,
                }));
            }

            // Wait for completion signal to leave buffer
            await waitForDrain(channel);

            cleanupListeners();
            resolve();
        }

        function waitForAck(targetChunk) {
            if (ackedChunks >= targetChunk || channel.readyState !== 'open') {
                return Promise.resolve();
            }

            return new Promise((resolve) => {
                const waiter = {
                    targetChunk,
                    resolve: () => {
                        clearTimeout(waiter.timeout);
                        resolve();
                    },
                    timeout: null,
                };

                waiter.timeout = setTimeout(() => {
                    ackWaiters.delete(waiter);
                    resolve();
                }, ACK_WAIT_TIMEOUT_MS);

                ackWaiters.add(waiter);
            });
        }

        sendNextChunk().catch((err) => {
            cleanupListeners();
            reject(err);
        });
    });
}

/**
 * Wait until the DataChannel has enough room for more data.
 * Some browsers miss bufferedamountlow under heavy load, so this also polls.
 */
function waitForBufferRoom(channel) {
    return new Promise((resolve) => {
        let settled = false;
        let interval = null;

        const finish = () => {
            if (settled) return;
            settled = true;
            if (channel.onbufferedamountlow === finish) {
                channel.onbufferedamountlow = null;
            }
            if (interval) clearInterval(interval);
            resolve();
        };

        if (channel.readyState !== 'open' || channel.bufferedAmount <= BUFFER_THRESHOLD) {
            finish();
            return;
        }

        interval = setInterval(() => {
            if (channel.readyState !== 'open' || channel.bufferedAmount <= BUFFER_THRESHOLD) {
                finish();
            }
        }, BUFFER_POLL_INTERVAL_MS);

        channel.onbufferedamountlow = finish;
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
    let lastProgressTime = 0;
    const PROGRESS_THROTTLE_MS = 100;

    channel.binaryType = 'arraybuffer';

    function flushChunks() {
        if (pendingChunks.length === 0) return;
        mergedBlobs.push(new Blob(pendingChunks));
        pendingChunks = [];
    }

    function tryFinalize() {
        if (finalized) return;
        // Delay finalization if the decryption queue is still processing
        if (isProcessingQueue) return;

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

        const now = Date.now();
        if (now - lastProgressTime >= PROGRESS_THROTTLE_MS || chunkCount === metadata.totalChunks) {
            lastProgressTime = now;
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
                sendAck(true);
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

    function sendAck(force = false) {
        if (!metadata || channel.readyState !== 'open') return;
        if (!force && chunkCount % ACK_INTERVAL_CHUNKS !== 0 && chunkCount !== metadata.totalChunks) return;

        channel.send(JSON.stringify({
            type: 'chunk-ack',
            chunkIndex: chunkCount,
            received: receivedSize,
        }));
    }

    // For encrypted transfers, we need async processing
    const encryptedQueue = [];
    let isProcessingQueue = false;

    async function processEncryptedQueue() {
        if (isProcessingQueue) return;
        isProcessingQueue = true;

        while (encryptedQueue.length > 0) {
            const chunkData = encryptedQueue.shift();
            try {
                const packed = new Uint8Array(chunkData);
                const iv = packed.slice(0, 12);
                const ciphertext = packed.subarray(12);
                const decrypted = await decryption.decrypt(decryption.key, iv, ciphertext);
                handleBinaryChunkSync(decrypted);
                sendAck();
            } catch (err) {
                console.error('[WebRTC] Decryption error on chunk', chunkCount, ':', err);
                // Still count the chunk to prevent stalling
                handleBinaryChunkSync(chunkData);
                sendAck();
            }
            // Yield to event loop periodically to keep UI responsive
            if (chunkCount % 20 === 0) {
                await new Promise(resolve => setTimeout(resolve, 0));
            }
        }

        isProcessingQueue = false;

        // If file complete signal was received and queue is now empty, try finalizing
        if (fileCompleteReceived) {
            tryFinalize();
        }
    }

    channel.onmessage = (event) => {
        try {
            // Handle string messages (metadata, control) synchronously
            if (typeof event.data === 'string') {
                handleStringMessage(event.data);
                return;
            }

            const chunkData = event.data;

            // Encrypted: push to queue and process asynchronously
            if (decryption && metadata?.encrypted) {
                encryptedQueue.push(chunkData);
                processEncryptedQueue();
                return;
            }

            // Non-encrypted: process synchronously without an extra full-buffer copy.
            handleBinaryChunkSync(chunkData);
            sendAck();

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
