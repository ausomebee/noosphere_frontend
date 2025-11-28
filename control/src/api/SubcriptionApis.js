import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

// Utility to always return an array of string IDs
const normalizeSubscriptionIds = (subscriptionId) => {
  if (Array.isArray(subscriptionId)) {
    return subscriptionId.map(id => (typeof id === 'object' ? id.id : id));
  }
  return [typeof subscriptionId === 'object' ? subscriptionId.id : subscriptionId];
};

const GetSubscriptionByStatus = async ({ status, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/subscription/status/${status}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch subscription by status"
    );
  }
};

const GetCountForSubscription = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/subscription/count/total`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch subscription counts by status"
    );
  }
};

const CancelSubscriptionNow = async ({
  status,
  subscriptionId,
  adminId,
  comment,
  reason,
  mailNotification = false,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const id = normalizeSubscriptionIds(subscriptionId);

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/subscription/cancelnow`, {
      status,
      id,
      adminId,
      comment,
      reason,
      autoRenew: false,
      mailNotification: Boolean(mailNotification),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update subscription status for cancel now"
    );
  }
};

const CancelSubscriptionLater = async ({
  subscriptionId,
  adminId,
  comment,
  reason,
  mailNotification = false,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const id = normalizeSubscriptionIds(subscriptionId);

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/subscription/cancelatend`, {
      id,
      adminId,
      comment,
      reason,
      autoRenew: false,
      mailNotification: Boolean(mailNotification),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update subscription status for cancel at end"
    );
  }
};

const ResumeSubscriptionNow = async ({
  status,
  subscriptionId,
  adminId,
  comment,
  reason,
  mailNotification = false,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const id = normalizeSubscriptionIds(subscriptionId);

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/subscription/resumenow`, {
      status,
      id,
      adminId,
      comment,
      reason,
      autoRenew: false,
      mailNotification: Boolean(mailNotification),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update subscription status for resume now"
    );
  }
};

const ResumeSubscriptionLater = async ({
  resumeShedule,
  subscriptionId,
  adminId,
  comment,
  reason,
  mailNotification = false,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const id = normalizeSubscriptionIds(subscriptionId);

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/subscription/resumelater`, {
      resumeShedule,
      id,
      adminId,
      comment,
      reason,
      autoRenew: false,
      mailNotification: Boolean(mailNotification),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update subscription status for resume later"
    );
  }
};

const PauseSubscriptionNow = async ({
  status,
  subscriptionId,
  adminId,
  comment,
  reason,
  mailNotification = false,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const id = normalizeSubscriptionIds(subscriptionId);

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/subscription/pausenow`, {
      status,
      id,
      adminId,
      comment,
      reason,
      autoRenew: false,
      mailNotification: Boolean(mailNotification),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update subscription status for pause now"
    );
  }
};

const PauseSubscriptionUntil = async ({
  resumeShedule,
  status,
  subscriptionId,
  adminId,
  comment,
  reason,
  mailNotification = false,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const id = normalizeSubscriptionIds(subscriptionId);

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/subscription/pauseuntil`, {
      resumeShedule,
      status,
      id,
      adminId,
      comment,
      reason,
      autoRenew: false,
      mailNotification: Boolean(mailNotification),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update subscription status for pause until"
    );
  }
};

const PauseSubscriptionSchedule = async ({
  pauseSchedule,
  subscriptionId,
  adminId,
  comment,
  reason,
  mailNotification = false,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  const id = normalizeSubscriptionIds(subscriptionId);

  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/subscription/pauseschedule`, {
      pauseSchedule,
      id,
      adminId,
      comment,
      reason,
      autoRenew: false,
      mailNotification: Boolean(mailNotification),
    });
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update subscription status for pause schedule"
    );
  }
};

export default {
  GetSubscriptionByStatus,
  GetCountForSubscription,
  CancelSubscriptionNow,
  CancelSubscriptionLater,
  ResumeSubscriptionNow,
  ResumeSubscriptionLater,
  PauseSubscriptionNow,
  PauseSubscriptionUntil,
  PauseSubscriptionSchedule,
};
