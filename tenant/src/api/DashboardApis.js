import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetDashboardIntakeByTenantId = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/pipeline/tenant/overview/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get dashboard intake by tenant id failed"
    );
  }
};

const GetAllTenantClientAuthorization = async ({
  tenantId,
  status,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-authorization/summary/${tenantId}/${status}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get client Authorization by tenant id and status failed"
    );
  }
};
const GetTenantClientAuthorizationMetrics = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/client-authorization/summary/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message ||
        "Get client Authorization Metric by tenant id failed"
    );
  }
};
const GetTenantSessionMetrics = async ({
  tenantId,
  status,
  period,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/appointments/tenant/metric/${tenantId}/${status}/${period}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Session Metric by tenant id failed"
    );
  }
};
const GetTenantSessionOverviewMetrics = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/sessions/tenant/overview/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Session Overview Metric by tenant id failed"
    );
  }
};
const GetTenantAvailabilityCount = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant/count-staff/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Availability Count by tenant id failed"
    );
  }
};
const GetTenantCaseloadCount = async ({
  tenantId,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/tenant/avg-staff/${tenantId}`
    );
    return response;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Get Tenant Caseload Count by tenant id failed"
    );
  }
};

export default {
  GetDashboardIntakeByTenantId,
  GetTenantClientAuthorizationMetrics,
  GetAllTenantClientAuthorization,
  GetTenantSessionMetrics,
  GetTenantSessionOverviewMetrics,
  GetTenantAvailabilityCount,
  GetTenantCaseloadCount,
};
