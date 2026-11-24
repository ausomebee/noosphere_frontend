import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";
import { NETWORK_ERROR_MESSAGE, isNetworkFailure } from "../Helper/authErrors";
import {
  preSessionAuthHeaders,
  twoFactorTokenExpired,
  endExpiredTwoFactor,
  TWO_FACTOR_EXPIRED_MESSAGE,
} from "../Helper/twoFactorSession";
// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// These calls run before there is a session, so they go out on plain axios,
// which has no timeout of its own: a dead connection left the login button
// spinning forever. 20s is long enough for a slow mobile network.
const AUTH_TIMEOUT_MS = 20000;
const withTimeout = { timeout: AUTH_TIMEOUT_MS };

// Builds the Error these functions throw. A network failure carries the
// "can't reach the server" text (and a flag) instead of the generic fallback,
// so the pages can tell the user what actually went wrong.
const toAuthError = (error, fallback, serverMessage = error?.response?.data?.message) => {
  if (isNetworkFailure(error)) {
    const networkError = new Error(NETWORK_ERROR_MESSAGE);
    networkError.isNetworkError = true;
    return networkError;
  }
  return new Error(serverMessage || fallback);
};

// The 2FA setup and verify calls carry the 2FA token (or, without one, the
// signed-in user's access token). If the 2FA token has run out, the sign-in
// has to start again, so end it rather than show a confusing error.
const twoFactorCall = async (userId, send, fallback) => {
  if (twoFactorTokenExpired(userId)) {
    endExpiredTwoFactor();
    throw new Error(TWO_FACTOR_EXPIRED_MESSAGE);
  }
  try {
    return await send({ ...withTimeout, headers: preSessionAuthHeaders(userId) });
  } catch (error) {
    const status = error?.response?.status;
    if (
      (status === 401 || status === 403) &&
      twoFactorTokenExpired(userId, { strict: true })
    ) {
      endExpiredTwoFactor();
      throw new Error(TWO_FACTOR_EXPIRED_MESSAGE);
    }
    throw typeof fallback === "function" ? fallback(error) : toAuthError(error, fallback);
  }
};

const AdminVerifyToken = ({ userId, token }) =>
  twoFactorCall(
    userId,
    (config) =>
      axios.post(`${PLAIN_API_URL}/auth/tenant/verify`, { userId, token }, config),
    "Verification failed"
  );

const AdminLogin = async ({ email, password }) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/tenant/signin`,
      { email, password },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "Login failed");
  }
};
// Invite link: the email link's `token` authorises setting the password.
const AdminOnboarding = async ({ id, password, token }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/tenant/setpassword`,
      { id, password, token },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "Admin Onboarding failed");
  }
};

const AdminForgetPassword = async ({ email }) => {
  try {
    // The email goes in the body, not the address, so it stays out of logs.
    const response = await axios.post(
      `${PLAIN_API_URL}/tenant/forgotpassword`,
      { email },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "Forget Password Email failed");
  }
};

const setPasswordError = (error) =>
  toAuthError(error, "Password setting failed", error.response?.data?.data?.message);

// Reset link: the email link's `token` authorises setting the password. No
// session token is sent, so a stale one from another login can't interfere.
const AdminSetPassword = async ({ id, password, token }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/tenant/setpassword`,
      { id, password, token },
      withTimeout
    );
    return response;
  } catch (error) {
    throw setPasswordError(error);
  }
};

// First login with the emailed temporary password: there is no link token, so
// the signed-in session (2FA token or access token) authorises the change.
const AdminFirstLoginSetPassword = ({ id, password }) =>
  twoFactorCall(
    id,
    (config) =>
      axios.patch(`${PLAIN_API_URL}/tenant/setpassword`, { id, password }, config),
    setPasswordError
  );


const Admin2FALink = ({ id, moduleType }) =>
  twoFactorCall(
    id,
    (config) => axios.get(`${PLAIN_API_URL}/auth/tenant/${id}/${moduleType}`, config),
    "error in 2FA link"
  );
// Saving the 2FA policy is an admin action, so it carries the session's token
// through the interceptor (which also refreshes it). A caller with no session
// yet keeps the old unauthenticated request.
const SuperAdminChoices = async ({
  Authenticator2FA,
  securityQuestion,
  setForAll,
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const body = {
    Authenticator2FA,
    securityQuestion,
    setForAll,
    tenantId
  };
  // During a first login that requires 2FA there is no access token yet, only
  // the 2FA token, so send that (and handle it running out like the 2FA calls).
  if (!accessToken) {
    return twoFactorCall(
      undefined,
      (config) =>
        axios.patch(`${PLAIN_API_URL}/tenant/tenantadminchoices`, body, config),
      "error in super admin choices"
    );
  }
  try {
    return await AxiosInterceptor(accessToken, refreshToken).patch(
      `${PLAIN_API_URL}/tenant/tenantadminchoices`,
      body
    );
  } catch (error) {
    throw toAuthError(error, "error in super admin choices");
  }
};
const GetSuperAdminChoices = async ({id}) => {
  try {
    const response = await axios.get(
      `${PLAIN_API_URL}/tenant/tenantadminchoices/${id}`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        ...withTimeout,
      }
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "error in getting super admin choices");
  }
};


const Admin2FACreateSecretMessage = ({ userId, secret, authQuestion, module }) =>
  twoFactorCall(
    userId,
    (config) =>
      axios.post(
        `${PLAIN_API_URL}/auth/tenant/createsecretemessage`,
        { userId, secret, authQuestion, module },
        config
      ),
    "error in creating secret message"
  );
const Admin2FAVerifySecretMessage = ({ userId, secret, authQuestion }) =>
  twoFactorCall(
    userId,
    (config) =>
      axios.post(
        `${PLAIN_API_URL}/auth/tenant/verifysecretmessage`,
        { userId, secret, authQuestion },
        config
      ),
    "error verifying secret message"
  );
const Admin2FAVerify = ({ userId, token }) =>
  twoFactorCall(
    userId,
    (config) =>
      axios.post(`${PLAIN_API_URL}/auth/tenant/verify`, { userId, token }, config),
    "error in 2FA verify"
  );

export const refreshAccessToken = async (refreshToken, onSuccess) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/auth/refresh-token`,
      { refreshToken },
      withTimeout
    );
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
  AdminVerifyToken,
  AdminLogin,
  AdminForgetPassword,
  AdminSetPassword,
  AdminFirstLoginSetPassword,
  Admin2FALink,
  Admin2FAVerify,
  SuperAdminChoices,
  GetSuperAdminChoices,
  Admin2FACreateSecretMessage,
  Admin2FAVerifySecretMessage,
  AdminOnboarding,
  refreshAccessToken,
};
