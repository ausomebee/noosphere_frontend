import axios from "axios";

// Define your API endpoints

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const ClientLogin = async ({ email, password }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/client/login`, {
      email,
      password,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

const ClientForgetPassword = async ({ email }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/client/initiate/password-reset/${email}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Forget Password Email failed",
    );
  }
};

const ClientSetPassword = async ({ clientTenantId, password }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/client/password-reset`,
      {
        clientTenantId,
        password,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.data?.message || "Password setting failed",
    );
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
  ClientLogin,
  ClientSetPassword,
  ClientForgetPassword,
  refreshAccessToken,
};
