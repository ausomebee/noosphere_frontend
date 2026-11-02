import { io } from "socket.io-client";

// Strip REST path (/api/v1) — Socket.IO connects to the server origin only
const SOCKET_URL = import.meta.env.VITE_API_URL 
  ? new URL(import.meta.env.VITE_API_URL).origin 
  : null;

let socket = null;
// Who the current socket was opened for. The server binds a socket to the user
// in its handshake, so a socket is never handed to anyone else.
let socketUserId = null;

// Called after the socket comes back from a drop. While it was down — and it
// may come back on the other backend server — anything the server pushed was
// missed, so listeners refetch rather than trust what they hold.
const reconnectListeners = new Set();

// Preserve socket reference across Vite HMR reloads (development only)
if (import.meta.hot) {
  if (import.meta.hot.data?.socket) {
    socket = import.meta.hot.data.socket;
    socketUserId = import.meta.hot.data.socketUserId ?? null;
  }
  import.meta.hot.dispose((data) => {
    data.socket = socket;
    data.socketUserId = socketUserId;
  });
}

export const connectSocket = ({ accessToken, userId, tenantId }) => {
  if (!SOCKET_URL) {
    console.error("[Socket] VITE_API_URL environment variable is not set");
    return null;
  }

  // A socket left over from a different user (logout without a reload, or a
  // session that expired) must not carry this user's traffic.
  if (socket && socketUserId !== userId) {
    disconnectSocket();
  }

  // Same user: reuse the socket even while it is still connecting or waiting
  // out a reconnect backoff — opening a second one leaked the first and doubled
  // every notification. A refreshed token goes on the existing socket's next
  // handshake rather than forcing a disconnect.
  if (socket) {
    socket.auth = { token: accessToken };
    if (!socket.connected && !socket.active) socket.connect();
    return socket;
  }

  socketUserId = userId;
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

  let connectedBefore = false;
  socket.on("connect", () => {
    if (connectedBefore) reconnectListeners.forEach((listener) => listener());
    connectedBefore = true;
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
  socketUserId = null;
};

export const getSocket = () => socket;

/**
 * Listen for the socket reconnecting after a drop (not its first connect).
 * Doesn't need a socket yet, so a page can subscribe before login connects one.
 * Returns an unsubscribe function.
 */
export const onReconnect = (callback) => {
  reconnectListeners.add(callback);
  return () => reconnectListeners.delete(callback);
};

// ─── Chat Events ───

// How long to wait for the server to acknowledge a chat message before the
// sender is told it didn't go through.
export const CHAT_ACK_TIMEOUT_MS = 10000;

export const sendChatMessage = (
  { senderId, senderType = "CLIENT", receiverId, receiverType = "TENANT_STAFF", content },
  callback
) => {
  if (!socket?.connected) {
    callback?.({ success: false, error: "Not connected" });
    return;
  }
  // Without a timeout a message emitted into a half-dead connection waits for
  // an ack forever and sits "sending" with no way to retry.
  socket.timeout(CHAT_ACK_TIMEOUT_MS).emit(
    "chatMessage",
    { senderId, senderType, receiverId, receiverType, content, isRead: false },
    (err, ack) => {
      callback?.(err ? { success: false, error: "Timed out" } : ack);
    }
  );
};

// Each unsubscribe holds the socket it subscribed on: by cleanup time the
// module-level socket may already be gone (logout) or replaced (user switch).
export const onChatMessage = (callback) => {
  if (!socket) return () => {};
  const current = socket;
  current.on("chatMessage", callback);
  return () => current.off("chatMessage", callback);
};

export const emitTyping = ({ userId, isTyping }) => {
  if (!socket?.connected) return;
  socket.emit("typing", { userId, isTyping });
};

export const onTyping = (callback) => {
  if (!socket) return () => {};
  const current = socket;
  current.on("typing", callback);
  return () => current.off("typing", callback);
};

// ─── Notification Events ───

export const onNotification = (callback) => {
  if (!socket) return () => {};
  const current = socket;
  current.on("newNotification", callback);
  return () => current.off("newNotification", callback);
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
  const current = socket;
  current.on("messagesRead", callback);
  return () => current.off("messagesRead", callback);
};

// ─── Online / Presence ───

export const onUserOnline = (callback) => {
  if (!socket) return () => {};
  const current = socket;
  current.on("userOnline", callback);
  return () => current.off("userOnline", callback);
};

export const onUserOffline = (callback) => {
  if (!socket) return () => {};
  const current = socket;
  current.on("userOffline", callback);
  return () => current.off("userOffline", callback);
};

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  onReconnect,
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
