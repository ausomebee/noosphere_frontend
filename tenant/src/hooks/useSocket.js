import { useEffect, useRef, useState } from "react";
import useAuth from "./useAuth";
import {
  connectSocket,
  disconnectSocket,
  getSocket,
  onChatMessage,
  onNotification,
  onTyping,
} from "../api/socketService";

const useSocket = () => {
  const { accessToken, userId, tenantId } = useAuth();
  const [isConnected, setIsConnected] = useState(false);
  const initialized = useRef(false);

  useEffect(() => {
    if (!accessToken || !userId || initialized.current) return;

    const socket = connectSocket({ accessToken, userId, tenantId });
    initialized.current = true;

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);

    socket.on("connect", handleConnect);
    socket.on("disconnect", handleDisconnect);

    // Set initial state if already connected
    if (socket.connected) setIsConnected(true);

    return () => {
      socket.off("connect", handleConnect);
      socket.off("disconnect", handleDisconnect);
    };
  }, [accessToken, userId, tenantId]);

  return {
    isConnected,
    socket: getSocket(),
    disconnect: disconnectSocket,
    onChatMessage,
    onNotification,
    onTyping,
  };
};

export default useSocket;
