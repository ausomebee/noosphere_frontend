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
  // The socket + user last registered, so a token refresh re-running the
  // effect doesn't register the same user on the same socket again.
  const registered = useRef(null);
  // Keep callbacks in a ref so the effect doesn't re-run on every render.
  const cbRef = useRef({ onNotif });
  useEffect(() => {
    cbRef.current = { onNotif };
  }, [onNotif]);

  useEffect(() => {
    // Logged out — disconnect and reset so we can reconnect on next login.
    if (!accessToken || !userId) {
      disconnectSocket();
      registered.current = null;
      return;
    }

    // Runs again on every token refresh. The cleanup below removed the
    // listeners, so they are attached again here; connectSocket hands back the
    // same socket for the same user and updates its auth token.
    const socket = connectSocket({ accessToken, userId });
    if (!socket) return;

    const register = () => {
      registerUser({ userId, userType: "ADMIN" });
      registered.current = { socket, userId };
    };

    const handleConnect = () => {
      setIsConnected(true);
      register();
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

    // Already connected (e.g. hot-reload, or the effect re-ran on a token
    // refresh). Register only if this socket hasn't been told who we are.
    if (socket.connected) {
      setIsConnected(true);
      const last = registered.current;
      if (last?.socket !== socket || last?.userId !== userId) register();
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
