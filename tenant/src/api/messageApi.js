import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const getConversations = async ({ userId, userType = "TENANT_STAFF", accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/messages/user/${userId}/${userType}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to load conversations");
  }
};

const markMessageRead = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/messages/read/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to mark message as read");
  }
};

export default { getConversations, markMessageRead };
