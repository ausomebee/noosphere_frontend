import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// ─── Conversations ───

const GetConversations = async ({ userId, tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/conversations/user/${userId}`,
      { params: { tenantId } },
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get conversations failed");
  }
};

const CreateConversation = async ({ participants, tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/conversations`, {
      participants,
      tenantId,
    });
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Create conversation failed");
  }
};

// ─── Messages ───

const GetMessages = async ({ conversationId, page, limit, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/messages/conversation/${conversationId}`,
      { params: { page, limit } },
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get messages failed");
  }
};

const MarkMessagesAsRead = async ({ conversationId, userId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/messages/read/${conversationId}/${userId}`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Mark messages as read failed");
  }
};

// ─── Notifications ───

const GetNotifications = async ({ userId, tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/notifications/user/${userId}`,
      { params: { tenantId } },
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get notifications failed");
  }
};

const MarkNotificationAsRead = async ({ notificationId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/notifications/${notificationId}/read`,
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Mark notification as read failed");
  }
};

const GetUnreadNotificationCount = async ({ userId, tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/notifications/unread-count/${userId}`,
      { params: { tenantId } },
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Get unread count failed");
  }
};

export default {
  GetConversations,
  CreateConversation,
  GetMessages,
  MarkMessagesAsRead,
  GetNotifications,
  MarkNotificationAsRead,
  GetUnreadNotificationCount,
};
