import { useState, useEffect } from "react";
import {
  Grid,
  Card,
  Title,
  Text,
  Select,
  NumberInput,
  Button,
  Table,
  Checkbox,
  TextInput,
  Group,
  Stack,
  Badge,
  ScrollArea,
  FileInput,
  Progress,
  Alert,
  SimpleGrid,
  Stepper,
  Textarea,
  Transition,
} from "@mantine/core";
import {
  IconUpload,
  IconFileText,
  IconRobot,
  IconAlertCircle,
  IconBrain,
  IconUsers,
  IconDatabase,
  IconArrowLeft,
  IconCar,
  IconList,
  IconSettings,
  IconCalendar,
  IconGasStation,
  IconDoor,
  IconRefresh,
  IconSearch,
  IconPackage,
  IconTag,
  IconMapPin,
  IconHash,
} from "@tabler/icons-react";
import {
  vcdbService,
  partsService,
  fitmentUploadService,
} from "../api/services";
import { useApi, useAsyncOperation } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

export default function ApplyFitments() {
  // Professional toast hook
  const { showSuccess, showError } = useProfessionalToast();

  // File upload states
  const [vcdbFile, setVcdbFile] = useState<File | null>(null);
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [vcdbDragActive, setVcdbDragActive] = useState(false);
  const [productsDragActive, setProductsDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "completed" | "error"
  >("idle");
  const [uploadedFiles, setUploadedFiles] = useState<{
    vcdb: boolean;
    products: boolean;
  }>({ vcdb: false, products: false });
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Step management for UI flow
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1); // 1 = Upload Files, 2 = Choose Method, 3 = Manual Method, 4 = AI Method

  // Navigation handlers
  const handleBackToUpload = () => {
    setCurrentStep(1);
    setUploadStatus("idle");
    setUploadProgress(0);
    setSelectedMethod(null);
  };

  const handleBackToMethodSelection = () => {
    setCurrentStep(2);
    setSelectedMethod(null);
    setAiProcessing(false);
    setAiFitments([]);
    setAiProgress(0);
    setAiLogs([]);
  };

  const handleManualMethodClick = () => {
    setSelectedMethod("manual");
    setCurrentStep(3);
  };

  const handleAiMethodClick = () => {
    setSelectedMethod("ai");
    setCurrentStep(4);
  };

  // Fitment method selection
  const [selectedMethod, setSelectedMethod] = useState<"manual" | "ai" | null>(
    null
  );

  // Manual fitment states (existing logic)
  const [filters, setFilters] = useState({
    yearFrom: 2020,
    yearTo: 2025,
    make: "",
    model: "",
    submodel: "",
    driveType: "",
    fuelType: "",
    numDoors: "",
    bodyType: "",
  });

  // AI fitment states
  const [aiFitments, setAiFitments] = useState<any[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [selectedAiFitments, setSelectedAiFitments] = useState<string[]>([]);

  // Manual Method Stepper State
  const [manualStep, setManualStep] = useState(1);
  const [vehicleFilters, setVehicleFilters] = useState({
    yearFrom: "",
    yearTo: "",
    make: "",
    model: "",
    submodel: "",
    fuelType: "",
    numDoors: "",
    driveType: "",
    bodyType: "",
  });
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [fitmentDetails, setFitmentDetails] = useState({
    partId: "",
    partType: "",
    position: "",
    quantity: 1,
    title: "",
    description: "",
    notes: "",
  });
  const [applyingManualFitment, setApplyingManualFitment] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // API hooks
  const { data: yearRange } = useApi(
    () => vcdbService.getYearRange(),
    []
  ) as any;

  const { data: configurationsData } = useApi(
    () => vcdbService.getConfigurations(filters),
    [filters]
  ) as any;
  const { execute: applyFitment, loading: applyingFitment } =
    useAsyncOperation();
  const { execute: uploadFiles, loading: uploadingFiles } = useAsyncOperation();
  const { execute: processAiFitment } = useAsyncOperation();

  // Update year range when data loads
  useEffect(() => {
    if (yearRange) {
      setFilters((prev) => ({
        ...prev,
        yearFrom: yearRange.minYear,
        yearTo: yearRange.maxYear,
      }));
    }
  }, [yearRange]);

  // Drag & Drop handlers for VCDB files
  const handleVcdbDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setVcdbDragActive(true);
    } else if (e.type === "dragleave") {
      setVcdbDragActive(false);
    }
  };

  const handleVcdbDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setVcdbDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setVcdbFile(e.dataTransfer.files[0]);
    }
  };

  // Drag & Drop handlers for Products files
  const handleProductsDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setProductsDragActive(true);
    } else if (e.type === "dragleave") {
      setProductsDragActive(false);
    }
  };

  const handleProductsDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setProductsDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setProductsFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileUpload = async () => {
    if (!vcdbFile || !productsFile) {
      showError("Please upload both VCDB and Products files");
      return;
    }

    setUploadStatus("uploading");
    setUploadProgress(0);

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      // Upload files to backend
      const result: any = await uploadFiles(() =>
        fitmentUploadService.uploadFiles(vcdbFile, productsFile)
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("Upload result:", result);

      if (result && result.data && result.data.session) {
        setUploadStatus("completed");
        setUploadedFiles({ vcdb: true, products: true });
        setSessionId(result.data.session.id);
        setCurrentStep(2); // Move to step 2 after successful upload
        showSuccess(
          "Files uploaded successfully! Now choose your fitment method.",
          5000
        );
      } else {
        console.error("Invalid response structure:", result);
        throw new Error("Invalid response from server");
      }
    } catch (error: any) {
      setUploadStatus("error");
      console.error("Upload error:", error);
      const errorMessage =
        error?.response?.data?.error ||
        error?.message ||
        "Failed to upload files";
      showError(errorMessage);
    }
  };

  const handleAiFitment = async () => {
    if (!uploadedFiles.vcdb || !uploadedFiles.products || !sessionId) {
      showError("Please upload both files first");
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
        fitmentUploadService.processAiFitment(sessionId)
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

    if (!sessionId) {
      showError("Session not found");
      return;
    }

    try {
      const result: any = await applyFitment(() =>
        fitmentUploadService.applyAiFitments(sessionId, selectedAiFitments)
      );

      if (result) {
        showSuccess(
          `Successfully applied ${result.applied_count} AI fitments to the database!`,
          5000
        );
        setSelectedAiFitments([]);
        setAiFitments([]);

        // Reset the method selection to allow new uploads
        setSelectedMethod(null);
        setUploadedFiles({ vcdb: false, products: false });
        setSessionId(null);
        setCurrentStep(1); // Reset to step 1
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

      if (!sessionId) {
        showError("Session ID is required for export");
        return;
      }

      const response = await fitmentUploadService.exportAiFitments(
        format,
        sessionId,
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

                    {/* Generate AI Fitments Button */}
                    {!aiProcessing && aiFitments.length === 0 && (
                      <Group justify="center">
                        <Button
                          size="lg"
                          leftSection={<IconRobot size={20} />}
                          variant="filled"
                          onClick={handleAiFitment}
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
                          Generate AI Fitments
                        </Button>
                      </Group>
                    )}
                  </Stack>
                </Card>
              }

              {/* AI Progress Display (only show on step 4) */}
              {
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
              }
            </div>
          )}
        </Transition>

        {/* AI Progress Display (legacy - only show when NOT using new steps) */}
        {currentStep !== 4 && selectedMethod === "ai" && aiProcessing && (
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            p="xl"
          >
            <Stack gap="lg">
              <Group justify="space-between">
                <div>
                  <Title order={3} c="#1e293b" fw={600}>
                    🧠 AI Fitment Generation in Progress
                  </Title>
                  <Text size="sm" c="#64748b">
                    Our AI is analyzing your data to generate optimal fitments
                  </Text>
                </div>
              </Group>

              <Progress
                value={aiProgress}
                size="lg"
                radius="md"
                color="green"
                animated
                style={{ marginBottom: "16px" }}
              />

              <ScrollArea h={200}>
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

        {/* AI Fitments Results */}
        {selectedMethod === "ai" && aiFitments.length > 0 && (
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
