import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// Notification routes are namespaced by app ("admin" here, "client" in the
// client app). The user route additionally takes the role as its last segment,
// which is "ADMIN" for the control (super-admin) app.
const getNotifications = async ({ userId, userType = "ADMIN", accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/notifications/user/admin/${userId}/${userType}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to load notifications");
  }
};

const markNotificationRead = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/notifications/read/admin/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to mark notification as read");
  }
};

export default { getNotifications, markNotificationRead };
