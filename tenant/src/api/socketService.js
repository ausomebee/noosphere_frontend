import { io } from "socket.io-client";

// Strip REST path (/api/v1) — Socket.IO connects to the server origin only
const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? new URL(import.meta.env.VITE_API_URL).origin 
  : null;

let socket = null;

// Preserve socket reference across Vite HMR reloads (development only)
if (import.meta.hot) {
  if (import.meta.hot.data?.socket) {
    socket = import.meta.hot.data.socket;
  }
  import.meta.hot.dispose((data) => {
    data.socket = socket;
  });
}

/**
 * Connect to the WebSocket server.
 * Call once after login (e.g. in App or DashboardLayout).
 */
export const connectSocket = ({ accessToken, userId, tenantId }) => {
  if (!SOCKET_URL) {
    console.error("[Socket] VITE_API_URL environment variable is not set");
    return null;
  }

  if (socket?.connected) {
    return socket;
  }

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    query: { userId, tenantId },
    transports: ["websocket"],
    reconnection: true,
    // Infinity, not 10: a backgrounded tab has its timers throttled, so the
    // heartbeat misses and the server drops the socket. Capping attempts meant
    // that after a long spell away the socket gave up for good and only a page
    // reload brought notifications back.
    reconnectionAttempts: Infinity,
    reconnectionDelay: 2000,
    reconnectionDelayMax: 10000,
    randomizationFactor: 0.5,
  });

  socket.on("connect", () => {
  });

  socket.on("disconnect", (reason) => {
    if (import.meta.env.DEV) console.warn("[Socket] Disconnected. Reason:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  socket.on("reconnect_attempt", () => {
  });

  socket.on("reconnect", () => {
  });

  socket.on("reconnect_failed", () => {
    console.error("[Socket] Reconnection failed after max attempts");
  });

  return socket;
};

/**
 * Register the current user with the socket server.
 * Must be called after socket connects.
 * userType: "TENANT_STAFF" | "CLIENT" | "ADMIN"
 */
export const registerUser = ({ userId, userType }) => {
  if (!socket) return;
  socket.emit("register", { userId, userType });
};

/**
 * Disconnect from the WebSocket server.
 * Call on logout.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};
/**
 * Nudges a dropped socket to reconnect immediately.
 *
 * Returning to a backgrounded tab is the common case: the browser un-throttles
 * timers, but socket.io may still be sitting on a backoff delay, so the app
 * feels dead for a few seconds. Called on visibilitychange to close that gap.
 */
export const ensureConnected = () => {
  if (socket && !socket.connected) {
    socket.connect();
  }
  return socket;
};

/**
 * Get the current socket instance.
 */
export const getSocket = () => socket;

// ─── Chat Events ───

/**
 * Create or retrieve an existing conversation between two participants.
 * callback({ success, conversation }) — server's acknowledgement.
 * conversation: { id, participants, messages: [] }
 */
export const createConversation = ({ participants, tenantId }, callback) => {
  if (!socket?.connected) {
    console.error("[Socket] Cannot create conversation: not connected");
    callback?.({ success: false, error: "Not connected" });
    return;
  }
  socket.emit("createConversation", { participants, tenantId }, callback);
};

/**
 * Send a chat message.
 * callback({ success, message }) — server's acknowledgement.
 */
export const sendChatMessage = (
  { senderId, senderType = "TENANT_STAFF", receiverId, receiverType = "CLIENT", content },
  callback
) => {
  if (!socket?.connected) {
    console.error("[Socket] Cannot send message: not connected");
    callback?.({ success: false, error: "Not connected" });
    return;
  }
  // Backend schema: senderId, senderType, receiverId, receiverType, content, isRead
  socket.emit(
    "chatMessage",
    { senderId, senderType, receiverId, receiverType, content, isRead: false },
    callback
  );
};

/**
 * Listen for incoming chat messages.
 * Returns an unsubscribe function.
 */
export const onChatMessage = (callback) => {
  if (!socket) return () => {};
  const _socket = socket;
  _socket.on("chatMessage", callback);
  return () => _socket.off("chatMessage", callback);
};

/**
 * Emit typing indicator.
 */
export const emitTyping = ({ conversationId, userId, isTyping }) => {
  if (!socket?.connected) return;
  socket.emit("typing", { conversationId, userId, isTyping });
};

/**
 * Listen for typing indicator.
 */
export const onTyping = (callback) => {
  if (!socket) return () => {};
  const _socket = socket;
  _socket.on("typing", callback);
  return () => _socket.off("typing", callback);
};

// ─── Notification Events ───

/**
 * Listen for real-time notifications.
 * Backend emits "newNotification" (confirmed from backend test console).
 */
export const onNotification = (callback) => {
  if (!socket) return () => {};
  const _socket = socket;
  _socket.on("newNotification", callback);
  return () => _socket.off("newNotification", callback);
};

/**
 * Mark notification as read via socket.
 */
export const emitNotificationRead = (notificationId) => {
  if (!socket?.connected) return;
  socket.emit("notificationRead", { notificationId });
};

// ─── Read Receipts ───

/**
 * Notify partner that their messages to us have been read.
 * payload: { readerId: userId, partnerId }
 */
export const emitMessagesRead = ({ readerId, partnerId }) => {
  if (!socket?.connected) return;
  socket.emit("messagesRead", { readerId, partnerId });
};

/**
 * Listen for read receipts — fires when partner reads our messages.
 * callback({ readerId, partnerId })
 */
export const onMessagesRead = (callback) => {
  if (!socket) return () => {};
  const _socket = socket;
  _socket.on("messagesRead", callback);
  return () => _socket.off("messagesRead", callback);
};

// ─── Online / Presence ───

export const onUserOnline = (callback) => {
  if (!socket) return () => {};
  const _socket = socket;
  _socket.on("userOnline", callback);
  return () => _socket.off("userOnline", callback);
};

export const onUserOffline = (callback) => {
  if (!socket) return () => {};
  const _socket = socket;
  _socket.on("userOffline", callback);
  return () => _socket.off("userOffline", callback);
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  sendChatMessage,
  onChatMessage,
  emitTyping,
  onTyping,
  onNotification,
  emitNotificationRead,
  onUserOnline,
  onUserOffline,
  emitMessagesRead,
  onMessagesRead,
};
