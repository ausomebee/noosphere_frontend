import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const mockSocket = {
  connected: false,
  on: vi.fn(),
  off: vi.fn(),
  emit: vi.fn(),
  connect: vi.fn(),
  disconnect: vi.fn(),
};

vi.mock("socket.io-client", () => ({
  io: vi.fn(() => mockSocket),
}));

/**
 * Branch coverage for the socket service's guards.
 *
 * socketService.test.js covers the event helpers. This drives the two paths
 * that depend on module-level state: the missing-API-URL guard, and the
 * reconnect nudge used when a backgrounded tab comes back.
 */

beforeEach(() => {
  vi.clearAllMocks();
  mockSocket.connected = false;
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("ensureConnected", () => {
  it("reconnects a socket that exists but has dropped", async () => {
    const svc = await import("../api/socketService");
    svc.connectSocket({ accessToken: "at", userId: "u1", tenantId: "t1" });
    mockSocket.connected = false;
    const result = svc.ensureConnected();
    expect(mockSocket.connect).toHaveBeenCalled();
    expect(result).toBe(mockSocket);
    svc.disconnectSocket();
  });

  it("leaves an already-connected socket alone", async () => {
    const svc = await import("../api/socketService");
    svc.connectSocket({ accessToken: "at", userId: "u1", tenantId: "t1" });
    mockSocket.connected = true;
    svc.ensureConnected();
    expect(mockSocket.connect).not.toHaveBeenCalled();
    mockSocket.connected = false;
    svc.disconnectSocket();
  });

  it("does nothing when there is no socket at all", async () => {
    const svc = await import("../api/socketService");
    svc.disconnectSocket();
    expect(svc.ensureConnected()).toBeNull();
    expect(mockSocket.connect).not.toHaveBeenCalled();
  });
});

describe("missing API URL", () => {
  it("refuses to connect and says why when VITE_API_URL is unset", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "");
    const err = vi.spyOn(console, "error").mockImplementation(() => {});

    const svc = await import("../api/socketService");
    const socket = svc.connectSocket({ accessToken: "at", userId: "u1" });

    expect(socket).toBeNull();
    expect(err).toHaveBeenCalledWith(
      expect.stringContaining("VITE_API_URL")
    );
    err.mockRestore();
  });

  it("derives the socket origin from VITE_API_URL, dropping the REST path", async () => {
    vi.resetModules();
    vi.stubEnv("VITE_API_URL", "https://api.example.com/api/v1");
    const { io } = await import("socket.io-client");
    const svc = await import("../api/socketService");

    svc.connectSocket({ accessToken: "at", userId: "u1", tenantId: "t1" });
    // Socket.IO must target the origin only, not the REST path.
    expect(io).toHaveBeenCalledWith("https://api.example.com", expect.any(Object));
    svc.disconnectSocket();
  });
});

describe("connect and disconnect lifecycle", () => {
  it("reuses an existing socket rather than opening a second", async () => {
    const svc = await import("../api/socketService");
    const first = svc.connectSocket({ accessToken: "at", userId: "u1" });
    mockSocket.connected = true;
    const second = svc.connectSocket({ accessToken: "at", userId: "u1" });
    expect(second).toBe(first);
    mockSocket.connected = false;
    svc.disconnectSocket();
  });

  it("clears the reference on disconnect so the next connect is fresh", async () => {
    const svc = await import("../api/socketService");
    svc.connectSocket({ accessToken: "at", userId: "u1" });
    svc.disconnectSocket();
    expect(svc.getSocket()).toBeNull();
    expect(mockSocket.disconnect).toHaveBeenCalled();
  });

  it("tolerates a disconnect with nothing connected", async () => {
    const svc = await import("../api/socketService");
    svc.disconnectSocket();
    expect(() => svc.disconnectSocket()).not.toThrow();
  });
});
