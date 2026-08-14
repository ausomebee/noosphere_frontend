import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";
// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const AdminVerifyToken = async ({ userId, token }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/verify`, {
      userId,
      token,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Verification failed");
  }
};

const AdminLogin = async ({ email, password }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/admin/signin`, {
      email,
      password,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};
const AdminOnboarding = async ({ id, password }) => {
  try {
    const response = await axios.patch(`${PLAIN_API_URL}/admin/setpassword`, {
      id,
      password,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Admin Onboarding failed");
  }
};

const AdminForgetPassword = async ({ email }) => {
  try {
    const response = await axios.get(
      `${PLAIN_API_URL}/admin/forgotpassword/${email}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Forget Password Email failed"
    );
  }
};

const AdminSetPassword = async ({ id, password }) => {
  try {
    const response = await axios.patch(`${PLAIN_API_URL}/admin/setpassword`, {
      id,
      password,
    });
    return response;
  } catch (error) {
    throw new Error(
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Adminstrator password failed"
    );
  }
};
const Admin2FALink = async ({ id, moduleType }) => {
  try {
    const response = await axios.get(`${PLAIN_API_URL}/auth/${id}/${moduleType}`, );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in 2FA link");
  }
};
const SuperAdminChoices = async ({
  Authenticator2FA,
  securityQuestion,
  setForAll,
}) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/admin/superadminchoices`,
      {
        Authenticator2FA,
        securityQuestion,
        setForAll,
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in super admin choices");
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in getting super admin choices");
  }
};

// Toggle the master 2FA switch on/off. Uses the auth interceptor so the
// request carries the bearer token (this is a protected endpoint).
const SetSuperAdminEnabled = async ({ isEnabled, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/admin/superadminchoices/enabled`,
      { isEnabled }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error updating 2FA status");
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in creating secret message");
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error verifying secret message");
  }
};
const Admin2FAVerify = async ({ userId, token }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/verify`, {
      userId,
      token,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in 2FA verify");
  }
};

export const refreshAccessToken = async (refreshToken, onSuccess) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/refresh-token`, {
      refreshToken,
    });
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
