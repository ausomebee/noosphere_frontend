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

const GetPaymentById = async ({ id, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/billing/payment/${id}`);
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch payment by ID"
    );
  }
};

const GetPaymentByAllAndStatus = async({
 status,
  accessToken,
  refreshToken,
}) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/billing/payment/status/${status}`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch payments by status"
    );
  }
}

const GetCountForInvoice = async({
   accessToken,
  refreshToken, 
}) => {
 const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/invoice/total/status`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch invoice counts by status"
    );
  }
}
const GetCountForPayment = async({
   accessToken,
  refreshToken, 
}) => {
 const authFetch = AxiosInterceptor(accessToken, refreshToken);

  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/billing/countpayment`
    );
    return response.data;
  } catch (error) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch payment counts by status"
    );
  }
}



export default {
  GetBillingTotalMetric,
  GetBillingDueMetric,
  GetInvoiceById,
  GetInvoiceByAllAndStatus,
  GetPaymentById,
  GetPaymentByAllAndStatus,
  GetCountForInvoice,
  GetCountForPayment
};
