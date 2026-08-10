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

export const showApiError = (err, messageKey = "DEFAULT") => {
  if (import.meta.env.DEV) console.error(messageKey, err);
  // Prefer the message the endpoint actually returned; only fall back to our
  // own copy when the backend gave nothing useful (generic axios/network text).
  const raw =
    err?.response?.data?.message ||
    err?.response?.data?.error ||
    err?.message ||
    "";
  const isGeneric =
    !raw ||
    /^Request failed with status code/i.test(raw) ||
    /^Network Error$/i.test(raw) ||
    /^timeout of /i.test(raw);
  const message = isGeneric
    ? ERROR_MESSAGES[messageKey] || ERROR_MESSAGES.DEFAULT
    : raw;
  showToast(message, "error");
};
