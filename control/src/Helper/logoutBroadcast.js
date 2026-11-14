/**
 * Logs every open tab of this app out when the user logs out in one of them.
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

const CHANNEL_NAME = "control-auth";
const LOGOUT = "logout";

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

/** Tell the other open tabs of this app to log out. */
export const broadcastLogout = () => {
  try {
    getChannel()?.postMessage({ type: LOGOUT });
  } catch {
    /* channel closed or unavailable */
  }
};

// Same teardown as the Log out button, minus the redirect: once the session is
// gone, ProtectedRoute sends this tab to the login page by itself.
const logOutThisTab = () => {
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
    if (event?.data?.type === LOGOUT) logOutThisTab();
  });
};

// Tests only: forget the channel so each test starts clean.
export const __resetLogoutBroadcastForTests = () => {
  try {
    channel?.close();
  } catch {
    /* already closed */
  }
  channel = null;
  listening = false;
};
