/**
 * Chunk sizes optimized for WebRTC SCTP transport.
 * SCTP max message = 262,144 bytes (256KB).
 * AES-GCM adds 28 bytes (12-byte IV + 16-byte auth tag).
 * So max encrypted chunk = 262,144 - 28 = 262,116 bytes.
 * We use 245,760 (240KB) for safety margin.
 */

/** Default chunk size: 240KB (safe for encrypted WebRTC transfers) */
export const DEFAULT_CHUNK_SIZE = 240 * 1024;

/** Large chunk size: 256KB (for unencrypted transfers only) */
export const LARGE_CHUNK_SIZE = 256 * 1024;

/**
 * Calculate the total number of chunks for a file.
 * @param {number} fileSize - File size in bytes
 * @param {number} chunkSize - Chunk size in bytes
 * @returns {number}
 */
export function calculateTotalChunks(fileSize, chunkSize = DEFAULT_CHUNK_SIZE) {
    return Math.ceil(fileSize / chunkSize);
}

/**
 * Read a specific chunk from a file.
 * @param {File} file - The File object
 * @param {number} chunkIndex - Zero-based chunk index
 * @param {number} chunkSize - Size of each chunk in bytes
 * @returns {Promise<ArrayBuffer>} The chunk data
 */
export async function readChunk(file, chunkIndex, chunkSize = DEFAULT_CHUNK_SIZE) {
    const start = chunkIndex * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const blob = file.slice(start, end);
    return await blob.arrayBuffer();
}

/**
 * Assemble received chunks into a downloadable Blob.
 * @param {ArrayBuffer[]} chunks - Array of received chunk buffers
 * @param {string} mimeType - MIME type for the resulting Blob
 * @returns {Blob}
 */
export function assembleChunks(chunks, mimeType = 'application/octet-stream') {
    return new Blob(chunks, { type: mimeType });
}

/**
 * Trigger a file download in the browser.
 * @param {Blob} blob - The file Blob
 * @param {string} fileName - Name for the downloaded file
 */
export function downloadBlob(blob, fileName) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    // Clean up object URL after a short delay
    setTimeout(() => URL.revokeObjectURL(url), 5000);
}
