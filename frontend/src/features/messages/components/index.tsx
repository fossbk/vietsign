"use client";

import React, { useState, useMemo, useEffect, useRef, useCallback } from "react";
import RealTimeClock from './RealtimeClock'
import { useSelector } from "react-redux";
import {
  MessageCircle,
  Search,
  Send,
  MoreVertical,
  Phone,
  Video,
  Image as ImageIcon,
  Paperclip,
  CheckCheck,
  Users,
  Plus,
  Loader2,
  Reply,
  RotateCcw,
  Pin,
  UserPlus,
  LogOut,
  X,
  Download,
  File,
  ChevronLeft,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { formatMessageTime } from "@/data/messagesData";
import { roleLabels, UserItem } from "@/data/usersData";
import { fetchAllUsers } from "@/services/userService";
import { chatService, Room, Message, RoomParticipant } from "@/services/chatService";
import { CallService, CallType, CallState } from "@/services/callService";
import { Modal } from "@/shared/components/common/Modal";
import {
  IncomingCallModal,
  ActiveCallOverlay,
  CallingOverlay,
} from "./CallComponents";

interface ReduxAuthState {
  admin?: {
    user?: {
      user_id?: string | number;
      id?: string | number;
      name?: string;
      avatar_location?: string;
    };
  };
}

interface OptimisticMessage extends Message {
  isOptimistic?: boolean;
}

export const Messages: React.FC = () => {
  const user = useSelector((state: ReduxAuthState) => state.admin?.user);
  const currentUserId = (user?.user_id || user?.id || "1").toString();

 
  // Room states
  const [selectedRoom, setSelectedRoom] = useState<string | null>(null);
  const [selectedRoomData, setSelectedRoomData] = useState<Room | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [rooms, setRooms] = useState<Room[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomsError, setRoomsError] = useState<string | null>(null);

  // Message states
  const [messages, setMessages] = useState<OptimisticMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [newMessage, setNewMessage] = useState("");

  // Typing state
  const [typingUsers, setTypingUsers] = useState<Record<string, boolean>>({});
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const isCurrentlyTypingRef = useRef(false);

  // Reply state
  const [replyTo, setReplyTo] = useState<Message | null>(null);

  // User data
  const [usersMap, setUsersMap] = useState<Record<string, UserItem>>({});
  const [roomParticipants, setRoomParticipants] = useState<RoomParticipant[]>([]);

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [isRoomSettingsOpen, setIsRoomSettingsOpen] = useState(false);

  // Modal form states
  const [groupName, setGroupName] = useState("");
  const [groupMembers, setGroupMembers] = useState("");
  const [newMemberId, setNewMemberId] = useState("");

  // User search states for creating direct chat
  const [userSearchQuery, setUserSearchQuery] = useState("");
  const [showUserSuggestions, setShowUserSuggestions] = useState(false);

  // File upload refs
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const [uploadingMedia, setUploadingMedia] = useState(false);

  // Scroll & container refs
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const shouldAutoScrollRef = useRef(true);

  // Call states & services
  const callServiceRef = useRef<CallService | null>(null);
  const [callState, setCallState] = useState<Partial<CallState>>({
    status: "idle",
  });
  const [incomingCall, setIncomingCall] = useState<{
    callerId: string;
    callType: CallType;
  } | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const callTimerRef = useRef<NodeJS.Timeout | null>(null);

  // ==================== FETCH USERS FOR AUTOCOMPLETE ====================
  useEffect(() => {
    async function loadUsers() {
      try {
        const { users } = await fetchAllUsers({ limit: 1000 });
        const map: Record<string, UserItem> = {};
        users.forEach((u) => {
          map[u.id.toString()] = u;
        });
        setUsersMap(map);
      } catch (e) {
        console.error("Failed to load users", e);
      }
    }
    loadUsers();
  }, []);

  // ==================== FETCH ROOMS ====================
  const loadRooms = useCallback(async () => {
    setLoadingRooms(true);
    setRoomsError(null);
    try {
      const data = await chatService.getRoomsForUser();
      setRooms(data);
    } catch (e: unknown) {
      console.error("Failed to load rooms", e);
      const msg = e instanceof Error ? e.message : "Không thể tải danh sách cuộc trò chuyện";
      setRoomsError(msg);
    } finally {
      setLoadingRooms(false);
    }
  }, []);

  useEffect(() => {
    loadRooms();
  }, [loadRooms]);

  // ==================== GLOBAL REAL-TIME SUBSCRIPTION ====================
  useEffect(() => {
    // 1. Listen for new messages across all rooms to update conversation preview and sort
    const subMessages = chatService.subscribeToAllMessages((newMsg) => {
      setRooms((prevRooms) => {
        let roomExists = false;
        const updated = prevRooms.map((r) => {
          if (r.id === newMsg.room_id) {
            roomExists = true;
            let preview = newMsg.content;
            if (newMsg.is_deleted) preview = "Tin nhắn đã thu hồi";
            else if (newMsg.type === "image") preview = "📷 Hình ảnh";
            else if (newMsg.type === "file") preview = "📎 File đính kèm";

            const isCurrentViewing = selectedRoom === newMsg.room_id;
            const newUnread =
              isCurrentViewing || newMsg.user_id === currentUserId
                ? 0
                : (r.unreadCount || 0) + 1;

            return {
              ...r,
              lastMessage: preview,
              lastMessageDate: newMsg.created_at,
              lastMessageSenderId: newMsg.user_id,
              unreadCount: newUnread,
            };
          }
          return r;
        });

        // If room not found in current list, reload rooms
        if (!roomExists) {
          loadRooms();
          return prevRooms;
        }

        // Re-sort rooms by newest activity first
        return updated.sort((a, b) => {
          const dateA = new Date(a.lastMessageDate || a.created_at).getTime();
          const dateB = new Date(b.lastMessageDate || b.created_at).getTime();
          return dateB - dateA;
        });
      });
    });

    // 2. Listen for newly created rooms
    const subNewRooms = chatService.subscribeToNewRooms((newRoom) => {
      setRooms((prev) => {
        if (prev.some((r) => r.id === newRoom.id)) return prev;
        return [newRoom, ...prev];
      });
    });

    return () => {
      chatService.unsubscribe(subMessages);
      chatService.unsubscribe(subNewRooms);
    };
  }, [selectedRoom, currentUserId, loadRooms]);

  // ==================== LOAD ACTIVE ROOM DATA & MESSAGES ====================
  useEffect(() => {
    if (!selectedRoom) {
      setMessages([]);
      setRoomParticipants([]);
      setSelectedRoomData(null);
      return;
    }

    let isSubscribed = true;

    async function loadRoomDetails() {
      setLoadingMessages(true);
      setHasMoreMessages(true);
      try {
        const [room, participants, msgs] = await Promise.all([
          chatService.getRoomById(selectedRoom!),
          chatService.getRoomParticipants(selectedRoom!),
          chatService.getMessages(selectedRoom!, 50),
        ]);

        if (!isSubscribed) return;

        setSelectedRoomData(room);
        setRoomParticipants(participants);
        setMessages(msgs);
        if (msgs.length < 50) {
          setHasMoreMessages(false);
        }

        // Clear unread count locally and inform backend
        await chatService.markAllAsRead(selectedRoom!);
        setRooms((prev) =>
          prev.map((r) => (r.id === selectedRoom ? { ...r, unreadCount: 0 } : r))
        );
      } catch (err) {
        console.error("Failed to load room details:", err);
      } finally {
        if (isSubscribed) {
          setLoadingMessages(false);
        }
      }
    }

    loadRoomDetails();

    // 1. Room-specific message subscription
    const subMsg = chatService.subscribeToMessages(selectedRoom, (newMsg) => {
      setMessages((prev) => {
        // Prevent duplicate if already exists or matches optimistic message
        const exists = prev.some((m) => m.id === newMsg.id);
        if (exists) return prev;

        const optimisticIndex = prev.findIndex(
          (m) =>
            m.isOptimistic &&
            m.user_id === newMsg.user_id &&
            m.content === newMsg.content
        );

        if (optimisticIndex !== -1) {
          const clone = [...prev];
          clone[optimisticIndex] = newMsg;
          return clone;
        }

        return [...prev, newMsg];
      });

      // If other user sent message, mark read
      if (newMsg.user_id !== currentUserId) {
        chatService.markAllAsRead(selectedRoom);
      }
    });

    // 2. Room-specific message update subscription (edit / delete)
    const subUpdates = chatService.subscribeToMessageUpdates(
      selectedRoom,
      (updatedMsg) => {
        setMessages((prev) =>
          prev.map((m) => (m.id === updatedMsg.id ? { ...m, ...updatedMsg } : m))
        );
      }
    );

    // 3. Typing indicator subscription
    const subTyping = chatService.subscribeToTyping(
      selectedRoom,
      ({ userId, isTyping }) => {
        if (userId === currentUserId) return;
        setTypingUsers((prev) => ({
          ...prev,
          [userId]: isTyping,
        }));
      }
    );

    // 4. Pin message subscription
    const subPin = chatService.subscribeToPinnedMessage(
      selectedRoom,
      ({ pinnedMessageId }) => {
        setSelectedRoomData((prev) =>
          prev ? { ...prev, pinned_message_id: pinnedMessageId } : null
        );
      }
    );

    return () => {
      isSubscribed = false;
      chatService.unsubscribe(subMsg);
      chatService.unsubscribe(subUpdates);
      chatService.unsubscribe(subTyping);
      chatService.unsubscribe(subPin);
      setTypingUsers({});
    };
  }, [selectedRoom, currentUserId]);

  // ==================== LOAD OLDER MESSAGES (PAGINATION) ====================
  const handleLoadOlderMessages = async () => {
    if (!selectedRoom || loadingOlder || !hasMoreMessages || messages.length === 0)
      return;

    const oldestMsg = messages[0];
    if (!oldestMsg) return;

    setLoadingOlder(true);
    const container = messagesContainerRef.current;
    const oldScrollHeight = container ? container.scrollHeight : 0;

    try {
      const older = await chatService.getOlderMessages(selectedRoom, oldestMsg.id, 20);
      if (older.length < 20) {
        setHasMoreMessages(false);
      }

      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const filteredNew = older.filter((m) => !existingIds.has(m.id));
        return [...filteredNew, ...prev];
      });

      // Preserve scroll position
      requestAnimationFrame(() => {
        if (container) {
          container.scrollTop = container.scrollHeight - oldScrollHeight;
        }
      });
    } catch (err) {
      console.error("Failed to load older messages:", err);
    } finally {
      setLoadingOlder(false);
    }
  };

  // ==================== SMART SCROLL BEHAVIOR ====================
  const handleScroll = () => {
    const el = messagesContainerRef.current;
    if (!el) return;
    const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150;
    shouldAutoScrollRef.current = isNearBottom;
  };

  useEffect(() => {
    if (shouldAutoScrollRef.current) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // ==================== SEND MESSAGE WITH OPTIMISTIC UPDATE ====================
  const handleSendMessage = async () => {
    const content = newMessage.trim();
    if (!content || !selectedRoom) return;

    const tempId = `temp_${Date.now()}`;
    const optimisticMsg: OptimisticMessage = {
      id: tempId,
      room_id: selectedRoom,
      user_id: currentUserId,
      content,
      type: "text",
      reply_to: replyTo?.id || null,
      is_deleted: false,
      is_edited: false,
      status: "sending",
      created_at: new Date().toISOString(),
      sender_name: user?.name || "Bạn",
      sender_avatar: user?.avatar_location || null,
      isOptimistic: true,
    };

    // Optimistically append message
    setMessages((prev) => [...prev, optimisticMsg]);
    setNewMessage("");
    setReplyTo(null);
    shouldAutoScrollRef.current = true;

    // Stop typing state
    if (isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = false;
      chatService.sendTyping(selectedRoom, false);
    }

    try {
      const savedMsg = await chatService.sendMessage(
        selectedRoom,
        currentUserId,
        content,
        "text",
        replyTo?.id || null
      );

      // Replace optimistic message with confirmed server message
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...savedMsg, status: "sent" } : m))
      );
    } catch (err) {
      console.error("Error sending message:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === tempId ? { ...m, status: "failed" } : m))
      );
    }
  };

  // ==================== RETRY FAILED MESSAGE ====================
  const handleRetryMessage = async (failedMsg: OptimisticMessage) => {
    if (!selectedRoom) return;

    setMessages((prev) =>
      prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "sending" } : m))
    );

    try {
      const savedMsg = await chatService.sendMessage(
        selectedRoom,
        currentUserId,
        failedMsg.content,
        failedMsg.type || "text",
        failedMsg.reply_to || null
      );

      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...savedMsg, status: "sent" } : m))
      );
    } catch (err) {
      console.error("Retry failed:", err);
      setMessages((prev) =>
        prev.map((m) => (m.id === failedMsg.id ? { ...m, status: "failed" } : m))
      );
    }
  };

  // ==================== TYPING HANDLER ====================
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);

    if (!selectedRoom) return;

    if (!isCurrentlyTypingRef.current) {
      isCurrentlyTypingRef.current = true;
      chatService.sendTyping(selectedRoom, true);
    }

    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }

    typingTimeoutRef.current = setTimeout(() => {
      isCurrentlyTypingRef.current = false;
      chatService.sendTyping(selectedRoom, false);
    }, 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // ==================== RECALL MESSAGE ====================
  const handleRecallMessage = async (messageId: string) => {
    if (!confirm("Bạn có chắc muốn thu hồi tin nhắn này?")) return;

    try {
      await chatService.deleteMessage(messageId);
      setMessages((prev) =>
        prev.map((m) => (m.id === messageId ? { ...m, is_deleted: true } : m))
      );
    } catch (error) {
      console.error("Error recalling message:", error);
      alert("Không thể thu hồi tin nhắn.");
    }
  };

  // ==================== PIN / UNPIN MESSAGE ====================
  const handlePinMessage = async (messageId: string) => {
    if (!selectedRoom) return;

    try {
      await chatService.pinMessage(selectedRoom, messageId);
      setSelectedRoomData((prev) =>
        prev ? { ...prev, pinned_message_id: messageId } : null
      );
    } catch (error) {
      console.error("Error pinning message:", error);
    }
  };

  const handleUnpinMessage = async () => {
    if (!selectedRoom) return;

    try {
      await chatService.unpinMessage(selectedRoom);
      setSelectedRoomData((prev) =>
        prev ? { ...prev, pinned_message_id: null } : null
      );
    } catch (error) {
      console.error("Error unpinning message:", error);
    }
  };

  // ==================== FILE & IMAGE UPLOAD ====================
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;

    setUploadingMedia(true);
    try {
      await chatService.sendImageMessage(selectedRoom, currentUserId, file);
      shouldAutoScrollRef.current = true;
    } catch (error) {
      console.error("Error uploading image:", error);
      alert("Lỗi upload ảnh. Vui lòng thử lại.");
    } finally {
      setUploadingMedia(false);
      if (imageInputRef.current) imageInputRef.current.value = "";
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedRoom) return;

    setUploadingMedia(true);
    try {
      await chatService.sendFileMessage(selectedRoom, currentUserId, file);
      shouldAutoScrollRef.current = true;
    } catch (error) {
      console.error("Error uploading file:", error);
      alert("Lỗi upload file. Vui lòng thử lại.");
    } finally {
      setUploadingMedia(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ==================== CALL INTEGRATION ====================
  useEffect(() => {
    const callService = new CallService(currentUserId);

    callService.onCallStateChange = (state) => {
      setCallState((prev) => ({ ...prev, ...state }));
      if (state.status === "connected") {
        setCallDuration(0);
        callTimerRef.current = setInterval(() => {
          setCallDuration((prev) => prev + 1);
        }, 1000);
      } else if (state.status === "idle" || state.status === "ended") {
        if (callTimerRef.current) {
          clearInterval(callTimerRef.current);
          callTimerRef.current = null;
        }
      }
    };

    callService.onRemoteStream = (stream) => setRemoteStream(stream);
    callService.onIncomingCall = (callerId, callType) =>
      setIncomingCall({ callerId, callType });
    callService.onCallEnded = () => {
      setLocalStream(null);
      setRemoteStream(null);
      setCallDuration(0);
      setIsMuted(false);
      setIsCameraOff(false);
      setIncomingCall(null);
    };

    callServiceRef.current = callService;

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
    };
  }, [currentUserId]);

  const handleStartCall = async (type: CallType) => {
    if (!selectedRoom || !callServiceRef.current) return;
    const receiver = roomParticipants.find((p) => p.user_id !== currentUserId);
    if (!receiver) {
      alert("Không tìm thấy người nhận cuộc gọi");
      return;
    }

    try {
      const stream = await callServiceRef.current.startCall(
        selectedRoom,
        receiver.user_id,
        type
      );
      setLocalStream(stream);
      setCallState({ status: "calling", type, receiverId: receiver.user_id });
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Không thể bắt đầu cuộc gọi";
      alert(msg);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingCall || !selectedRoom || !callServiceRef.current) return;
    try {
      const stream = await callServiceRef.current.acceptCall(
        selectedRoom,
        incomingCall.callType
      );
      setLocalStream(stream);
      setIncomingCall(null);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : "Không thể chấp nhận cuộc gọi";
      alert(msg);
      setIncomingCall(null);
    }
  };

  const handleRejectCall = async () => {
    if (!callServiceRef.current) return;
    await callServiceRef.current.rejectCall();
    setIncomingCall(null);
  };

  const handleEndCall = async () => {
    if (!callServiceRef.current) return;
    await callServiceRef.current.endCall();
  };

  const handleToggleMute = () => {
    if (!callServiceRef.current) return;
    const muted = callServiceRef.current.toggleMute();
    setIsMuted(muted);
  };

  const handleToggleCamera = () => {
    if (!callServiceRef.current) return;
    const off = callServiceRef.current.toggleCamera();
    setIsCameraOff(off);
  };

  const getCallParticipantInfo = () => {
    const participantId =
      incomingCall?.callerId ||
      callState.receiverId ||
      roomParticipants.find((p) => p.user_id !== currentUserId)?.user_id;
    if (!participantId) return { name: "Người dùng", avatar: null };
    const u = usersMap[participantId];
    return {
      name: u?.name || `User ${participantId}`,
      avatar: u?.avatar || null,
    };
  };

  // ==================== CONVERSATION LIST COMPUTATION ====================
  const roomDisplayList = useMemo(() => {
    return rooms.map((room) => {
      let displayName = room.name;
      let displayAvatar = room.avatar || null;
      let displayRole = room.is_group ? "Nhóm" : "Người dùng";
      let isOnline = false;

      if (!room.is_group && room.participants) {
        const otherMember = room.participants.find(
          (p) => String(p.user_id) !== String(currentUserId)
        );
        if (otherMember) {
          displayName = otherMember.name || otherMember.email || "Người dùng";
          displayAvatar = otherMember.avatar || null;
          displayRole = otherMember.role
            ? roleLabels[otherMember.role] || otherMember.role
            : "Người dùng";
          isOnline = Boolean(otherMember.isOnline);
        }
      }

      if (!displayName) displayName = "Cuộc trò chuyện";

      return {
        id: room.id,
        name: displayName,
        avatar: displayAvatar,
        lastMessage: room.lastMessage || "",
        time: room.lastMessageDate
          ? formatMessageTime(room.lastMessageDate)
          : formatMessageTime(room.created_at),
        unread: room.unreadCount || 0,
        online: isOnline,
        role: displayRole,
        isGroup: room.is_group,
        memberCount: room.participants?.length || 0,
      };
    });
  }, [rooms, currentUserId]);

  const filteredRooms = useMemo(() => {
    if (!searchQuery.trim()) return roomDisplayList;
    const q = searchQuery.toLowerCase();
    return roomDisplayList.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.lastMessage.toLowerCase().includes(q)
    );
  }, [roomDisplayList, searchQuery]);

  const selectedChat = useMemo(() => {
    return roomDisplayList.find((r) => r.id === selectedRoom);
  }, [roomDisplayList, selectedRoom]);

  // Active typing string
  const activeTypingText = useMemo(() => {
    const typingIds = Object.keys(typingUsers).filter((id) => typingUsers[id]);
    if (typingIds.length === 0) return null;
    const names = typingIds
      .map((id) => usersMap[id]?.name || "Người dùng")
      .slice(0, 2);
    if (typingIds.length > 2) {
      return `${names.join(", ")} và ${typingIds.length - 2} người khác đang nhập...`;
    }
    return `${names.join(", ")} đang nhập...`;
  }, [typingUsers, usersMap]);

  // ==================== USER SEARCH & CREATE CHAT ====================
  const filteredUserSuggestions = useMemo(() => {
    if (!userSearchQuery.trim()) return [];
    const query = userSearchQuery.toLowerCase();
    return Object.values(usersMap)
      .filter(
        (u) =>
          u.id.toString() !== currentUserId &&
          (u.name?.toLowerCase().includes(query) ||
            u.email?.toLowerCase().includes(query))
      )
      .slice(0, 10);
  }, [userSearchQuery, usersMap, currentUserId]);

  const handleCreateDirectChat = async (partnerId: string) => {
    try {
      const room = await chatService.getOrCreateDirectRoom(
        currentUserId,
        partnerId
      );
      setRooms((prev) => {
        if (prev.some((r) => r.id === room.id)) return prev;
        return [room, ...prev];
      });
      setSelectedRoom(room.id);
      setIsCreateModalOpen(false);
      setUserSearchQuery("");
    } catch (error) {
      console.error("Error creating direct conversation:", error);
      alert("Không thể bắt đầu cuộc trò chuyện");
    }
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!groupName.trim()) return;

    try {
      const memberIds = groupMembers
        .split(",")
        .map((id) => id.trim())
        .filter(Boolean);

      const room = await chatService.createGroupRoom(
        groupName.trim(),
        currentUserId,
        memberIds
      );
      setRooms((prev) => [room, ...prev]);
      setSelectedRoom(room.id);
      setIsGroupModalOpen(false);
      setGroupName("");
      setGroupMembers("");
    } catch (error) {
      console.error("Error creating group:", error);
      alert("Không thể tạo nhóm chat");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberId.trim() || !selectedRoom) return;

    try {
      await chatService.addParticipant(selectedRoom, newMemberId.trim());
      const updated = await chatService.getRoomById(selectedRoom);
      setSelectedRoomData(updated);
      setIsAddMemberModalOpen(false);
      setNewMemberId("");
    } catch (error) {
      console.error("Error adding member:", error);
      alert("Không thể thêm thành viên");
    }
  };

  const handleLeaveGroup = async () => {
    if (!selectedRoom || !confirm("Bạn có chắc muốn rời khỏi nhóm?")) return;

    try {
      await chatService.leaveRoom(selectedRoom);
      setRooms((prev) => prev.filter((r) => r.id !== selectedRoom));
      setSelectedRoom(null);
    } catch (error) {
      console.error("Error leaving group:", error);
    }
  };

  // Helper to render parsed image or file message
  const renderMessageBody = (msg: Message) => {
    if (msg.type === "image") {
      try {
        const data = JSON.parse(msg.content);
        return (
          <div className="space-y-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={data.imageUrl}
              alt="Ảnh đính kèm"
              className="max-w-xs md:max-w-sm rounded-lg cursor-pointer hover:opacity-95 transition-opacity"
              onClick={() => window.open(data.imageUrl, "_blank")}
            />
            {data.caption && (
              <p className="text-sm whitespace-pre-wrap">{data.caption}</p>
            )}
          </div>
        );
      } catch {
        return <p className="text-sm">{msg.content}</p>;
      }
    }

    if (msg.type === "file") {
      try {
        const data = JSON.parse(msg.content);
        const fileSize = data.fileSize
          ? (data.fileSize / 1024).toFixed(1) + " KB"
          : "";
        return (
          <a
            href={data.fileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 p-2 bg-black/5 dark:bg-white/10 rounded-lg hover:bg-black/10 dark:hover:bg-white/20 transition-colors"
          >
            <File size={24} className="shrink-0 text-primary-600 dark:text-primary-400" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{data.fileName}</p>
              {fileSize && <p className="text-xs opacity-70">{fileSize}</p>}
            </div>
            <Download size={18} className="shrink-0 opacity-70" />
          </a>
        );
      } catch {
        return <p className="text-sm">{msg.content}</p>;
      }
    }

    return <p className="text-sm whitespace-pre-wrap leading-relaxed">{msg.content}</p>;
  };

  const getReplySnippet = (replyToId: string | null) => {
    if (!replyToId) return null;
    const repliedMsg = messages.find((m) => m.id === replyToId);
    if (!repliedMsg) return "Tin nhắn trước đó";
    if (repliedMsg.is_deleted) return "Tin nhắn đã thu hồi";
    if (repliedMsg.type === "image") return "📷 Hình ảnh";
    if (repliedMsg.type === "file") return "📎 File đính kèm";
    return repliedMsg.content;
  };

  return (
    <div
      className="bg-white dark:bg-gray-900 fixed top-16 right-0 bottom-0 z-10 overflow-hidden"
      style={{
        left: "var(--sidebar-width, 0px)",
        transition: "left 0.3s ease-in-out",
      }}
    >
      <div className="flex h-full w-full">
        {/* ==================== CONVERSATION SIDEBAR ==================== */}
        <div
          className={`w-full md:w-80 lg:w-96 border-r border-gray-200 dark:border-gray-800 flex flex-col bg-white dark:bg-gray-900 ${
            selectedRoom ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Header */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <MessageCircle className="text-primary-600" size={22} />
              Tin nhắn
            </h2>
            <div className="flex gap-1">
              <button
                onClick={() => setIsGroupModalOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                title="Tạo nhóm chat"
                aria-label="Tạo nhóm chat"
              >
                <Users size={20} />
              </button>
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                title="Chat riêng"
                aria-label="Chat riêng"
              >
                <Plus size={20} />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="p-4 border-b border-gray-100 dark:border-gray-800">
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                placeholder="Tìm cuộc trò chuyện..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-xl text-sm focus:ring-2 focus:ring-primary-500 outline-none"
              />
            </div>
          </div>

          {/* Room List */}
          <div className="flex-1 overflow-y-auto">
            {loadingRooms ? (
              <div className="p-4 space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="flex items-center gap-3 animate-pulse">
                    <div className="w-12 h-12 rounded-full bg-gray-200 dark:bg-gray-700 shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-2/3" />
                      <div className="h-3 bg-gray-100 dark:bg-gray-800 rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : roomsError ? (
              <div className="p-6 text-center text-gray-500 dark:text-gray-400">
                <AlertCircle className="mx-auto mb-2 text-red-500" size={32} />
                <p className="text-sm mb-3">{roomsError}</p>
                <button
                  onClick={loadRooms}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-medium rounded-lg hover:bg-primary-700"
                >
                  <RefreshCw size={14} /> Thử lại
                </button>
              </div>
            ) : filteredRooms.length === 0 ? (
              <div className="p-8 text-center text-gray-400 dark:text-gray-500">
                <MessageCircle size={44} className="mx-auto mb-2 opacity-50" />
                <p className="text-sm font-medium">Chưa có cuộc trò chuyện nào</p>
                <p className="text-xs mt-1">Bấm dấu + để bắt đầu nhắn tin</p>
              </div>
            ) : (
              filteredRooms.map((room) => {
                const isSelected = selectedRoom === room.id;
                return (
                  <div
                    key={room.id}
                    onClick={() => setSelectedRoom(room.id)}
                    className={`flex items-center gap-3 p-3.5 cursor-pointer transition-colors border-b border-gray-50 dark:border-gray-800/50 ${
                      isSelected
                        ? "bg-primary-50 dark:bg-primary-950/30 border-l-4 border-l-primary-600"
                        : "hover:bg-gray-50 dark:hover:bg-gray-800/40"
                    }`}
                  >
                    {/* Avatar with Online Presence Dot */}
                    <div className="relative shrink-0">
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold overflow-hidden">
                        {room.avatar ? (
                          /* eslint-disable-next-line @next/next/no-img-element */
                          <img
                            src={room.avatar}
                            alt={room.name}
                            className="w-full h-full object-cover"
                          />
                        ) : room.isGroup ? (
                          <Users size={20} />
                        ) : (
                          room.name.charAt(0).toUpperCase()
                        )}
                      </div>
                      {room.online && (
                        <span
                          className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full"
                          title="Đang hoạt động"
                        />
                      )}
                    </div>

                    {/* Room Info & Snippet */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                          {room.name}
                        </h4>
                        <span className="text-xs text-gray-400 shrink-0 ml-1">
                          {room.time}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-1">
                        <p className="text-xs text-gray-500 dark:text-gray-400 truncate flex-1">
                          {room.lastMessage || room.role}
                        </p>
                        {room.unread > 0 && (
                          <span className="shrink-0 px-2 py-0.5 bg-primary-600 text-white rounded-full text-xs font-bold leading-none">
                            {room.unread > 99 ? "99+" : room.unread}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* ==================== MAIN CHAT PANE ==================== */}
        {selectedChat ? (
          <div
            className={`flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-950 ${
              selectedRoom ? "flex" : "hidden md:flex"
            }`}
          >
            {/* Chat Header */}
            <div className="p-3.5 border-b border-gray-200 dark:border-gray-800 flex items-center justify-between bg-white dark:bg-gray-900">
              <div className="flex items-center gap-3 min-w-0">
                {/* Back button on mobile */}
                <button
                  onClick={() => setSelectedRoom(null)}
                  className="md:hidden p-1.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300"
                  aria-label="Quay lại danh sách"
                >
                  <ChevronLeft size={22} />
                </button>

                <div className="relative shrink-0">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm overflow-hidden">
                    {selectedChat.avatar ? (
                      /* eslint-disable-next-line @next/next/no-img-element */
                      <img
                        src={selectedChat.avatar}
                        alt={selectedChat.name}
                        className="w-full h-full object-cover"
                      />
                    ) : selectedChat.isGroup ? (
                      <Users size={18} />
                    ) : (
                      selectedChat.name.charAt(0).toUpperCase()
                    )}
                  </div>
                  {selectedChat.online && (
                    <span className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-white dark:border-gray-900 rounded-full" />
                  )}
                </div>

                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                    {selectedChat.name}
                  </h3>
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                    {activeTypingText ? (
                      <span className="text-primary-600 dark:text-primary-400 font-medium animate-pulse">
                        {activeTypingText}
                      </span>
                    ) : selectedChat.isGroup ? (
                      `${roomParticipants.length} thành viên`
                    ) : selectedChat.online ? (
                      <span className="text-green-600 dark:text-green-400">
                        Đang hoạt động
                      </span>
                    ) : (
                      selectedChat.role
                    )}
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={() => handleStartCall("audio")}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                  title="Gọi thoại"
                >
                  <Phone size={19} />
                </button>
                <button
                  onClick={() => handleStartCall("video")}
                  className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-600 dark:text-gray-300"
                  title="Gọi video"
                >
                  <Video size={19} />
                </button>
                <div className="relative">
                  <button
                    onClick={() => setIsRoomSettingsOpen(!isRoomSettingsOpen)}
                    className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg text-gray-600 dark:text-gray-300"
                    title="Cài đặt phòng"
                  >
                    <MoreVertical size={19} />
                  </button>

                  {/* Dropdown Menu */}
                  {isRoomSettingsOpen && (
                    <div className="absolute right-0 top-full mt-1 bg-white dark:bg-gray-800 shadow-xl rounded-xl border border-gray-100 dark:border-gray-700 p-1.5 z-50 min-w-[190px]">
                      {selectedChat.isGroup && (
                        <>
                          <button
                            onClick={() => {
                              setIsAddMemberModalOpen(true);
                              setIsRoomSettingsOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left text-sm text-gray-700 dark:text-gray-200"
                          >
                            <UserPlus size={16} /> Thêm thành viên
                          </button>
                          <button
                            onClick={() => {
                              handleLeaveGroup();
                              setIsRoomSettingsOpen(false);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left text-sm text-red-600"
                          >
                            <LogOut size={16} /> Rời nhóm
                          </button>
                        </>
                      )}
                      <button
                        onClick={() => setIsRoomSettingsOpen(false)}
                        className="w-full flex items-center gap-2 px-3 py-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg text-left text-sm text-gray-600 dark:text-gray-300"
                      >
                        <X size={16} /> Đóng
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Pinned Message Banner */}
            {selectedRoomData?.pinned_message_id && (
              <div className="px-4 py-2 bg-yellow-50 dark:bg-yellow-950/40 border-b border-yellow-200 dark:border-yellow-800 flex items-center gap-2">
                <Pin size={16} className="text-yellow-600 dark:text-yellow-400 shrink-0" />
                <p className="text-xs text-yellow-800 dark:text-yellow-200 truncate flex-1 font-medium">
                  Ghim: {getReplySnippet(selectedRoomData.pinned_message_id)}
                </p>
                <button
                  onClick={handleUnpinMessage}
                  className="p-1 hover:bg-yellow-200/50 rounded text-yellow-700 dark:text-yellow-300"
                  title="Bỏ ghim"
                >
                  <X size={14} />
                </button>
              </div>
            )}

            {/* Messages Scroll Area */}
            <div
              ref={messagesContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {/* Pagination load older button */}
              {hasMoreMessages && messages.length >= 20 && (
                <div className="flex justify-center pb-2">
                  <button
                    onClick={handleLoadOlderMessages}
                    disabled={loadingOlder}
                    className="inline-flex items-center gap-1.5 px-3 py-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-300 shadow-sm hover:bg-gray-50"
                  >
                    {loadingOlder && <Loader2 size={13} className="animate-spin" />}
                    {loadingOlder ? "Đang tải..." : "Tải thêm tin nhắn cũ"}
                  </button>
                </div>
              )}

              {loadingMessages ? (
                <div className="flex justify-center items-center h-48">
                  <Loader2 className="animate-spin text-primary-600" size={32} />
                </div>
              ) : messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center text-gray-400 dark:text-gray-500">
                    <MessageCircle size={48} className="mx-auto mb-2 opacity-40" />
                    <p className="text-sm font-medium">Chưa có tin nhắn nào</p>
                    <p className="text-xs mt-1">Hãy gửi tin nhắn đầu tiên để bắt đầu!</p>
                  </div>
                </div>
              ) : (
                messages.map((msg) => {
                  const isMe = msg.user_id === currentUserId;
                  const sender = usersMap[msg.user_id];
                  const replyText = getReplySnippet(msg.reply_to);

                  return (
                    <div
                      key={msg.id}
                      className={`flex ${isMe ? "justify-end" : "justify-start"} group relative`}
                    >
                      {/* Avatar for others in group */}
                      {!isMe && selectedChat.isGroup && (
                        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center text-white text-xs font-bold overflow-hidden shrink-0 mr-2 self-end mb-1">
                          {msg.sender_avatar ? (
                            /* eslint-disable-next-line @next/next/no-img-element */
                            <img
                              src={msg.sender_avatar}
                              alt={msg.sender_name || ""}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            (msg.sender_name || sender?.name || "U").charAt(0)
                          )}
                        </div>
                      )}

                      <div className="max-w-[78%] sm:max-w-[70%]">
                        {!isMe && selectedChat.isGroup && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mb-1 ml-1 font-medium">
                            {msg.sender_name || sender?.name || "Thành viên"}
                          </p>
                        )}

                        {/* Reply reference header */}
                        {msg.reply_to && (
                          <div className="mb-1 px-3 py-1 bg-gray-200 dark:bg-gray-800 rounded-lg text-xs text-gray-600 dark:text-gray-300 border-l-2 border-primary-500 truncate">
                            <Reply size={12} className="inline mr-1" />
                            {replyText}
                          </div>
                        )}

                        {/* Message Bubble */}
                        <div
                          className={`px-4 py-2.5 rounded-2xl ${
                            msg.is_deleted
                              ? "bg-gray-200 dark:bg-gray-800 text-gray-500 italic border border-gray-300 dark:border-gray-700"
                              : isMe
                              ? "bg-primary-600 text-white rounded-br-sm shadow-sm"
                              : "bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 shadow-sm border border-gray-100 dark:border-gray-700 rounded-bl-sm"
                          }`}
                        >
                          {msg.is_deleted ? (
                            <p className="text-xs flex items-center gap-1">
                              <RotateCcw size={13} /> Tin nhắn đã thu hồi
                            </p>
                          ) : (
                            renderMessageBody(msg)
                          )}

                          {/* Footer with Timestamp & Status */}
                          {!msg.is_deleted && (
                            <div
                              className={`flex items-center justify-end gap-1 mt-1 text-[11px] ${
                                isMe
                                  ? "text-primary-100/90"
                                  : "text-gray-400 dark:text-gray-400"
                              }`}
                            >
                              <span><RealTimeClock /></span>
                              {isMe && (
                                <>
                                  {msg.status === "sending" ? (
                                    <Loader2 size={12} className="animate-spin" />
                                  ) : msg.status === "failed" ? (
                                    <button
                                      onClick={() => handleRetryMessage(msg)}
                                      className="text-red-300 hover:text-white flex items-center gap-0.5"
                                      title="Gửi lại"
                                    >
                                      <AlertCircle size={12} /> Thử lại
                                    </button>
                                  ) : (
                                    <CheckCheck size={14} />
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>

                        {/* Hover Action Bar */}
                        {!msg.is_deleted && msg.status !== "sending" && (
                          <div
                            className={`absolute top-0 ${
                              isMe ? "right-0" : "left-0"
                            } hidden group-hover:flex items-center gap-1 -mt-7 bg-white dark:bg-gray-800 shadow-md border border-gray-200 dark:border-gray-700 rounded-lg p-1 z-20`}
                          >
                            <button
                              onClick={() => setReplyTo(msg)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-300"
                              title="Trả lời"
                            >
                              <Reply size={13} />
                            </button>
                            <button
                              onClick={() => handlePinMessage(msg.id)}
                              className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-500 dark:text-gray-300"
                              title="Ghim"
                            >
                              <Pin size={13} />
                            </button>
                            {isMe && (
                              <button
                                onClick={() => handleRecallMessage(msg.id)}
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-orange-500"
                                title="Thu hồi"
                              >
                                <RotateCcw size={13} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Reply Preview Bar */}
            {replyTo && (
              <div className="px-4 py-2 bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <Reply size={16} className="text-primary-600 shrink-0" />
                  <div className="truncate">
                    <p className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                      Đang trả lời {replyTo.sender_name || "người dùng"}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {replyTo.content}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setReplyTo(null)}
                  className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded text-gray-500"
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {/* Message Input Bar */}
            <div className="p-3 sm:p-4 border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
              <div className="flex items-end gap-2">
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <input
                  type="file"
                  ref={imageInputRef}
                  accept="image/*"
                  onChange={handleImageUpload}
                  className="hidden"
                />

                {/* Upload Buttons */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors shrink-0"
                  title="Đính kèm tệp"
                >
                  <Paperclip size={20} />
                </button>
                <button
                  onClick={() => imageInputRef.current?.click()}
                  disabled={uploadingMedia}
                  className="p-2.5 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl text-gray-500 dark:text-gray-400 transition-colors shrink-0"
                  title="Đính kèm ảnh"
                >
                  <ImageIcon size={20} />
                </button>

                {/* Auto-resizing Textarea */}
                <div className="flex-1 relative">
                  <textarea
                    rows={1}
                    placeholder="Nhập tin nhắn... "
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    className="w-full px-4 py-2.5 bg-gray-100 dark:bg-gray-800 text-gray-900 dark:text-gray-100 rounded-2xl text-sm focus:ring-2 focus:ring-primary-500 outline-none resize-none max-h-32 leading-relaxed"
                  />
                  {uploadingMedia && (
                    <div className="absolute right-3 top-3">
                      <Loader2 size={16} className="animate-spin text-primary-600" />
                    </div>
                  )}
                </div>

                {/* Send Button */}
                <button
                  onClick={handleSendMessage}
                  disabled={!newMessage.trim() || uploadingMedia}
                  className="p-2.5 bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:hover:bg-primary-600 text-white rounded-xl transition-all shadow-sm shrink-0"
                  title="Gửi tin nhắn"
                >
                  <Send size={19} />
                </button>
              </div>
            </div>
          </div>
        ) : (
          /* Empty Room Selection Pane */
          <div className="hidden md:flex flex-1 items-center justify-center bg-gray-50 dark:bg-gray-950">
            <div className="text-center p-8 max-w-sm">
              <div className="w-20 h-20 bg-primary-100 dark:bg-primary-950/50 rounded-full flex items-center justify-center mx-auto mb-4 text-primary-600">
                <MessageCircle size={38} />
              </div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-2">
                Chưa chọn cuộc trò chuyện
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                Chọn một cuộc trò chuyện từ danh sách bên trái hoặc bắt đầu cuộc trò chuyện mới.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ==================== CREATE DIRECT CHAT MODAL ==================== */}
      <Modal
        isOpen={isCreateModalOpen}
        onClose={() => {
          setIsCreateModalOpen(false);
          setUserSearchQuery("");
          setShowUserSuggestions(false);
        }}
        title="Bắt đầu cuộc trò chuyện mới"
      >
        <div className="space-y-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tìm kiếm người dùng
            </label>
            <div className="relative">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
                size={18}
              />
              <input
                type="text"
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value);
                  setShowUserSuggestions(true);
                }}
                onFocus={() => setShowUserSuggestions(true)}
                placeholder="Nhập tên hoặc email..."
                className="w-full pl-10 pr-4 py-2.5 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-gray-900 dark:text-gray-100"
                autoComplete="off"
              />
            </div>

            {/* User Suggestions */}
            {showUserSuggestions && filteredUserSuggestions.length > 0 && (
              <div className="absolute z-30 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-gray-100 dark:divide-gray-700">
                {filteredUserSuggestions.map((u) => (
                  <div
                    key={u.id}
                    className="flex items-center gap-3 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary-400 to-primary-600 flex items-center justify-center text-white font-bold text-sm shrink-0">
                      {u.avatar ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img
                          src={u.avatar}
                          alt={u.name || ""}
                          className="w-full h-full object-cover rounded-full"
                        />
                      ) : (
                        u.name?.charAt(0)?.toUpperCase() || "U"
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">
                        {u.name || `User ${u.id}`}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                        {u.email}{" "}
                        {u.role && (
                          <span className="text-primary-600 dark:text-primary-400">
                            • {roleLabels[u.role] || u.role}
                          </span>
                        )}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleCreateDirectChat(u.id.toString())}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary-600 text-white text-xs font-semibold rounded-lg hover:bg-primary-700 transition-colors shrink-0"
                    >
                      <MessageCircle size={14} /> Nhắn tin
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => {
                setIsCreateModalOpen(false);
                setUserSearchQuery("");
              }}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Đóng
            </button>
          </div>
        </div>
      </Modal>

      {/* ==================== CREATE GROUP MODAL ==================== */}
      <Modal
        isOpen={isGroupModalOpen}
        onClose={() => setIsGroupModalOpen(false)}
        title="Tạo nhóm chat mới"
      >
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Tên nhóm
            </label>
            <input
              type="text"
              value={groupName}
              onChange={(e) => setGroupName(e.target.value)}
              placeholder="VD: Nhóm ôn tập lớp 1"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID các thành viên (phân cách bằng dấu phẩy)
            </label>
            <input
              type="text"
              value={groupMembers}
              onChange={(e) => setGroupMembers(e.target.value)}
              placeholder="VD: 2, 3, 5"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-gray-900 dark:text-gray-100"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsGroupModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold"
            >
              Tạo nhóm
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================== ADD MEMBER MODAL ==================== */}
      <Modal
        isOpen={isAddMemberModalOpen}
        onClose={() => setIsAddMemberModalOpen(false)}
        title="Thêm thành viên vào nhóm"
      >
        <form onSubmit={handleAddMember} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              ID thành viên
            </label>
            <input
              type="text"
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              placeholder="Nhập ID người dùng (VD: 3)"
              className="w-full px-4 py-2 border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 rounded-lg focus:ring-2 focus:ring-primary-500 outline-none text-sm text-gray-900 dark:text-gray-100"
              required
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsAddMemberModalOpen(false)}
              className="px-4 py-2 text-sm text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg"
            >
              Hủy
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 text-sm font-semibold"
            >
              Thêm
            </button>
          </div>
        </form>
      </Modal>

      {/* ==================== WEBRTC CALL OVERLAYS ==================== */}
      <IncomingCallModal
        isOpen={!!incomingCall}
        callerName={getCallParticipantInfo().name}
        callerAvatar={getCallParticipantInfo().avatar}
        callType={incomingCall?.callType || "audio"}
        onAccept={handleAcceptCall}
        onReject={handleRejectCall}
      />

      <CallingOverlay
        isOpen={callState.status === "calling"}
        callType={(callState.type as CallType) || "audio"}
        receiverName={getCallParticipantInfo().name}
        receiverAvatar={getCallParticipantInfo().avatar}
        onCancel={handleEndCall}
      />

      <ActiveCallOverlay
        isOpen={callState.status === "connected"}
        callType={(callState.type as CallType) || "audio"}
        participantName={getCallParticipantInfo().name}
        participantAvatar={getCallParticipantInfo().avatar}
        localStream={localStream}
        remoteStream={remoteStream}
        callDuration={callDuration}
        isMuted={isMuted}
        isCameraOff={isCameraOff}
        onToggleMute={handleToggleMute}
        onToggleCamera={handleToggleCamera}
        onEndCall={handleEndCall}
      />
    </div>
  );
};
