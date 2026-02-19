import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

export const CreateNotificationSettings = async ({
  tenantClientId,
  reschedule,
  starts,
  completed,
  awaitingReview,
  approvedReschedule,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(
      `${PLAIN_API_URL}/notification-settings`,
      {
        tenantClientId,
        reschedule,
        starts,
        completed,
        awaitingReview,
        approvedReschedule,
      },
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Create new notification settings failed",
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
      `${PLAIN_API_URL}/notification-settings/tenant/${tenantClientId}`,
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get notification settings failed",
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
    const response = await authFetch.put(`${PLAIN_API_URL}/client`, {
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
  UpdateClientDetails,
  UpdatePassword,
  UploadProfileImage,
  GetClientDetails,
};
