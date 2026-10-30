import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetAssignedClinicians = async ({ clientId, tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/client/clinician/${clientId}/${tenantId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to get assigned clinicians",
    );
  }
};

const SendMessage = async ({
  clientId,
  clinicianId,
  subject,
  message,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/messages`, {
      clientId,
      clinicianId,
      subject,
      message,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to send message",
    );
  }
};

const GetUserMessages = async ({ userId, userType = "CLIENT", accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/messages/user/client/${userId}/${userType}`
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to get messages");
  }
};

const GetNotifications = async ({ userId, userType = "CLIENT", accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/notifications/user/client/${userId}/${userType}`
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to get notifications");
  }
};

// Mark a single message as read by its ID
// PATCH /messages/read/client/:messageId
const MarkMessageAsRead = async ({ messageId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/messages/read/client/${messageId}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Mark message as read failed");
  }
};

const MarkNotificationRead = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/notifications/read/client/${id}`);
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to mark notification as read");
  }
};

export default { GetAssignedClinicians, SendMessage, GetUserMessages, MarkMessageAsRead, GetNotifications, MarkNotificationRead };
