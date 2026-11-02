import AxiosInterceptor from "../Helper/AxiosInterceptor";
import { requestIdHeader } from "../Helper/requestResilience";

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



// These two endpoints are unauthenticated — the payment-link token in the body
// is the credential — so they use plain fetch like the rest of the public
// payment flow. A missing/undeployed route answers with an HTML error page, so
// parse defensively rather than letting response.json() throw a SyntaxError
// that would surface to the payer as "Unexpected token <".
const readJson = async (response) => {
  try {
    return await response.json();
  } catch {
    return null;
  }
};

// Step 1 of the card flow. The server reads the amount off the invoice behind
// the token and creates the PaymentIntent with its secret key; the browser only
// ever receives the client_secret, never sets the price.
const CreateStripePaymentIntent = async ({ token }) => {
  try {
    const response = await fetch(`${PLAIN_API_URL}/billing/stripe/create-payment-intent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...requestIdHeader() },
      body: JSON.stringify({ token }),
    });
    const data = await readJson(response);
    if (!response.ok) {
      throw new Error(data?.message || "We could not start this payment. Please try again or contact support.");
    }
    if (!data?.clientSecret) {
      throw new Error("Payment could not be started (no client secret returned).");
    }
    return data;
  } catch (error) {
    throw new Error(error.message || "We could not start this payment.");
  }
};

// Step 3. The server re-reads the PaymentIntent from Stripe and does the
// recording/activation itself — we are telling it which intent to check, not
// asserting that the payment succeeded.
const ConfirmPayment = async ({ token, paymentIntentId }) => {
  try {
    const response = await fetch(`${PLAIN_API_URL}/billing/stripe/confirm-payment`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...requestIdHeader() },
      body: JSON.stringify({ token, paymentIntentId }),
    });
    const data = await readJson(response);
    if (!response.ok) throw new Error(data?.message || "Failed to confirm payment");
    return data;
  } catch (error) {
    throw new Error(error.message || "Failed to confirm payment");
  }
};

const RecordPayment = async ({ tenantId, invoiceId, planId, billingCycle, endDate, transactionId, transactionRef, amount, cardType, lastFourDigits, gatewayToken, holderName, paymentStatus, gateway }) => {
  try {
    const response = await fetch(`${PLAIN_API_URL}/billing/pay-payment-link`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...requestIdHeader() },
      body: JSON.stringify({ tenantId, invoiceId, planId, billingCycle, endDate, transactionId, transactionRef, amount, cardType, lastFourDigits, gatewayToken, holderName, paymentStatus, gateway }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data?.message || "Failed to record payment");
    return data;
  } catch (error) {
    throw new Error(error.message || "Failed to record payment");
  }
};

// fetch has no timeout of its own: a hung server left the payer on the
// "Validating payment link…" spinner forever.
const PAYMENT_TOKEN_TIMEOUT_MS = 20000;
const GATEWAY_STATUSES = new Set([502, 503, 504]);
const PAYMENT_LINK_UNCHECKED_MESSAGE =
  "We couldn't check this payment link right now.";

// The server never answered (timeout or dropped connection). Flagged so the
// page doesn't tell a payer that a good link is invalid.
const paymentLinkUnchecked = () => {
  const error = new Error(PAYMENT_LINK_UNCHECKED_MESSAGE);
  error.isNetworkError = true;
  return error;
};

const ValidatePaymentToken = async ({ token }) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PAYMENT_TOKEN_TIMEOUT_MS);
  let response;
  try {
    // fetch only rejects when no response came back at all.
    response = await fetch(`${PLAIN_API_URL}/invoice/validate-payment-token/${token}`, {
      headers: requestIdHeader(),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timer);
    throw paymentLinkUnchecked();
  }
  try {
    // A gateway error (load balancer / nginx) says nothing about the link.
    if (GATEWAY_STATUSES.has(response.status)) throw paymentLinkUnchecked();
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // A failed request whose body isn't our JSON error (e.g. an nginx HTML
      // page) is an outage, not an invalid link.
      if (!response.ok && parseError?.name !== "AbortError") throw paymentLinkUnchecked();
      throw parseError;
    }
    if (!response.ok) {
      if (!data || typeof data !== "object") throw paymentLinkUnchecked();
      throw new Error(data.message || "Invalid or expired payment token");
    }
    return data;
  } catch (error) {
    if (error?.isNetworkError) throw error;
    // The timeout can also fire while the body is still arriving.
    if (error?.name === "AbortError") throw paymentLinkUnchecked();
    throw new Error(error.message || "Failed to validate payment token");
  } finally {
    clearTimeout(timer);
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
      `${PLAIN_API_URL}/invoice/control?page=${page}&pageSize=${pageSize}`
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
  CreateStripePaymentIntent,
  ConfirmPayment,
  GeneratePaymentLink,
  RegeneratePaymentLink,
  GetInvoiceHistory,
  ValidatePaymentToken,
  GetReportPayments,
  GetReportInvoices,
  GetDeactivationLogs,
  GetActivationLogs,
};
