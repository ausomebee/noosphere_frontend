import { useEffect, useRef, useState } from "react";
import useAuth from "./useAuth";
import {
  connectSocket,
  disconnectSocket,
  registerUser,
  onNotification,
  ensureConnected,
} from "../api/socketService";

/**
 * Initializes the socket and registers the current user as ADMIN.
 * Call once at the layout level. Same configuration as tenant/client — only
 * the userType ("ADMIN") and the plain user id differ.
 *
 * @param {object} [opts]
 * @param {function} [opts.onNotification] - Called on every incoming notification
 */
const useSocket = ({ onNotification: onNotif } = {}) => {
  const { accessToken, userId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const initialized = useRef(false);
  // Keep callbacks in a ref so the effect doesn't re-run on every render.
  const cbRef = useRef({ onNotif });
  useEffect(() => {
    cbRef.current = { onNotif };
  }, [onNotif]);

  useEffect(() => {
    // Logged out — disconnect and reset so we can reconnect on next login.
    if (!accessToken || !userId) {
      disconnectSocket();
      initialized.current = false;
      return;
    }

    if (initialized.current) return;
    initialized.current = true;

    const socket = connectSocket({ accessToken, userId });
    if (!socket) {
      initialized.current = false;
      return;
    }

    const handleConnect = () => {
      setIsConnected(true);
      registerUser({ userId, userType: "ADMIN" });
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

    // Already connected (e.g. hot-reload).
    if (socket.connected) {
      setIsConnected(true);
      registerUser({ userId, userType: "ADMIN" });
    }

    const unsubNotif = onNotification((notif) => cbRef.current.onNotif?.(notif));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      document.removeEventListener("visibilitychange", handleVisibility);
      unsubNotif();
    };
  }, [accessToken, userId]);

  return { isConnected };
};

export default useSocket;
