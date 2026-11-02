import { io } from "socket.io-client";

// Strip REST path (/api/v1) — Socket.IO connects to the server origin only.
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : null;

let socket = null;
// Whose socket it is: one user's socket must never be handed to another
// (e.g. a different admin signing in on the same tab).
let socketUserId = null;

// Called after the socket comes back from a drop. While it was down — and it
// may come back on the other backend server — anything the server pushed was
// missed, so listeners refetch rather than trust what they hold.
const reconnectListeners = new Set();

// Preserve socket reference across Vite HMR reloads (development only).
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

/**
 * Connect to the WebSocket server. Call after login (e.g. in the layout). Safe
 * to call again: the same user gets the same socket back. Same configuration as the tenant/client apps — only the registered userType
 * differs (see registerUser).
 */
export const connectSocket = ({ accessToken, userId, tenantId }) => {
  if (!SOCKET_URL) {
    console.error("[Socket] VITE_API_URL environment variable is not set");
    return null;
  }

  if (socket) {
    if (socketUserId === userId) {
      // Same user: reuse it even while it is still connecting or reconnecting —
      // a second socket would double every notification. Keep its token current
      // so its next (re)connect handshake uses the refreshed one.
      socket.auth = { token: accessToken };
      // Fully stopped (not connected and not trying to): start it again.
      if (!socket.connected && !socket.active) socket.connect();
      return socket;
    }
    // A different user: never hand them the previous user's socket.
    disconnectSocket();
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

  socket.on("connect_error", (err) => {
    console.error("[Socket] Connection error:", err.message);
  });

  socket.on("reconnect_failed", () => {
    console.error("[Socket] Reconnection failed after max attempts");
  });

  return socket;
};

/**
 * Register the current user with the socket server. Control admins register
 * as "ADMIN" with their normal user id.
 */
export const registerUser = ({ userId, userType }) => {
  if (!socket) return;
  socket.emit("register", { userId, userType });
};

/**
 * Disconnect from the WebSocket server. Call on logout.
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
  socketUserId = null;
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

/**
 * Listen for the socket reconnecting after a drop (not its first connect).
 * Doesn't need a socket yet, so a page can subscribe before login connects one.
 * Returns an unsubscribe function.
 */
export const onReconnect = (callback) => {
  reconnectListeners.add(callback);
  return () => reconnectListeners.delete(callback);
};

/**
 * Listen for real-time notifications. Backend emits "newNotification".
 * Returns an unsubscribe function.
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

export default {
  connectSocket,
  disconnectSocket,
  getSocket,
  onReconnect,
  registerUser,
  onNotification,
  emitNotificationRead,
};
