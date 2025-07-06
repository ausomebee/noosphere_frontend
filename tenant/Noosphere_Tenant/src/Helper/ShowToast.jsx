import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const showToast = (message, type) => {
  const successToastOptions = {
    position: "top-center",
    style: {
      background: "#004aba", // Updated to your primary color
      color: "#ffffff",
    },
    progressStyle: {
      background: "#ffffff",
    },
    iconTheme: {
      primary: "#28a745", // Success icon color (green)
      secondary: "#004aba", // Updated to your primary color
    },
  };

  const errorToastOptions = {
    position: "top-center",
    style: {
      background: "#004aba", // Updated to your primary color
      color: "#ffffff",
    },
    progressStyle: {
      background: "#ffffff",
    },
    iconTheme: {
      primary: "#dc3545", // Error icon color (red)
      secondary: "#004aba", // Updated to your primary color
    },
  };

  switch (type) {
    case "success":
      toast.success(message, successToastOptions);
      break;
    case "error":
      toast.error(message, errorToastOptions);
      break;
    default:
      toast(message, {
        position: "top-center",
        style: {
          background: "#004aba", // Updated to your primary color
          color: "#ffffff",
        },
        progressStyle: {
          background: "#ffffff",
        },
        iconTheme: {
          primary: "#ffffff", // Default icon color
          secondary: "#004aba", // Updated to your primary color
        },
      });
  }
};