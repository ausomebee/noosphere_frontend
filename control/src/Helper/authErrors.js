/**
 * The auth API calls re-throw a plain Error, which drops `response`, so a page
 * could not tell "the server said no" from "the server never answered" and
 * showed a misleading fallback for a timeout or a dropped connection.
 */

export const SERVER_UNREACHABLE_MESSAGE =
  "Can't reach the server. Check your connection and try again.";

// No response at all — a timeout or a dropped connection — rather than the
// server saying no.
export const isUnreachable = (error) =>
  !error?.response &&
  (!!error?.request ||
    ["ECONNABORTED", "ETIMEDOUT", "ERR_NETWORK"].includes(error?.code));

/** The Error an auth call re-throws: flagged when the server was unreachable. */
export const toAuthError = (error, message) => {
  if (!isUnreachable(error)) {
    // Keep the backend's response on the error, so a page can still read
    // exactly what it said.
    const authError = new Error(message);
    authError.response = error?.response;
    return authError;
  }
  const unreachable = new Error(SERVER_UNREACHABLE_MESSAGE);
  unreachable.isNetworkError = true;
  return unreachable;
};

// What the backend said, wherever it put it in its response, or null. Skips
// axios's generic texts, which mean nothing to the user.
const GENERIC = /^(Request failed with status code|Network Error$|timeout of )/i;
export const backendMessage = (error) => {
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

/** The message a page should show for a failed auth call. */
export const authErrorMessage = (error, fallback) =>
  error?.isNetworkError
    ? SERVER_UNREACHABLE_MESSAGE
    : backendMessage(error) || fallback;
