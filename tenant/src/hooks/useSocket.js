import { useEffect, useRef, useState } from "react";
import useAuth from "./useAuth";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  registerUser,
  onChatMessage,
  onNotification,
  onTyping,
  ensureConnected,
} from "../api/socketService";

/**
 * Initializes the socket and registers the current user as TENANT_STAFF.
 * Call once at the layout level.
 *
 * @param {object} [opts]
 * @param {function} [opts.onMessage]      - Called on every incoming chatMessage
 * @param {function} [opts.onNotification] - Called on every incoming notification
 */
const useSocket = ({ onMessage, onNotification: onNotif } = {}) => {
  const { accessToken, userId, tenantId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  // Keep callbacks in a ref so the effect doesn't re-run on every render
  const cbRef = useRef({ onMessage, onNotif });
  useEffect(() => { cbRef.current = { onMessage, onNotif }; }, [onMessage, onNotif]);

  // Runs again whenever the token refreshes. connectSocket is idempotent for
  // the same user — it hands back the existing socket with the new token on
  // its `auth` for the next reconnect — so this only re-attaches listeners.
  // (A run-once guard here used to let the cleanup strip the listeners on the
  // first refresh and never put them back, so live badges silently stopped.)
  useEffect(() => {
    if (!accessToken || !userId) return;

    const socket = connectSocket({ accessToken, userId, tenantId });
    if (!socket) return;

    const handleConnect = () => {
      setIsConnected(true);
      registerUser({ userId, userType: "TENANT_STAFF" });
    };
    // No toast on either edge. Backgrounding a tab throttles the heartbeat and
    // drops the socket routinely, so toasting made normal behaviour look like a
    // fault — and "connection restored" means nothing to a clinician. The
    // status indicator carries this instead.
    const handleDisconnect = () => {
      setIsConnected(false);
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Coming back to a throttled tab, socket.io may still be waiting out its
    // backoff — nudge it so the app isn't silently stale for a few seconds.
    const handleVisibility = () => {
      if (document.visibilityState === "visible") ensureConnected();
    };
    document.addEventListener("visibilitychange", handleVisibility);

    // Already connected (e.g. hot-reload)
    if (socket.connected) {
      setIsConnected(true);
      registerUser({ userId, userType: "TENANT_STAFF" });
    }

    // Global listeners — forwarded to callers via callbacks
    const unsubMsg = onChatMessage((msg) => cbRef.current.onMessage?.(msg));
    const unsubNotif = onNotification((notif) => cbRef.current.onNotif?.(notif));

    return () => {
      socket?.off("connect", handleConnect);
      socket?.off("disconnect", handleDisconnect);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubMsg?.();
      unsubNotif?.();
    };
  }, [accessToken, userId, tenantId]);

  return {
    isConnected,
    socket: getSocket(),
    disconnect: disconnectSocket,
    onTyping,
  };
};

export default useSocket;
