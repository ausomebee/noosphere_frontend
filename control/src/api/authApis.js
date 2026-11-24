import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";
import { toAuthError } from "../Helper/authErrors";
import {
  preSessionAuthHeaders,
  twoFactorTokenExpired,
  endExpiredTwoFactor,
  TWO_FACTOR_EXPIRED_MESSAGE,
} from "../Helper/twoFactorSession";
// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// These calls use plain axios, which has no timeout of its own: a hung server
// left the login and 2FA buttons spinning forever.
const AUTH_TIMEOUT_MS = 20000;
const withTimeout = { timeout: AUTH_TIMEOUT_MS };

// The 2FA setup and verify calls carry the 2FA token (or, without one, the
// signed-in admin's access token). If the 2FA token has run out, the sign-in
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
    throw toAuthError(error, fallback(error));
  }
};
const serverMessageOr = (fallback) => (error) =>
  error.response?.data?.message || fallback;

const AdminVerifyToken = ({ userId, token }) =>
  twoFactorCall(
    userId,
    (config) => axios.post(`${PLAIN_API_URL}/auth/verify`, { userId, token }, config),
    serverMessageOr("Verification failed")
  );

const AdminLogin = async ({ email, password }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/admin/signin`, {
      email,
      password,
    }, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "Login failed");
  }
};
// Invite link: the email link's `token` authorises setting the password.
const AdminOnboarding = async ({ id, password, token }) => {
  try {
    const response = await axios.patch(`${PLAIN_API_URL}/admin/setpassword`, {
      id,
      password,
      token,
    }, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "Admin Onboarding failed");
  }
};

const AdminForgetPassword = async ({ email }) => {
  try {
    // The email goes in the body, not the address, so it stays out of logs.
    const response = await axios.post(
      `${PLAIN_API_URL}/admin/forgotpassword`,
      { email },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(
      error,
      error.response?.data?.message || "Forget Password Email failed"
    );
  }
};

const setPasswordMessage = (error) =>
  error.response?.data?.data?.message || "Password setting failed";

// Reset link: the email link's `token` authorises setting the password. No
// session token is sent, so a stale one from another login can't interfere.
const AdminSetPassword = async ({ id, password, token }) => {
  try {
    const response = await axios.patch(`${PLAIN_API_URL}/admin/setpassword`, {
      id,
      password,
      token,
    }, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(error, setPasswordMessage(error));
  }
};

// First login with the emailed temporary password: there is no link token, so
// the signed-in session (2FA token or access token) authorises the change.
const AdminFirstLoginSetPassword = ({ id, password }) =>
  twoFactorCall(
    id,
    (config) =>
      axios.patch(`${PLAIN_API_URL}/admin/setpassword`, { id, password }, config),
    setPasswordMessage
  );

const SuperAdministrativePassword = async ({
  id,
   oldAdministratorPassword,
  newAdministratorPassword
}) => {
  // Part of the first-login chain, so it carries the session like the 2FA calls.
  return twoFactorCall(
    id,
    (config) =>
      axios.patch(
        `${PLAIN_API_URL}/admin/setadministratorpassword`,
        { id, oldAdministratorPassword, newAdministratorPassword },
        config
      ),
    serverMessageOr("Adminstrator password failed")
  );
};
const Admin2FALink = ({ id, moduleType }) =>
  twoFactorCall(
    id,
    (config) => axios.get(`${PLAIN_API_URL}/auth/${id}/${moduleType}`, config),
    serverMessageOr("error in 2FA link")
  );
// Saving the choices is a protected endpoint: send it through the auth
// interceptor so it carries the bearer token, like SetSuperAdminEnabled.
const SuperAdminChoices = async ({
  Authenticator2FA,
  securityQuestion,
  setForAll,
  accessToken,
  refreshToken,
}) => {
  const body = { Authenticator2FA, securityQuestion, setForAll };
  // During a first login that requires 2FA there is no access token yet, only
  // the 2FA token, so send that (and handle it running out like the 2FA calls).
  if (!accessToken) {
    return twoFactorCall(
      undefined,
      (config) => axios.post(`${PLAIN_API_URL}/admin/superadminchoices`, body, config),
      serverMessageOr("error in super admin choices")
    );
  }
  try {
    const response = await AxiosInterceptor(accessToken, refreshToken).post(
      `${PLAIN_API_URL}/admin/superadminchoices`,
      body,
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "error in super admin choices");
  }
};
const GetSuperAdminChoices = async () => {
  try {
    const response = await axios.get(
      `${PLAIN_API_URL}/admin/superadminchoices`,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: AUTH_TIMEOUT_MS,
      }
    );
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "error in getting super admin choices");
  }
};

// Toggle the master 2FA switch on/off. Uses the auth interceptor so the
// request carries the bearer token (this is a protected endpoint).
const SetSuperAdminEnabled = async ({ isEnabled, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/admin/superadminchoices/enabled`,
      { isEnabled },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "error updating 2FA status");
  }
};


const Admin2FACreateSecretMessage = ({ userId, secret, authQuestion, module }) =>
  twoFactorCall(
    userId,
    (config) =>
      axios.post(
        `${PLAIN_API_URL}/auth/createsecretemessage`,
        { userId, secret, authQuestion, module },
        config
      ),
    serverMessageOr("error in creating secret message")
  );
const Admin2FAVerifySecretMessage = ({ userId, secret, authQuestion }) =>
  twoFactorCall(
    userId,
    (config) =>
      axios.post(
        `${PLAIN_API_URL}/auth/verifysecretmessage`,
        { userId, secret, authQuestion },
        config
      ),
    serverMessageOr("error verifying secret message")
  );
const Admin2FAVerify = ({ userId, token }) =>
  twoFactorCall(
    userId,
    (config) => axios.post(`${PLAIN_API_URL}/auth/verify`, { userId, token }, config),
    serverMessageOr("error in 2FA verify")
  );

export const refreshAccessToken = async (refreshToken, onSuccess) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/refresh-token`, {
      refreshToken,
    }, withTimeout);
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
  SuperAdministrativePassword,
  Admin2FALink,
  Admin2FAVerify,
  SuperAdminChoices,
  GetSuperAdminChoices,
  SetSuperAdminEnabled,
  Admin2FACreateSecretMessage,
  Admin2FAVerifySecretMessage,
  AdminOnboarding,
  refreshAccessToken,
};
