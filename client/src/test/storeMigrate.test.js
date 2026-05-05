import { describe, it, expect } from "vitest";

// Extract the migrate logic to test independently
const APP_VERSION = "1.0.0";

const migrate = (state) => {
  if (!state) return Promise.resolve(state);
  const currentVersion = state._persist?.version;
  if (currentVersion !== APP_VERSION) {
    if (state.auth?.token && !state.auth.accessToken) {
      state.auth.accessToken = state.auth.token;
    }
    return Promise.resolve(state);
  }
  return Promise.resolve(state);
};

describe("store migrate", () => {
  it("handles undefined state without crashing", async () => {
    const result = await migrate(undefined);
    expect(result).toBeUndefined();
  });

  it("handles null state without crashing", async () => {
    const result = await migrate(null);
    expect(result).toBeNull();
  });

  it("returns state unchanged when version matches", async () => {
    const state = { _persist: { version: APP_VERSION }, auth: { accessToken: "tok" } };
    const result = await migrate(state);
    expect(result).toEqual(state);
  });

  it("migrates token to accessToken on version mismatch", async () => {
    const state = { _persist: { version: "0.0.1" }, auth: { token: "old-tok" } };
    const result = await migrate(state);
    expect(result.auth.accessToken).toBe("old-tok");
  });

  it("does not overwrite existing accessToken", async () => {
    const state = {
      _persist: { version: "0.0.1" },
      auth: { token: "old-tok", accessToken: "new-tok" },
    };
    const result = await migrate(state);
    expect(result.auth.accessToken).toBe("new-tok");
  });

  it("handles state without auth slice", async () => {
    const state = { _persist: { version: "0.0.1" } };
    const result = await migrate(state);
    expect(result).toEqual(state);
  });
});
