import axios from "axios";
import { getFingerprint } from "../Helper/fingerprint";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;
const fingerprintHeader = () => ({ "x-fingerprint": getFingerprint() });

// These calls bypass the authed axios instance, so they need their own timeout —
// without one a stalled server leaves the submit button spinning forever.
const REQUEST_TIMEOUT_MS = 20000;
const requestConfig = () => ({
  headers: fingerprintHeader(),
  timeout: REQUEST_TIMEOUT_MS,
});

export const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

// No response at all means a timeout or network drop, not a server answer.
// Flagged so pages with their own generic message can still show this one.
const toError = (error, message) => {
  if (!error?.response) {
    const networkError = new Error(NETWORK_ERROR_MESSAGE);
    networkError.isNetworkError = true;
    return networkError;
  }
  // Keep the backend's response on the error, so a page can still read
  // exactly what it said.
  const clientError = new Error(message);
  clientError.response = error.response;
  return clientError;
};

const ClientLogin = async ({ email, password }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/client/login`, {
      email,
      password,
    }, requestConfig());
    return response;
  } catch (error) {
    throw toError(error, error.response?.data?.message || "Login failed");
  }
};

const ClientForgetPassword = async ({ email }) => {
  try {
    // The email goes in the body, not the address, so it stays out of logs.
    const response = await axios.post(
      `${PLAIN_API_URL}/client/initiate/password-reset`,
      { email },
      requestConfig(),
    );
    return response;
  } catch (error) {
    throw toError(
      error,
      error.response?.data?.message || "Forget Password Email failed",
    );
  }
};

const setPasswordError = (error) =>
  toError(
    error,
    error.response?.data?.data?.message ||
      error.response?.data?.message ||
      "Password setting failed",
  );

// Reset link: the email link's single-use `token` authorises the change. No
// session token is sent, so a stale login in this browser can't interfere.
const ClientSetPassword = async ({ clientTenantId, password, token }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/client/password-reset`,
      { clientTenantId, password, token },
      requestConfig(),
    );
    return response;
  } catch (error) {
    throw setPasswordError(error);
  }
};

// First login (forced reset): there is no email link, so the signed-in
// client's access token authorises the change instead of a body token.
const ClientFirstLoginSetPassword = async ({ clientTenantId, password, accessToken }) => {
  try {
    const config = requestConfig();
    const response = await axios.patch(
      `${PLAIN_API_URL}/client/password-reset`,
      { clientTenantId, password },
      {
        ...config,
        headers: {
          ...config.headers,
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
      },
    );
    return response;
  } catch (error) {
    throw setPasswordError(error);
  }
};

export const refreshAccessToken = async (refreshToken, onSuccess) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/refresh-token`, {
      refreshToken,
    }, requestConfig());
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    if (accessToken) {
      onSuccess?.({ accessToken, refreshToken: newRefreshToken });
      return accessToken;
    }
  } catch (error) {
    const status = error?.response?.status;
    // Only an actively rejected refresh token ends the session. A network drop
    // or a 5xx — the API restarting mid-deploy, say — leaves the token valid,
    // so re-throw and let the interceptor keep the user signed in.
    if (status !== 401 && status !== 403) throw error;
  }
  return null;
};

export default {
  ClientLogin,
  ClientSetPassword,
  ClientFirstLoginSetPassword,
  ClientForgetPassword,
  refreshAccessToken,
};
