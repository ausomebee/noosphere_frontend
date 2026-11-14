/**
 * Keeps the open tabs of this app in step: logging out in one tab logs out all
 * of them, and activity in any tab keeps the idle timer of every tab going.
 *
 * Each tab keeps its own copy of the session in memory. Logging out in one tab
 * used to leave the others signed in, and they could even write the session
 * back to storage. The browser's BroadcastChannel tells the other tabs at once,
 * with no server or network call.
 *
 * The channel is named per app: tenant, client and control share one origin,
 * and logging out of one portal must not log the user out of the others.
 * BroadcastChannel never delivers a message back to the tab that sent it.
 */
import { getStore, getPersistor } from "./storeRef";
import { logout } from "../ReduxStore/features/authentication";
import { disconnectSocket } from "../api/socketService";
import { isIdleLogoutPaused } from "./liveSessionGuard";

const CHANNEL_NAME = "tenant-auth";
const LOGOUT = "logout";
const ACTIVITY = "activity";
const ACTIVITY_KEY = "tenant-last-activity";

// Mouse and keyboard events fire constantly; telling the other tabs at most
// this often is plenty against a 30-minute idle period.
export const ACTIVITY_SHARE_INTERVAL_MS = 10000;
let lastShared = 0;
let pendingAt = 0;
let trailingTimer = null;

const sendActivity = (at) => {
  lastShared = Date.now();
  pendingAt = 0;
  try {
    localStorage.setItem(ACTIVITY_KEY, String(at));
  } catch {
    /* storage unavailable: the message below still reaches awake tabs */
  }
  try {
    getChannel()?.postMessage({ type: ACTIVITY, at });
  } catch {
    /* channel closed or unavailable */
  }
};

let channel = null;
let listening = false;

// Missing in very old browsers, and the constructor can throw where the browser
// blocks it. Without a channel, logout still works in this tab as before.
const getChannel = () => {
  if (channel) return channel;
  if (typeof BroadcastChannel === "undefined") return null;
  try {
    channel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    channel = null;
  }
  return channel;
};

/**
 * Tell the other open tabs of this app to log out. Pass `{ reason: "idle" }`
 * from the idle timeout, so a tab that must stay signed in through a quiet
 * spell (a live appointment) can tell it apart from a real logout.
 */
export const broadcastLogout = ({ reason } = {}) => {
  // Activity still waiting to be shared belongs to the session that just ended.
  clearTimeout(trailingTimer);
  trailingTimer = null;
  pendingAt = 0;
  try {
    getChannel()?.postMessage(reason ? { type: LOGOUT, reason } : { type: LOGOUT });
  } catch {
    /* channel closed or unavailable */
  }
};

// Same teardown as the Log out button, minus the redirect: once the session is
// gone, ProtectedRoute sends this tab to the login page by itself.
const logOutThisTab = (reason) => {
  // A live appointment holds the idle logout off in this tab. Another tab's
  // idle logout must not end it either: the browser may have suspended this
  // tab, so its keep-alive never reached the others. A real logout still does.
  if (reason === "idle" && isIdleLogoutPaused()) return;
  const store = getStore();
  if (!store?.getState().authentication?.isAuthenticated) return;
  disconnectSocket();
  store.dispatch(logout());
  getPersistor()?.purge();
};

/** Start listening for logouts from other tabs. Call once at boot. */
export const installLogoutSync = () => {
  if (listening) return;
  const ch = getChannel();
  if (!ch) return;
  listening = true;
  ch.addEventListener("message", (event) => {
    if (event?.data?.type === LOGOUT) logOutThisTab(event.data.reason);
  });
};

/**
 * Record activity in this tab and tell the other tabs, at most once every
 * ACTIVITY_SHARE_INTERVAL_MS. Activity inside a window is sent when the window
 * ends, so the other tabs always learn the latest time and never log the user
 * out early. The time is also stored, so a tab the browser put to sleep in the
 * background reads it when it wakes, rather than relying on missed messages.
 */
export const shareActivity = (at = Date.now()) => {
  const now = Date.now();
  if (now >= lastShared && now - lastShared < ACTIVITY_SHARE_INTERVAL_MS) {
    pendingAt = Math.max(pendingAt, at);
    if (!trailingTimer) {
      trailingTimer = setTimeout(() => {
        trailingTimer = null;
        if (pendingAt) sendActivity(pendingAt);
      }, lastShared + ACTIVITY_SHARE_INTERVAL_MS - now);
    }
    return;
  }
  sendActivity(at);
};

/** The last activity any tab recorded, or 0 when unknown. */
export const lastSharedActivity = () => {
  try {
    const at = Number(localStorage.getItem(ACTIVITY_KEY));
    // A time in the future can only be a leftover; never let it hold a session open.
    return Number.isFinite(at) && at > 0 && at <= Date.now() ? at : 0;
  } catch {
    return 0;
  }
};

/** Call `fn` whenever another tab reports activity. Returns a stop function. */
export const onActivityElsewhere = (fn) => {
  const ch = getChannel();
  if (!ch) return () => {};
  const handler = (event) => {
    if (event?.data?.type === ACTIVITY) fn(event.data.at);
  };
  ch.addEventListener("message", handler);
  return () => {
    try {
      ch.removeEventListener("message", handler);
    } catch {
      /* already closed */
    }
  };
};

// Tests only: forget the channel and shared activity so each test starts clean.
export const __resetLogoutBroadcastForTests = () => {
  try {
    channel?.close();
  } catch {
    /* already closed */
  }
  channel = null;
  listening = false;
  lastShared = 0;
  pendingAt = 0;
  clearTimeout(trailingTimer);
  trailingTimer = null;
  try {
    localStorage.removeItem(ACTIVITY_KEY);
  } catch {
    /* storage unavailable */
  }
};
