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
  const initialized = useRef(false);
  // Keep callbacks in a ref so the effect doesn't re-run on every render
  const cbRef = useRef({ onMessage, onNotif });
  useEffect(() => { cbRef.current = { onMessage, onNotif }; }, [onMessage, onNotif]);

  useEffect(() => {
    if (!accessToken || !userId || initialized.current) return;

    const socket = connectSocket({ accessToken, userId, tenantId });
    initialized.current = true;

    const handleConnect = () => {
      setIsConnected(true);
      registerUser({ userId, userType: "TENANT_STAFF" });
    };
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

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
