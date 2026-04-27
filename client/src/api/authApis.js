import axios from "axios";
import { setTokens } from "../ReduxStore/features/authentication";
import { getFingerprint } from "../Helper/fingerprint";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;
const fingerprintHeader = () => ({ "x-fingerprint": getFingerprint() });

const ClientLogin = async ({ email, password }) => {
  const url = `${PLAIN_API_URL}/client/login`;
  console.log("[API] ClientLogin URL:", url);
  console.log("[API] ClientLogin email:", email);
  try {
    const response = await axios.post(url, {
      email,
      password,
    }, { headers: fingerprintHeader() });
    console.log("[API] ClientLogin success:", response.status);
    return response;
  } catch (error) {
    console.error("[API] ClientLogin error:", error.response?.status, error.response?.data, error.message);
    throw new Error(error.response?.data?.message || "Login failed");
  }
};

const ClientForgetPassword = async ({ email }) => {
  try {
    const response = await axios.patch(
      `${PLAIN_API_URL}/client/initiate/password-reset/${email}`,
      null,
      { headers: fingerprintHeader() },
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
      { headers: fingerprintHeader() },
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
    }, { headers: fingerprintHeader() });
    const { accessToken } = response.data;

    if (accessToken && dispatch) {
      dispatch(setTokens({ accessToken, refreshToken }));
      return accessToken;
    }
  } catch {
    // Token refresh failed — caller handles redirect
  }
  return null;
};

export default {
  ClientLogin,
  ClientSetPassword,
  ClientForgetPassword,
  refreshAccessToken,
};
