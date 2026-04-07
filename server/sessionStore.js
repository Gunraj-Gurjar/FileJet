/**
 * SessionStore — In-memory session storage with TTL auto-expiry.
 * 
 * Each session represents a file transfer room. Sessions auto-expire
 * after a configurable TTL (default 24 hours) to prevent memory leaks.
 * 
 * In production, replace with Redis or MongoDB for persistence.
 */

const { v4: uuidv4 } = require('uuid');

class SessionStore {
  constructor(ttlMs = 24 * 60 * 60 * 1000) {
    /** @type {Map<string, object>} */
    this.sessions = new Map();
    this.ttlMs = ttlMs;

    // Periodic cleanup every 5 minutes
    this.cleanupInterval = setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  /**
   * Create a new transfer session.
   * @param {object} opts
   * @param {string} opts.fileName - Name of the file being shared
   * @param {number} opts.fileSize - Size in bytes
   * @param {string} [opts.fileType] - MIME type
   * @param {string} [opts.password] - Optional password for protected links
   * @param {number} [opts.expiresInMs] - Custom expiry time in ms
   * @returns {object} Created session object
   */
  create({ fileName, fileSize, fileType, password, expiresInMs }) {
    const sessionId = this.generateShortId();
    const now = Date.now();
    const session = {
      id: sessionId,
      fileName,
      fileSize,
      fileType: fileType || 'application/octet-stream',
      password: password || null,
      createdAt: now,
      expiresAt: now + (expiresInMs || this.ttlMs),
      senderConnected: false,
      receiverConnected: false,
      transferStarted: false,
      transferComplete: false,
      chunksTotal: 0,
      chunksTransferred: 0,
    };

    this.sessions.set(sessionId, session);
    return session;
  }

  /**
   * Get a session by ID.
   * @param {string} id 
   * @returns {object|null}
   */
  get(id) {
    const session = this.sessions.get(id);
    if (!session) return null;

    // Check if expired
    if (Date.now() > session.expiresAt) {
      this.sessions.delete(id);
      return null;
    }

    return session;
  }

  /**
   * Update a session's properties.
   * @param {string} id 
   * @param {object} updates 
   * @returns {object|null}
   */
  update(id, updates) {
    const session = this.get(id);
    if (!session) return null;

    Object.assign(session, updates);
    return session;
  }

  /**
   * Delete a session.
   * @param {string} id 
   * @returns {boolean}
   */
  delete(id) {
    return this.sessions.delete(id);
  }

  /**
   * Generate a short, URL-friendly ID (6 chars).
   * @returns {string}
   */
  generateShortId() {
    // Use a portion of UUID for short, unique IDs
    const id = uuidv4().replace(/-/g, '').substring(0, 8).toUpperCase();
    // Ensure uniqueness
    if (this.sessions.has(id)) return this.generateShortId();
    return id;
  }

  /**
   * Remove all expired sessions.
   */
  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    for (const [id, session] of this.sessions) {
      if (now > session.expiresAt) {
        this.sessions.delete(id);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      console.log(`[SessionStore] Cleaned up ${cleaned} expired session(s). Active: ${this.sessions.size}`);
    }
  }

  /**
   * Get count of active sessions.
   * @returns {number}
   */
  get size() {
    return this.sessions.size;
  }

  /**
   * Destroy the store and clear the cleanup interval.
   */
  destroy() {
    clearInterval(this.cleanupInterval);
    this.sessions.clear();
  }
}

module.exports = new SessionStore();
