// How the pre-session auth calls (src/api/authApis.js) report a request that
// never got an answer. Kept apart from authApis so pages can import these even
// where a test replaces the API module with a mock.

export const NETWORK_ERROR_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

// No response at all — a timeout or a dropped connection — as opposed to the
// server answering with an error.
const NETWORK_CODES = new Set(["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"]);
export const isNetworkFailure = (error) =>
  !!error &&
  !error.response &&
  (error.isNetworkError ||
    NETWORK_CODES.has(error.code) ||
    !!error.request ||
    error.message === "Network Error");

// What the backend said, wherever it put it in its response, or null. Skips
// axios's generic texts, which mean nothing to the user.
const GENERIC = /^(Request failed with status code|Network Error$|timeout of )/i;
const backendMessage = (error) => {
  const data = error?.response?.data;
  const fromBody =
    (typeof data === "string" && !/^\s*</.test(data) ? data : "") ||
    data?.message ||
    data?.data?.message ||
    data?.error ||
    "";
  // Only the response counts: an error without one (a dropped socket, a
  // check in the page) isn't something the backend said.
  const text = String(fromBody).trim();
  return text && !GENERIC.test(text) ? text : null;
};

// For the auth pages' catch blocks: the server's message when there is one,
// the network message when the server couldn't be reached, else the fallback.
export const authErrorMessage = (error, fallback) =>
  error?.isNetworkError
    ? error.message || NETWORK_ERROR_MESSAGE
    : backendMessage(error) || fallback;
