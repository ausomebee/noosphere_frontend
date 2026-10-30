import { useEffect, useRef, useState } from "react";
import {
  connectSocket,
  disconnectSocket,
  registerUser,
  onChatMessage,
  onNotification,
  ensureConnected,
} from "../api/socketService";
import useAuth from "./useAuth";

/**
 * Initializes the socket and registers the current user as CLIENT.
 * Call once at the layout level.
 *
 * @param {object} [opts]
 * @param {function} [opts.onMessage]      - Called on every incoming chatMessage
 * @param {function} [opts.onNotification] - Called on every incoming notification
 */
const useSocket = ({ onMessage, onNotification: onNotif } = {}) => {
  const { userId, accessToken, tenantId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const initialized = useRef(false);
  // Keep callbacks in a ref so the effect doesn't re-run on every render
  const cbRef = useRef({ onMessage, onNotif });
  useEffect(() => { cbRef.current = { onMessage, onNotif }; }, [onMessage, onNotif]);

  useEffect(() => {
    // Logged out — disconnect and reset so we can reconnect on next login
    if (!userId || !accessToken) {
      disconnectSocket();
      initialized.current = false;
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket({ accessToken, userId, tenantId });

    const handleConnect = () => {
      setIsConnected(true);
      registerUser({ userId, userType: "CLIENT" });
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

    // If socket already connected (HMR case)
    if (socket.connected) {
      setIsConnected(true);
      registerUser({ userId, userType: "CLIENT" });
    }

    // Global listeners — forwarded to callers via callbacks
    const unsubChat = onChatMessage((msg) => cbRef.current.onMessage?.(msg));
    const unsubNotif = onNotification((notif) => cbRef.current.onNotif?.(notif));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubChat();
      unsubNotif();
    };
  }, [userId, accessToken, tenantId]);

  return { isConnected };
};

export default useSocket;
