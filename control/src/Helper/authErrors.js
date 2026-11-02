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
  if (!isUnreachable(error)) return new Error(message);
  const unreachable = new Error(SERVER_UNREACHABLE_MESSAGE);
  unreachable.isNetworkError = true;
  return unreachable;
};

/** The message a page should show for a failed auth call. */
export const authErrorMessage = (error, fallback) =>
  error?.isNetworkError
    ? SERVER_UNREACHABLE_MESSAGE
    : error?.response?.data?.message || fallback;
