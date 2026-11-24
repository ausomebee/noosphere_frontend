import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { configureStore } from "@reduxjs/toolkit";

/**
 * Which credential each pre-session auth call carries.
 *
 * - 2FA setup / verify and the first-login password change carry the
 *   short-lived 2FA token, else the signed-in access token, else nothing.
 * - Reset and invite links carry only the link's token in the body: never a
 *   session token, so a stale login in the same browser can't interfere.
 * - A 2FA token that has run out ends the half-finished sign-in instead of
 *   sending a request that can only fail.
 */

vi.mock("axios", () => ({
  default: { post: vi.fn(), get: vi.fn(), patch: vi.fn() },
}));
vi.stubEnv("VITE_API_URL", "https://api.test.com");

import authReducer, {
  setTwoFactorToken,
  applyVerifiedTokens,
} from "../ReduxStore/features/authentication";
import { injectStore } from "../Helper/storeRef";
import {
  preSessionAuthHeaders,
  twoFactorTokenExpired,
  takeAuthNotice,
  TWO_FACTOR_EXPIRED_MESSAGE,
} from "../Helper/twoFactorSession";
import api from "../api/authApis";

// A JWT whose payload expires `secondsFromNow` from now. Only the payload is read.
const jwt = (secondsFromNow) => {
  const payload = btoa(
    JSON.stringify({ id: "u1", exp: Math.floor(Date.now() / 1000) + secondsFromNow })
  );
  return `h.${payload}.s`;
};

const makeStore = (authentication) => {
  const store = configureStore({
    reducer: { authentication: authReducer },
    preloadedState: {
      authentication: {
        isAuthenticated: false,
        user: null,
        accessToken: null,
        refreshToken: null,
        loading: false,
        error: null,
        pending2FA: false,
        pending2FARoute: null,
        twoFactorToken: null,
        twoFactorUserId: null,
        ...authentication,
      },
    },
  });
  injectStore(store);
  return store;
};

let assign;
beforeEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
  assign = vi.fn();
  vi.stubGlobal("location", { ...window.location, assign });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("preSessionAuthHeaders", () => {
  it("sends the 2FA token while sign-in is between password and 2FA", () => {
    makeStore({ twoFactorToken: "2fa", twoFactorUserId: "u1", user: { id: "u1" } });
    expect(preSessionAuthHeaders("u1")).toEqual({ Authorization: "Bearer 2fa" });
  });

  it("falls back to the session's access token", () => {
    makeStore({ accessToken: "at", user: { id: "u1" } });
    expect(preSessionAuthHeaders("u1")).toEqual({ Authorization: "Bearer at" });
  });

  it("sends nothing when there is neither", () => {
    makeStore({});
    expect(preSessionAuthHeaders("u1")).toEqual({});
  });

  it("never sends another user's token", () => {
    makeStore({
      twoFactorToken: "2fa",
      twoFactorUserId: "someone-else",
      user: { id: "someone-else", accessToken: "at" },
    });
    expect(preSessionAuthHeaders("u1")).toEqual({});
  });
});

describe("twoFactorTokenExpired", () => {
  it("is false for a live token", () => {
    makeStore({ twoFactorToken: jwt(120), twoFactorUserId: "u1" });
    expect(twoFactorTokenExpired("u1")).toBe(false);
  });

  it("is true once the token's time is up", () => {
    makeStore({ twoFactorToken: jwt(-60), twoFactorUserId: "u1" });
    expect(twoFactorTokenExpired("u1")).toBe(true);
  });

  it("is false when there is no 2FA token at all", () => {
    makeStore({ user: { id: "u1", accessToken: "at" } });
    expect(twoFactorTokenExpired("u1")).toBe(false);
  });

  it("is false for a token it can't read, leaving the server to judge", () => {
    makeStore({ twoFactorToken: "not-a-jwt", twoFactorUserId: "u1" });
    expect(twoFactorTokenExpired("u1")).toBe(false);
  });
});

describe("2FA calls carry the 2FA token", () => {
  it.each([
    ["Admin2FAVerify", "post", () => api.Admin2FAVerify({ userId: "u1", token: "123456" })],
    [
      "Admin2FAVerifySecretMessage",
      "post",
      () => api.Admin2FAVerifySecretMessage({ userId: "u1", secret: "s", authQuestion: "q" }),
    ],
    [
      "Admin2FACreateSecretMessage",
      "post",
      () => api.Admin2FACreateSecretMessage({ userId: "u1", secret: "s", authQuestion: "q" }),
    ],
    ["Admin2FALink", "get", () => api.Admin2FALink({ id: "u1", moduleType: "ADMIN" })],
    [
      "SuperAdministrativePassword",
      "patch",
      () =>
        api.SuperAdministrativePassword({
          id: "u1",
          oldAdministratorPassword: "old",
          newAdministratorPassword: "new",
        }),
    ],
    ["AdminVerifyToken", "post", () => api.AdminVerifyToken({ userId: "u1", token: "1" })],
  ])("%s", async (_name, method, call) => {
    const token = jwt(120);
    makeStore({ twoFactorToken: token, twoFactorUserId: "u1" });
    axios[method].mockResolvedValueOnce({ data: { status: "ok" } });
    await call();
    const config = axios[method].mock.calls[0].at(-1);
    expect(config.headers).toEqual({ Authorization: `Bearer ${token}` });
    expect(config.timeout).toBe(20000);
  });

  it("goes out with no Authorization when there is no session at all", async () => {
    makeStore({});
    axios.post.mockResolvedValueOnce({ data: { status: "ok" } });
    await api.Admin2FAVerify({ userId: "u1", token: "123456" });
    expect(axios.post.mock.calls[0][2].headers).toEqual({});
  });
});

describe("a 2FA token that has run out", () => {
  it("sends nothing, ends the sign-in and returns to login with a reason", async () => {
    const store = makeStore({
      isAuthenticated: true,
      user: { id: "u1" },
      twoFactorToken: jwt(-60),
      twoFactorUserId: "u1",
    });
    await expect(api.Admin2FAVerify({ userId: "u1", token: "123456" })).rejects.toThrow(
      TWO_FACTOR_EXPIRED_MESSAGE
    );
    expect(axios.post).not.toHaveBeenCalled();
    expect(store.getState().authentication.isAuthenticated).toBe(false);
    expect(store.getState().authentication.twoFactorToken).toBeNull();
    expect(assign).toHaveBeenCalledWith("/");
    expect(takeAuthNotice()).toBe(TWO_FACTOR_EXPIRED_MESSAGE);
    // The notice is shown once.
    expect(takeAuthNotice()).toBeNull();
  });

  it("treats a 401 as a timeout only when the token really has expired", async () => {
    makeStore({ twoFactorToken: jwt(120), twoFactorUserId: "u1" });
    axios.post.mockRejectedValueOnce({
      response: { status: 401, data: { message: "Invalid code" } },
    });
    await expect(api.Admin2FAVerify({ userId: "u1", token: "000000" })).rejects.toThrow(
      "Invalid code"
    );
    expect(assign).not.toHaveBeenCalled();
  });
});

describe("setting a password", () => {
  it("a reset link sends its token in the body and no session token", async () => {
    makeStore({ user: { id: "u1", accessToken: "stale" } });
    axios.patch.mockResolvedValueOnce({ data: { status: "ok" } });
    await api.AdminSetPassword({ id: "u1", password: "Passw0rd!", token: "link" });
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/setpassword$/),
      { id: "u1", password: "Passw0rd!", token: "link" },
      { timeout: 20000 }
    );
  });

  it("an invite link sends its token in the body and no session token", async () => {
    makeStore({ user: { id: "u1", accessToken: "stale" } });
    axios.patch.mockResolvedValueOnce({ data: { status: "ok" } });
    await api.AdminOnboarding({ id: "u1", password: "Passw0rd!", token: "invite" });
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/setpassword$/),
      { id: "u1", password: "Passw0rd!", token: "invite" },
      { timeout: 20000 }
    );
  });

  it("a first login sends the 2FA token as Bearer and no body token", async () => {
    const token = jwt(120);
    const store = makeStore({});
    store.dispatch(setTwoFactorToken({ token, userId: "u1" }));
    axios.patch.mockResolvedValueOnce({ data: { status: "ok" } });
    await api.AdminFirstLoginSetPassword({ id: "u1", password: "Passw0rd!" });
    expect(axios.patch).toHaveBeenCalledWith(
      expect.stringMatching(/\/admin\/setpassword$/),
      { id: "u1", password: "Passw0rd!" },
      { timeout: 20000, headers: { Authorization: `Bearer ${token}` } }
    );
  });

  it("a first login without 2FA sends the access token as Bearer", async () => {
    makeStore({ user: { id: "u1", accessToken: "at" } });
    axios.patch.mockResolvedValueOnce({ data: { status: "ok" } });
    await api.AdminFirstLoginSetPassword({ id: "u1", password: "Passw0rd!" });
    expect(axios.patch.mock.calls[0][2].headers).toEqual({ Authorization: "Bearer at" });
  });

  it("a refused first login shows the server's nested message", async () => {
    makeStore({ user: { id: "u1", accessToken: "at" } });
    axios.patch.mockRejectedValueOnce({
      response: { status: 400, data: { data: { message: "Password already changed" } } },
    });
    await expect(
      api.AdminFirstLoginSetPassword({ id: "u1", password: "Passw0rd!" })
    ).rejects.toThrow("Password already changed");
  });
});

describe("saving the 2FA policy during a first login", () => {
  it("sends the 2FA token when there is no access token yet", async () => {
    const token = jwt(120);
    makeStore({ twoFactorToken: token, twoFactorUserId: "u1" });
    axios.post.mockResolvedValueOnce({ data: { status: "ok" } });
    await api.SuperAdminChoices({
      Authenticator2FA: true,
      securityQuestion: false,
      setForAll: true,
    });
    expect(axios.post.mock.calls[0][2].headers).toEqual({
      Authorization: `Bearer ${token}`,
    });
  });
});

describe("applyVerifiedTokens", () => {
  it("swaps the full tokens in for the 2FA token", () => {
    const store = makeStore({
      isAuthenticated: true,
      user: { id: "u1" },
      twoFactorToken: "2fa",
      twoFactorUserId: "u1",
    });
    store.dispatch(applyVerifiedTokens({ accessToken: "at", refreshToken: "rt" }));
    const auth = store.getState().authentication;
    expect(auth.accessToken).toBe("at");
    expect(auth.refreshToken).toBe("rt");
    expect(auth.user.accessToken).toBe("at");
    expect(auth.twoFactorToken).toBeNull();
  });

  it("keeps the sign-in tokens when an older backend issues none", () => {
    const store = makeStore({ accessToken: "old", refreshToken: "oldr", user: { id: "u1" } });
    store.dispatch(applyVerifiedTokens({}));
    expect(store.getState().authentication.accessToken).toBe("old");
    expect(store.getState().authentication.refreshToken).toBe("oldr");
  });
});

describe("a 2FA token left over from another flow", () => {
  it("never stands in for the signed-in session's own access token", () => {
    makeStore({ accessToken: "at", user: { id: "u1" }, twoFactorToken: jwt(120), twoFactorUserId: "u1" });
    expect(preSessionAuthHeaders("u1")).toEqual({ Authorization: "Bearer at" });
  });

  it("can't end a real session even after it has run out", () => {
    makeStore({ accessToken: "at", user: { id: "u1" }, twoFactorToken: jwt(-600), twoFactorUserId: "u1" });
    expect(twoFactorTokenExpired("u1")).toBe(false);
  });

  it("a call with no user id is matched to the signed-in user", () => {
    makeStore({ user: { id: "u1" }, twoFactorToken: "2fa", twoFactorUserId: "someone-else" });
    expect(preSessionAuthHeaders()).toEqual({});
  });
});

describe("a device clock that runs a little fast", () => {
  it("doesn't throw away a token that only looks a few seconds expired", () => {
    makeStore({ twoFactorToken: jwt(-10), twoFactorUserId: "u1" });
    expect(twoFactorTokenExpired("u1")).toBe(false);
    expect(twoFactorTokenExpired("u1", { strict: true })).toBe(true);
  });

  it("after the server refuses, judges the token strictly", async () => {
    makeStore({ isAuthenticated: true, user: { id: "u1" }, twoFactorToken: jwt(-10), twoFactorUserId: "u1" });
    axios.post.mockRejectedValueOnce({ response: { status: 401, data: { message: "expired" } } });
    await expect(api.Admin2FAVerify({ userId: "u1", token: "123456" })).rejects.toThrow(
      TWO_FACTOR_EXPIRED_MESSAGE
    );
    expect(assign).toHaveBeenCalledWith("/");
  });
});
