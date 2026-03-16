import { toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export const showToast = (message, type) => {
  toast.dismiss(); // prevent stacking duplicate toasts
  const successToastOptions = {
    position: "top-center",
    style: {
      background: "#000000",
      color: "#ffffff",
    },
    progressStyle: {
      background: "#ffffff",
    },
    iconTheme: {
      primary: "#28a745",
      secondary: "#000000",
    },
  };

  const errorToastOptions = {
    position: "top-center",
    style: {
      background: "#000000",
      color: "#ffffff",
    },
    progressStyle: {
      background: "#ffffff",
    },
    iconTheme: {
      primary: "#dc3545",
      secondary: "#000000",
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
          background: "#000000",
          color: "#ffffff",
        },
        progressStyle: {
          background: "#ffffff",
        },
        iconTheme: {
          primary: "#ffffff",
          secondary: "#000000",
        },
      });
  }
};