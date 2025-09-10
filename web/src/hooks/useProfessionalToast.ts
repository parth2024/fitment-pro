import toast from "react-hot-toast";

export const useProfessionalToast = () => {
  const showSuccess = (message: string, duration?: number) => {
    return toast.success(message, {
      duration: duration || 4000,
      style: {
        background: "transparent",
        boxShadow: "none",
        padding: 0,
        margin: 0,
      },
    });
  };

  const showError = (message: string, duration?: number) => {
    return toast.error(message, {
      duration: duration || 5000,
      style: {
        background: "transparent",
        boxShadow: "none",
        padding: 0,
        margin: 0,
      },
    });
  };

  const showInfo = (message: string, duration?: number) => {
    return toast(message, {
      duration: duration || 4000,
      style: {
        background: "transparent",
        boxShadow: "none",
        padding: 0,
        margin: 0,
      },
      icon: "ℹ️",
    });
  };

  const showWarning = (message: string, duration?: number) => {
    return toast(message, {
      duration: duration || 4000,
      style: {
        background: "transparent",
        boxShadow: "none",
        padding: 0,
        margin: 0,
      },
      icon: "⚠️",
    });
  };

  const showLoading = (message: string) => {
    return toast.loading(message, {
      style: {
        background: "transparent",
        boxShadow: "none",
        padding: 0,
        margin: 0,
      },
    });
  };

  const dismiss = (toastId?: string) => {
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
