import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";


const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateGeneralSettings = async ({
  tenantId,
  dateFormat,
  timeFormat,
  currency,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      dateFormat,
      timeFormat,
      currency,
    };
    const response = await authFetch.post(
      `${PLAIN_API_URL}/tenant-general-settings`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create general settings failed");
  }
};

const UpdateGeneralSettings = async ({
  tenantId,
  dateFormat,
  timeFormat,
  currency,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      dateFormat,
      timeFormat,
      currency,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/tenant-general-settings`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update general settings failed");
  }
};

const GetGeneralSettingsByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant-general-settings/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get general settings failed");
  }
};

const TenantSecurityQuestions = async ({
  tenantId,
  question,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      question,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/tenant-security-questions`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Set tenant security questions failed");
  }
};

const UpdateTenantSecurityQuestions = async ({
  id,
  question,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      question,
    };
    const response = await authFetch.put(
      `${PLAIN_API_URL}/tenant-security-questions`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update tenant security questions failed");
  }
};

const GetTenantSecurityQuestionsByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant-security-questions/tenant/${tenantId}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get tenant security questions failed");
  }
};

const GetTenantSecurityQuestionsById = async ({
  id,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant-security-questions/${id}`,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get tenant security questions failed");
  }
};

const Set2FASetDefault = async ({
  tenantId,
  accessToken,
  refreshToken,
  authenticatorType, 
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      authenticatorType, 
    };
    const response = await authFetch.post(
      `${PLAIN_API_URL}/tenant/2fa-default`,
      payload,
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Set 2FA default failed");
  }
};

// Export the function to make it accessible
export default {
  CreateGeneralSettings,
  UpdateGeneralSettings,
  GetGeneralSettingsByTenantId,
  TenantSecurityQuestions,
  UpdateTenantSecurityQuestions,
  GetTenantSecurityQuestionsByTenantId,
  Set2FASetDefault,
  GetTenantSecurityQuestionsById
};
