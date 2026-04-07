/**
 * Encryption — End-to-end encryption for file chunks using Web Crypto API.
 * 
 * Uses AES-GCM with 256-bit keys for authenticated encryption.
 * Each chunk gets a unique IV (initialization vector) for security.
 * 
 * The encryption key is shared via URL fragment (#key=...) so it
 * never hits the server — true end-to-end encryption.
 */

/**
 * Generate a new AES-GCM 256-bit encryption key.
 * @returns {Promise<CryptoKey>}
 */
export async function generateKey() {
    if (!crypto || !crypto.subtle) {
        throw new Error('Encryption requires a secure context (HTTPS) or localhost.');
    }
    return await crypto.subtle.generateKey(
        { name: 'AES-GCM', length: 256 },
        true, // extractable — needed to export for URL sharing
        ['encrypt', 'decrypt']
    );
}

/**
 * Export a CryptoKey to a base64url-encoded string for URL sharing.
 * @param {CryptoKey} key 
 * @returns {Promise<string>}
 */
export async function exportKey(key) {
    const rawKey = await crypto.subtle.exportKey('raw', key);
    return bufferToBase64Url(rawKey);
}

/**
 * Import a CryptoKey from a base64url-encoded string.
 * @param {string} keyString 
 * @returns {Promise<CryptoKey>}
 */
export async function importKey(keyString) {
    if (!crypto || !crypto.subtle) {
        throw new Error('Encryption requires a secure context (HTTPS) or localhost.');
    }
    const rawKey = base64UrlToBuffer(keyString);
    return await crypto.subtle.importKey(
        'raw',
        rawKey,
        { name: 'AES-GCM', length: 256 },
        false,
        ['encrypt', 'decrypt']
    );
}

/**
 * Encrypt a chunk of data.
 * @param {CryptoKey} key - The AES-GCM key
 * @param {ArrayBuffer} data - The plaintext chunk
 * @returns {Promise<{iv: Uint8Array, ciphertext: ArrayBuffer}>}
 */
export async function encryptChunk(key, data) {
    // Generate a unique 12-byte IV for each chunk
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const ciphertext = await crypto.subtle.encrypt(
        { name: 'AES-GCM', iv },
        key,
        data
    );

    return { iv, ciphertext };
}

/**
 * Decrypt a chunk of data.
 * @param {CryptoKey} key - The AES-GCM key
 * @param {Uint8Array} iv - The initialization vector
 * @param {ArrayBuffer} ciphertext - The encrypted data
 * @returns {Promise<ArrayBuffer>} The decrypted plaintext
 */
export async function decryptChunk(key, iv, ciphertext) {
    return await crypto.subtle.decrypt(
        { name: 'AES-GCM', iv },
        key,
        ciphertext
    );
}

// ─── Utility Functions ──────────────────────────────────────────

/**
 * Convert an ArrayBuffer to a base64url-encoded string.
 * @param {ArrayBuffer} buffer 
 * @returns {string}
 */
function bufferToBase64Url(buffer) {
    const bytes = new Uint8Array(buffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}

/**
 * Convert a base64url-encoded string to an ArrayBuffer.
 * @param {string} base64url 
 * @returns {ArrayBuffer}
 */
function base64UrlToBuffer(base64url) {
    const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - base64.length % 4) % 4);
    const binary = atob(padded);
    const buffer = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
        buffer[i] = binary.charCodeAt(i);
    }
    return buffer.buffer;
}
