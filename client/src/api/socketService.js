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

  return socket;
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

export const registerUser = ({ userId, userType }) => {
  if (!socket) return;
  socket.emit("register", { userId, userType });
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};

export const getSocket = () => socket;

// ─── Chat Events ───

export const sendChatMessage = (
  { senderId, senderType = "CLIENT", receiverId, receiverType = "TENANT_STAFF", content },
  callback
) => {
  if (!socket?.connected) {
    callback?.({ success: false, error: "Not connected" });
    return;
  }
  socket.emit(
    "chatMessage",
    { senderId, senderType, receiverId, receiverType, content, isRead: false },
    callback
  );
};

export const onChatMessage = (callback) => {
  if (!socket) return () => {};
  socket.on("chatMessage", callback);
  return () => socket.off("chatMessage", callback);
};

export const emitTyping = ({ userId, isTyping }) => {
  if (!socket?.connected) return;
  socket.emit("typing", { userId, isTyping });
};

export const onTyping = (callback) => {
  if (!socket) return () => {};
  socket.on("typing", callback);
  return () => socket.off("typing", callback);
};

// ─── Notification Events ───

export const onNotification = (callback) => {
  if (!socket) return () => {};
  socket.on("newNotification", callback);
  return () => socket.off("newNotification", callback);
};

export const emitNotificationRead = (notificationId) => {
  if (!socket?.connected) return;
  socket.emit("notificationRead", { notificationId });
};

// ─── Read Receipts ───

export const emitMessagesRead = ({ readerId, partnerId }) => {
  if (!socket?.connected) return;
  socket.emit("messagesRead", { readerId, partnerId });
};

export const onMessagesRead = (callback) => {
  if (!socket) return () => {};
  socket.on("messagesRead", callback);
  return () => socket.off("messagesRead", callback);
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
  emitMessagesRead,
  onMessagesRead,
  onUserOnline,
  onUserOffline,
};
