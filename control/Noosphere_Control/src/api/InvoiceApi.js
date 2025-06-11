import AxiosInterceptor from "../Helper/AxiosInterceptor";

const PLAIN_API_URL = `${import.meta.env.VITE_API_URL}`;

const GetBillingTotalMetric = async ({from, to, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/invoice/billed/total/${from}/${to}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch billing total metric"
    );
  }
};

const GetBillingDueMetric = async ({from, to, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/invoice/billed/due/${from}/${to}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch billing due metric"
    );
  }
};

const GetInvoiceById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/invoice/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch invoice by ID"
    );
  }
};

const GetInvoiceByAllAndStatus = async ({
  status,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/invoice/status/${status}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch invoices by status"
    );
  }
};



export default {
  GetBillingTotalMetric,
  GetBillingDueMetric,
  GetInvoiceById,
  GetInvoiceByAllAndStatus,
};
