/**
 * Utility functions for formatting bytes, time, and other values.
 */

/**
 * Format bytes into human-readable string.
 * @param {number} bytes 
 * @param {number} [decimals=2] 
 * @returns {string}
 */
export function formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB', 'PB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(decimals)) + ' ' + sizes[i];
}

/**
 * Format speed in bytes/second to human-readable string.
 * @param {number} bytesPerSec 
 * @returns {string}
 */
export function formatSpeed(bytesPerSec) {
    if (!bytesPerSec || bytesPerSec === 0) return '0 B/s';
    return formatBytes(bytesPerSec) + '/s';
}

/**
 * Format seconds into human-readable time string.
 * @param {number} seconds 
 * @returns {string}
 */
export function formatETA(seconds) {
    if (!isFinite(seconds) || seconds <= 0) return 'Calculating...';

    if (seconds < 60) return `${Math.ceil(seconds)}s`;
    if (seconds < 3600) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.ceil(seconds % 60);
        return `${mins}m ${secs}s`;
    }
    const hours = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${mins}m`;
}

/**
 * Get file type icon name based on MIME type.
 * @param {string} type - MIME type
 * @returns {string} Icon identifier
 */
export function getFileIcon(type) {
    if (!type) return 'file';
    if (type.startsWith('image/')) return 'image';
    if (type.startsWith('video/')) return 'video';
    if (type.startsWith('audio/')) return 'audio';
    if (type.includes('pdf')) return 'pdf';
    if (type.includes('zip') || type.includes('rar') || type.includes('tar')) return 'archive';
    if (type.includes('doc') || type.includes('word')) return 'document';
    if (type.includes('sheet') || type.includes('excel') || type.includes('csv')) return 'spreadsheet';
    if (type.includes('presentation') || type.includes('powerpoint')) return 'presentation';
    if (type.startsWith('text/') || type.includes('json') || type.includes('xml')) return 'code';
    return 'file';
}
