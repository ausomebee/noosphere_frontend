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
