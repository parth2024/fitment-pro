import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { Toaster } from "react-hot-toast";
import { theme } from "./theme";
import { AuthProvider } from "./contexts/AuthContext";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster
            position="top-right"
            reverseOrder={false}
            gutter={8}
            containerStyle={{
              top: 20,
              right: 20,
            }}
            toastOptions={{
              style: {
                background: "#ffffff",
                color: "#1f2937",
                border: "1px solid #e5e7eb",
                borderRadius: "12px",
                boxShadow:
                  "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
              },
              duration: 4000,
              // Enable close button
              // Prevent duplicate toasts
              id: undefined, // Let individual toasts handle their own IDs
              // Disable accessibility features that create extra divs
              ariaProps: {
                role: "alert",
                "aria-live": "assertive",
              },
            }}
          />
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
