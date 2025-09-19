import { toast } from "react-toastify";

export const useProfessionalToast = () => {
  const showSuccess = (message: string, duration?: number) => {
    return toast.success(message, {
      position: "top-right",
      autoClose: duration || 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        backgroundColor: "#12B76A",
        color: "#FFFFFF",
        fontSize: "16px",
        fontWeight: "500",
        borderRadius: "12px",
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    });
  };

  const showError = (message: string, duration?: number) => {
    return toast.error(message, {
      position: "top-right",
      autoClose: duration || 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        backgroundColor: "#F04438",
        color: "#FFFFFF",
        fontSize: "16px",
        fontWeight: "500",
        borderRadius: "12px",
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    });
  };

  const showInfo = (message: string, duration?: number) => {
    return toast.info(message, {
      position: "top-right",
      autoClose: duration || 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        backgroundColor: "#3B82F6",
        color: "#FFFFFF",
        fontSize: "16px",
        fontWeight: "500",
        borderRadius: "12px",
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    });
  };

  const showWarning = (message: string, duration?: number) => {
    return toast.warning(message, {
      position: "top-right",
      autoClose: duration || 4000,
      hideProgressBar: false,
      closeOnClick: true,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        backgroundColor: "#F79009",
        color: "#FFFFFF",
        fontSize: "16px",
        fontWeight: "500",
        borderRadius: "12px",
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    });
  };

  const showLoading = (message: string) => {
    return toast.loading(message, {
      position: "top-right",
      autoClose: false,
      hideProgressBar: false,
      closeOnClick: false,
      pauseOnHover: true,
      draggable: true,
      progress: undefined,
      theme: "light",
      style: {
        backgroundColor: "#6B7280",
        color: "#FFFFFF",
        fontSize: "16px",
        fontWeight: "500",
        borderRadius: "12px",
        boxShadow:
          "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
    });
  };

  const dismiss = (toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  };

  return {
    showSuccess,
    showError,
    showInfo,
    showWarning,
    showLoading,
    dismiss,
  };
};
