import axios from "axios";
import api from "../api/authApis";
import { showToast } from "./ShowToast";
import { getFingerprint } from "./fingerprint";
import { getStore, getPersistor } from "./storeRef";
import { logout, setTokens } from "../ReduxStore/features/authentication";
import { disconnectSocket } from "../api/socketService";
import {
  prepareRequest,
  shouldRetry,
  retryRequest,
  explainGatewayError,
} from "./requestResilience";
import {
  withRefreshLock,
  rotationFrom,
  recordRotation,
  clearRotation,
  syncRotations,
} from "./tokenRotation";

let isRefreshing = false; // Tracks if a token refresh is in progress
let refreshSubscribers = []; // Queue to store pending requests while token is refreshing

// Notify all subscribers with the new token
function onRefreshed(newToken) {
  refreshSubscribers.forEach((callback) => callback(newToken));
  refreshSubscribers = []; // Clear the queue
}

// Add a request to the queue
function addSubscriber(callback) {
  refreshSubscribers.push(callback);
}

// Release queued requests when the refresh failed, so they reject now instead
// of hanging until the 30s timeout.
function onRefreshFailed(refreshError) {
  refreshSubscribers.forEach((callback) => callback(null, refreshError));
  refreshSubscribers = [];
}

// Ends the session for real. Purging matters as much as the logout: form
// drafts carry client data, and on a shared workstation they must not outlive
// the session just because the user never clicked "Log out". The socket goes
// too, so the next person to sign in on this tab never inherits it.
function endSession() {
  clearRotation();
  disconnectSocket();
  getStore()?.dispatch(logout());
  getPersistor()?.purge();
  showToast("Session expired. Please log in again.", "error");
}

// Picks up token refreshes made in other tabs. Waits for the store, which is
// injected at boot before any request is made.
function syncTokensAcrossTabs() {
  const store = getStore();
  if (!store) return;
  syncRotations({
    getRefreshToken: () => store.getState().auth?.refreshToken,
    applyTokens: (tokens) => store.dispatch(setTokens(tokens)),
    subscribe: store.subscribe,
  });
}

// A refresh is one at a time across tabs. A tab that waited its turn may find
// another tab already swapped the token it holds — the server has retired that
// token, so take the new pair rather than sending it.
function refreshTokens(currentRefreshToken) {
  return withRefreshLock(async () => {
    const rotated = rotationFrom(currentRefreshToken);
    if (rotated) {
      getStore()?.dispatch(setTokens(rotated));
      return rotated.accessToken;
    }
    return api.refreshAccessToken(currentRefreshToken, (tokens) => {
      getStore()?.dispatch(setTokens(tokens));
      recordRotation(currentRefreshToken, tokens);
    });
  });
}

const AxiosInterceptor = (accessToken, refreshToken) => {
  syncTokensAcrossTabs();

  const authFetch = axios.create({
    withCredentials: true,
    timeout: 30000,
  });

  // Request Interceptor
  authFetch.interceptors.request.use(
    (config) => {
      if (accessToken) {
        config.headers["Authorization"] = `Bearer ${accessToken}`;
      }
      config.headers["x-fingerprint"] = getFingerprint();
      return prepareRequest(config);
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  authFetch.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      const isAuthError = error.response && !originalRequest._retry && (
        error.response.status === 401 ||
        (error.response.status === 500 && (
          (error.response.data?.message || "").toLowerCase().includes("not authorized") ||
          (error.response.data?.message || "").toLowerCase().includes("expired token") ||
          (error.response.data?.message || "").toLowerCase().includes("invalid or expired")
        ))
      );

      if (isAuthError) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const currentRefreshToken =
              getStore()?.getState().auth?.refreshToken ?? refreshToken;

            const newAccessToken = await refreshTokens(currentRefreshToken);

            if (newAccessToken) {
              isRefreshing = false;
              onRefreshed(newAccessToken);
              return authFetch({
                ...originalRequest,
                headers: {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${newAccessToken}`,
                },
              });
            } else {
              // refreshAccessToken only resolves null when the server actively
              // rejected the refresh token, so the session really is over.
              isRefreshing = false;
              onRefreshFailed(error);
              endSession();
              return Promise.reject(error);
            }
          } catch (refreshError) {
            if (import.meta.env.DEV) console.error("Token refresh failed", refreshError);
            isRefreshing = false;
            onRefreshFailed(refreshError);
            // Anything else — a network drop, or a 5xx from an API restarting
            // mid-deploy — means we never reached the auth server. The refresh
            // token is probably still good, so keep the user signed in and let
            // the caller surface the original failure.
            const status = refreshError?.response?.status;
            if (status === 401 || status === 403) {
              endSession();
            }
            return Promise.reject(error);
          }
        }

        return new Promise((resolve, reject) => {
          addSubscriber((newToken, refreshError) => {
            if (!newToken) {
              reject(refreshError || error);
              return;
            }
            resolve(
              authFetch({
                ...originalRequest,
                headers: {
                  ...originalRequest.headers,
                  Authorization: `Bearer ${newToken}`, // Use the new token
                },
              })
            );
          });
        });
      }

      // The server it reached failed or the reply was lost: send it again,
      // which the load balancer may route to the other server.
      if (shouldRetry(error)) return retryRequest(authFetch, error);

      explainGatewayError(error);
      return Promise.reject(error);
    }
  );

  return authFetch;
};

export default AxiosInterceptor;
