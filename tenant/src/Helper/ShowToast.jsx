import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import ERROR_MESSAGES from "./errorMessages";

const baseOptions = {
  position: "top-center",
  style: {
    background: "#004aba",
    color: "#ffffff",
  },
  progressStyle: {
    background: "#ffffff",
  },
};

export const showToast = (message, type) => {
  // Handle both calling conventions
  let actualMessage = '';
  let actualType = 'default';

  if (typeof message === 'object' && message !== null) {
    actualMessage = message.message || '';
    actualType = message.type || 'default';
  } else {
    actualMessage = message || '';
    actualType = type || 'default';
  }

  // Prevent duplicate toasts — use message as toastId
  const toastId = `${actualType}-${actualMessage}`;

  if (toast.isActive(toastId)) return;

  const options = { ...baseOptions, toastId };

  switch (actualType) {
    case "success":
      toast.success(actualMessage, options);
      break;
    case "error":
      toast.error(actualMessage, options);
      break;
    default:
      toast(actualMessage, options);
  }
};

/**
 * The message to show for a failed request: what the backend said, when it
 * said something. Falls back to our own `fallback` only when the error carries
 * nothing useful (no body, or axios's generic "Request failed with status
 * code 500" / "Network Error" / "timeout of ..." text).
 */
export const apiErrorMessage = (err, fallback) => {
  const data = err?.response?.data;
  // A bug in the page (a TypeError and the like) is not something the backend
  // said, and its text means nothing to the user.
  if (
    !err?.response &&
    ["TypeError", "ReferenceError", "RangeError", "SyntaxError"].includes(err?.name)
  ) {
    return fallback;
  }
  const fromBody =
    (typeof data === "string" && !/^\s*</.test(data) ? data : "") ||
    data?.message ||
    data?.error ||
    (Array.isArray(data?.errors)
      ? data.errors.map((e) => e?.message || e?.msg || e).filter(Boolean).join(", ")
      : "");
  const raw = String(fromBody || err?.message || "").trim();
  const isGeneric =
    !raw ||
    /^Request failed with status code/i.test(raw) ||
    /^Network Error$/i.test(raw) ||
    /^timeout of /i.test(raw);
  return isGeneric ? fallback : raw;
};

export const showApiError = (err, messageKey = "DEFAULT") => {
  if (import.meta.env.DEV) console.error(messageKey, err);
  // Prefer the message the endpoint actually returned; only fall back to our
  // own copy when the backend gave nothing useful (generic axios/network text).
  showToast(
    apiErrorMessage(err, ERROR_MESSAGES[messageKey] || ERROR_MESSAGES.DEFAULT),
    "error"
  );
};
