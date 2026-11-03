/**
 * Server-Sent Events (SSE) Manager for Real-Time Chat
 * Native Node.js / Express implementation with zero external dependencies.
 */

class ChatSSEManager {
  constructor() {
    // Map of userId (string/number) -> Set of active Express response objects
    this.clients = new Map();

    // Start heartbeat interval every 25 seconds
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, 25000);

    if (this.heartbeatInterval.unref) {
      this.heartbeatInterval.unref();
    }
  }

  /**
   * Register a new client SSE connection
   * @param {string|number} userId
   * @param {import('express').Response} res
   */
  addClient(userId, res) {
    const key = String(userId);
    if (!this.clients.has(key)) {
      this.clients.set(key, new Set());
    }

    const userConnections = this.clients.get(key);
    userConnections.add(res);

    // Initial SSE greeting / connection confirmation
    res.write(`event: connected\ndata: ${JSON.stringify({ userId: key, time: new Date().toISOString() })}\n\n`);

    // Clean up on disconnect
    res.on("close", () => {
      this.removeClient(key, res);
    });

    res.on("error", (err) => {
      console.error(`SSE connection error for user ${key}:`, err.message);
      this.removeClient(key, res);
    });
  }

  /**
   * Remove a client connection
   * @param {string} key
   * @param {import('express').Response} res
   */
  removeClient(key, res) {
    if (this.clients.has(key)) {
      const userConnections = this.clients.get(key);
      userConnections.delete(res);
      if (userConnections.size === 0) {
        this.clients.delete(key);
      }
    }
  }

  /**
   * Check if a user currently has active connections
   * @param {string|number} userId
   * @returns {boolean}
   */
  isUserOnline(userId) {
    const key = String(userId);
    return this.clients.has(key) && this.clients.get(key).size > 0;
  }

  /**
   * Send an SSE event to a specific user
   * @param {string|number} userId
   * @param {string} event
   * @param {any} data
   */
  sendToUser(userId, event, data) {
    const key = String(userId);
    const userConnections = this.clients.get(key);
    if (!userConnections || userConnections.size === 0) return;

    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const res of userConnections) {
      try {
        res.write(payload);
      } catch (err) {
        console.error(`Error sending SSE to user ${key}:`, err.message);
        this.removeClient(key, res);
      }
    }
  }

  /**
   * Broadcast an SSE event to a list of users
   * @param {Array<string|number>} userIds
   * @param {string} event
   * @param {any} data
   */
  sendToUsers(userIds, event, data) {
    if (!Array.isArray(userIds)) return;
    for (const uid of userIds) {
      this.sendToUser(uid, event, data);
    }
  }

  /**
   * Send heartbeat ping to all active connections
   */
  sendHeartbeat() {
    for (const [userId, connections] of this.clients.entries()) {
      for (const res of connections) {
        try {
          res.write(`: ping\n\n`);
        } catch (err) {
          this.removeClient(userId, res);
        }
      }
    }
  }
}

const sseManager = new ChatSSEManager();

module.exports = sseManager;
