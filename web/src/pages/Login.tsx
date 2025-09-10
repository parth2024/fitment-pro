import React, { useState } from "react";
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Group,
  Box,
  Stack,
  ThemeIcon,
  Divider,
  Alert,
} from "@mantine/core";
import {
  IconCar,
  IconMail,
  IconLock,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useAuth } from "../contexts/AuthContext";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

const Login: React.FC = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const { showSuccess } = useProfessionalToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const success = await login(email, password);
      if (success) {
        showSuccess("Login successful! Welcome back.");
      } else {
        setError("Invalid email or password. Please try again.");
      }
    } catch (err) {
      setError("An error occurred during login. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <Container size="sm" w="100%">
        <Paper
          shadow="xl"
          radius="lg"
          p="xl"
          style={{
            background: "rgba(255, 255, 255, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(255, 255, 255, 0.2)",
          }}
        >
          {/* Header */}
          <Stack align="center" gap="lg" mb="xl">
            <Group gap="sm" align="center">
              <ThemeIcon
                size={48}
                radius="lg"
                variant="gradient"
                gradient={{ from: "blue", to: "purple", deg: 135 }}
              >
                <IconCar size={24} />
              </ThemeIcon>
              <div>
                <Title order={2} style={{ color: "#2d3748", fontWeight: 700 }}>
                  Fitmentpro.ai
                </Title>
                <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                  Professional Fitment Management
                </Text>
              </div>
            </Group>

            <div style={{ textAlign: "center" }}>
              <Title order={3} style={{ color: "#2d3748", fontWeight: 600 }}>
                Welcome Back
              </Title>
              <Text c="dimmed" size="sm">
                Sign in to your account to continue
              </Text>
            </div>
          </Stack>

          {/* Login Form */}
          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              {error && (
                <Alert
                  icon={<IconAlertCircle size={16} />}
                  title="Login Failed"
                  color="red"
                  variant="light"
                  radius="md"
                >
                  {error}
                </Alert>
              )}

              <TextInput
                label="Email Address"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                leftSection={<IconMail size={16} />}
                required
                size="md"
                radius="md"
                styles={{
                  input: {
                    border: "1px solid #e2e8f0",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                  label: {
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  },
                }}
              />

              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                leftSection={<IconLock size={16} />}
                required
                size="md"
                radius="md"
                styles={{
                  input: {
                    border: "1px solid #e2e8f0",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                  label: {
                    fontWeight: 600,
                    color: "#374151",
                    marginBottom: "8px",
                  },
                }}
              />

              <Button
                type="submit"
                loading={loading}
                size="md"
                radius="md"
                fullWidth
                variant="gradient"
                gradient={{ from: "blue", to: "purple", deg: 135 }}
                style={{
                  fontWeight: 600,
                  fontSize: "16px",
                  height: "48px",
                  marginTop: "8px",
                }}
              >
                {loading ? "Signing In..." : "Sign In"}
              </Button>
            </Stack>
          </form>

          <Divider my="xl" />

          {/* Demo Credentials */}
          <Box
            style={{
              background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
              borderRadius: "12px",
              padding: "16px",
              border: "1px solid #e2e8f0",
            }}
          >
            <Text size="sm" fw={600} c="dimmed" mb="xs">
              Demo Credentials
            </Text>
            <Text size="xs" c="dimmed" style={{ lineHeight: 1.5 }}>
              Use any email and password combination to sign in.
              <br />
              Example: admin@fitmentpro.ai / password123
            </Text>
          </Box>

          {/* Footer */}
          <Text size="xs" c="dimmed" ta="center" mt="xl">
            © 2024 Fitmentpro.ai. All rights reserved.
          </Text>
        </Paper>
      </Container>
    </Box>
  );
};

export default Login;
