import React from "react";
import { useAuth } from "../contexts/AuthContext";
import Login from "../pages/Login";
import { Box, Loader, Center } from "@mantine/core";

interface ProtectedRouteProps {
  children: React.ReactNode;
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <Box
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Center>
          <Loader size="lg" color="blue" />
        </Center>
      </Box>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <>{children}</>;
};

export default ProtectedRoute;
