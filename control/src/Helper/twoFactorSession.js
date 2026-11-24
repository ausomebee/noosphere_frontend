/**
 * The short-lived token the backend hands out while a sign-in is between the
 * password step and the 2FA step (`twoFactorToken`, about 5 minutes).
 *
 * The 2FA setup and verify calls, and the first-login password change, carry
 * it as `Authorization: Bearer`. When there is no 2FA token (2FA isn't
 * required, or the backend is older and still hands out full tokens at
 * sign-in), they fall back to the signed-in user's access token, and with
 * neither they go out exactly as they always did.
 */
import { getStore } from "./storeRef";
import { logout } from "../ReduxStore/features/authentication";

export const TWO_FACTOR_EXPIRED_MESSAGE =
  "Your sign-in timed out. Please sign in again.";

// Lets the login page explain why the user landed back on it.
const NOTICE_KEY = "authNotice";

const authState = () => getStore()?.getState().authentication;

const sameUser = (a, b) => !a || !b || String(a) === String(b);

/** Seconds-since-epoch expiry of a JWT, or null if it can't be read. */
const tokenExpiry = (token) => {
  try {
    const payload = token.split(".")[1];
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const exp = JSON.parse(json)?.exp;
    return typeof exp === "number" ? exp : null;
  } catch {
    return null;
  }
};

// Before sending, allow for a device clock that runs a little fast, so a
// still-valid token is never thrown away. After the server has refused a
// call, judge the token strictly.
const CLOCK_SKEW_MS = 30000;

const isExpired = (token, graceMs = 0) => {
  const exp = tokenExpiry(token);
  return exp !== null && exp * 1000 + graceMs <= Date.now();
};

// The signed-in session's own access token, if it belongs to this user.
const sessionAccessToken = (auth, userId) => {
  const accessToken = auth?.accessToken || auth?.user?.accessToken;
  return accessToken && sameUser(userId, auth?.user?.id) ? accessToken : null;
};

/**
 * The 2FA token held for this user, if any (expired or not). A call made
 * without a user id is for the signed-in user. Once that user has a full
 * session, a 2FA token left over from another flow (a password reset, say)
 * is ignored, so it can never stand in for, or end, the real session.
 */
export const currentTwoFactorToken = (userId) => {
  const auth = authState();
  if (!auth?.twoFactorToken) return null;
  const forUser = userId ?? auth.user?.id;
  if (!sameUser(forUser, auth.twoFactorUserId)) return null;
  if (sessionAccessToken(auth, forUser)) return null;
  return auth.twoFactorToken;
};

/**
 * Headers for a pre-session auth call made for `userId`. Prefers the 2FA
 * token, then the signed-in user's access token, then nothing.
 */
export const preSessionAuthHeaders = (userId) => {
  const auth = authState();
  const twoFactorToken = currentTwoFactorToken(userId);
  if (twoFactorToken) return { Authorization: `Bearer ${twoFactorToken}` };
  // Control keeps the session's access token at the top of the slice.
  const accessToken = sessionAccessToken(auth, userId);
  return accessToken ? { Authorization: `Bearer ${accessToken}` } : {};
};

/**
 * True when the 2FA token for this user has run out. `strict` drops the
 * clock-skew allowance, for use once the server has already refused a call.
 */
export const twoFactorTokenExpired = (userId, { strict = false } = {}) => {
  const token = currentTwoFactorToken(userId);
  return !!token && isExpired(token, strict ? 0 : CLOCK_SKEW_MS);
};

/**
 * The 2FA step took too long: drop the half-finished sign-in and send the
 * user back to the login page, which shows why.
 */
export const endExpiredTwoFactor = () => {
  try {
    sessionStorage.setItem(NOTICE_KEY, TWO_FACTOR_EXPIRED_MESSAGE);
  } catch {
    /* storage unavailable: the user still lands on the login page */
  }
  getStore()?.dispatch(logout());
  window.location.assign("/");
};

/** Read (once) the reason the user was sent back to the login page. */
export const takeAuthNotice = () => {
  try {
    const notice = sessionStorage.getItem(NOTICE_KEY);
    if (notice) sessionStorage.removeItem(NOTICE_KEY);
    return notice;
  } catch {
    return null;
  }
};
