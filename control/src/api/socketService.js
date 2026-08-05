import { io } from "socket.io-client";

// Strip REST path (/api/v1) — Socket.IO connects to the server origin only.
const SOCKET_URL = import.meta.env.VITE_API_URL
  ? new URL(import.meta.env.VITE_API_URL).origin
  : null;

let socket = null;

// Preserve socket reference across Vite HMR reloads (development only).
if (import.meta.hot) {
  if (import.meta.hot.data?.socket) {
    socket = import.meta.hot.data.socket;
  }
  import.meta.hot.dispose((data) => {
    data.socket = socket;
  });
}

/**
 * Connect to the WebSocket server. Call once after login (e.g. in the layout).
 * Same configuration as the tenant/client apps — only the registered userType
 * differs (see registerUser).
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
    reconnectionAttempts: 10,
    reconnectionDelay: 2000,
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
};

/**
 * Get the current socket instance.
 */
export const getSocket = () => socket;

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
  registerUser,
  onNotification,
  emitNotificationRead,
};
