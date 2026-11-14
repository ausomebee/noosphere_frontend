import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const store = { getState: vi.fn(), dispatch: vi.fn() };
const persistor = { purge: vi.fn() };
const disconnectSocket = vi.fn();

vi.mock("../Helper/storeRef", () => ({
  getStore: () => store,
  getPersistor: () => persistor,
}));
vi.mock("../api/socketService", () => ({
  disconnectSocket: () => disconnectSocket(),
}));

// A stand-in that behaves like the browser's: every channel with the same name
// gets the message except the one that sent it. Each instance plays one tab.
class FakeChannel {
  static open = [];
  constructor(name) {
    this.name = name;
    this.listeners = [];
    FakeChannel.open.push(this);
  }
  addEventListener(type, fn) {
    if (type === "message") this.listeners.push(fn);
  }
  postMessage(data) {
    FakeChannel.open
      .filter((c) => c !== this && c.name === this.name)
      .forEach((c) => c.listeners.forEach((fn) => fn({ data })));
  }
  close() {
    FakeChannel.open = FakeChannel.open.filter((c) => c !== this);
  }
}

const signedIn = () =>
  store.getState.mockReturnValue({ authentication: { isAuthenticated: true } });

let mod;

beforeEach(async () => {
  FakeChannel.open = [];
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  store.getState.mockReset();
  store.dispatch.mockReset();
  persistor.purge.mockReset();
  disconnectSocket.mockReset();
  mod = await import("../Helper/logoutBroadcast");
  mod.__resetLogoutBroadcastForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("logoutBroadcast (client)", () => {
  it("logs this tab out when another tab logs out", () => {
    signedIn();
    mod.installLogoutSync();
    new FakeChannel("client-auth").postMessage({ type: "logout" });

    expect(disconnectSocket).toHaveBeenCalledTimes(1);
    expect(store.dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: "authentication/logout" })
    );
    expect(persistor.purge).toHaveBeenCalledTimes(1);
  });

  it("tells the other tabs when this tab logs out", () => {
    const otherTab = new FakeChannel("client-auth");
    const received = vi.fn();
    otherTab.addEventListener("message", received);

    mod.broadcastLogout();

    expect(received).toHaveBeenCalledWith({ data: { type: "logout" } });
  });

  it("does not log itself out from its own message", () => {
    signedIn();
    mod.installLogoutSync();
    mod.broadcastLogout();
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("ignores logouts from the other portals", () => {
    signedIn();
    mod.installLogoutSync();
    ["tenant-auth", "client-auth", "control-auth"]
      .filter((name) => name !== "client-auth")
      .forEach((name) => new FakeChannel(name).postMessage({ type: "logout" }));
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("ignores other messages", () => {
    signedIn();
    mod.installLogoutSync();
    new FakeChannel("client-auth").postMessage({ type: "something-else" });
    expect(store.dispatch).not.toHaveBeenCalled();
  });

  it("does nothing in a tab that is already signed out", () => {
    store.getState.mockReturnValue({ authentication: { isAuthenticated: false } });
    mod.installLogoutSync();
    new FakeChannel("client-auth").postMessage({ type: "logout" });
    expect(store.dispatch).not.toHaveBeenCalled();
    expect(persistor.purge).not.toHaveBeenCalled();
  });

  it("listens only once even if installed twice", () => {
    signedIn();
    mod.installLogoutSync();
    mod.installLogoutSync();
    new FakeChannel("client-auth").postMessage({ type: "logout" });
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });

  it("keeps working without BroadcastChannel", () => {
    vi.stubGlobal("BroadcastChannel", undefined);
    expect(() => mod.installLogoutSync()).not.toThrow();
    expect(() => mod.broadcastLogout()).not.toThrow();
  });
  it("logs this tab out on another tab's idle logout", () => {
    signedIn();
    mod.installLogoutSync();
    new FakeChannel("client-auth").postMessage({ type: "logout", reason: "idle" });
    expect(store.dispatch).toHaveBeenCalledTimes(1);
  });
});
