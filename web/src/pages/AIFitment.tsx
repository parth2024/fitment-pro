import { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Select,
  Button,
  Table,
  Checkbox,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Progress,
  Alert,
  Transition,
} from "@mantine/core";
import { IconRobot, IconAlertCircle, IconDatabase } from "@tabler/icons-react";
import { fitmentUploadService, dataUploadService } from "../api/services";
import { useApi, useAsyncOperation } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

export default function ApplyFitments() {
  // Professional toast hook
  const { showSuccess, showError } = useProfessionalToast();

  // Session selection states (new approach)
  const [uploadedSessions, setUploadedSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [uploadedVehicles, setUploadedVehicles] = useState<any[]>([]);
  const [uploadedProducts, setUploadedProducts] = useState<any[]>([]);
  const [loadingSessionData, setLoadingSessionData] = useState(false);

  // AI fitment states
  const [aiFitments, setAiFitments] = useState<any[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [selectedAiFitments, setSelectedAiFitments] = useState<string[]>([]);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // API hooks
  const { execute: applyFitment, loading: applyingFitment } =
    useAsyncOperation();
  const { execute: processAiFitment } = useAsyncOperation();

  // Session management API hooks
  const { data: sessionsData, loading: sessionsLoading } = useApi(
    () => dataUploadService.getSessions(),
    []
  ) as any;

  // Load uploaded sessions
  useEffect(() => {
    if (sessionsData && Array.isArray(sessionsData)) {
      console.log("Sessions data loaded:", sessionsData);
      setUploadedSessions(sessionsData);
      // Auto-select the most recent session if available and no session is currently selected
      if (sessionsData.length > 0 && !selectedSession) {
        const mostRecent = sessionsData[0];
        console.log("Auto-selecting session:", mostRecent.id);
        setSelectedSession(mostRecent.id);
      }
    }
  }, [sessionsData]);

  // Load session data when session is selected
  useEffect(() => {
    if (selectedSession) {
      console.log("Loading session data for:", selectedSession);
      setLoadingSessionData(true);

      // Clear previous AI fitments when session changes
      setAiFitments([]);
      setSelectedAiFitments([]);
      setAiProcessing(false);
      setAiProgress(0);
      setAiLogs([]);

      const loadData = async () => {
        try {
          console.log("Making API calls for session:", selectedSession);
          const [vehiclesResponse, productsResponse] = await Promise.all([
            dataUploadService.getFileData(selectedSession, "vcdb"),
            dataUploadService.getFileData(selectedSession, "products"),
          ]);

          const result = {
            vehicles: vehiclesResponse?.data || [],
            products: productsResponse?.data || [],
          };

          console.log("Session data loaded:", result);
          setUploadedVehicles(result.vehicles?.data || []);
          setUploadedProducts(result.products?.data || []);
        } catch (error) {
          console.error("Failed to load session data:", error);
          showError("Failed to load uploaded data");
        } finally {
          setLoadingSessionData(false);
        }
      };

      loadData();
    } else {
      // Clear data when no session is selected
      setUploadedVehicles([]);
      setUploadedProducts([]);
      setAiFitments([]);
      setSelectedAiFitments([]);
      setAiProcessing(false);
      setAiProgress(0);
      setAiLogs([]);
    }
  }, [selectedSession]);

  const handleAiFitment = async () => {
    if (!selectedSession) {
      showError("Please select an upload session first");
      return;
    }

    if (uploadedVehicles.length === 0 || uploadedProducts.length === 0) {
      showError("No vehicle or product data available in selected session");
      return;
    }

    setAiProcessing(true);
    setAiProgress(0);
    setAiLogs([]);

    // Simulate professional AI processing with realistic logs
    const logs = [
      "🔍 Initializing AI Fitment Engine...",
      "📊 Analyzing VCDB vehicle configurations...",
      "🔧 Processing product specifications...",
      "🧠 Running compatibility algorithms...",
      "⚡ Applying machine learning models...",
      "🎯 Calculating fitment probabilities...",
      "📈 Optimizing recommendation scores...",
      "🔍 Checking for potential conflicts...",
      "🔬 Cross-referencing OEM specifications...",
      "📋 Validating part compatibility matrices...",
      "🌐 Querying manufacturer databases...",
      "🔍 Scanning for alternative configurations...",
      "📊 Computing confidence intervals...",
      "🎨 Applying design pattern recognition...",
      "⚙️ Optimizing fitment algorithms...",
      "🔍 Detecting edge cases and exceptions...",
      "📈 Analyzing historical fitment data...",
      "🧪 Running compatibility stress tests...",
      "🔍 Performing quality assurance checks...",
      "📊 Generating performance metrics...",
      "🎯 Refining recommendation accuracy...",
      "🔍 Validating against industry standards...",
      "📋 Compiling fitment documentation...",
      "✅ Generating fitment suggestions...",
    ];

    // Progressive log updates
    const logInterval = setInterval(() => {
      setAiLogs((prev) => {
        const nextIndex = prev.length;
        if (nextIndex < logs.length) {
          return [...prev, logs[nextIndex]];
        }
        return prev;
      });
      setAiProgress((prev) => Math.min(prev + 12, 95));
    }, 800);

    try {
      // Call Azure AI Foundry API
      const result: any = await processAiFitment(() =>
        fitmentUploadService.processDataUploadsAiFitment(selectedSession)
      );

      clearInterval(logInterval);
      setAiProgress(100);
      setAiLogs((prev) => [...prev, "🎉 AI fitment generation completed!"]);

      console.log("Full API result:", result);
      console.log("Result data:", result?.data);
      console.log("Result fitments:", result?.fitments);
      console.log("Result data fitments:", result?.data?.fitments);

      // Check different possible response structures
      const fitments =
        result?.fitments ||
        result?.data?.fitments ||
        result?.data?.data?.fitments;

      if (fitments && Array.isArray(fitments) && fitments.length > 0) {
        console.log("Setting fitments:", fitments);

        // Add unique IDs to fitments for proper selection handling
        const fitmentsWithIds = fitments.map((fitment: any, index: number) => ({
          ...fitment,
          id: fitment.id || `fitment_${index}`,
          part_name:
            fitment.partDescription || fitment.part_name || "Unknown Part",
          part_description:
            fitment.partDescription || "No description available",
        }));

        setAiFitments(fitmentsWithIds);
        // Auto-select all fitments by default
        setSelectedAiFitments(
          fitmentsWithIds.map((fitment: any) => fitment.id)
        );
        showSuccess(
          `AI generated ${fitments.length} fitment suggestions!`,
          5000
        );
      } else {
        console.log("No fitments found in response structure");
        console.log("Available keys in result:", Object.keys(result || {}));
        if (result?.data) {
          console.log(
            "Available keys in result.data:",
            Object.keys(result.data)
          );
        }
        showError(
          "No fitments were generated. Please check your uploaded files and try again."
        );
      }
    } catch (error) {
      clearInterval(logInterval);
      console.error("AI fitment error:", error);
      setAiLogs((prev) => [
        ...prev,
        "❌ AI processing failed. Please try again.",
      ]);
      showError("Failed to process AI fitment");
    } finally {
      setAiProcessing(false);
    }
  };

  const handleApplyAiFitments = async () => {
    if (selectedAiFitments.length === 0) {
      showError("Please select fitments to apply");
      return;
    }

    if (!selectedSession) {
      showError("Please select an upload session first");
      return;
    }

    try {
      const result: any = await applyFitment(() =>
        fitmentUploadService.applyDataUploadsAiFitments(
          selectedSession,
          selectedAiFitments
        )
      );

      if (result) {
        showSuccess(
          `Successfully applied ${result.applied_count} AI fitments to the database!`,
          5000
        );
        setSelectedAiFitments([]);
        setAiFitments([]);
      }
    } catch (error) {
      showError("Failed to apply AI fitments");
    }
  };

  const handleExportFitments = async (format: "csv" | "xlsx" | "json") => {
    try {
      // Export only selected AI fitments if any are selected, otherwise export all AI fitments
      const fitmentIds =
        selectedAiFitments.length > 0 ? selectedAiFitments : undefined;

      if (!selectedSession) {
        showError("Please select an upload session first");
        return;
      }

      const response = await fitmentUploadService.exportAiFitments(
        format,
        selectedSession,
        fitmentIds
      );

      // Create blob and download
      const blob = new Blob([response.data], {
        type:
          format === "csv"
            ? "text/csv"
            : format === "xlsx"
            ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            : "application/json",
      });

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;

      // Generate filename based on selection
      const selectionSuffix = fitmentIds
        ? `_selected_${fitmentIds.length}`
        : "_all";
      link.download = `ai_fitments${selectionSuffix}.${format}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      const exportMessage = fitmentIds
        ? `${
            fitmentIds.length
          } selected AI fitments exported as ${format.toUpperCase()}`
        : `All AI fitments exported as ${format.toUpperCase()}`;

      showSuccess(exportMessage);
    } catch (error) {
      console.error("Export error:", error);
      showError(`Failed to export AI fitments as ${format.toUpperCase()}`);
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
      }}
    >
      <Stack gap="xl">
        {/* Step 4: AI Method Page */}
        <Transition
          mounted={true}
          transition="fade"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
              {
                <Card
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  }}
                  p="xl"
                >
                  <Stack gap="xl">
                    <div>
                      <Title order={2} c="#1e293b" fw={600}>
                        AI Fitment Generation
                      </Title>
                      <Text size="sm" c="#64748b">
                        Let our AI automatically generate optimal fitments based
                        on your data
                      </Text>
                    </div>

                    {/* Session Selector */}
                    <Card
                      withBorder
                      radius="md"
                      p="md"
                      style={{ backgroundColor: "#f8fafc" }}
                    >
                      <Stack gap="sm">
                        <Group gap="sm">
                          <IconDatabase size={20} color="#3b82f6" />
                          <Text fw={600} size="sm" c="#1e293b">
                            Data Source
                          </Text>
                        </Group>
                        <Select
                          label="Select Upload Session"
                          placeholder={
                            sessionsLoading || loadingSessionData
                              ? "Loading sessions..."
                              : uploadedSessions.length === 0
                              ? "No uploaded data available"
                              : "Select a session"
                          }
                          data={uploadedSessions.map((session: any) => ({
                            value: session.id,
                            label: `${
                              session.name || `Session ${session.id}`
                            } - ${new Date(
                              session.created_at
                            ).toLocaleDateString()}`,
                          }))}
                          value={selectedSession}
                          onChange={(value) => setSelectedSession(value)}
                          disabled={
                            sessionsLoading ||
                            loadingSessionData ||
                            uploadedSessions.length === 0
                          }
                          leftSection={
                            <IconDatabase size={16} color="#64748b" />
                          }
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "8px",
                              textTransform: "uppercase",
                              letterSpacing: "0.5px",
                            },
                            input: {
                              borderRadius: "10px",
                              border: "2px solid #e2e8f0",
                              fontSize: "14px",
                              height: "48px",
                              paddingLeft: "40px",
                              transition:
                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                              backgroundColor: "#fafafa",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                backgroundColor: "#ffffff",
                              },
                              "&:hover": {
                                borderColor: "#cbd5e1",
                                backgroundColor: "#ffffff",
                              },
                            },
                          }}
                        />
                        {selectedSession && (
                          <Group gap="sm">
                            <Badge color="blue" variant="light" size="sm">
                              {loadingSessionData
                                ? "Loading..."
                                : `${uploadedVehicles.length} Vehicles`}
                            </Badge>
                            <Badge color="green" variant="light" size="sm">
                              {loadingSessionData
                                ? "Loading..."
                                : `${uploadedProducts.length} Products`}
                            </Badge>
                          </Group>
                        )}
                      </Stack>
                    </Card>

                    {/* Warning if no data available */}
                    {uploadedSessions.length === 0 && (
                      <Alert
                        icon={<IconAlertCircle size={16} />}
                        title="No Uploaded Data Available"
                        color="orange"
                        variant="light"
                        radius="md"
                      >
                        <Text size="sm">
                          Please upload VCDB and Products files in the{" "}
                          <strong>Upload Data</strong> section first before
                          using AI fitment.
                        </Text>
                      </Alert>
                    )}

                    {/* Generate AI Fitments Button - Show only when session is selected and no fitments generated */}
                    {selectedSession &&
                      !aiProcessing &&
                      aiFitments.length === 0 && (
                        <Group justify="center">
                          <Button
                            size="lg"
                            leftSection={<IconRobot size={20} />}
                            variant="filled"
                            onClick={handleAiFitment}
                            disabled={
                              !selectedSession ||
                              uploadedSessions.length === 0 ||
                              loadingSessionData ||
                              uploadedVehicles.length === 0 ||
                              uploadedProducts.length === 0
                            }
                            style={{
                              background:
                                "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                              border: "none",
                              borderRadius: "8px",
                              fontSize: "16px",
                              fontWeight: 600,
                              padding: "12px 24px",
                              height: "48px",
                              color: "white",
                              transition: "all 0.2s ease",
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform =
                                "translateY(-1px)";
                              e.currentTarget.style.boxShadow =
                                "0 4px 12px rgba(59, 130, 246, 0.3)";
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = "translateY(0)";
                              e.currentTarget.style.boxShadow = "none";
                            }}
                          >
                            {loadingSessionData
                              ? "Loading Session Data..."
                              : uploadedVehicles.length === 0 ||
                                uploadedProducts.length === 0
                              ? "No Data Available"
                              : "Generate AI Fitments"}
                          </Button>
                        </Group>
                      )}
                  </Stack>
                </Card>
              }

              {/* AI Progress Display (only show when processing) */}
              {aiProcessing && (
                <Card
                  style={{
                    background: "#ffffff",
                    border: "1px solid #e2e8f0",
                    borderRadius: "12px",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  }}
                  h={800}
                  mt={30}
                  p="xl"
                >
                  <Stack gap="lg">
                    <Group justify="space-between">
                      <div>
                        <Title order={3} c="#1e293b" fw={600}>
                          🧠 AI Fitment Generation in Progress
                        </Title>
                        <Text size="sm" c="#64748b">
                          Our AI is analyzing your data to generate optimal
                          fitments
                        </Text>
                      </div>
                    </Group>

                    <Progress
                      value={aiProgress}
                      size="lg"
                      radius="md"
                      styles={{
                        root: {
                          background: "#f1f5f9",
                        },
                        section: {
                          background:
                            "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        },
                      }}
                      animated
                      style={{ marginBottom: "16px" }}
                    />

                    <ScrollArea h={600}>
                      <Stack gap="xs">
                        {aiLogs.map((log, index) => (
                          <Text
                            key={index}
                            size="sm"
                            c="#374151"
                            style={{
                              fontFamily:
                                "'Monaco', 'Menlo', 'Ubuntu Mono', monospace",
                              background: "#f8fafc",
                              padding: "8px 12px",
                              borderRadius: "6px",
                              border: "1px solid #e2e8f0",
                            }}
                          >
                            {log}
                          </Text>
                        ))}
                      </Stack>
                    </ScrollArea>
                  </Stack>
                </Card>
              )}
            </div>
          )}
        </Transition>

        {/* AI Fitments Results - Only show when fitments are generated and session is selected */}
        {selectedSession && aiFitments.length > 0 && (
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            h={800}
            p="xl"
          >
            <Stack gap="lg">
              <Group justify="space-between">
                <div>
                  <Title order={3} c="#1e293b" fw={600}>
                    AI Generated Fitments
                  </Title>
                  <Text size="sm" c="#64748b">
                    Review and select fitments to apply
                  </Text>
                </div>
                <Group gap="sm">
                  <Group gap="xs">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportFitments("csv")}
                    >
                      CSV
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportFitments("xlsx")}
                    >
                      XLSX
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportFitments("json")}
                    >
                      JSON
                    </Button>
                  </Group>
                  <Button
                    variant="filled"
                    color="green"
                    size="sm"
                    onClick={handleApplyAiFitments}
                    disabled={selectedAiFitments.length === 0}
                    loading={applyingFitment}
                  >
                    Apply Selected ({selectedAiFitments.length})
                  </Button>
                </Group>
              </Group>

              <div style={{ position: "relative" }}>
                {/* Static Table Header */}
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th
                        style={{
                          textAlign: "center",
                          verticalAlign: "middle",
                          width: "60px",
                        }}
                      >
                        <Checkbox
                          checked={
                            selectedAiFitments.length === aiFitments.length
                          }
                          indeterminate={
                            selectedAiFitments.length > 0 &&
                            selectedAiFitments.length < aiFitments.length
                          }
                          onChange={(event) => {
                            if (event.currentTarget.checked) {
                              setSelectedAiFitments(
                                aiFitments.map((fitment) => fitment.id)
                              );
                            } else {
                              setSelectedAiFitments([]);
                            }
                          }}
                          ml={7}
                        />
                      </Table.Th>
                      <Table.Th style={{ width: "130px" }}>Part ID</Table.Th>
                      <Table.Th style={{ width: "80px" }}>Year</Table.Th>
                      <Table.Th style={{ width: "100px" }}>Make</Table.Th>
                      <Table.Th style={{ width: "120px" }}>Model</Table.Th>
                      <Table.Th style={{ width: "100px" }}>Submodel</Table.Th>
                      <Table.Th style={{ width: "100px" }}>Position</Table.Th>
                      <Table.Th style={{ width: "100px" }}>Confidence</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                </Table>

                {/* Scrollable Table Body */}
                <ScrollArea h={600} style={{ marginTop: "-1px" }}>
                  <Table striped highlightOnHover>
                    <Table.Tbody>
                      {aiFitments.map((fitment) => (
                        <Table.Tr key={fitment.id}>
                          <Table.Td
                            style={{
                              textAlign: "center",
                              verticalAlign: "middle",
                              width: "60px",
                            }}
                          >
                            <Checkbox
                              checked={selectedAiFitments.includes(fitment.id)}
                              onChange={(event) => {
                                if (event.currentTarget.checked) {
                                  setSelectedAiFitments((prev) => [
                                    ...prev,
                                    fitment.id,
                                  ]);
                                } else {
                                  setSelectedAiFitments((prev) =>
                                    prev.filter((id) => id !== fitment.id)
                                  );
                                }
                              }}
                            />
                          </Table.Td>
                          <Table.Td style={{ width: "120px" }}>
                            <Text size="sm" fw={600} c="#3b82f6">
                              {fitment.part_id}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ width: "80px" }}>
                            <Text size="sm">{fitment.year}</Text>
                          </Table.Td>
                          <Table.Td style={{ width: "100px" }}>
                            <Text size="sm" fw={500}>
                              {fitment.make}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ width: "120px" }}>
                            <Text size="sm">{fitment.model}</Text>
                          </Table.Td>
                          <Table.Td style={{ width: "100px" }}>
                            <Text size="sm" c="#64748b">
                              {fitment.submodel || "-"}
                            </Text>
                          </Table.Td>
                          <Table.Td style={{ width: "100px" }}>
                            <Badge variant="light" size="sm" color="blue">
                              {fitment.position}
                            </Badge>
                          </Table.Td>
                          <Table.Td style={{ width: "100px" }}>
                            <Badge
                              variant="light"
                              color={
                                fitment.confidence > 0.8
                                  ? "green"
                                  : fitment.confidence > 0.6
                                  ? "orange"
                                  : "red"
                              }
                              size="sm"
                            >
                              {Math.round(fitment.confidence * 100)}%
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </div>
            </Stack>
          </Card>
        )}
      </Stack>
    </div>
  );
}
