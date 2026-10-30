import axios from "axios";
import api from "../api/authApis";
import { showToast } from "./ShowToast";
import { getFingerprint } from "./fingerprint";
import { getStore, getPersistor } from "./storeRef";
import { logout, setTokens } from "../ReduxStore/features/authentication";

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
// the session just because the user never clicked "Log out".
function endSession() {
  getStore()?.dispatch(logout());
  getPersistor()?.purge();
  showToast("Session expired. Please log in again.", "error");
}

const AxiosInterceptor = (accessToken, refreshToken) => {
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
      return config;
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

            const newAccessToken = await api.refreshAccessToken(
              currentRefreshToken,
              (tokens) => getStore()?.dispatch(setTokens(tokens))
            );

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

      return Promise.reject(error);
    }
  );

  return authFetch;
};

export default AxiosInterceptor;
