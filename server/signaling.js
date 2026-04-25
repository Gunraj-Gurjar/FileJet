/**
 * Signaling — Socket.IO event handlers for WebRTC signaling.
 * 
 * This module handles the signaling protocol between sender and receiver:
 * 1. Both peers join a room identified by sessionId
 * 2. Sender creates an offer and sends it via the signaling server
 * 3. Receiver responds with an answer
 * 4. Both exchange ICE candidates for NAT traversal
 * 5. Once connected, file transfer happens directly via WebRTC DataChannel
 */

const sessionStore = require('./sessionStore');

/**
 * Initialize Socket.IO signaling handlers.
 * @param {import('socket.io').Server} io 
 */
function initSignaling(io) {
    io.on('connection', (socket) => {
        console.log(`[Signaling] Client connected: ${socket.id}`);

        /**
         * Join a transfer room as sender or receiver.
         * @event join-room
         * @param {object} data
         * @param {string} data.sessionId - The session/room to join
         * @param {string} data.role - 'sender' or 'receiver'
         * @param {string} [data.password] - Password for protected sessions
         */
        socket.on('join-room', ({ sessionId, role, password }, callback) => {
            const session = sessionStore.get(sessionId);

            if (!session) {
                return callback?.({ error: 'Session not found or expired' });
            }

            // Verify password if session is protected
            if (session.password && session.password !== password) {
                return callback?.({ error: 'Invalid password' });
            }

            // Join the Socket.IO room
            socket.join(sessionId);
            socket.data.sessionId = sessionId;
            socket.data.role = role;

            // Update session connection state
            if (role === 'sender') {
                session.senderConnected = true;
                sessionStore.update(sessionId, { senderConnected: true });
            } else {
                session.receiverConnected = true;
                sessionStore.update(sessionId, { receiverConnected: true });
            }

            // Notify the other peer
            socket.to(sessionId).emit('peer-joined', { role, socketId: socket.id });

            console.log(`[Signaling] ${role} joined room ${sessionId}`);

            callback?.({
                success: true,
                session: {
                    id: session.id,
                    fileName: session.fileName,
                    fileSize: session.fileSize,
                    fileType: session.fileType,
                },
                senderConnected: session.senderConnected,
                receiverConnected: session.receiverConnected
            });
        });

        /**
         * Relay WebRTC offer from sender to receiver.
         * @event offer
         */
        socket.on('offer', ({ sessionId, offer }) => {
            console.log(`[Signaling] Offer from ${socket.id} in room ${sessionId}`);
            socket.to(sessionId).emit('offer', { offer, senderId: socket.id });
        });

        /**
         * Relay WebRTC answer from receiver to sender.
         * @event answer
         */
        socket.on('answer', ({ sessionId, answer }) => {
            console.log(`[Signaling] Answer from ${socket.id} in room ${sessionId}`);
            socket.to(sessionId).emit('answer', { answer, receiverId: socket.id });
        });

        /**
         * Relay ICE candidates between peers for NAT traversal.
         * @event ice-candidate
         */
        socket.on('ice-candidate', ({ sessionId, candidate }) => {
            socket.to(sessionId).emit('ice-candidate', { candidate, from: socket.id });
        });

        /**
         * Transfer progress update — relayed so both sides see it.
         * @event transfer-progress
         */
        socket.on('transfer-progress', ({ sessionId, progress }) => {
            socket.to(sessionId).emit('transfer-progress', { progress });
        });

        /**
         * Transfer complete notification.
         * @event transfer-complete
         */
        socket.on('transfer-complete', ({ sessionId }) => {
            sessionStore.update(sessionId, { transferComplete: true });
            socket.to(sessionId).emit('transfer-complete');
            console.log(`[Signaling] Transfer complete in room ${sessionId}`);
        });

        // 9. Handle WebRTC fallback to Socket Relay
        socket.on('relay-fallback-start', ({ sessionId }) => {
            console.log(`[Signaling] Fallback to Socket relay initiated in room ${sessionId}`);
            socket.to(sessionId).emit('relay-fallback-start');
        });

        socket.on('relay-message', ({ sessionId, data }) => {
            // Relay the ArrayBuffer or string directly
            socket.to(sessionId).emit('relay-message', { data });
        });

        // 10. Handle disconnections
        socket.on('disconnect', () => {
            const { sessionId, role } = socket.data;
            if (sessionId) {
                if (role === 'sender') {
                    sessionStore.update(sessionId, { senderConnected: false });
                } else {
                    sessionStore.update(sessionId, { receiverConnected: false });
                }
                socket.to(sessionId).emit('peer-disconnected', { role });
                console.log(`[Signaling] ${role} disconnected from room ${sessionId}`);
            }
        });
    });
}

module.exports = { initSignaling };
