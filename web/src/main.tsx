import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@mantine/core/styles.css";
import { MantineProvider } from "@mantine/core";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { theme } from "./theme";
import { AuthProvider } from "./contexts/AuthContext";
import { EntityProvider } from "./contexts/EntityContext";
import { BrowserRouter } from "react-router-dom";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <MantineProvider theme={theme}>
      <BrowserRouter>
        <AuthProvider>
          <EntityProvider>
            <App />
            <ToastContainer
              position="top-right"
              autoClose={4000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
              theme="light"
              style={{
                top: "20px",
                right: "20px",
              }}
            />
            <style>{`
            .Toastify__toast {
              display: flex !important;
              align-items: center !important;
              padding-top: 15px;
              padding-right: 35px;
             
            }
            .Toastify__toast-icon{
                display: none !important;
              }
            .Toastify__toast-body {
              flex: 1 !important;
              margin-right: 12px !important;
              margin-left: 0 !important;
            }
            .Toastify__close-button {
              color: #FFFFFF !important;
              opacity: 0.9 !important;
              font-size: 16px !important;
              font-weight: 700 !important;
              width: 28px !important;
              height: 28px !important;
              border-radius: 6px !important;
              background: rgba(255, 255, 255, 0.2) !important;
              border: none !important;
              transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1) !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
              backdrop-filter: blur(10px) !important;
              -webkit-backdrop-filter: blur(10px) !important;
              margin: 0 !important;
              order: -1 !important;
              flex-shrink: 0 !important;
              margin-left:3px !important;
            }
            .Toastify__close-button:hover {
              opacity: 1 !important;
              background: rgba(255, 255, 255, 0.3) !important;
              transform: scale(1.05) translateY(-1px) !important;
              box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
            }
            .Toastify__close-button:active {
              transform: scale(0.95) translateY(0) !important;
            }
          `}</style>
          </EntityProvider>
        </AuthProvider>
      </BrowserRouter>
    </MantineProvider>
  </React.StrictMode>
);
