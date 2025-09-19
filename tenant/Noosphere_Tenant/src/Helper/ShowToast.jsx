import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const showToast = (message, type) => {
  // Handle both calling conventions
  let actualMessage = '';
  let actualType = 'default';
  
  if (typeof message === 'object' && message !== null) {
    // Called with object: showToast({message: "text", type: "success"})
    actualMessage = message.message || '';
    actualType = message.type || 'default';
  } else {
    // Called with parameters: showToast("text", "success")
    actualMessage = message || '';
    actualType = type || 'default';
  }

  const successToastOptions = {
    position: "top-center",
    style: {
      background: "#004aba",
      color: "#ffffff",
    },
    progressStyle: {
      background: "#ffffff",
    },
    iconTheme: {
      primary: "#28a745",
      secondary: "#004aba",
    },
  };

  const errorToastOptions = {
    position: "top-center",
    style: {
      background: "#004aba",
      color: "#ffffff",
    },
    progressStyle: {
      background: "#ffffff",
    },
    iconTheme: {
      primary: "#dc3545",
      secondary: "#004aba",
    },
  };

  const defaultToastOptions = {
    position: "top-center",
    style: {
      background: "#004aba",
      color: "#ffffff",
    },
    progressStyle: {
      background: "#ffffff",
    },
    iconTheme: {
      primary: "#ffffff",
      secondary: "#004aba",
    },
  };

  switch (actualType) {
    case "success":
      toast.success(actualMessage, successToastOptions);
      break;
    case "error":
      toast.error(actualMessage, errorToastOptions);
      break;
    default:
      toast(actualMessage, defaultToastOptions);
  }
};