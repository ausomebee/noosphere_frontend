import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

/**
 * Token refreshes shared between tabs: one refresh at a time, and a tab still
 * holding a token another tab has swapped takes the new pair instead of
 * sending one the server has retired.
 *
 * syncRotations installs its listeners once per module, so tests that drive it
 * load a fresh copy.
 */

const load = async () => {
  vi.resetModules();
  return import("../Helper/tokenRotation");
};

const KEY = "client-token-rotation";

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  delete navigator.locks;
});

describe("one refresh at a time", () => {
  it("runs the refresh under the browser lock when there is one", async () => {
    const request = vi.fn((name, fn) => fn());
    navigator.locks = { request };
    const { withRefreshLock } = await load();
    expect(await withRefreshLock(async () => "token")).toBe("token");
    expect(request).toHaveBeenCalledWith("client-token-refresh", expect.any(Function));
  });

  it("gives up on a refresh that hangs, so the lock is released for other tabs", async () => {
    vi.useFakeTimers();
    const request = vi.fn((name, fn) => fn());
    navigator.locks = { request };
    const { withRefreshLock, REFRESH_TIMEOUT_MS } = await load();
    const pending = withRefreshLock(() => new Promise(() => {}));
    const outcome = expect(pending).rejects.toThrow("Token refresh timed out");
    await vi.advanceTimersByTimeAsync(REFRESH_TIMEOUT_MS);
    await outcome;
    vi.useRealTimers();
  });

  it("still refreshes in a browser without locks", async () => {
    const { withRefreshLock } = await load();
    expect(await withRefreshLock(async () => "token")).toBe("token");
  });
});

describe("the shared record", () => {
  it("hands over the new pair to a tab holding the token it replaced", async () => {
    const { recordRotation, rotationFrom } = await load();
    recordRotation("old", { accessToken: "a2", refreshToken: "r2" });
    expect(rotationFrom("old")).toEqual({ accessToken: "a2", refreshToken: "r2" });
  });

  it("hands nothing to a tab holding any other token", async () => {
    const { recordRotation, rotationFrom } = await load();
    recordRotation("old", { accessToken: "a2", refreshToken: "r2" });
    expect(rotationFrom("r2")).toBeNull();
    expect(rotationFrom(null)).toBeNull();
  });

  it("records nothing without both tokens to go on", async () => {
    const { recordRotation } = await load();
    recordRotation(null, { refreshToken: "r2" });
    recordRotation("old", {});
    expect(localStorage.getItem(KEY)).toBeNull();
  });

  it("records nothing when the server hands back the same refresh token", async () => {
    const { recordRotation, rotationFrom } = await load();
    recordRotation("same", { accessToken: "a2", refreshToken: "same" });
    expect(rotationFrom("same")).toBeNull();
  });

  it("ignores an old record that points a token at itself", async () => {
    localStorage.setItem(KEY, JSON.stringify({ from: "same", accessToken: "a1", refreshToken: "same" }));
    const { rotationFrom } = await load();
    expect(rotationFrom("same")).toBeNull();
  });

  it("shrugs off a corrupt record", async () => {
    localStorage.setItem(KEY, "{not json");
    const { rotationFrom } = await load();
    expect(rotationFrom("old")).toBeNull();
  });

  it("can be cleared", async () => {
    const { recordRotation, clearRotation } = await load();
    recordRotation("old", { accessToken: "a2", refreshToken: "r2" });
    clearRotation();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});

describe("keeping other tabs in step", () => {
  const setup = async (current) => {
    const { syncRotations } = await load();
    let listener;
    const state = { token: current };
    const applyTokens = vi.fn();
    syncRotations({
      getRefreshToken: () => state.token,
      applyTokens,
      subscribe: (fn) => { listener = fn; },
    });
    return { state, applyTokens, notify: () => listener() };
  };

  const storageEvent = (value, key = KEY) =>
    window.dispatchEvent(new StorageEvent("storage", { key, newValue: JSON.stringify(value) }));

  it("takes the new pair as soon as another tab swaps this tab's token", async () => {
    const { applyTokens } = await setup("old");
    storageEvent({ from: "old", accessToken: "a2", refreshToken: "r2" });
    expect(applyTokens).toHaveBeenCalledWith({ accessToken: "a2", refreshToken: "r2" });
  });

  it("ignores a swap of a token this tab doesn't hold", async () => {
    const { applyTokens } = await setup("mine");
    storageEvent({ from: "old", accessToken: "a2", refreshToken: "r2" });
    storageEvent({ from: "mine" }, "some-other-key");
    expect(applyTokens).not.toHaveBeenCalled();
  });

  it("drops the record when the user signs out", async () => {
    const { state, notify } = await setup("old");
    localStorage.setItem(KEY, "{}");
    notify(); // still signed in
    expect(localStorage.getItem(KEY)).toBe("{}");
    state.token = null;
    notify();
    expect(localStorage.getItem(KEY)).toBeNull();
  });
});
