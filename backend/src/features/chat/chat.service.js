const pool = require("../../db");
const sseManager = require("./chat.sse");

let schemaInitialized = false;

/**
 * Ensure database schema and columns for chat feature exist.
 * Runs idempotently on service invocation.
 */
async function ensureChatSchema() {
  if (schemaInitialized) return;

  try {
    const addColumnIfNotExists = async (table, col, def) => {
      const [rows] = await pool.query(
        "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [table, col]
      );
      if (rows.length === 0) {
        await pool.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${col}\` ${def}`);
      }
    };

    const addIndexIfNotExists = async (table, indexName, def) => {
      const [rows] = await pool.query(
        "SELECT INDEX_NAME FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?",
        [table, indexName]
      );
      if (rows.length === 0) {
        await pool.query(`ALTER TABLE \`${table}\` ADD INDEX \`${indexName}\` ${def}`);
      }
    };

    await pool.query("ALTER TABLE `message` MODIFY COLUMN `content` TEXT NULL");

    await addColumnIfNotExists("conversation", "pinned_message_id", "BIGINT DEFAULT NULL");
    await addColumnIfNotExists("conversation", "last_message_id", "BIGINT DEFAULT NULL");
    await addColumnIfNotExists("conversation", "last_message_at", "DATETIME(6) DEFAULT NULL");

    await addColumnIfNotExists("group_member", "user_id", "BIGINT DEFAULT NULL");
    await addColumnIfNotExists("group_member", "last_read_message_id", "BIGINT DEFAULT 0");

    await addColumnIfNotExists("message", "conversation_id", "BIGINT DEFAULT NULL");
    await addColumnIfNotExists("message", "sender_id", "BIGINT DEFAULT NULL");
    await addColumnIfNotExists("message", "reply_to_id", "BIGINT DEFAULT NULL");
    await addColumnIfNotExists("message", "is_deleted", "TINYINT(1) NOT NULL DEFAULT 0");
    await addColumnIfNotExists("message", "is_edited", "TINYINT(1) NOT NULL DEFAULT 0");

    await addIndexIfNotExists("message", "idx_msg_conv_date", "(conversation_id, created_date)");
    await addIndexIfNotExists("group_member", "idx_gm_conv_user", "(conversation_id, user_id)");

    schemaInitialized = true;
  } catch (err) {
    console.error("ensureChatSchema error:", err.message);
  }
}

/**
 * Get all participant user IDs in a conversation
 */
async function getConversationParticipantIds(conversationId) {
  const [rows] = await pool.query(
    "SELECT user_id FROM `group_member` WHERE conversation_id = ? AND is_active = 1",
    [conversationId]
  );
  return rows.map((r) => r.user_id).filter(Boolean);
}

/**
 * Check if a user is a member of a conversation
 */
async function isUserMember(conversationId, userId) {
  const [rows] = await pool.query(
    "SELECT group_member_id FROM `group_member` WHERE conversation_id = ? AND user_id = ? AND is_active = 1 LIMIT 1",
    [conversationId, userId]
  );
  return rows.length > 0;
}

/**
 * Get list of conversations for a user with preview information
 */
async function getConversationsForUser(userId) {
  await ensureChatSchema();

  const query = `
    SELECT 
      c.conversation_id AS id,
      c.conversation_name AS name,
      c.conversation_type AS type,
      c.created_date,
      c.pinned_message_id,
      c.last_message_id,
      c.last_message_at,
      gm.last_read_message_id,
      -- Last message details
      lm.content AS last_message_content,
      lm.message_type AS last_message_type,
      lm.created_date AS last_message_date,
      lm.is_deleted AS last_message_is_deleted,
      lm.sender_id AS last_message_sender_id,
      lmu.name AS last_message_sender_name,
      -- Unread message count
      (
        SELECT COUNT(*) 
        FROM \`message\` m_unread 
        WHERE m_unread.conversation_id = c.conversation_id 
          AND m_unread.message_id > COALESCE(gm.last_read_message_id, 0)
          AND m_unread.sender_id != ?
          AND m_unread.is_deleted = 0
      ) AS unread_count
    FROM \`group_member\` gm
    INNER JOIN \`conversation\` c ON gm.conversation_id = c.conversation_id
    LEFT JOIN \`message\` lm ON c.last_message_id = lm.message_id
    LEFT JOIN \`user\` lmu ON lm.sender_id = lmu.user_id
    WHERE gm.user_id = ? AND gm.is_active = 1
    ORDER BY COALESCE(c.last_message_at, c.created_date) DESC
  `;

  const [conversations] = await pool.query(query, [userId, userId]);

  if (conversations.length === 0) return [];

  const convIds = conversations.map((c) => c.id);

  // Fetch participants for all these conversations
  const [participants] = await pool.query(
    `
    SELECT 
      gm.conversation_id,
      u.user_id,
      u.name,
      u.email,
      u.avatar_location,
      u.code AS role
    FROM \`group_member\` gm
    INNER JOIN \`user\` u ON gm.user_id = u.user_id
    WHERE gm.conversation_id IN (?) AND gm.is_active = 1 AND u.is_deleted = 0
  `,
    [convIds]
  );

  const participantsByConv = {};
  participants.forEach((p) => {
    if (!participantsByConv[p.conversation_id]) {
      participantsByConv[p.conversation_id] = [];
    }
    participantsByConv[p.conversation_id].push({
      user_id: String(p.user_id),
      name: p.name,
      email: p.email,
      avatar: p.avatar_location,
      role: p.role,
      isOnline: sseManager.isUserOnline(p.user_id),
    });
  });

  return conversations.map((c) => {
    const isGroup = c.type === "GROUP";
    const members = participantsByConv[c.id] || [];
    const otherMember = !isGroup
      ? members.find((m) => String(m.user_id) !== String(userId)) || members[0]
      : null;

    let displayName = c.name;
    let displayAvatar = null;
    let displayRole = isGroup ? "Nhóm" : "Người dùng";

    if (!isGroup && otherMember) {
      displayName = otherMember.name || otherMember.email || "Người dùng";
      displayAvatar = otherMember.avatar || null;
      displayRole = otherMember.role || "Người dùng";
    }

    let lastMessageText = "";
    if (c.last_message_content) {
      if (c.last_message_is_deleted) {
        lastMessageText = "Tin nhắn đã thu hồi";
      } else if (c.last_message_type === "IMAGE") {
        lastMessageText = "📷 Hình ảnh";
      } else if (c.last_message_type === "FILE") {
        lastMessageText = "📎 File đính kèm";
      } else {
        lastMessageText = c.last_message_content;
      }
    }

    return {
      id: String(c.id),
      name: displayName || "Cuộc trò chuyện",
      avatar: displayAvatar,
      is_group: isGroup,
      created_at: c.created_date ? new Date(c.created_date).toISOString() : new Date().toISOString(),
      pinned_message_id: c.pinned_message_id ? String(c.pinned_message_id) : null,
      lastMessage: lastMessageText,
      lastMessageDate: c.last_message_date ? new Date(c.last_message_date).toISOString() : null,
      lastMessageSenderId: c.last_message_sender_id ? String(c.last_message_sender_id) : null,
      unreadCount: Number(c.unread_count) || 0,
      participants: members,
      room_participants: members.map((m) => ({ user_id: String(m.user_id) })),
    };
  });
}

/**
 * Get conversation details by ID
 */
async function getConversationById(conversationId, userId) {
  await ensureChatSchema();

  const isMember = await isUserMember(conversationId, userId);
  if (!isMember) {
    throw new Error("Unauthorized: You are not a member of this conversation");
  }

  const [convs] = await pool.query(
    "SELECT * FROM `conversation` WHERE conversation_id = ? LIMIT 1",
    [conversationId]
  );
  if (convs.length === 0) {
    throw new Error("Conversation not found");
  }
  const c = convs[0];

  const [participants] = await pool.query(
    `
    SELECT 
      u.user_id,
      u.name,
      u.email,
      u.avatar_location,
      u.code AS role
    FROM \`group_member\` gm
    INNER JOIN \`user\` u ON gm.user_id = u.user_id
    WHERE gm.conversation_id = ? AND gm.is_active = 1 AND u.is_deleted = 0
  `,
    [conversationId]
  );

  const members = participants.map((p) => ({
    user_id: String(p.user_id),
    name: p.name,
    email: p.email,
    avatar: p.avatar_location,
    role: p.role,
    isOnline: sseManager.isUserOnline(p.user_id),
  }));

  const isGroup = c.conversation_type === "GROUP";
  const otherMember = !isGroup
    ? members.find((m) => String(m.user_id) !== String(userId)) || members[0]
    : null;

  return {
    id: String(c.conversation_id),
    name: isGroup ? c.conversation_name : otherMember ? otherMember.name : c.conversation_name,
    avatar: !isGroup && otherMember ? otherMember.avatar : null,
    is_group: isGroup,
    created_at: c.created_date ? new Date(c.created_date).toISOString() : new Date().toISOString(),
    pinned_message_id: c.pinned_message_id ? String(c.pinned_message_id) : null,
    participants: members,
    room_participants: members.map((m) => ({ user_id: String(m.user_id) })),
  };
}

/**
 * Find or create direct (1-on-1) conversation
 */
async function getOrCreateDirectConversation(userId1, userId2) {
  await ensureChatSchema();

  const u1 = Number(userId1);
  const u2 = Number(userId2);
  if (u1 === u2) {
    throw new Error("Cannot create a direct conversation with yourself");
  }

  // Check if direct conversation already exists between u1 and u2
  const [existing] = await pool.query(
    `
    SELECT c.conversation_id 
    FROM \`conversation\` c
    INNER JOIN \`group_member\` gm1 ON c.conversation_id = gm1.conversation_id AND gm1.user_id = ? AND gm1.is_active = 1
    INNER JOIN \`group_member\` gm2 ON c.conversation_id = gm2.conversation_id AND gm2.user_id = ? AND gm2.is_active = 1
    WHERE c.conversation_type = 'SINGLE'
    LIMIT 1
  `,
    [u1, u2]
  );

  if (existing.length > 0) {
    return await getConversationById(existing[0].conversation_id, u1);
  }

  // Create new conversation
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [convResult] = await conn.query(
      `INSERT INTO \`conversation\` (conversation_name, conversation_type, created_by, created_date, modified_date) 
       VALUES (?, 'SINGLE', ?, NOW(6), NOW(6))`,
      [null, String(u1)]
    );
    const convId = convResult.insertId;

    await conn.query(
      `INSERT INTO \`group_member\` (conversation_id, user_id, is_active, created_by, created_date) 
       VALUES (?, ?, 1, ?, NOW(6)), (?, ?, 1, ?, NOW(6))`,
      [convId, u1, String(u1), convId, u2, String(u1)]
    );

    await conn.commit();
    return await getConversationById(convId, u1);
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Create a new group conversation
 */
async function createGroupConversation(creatorId, name, participantIds = []) {
  await ensureChatSchema();

  const cId = Number(creatorId);
  const uniqueMemberIds = Array.from(
    new Set([cId, ...participantIds.map(Number).filter((id) => !isNaN(id) && id > 0)])
  );

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [convResult] = await conn.query(
      `INSERT INTO \`conversation\` (conversation_name, conversation_type, created_by, created_date, modified_date) 
       VALUES (?, 'GROUP', ?, NOW(6), NOW(6))`,
      [name, String(cId)]
    );
    const convId = convResult.insertId;

    for (const mId of uniqueMemberIds) {
      await conn.query(
        `INSERT INTO \`group_member\` (conversation_id, user_id, is_active, created_by, created_date) 
         VALUES (?, ?, 1, ?, NOW(6))`,
        [convId, mId, String(cId)]
      );
    }

    await conn.commit();
    const createdConv = await getConversationById(convId, cId);

    // Notify all participants about new room
    sseManager.sendToUsers(uniqueMemberIds, "room:new", createdConv);

    return createdConv;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Get messages of a conversation with pagination
 */
async function getMessages(conversationId, userId, { limit = 50, beforeDate = null, beforeId = null } = {}) {
  await ensureChatSchema();

  const isMember = await isUserMember(conversationId, userId);
  if (!isMember) {
    throw new Error("Unauthorized: You are not a member of this conversation");
  }

  let whereClause = "m.conversation_id = ?";
  const params = [conversationId];

  if (beforeId) {
    whereClause += " AND m.message_id < ?";
    params.push(Number(beforeId));
  } else if (beforeDate) {
    whereClause += " AND m.created_date < ?";
    params.push(new Date(beforeDate));
  }

  params.push(Number(limit) || 50);

  const query = `
    SELECT 
      m.message_id AS id,
      m.conversation_id AS room_id,
      m.sender_id AS user_id,
      m.content,
      m.message_type AS type,
      m.media_location,
      m.reply_to_id AS reply_to,
      m.is_deleted,
      m.is_edited,
      m.status,
      m.created_date AS created_at,
      u.name AS sender_name,
      u.avatar_location AS sender_avatar
    FROM \`message\` m
    LEFT JOIN \`user\` u ON m.sender_id = u.user_id
    WHERE ${whereClause}
    ORDER BY m.created_date DESC
    LIMIT ?
  `;

  const [rows] = await pool.query(query, params);

  // Return in chronological order
  const messages = rows.reverse().map((r) => ({
    id: String(r.id),
    room_id: String(r.room_id),
    user_id: String(r.user_id),
    content: r.content || "",
    type: r.type ? r.type.toLowerCase() : "text",
    media_location: r.media_location || null,
    reply_to: r.reply_to ? String(r.reply_to) : null,
    is_deleted: Boolean(r.is_deleted),
    is_edited: Boolean(r.is_edited),
    status: r.status === 3 ? "read" : r.status === 2 ? "delivered" : "sent",
    created_at: r.created_at ? new Date(r.created_at).toISOString() : new Date().toISOString(),
    sender_name: r.sender_name,
    sender_avatar: r.sender_avatar,
  }));

  return messages;
}

/**
 * Send a new message to a conversation
 */
async function sendMessage(conversationId, senderId, { content, type = "text", replyTo = null, mediaLocation = null }) {
  await ensureChatSchema();

  const isMember = await isUserMember(conversationId, senderId);
  if (!isMember) {
    throw new Error("Unauthorized: You are not a member of this conversation");
  }

  const normalizedType = (type || "text").toUpperCase();
  const replyToId = replyTo ? Number(replyTo) : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [res] = await conn.query(
      `INSERT INTO \`message\` 
        (conversation_id, sender_id, content, message_type, reply_to_id, media_location, is_deleted, is_edited, status, created_by, created_date, modified_date)
       VALUES (?, ?, ?, ?, ?, ?, 0, 0, 1, ?, NOW(6), NOW(6))`,
      [conversationId, senderId, content, normalizedType, replyToId, mediaLocation, String(senderId)]
    );
    const messageId = res.insertId;

    // Update conversation last message
    await conn.query(
      `UPDATE \`conversation\` 
       SET last_message_id = ?, last_message_at = NOW(6), modified_date = NOW(6)
       WHERE conversation_id = ?`,
      [messageId, conversationId]
    );

    // Update sender's last read message
    await conn.query(
      `UPDATE \`group_member\` 
       SET last_read_message_id = ?, last_activity = NOW(6)
       WHERE conversation_id = ? AND user_id = ?`,
      [messageId, conversationId, senderId]
    );

    await conn.commit();

    // Fetch full message with sender details
    const [rows] = await pool.query(
      `SELECT m.*, u.name AS sender_name, u.avatar_location AS sender_avatar
       FROM \`message\` m
       LEFT JOIN \`user\` u ON m.sender_id = u.user_id
       WHERE m.message_id = ? LIMIT 1`,
      [messageId]
    );

    const m = rows[0];
    const formattedMessage = {
      id: String(m.message_id),
      room_id: String(m.conversation_id),
      user_id: String(m.sender_id),
      content: m.content || "",
      type: m.message_type ? m.message_type.toLowerCase() : "text",
      media_location: m.media_location || null,
      reply_to: m.reply_to_id ? String(m.reply_to_id) : null,
      is_deleted: Boolean(m.is_deleted),
      is_edited: Boolean(m.is_edited),
      status: "sent",
      created_at: m.created_date ? new Date(m.created_date).toISOString() : new Date().toISOString(),
      sender_name: m.sender_name,
      sender_avatar: m.sender_avatar,
    };

    // Broadcast via SSE to all conversation members
    const memberIds = await getConversationParticipantIds(conversationId);
    sseManager.sendToUsers(memberIds, "message:new", formattedMessage);

    return formattedMessage;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/**
 * Mark all messages in a conversation as read for a user
 */
async function markAsRead(conversationId, userId) {
  await ensureChatSchema();

  const [maxMsg] = await pool.query(
    "SELECT MAX(message_id) AS max_id FROM `message` WHERE conversation_id = ?",
    [conversationId]
  );
  const maxId = maxMsg[0]?.max_id || 0;

  await pool.query(
    `UPDATE \`group_member\` 
     SET last_read_message_id = GREATEST(COALESCE(last_read_message_id, 0), ?), last_activity = NOW(6)
     WHERE conversation_id = ? AND user_id = ?`,
    [maxId, conversationId, userId]
  );

  // Notify other members that this user read messages
  const memberIds = await getConversationParticipantIds(conversationId);
  sseManager.sendToUsers(memberIds, "room:read", {
    roomId: String(conversationId),
    userId: String(userId),
    lastReadMessageId: String(maxId),
  });

  return { success: true, lastReadMessageId: maxId };
}

/**
 * Soft delete / recall a message
 */
async function deleteMessage(messageId, userId) {
  await ensureChatSchema();

  const [rows] = await pool.query(
    "SELECT * FROM `message` WHERE message_id = ? LIMIT 1",
    [messageId]
  );
  if (rows.length === 0) {
    throw new Error("Message not found");
  }
  const msg = rows[0];

  if (String(msg.sender_id) !== String(userId)) {
    throw new Error("Unauthorized: You can only recall your own messages");
  }

  await pool.query(
    "UPDATE `message` SET is_deleted = 1, modified_date = NOW(6) WHERE message_id = ?",
    [messageId]
  );

  const updatedMsg = {
    id: String(msg.message_id),
    room_id: String(msg.conversation_id),
    user_id: String(msg.sender_id),
    content: msg.content,
    is_deleted: true,
  };

  const memberIds = await getConversationParticipantIds(msg.conversation_id);
  sseManager.sendToUsers(memberIds, "message:update", updatedMsg);

  return updatedMsg;
}

/**
 * Pin a message in a conversation
 */
async function pinMessage(conversationId, messageId, userId) {
  await ensureChatSchema();

  const isMember = await isUserMember(conversationId, userId);
  if (!isMember) {
    throw new Error("Unauthorized: You are not a member of this conversation");
  }

  await pool.query(
    "UPDATE `conversation` SET pinned_message_id = ?, modified_date = NOW(6) WHERE conversation_id = ?",
    [messageId, conversationId]
  );

  const payload = {
    roomId: String(conversationId),
    pinnedMessageId: String(messageId),
  };

  const memberIds = await getConversationParticipantIds(conversationId);
  sseManager.sendToUsers(memberIds, "room:pinned", payload);

  return payload;
}

/**
 * Unpin a message
 */
async function unpinMessage(conversationId, userId) {
  await ensureChatSchema();

  const isMember = await isUserMember(conversationId, userId);
  if (!isMember) {
    throw new Error("Unauthorized: You are not a member of this conversation");
  }

  await pool.query(
    "UPDATE `conversation` SET pinned_message_id = NULL, modified_date = NOW(6) WHERE conversation_id = ?",
    [conversationId]
  );

  const payload = {
    roomId: String(conversationId),
    pinnedMessageId: null,
  };

  const memberIds = await getConversationParticipantIds(conversationId);
  sseManager.sendToUsers(memberIds, "room:pinned", payload);

  return payload;
}

/**
 * Add a member to a group conversation
 */
async function addMember(conversationId, currentUserId, newUserId) {
  await ensureChatSchema();

  const [convs] = await pool.query(
    "SELECT conversation_type FROM `conversation` WHERE conversation_id = ? LIMIT 1",
    [conversationId]
  );
  if (convs.length === 0 || convs[0].conversation_type !== "GROUP") {
    throw new Error("Can only add members to group conversations");
  }

  const isMember = await isUserMember(conversationId, currentUserId);
  if (!isMember) {
    throw new Error("Unauthorized: You are not a member of this group");
  }

  await pool.query(
    `INSERT INTO \`group_member\` (conversation_id, user_id, is_active, created_by, created_date)
     VALUES (?, ?, 1, ?, NOW(6))
     ON DUPLICATE KEY UPDATE is_active = 1`,
    [conversationId, newUserId, String(currentUserId)]
  );

  const updatedConv = await getConversationById(conversationId, currentUserId);
  const memberIds = await getConversationParticipantIds(conversationId);
  sseManager.sendToUsers(memberIds, "room:updated", updatedConv);

  return updatedConv;
}

/**
 * Leave a group conversation
 */
async function leaveGroup(conversationId, userId) {
  await ensureChatSchema();

  await pool.query(
    "UPDATE `group_member` SET is_active = 0 WHERE conversation_id = ? AND user_id = ?",
    [conversationId, userId]
  );

  const memberIds = await getConversationParticipantIds(conversationId);
  sseManager.sendToUsers(memberIds, "room:member_left", {
    roomId: String(conversationId),
    userId: String(userId),
  });

  return { success: true };
}

/**
 * Broadcast typing indicator
 */
async function broadcastTyping(conversationId, userId, isTyping) {
  const isMember = await isUserMember(conversationId, userId);
  if (!isMember) return;

  const memberIds = await getConversationParticipantIds(conversationId);
  const otherMembers = memberIds.filter((id) => String(id) !== String(userId));

  sseManager.sendToUsers(otherMembers, "room:typing", {
    roomId: String(conversationId),
    userId: String(userId),
    isTyping: Boolean(isTyping),
  });
}

module.exports = {
  ensureChatSchema,
  getConversationsForUser,
  getConversationById,
  getOrCreateDirectConversation,
  createGroupConversation,
  getMessages,
  sendMessage,
  markAsRead,
  deleteMessage,
  pinMessage,
  unpinMessage,
  addMember,
  leaveGroup,
  broadcastTyping,
  getConversationParticipantIds,
};
