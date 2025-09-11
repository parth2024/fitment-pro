import { useState } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Alert,
  Select,
  NumberInput,
  Grid,
  Code,
  ActionIcon,
  Modal,
  List,
  Center,
} from "@mantine/core";
import {
  IconSettings,
  IconDatabase,
  IconDownload,
  IconUpload,
  IconRefresh,
  IconCheck,
  IconAlertTriangle,
  IconFolder,
  IconFile,
} from "@tabler/icons-react";

export default function Admin() {
  const [exportFormat, setExportFormat] = useState("both");
  const [exportDays, setExportDays] = useState(30);
  const [resetModalOpen, setResetModalOpen] = useState(false);

  // Mock system data
  const systemInfo = {
    appVersion: "2.0.0",
    vcdbVersion: "2024.1",
    buildDate: "2024-09-08T12:00:00Z",
    environment: "development",
    database: "Connected",
    storage: "./storage",
  };

  const handleExportFitments = async () => {
    console.log(
      `Exporting fitments: format=${exportFormat}, days=${exportDays}`
    );
    alert("Export started! Files will be available in storage/exports/");
  };

  const handleResetDemo = () => {
    console.log("Resetting demo data...");
    setResetModalOpen(false);
    alert("Demo data reset successfully!");
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <Stack gap="lg">
        {/* Header */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={2}>System Administration</Title>
              <Text c="dimmed">
                Manage data imports, exports, and system configuration
              </Text>
            </div>
            <IconSettings size={28} color="var(--mantine-color-blue-6)" />
          </Group>

          <Alert icon={<IconAlertTriangle size={16} />} color="yellow">
            <Text fw={500}>Development Environment</Text>
            <Text size="sm">
              This admin panel controls the development database. Production
              operations should be performed through the production environment.
            </Text>
          </Alert>
        </Card>

        {/* System Information */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            System Information
          </Title>

          <Grid>
            <Grid.Col span={6}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Application Version
                  </Text>
                  <Badge variant="light" color="blue">
                    {systemInfo.appVersion}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    VCDB Version
                  </Text>
                  <Badge variant="light" color="green">
                    {systemInfo.vcdbVersion}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Build Date
                  </Text>
                  <Text size="sm">
                    {new Date(systemInfo.buildDate).toLocaleString()}
                  </Text>
                </Group>
              </Stack>
            </Grid.Col>
            <Grid.Col span={6}>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Environment
                  </Text>
                  <Badge variant="light" color="orange">
                    {systemInfo.environment}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Database Status
                  </Text>
                  <Badge variant="light" color="green">
                    {systemInfo.database}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Storage Directory
                  </Text>
                  <Code>{systemInfo.storage}</Code>
                </Group>
              </Stack>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Stunning Upload Required Files Section */}
        <div
          style={{
            background:
              "linear-gradient(145deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
            borderRadius: "32px",
            padding: "4px",
            marginBottom: "32px",
            position: "relative",
            overflow: "hidden",
          }}
        >
          {/* Animated Background Circles */}
          <div
            style={{
              position: "absolute",
              top: "-20%",
              left: "-10%",
              width: "300px",
              height: "300px",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.1) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "float 6s ease-in-out infinite",
              pointerEvents: "none",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: "-20%",
              right: "-10%",
              width: "250px",
              height: "250px",
              background:
                "radial-gradient(circle, rgba(255,255,255,0.08) 0%, transparent 70%)",
              borderRadius: "50%",
              animation: "float 8s ease-in-out infinite reverse",
              pointerEvents: "none",
            }}
          />

          <Card
            shadow="2xl"
            padding="40px"
            radius="28px"
            style={{
              background:
                "linear-gradient(135deg, rgba(255,255,255,0.95) 0%, rgba(255,255,255,0.85) 100%)",
              backdropFilter: "blur(20px)",
              border: "1px solid rgba(255,255,255,0.2)",
              position: "relative",
              overflow: "hidden",
            }}
          >
            {/* Floating Particles */}
            <div
              style={{
                position: "absolute",
                top: "10%",
                left: "15%",
                width: "6px",
                height: "6px",
                background: "#667eea",
                borderRadius: "50%",
                animation: "pulse 3s ease-in-out infinite",
                opacity: 0.6,
              }}
            />
            <div
              style={{
                position: "absolute",
                top: "20%",
                right: "20%",
                width: "4px",
                height: "4px",
                background: "#f093fb",
                borderRadius: "50%",
                animation: "pulse 2s ease-in-out infinite",
                opacity: 0.5,
              }}
            />
            <div
              style={{
                position: "absolute",
                bottom: "15%",
                left: "25%",
                width: "5px",
                height: "5px",
                background: "#4facfe",
                borderRadius: "50%",
                animation: "pulse 4s ease-in-out infinite",
                opacity: 0.4,
              }}
            />

            {/* Header Section */}
            <div
              style={{
                textAlign: "center",
                marginBottom: "48px",
                position: "relative",
                zIndex: 2,
              }}
            >
              <div
                style={{
                  display: "inline-block",
                  background:
                    "linear-gradient(145deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                  borderRadius: "28px",
                  padding: "24px",
                  marginBottom: "24px",
                  boxShadow:
                    "0 20px 40px rgba(102, 126, 234, 0.3), 0 0 0 1px rgba(255,255,255,0.1)",
                  position: "relative",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    top: "50%",
                    left: "50%",
                    transform: "translate(-50%, -50%)",
                    width: "120%",
                    height: "120%",
                    background:
                      "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.1) 90deg, transparent 180deg)",
                    animation: "spin 8s linear infinite",
                  }}
                />
                <IconUpload
                  size={56}
                  color="white"
                  style={{ position: "relative", zIndex: 1 }}
                />
              </div>

              <Title
                order={1}
                style={{
                  background:
                    "linear-gradient(145deg, #1a1a2e 0%, #16213e 25%, #0f3460 75%, #e94560 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontSize: "48px",
                  fontWeight: 800,
                  marginBottom: "16px",
                  letterSpacing: "-0.02em",
                  textAlign: "center",
                }}
              >
                Upload Required Files
              </Title>

              <Text
                size="xl"
                style={{
                  color: "#64748b",
                  fontSize: "20px",
                  fontWeight: 500,
                  maxWidth: "600px",
                  margin: "0 auto",
                  lineHeight: 1.6,
                }}
              >
                Upload VCDB data and Products data to proceed
              </Text>
            </div>

            {/* Upload Cards Grid */}
            <Grid gutter={40} style={{ position: "relative", zIndex: 2 }}>
              {/* VCDB Upload Card */}
              <Grid.Col span={6}>
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                  }}
                >
                  <Card
                    shadow="xl"
                    padding="32px"
                    radius="24px"
                    style={{
                      background:
                        "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                      border: "3px solid transparent",
                      backgroundClip: "padding-box",
                      position: "relative",
                      overflow: "hidden",
                      height: "100%",
                      cursor: "pointer",
                      transition:
                        "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(-12px) scale(1.02)";
                      e.currentTarget.style.boxShadow =
                        "0 30px 60px rgba(59, 130, 246, 0.25), 0 0 0 1px rgba(59, 130, 246, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(0px) scale(1)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 25px rgba(0, 0, 0, 0.1)";
                    }}
                  >
                    {/* Gradient Border */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        right: "0",
                        bottom: "0",
                        background:
                          "linear-gradient(145deg, #3b82f6, #06b6d4, #8b5cf6)",
                        borderRadius: "24px",
                        padding: "3px",
                      }}
                    >
                      <div
                        style={{
                          background:
                            "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                          borderRadius: "21px",
                          height: "100%",
                          width: "100%",
                        }}
                      />
                    </div>

                    <Stack
                      align="center"
                      gap="xl"
                      style={{ position: "relative", zIndex: 1 }}
                    >
                      {/* Icon Container */}
                      <div
                        style={{
                          background:
                            "linear-gradient(145deg, #3b82f6 0%, #06b6d4 50%, #8b5cf6 100%)",
                          borderRadius: "32px",
                          padding: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow:
                            "0 20px 40px rgba(59, 130, 246, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "-50%",
                            left: "-50%",
                            width: "200%",
                            height: "200%",
                            background:
                              "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.1) 90deg, transparent 180deg)",
                            animation: "spin 6s linear infinite",
                          }}
                        />
                        <IconDatabase
                          size={64}
                          color="white"
                          style={{ position: "relative", zIndex: 1 }}
                        />
                      </div>

                      {/* Title and Description */}
                      <div style={{ textAlign: "center" }}>
                        <Title
                          order={2}
                          mb="md"
                          style={{
                            background:
                              "linear-gradient(145deg, #1e293b 0%, #3b82f6 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            fontWeight: 700,
                            fontSize: "28px",
                          }}
                        >
                          VCDB Data File
                        </Title>
                        <Text size="lg" c="dimmed" mb="xl">
                          Select VCDB file (.csv, .xlsx, .json)
                        </Text>
                      </div>

                      {/* Upload Zone */}
                      <div
                        style={{
                          width: "100%",
                          height: "160px",
                          border: "3px dashed #3b82f6",
                          borderRadius: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(145deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(145deg, rgba(59, 130, 246, 0.08) 0%, rgba(139, 92, 246, 0.08) 100%)";
                          e.currentTarget.style.borderColor = "#8b5cf6";
                          e.currentTarget.style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(145deg, rgba(59, 130, 246, 0.03) 0%, rgba(139, 92, 246, 0.03) 100%)";
                          e.currentTarget.style.borderColor = "#3b82f6";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <Stack align="center" gap="md">
                          <IconFolder size={48} color="#3b82f6" />
                          <Text size="lg" fw={600} c="blue">
                            Drop VCDB files here
                          </Text>
                          <Text size="sm" c="dimmed">
                            or click to browse
                          </Text>
                        </Stack>
                      </div>
                    </Stack>
                  </Card>
                </div>
              </Grid.Col>

              {/* Products Upload Card */}
              <Grid.Col span={6}>
                <div
                  style={{
                    position: "relative",
                    height: "100%",
                  }}
                >
                  <Card
                    shadow="xl"
                    padding="32px"
                    radius="24px"
                    style={{
                      background:
                        "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                      border: "3px solid transparent",
                      backgroundClip: "padding-box",
                      position: "relative",
                      overflow: "hidden",
                      height: "100%",
                      cursor: "pointer",
                      transition:
                        "all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275)",
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(-12px) scale(1.02)";
                      e.currentTarget.style.boxShadow =
                        "0 30px 60px rgba(34, 197, 94, 0.25), 0 0 0 1px rgba(34, 197, 94, 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform =
                        "translateY(0px) scale(1)";
                      e.currentTarget.style.boxShadow =
                        "0 10px 25px rgba(0, 0, 0, 0.1)";
                    }}
                  >
                    {/* Gradient Border */}
                    <div
                      style={{
                        position: "absolute",
                        top: "0",
                        left: "0",
                        right: "0",
                        bottom: "0",
                        background:
                          "linear-gradient(145deg, #22c55e, #10b981, #06d6a0)",
                        borderRadius: "24px",
                        padding: "3px",
                      }}
                    >
                      <div
                        style={{
                          background:
                            "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                          borderRadius: "21px",
                          height: "100%",
                          width: "100%",
                        }}
                      />
                    </div>

                    <Stack
                      align="center"
                      gap="xl"
                      style={{ position: "relative", zIndex: 1 }}
                    >
                      {/* Icon Container */}
                      <div
                        style={{
                          background:
                            "linear-gradient(145deg, #22c55e 0%, #10b981 50%, #06d6a0 100%)",
                          borderRadius: "32px",
                          padding: "32px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          boxShadow:
                            "0 20px 40px rgba(34, 197, 94, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                          position: "relative",
                          overflow: "hidden",
                        }}
                      >
                        <div
                          style={{
                            position: "absolute",
                            top: "-50%",
                            left: "-50%",
                            width: "200%",
                            height: "200%",
                            background:
                              "conic-gradient(from 0deg, transparent 0deg, rgba(255,255,255,0.1) 90deg, transparent 180deg)",
                            animation: "spin 6s linear infinite reverse",
                          }}
                        />
                        <IconFile
                          size={64}
                          color="white"
                          style={{ position: "relative", zIndex: 1 }}
                        />
                      </div>

                      {/* Title and Description */}
                      <div style={{ textAlign: "center" }}>
                        <Title
                          order={2}
                          mb="md"
                          style={{
                            background:
                              "linear-gradient(145deg, #1e293b 0%, #22c55e 100%)",
                            WebkitBackgroundClip: "text",
                            WebkitTextFillColor: "transparent",
                            fontWeight: 700,
                            fontSize: "28px",
                          }}
                        >
                          Products Data File
                        </Title>
                        <Text size="lg" c="dimmed" mb="xl">
                          Select Products file (.csv, .xlsx, .json)
                        </Text>
                      </div>

                      {/* Upload Zone */}
                      <div
                        style={{
                          width: "100%",
                          height: "160px",
                          border: "3px dashed #22c55e",
                          borderRadius: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background:
                            "linear-gradient(145deg, rgba(34, 197, 94, 0.03) 0%, rgba(6, 214, 160, 0.03) 100%)",
                          transition: "all 0.3s ease",
                          cursor: "pointer",
                          position: "relative",
                          overflow: "hidden",
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(145deg, rgba(34, 197, 94, 0.08) 0%, rgba(6, 214, 160, 0.08) 100%)";
                          e.currentTarget.style.borderColor = "#06d6a0";
                          e.currentTarget.style.transform = "scale(1.02)";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background =
                            "linear-gradient(145deg, rgba(34, 197, 94, 0.03) 0%, rgba(6, 214, 160, 0.03) 100%)";
                          e.currentTarget.style.borderColor = "#22c55e";
                          e.currentTarget.style.transform = "scale(1)";
                        }}
                      >
                        <Stack align="center" gap="md">
                          <IconFile size={48} color="#22c55e" />
                          <Text size="lg" fw={600} c="green">
                            Drop Products files here
                          </Text>
                          <Text size="sm" c="dimmed">
                            or click to browse
                          </Text>
                        </Stack>
                      </div>
                    </Stack>
                  </Card>
                </div>
              </Grid.Col>
            </Grid>

            {/* Upload Button */}
            <div
              style={{
                textAlign: "center",
                marginTop: "48px",
                position: "relative",
                zIndex: 2,
              }}
            >
              <Button
                size="xl"
                variant="gradient"
                gradient={{ from: "#667eea", to: "#764ba2", deg: 145 }}
                leftSection={<IconUpload size={24} />}
                style={{
                  borderRadius: "20px",
                  fontSize: "18px",
                  fontWeight: 700,
                  padding: "20px 48px",
                  boxShadow:
                    "0 20px 40px rgba(102, 126, 234, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)",
                  border: "none",
                  position: "relative",
                  overflow: "hidden",
                  minWidth: "240px",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform =
                    "translateY(-2px) scale(1.05)";
                  e.currentTarget.style.boxShadow =
                    "0 25px 50px rgba(102, 126, 234, 0.4), inset 0 1px 0 rgba(255,255,255,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0px) scale(1)";
                  e.currentTarget.style.boxShadow =
                    "0 20px 40px rgba(102, 126, 234, 0.3), inset 0 1px 0 rgba(255,255,255,0.2)";
                }}
              >
                Upload Files
              </Button>
            </div>
          </Card>

          {/* CSS Animations */}
          <style>{`
            @keyframes float {
              0%, 100% { transform: translateY(0px) rotate(0deg); }
              50% { transform: translateY(-20px) rotate(180deg); }
            }
            @keyframes pulse {
              0%, 100% { opacity: 0.4; transform: scale(1); }
              50% { opacity: 0.8; transform: scale(1.2); }
            }
            @keyframes spin {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
          `}</style>
        </div>

        {/* Data Export */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Data Export
          </Title>

          <Text c="dimmed" mb="lg">
            Export fitments data to CSV files. Files will be saved to the
            storage/exports directory with timestamps.
          </Text>

          <Stack gap="md">
            <Group grow>
              <Select
                label="Export Format"
                value={exportFormat}
                onChange={(value) => setExportFormat(value || "both")}
                data={[
                  { value: "both", label: "Both (Compressed & Expanded)" },
                  { value: "compressed", label: "Compressed" },
                  { value: "expanded", label: "Expanded" },
                ]}
              />
              <NumberInput
                label="Number of Days"
                description="Export fitments from last N days"
                value={exportDays}
                onChange={(val) =>
                  setExportDays(typeof val === "number" ? val : 30)
                }
                min={1}
                max={365}
              />
            </Group>

            <Group justify="space-between">
              <div>
                <Text size="sm" fw={500}>
                  Export Location
                </Text>
                <Text size="xs" c="dimmed">
                  Files will be saved to:{" "}
                  <Code>storage/exports/fitments_*_[timestamp].csv</Code>
                </Text>
              </div>
              <Button
                leftSection={<IconDownload size={16} />}
                onClick={handleExportFitments}
              >
                Export Fitments
              </Button>
            </Group>
          </Stack>
        </Card>

        {/* Storage Management */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Storage Management
          </Title>

          <Grid>
            <Grid.Col span={4}>
              <Center>
                <Stack align="center" gap="xs">
                  <ActionIcon variant="light" size="xl" color="blue">
                    <IconFolder size={24} />
                  </ActionIcon>
                  <Text fw={500}>VCDB</Text>
                  <Text size="sm" c="dimmed">
                    15 files
                  </Text>
                  <Text size="xs" c="dimmed">
                    245 MB
                  </Text>
                </Stack>
              </Center>
            </Grid.Col>
            <Grid.Col span={4}>
              <Center>
                <Stack align="center" gap="xs">
                  <ActionIcon variant="light" size="xl" color="green">
                    <IconFolder size={24} />
                  </ActionIcon>
                  <Text fw={500}>Customer</Text>
                  <Text size="sm" c="dimmed">
                    8 files
                  </Text>
                  <Text size="xs" c="dimmed">
                    12 MB
                  </Text>
                </Stack>
              </Center>
            </Grid.Col>
            <Grid.Col span={4}>
              <Center>
                <Stack align="center" gap="xs">
                  <ActionIcon variant="light" size="xl" color="orange">
                    <IconFile size={24} />
                  </ActionIcon>
                  <Text fw={500}>Exports</Text>
                  <Text size="sm" c="dimmed">
                    23 files
                  </Text>
                  <Text size="xs" c="dimmed">
                    156 MB
                  </Text>
                </Stack>
              </Center>
            </Grid.Col>
          </Grid>
        </Card>

        {/* Demo Controls */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Demo & Development Tools
          </Title>

          <Stack gap="md">
            <Alert icon={<IconCheck size={16} />} color="blue">
              <Text fw={500}>Demo Mode Active</Text>
              <Text size="sm">
                The system is running with sample data for demonstration
                purposes. Use the controls below to manage demo data.
              </Text>
            </Alert>

            <Group justify="space-between">
              <div>
                <Text fw={500}>Reset Demo Data</Text>
                <Text size="sm" c="dimmed">
                  Clear all data and reload fresh demo dataset including VCDB,
                  parts, and sample fitments
                </Text>
              </div>
              <Button
                leftSection={<IconRefresh size={16} />}
                color="orange"
                onClick={() => setResetModalOpen(true)}
              >
                Reset Demo
              </Button>
            </Group>
          </Stack>
        </Card>
      </Stack>

      {/* Reset Demo Modal */}
      <Modal
        opened={resetModalOpen}
        onClose={() => setResetModalOpen(false)}
        title="Reset Demo Data"
        centered
      >
        <Stack gap="md">
          <Alert icon={<IconAlertTriangle size={16} />} color="red">
            This will permanently delete all current data and reload the demo
            dataset.
          </Alert>

          <div>
            <Text fw={500} mb="xs">
              This action will:
            </Text>
            <List size="sm">
              <List.Item>Delete all existing fitments</List.Item>
              <List.Item>Reset VCDB to demo configuration</List.Item>
              <List.Item>Reload sample parts and part types</List.Item>
              <List.Item>Create fresh demo fitments</List.Item>
            </List>
          </div>

          <Group justify="flex-end">
            <Button variant="light" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleResetDemo}>
              Reset Demo Data
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
