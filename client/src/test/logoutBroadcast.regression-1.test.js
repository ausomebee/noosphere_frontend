// Regression: ISSUE-001 — client tabs ignored logouts from other tabs
// Found by /qa on 2026-11-15
// Report: .gstack/qa-reports/qa-report-localhost-2026-11-15.md
//
// The client keeps its session under `state.auth`, not `state.authentication`
// like tenant and control. The listener read the wrong key, saw "signed out"
// and skipped the logout. This test runs against the real client reducers.
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { configureStore } from "@reduxjs/toolkit";

const h = vi.hoisted(() => ({ store: null, purge: vi.fn() }));

vi.mock("../Helper/storeRef", () => ({
  getStore: () => h.store,
  getPersistor: () => ({ purge: h.purge }),
}));
vi.mock("../api/socketService", () => ({ disconnectSocket: () => {} }));

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
  removeEventListener() {}
  postMessage(data) {
    FakeChannel.open
      .filter((c) => c !== this && c.name === this.name)
      .forEach((c) => c.listeners.forEach((fn) => fn({ data })));
  }
  close() {}
}

let mod;

beforeEach(async () => {
  FakeChannel.open = [];
  vi.stubGlobal("BroadcastChannel", FakeChannel);
  const { default: rootReducer } = await import("../ReduxStore/rootReducer");
  h.store = configureStore({
    reducer: rootReducer,
    middleware: (gdm) => gdm({ serializableCheck: false }),
  });
  const { ClientLogin } = await import("../ReduxStore/features/authentication");
  // Sign the real store in exactly as a successful login does.
  h.store.dispatch(
    ClientLogin.fulfilled({ data: { id: "u1", accessToken: "a", refreshToken: "r" } }, "req", {})
  );
  mod = await import("../Helper/logoutBroadcast");
  mod.__resetLogoutBroadcastForTests();
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("client logout from another tab (real store)", () => {
  it("signs this tab out", () => {
    expect(h.store.getState().auth.isAuthenticated).toBe(true);
    mod.installLogoutSync();
    new FakeChannel("client-auth").postMessage({ type: "logout" });
    expect(h.store.getState().auth.isAuthenticated).toBe(false);
    expect(h.store.getState().auth.refreshToken).toBeFalsy();
    expect(h.purge).toHaveBeenCalled();
  });
});
