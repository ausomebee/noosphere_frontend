import axios from "axios";


// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const AdminVerifyToken = async ({ userId, token }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/tenant/verify`, {
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
    const response = await axios.post(`${PLAIN_API_URL}/tenant/signin`, {
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
    const response = await axios.patch(`${PLAIN_API_URL}/tenant/setpassword`, {
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
      `${PLAIN_API_URL}/tenant/forgotpassword/${email}`
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
    const response = await axios.patch(`${PLAIN_API_URL}/tenant/setpassword`, {
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


const Admin2FALink = async ({ id, moduleType }) => {
  try {
    const response = await axios.get(`${PLAIN_API_URL}/auth/tenant/${id}/${moduleType}`, );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in 2FA link");
  }
};
const SuperAdminChoices = async ({
  Authenticator2FA,
  securityQuestion,
  setForAll,
  tenantId
}) => {
  try {
    const response = await axios.post(
      `${PLAIN_API_URL}/tenant/tenantadminchoices`,
      {
        Authenticator2FA,
        securityQuestion,
        setForAll,
        tenantId
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in super admin choices");
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
      }
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in getting super admin choices");
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
      `${PLAIN_API_URL}/auth/tenant/verifysecretmessage`,
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
    const response = await axios.post(`${PLAIN_API_URL}/auth/tenant/verify`, {
      userId,
      token,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "error in 2FA verify");
  }
};

export const refreshAccessToken = async (refreshToken, dispatch) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/refresh-token`, {
      creatorToken: refreshToken,
    });
    const { accessToken } = response.data;

    console.log("this is the new access token", accessToken);

    if (accessToken) {
      console.log("this is here 12");
      dispatch(updateAccessToken(accessToken));
      console.log("this is here 13");
      return accessToken;
    }
  } catch (error) {
    console.error("Failed to refresh token", error);
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
