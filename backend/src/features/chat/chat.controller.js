const jwt = require("jsonwebtoken");
const chatService = require("./chat.service");
const sseManager = require("./chat.sse");
const { isTokenRevoked, isUserActive } = require("../../services/tokenRevocation.service");

/**
 * GET /chat/rooms
 */
async function getRooms(req, res) {
  try {
    const userId = req.user.user_id;
    const rooms = await chatService.getConversationsForUser(userId);
    res.json(rooms);
  } catch (err) {
    console.error("getRooms error:", err);
    res.status(500).json({ message: "Internal server error", error: err.message });
  }
}

/**
 * GET /chat/rooms/:roomId
 */
async function getRoom(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;
    const room = await chatService.getConversationById(roomId, userId);
    res.json(room);
  } catch (err) {
    console.error("getRoom error:", err);
    const status = err.message.startsWith("Unauthorized") ? 403 : 404;
    res.status(status).json({ message: err.message });
  }
}

/**
 * POST /chat/rooms/direct
 */
async function createDirectRoom(req, res) {
  try {
    const userId = req.user.user_id;
    const { partnerId } = req.body;

    if (!partnerId) {
      return res.status(400).json({ message: "partnerId is required" });
    }

    const room = await chatService.getOrCreateDirectConversation(userId, partnerId);
    res.json(room);
  } catch (err) {
    console.error("createDirectRoom error:", err);
    res.status(500).json({ message: "Failed to create direct room", error: err.message });
  }
}

/**
 * POST /chat/rooms/group
 */
async function createGroupRoom(req, res) {
  try {
    const userId = req.user.user_id;
    const { name, memberIds } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: "Group name is required" });
    }

    const room = await chatService.createGroupConversation(userId, name.trim(), memberIds || []);
    res.status(201).json(room);
  } catch (err) {
    console.error("createGroupRoom error:", err);
    res.status(500).json({ message: "Failed to create group room", error: err.message });
  }
}

/**
 * GET /chat/rooms/:roomId/messages
 */
async function getMessages(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;
    const { limit, beforeDate, beforeId } = req.query;

    const messages = await chatService.getMessages(roomId, userId, {
      limit: limit ? parseInt(limit, 10) : 50,
      beforeDate,
      beforeId,
    });

    res.json(messages);
  } catch (err) {
    console.error("getMessages error:", err);
    const status = err.message.startsWith("Unauthorized") ? 403 : 500;
    res.status(status).json({ message: err.message });
  }
}

/**
 * POST /chat/rooms/:roomId/messages
 */
async function sendMessage(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;
    const { content, type, replyTo, mediaLocation } = req.body;

    if (!content && !mediaLocation) {
      return res.status(400).json({ message: "Message content or mediaLocation is required" });
    }

    const message = await chatService.sendMessage(roomId, userId, {
      content: content || "",
      type: type || "text",
      replyTo: replyTo || null,
      mediaLocation: mediaLocation || null,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("sendMessage error:", err);
    const status = err.message.startsWith("Unauthorized") ? 403 : 500;
    res.status(status).json({ message: err.message });
  }
}

/**
 * POST /chat/rooms/:roomId/read
 */
async function markRead(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;

    const result = await chatService.markAsRead(roomId, userId);
    res.json(result);
  } catch (err) {
    console.error("markRead error:", err);
    res.status(500).json({ message: "Failed to mark read", error: err.message });
  }
}

/**
 * DELETE /chat/messages/:messageId
 */
async function recallMessage(req, res) {
  try {
    const userId = req.user.user_id;
    const { messageId } = req.params;

    const result = await chatService.deleteMessage(messageId, userId);
    res.json(result);
  } catch (err) {
    console.error("recallMessage error:", err);
    const status = err.message.startsWith("Unauthorized") ? 403 : 500;
    res.status(status).json({ message: err.message });
  }
}

/**
 * PUT /chat/rooms/:roomId/pin
 */
async function pinMessage(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;
    const { messageId } = req.body;

    if (!messageId) {
      return res.status(400).json({ message: "messageId is required" });
    }

    const result = await chatService.pinMessage(roomId, messageId, userId);
    res.json(result);
  } catch (err) {
    console.error("pinMessage error:", err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * DELETE /chat/rooms/:roomId/pin
 */
async function unpinMessage(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;

    const result = await chatService.unpinMessage(roomId, userId);
    res.json(result);
  } catch (err) {
    console.error("unpinMessage error:", err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * POST /chat/rooms/:roomId/members
 */
async function addMember(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;
    const { memberId } = req.body;

    if (!memberId) {
      return res.status(400).json({ message: "memberId is required" });
    }

    const result = await chatService.addMember(roomId, userId, memberId);
    res.json(result);
  } catch (err) {
    console.error("addMember error:", err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * POST /chat/rooms/:roomId/leave
 */
async function leaveGroup(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;

    const result = await chatService.leaveGroup(roomId, userId);
    res.json(result);
  } catch (err) {
    console.error("leaveGroup error:", err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * POST /chat/rooms/:roomId/typing
 */
async function setTyping(req, res) {
  try {
    const userId = req.user.user_id;
    const { roomId } = req.params;
    const { isTyping } = req.body;

    await chatService.broadcastTyping(roomId, userId, isTyping);
    res.json({ success: true });
  } catch (err) {
    console.error("setTyping error:", err);
    res.status(500).json({ message: err.message });
  }
}

/**
 * GET /chat/stream (SSE endpoint)
 * Connects browser EventSource with authentication via query or header.
 */
async function stream(req, res) {
  try {
    // 1. Resolve token from header or query param
    let token = "";
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.split(" ")[1];
    } else if (req.query.token) {
      token = req.query.token;
    }

    if (!token) {
      return res.status(401).json({ message: "Authorization token required" });
    }

    // 2. Validate token
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    if (!(await isUserActive(payload.user_id))) {
      return res.status(401).json({ message: "Account is inactive or deleted" });
    }
    if (await isTokenRevoked(token)) {
      return res.status(401).json({ message: "Token has been revoked" });
    }

    const userId = payload.user_id;

    // 3. Set SSE HTTP Headers
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
      "Access-Control-Allow-Origin": "*",
    });

    if (res.flushHeaders) {
      res.flushHeaders();
    }

    // 4. Register client in SSE manager
    sseManager.addClient(userId, res);
  } catch (err) {
    console.error("SSE stream error:", err.message);
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

module.exports = {
  getRooms,
  getRoom,
  createDirectRoom,
  createGroupRoom,
  getMessages,
  sendMessage,
  markRead,
  recallMessage,
  pinMessage,
  unpinMessage,
  addMember,
  leaveGroup,
  setTyping,
  stream,
};
