import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

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

  // Dismiss all existing toasts to prevent stacking
  toast.dismiss();

  // Use message as toastId to prevent exact duplicates
  const toastId = `${actualType}-${actualMessage}`;

  const options = {
    ...baseOptions,
    toastId,
  };

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