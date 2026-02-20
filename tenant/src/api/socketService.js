import { io } from "socket.io-client";

const SOCKET_URL = import.meta.env.VITE_SOCKET_URL;

let socket = null;

/**
 * Connect to the WebSocket server.
 * Call once after login (e.g. in App or DashboardLayout).
 */
export const connectSocket = ({ accessToken, userId, tenantId }) => {
  if (socket?.connected) return socket;

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    query: { userId, tenantId },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("Socket connected:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.log("Socket disconnected:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("Socket connection error:", err.message);
  });

  return socket;
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
 * Get the current socket instance.
 */
export const getSocket = () => socket;

// ─── Chat Events ───

/**
 * Send a chat message.
 */
export const sendChatMessage = ({ conversationId, senderId, receiverId, message, tenantId }) => {
  if (!socket?.connected) {
    console.error("Socket not connected");
    return;
  }
  socket.emit("chatMessage", {
    conversationId,
    senderId,
    receiverId,
    message,
    tenantId,
    timestamp: new Date().toISOString(),
  });
};

/**
 * Listen for incoming chat messages.
 * Returns an unsubscribe function.
 */
export const onChatMessage = (callback) => {
  if (!socket) return () => {};
  socket.on("chatMessage", callback);
  return () => socket.off("chatMessage", callback);
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
  socket.on("typing", callback);
  return () => socket.off("typing", callback);
};

// ─── Notification Events ───

/**
 * Listen for real-time notifications.
 */
export const onNotification = (callback) => {
  if (!socket) return () => {};
  socket.on("notification", callback);
  return () => socket.off("notification", callback);
};

/**
 * Mark notification as read via socket.
 */
export const emitNotificationRead = (notificationId) => {
  if (!socket?.connected) return;
  socket.emit("notificationRead", { notificationId });
};

// ─── Online / Presence ───

export const onUserOnline = (callback) => {
  if (!socket) return () => {};
  socket.on("userOnline", callback);
  return () => socket.off("userOnline", callback);
};

export const onUserOffline = (callback) => {
  if (!socket) return () => {};
  socket.on("userOffline", callback);
  return () => socket.off("userOffline", callback);
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
};
