import http from "@/core/services/api/http";
import { API_BASE_URL, API_BASE_URL_NODE } from "@/core/config/api";
import { uploadFile, normalizeFileUrl } from "./uploadService";

export type RoomParticipant = {
  user_id: string;
  name?: string;
  email?: string;
  avatar?: string | null;
  role?: string;
  isOnline?: boolean;
};

export type Room = {
  id: string;
  name: string | null;
  avatar?: string | null;
  is_group: boolean;
  created_at: string;
  pinned_message_id: string | null;
  lastMessage?: string;
  lastMessageDate?: string | null;
  lastMessageSenderId?: string | null;
  unreadCount?: number;
  participants?: RoomParticipant[];
  room_participants?: { user_id: string }[];
};

export type Message = {
  id: string;
  room_id: string;
  user_id: string;
  content: string;
  created_at: string;
  reply_to: string | null;
  is_edited: boolean;
  is_deleted: boolean;
  type: string; // "text" | "image" | "file" | "video"
  media_location?: string | null;
  sender_name?: string;
  sender_avatar?: string | null;
  status?: "sending" | "sent" | "delivered" | "read" | "failed";
  tempId?: string;
};

export type MessageStatus = {
  message_id: string;
  user_id: string;
  status: string;
  updated_at: string;
};

// ==================== SSE CONNECTION MANAGER ====================
type EventCallback = (data: unknown) => void;

class RealtimeChatClient {
  private eventSource: EventSource | null = null;
  private currentToken: string | null = null;
  private listeners: Map<string, Set<EventCallback>> = new Map();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private getBaseUrl(): string {
    return API_BASE_URL_NODE || API_BASE_URL || "http://localhost:8080";
  }

  public connect() {
    if (typeof window === "undefined") return;

    const token = localStorage.getItem("access_token");
    if (!token || token === "undefined" || token === "null") {
      this.disconnect();
      return;
    }

    if (this.eventSource && this.currentToken === token) {
      return; // Already connected with valid token
    }

    this.disconnect();
    this.currentToken = token;

    try {
      const url = `${this.getBaseUrl()}/chat/stream?token=${encodeURIComponent(token)}`;
      const es = new EventSource(url);
      this.eventSource = es;

      es.addEventListener("open", () => {
        this.emit("status", { connected: true });
      });

      es.addEventListener("connected", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.emit("connected", data);
        } catch {
          // Ignore parse error
        }
      });

      es.addEventListener("message:new", (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data) as Message;
          this.emit("message:new", msg);
          this.emit(`room:${msg.room_id}:message`, msg);
        } catch (err) {
          console.error("Error parsing message:new SSE event:", err);
        }
      });

      es.addEventListener("message:update", (e: MessageEvent) => {
        try {
          const msg = JSON.parse(e.data) as Message;
          this.emit("message:update", msg);
          this.emit(`room:${msg.room_id}:update`, msg);
        } catch (err) {
          console.error("Error parsing message:update SSE event:", err);
        }
      });

      es.addEventListener("room:read", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.emit("room:read", data);
          this.emit(`room:${data.roomId}:read`, data);
        } catch (err) {
          console.error("Error parsing room:read SSE event:", err);
        }
      });

      es.addEventListener("room:pinned", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.emit("room:pinned", data);
          this.emit(`room:${data.roomId}:pinned`, data);
        } catch (err) {
          console.error("Error parsing room:pinned SSE event:", err);
        }
      });

      es.addEventListener("room:typing", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.emit("room:typing", data);
          this.emit(`room:${data.roomId}:typing`, data);
        } catch (err) {
          console.error("Error parsing room:typing SSE event:", err);
        }
      });

      es.addEventListener("room:new", (e: MessageEvent) => {
        try {
          const room = JSON.parse(e.data) as Room;
          this.emit("room:new", room);
        } catch (err) {
          console.error("Error parsing room:new SSE event:", err);
        }
      });

      es.addEventListener("room:updated", (e: MessageEvent) => {
        try {
          const room = JSON.parse(e.data) as Room;
          this.emit("room:updated", room);
          this.emit(`room:${room.id}:info`, room);
        } catch (err) {
          console.error("Error parsing room:updated SSE event:", err);
        }
      });

      es.addEventListener("room:member_left", (e: MessageEvent) => {
        try {
          const data = JSON.parse(e.data);
          this.emit("room:member_left", data);
        } catch (err) {
          console.error("Error parsing room:member_left SSE event:", err);
        }
      });

      es.onerror = () => {
        this.emit("status", { connected: false });
        // Browser's EventSource will automatically retry connecting.
      };
    } catch (err) {
      console.error("Failed to initialize SSE EventSource:", err);
    }
  }

  public disconnect() {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
    this.currentToken = null;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  public on(event: string, callback: EventCallback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback);

    // Ensure connection is active
    if (!this.eventSource) {
      this.connect();
    }

    return () => {
      this.off(event, callback);
    };
  }

  public off(event: string, callback: EventCallback) {
    const list = this.listeners.get(event);
    if (list) {
      list.delete(callback);
      if (list.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  private emit(event: string, data: unknown) {
    const list = this.listeners.get(event);
    if (list) {
      list.forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`Error in SSE listener for '${event}':`, err);
        }
      });
    }
  }
}

const realtimeClient = new RealtimeChatClient();

// ==================== CHAT SERVICE API ====================
export const chatService = {
  // ==================== ROOMS ====================

  /**
   * Lấy danh sách phòng chat của user
   */
  getRoomsForUser: async (): Promise<Room[]> => {
    realtimeClient.connect();
    const res = await http.get("/chat/rooms");
    return res.data as Room[];
  },

  /**
   * Lấy thông tin chi tiết một phòng
   */
  getRoomById: async (roomId: string): Promise<Room> => {
    const res = await http.get(`/chat/rooms/${roomId}`);
    return res.data as Room;
  },

  /**
   * Lấy danh sách thành viên trong phòng
   */
  getRoomParticipants: async (roomId: string): Promise<RoomParticipant[]> => {
    const res = await http.get(`/chat/rooms/${roomId}`);
    const room = res.data as Room;
    return room.participants || [];
  },

  /**
   * Tạo phòng chat mới (1-1 hoặc nhóm)
   */
  createRoom: async (
    name: string | null,
    isGroup: boolean,
    participantIds: string[]
  ): Promise<Room> => {
    if (isGroup) {
      const res = await http.post("/chat/rooms/group", {
        name: name || "Nhóm mới",
        memberIds: participantIds,
      });
      return res.data as Room;
    } else {
      const partnerId = participantIds[0];
      const res = await http.post("/chat/rooms/direct", { partnerId });
      return res.data as Room;
    }
  },

  /**
   * Tạo phòng nhóm mới
   */
  createGroupRoom: async (
    name: string,
    _creatorId: string,
    memberIds: string[]
  ): Promise<Room> => {
    const res = await http.post("/chat/rooms/group", {
      name: name.trim(),
      memberIds,
    });
    return res.data as Room;
  },

  /**
   * Tìm hoặc tạo phòng chat 1-1 giữa 2 user
   */
  getOrCreateDirectRoom: async (
    _userId1: string,
    userId2: string
  ): Promise<Room> => {
    const res = await http.post("/chat/rooms/direct", {
      partnerId: userId2,
    });
    return res.data as Room;
  },

  /**
   * Thêm thành viên vào nhóm
   */
  addParticipant: async (roomId: string, userId: string) => {
    const res = await http.post(`/chat/rooms/${roomId}/members`, {
      memberId: userId,
    });
    return res.data;
  },

  /**
   * Rời khỏi nhóm
   */
  leaveRoom: async (roomId: string) => {
    const res = await http.post(`/chat/rooms/${roomId}/leave`);
    return res.data;
  },

  // ==================== MESSAGES ====================

  /**
   * Lấy tin nhắn của một phòng (mặc định lấy 50 tin nhắn mới nhất)
   */
  getMessages: async (roomId: string, limit: number = 50): Promise<Message[]> => {
    const res = await http.get(`/chat/rooms/${roomId}/messages`, {
      params: { limit },
    });
    return res.data as Message[];
  },

  /**
   * Lấy thêm tin nhắn cũ hơn (pagination)
   */
  getOlderMessages: async (
    roomId: string,
    beforeDateOrId: string,
    limit: number = 20
  ): Promise<Message[]> => {
    const isId = /^\d+$/.test(beforeDateOrId);
    const params: Record<string, string | number> = { limit };
    if (isId) {
      params.beforeId = beforeDateOrId;
    } else {
      params.beforeDate = beforeDateOrId;
    }

    const res = await http.get(`/chat/rooms/${roomId}/messages`, { params });
    return res.data as Message[];
  },

  /**
   * Gửi tin nhắn văn bản mới
   */
  sendMessage: async (
    roomId: string,
    _userId: string,
    content: string,
    type: string = "text",
    replyTo: string | null = null
  ): Promise<Message> => {
    const res = await http.post(`/chat/rooms/${roomId}/messages`, {
      content,
      type,
      replyTo,
    });
    return res.data as Message;
  },

  /**
   * Gửi tin nhắn có ảnh
   */
  sendImageMessage: async (
    roomId: string,
    userId: string,
    file: File,
    caption?: string
  ): Promise<Message> => {
    // 1. Upload ảnh qua MinIO /upload route
    const relativePath = await uploadFile(file, "chat");
    const imageUrl = normalizeFileUrl(relativePath);

    // 2. Định dạng nội dung ảnh theo cấu trúc hiển thị
    const content = JSON.stringify({
      imageUrl,
      caption: caption || "",
    });

    return await chatService.sendMessage(roomId, userId, content, "image");
  },

  /**
   * Gửi file đính kèm
   */
  sendFileMessage: async (
    roomId: string,
    userId: string,
    file: File
  ): Promise<Message> => {
    const relativePath = await uploadFile(file, "chat");
    const fileUrl = normalizeFileUrl(relativePath);

    const content = JSON.stringify({
      fileUrl,
      fileName: file.name,
      fileSize: file.size,
      fileType: file.type,
    });

    return await chatService.sendMessage(roomId, userId, content, "file");
  },

  /**
   * Xóa/thu hồi tin nhắn
   */
  deleteMessage: async (messageId: string): Promise<void> => {
    await http.delete(`/chat/messages/${messageId}`);
  },

  /**
   * Ghim tin nhắn trong phòng
   */
  pinMessage: async (roomId: string, messageId: string): Promise<void> => {
    await http.put(`/chat/rooms/${roomId}/pin`, { messageId });
  },

  /**
   * Bỏ ghim tin nhắn
   */
  unpinMessage: async (roomId: string): Promise<void> => {
    await http.delete(`/chat/rooms/${roomId}/pin`);
  },

  /**
   * Đánh dấu toàn bộ tin nhắn trong phòng là đã đọc
   */
  markAllAsRead: async (roomId: string): Promise<void> => {
    await http.post(`/chat/rooms/${roomId}/read`);
  },

  /**
   * Gửi trạng thái typing
   */
  sendTyping: async (roomId: string, isTyping: boolean): Promise<void> => {
    await http.post(`/chat/rooms/${roomId}/typing`, { isTyping });
  },

  // ==================== REALTIME SUBSCRIPTIONS ====================

  /**
   * Đăng ký nhận tin nhắn mới realtime cho một phòng
   */
  subscribeToMessages: (
    roomId: string,
    callback: (message: Message) => void
  ) => {
    const unsubscribe = realtimeClient.on(
      `room:${roomId}:message`,
      callback as EventCallback
    );
    return { unsubscribe };
  },

  /**
   * Đăng ký nhận tin nhắn mới trên mọi phòng (để cập nhật preview)
   */
  subscribeToAllMessages: (callback: (message: Message) => void) => {
    const unsubscribe = realtimeClient.on(
      "message:new",
      callback as EventCallback
    );
    return { unsubscribe };
  },

  /**
   * Đăng ký nhận cập nhật tin nhắn (thu hồi, chỉnh sửa)
   */
  subscribeToMessageUpdates: (
    roomId: string,
    callback: (message: Message) => void
  ) => {
    const unsubscribe = realtimeClient.on(
      `room:${roomId}:update`,
      callback as EventCallback
    );
    return { unsubscribe };
  },

  /**
   * Đăng ký nhận trạng thái typing
   */
  subscribeToTyping: (
    roomId: string,
    callback: (data: { roomId: string; userId: string; isTyping: boolean }) => void
  ) => {
    const unsubscribe = realtimeClient.on(
      `room:${roomId}:typing`,
      callback as EventCallback
    );
    return { unsubscribe };
  },

  /**
   * Đăng ký nhận sự kiện đọc tin nhắn
   */
  subscribeToReadReceipts: (
    roomId: string,
    callback: (data: { roomId: string; userId: string; lastReadMessageId: string }) => void
  ) => {
    const unsubscribe = realtimeClient.on(
      `room:${roomId}:read`,
      callback as EventCallback
    );
    return { unsubscribe };
  },

  /**
   * Đăng ký nhận sự kiện ghim tin nhắn
   */
  subscribeToPinnedMessage: (
    roomId: string,
    callback: (data: { roomId: string; pinnedMessageId: string | null }) => void
  ) => {
    const unsubscribe = realtimeClient.on(
      `room:${roomId}:pinned`,
      callback as EventCallback
    );
    return { unsubscribe };
  },

  /**
   * Đăng ký nhận sự kiện tạo phòng mới
   */
  subscribeToNewRooms: (callback: (room: Room) => void) => {
    const unsubscribe = realtimeClient.on("room:new", callback as EventCallback);
    return { unsubscribe };
  },

  /**
   * Hủy đăng ký listener
   */
  unsubscribe: (channelOrSub: { unsubscribe?: () => void } | null | undefined) => {
    if (channelOrSub && typeof channelOrSub.unsubscribe === "function") {
      channelOrSub.unsubscribe();
    }
  },
};
