import React from "react";
import toast, { Toaster } from "react-hot-toast";
import { ProfessionalToast } from "./ProfessionalToast";

export const ToastContainer: React.FC = () => {
  return (
    <Toaster
      position="top-right"
      reverseOrder={false}
      gutter={12}
      containerStyle={{
        top: 20,
        right: 20,
      }}
      toastOptions={{
        duration: 4000,
        style: {
          background: "transparent",
          boxShadow: "none",
          padding: 0,
          margin: 0,
        },
        success: {
          duration: 4000,
          iconTheme: {
            primary: "#10b981",
            secondary: "#ffffff",
          },
        },
        error: {
          duration: 5000,
          iconTheme: {
            primary: "#ef4444",
            secondary: "#ffffff",
          },
        },
        custom: {
          duration: 4000,
        },
      }}
    >
      {(t) => (
        <ProfessionalToast
          id={t.id}
          message={t.message as string}
          type={(t.type as "success" | "error" | "info" | "warning") || "info"}
          duration={t.duration}
          onClose={() => toast.dismiss(t.id)}
        />
      )}
    </Toaster>
  );
};
