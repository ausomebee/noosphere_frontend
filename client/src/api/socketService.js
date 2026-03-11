import { io } from "socket.io-client";

// Strip REST path (/api/v1) — Socket.IO connects to the server origin only
const SOCKET_URL = new URL(import.meta.env.VITE_API_URL).origin;

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
  if (socket?.connected) {
    console.log("[Socket] Already connected, reusing socket:", socket.id);
    return socket;
  }

  console.log("[Socket] Attempting connection...", {
    url: SOCKET_URL,
    userId,
    tenantId,
    hasToken: !!accessToken,
  });

  socket = io(SOCKET_URL, {
    auth: { token: accessToken },
    query: { userId, tenantId },
    transports: ["websocket"],
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
  });

  socket.on("connect", () => {
    console.log("[Socket] Connected successfully! ID:", socket.id);
  });

  socket.on("disconnect", (reason) => {
    console.warn("[Socket] Disconnected. Reason:", reason);
  });

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  socket.on("reconnect_attempt", (attempt) => {
    console.log("[Socket] Reconnect attempt #" + attempt);
  });

  socket.on("reconnect", (attempt) => {
    console.log("[Socket] Reconnected after", attempt, "attempts");
  });

  socket.on("reconnect_failed", () => {
    console.error("[Socket] Reconnection failed after max attempts");
  });

  return socket;
};

export const registerUser = ({ userId, userType }) => {
  if (!socket) return;
  socket.emit("register", { userId, userType });
  console.log("[Socket] Registered as:", userType, userId);
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
    console.error("[Socket] Cannot send message: not connected");
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
