import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";
import { toAuthError } from "../Helper/authErrors";
// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// These calls use plain axios, which has no timeout of its own: a hung server
// left the login and 2FA buttons spinning forever.
const AUTH_TIMEOUT_MS = 20000;
const withTimeout = { timeout: AUTH_TIMEOUT_MS };

const AdminVerifyToken = async ({ userId, token }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/verify`, {
      userId,
      token,
    }, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "Verification failed");
  }
};

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
const AdminOnboarding = async ({ id, password }) => {
  try {
    const response = await axios.patch(`${PLAIN_API_URL}/admin/setpassword`, {
      id,
      password,
    }, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "Admin Onboarding failed");
  }
};

const AdminForgetPassword = async ({ email }) => {
  try {
    const response = await axios.get(
      `${PLAIN_API_URL}/admin/forgotpassword/${email}`,
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

const AdminSetPassword = async ({ id, password }) => {
  try {
    const response = await axios.patch(`${PLAIN_API_URL}/admin/setpassword`, {
      id,
      password,
    }, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(
      error,
      error.response?.data?.data?.message || "Password setting failed"
    );
  }
};

const SuperAdministrativePassword = async ({
  id,
   oldAdministratorPassword,
  newAdministratorPassword
}) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/admin/setadministratorpassword`,
      {
        id,
         oldAdministratorPassword,
  newAdministratorPassword
      },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(
      error,
      error.response?.data?.message || "Adminstrator password failed"
    );
  }
};
const Admin2FALink = async ({ id, moduleType }) => {
  try {
    const response = await axios.get(`${PLAIN_API_URL}/auth/${id}/${moduleType}`, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "error in 2FA link");
  }
};
// Saving the choices is a protected endpoint: send it through the auth
// interceptor so it carries the bearer token, like SetSuperAdminEnabled.
const SuperAdminChoices = async ({
  Authenticator2FA,
  securityQuestion,
  setForAll,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/admin/superadminchoices`,
      {
        Authenticator2FA,
        securityQuestion,
        setForAll,
      },
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


const Admin2FACreateSecretMessage = async ({ userId, secret, authQuestion, module }) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/auth/createsecretemessage`,
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
    throw toAuthError(error, error.response?.data?.message || "error in creating secret message");
  }
};
const Admin2FAVerifySecretMessage = async ({ userId, secret, authQuestion }) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/auth/verifysecretmessage`,
      {
        userId,
        secret,
       authQuestion 
      },
      withTimeout
    );
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "error verifying secret message");
  }
};
const Admin2FAVerify = async ({ userId, token }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/verify`, {
      userId,
      token,
    }, withTimeout);
    return response;
  } catch (error) {
    throw toAuthError(error, error.response?.data?.message || "error in 2FA verify");
  }
};

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
