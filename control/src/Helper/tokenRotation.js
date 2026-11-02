/**
 * Shares token refreshes between open tabs of this app.
 *
 * The server swaps the refresh token for a new one on every refresh, so the old
 * one stops working. Two tabs refreshing at once used to race: the loser sent a
 * token the winner had just retired, was rejected, and logged the user out.
 *
 * Now a refresh runs under a browser lock, one tab at a time. The tab that
 * refreshes records which token it replaced and what replaced it; a tab still
 * holding the old token takes the new pair from that record instead of sending
 * the retired one. Other tabs also pick the record up as soon as it is written.
 */

const LOCK_NAME = "control-token-refresh";
const ROTATION_KEY = "control-token-rotation";

// The refresh call has no timeout of its own. Without this cap a hung refresh
// would hold the lock, and every other tab's refresh would wait behind it.
export const REFRESH_TIMEOUT_MS = 30000;

const withinTimeout = (fn) => {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error("Token refresh timed out")), REFRESH_TIMEOUT_MS);
  });
  return Promise.race([fn(), timeout]).finally(() => clearTimeout(timer));
};

/** Runs `fn` while no other tab of this app is refreshing. */
export const withRefreshLock = (fn) => {
  const run = () => withinTimeout(fn);
  const locks = typeof navigator !== "undefined" ? navigator.locks : undefined;
  return typeof locks?.request === "function" ? locks.request(LOCK_NAME, run) : run();
};

const parse = (raw) => {
  try {
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Storage access throws when the browser blocks it (Safari private mode,
// disabled site data); the lock alone still keeps refreshes in order.
const read = () => {
  try {
    return parse(localStorage.getItem(ROTATION_KEY));
  } catch {
    return null;
  }
};

export const recordRotation = (from, tokens) => {
  // Nothing was retired when the server hands back the same refresh token, and
  // a record pointing a token at itself would keep replaying one access token.
  if (!from || !tokens?.refreshToken || tokens.refreshToken === from) return;
  try {
    localStorage.setItem(
      ROTATION_KEY,
      JSON.stringify({ from, accessToken: tokens.accessToken, refreshToken: tokens.refreshToken })
    );
  } catch {
    /* storage unavailable */
  }
};

export const clearRotation = () => {
  try {
    localStorage.removeItem(ROTATION_KEY);
  } catch {
    /* storage unavailable */
  }
};

const tokensReplacing = (record, refreshToken) =>
  refreshToken &&
  record?.from === refreshToken &&
  record.refreshToken &&
  record.refreshToken !== record.from
    ? { accessToken: record.accessToken, refreshToken: record.refreshToken }
    : null;

/** The token pair another tab swapped `refreshToken` for, if any. */
export const rotationFrom = (refreshToken) => tokensReplacing(read(), refreshToken);

let syncing = false;

/**
 * Keeps this tab's tokens in step with refreshes made in other tabs, and drops
 * the shared record once the user is signed out. Safe to call repeatedly.
 */
export const syncRotations = ({ getRefreshToken, applyTokens, subscribe }) => {
  if (syncing || typeof window === "undefined") return;
  syncing = true;

  window.addEventListener("storage", (event) => {
    if (event.key !== ROTATION_KEY) return;
    const tokens = tokensReplacing(parse(event.newValue), getRefreshToken());
    if (tokens) applyTokens(tokens);
  });

  let signedIn = Boolean(getRefreshToken());
  subscribe?.(() => {
    const now = Boolean(getRefreshToken());
    if (signedIn && !now) clearRotation();
    signedIn = now;
  });
};
