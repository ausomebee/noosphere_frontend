import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";
import { NETWORK_ERROR_MESSAGE, isNetworkFailure } from "../Helper/authErrors";
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

const AdminVerifyToken = async ({ userId, token }) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/auth/tenant/verify`,
      { userId, token },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "Verification failed");
  }
};

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
const AdminOnboarding = async ({ id, password }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/tenant/setpassword`,
      { id, password },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "Admin Onboarding failed");
  }
};

const AdminForgetPassword = async ({ email }) => {
  try {
    const response = await axios.get(
      `${PLAIN_API_URL}/tenant/forgotpassword/${email}`,
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "Forget Password Email failed");
  }
};

const AdminSetPassword = async ({ id, password }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/tenant/setpassword`,
      { id, password },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(
      error,
      "Password setting failed",
      error.response?.data?.data?.message
    );
  }
};


const Admin2FALink = async ({ id, moduleType }) => {
  try {
    const response = await axios.get(
      `${PLAIN_API_URL}/auth/tenant/${id}/${moduleType}`,
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "error in 2FA link");
  }
};
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
  try {
    const response = accessToken
      ? await AxiosInterceptor(accessToken, refreshToken).patch(
          `${PLAIN_API_URL}/tenant/tenantadminchoices`,
          body
        )
      : await axios.patch(
          `${PLAIN_API_URL}/tenant/tenantadminchoices`,
          body,
          withTimeout
        );
    return response;
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


const Admin2FACreateSecretMessage = async ({ userId, secret, authQuestion, module }) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/auth/tenant/createsecretemessage`,
      {
        userId,
        secret,
        authQuestion,
        module
      },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "error in creating secret message");
  }
};
const Admin2FAVerifySecretMessage = async ({ userId, secret, authQuestion }) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/auth/tenant/verifysecretmessage`,
      {
        userId,
        secret,
       authQuestion 
      },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "error verifying secret message");
  }
};
const Admin2FAVerify = async ({ userId, token }) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/auth/tenant/verify`,
      { userId, token },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, "error in 2FA verify");
  }
};

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
  Admin2FALink,
  Admin2FAVerify,
  SuperAdminChoices,
  GetSuperAdminChoices,
  Admin2FACreateSecretMessage,
  Admin2FAVerifySecretMessage,
  AdminOnboarding,
  refreshAccessToken,
};
