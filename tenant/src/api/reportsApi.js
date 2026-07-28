import AxiosInterceptor from "../Helper/AxiosInterceptor";

const API_URL = import.meta.env.VITE_API_URL;

const getSessionsByServiceCode = async ({ tenantId, serviceCodeId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${API_URL}/sessions/service/${tenantId}/${serviceCodeId}`);
    return res.data?.data || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch sessions by service code");
  }
};

const getSessionsBySessionType = async ({ tenantId, sessionTypeId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const res = await authFetch.get(`${API_URL}/sessions/session-type/${tenantId}/${sessionTypeId}`);
    return res.data?.data || [];
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch sessions by session type");
  }
};

const getActivityLogs = async ({ tenantId, page = 1, limit = 50, featureNames, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    let url = `${API_URL}/logs/tenant/activity/tenant?tenantId=${tenantId}&page=${page}&limit=${limit}`;
    if (featureNames) url += `&featureNames=${featureNames}`;
    const res = await authFetch.get(url);
    return res.data?.data || { data: [], meta: { total: 0, page: 1, limit, totalPages: 1 } };
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch logs");
  }
};

export default { getSessionsByServiceCode, getSessionsBySessionType, getActivityLogs };
