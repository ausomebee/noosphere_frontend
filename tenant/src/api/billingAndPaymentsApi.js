import axios from "axios";
import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const CreateTenantServiceCode = async ({
  tenantId,
  code,
  description,
  modifiers,

  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      code,
      description,
      isActive,
      modifiers,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/service-codes`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Service Code failed");
  }
};

const UpdateTenantServiceCode = async ({
  id,
  tenantId,
  code,
  description,
  modifiers,

  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      tenantId,
      code,
      description,
      isActive,
      modifiers,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/service-codes`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Service Code failed");
  }
};

const GetTenantServiceCodeByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/service-codes/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Service Code by tenant id failed");
  }
};

const UpdateServiceCodeActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/service-codes/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};

const CreateTenantRoundingRule = async ({
  tenantId,
  ruleType,
  ruleName,
  description,
  standardUnit,
  roundingRule,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      ruleType,
      description,
      standardUnit,
      roundingRule,
      ruleName,
      isActive,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/rounding-rules`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Rounding Rules failed");
  }
};

const UpdateTenantRoundingRule = async ({
  id,
  tenantId,
  ruleType,
  description,
  standardUnit,
  roundingRule,
  ruleName,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      tenantId,
      ruleType,
      description,
      standardUnit,
      roundingRule,
      ruleName,
      isActive,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/rounding-rules`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Rounding Rules failed");
  }
};

const GetRoundingRuleByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/rounding-rules/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Rounding Rule by tenant id failed");
  }
};

const UpdateRoundingRuleActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/rounding-rules/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};

const CreateInsuranceType = async ({
  tenantId,
  name,
  description,
  isActive,

  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      name,
      description,
      isActive,
    };

    const response = await authFetch.post(
      `${PLAIN_API_URL}/insurance-types`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Insurance Type failed");
  }
};

const UpdateInsuranceType = async ({
  id,
  tenantId,
  name,
  description,
  isActive,

  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      tenantId,
      name,
      description,
      isActive,
    };

    const response = await authFetch.put(
      `${PLAIN_API_URL}/insurance-types`,
      payload
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Insurance Type failed");
  }
};

const GetInsuranceTypeByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/insurance-types/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Insurance Type by tenant id failed");
  }
};

const UpdateInsuranceTypeActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/insurance-types/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};
const CreatePayer = async ({
  tenantId,
  payerName,
  email,
  phone,
  insuranceTypeId,
  tplCode,
  carrierPayerId,
  address,
  city,
  state,
  zip,
  country,
  serviceCodes,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      tenantId,
      payerName,
      email,
      phone,
      insuranceTypeId,
      tplCode,
      carrierPayerId,
      address,
      city,
      state,
      zip,
      country,
      serviceCodes,
      isActive,
    };

    const response = await authFetch.post(`${PLAIN_API_URL}/payers`, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Create Payer failed");
  }
};

const UpdatePayer = async ({
  id,
  tenantId,
  payerName,
  email,
  phone,
  insuranceTypeId,
  tplCode,
  carrierPayerId,
  address,
  city,
  state,
  zip,
  country,
  serviceCodes,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const payload = {
      id,
      tenantId,
      payerName,
      email,
      phone,
      insuranceTypeId,
      tplCode,
      carrierPayerId,
      address,
      city,
      state,
      zip,
      country,
      serviceCodes,
      isActive,
    };

    const response = await authFetch.put(`${PLAIN_API_URL}/payers`, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Update Payer failed");
  }
};

const GetSInglePayerById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/payers/${id}`);
    return response.data.data;
  } catch (error) {
    throw new Error(error.message || "Get Payers by payer id failed");
  }
};
const GetPayerByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/payers/tenant/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Payers by tenant id failed");
  }
};

const UpdatePayerActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/payers/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};
const UpdatePayerServiceCodeActiveness = async ({
  id,
  isActive,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(
      `${PLAIN_API_URL}/payer-service-codes/${id}/${isActive}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Toggle Active or Inactive failed"
    );
  }
};


const GetTimeSheetByTenantId = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/sessions/appointment/${tenantId}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.message || "Get Timesheets by tenant id failed");
  }
};

export default {
  CreateTenantServiceCode,
  UpdateTenantServiceCode,
  GetTenantServiceCodeByTenantId,
  UpdateServiceCodeActiveness,
  CreateTenantRoundingRule,
  UpdateTenantRoundingRule,
  UpdateRoundingRuleActiveness,
  GetRoundingRuleByTenantId,
  CreateInsuranceType,
  UpdateInsuranceType,
  GetInsuranceTypeByTenantId,
  UpdateInsuranceTypeActiveness,
  CreatePayer,
  UpdatePayer,
  UpdatePayerActiveness,
  GetPayerByTenantId,
  GetSInglePayerById,
  UpdatePayerServiceCodeActiveness,
  GetTimeSheetByTenantId
};
