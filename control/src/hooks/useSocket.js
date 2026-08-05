import { useEffect, useRef, useState } from "react";
import useAuth from "./useAuth";
import { showToast } from "../Helper/ShowToast";
import {
  connectSocket,
  disconnectSocket,
  registerUser,
  onNotification,
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
    const handleDisconnect = (reason) => {
      setIsConnected(false);
      if (reason !== "io client disconnect") {
        showToast("Connection lost. Reconnecting...", "error");
      }
    };
    const handleReconnect = () => {
      showToast("Connection restored", "success");
    };

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);
    socket.io.on("reconnect", handleReconnect);

    // Already connected (e.g. hot-reload).
    if (socket.connected) {
      setIsConnected(true);
      registerUser({ userId, userType: "ADMIN" });
    }

    const unsubNotif = onNotification((notif) => cbRef.current.onNotif?.(notif));

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
      socket.io.off("reconnect", handleReconnect);
      unsubNotif();
    };
  }, [accessToken, userId]);

  return { isConnected };
};

export default useSocket;
