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



const RecordPayment = async ({ tenantId, invoiceId, planId, billingCycle, endDate, transactionId, transactionRef, amount, cardType, lastFourDigits, gatewayToken, holderName, paymentStatus, gateway }) => {
  try {
    const response = await fetch(`${PLAIN_API_URL}/billing/pay-payment-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ tenantId, invoiceId, planId, billingCycle, endDate, transactionId, transactionRef, amount, cardType, lastFourDigits, gatewayToken, holderName, paymentStatus, gateway }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Failed to record payment");
    return data;
  } catch (error) {
    throw new Error(error.message || "Failed to record payment");
  }
};

const ValidatePaymentToken = async ({ token }) => {
  try {
    const response = await fetch(`${PLAIN_API_URL}/invoice/validate-payment-token/${token}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Invalid or expired payment token");
    return data;
  } catch (error) {
    throw new Error(error.message || "Failed to validate payment token");
  }
};

const GeneratePaymentLink = async ({ tenantId, planId, billingFrequency, quantity, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.post(`${PLAIN_API_URL}/invoice/payment-link`, {
      tenantId,
      planId,
      billingFrequency,
      quantity,
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to generate payment link");
  }
};

const RegeneratePaymentLink = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.patch(`${PLAIN_API_URL}/invoice/regenerate/${tenantId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to regenerate payment link");
  }
};

const GetInvoiceHistory = async ({ tenantId, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/invoice/history/${tenantId}`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch invoice history");
  }
};

const GetReportPayments = async ({ page = 1, pageSize = 100, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/billing/allpayment/?page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch payment activity report");
  }
};

const GetReportInvoices = async ({ page = 1, pageSize = 100, accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(
      `${PLAIN_API_URL}/invoice/?page=${page}&pageSize=${pageSize}`
    );
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch invoice activity report");
  }
};

const GetDeactivationLogs = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant/deactivation-logs`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch deactivation logs");
  }
};

const GetActivationLogs = async ({ accessToken, refreshToken }) => {
  const authFetch = AxiosInterceptor(accessToken, refreshToken);
  try {
    const response = await authFetch.get(`${PLAIN_API_URL}/tenant/activation-logs`);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Failed to fetch activation logs");
  }
};

export default {
  GetBillingTotalMetric,
  GetBillingDueMetric,
  GetInvoiceById,
  GetInvoiceByAllAndStatus,
  GetPaymentById,
  GetPaymentByAllAndStatus,
  GetCountForInvoice,
  GetCountForPayment,
  RecordPayment,
  GeneratePaymentLink,
  RegeneratePaymentLink,
  GetInvoiceHistory,
  ValidatePaymentToken,
  GetReportPayments,
  GetReportInvoices,
  GetDeactivationLogs,
  GetActivationLogs,
};
