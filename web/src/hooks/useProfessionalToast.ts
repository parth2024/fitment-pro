import toast from "react-hot-toast";

// Helper function to create unique toast IDs
const createToastId = (type: string, message: string): string => {
  return `${type}-${message
    .replace(/\s+/g, "-")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")}`;
};

export const useProfessionalToast = () => {
  const showSuccess = (message: string, duration?: number) => {
    const toastId = createToastId("success", message);

    // Dismiss any existing toast with the same ID
    toast.dismiss(toastId);

    return toast.success(message, {
      id: toastId,
      duration: duration || 4000,
      style: {
        boxShadow: "none",
        padding: 20,
        fontSize: 16,
        backgroundColor: "#12B76A",
        color: "#FFFFFF",
        margin: 0,
      },
    });
  };

  const showError = (message: string, duration?: number) => {
    const toastId = createToastId("error", message);

    // Dismiss any existing toast with the same ID
    toast.dismiss(toastId);

    return toast.error(message, {
      id: toastId,
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
    const toastId = createToastId("info", message);

    // Dismiss any existing toast with the same ID
    toast.dismiss(toastId);

    return toast(message, {
      id: toastId,
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
    const toastId = createToastId("warning", message);

    // Dismiss any existing toast with the same ID
    toast.dismiss(toastId);

    return toast(message, {
      id: toastId,
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
