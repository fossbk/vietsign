const express = require("express");
const router = express.Router();
const chatController = require("./chat.controller");
const { authRequired } = require("../../middleware/auth.middleware");

// Real-time SSE event stream (handles token auth inside stream handler for EventSource compatibility)
router.get("/stream", chatController.stream);

// All subsequent routes require JWT authentication
router.use(authRequired);

// Rooms
router.get("/rooms", chatController.getRooms);
router.get("/rooms/:roomId", chatController.getRoom);
router.post("/rooms/direct", chatController.createDirectRoom);
router.post("/rooms/group", chatController.createGroupRoom);
router.post("/rooms/:roomId/members", chatController.addMember);
router.post("/rooms/:roomId/leave", chatController.leaveGroup);

// Messages
router.get("/rooms/:roomId/messages", chatController.getMessages);
router.post("/rooms/:roomId/messages", chatController.sendMessage);
router.delete("/messages/:messageId", chatController.recallMessage);

// Read receipts, pinning, typing
router.post("/rooms/:roomId/read", chatController.markRead);
router.put("/rooms/:roomId/pin", chatController.pinMessage);
router.delete("/rooms/:roomId/pin", chatController.unpinMessage);
router.post("/rooms/:roomId/typing", chatController.setTyping);

module.exports = router;
