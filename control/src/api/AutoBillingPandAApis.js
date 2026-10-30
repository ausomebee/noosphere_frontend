import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetPaymentAccessManagementAllField = async ({
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/billing/paymentaccess`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Failed to fetch AutoBilling payment and access management"
    );
  }
};

const UpdateChargeOnDueDateToggle = async ({
  accessToken,
  refreshToken,
  id,
  chargeOnDueDate,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/charge-on-due-date`,
      {
        id,
        chargeOnDueDate,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to charge on Due date"
    );
  }
};


const UpdateChargeLastUsedFirstToggle = async ({
  accessToken,
  refreshToken,
  id,
  chargeLastUsedFirst,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/charge-last-used-first`,
      {
        id,
        chargeLastUsedFirst,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to charge last first used"
    );
  }
};
const UpdateChargeAlternativeToggle = async ({
  accessToken,
  refreshToken,
  id,
  chargeAlternative,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/charge-alternative`,
      {
        id,
        chargeAlternative,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to charge alternative"
    );
  }
};
const UpdateRetryBeforeCount = async ({
  accessToken,
  refreshToken,
  id,
  retryBefore,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/retry-before`,
      {
        id,
        retryBefore,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to change retry before"
    );
  }
};
const UpdateRetryAfterCount = async ({
  accessToken,
  refreshToken,
  id,
  retryAfter,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/retry-after`,
      {
        id,
        retryAfter,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to change retry after"
    );
  }
};
const UpdateNotifyTenantToggle = async ({
  accessToken,
  refreshToken,
  id,
  notifyTenant,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/notify-tenant`,
      {
        id,
        notifyTenant,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to change notify Tenant"
    );
  }
};

const NotificationEmail = async ({
  accessToken,
  refreshToken,
  id,
  notificationEmailHeader,
  notificationEmailBody,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/notification-email`,
      {
        id,
        notificationEmailHeader,
        notificationEmailBody,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update notification email"
    );
  }
};

const UpdateCancelAfter = async ({
  accessToken,
  refreshToken,
  id,
  cancelAfter,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/cancel-after`,
      {
        id,
        cancelAfter,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to cancel after");
  }
};
const UpdateManualCancel = async ({
  accessToken,
  refreshToken,
  id,
  manualCancel,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/manual-cancel`,
      {
        id,
        manualCancel,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to manual cancel");
  }
};
const UpdateEmailAfterAttempts = async ({
  accessToken,
  refreshToken,
  id,
  emailAfterAttempts,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/email-after-attempts`,
      {
        id,
        emailAfterAttempts,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to email after attempts"
    );
  }
};
const WarningEmail = async ({
  accessToken,
  refreshToken,
  id,
  warningMailHeader,
  warningMailBody,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/warning-mail`,
      {
        id,
        warningMailHeader,
        warningMailBody,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update warning mail"
    );
  }
};
const SendOnSubCancel = async ({
  accessToken,
  refreshToken,
  id,
  sendOnSubscriptionCancel,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/send-on-subscription-cancel`,
      {
        id,
        sendOnSubscriptionCancel,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update send on sub cancel"
    );
  }
};

const CancelEmail = async ({
  accessToken,
  refreshToken,
  id,
  cancelMailHeader,
  cancelMailBody,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/cancel-mail`,
      {
        id,
        cancelMailHeader,
        cancelMailBody,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update cancel mail"
    );
  }
};
const UpdateSuspensionAction = async ({
  accessToken,
  refreshToken,
  id,
  suspensionAction,
  errorMessage,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/billing/paymentaccess/suspension-action`,
      {
        id,
        suspensionAction,
        errorMessage,
      }
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to update suspension action mail"
    );
  }
};

export default {
  GetPaymentAccessManagementAllField,
  UpdateChargeOnDueDateToggle,
  UpdateChargeLastUsedFirstToggle,
  UpdateRetryBeforeCount,
  UpdateRetryAfterCount,
  UpdateNotifyTenantToggle,
  NotificationEmail,
  UpdateCancelAfter,
  UpdateManualCancel,
  UpdateEmailAfterAttempts,
  WarningEmail,
  SendOnSubCancel,
  CancelEmail,
  UpdateSuspensionAction,
  UpdateChargeAlternativeToggle
};
