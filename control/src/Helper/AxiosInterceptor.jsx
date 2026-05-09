import axios from "axios";
import { showToast } from "./ShowToast";
import api from "../api/authApis";
import { getStore } from "./storeRef";
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

const AxiosInterceptor = (accessToken, refreshToken, dispatch, navigate) => {
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
      return config;
    },
    (error) => Promise.reject(error)
  );

  // Response Interceptor
  authFetch.interceptors.response.use(
    (response) => response,
    async (error) => {
      const originalRequest = error.config;

      if (
        error.response &&
        error.response.status === 401 &&
        !originalRequest._retry
      ) {
        originalRequest._retry = true;

        if (!isRefreshing) {
          isRefreshing = true;

          try {
            const currentRefreshToken =
              getStore()?.getState().authentication?.refreshToken ?? refreshToken;

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
              isRefreshing = false;
              getStore()?.dispatch(logout());
              showToast("Session expired. Please log in again.", "error");
              if (navigate) navigate("/auth/login");
              else window.location.href = "/auth/login";
            }
          } catch (refreshError) {
            if (import.meta.env.DEV) console.error("Token refresh failed", refreshError);
            isRefreshing = false;
            getStore()?.dispatch(logout());
            showToast("Session expired. Please log in again.", "error");
            if (navigate) navigate("/auth/login");
            else window.location.href = "/auth/login";
          }
        }

        return new Promise((resolve) => {
          addSubscriber((newToken) => {
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
