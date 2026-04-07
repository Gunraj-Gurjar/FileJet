/**
 * FileJet Signaling Server
 * 
 * Express + Socket.IO server that handles:
 * 1. REST API for session management (create, get, delete transfer sessions)
 * 2. WebSocket signaling for WebRTC peer connection (offer/answer/ICE relay)
 * 
 * The server NEVER touches file data — all file transfers happen
 * directly between browsers via WebRTC DataChannels.
 */

require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const sessionStore = require('./sessionStore');
const { initSignaling } = require('./signaling');

const app = express();
const server = http.createServer(app);

// ─── CORS Configuration ─────────────────────────────────────────

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

// ─── Socket.IO Setup ────────────────────────────────────────────
const io = new Server(server, {
    cors: {
        origin: true,
        methods: ['GET', 'POST'],
        credentials: true,
    },
    maxHttpBufferSize: 1e6, // 1MB max for signaling messages
});

// Initialize WebRTC signaling handlers
initSignaling(io);

// ─── REST API Routes ────────────────────────────────────────────

/**
 * Health check endpoint
 * GET /health
 */
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        activeSessions: sessionStore.size,
        timestamp: new Date().toISOString(),
    });
});

/**
 * Create a new transfer session.
 * POST /api/sessions
 * Body: { fileName, fileSize, fileType, password?, expiresInMs? }
 */
app.post('/api/sessions', (req, res) => {
    try {
        const { fileName, fileSize, fileType, password, expiresInMs } = req.body;

        if (!fileName || !fileSize) {
            return res.status(400).json({ error: 'fileName and fileSize are required' });
        }

        const session = sessionStore.create({
            fileName,
            fileSize,
            fileType,
            password,
            expiresInMs,
        });

        console.log(`[API] Session created: ${session.id} — ${fileName} (${formatBytes(fileSize)})`);

        res.status(201).json({
            sessionId: session.id,
            shareLink: `/download/${session.id}`,
            expiresAt: new Date(session.expiresAt).toISOString(),
        });
    } catch (err) {
        console.error('[API] Error creating session:', err);
        res.status(500).json({ error: 'Failed to create session' });
    }
});

/**
 * Get session metadata.
 * GET /api/sessions/:id
 */
app.get('/api/sessions/:id', (req, res) => {
    const session = sessionStore.get(req.params.id);

    if (!session) {
        return res.status(404).json({ error: 'Session not found or expired' });
    }

    // Don't expose the password
    const { password, ...safeSession } = session;

    res.json({
        ...safeSession,
        hasPassword: !!password,
    });
});

/**
 * Delete/expire a session.
 * DELETE /api/sessions/:id
 */
app.delete('/api/sessions/:id', (req, res) => {
    const deleted = sessionStore.delete(req.params.id);

    if (!deleted) {
        return res.status(404).json({ error: 'Session not found' });
    }

    res.json({ message: 'Session deleted' });
});

// ─── Helper Functions ───────────────────────────────────────────

function formatBytes(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// ─── Start Server ───────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`
  ╔═══════════════════════════════════════════════╗
  ║          FileJet Signaling Server             ║
  ║          Running on port ${PORT}                 ║
  ╚═══════════════════════════════════════════════╝
  `);
});
