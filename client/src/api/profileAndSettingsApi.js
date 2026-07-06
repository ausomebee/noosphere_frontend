import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

export const CreateNotificationSettings = async ({
  tenantClientId,
  appointmentScheduled,
  appointmentRescheduled,
  appointmentAboutToStart,
  appointmentStarted,
  appointmentCancelled,
  appointmentCompletedAwaitingFeedback,
  documentRequested,
  formShared,
  authorizationAboutToExpire,
  authorizationExpired,
  authorizationUnitsAlmostExhausted,
  authorizationUnitsExhausted,
  signatureRequested,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/client/notification-settings`,
      {
        tenantClientId,
        appointmentScheduled,
        appointmentRescheduled,
        appointmentAboutToStart,
        appointmentStarted,
        appointmentCancelled,
        appointmentCompletedAwaitingFeedback,
        documentRequested,
        formShared,
        authorizationAboutToExpire,
        authorizationExpired,
        authorizationUnitsAlmostExhausted,
        authorizationUnitsExhausted,
        signatureRequested,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Create new notification settings failed",
    );
  }
};

export const GetNotificationSettings = async ({
  tenantClientId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client/notification-settings/${tenantClientId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get notification settings failed",
    );
  }
};

export const UpdateNotificationSettings = async ({
  id,
  accessToken,
  refreshToken,
  ...fields
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(
      `${PLAIN_API_URL}/client/notification-settings/${id}`,
      { id, ...fields },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update notification settings failed",
    );
  }
};

const GetClientDetails = async ({ clientId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client/client/${clientId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get client details failed",
    );
  }
};

export const UpdateClientDetails = async ({
  clientId,
  firstName,
  lastName,
  email,
  phoneNumber,
  gender,
  DOB,
  preferredName,
  streetAddress,
  city,
  state,
  country,
  zipCode,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.put(`${PLAIN_API_URL}/client/client`, {
      id: clientId,
      firstName,
      lastName,
      email,
      phoneNumber,
      gender,
      DOB,
      preferredName,
      streetAddress,
      city,
      state,
      country,
      zipCode,
    });
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Update client details failed",
    );
  }
};

export const UploadProfileImage = async ({
  clientId,
  avatarUrl,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/client/update-avatar`,
      {
        clientId,
        avatarUrl,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Profile image upload failed",
    );
  }
};

export const UpdatePassword = async ({
  clientTenantId,
  currentPassword,
  newPassword,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/client/update-password`,
      {
        clientTenantId,
        currentPassword,
        newPassword,
      },
    );
    return response;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Password update failed");
  }
};
export default {
  CreateNotificationSettings,
  GetNotificationSettings,
  UpdateNotificationSettings,
  UpdateClientDetails,
  UpdatePassword,
  UploadProfileImage,
  GetClientDetails,
};
