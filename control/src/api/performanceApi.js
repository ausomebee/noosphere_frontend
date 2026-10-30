import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetGeneralMetrics = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/performance/general`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch general performance metrics");
  }
};

const GetGeneralTimeseries = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/performance/general/timeseries`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch general performance timeseries");
  }
};

const GetApiErrorRate = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/performance/api-error-rate`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch API error rate");
  }
};

const GetResourceMetrics = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/performance/resources`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch resource metrics");
  }
};

const GetResourceTimeseries = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/performance/resources/timeseries`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch resource timeseries");
  }
};

export default {
  GetGeneralMetrics,
  GetGeneralTimeseries,
  GetApiErrorRate,
  GetResourceMetrics,
  GetResourceTimeseries,
};
