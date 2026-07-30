import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// NOTE: `userType` defaults to "ADMIN" for the control (super-admin) app.
// This is an assumption to confirm with the backend — the tenant app uses
// "TENANT_STAFF" and the client app uses "CLIENT". If the backend expects a
// different discriminator for control users, update the default below.
const getNotifications = async ({ userId, userType = "ADMIN", accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/notifications/user/${userId}/${userType}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to load notifications");
  }
};

const markNotificationRead = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/notifications/read/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to mark notification as read");
  }
};

export default { getNotifications, markNotificationRead };
