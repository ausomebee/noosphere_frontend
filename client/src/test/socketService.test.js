import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock socket.io-client
const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

// Must import AFTER mock
import {
  connectSocket, disconnectSocket, getSocket,
  sendChatMessage, emitTyping, registerUser,
  onChatMessage, onTyping, onUserOnline, onUserOffline,
  emitMessagesRead, onMessagesRead,
} from "../api/socketService";

describe("socketService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSocket.connected = false;
    // Reset internal socket state by disconnecting
    disconnectSocket();
  });

  describe("connectSocket", () => {
    it("creates socket connection", () => {
      const socket = connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      expect(socket).toBeDefined();
    });

    it("returns existing socket if already connected", () => {
      const socket1 = connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      mockSocket.connected = true;
      const socket2 = connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      expect(socket2).toBe(socket1);
    });
  });

  describe("disconnectSocket", () => {
    it("disconnects and nullifies socket", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      disconnectSocket();
      expect(getSocket()).toBeNull();
    });
  });

  describe("registerUser", () => {
    it("emits register event", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      registerUser({ userId: "u1", userType: "CLIENT" });
      expect(mockSocket.emit).toHaveBeenCalledWith("register", { userId: "u1", userType: "CLIENT" });
    });
  });

  describe("sendChatMessage", () => {
    it("calls callback with error when not connected", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      mockSocket.connected = false;
      const callback = vi.fn();
      sendChatMessage({ senderId: "u1", receiverId: "u2", content: "hi" }, callback);
      expect(callback).toHaveBeenCalledWith({ success: false, error: "Not connected" });
    });

    it("emits chatMessage when connected", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      mockSocket.connected = true;
      const callback = vi.fn();
      sendChatMessage({ senderId: "u1", receiverId: "u2", content: "hello" }, callback);
      expect(mockSocket.emit).toHaveBeenCalledWith("chatMessage", expect.objectContaining({
        senderId: "u1", receiverId: "u2", content: "hello",
      }), callback);
    });
  });

  describe("emitTyping", () => {
    it("emits typing event when connected", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      mockSocket.connected = true;
      emitTyping({ userId: "u1", isTyping: true });
      expect(mockSocket.emit).toHaveBeenCalledWith("typing", { userId: "u1", isTyping: true });
    });

    it("does nothing when not connected", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      mockSocket.connected = false;
      emitTyping({ userId: "u1", isTyping: true });
      expect(mockSocket.emit).not.toHaveBeenCalledWith("typing", expect.anything());
    });
  });

  describe("event listeners", () => {
    it("onChatMessage subscribes and returns unsubscribe", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      const callback = vi.fn();
      const unsub = onChatMessage(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("chatMessage", callback);
      unsub();
      expect(mockSocket.off).toHaveBeenCalledWith("chatMessage", callback);
    });

    it("onTyping subscribes and returns unsubscribe", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      const callback = vi.fn();
      const unsub = onTyping(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("typing", callback);
      unsub();
      expect(mockSocket.off).toHaveBeenCalledWith("typing", callback);
    });

    it("onUserOnline subscribes", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      const callback = vi.fn();
      onUserOnline(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("userOnline", callback);
    });

    it("onUserOffline subscribes", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      const callback = vi.fn();
      onUserOffline(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("userOffline", callback);
    });

    it("onMessagesRead subscribes", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      const callback = vi.fn();
      onMessagesRead(callback);
      expect(mockSocket.on).toHaveBeenCalledWith("messagesRead", callback);
    });
  });

  describe("emitMessagesRead", () => {
    it("emits messagesRead when connected", () => {
      connectSocket({ accessToken: "tok", userId: "u1", tenantId: "t1" });
      mockSocket.connected = true;
      emitMessagesRead({ readerId: "u1", partnerId: "u2" });
      expect(mockSocket.emit).toHaveBeenCalledWith("messagesRead", { readerId: "u1", partnerId: "u2" });
    });
  });
});
