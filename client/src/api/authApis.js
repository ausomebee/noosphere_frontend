import axios from "axios";
import { getFingerprint } from "../Helper/fingerprint";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;
const fingerprintHeader = () => ({ "x-fingerprint": getFingerprint() });

const ClientLogin = async ({ email, password }) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/client/login`, {
      email,
      password,
    }, { headers: fingerprintHeader() });
    return response;
  } catch (error) {
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

export const refreshAccessToken = async (refreshToken, onSuccess) => {
  try {
    const response = await axios.post(`${PLAIN_API_URL}/auth/refresh-token`, {
      refreshToken,
    }, { headers: fingerprintHeader() });
    const { accessToken, refreshToken: newRefreshToken } = response.data.data;
    if (accessToken) {
      onSuccess?.({ accessToken, refreshToken: newRefreshToken });
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
