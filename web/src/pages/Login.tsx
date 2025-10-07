import React, { useState } from "react";
import {
  Container,
  Paper,
  TextInput,
  PasswordInput,
  Button,
  Title,
  Text,
  Stack,
  Group,
  Alert,
  Card,
  Badge,
} from "@mantine/core";
import { IconShield, IconUsers, IconAlertCircle } from "@tabler/icons-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";

const Login: React.FC = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const success = await login(username, password);
      if (success) {
        navigate("/");
      } else {
        setError("Invalid username or password");
      }
    } catch (err) {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const demoCredentials = [
    {
      role: "Admin",
      username: "admin",
      password: "admin123",
      description: "Full access including VCDB data",
      icon: IconShield,
      color: "blue",
    },
    {
      role: "MFT User",
      username: "mft_user",
      password: "mft123",
      description: "Limited access (no VCDB data)",
      icon: IconUsers,
      color: "green",
    },
  ];

  return (
    <Container size="sm" style={{ paddingTop: "60px" }}>
      <Paper shadow="xl" radius="md" p="xl">
        <Stack gap="lg">
          <div style={{ textAlign: "center" }}>
            <Title order={2} mb="xs">
              Welcome to Fitmentpro.ai
            </Title>
            <Text c="dimmed">Sign in to access the Mass Fitment Tool</Text>
          </div>

          {error && (
            <Alert icon={<IconAlertCircle size={16} />} color="red">
              {error}
            </Alert>
          )}

          <form onSubmit={handleSubmit}>
            <Stack gap="md">
              <TextInput
                label="Username"
                placeholder="Enter your username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
              <PasswordInput
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
              />
              <Button
                type="submit"
                fullWidth
                size="md"
                loading={loading}
                disabled={!username || !password}
              >
                {loading ? "Signing in..." : "Sign In"}
              </Button>
            </Stack>
          </form>

          <div>
            <Text size="sm" fw={500} mb="md">
              Demo Credentials:
            </Text>
            <Stack gap="sm">
              {demoCredentials.map((cred, index) => {
                const IconComponent = cred.icon;
                return (
                  <Card key={index} withBorder p="sm">
                    <Group justify="space-between" align="flex-start">
                      <Group gap="sm">
                        <IconComponent
                          size={20}
                          color={`var(--mantine-color-${cred.color}-6)`}
                        />
                        <div>
                          <Group gap="xs" align="center">
                            <Text fw={500} size="sm">
                              {cred.role}
                            </Text>
                            <Badge size="xs" color={cred.color} variant="light">
                              {cred.username}
                            </Badge>
                          </Group>
                          <Text size="xs" c="dimmed">
                            {cred.description}
                          </Text>
                        </div>
                      </Group>
                      <Button
                        size="xs"
                        variant="subtle"
                        onClick={() => {
                          setUsername(cred.username);
                          setPassword(cred.password);
                        }}
                      >
                        Use
                      </Button>
                    </Group>
                  </Card>
                );
              })}
            </Stack>
          </div>
        </Stack>
      </Paper>
    </Container>
  );
};

export default Login;
