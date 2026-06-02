import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const getNotifications = async ({ userId, userType = "TENANT_STAFF", accessToken, refreshToken }) => {
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

const getNotificationSettings = async ({ userId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant/notification-settings/${userId}`);
    return response.data?.data || null;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to load notification settings");
  }
};

const saveNotificationSettings = async ({ userId, settings, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  // Transform state object back to array format expected by the API
  const data = Object.entries(settings).filter(([key]) => isNaN(key)).map(([key, catSettings]) => {
    const { enabled: _enabled, ...items } = catSettings;
    return {
      key,
      items: Object.entries(items).map(([itemKey, itemEnabled]) => ({
        key: itemKey,
        enabled: itemEnabled,
      })),
    };
  });
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/tenant/notification-settings`, { userId, settings: data });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to save notification settings");
  }
};

export default { getNotifications, markNotificationRead, getNotificationSettings, saveNotificationSettings };
