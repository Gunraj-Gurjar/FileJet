/**
 * Socket.IO Client — Singleton connection to the FileJet signaling server.
 * 
 * Handles connection lifecycle, automatic reconnection, and event binding.
 * Uses a singleton pattern to ensure only one connection exists per client.
 */

import { io } from 'socket.io-client';

const getDynamicServerUrl = () => {
    if (typeof window !== 'undefined') {
        return `http://${window.location.hostname}:3001`;
    }
    return 'http://localhost:3001';
};

const SERVER_URL = process.env.NEXT_PUBLIC_SERVER_URL || getDynamicServerUrl();

let socket = null;

/**
 * Get or create the Socket.IO client connection.
 * @returns {import('socket.io-client').Socket}
 */
export function getSocket() {
    if (!socket) {
        socket = io(SERVER_URL, {
            autoConnect: false,
            reconnection: true,
            reconnectionAttempts: 10,
            reconnectionDelay: 1000,
            reconnectionDelayMax: 5000,
            timeout: 10000,
            transports: ['websocket', 'polling'],
        });

        socket.on('connect', () => {
            console.log('[Socket] Connected:', socket.id);
        });

        socket.on('disconnect', (reason) => {
            console.log('[Socket] Disconnected:', reason);
        });

        socket.on('connect_error', (err) => {
            console.error('[Socket] Connection error:', err.message);
        });
    }

    return socket;
}

/**
 * Connect the socket if not already connected.
 */
export function connectSocket() {
    const s = getSocket();
    if (!s.connected) {
        s.connect();
    }
    return s;
}

/**
 * Disconnect and clean up the socket.
 */
export function disconnectSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
    }
}
