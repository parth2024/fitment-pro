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
  Modal,
  Menu,
  ActionIcon,
  Notification,
  MultiSelect,
} from "@mantine/core";
import {
  IconSearch,
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
  IconDots,
  IconEdit,
  IconTrash,
  IconEye,
  IconDownload,
} from "@tabler/icons-react";
import {
  vcdbService,
  partsService,
  fitmentsService,
  fitmentUploadService,
} from "../api/services";
import { useApi, useAsyncOperation } from "../hooks/useApi";
import toast from "react-hot-toast";

export default function ApplyFitments() {
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
    null,
  );

  // Manual fitment states (existing logic)
  const [selectedConfigs, setSelectedConfigs] = useState<string[]>([]);
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
  const [fitmentForm, setFitmentForm] = useState({
    partId: "",
    partTypeId: "",
    position: "",
    quantity: 1,
    wheelType: "",
    liftHeight: "",
    wheelDiameter1: "",
    wheelDiameter2: "",
    wheelDiameter3: "",
    tireDiameter1: "",
    tireDiameter2: "",
    tireDiameter3: "",
    backspacing1: "",
    backspacing2: "",
    backspacing3: "",
    title: "",
    description: "",
    notes: "",
  });

  // AI fitment states
  const [aiFitments, setAiFitments] = useState<any[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [selectedAiFitments, setSelectedAiFitments] = useState<string[]>([]);

  // Manual Method Stepper State
  const [manualStep, setManualStep] = useState(1);
  const [vehicleFilters, setVehicleFilters] = useState({
    yearFrom: '',
    yearTo: '',
    make: '',
    model: '',
    submodel: '',
    fuelType: '',
    numDoors: '',
    driveType: '',
    bodyType: ''
  });
  const [filteredVehicles, setFilteredVehicles] = useState([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [fitmentDetails, setFitmentDetails] = useState({
    partId: '',
    partType: '',
    position: '',
    quantity: 1,
    title: '',
    description: '',
    notes: ''
  });
  const [availableParts, setAvailableParts] = useState([]);
  const [availablePartTypes, setAvailablePartTypes] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);
  const [applyingManualFitment, setApplyingManualFitment] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);

  // API hooks
  const { data: yearRange } = useApi(
    () => vcdbService.getYearRange(),
    [],
  ) as any;
  const { data: parts } = useApi(
    () => partsService.getParts({ "with-fitments": false }),
    [],
  );
  const { data: partTypes } = useApi(
    () => partsService.getPartTypes(),
    [],
  ) as any;
  const {
    data: configurationsData,
    loading: configsLoading,
    refetch: refetchConfigs,
  } = useApi(() => vcdbService.getConfigurations(filters), [filters]) as any;
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

  const configurations = configurationsData?.configurations || [];

  const positions = [
    "Front",
    "Rear",
    "Front Left",
    "Front Right",
    "Rear Left",
    "Rear Right",
  ];

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
      toast.error("Please upload both VCDB and Products files");
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
        fitmentUploadService.uploadFiles(vcdbFile, productsFile),
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("Upload result:", result);

      if (result && result.data && result.data.session) {
        setUploadStatus("completed");
        setUploadedFiles({ vcdb: true, products: true });
        setSessionId(result.data.session.id);
        setCurrentStep(2); // Move to step 2 after successful upload
        toast.success(
          "Files uploaded successfully! Now choose your fitment method.",
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
      toast.error(errorMessage);
    }
  };

  const handleAiFitment = async () => {
    if (!uploadedFiles.vcdb || !uploadedFiles.products || !sessionId) {
      toast.error("Please upload both files first");
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
        fitmentUploadService.processAiFitment(sessionId),
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
          fitmentsWithIds.map((fitment: any) => fitment.id),
        );
        toast.success(`AI generated ${fitments.length} fitment suggestions!`);
      } else {
        console.log("No fitments found in response structure");
        console.log("Available keys in result:", Object.keys(result || {}));
        if (result?.data) {
          console.log(
            "Available keys in result.data:",
            Object.keys(result.data),
          );
        }
        toast.error(
          "No fitments were generated. Please check your uploaded files and try again.",
        );
      }
    } catch (error) {
      clearInterval(logInterval);
      console.error("AI fitment error:", error);
      setAiLogs((prev) => [
        ...prev,
        "❌ AI processing failed. Please try again.",
      ]);
      toast.error("Failed to process AI fitment");
    } finally {
      setAiProcessing(false);
    }
  };

  const handleApplyAiFitments = async () => {
    if (selectedAiFitments.length === 0) {
      toast.error("Please select fitments to apply");
      return;
    }

    if (!sessionId) {
      toast.error("Session not found");
      return;
    }

    try {
      const result: any = await applyFitment(() =>
        fitmentUploadService.applyAiFitments(sessionId, selectedAiFitments),
      );

      if (result) {
        toast.success(
          `Successfully applied ${result.applied_count} AI fitments to the database!`,
          {
            duration: 5000,
            style: {
              background: "#10b981",
              color: "white",
            },
          },
        );
        setSelectedAiFitments([]);
        setAiFitments([]);

        // Show success modal with navigation option
        setTimeout(() => {
          if (
            confirm(
              `Successfully applied ${result.applied_count} fitments! Would you like to view them in the Fitments page?`,
            )
          ) {
            window.location.href = "/fitments";
          }
        }, 1000);

        // Reset the method selection to allow new uploads
        setSelectedMethod(null);
        setUploadedFiles({ vcdb: false, products: false });
        setSessionId(null);
        setCurrentStep(1); // Reset to step 1
      }
    } catch (error) {
      toast.error("Failed to apply AI fitments");
    }
  };

  const handleExportFitments = async (format: "csv" | "xlsx" | "json") => {
    try {
      // Export only selected AI fitments if any are selected, otherwise export all AI fitments
      const fitmentIds =
        selectedAiFitments.length > 0 ? selectedAiFitments : undefined;

      if (!sessionId) {
        toast.error("Session ID is required for export");
        return;
      }

      const response = await fitmentUploadService.exportAiFitments(
        format,
        sessionId,
        fitmentIds,
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

      toast.success(exportMessage);
    } catch (error) {
      console.error("Export error:", error);
      toast.error(`Failed to export AI fitments as ${format.toUpperCase()}`);
    }
  };

  const handleSearchVehicles = async () => {
    try {
      await refetchConfigs();
      toast.success("Vehicle configurations updated");
    } catch (error) {
      toast.error("Failed to fetch configurations");
    }
  };

  const handleApplyFitment = async () => {
    if (
      selectedConfigs.length === 0 ||
      !fitmentForm.partId ||
      !fitmentForm.partTypeId
    ) {
      toast.error("Please select configurations and complete the fitment form");
      return;
    }

    const fitmentData = {
      partIDs: [fitmentForm.partId],
      partTypeID: fitmentForm.partTypeId,
      configurationIDs: selectedConfigs,
      quantity: fitmentForm.quantity,
      position: fitmentForm.position,
      liftHeight: fitmentForm.liftHeight,
      wheelType: fitmentForm.wheelType,
      wheelParameters: [
        {
          wheelDiameter: fitmentForm.wheelDiameter1,
          tireDiameter: fitmentForm.tireDiameter1,
          backspacing: fitmentForm.backspacing1,
        },
        {
          wheelDiameter: fitmentForm.wheelDiameter2,
          tireDiameter: fitmentForm.tireDiameter2,
          backspacing: fitmentForm.backspacing2,
        },
        {
          wheelDiameter: fitmentForm.wheelDiameter3,
          tireDiameter: fitmentForm.tireDiameter3,
          backspacing: fitmentForm.backspacing3,
        },
      ].filter(
        (param) =>
          param.wheelDiameter || param.tireDiameter || param.backspacing,
      ),
      title: fitmentForm.title,
      description: fitmentForm.description,
      notes: fitmentForm.notes,
    };

    const result = await applyFitment(() =>
      fitmentsService.createFitment(fitmentData),
    );
    if (result) {
      toast.success(
        `Fitment applied to ${selectedConfigs.length} configurations`,
      );
      setSelectedConfigs([]);
      setFitmentForm({
        partId: "",
        partTypeId: "",
        position: "",
        quantity: 1,
        wheelType: "",
        liftHeight: "",
        wheelDiameter1: "",
        wheelDiameter2: "",
        wheelDiameter3: "",
        tireDiameter1: "",
        tireDiameter2: "",
        tireDiameter3: "",
        backspacing1: "",
        backspacing2: "",
        backspacing3: "",
        title: "",
        description: "",
        notes: "",
      });
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
      }}
    >
      <Stack gap="xl">
        {/* Step 1: File Upload Section */}
        {currentStep === 1 && (
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
                <Title order={2} c="#1e293b" fw={600} mb="xs">
                  Upload Required Files
                </Title>
                <Text size="md" c="#64748b">
                  Upload VCDB data and Products data to proceed
                </Text>
              </div>

              <Grid gutter="xl">
                <Grid.Col span={6}>
                  {/* VCDB File Upload with Drag & Drop */}
                  <Card
                    style={{
                      background: vcdbDragActive ? "#f0f9ff" : "#ffffff",
                      border: vcdbDragActive
                        ? "2px dashed #3b82f6"
                        : "2px dashed #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                      transition: "all 0.15s ease",
                      cursor: "pointer",
                      minHeight: "200px",
                    }}
                    p="lg"
                    onDragEnter={handleVcdbDrag}
                    onDragLeave={handleVcdbDrag}
                    onDragOver={handleVcdbDrag}
                    onDrop={handleVcdbDrop}
                  >
                    <Stack align="center" justify="center" h="100%">
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <IconFileText size={24} color="#3b82f6" />
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <Text fw={600} size="lg" c="#1e293b" mb="xs">
                          VCDB Data File
                        </Text>
                        <Text size="sm" c="#64748b" mb="md">
                          Drag & drop or click to upload
                        </Text>
                      </div>

                      <FileInput
                        value={vcdbFile}
                        onChange={setVcdbFile}
                        accept=".csv,.xlsx,.json"
                        placeholder={
                          vcdbFile
                            ? vcdbFile.name
                            : "Select VCDB file (.csv, .xlsx, .json)"
                        }
                        style={{ width: "100%" }}
                        styles={{
                          input: {
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "12px",
                            fontSize: "14px",
                            fontWeight: 500,
                            textAlign: "center",
                          },
                        }}
                      />
                    </Stack>
                  </Card>
                </Grid.Col>

                <Grid.Col span={6}>
                  {/* Products File Upload with Drag & Drop */}
                  <Card
                    style={{
                      background: productsDragActive ? "#f0fdf4" : "#ffffff",
                      border: productsDragActive
                        ? "2px dashed #10b981"
                        : "2px dashed #e2e8f0",
                      borderRadius: "12px",
                      boxShadow: "0 1px 3px rgba(0, 0, 0, 0.05)",
                      transition: "all 0.15s ease",
                      cursor: "pointer",
                      minHeight: "200px",
                    }}
                    p="lg"
                    onDragEnter={handleProductsDrag}
                    onDragLeave={handleProductsDrag}
                    onDragOver={handleProductsDrag}
                    onDrop={handleProductsDrop}
                  >
                    <Stack align="center" justify="center" h="100%">
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "16px",
                        }}
                      >
                        <IconDatabase size={24} color="#10b981" />
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <Text fw={600} size="lg" c="#1e293b" mb="xs">
                          Products Data File
                        </Text>
                        <Text size="sm" c="#64748b" mb="md">
                          Drag & drop or click to upload
                        </Text>
                      </div>

                      <FileInput
                        value={productsFile}
                        onChange={setProductsFile}
                        accept=".csv,.xlsx,.json"
                        placeholder={
                          productsFile
                            ? productsFile.name
                            : "Select Products file (.csv, .xlsx, .json)"
                        }
                        style={{ width: "100%" }}
                        styles={{
                          input: {
                            backgroundColor: "#f8fafc",
                            border: "1px solid #e2e8f0",
                            borderRadius: "8px",
                            padding: "12px",
                            fontSize: "14px",
                            fontWeight: 500,
                            textAlign: "center",
                          },
                        }}
                      />
                    </Stack>
                  </Card>
                </Grid.Col>
              </Grid>

              {/* Upload Progress */}
              {uploadStatus === "uploading" && (
                <Card
                  p="lg"
                  style={{
                    background: "#f0f9ff",
                    border: "1px solid #dbeafe",
                    borderRadius: "12px",
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={600} size="lg" c="#1e293b">
                        Uploading Files...
                      </Text>
                      <Text fw={600} size="lg" c="#3b82f6">
                        {uploadProgress}%
                      </Text>
                    </Group>
                    <Progress
                      value={uploadProgress}
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
                    />
                  </Stack>
                </Card>
              )}

              {uploadStatus === "error" && (
                <Alert
                  icon={<IconAlertCircle size={20} />}
                  color="red"
                  radius="md"
                >
                  <Text fw={600} size="md">
                    Failed to upload files. Please try again.
                  </Text>
                </Alert>
              )}

              {/* Upload Button */}
              <Group justify="center">
                <Button
                  size="lg"
                  leftSection={<IconUpload size={20} />}
                  variant="filled"
                  onClick={handleFileUpload}
                  loading={uploadingFiles}
                  disabled={
                    !vcdbFile || !productsFile || uploadStatus === "uploading"
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
                    e.currentTarget.style.transform = "translateY(-1px)";
                    e.currentTarget.style.boxShadow =
                      "0 4px 12px rgba(59, 130, 246, 0.3)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = "translateY(0)";
                    e.currentTarget.style.boxShadow = "none";
                  }}
                >
                  Upload Files
                </Button>
              </Group>
            </Stack>
          </Card>
        )}

        {/* Step 2: Method Selection Section */}
        {currentStep === 2 && (
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
              {/* Back Button */}
              <Group>
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleBackToUpload}
                  style={{
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  Back to Upload
                </Button>
              </Group>

              <div>
                <Title order={2} c="#1e293b" fw={600} mb="xs">
                  Choose Fitment Method
                </Title>
                <Text size="md" c="#64748b">
                  Select how you want to apply fitments to your vehicle
                  configurations
                </Text>
              </div>

              <SimpleGrid cols={2} spacing="xl">
                {/* Manual Method Card */}
                <Card
                  style={{
                    background:
                      selectedMethod === "manual" ? "#f0f9ff" : "#fefefe",
                    border:
                      selectedMethod === "manual"
                        ? "2px solid #3b82f6"
                        : "2px solid #f1f5f9",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow:
                      selectedMethod === "manual"
                        ? "0 4px 12px rgba(59, 130, 246, 0.15)"
                        : "0 2px 4px rgba(0, 0, 0, 0.05)",
                  }}
                  p="xl"
                  onClick={handleManualMethodClick}
                >
                  <Stack align="center" gap="lg">
                    <div
                      style={{
                        background: "#f8fafc",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "8px",
                      }}
                    >
                      <IconUsers size={32} color="#3b82f6" />
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <Text fw={700} size="xl" c="#1e293b" mb="xs">
                        Manual Method
                      </Text>
                      <Text size="sm" c="#64748b" ta="center">
                        Apply fitments manually with full control over each
                        configuration
                      </Text>
                    </div>

                    {selectedMethod === "manual" && (
                      <Badge variant="light" color="blue" size="lg">
                        Selected
                      </Badge>
                    )}
                  </Stack>
                </Card>

                {/* AI Method Card */}
                <Card
                  style={{
                    background: selectedMethod === "ai" ? "#f0fdf4" : "#fefefe",
                    border:
                      selectedMethod === "ai"
                        ? "2px solid #10b981"
                        : "2px solid #f1f5f9",
                    borderRadius: "12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                    boxShadow:
                      selectedMethod === "ai"
                        ? "0 4px 12px rgba(16, 185, 129, 0.15)"
                        : "0 2px 4px rgba(0, 0, 0, 0.05)",
                  }}
                  p="xl"
                  onClick={handleAiMethodClick}
                >
                  <Stack align="center" gap="lg">
                    <div
                      style={{
                        background: "#f8fafc",
                        borderRadius: "12px",
                        padding: "16px",
                        marginBottom: "8px",
                      }}
                    >
                      <IconBrain size={32} color="#10b981" />
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <Text fw={700} size="xl" c="#1e293b" mb="xs">
                        AI Method
                      </Text>
                      <Text size="sm" c="#64748b" ta="center">
                        Let AI automatically generate and apply fitments based
                        on your data
                      </Text>
                    </div>

                    {selectedMethod === "ai" && (
                      <Badge variant="light" color="green" size="lg">
                        Selected
                      </Badge>
                    )}
                  </Stack>
                </Card>
              </SimpleGrid>
            </Stack>
          </Card>
        )}

        {/* Step 3: Manual Method Page */}
        {currentStep === 3 && (
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
              {/* Back Button */}
              <Group>
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleBackToMethodSelection}
                  style={{
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  Back to Method Selection
                </Button>
              </Group>

              <div>
                <Title order={2} c="#1e293b" fw={600} mb="xs">
                  Manual Fitment Configuration
                </Title>
                <Text size="md" c="#64748b">
                  Configure fitments manually with full control over each
                  setting
                </Text>
              </div>

              {/* Manual Method Stepper */}
              <Stepper active={manualStep - 1} onStepClick={setManualStep} allowNextStepsSelect={false}>
                <Stepper.Step 
                  label="Vehicle Selection" 
                  description="Select vehicle criteria"
                  icon={<IconCar size={18} />}
                >
                  <Card 
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      marginTop: "20px"
                    }}
                    p="lg"
                  >
                    <Stack gap="md">
                      <Text size="lg" fw={600} c="#1e293b" mb="sm">
                        Step 1: Select Vehicle Criteria
                      </Text>
                      
                      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="md">
                        <NumberInput
                          label="Year From"
                          placeholder="2010"
                          min={2010}
                          max={2025}
                          value={vehicleFilters.yearFrom}
                          onChange={(value) => setVehicleFilters(prev => ({ ...prev, yearFrom: value?.toString() || '' }))}
                        />
                        <NumberInput
                          label="Year To"
                          placeholder="2025"
                          min={2010}
                          max={2025}
                          value={vehicleFilters.yearTo}
                          onChange={(value) => setVehicleFilters(prev => ({ ...prev, yearTo: value?.toString() || '' }))}
                        />
                        <TextInput
                          label="Make"
                          placeholder="Toyota, Honda, Ford..."
                          value={vehicleFilters.make}
                          onChange={(e) => setVehicleFilters(prev => ({ ...prev, make: e.target.value }))}
                        />
                        <TextInput
                          label="Model"
                          placeholder="RAV4, Civic, F-150..."
                          value={vehicleFilters.model}
                          onChange={(e) => setVehicleFilters(prev => ({ ...prev, model: e.target.value }))}
                        />
                        <TextInput
                          label="Submodel"
                          placeholder="XLE, Si, XLT..."
                          value={vehicleFilters.submodel}
                          onChange={(e) => setVehicleFilters(prev => ({ ...prev, submodel: e.target.value }))}
                        />
                        <Select
                          label="Fuel Type"
                          placeholder="Select fuel type"
                          data={[
                            { value: 'Gas', label: 'Gas' },
                            { value: 'Diesel', label: 'Diesel' },
                            { value: 'Electric', label: 'Electric' },
                            { value: 'Hybrid', label: 'Hybrid' }
                          ]}
                          value={vehicleFilters.fuelType}
                          onChange={(value) => setVehicleFilters(prev => ({ ...prev, fuelType: value || '' }))}
                        />
                        <Select
                          label="Number of Doors"
                          placeholder="Select doors"
                          data={[
                            { value: '2', label: '2 Doors' },
                            { value: '4', label: '4 Doors' },
                            { value: '5', label: '5 Doors' }
                          ]}
                          value={vehicleFilters.numDoors}
                          onChange={(value) => setVehicleFilters(prev => ({ ...prev, numDoors: value || '' }))}
                        />
                        <Select
                          label="Drive Type"
                          placeholder="Select drive type"
                          data={[
                            { value: 'FWD', label: 'Front Wheel Drive' },
                            { value: 'RWD', label: 'Rear Wheel Drive' },
                            { value: 'AWD', label: 'All Wheel Drive' },
                            { value: '4WD', label: '4 Wheel Drive' }
                          ]}
                          value={vehicleFilters.driveType}
                          onChange={(value) => setVehicleFilters(prev => ({ ...prev, driveType: value || '' }))}
                        />
                        <Select
                          label="Body Type"
                          placeholder="Select body type"
                          data={[
                            { value: 'Sedan', label: 'Sedan' },
                            { value: 'SUV', label: 'SUV' },
                            { value: 'Truck', label: 'Truck' },
                            { value: 'Crossover', label: 'Crossover' },
                            { value: 'Coupe', label: 'Coupe' },
                            { value: 'Wagon', label: 'Wagon' }
                          ]}
                          value={vehicleFilters.bodyType}
                          onChange={(value) => setVehicleFilters(prev => ({ ...prev, bodyType: value || '' }))}
                        />
                      </SimpleGrid>
                      
                      <Group justify="flex-end" mt="lg">
                        <Button
                          onClick={() => {
                            // Simple search implementation using existing configs
                            const filtered = configurationsData?.filter(config => {
                              const matchesYear = (!vehicleFilters.yearFrom || config.year >= parseInt(vehicleFilters.yearFrom)) &&
                                                (!vehicleFilters.yearTo || config.year <= parseInt(vehicleFilters.yearTo));
                              const matchesMake = !vehicleFilters.make || config.make.toLowerCase().includes(vehicleFilters.make.toLowerCase());
                              const matchesModel = !vehicleFilters.model || config.model.toLowerCase().includes(vehicleFilters.model.toLowerCase());
                              const matchesSubmodel = !vehicleFilters.submodel || config.submodel.toLowerCase().includes(vehicleFilters.submodel.toLowerCase());
                              const matchesFuelType = !vehicleFilters.fuelType || config.fuelType === vehicleFilters.fuelType;
                              const matchesDoors = !vehicleFilters.numDoors || config.numDoors.toString() === vehicleFilters.numDoors;
                              const matchesDriveType = !vehicleFilters.driveType || config.driveType === vehicleFilters.driveType;
                              const matchesBodyType = !vehicleFilters.bodyType || config.bodyType === vehicleFilters.bodyType;
                              
                              return matchesYear && matchesMake && matchesModel && matchesSubmodel && 
                                     matchesFuelType && matchesDoors && matchesDriveType && matchesBodyType;
                            }) || [];
                            
                            setFilteredVehicles(filtered);
                            setManualStep(2);
                          }}
                          loading={loadingVehicles}
                          style={{
                            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                            border: "none",
                          }}
                        >
                          Search Vehicles
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Stepper.Step>
                
                <Stepper.Step 
                  label="Vehicle Selection" 
                  description="Choose specific vehicles"
                  icon={<IconList size={18} />}
                >
                  <Card 
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      marginTop: "20px"
                    }}
                    p="lg"
                  >
                    <Stack gap="md">
                      <Group justify="space-between">
                        <Text size="lg" fw={600} c="#1e293b">
                          Step 2: Select Vehicles ({filteredVehicles.length} found)
                        </Text>
                        <Group gap="sm">
                          <Button 
                            variant="light" 
                            size="sm"
                            onClick={() => setSelectedVehicles(filteredVehicles.map(v => v.id))}
                          >
                            Select All
                          </Button>
                          <Button 
                            variant="light" 
                            size="sm"
                            onClick={() => setSelectedVehicles([])}
                          >
                            Clear All
                          </Button>
                        </Group>
                      </Group>
                      
                      <ScrollArea h={400}>
                        <Stack gap="xs">
                          {filteredVehicles.map((vehicle) => (
                            <Card
                              key={vehicle.id}
                              p="md"
                              style={{
                                background: selectedVehicles.includes(vehicle.id) ? "#eff6ff" : "#ffffff",
                                border: selectedVehicles.includes(vehicle.id) ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                                borderRadius: "8px",
                                cursor: "pointer"
                              }}
                              onClick={() => {
                                const vehicleId = vehicle.id;
                                setSelectedVehicles(prev => 
                                  prev.includes(vehicleId) 
                                    ? prev.filter(id => id !== vehicleId)
                                    : [...prev, vehicleId]
                                );
                              }}
                            >
                              <Group justify="space-between">
                                <div>
                                  <Text fw={600} size="sm" c="#1e293b">
                                    {vehicle.year} {vehicle.make} {vehicle.model}
                                  </Text>
                                  <Text size="xs" c="#64748b">
                                    {vehicle.submodel} • {vehicle.driveType} • {vehicle.fuelType} • {vehicle.bodyType}
                                  </Text>
                                </div>
                                <Checkbox
                                  checked={selectedVehicles.includes(vehicle.id)}
                                  onChange={() => {}}
                                />
                              </Group>
                            </Card>
                          ))}
                        </Stack>
                      </ScrollArea>
                      
                      <Group justify="space-between" mt="lg">
                        <Button variant="light" onClick={() => setManualStep(1)}>
                          Back
                        </Button>
                        <Button
                          onClick={() => setManualStep(3)}
                          disabled={selectedVehicles.length === 0}
                          style={{
                            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                            border: "none",
                          }}
                        >
                          Continue ({selectedVehicles.length} selected)
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Stepper.Step>
                
                <Stepper.Step 
                  label="Fitment Details" 
                  description="Configure fitment settings"
                  icon={<IconSettings size={18} />}
                >
                  <Card 
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      marginTop: "20px"
                    }}
                    p="lg"
                  >
                    <Stack gap="md">
                      <Text size="lg" fw={600} c="#1e293b" mb="sm">
                        Step 3: Fitment Details
                      </Text>
                      
                      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="md">
                        <Select
                          label="Part"
                          placeholder="Select a part"
                          data={parts?.map(part => ({
                            value: part.id,
                            label: `${part.id} - ${part.description}`
                          })) || []}
                          value={fitmentDetails.partId}
                          onChange={(value) => setFitmentDetails(prev => ({ ...prev, partId: value || '' }))}
                          searchable
                        />
                        <Select
                          label="Part Type"
                          placeholder="Select part type"
                          data={partTypes?.map(type => ({
                            value: type.id,
                            label: type.description
                          })) || []}
                          value={fitmentDetails.partType}
                          onChange={(value) => setFitmentDetails(prev => ({ ...prev, partType: value || '' }))}
                          searchable
                        />
                        <TextInput
                          label="Position"
                          placeholder="Front, Rear, All, etc."
                          value={fitmentDetails.position}
                          onChange={(e) => setFitmentDetails(prev => ({ ...prev, position: e.target.value }))}
                        />
                        <NumberInput
                          label="Quantity"
                          placeholder="1"
                          min={1}
                          value={fitmentDetails.quantity}
                          onChange={(value) => setFitmentDetails(prev => ({ ...prev, quantity: value || 1 }))}
                        />
                      </SimpleGrid>
                      
                      <TextInput
                        label="Fitment Title"
                        placeholder="Enter fitment title"
                        value={fitmentDetails.title}
                        onChange={(e) => setFitmentDetails(prev => ({ ...prev, title: e.target.value }))}
                      />
                      
                      <Textarea
                        label="Description"
                        placeholder="Enter fitment description"
                        rows={3}
                        value={fitmentDetails.description}
                        onChange={(e) => setFitmentDetails(prev => ({ ...prev, description: e.target.value }))}
                      />
                      
                      <Textarea
                        label="Notes (Optional)"
                        placeholder="Additional notes or installation instructions"
                        rows={2}
                        value={fitmentDetails.notes}
                        onChange={(e) => setFitmentDetails(prev => ({ ...prev, notes: e.target.value }))}
                      />
                      
                      <Group justify="space-between" mt="lg">
                        <Button variant="light" onClick={() => setManualStep(2)}>
                          Back
                        </Button>
                        <Button
                          onClick={() => {
                            // Simulate applying fitment
                            setApplyingManualFitment(true);
                            setTimeout(() => {
                              setApplyingManualFitment(false);
                              toast.success(`Applied fitment to ${selectedVehicles.length} vehicles`);
                              handleBackToMethodSelection();
                            }, 2000);
                          }}
                          loading={applyingManualFitment}
                          disabled={!fitmentDetails.partId || !fitmentDetails.partType}
                          style={{
                            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                            border: "none",
                          }}
                        >
                          Apply Fitment
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                </Stepper.Step>
              </Stepper>
            </Stack>
          </Card>
        )}

        {/* Step 4: AI Method Page */}
        {currentStep === 4 && (
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
              {/* Back Button */}
              <Group>
                <Button
                  variant="subtle"
                  leftSection={<IconArrowLeft size={16} />}
                  onClick={handleBackToMethodSelection}
                  style={{
                    color: "#64748b",
                    fontWeight: 500,
                  }}
                >
                  Back to Method Selection
                </Button>
              </Group>

              <div>
                <Title order={2} c="#1e293b" fw={600} mb="xs">
                  AI Fitment Generation
                </Title>
                <Text size="md" c="#64748b">
                  Let our AI automatically generate optimal fitments based on
                  your data
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
                      e.currentTarget.style.transform = "translateY(-1px)";
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
        )}

        {/* AI Progress Display (only show on step 4) */}
        {currentStep === 4 && aiProcessing && (
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

              <ScrollArea h={400}>
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
                                aiFitments.map((fitment) => fitment.id),
                              );
                            } else {
                              setSelectedAiFitments([]);
                            }
                          }}
                        />
                      </Table.Th>
                      <Table.Th>Part ID</Table.Th>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Year</Table.Th>
                      <Table.Th>Make</Table.Th>
                      <Table.Th>Model</Table.Th>
                      <Table.Th>Submodel</Table.Th>
                      <Table.Th>Position</Table.Th>
                      <Table.Th>Confidence</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {aiFitments.map((fitment) => (
                      <Table.Tr key={fitment.id}>
                        <Table.Td
                          style={{
                            textAlign: "center",
                            verticalAlign: "middle",
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
                                  prev.filter((id) => id !== fitment.id),
                                );
                              }
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} c="#3b82f6">
                            {fitment.partId}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {fitment.part_description ||
                              fitment.partDescription}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{fitment.year}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500}>
                            {fitment.make}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{fitment.model}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" c="#64748b">
                            {fitment.submodel || "-"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" size="sm" color="blue">
                            {fitment.position}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
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
            </Stack>
          </Card>
        )}

        {/* Manual Method Interface */}
        {selectedMethod === "manual" && (
          <Grid gutter="xl">
            {/* Vehicle Configurations */}
            <Grid.Col span={8}>
              <Card
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
                p="lg"
              >
                <Stack gap="lg">
                  <Group justify="space-between">
                    <div>
                      <Title order={3} c="#1e293b" fw={600}>
                        Vehicle Configurations
                      </Title>
                      <Text size="sm" c="#64748b">
                        Search and select vehicle configurations
                      </Text>
                    </div>
                    <Badge variant="light" color="blue">
                      {selectedConfigs.length} selected
                    </Badge>
                  </Group>

                  <Grid>
                    <Grid.Col span={4}>
                      <NumberInput
                        label="Year From"
                        value={filters.yearFrom}
                        onChange={(value) =>
                          setFilters((prev) => ({
                            ...prev,
                            yearFrom: Number(value) || 2020,
                          }))
                        }
                        min={1900}
                        max={2030}
                      />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <NumberInput
                        label="Year To"
                        value={filters.yearTo}
                        onChange={(value) =>
                          setFilters((prev) => ({
                            ...prev,
                            yearTo: Number(value) || 2025,
                          }))
                        }
                        min={1900}
                        max={2030}
                      />
                    </Grid.Col>
                    <Grid.Col span={4}>
                      <TextInput
                        label="Make"
                        placeholder="e.g., Ford"
                        value={filters.make}
                        onChange={(event) =>
                          setFilters((prev) => ({
                            ...prev,
                            make: event.currentTarget.value,
                          }))
                        }
                      />
                    </Grid.Col>
                  </Grid>

                  <Group gap="sm">
                    <Button
                      leftSection={<IconSearch size={16} />}
                      variant="filled"
                      color="blue"
                      onClick={handleSearchVehicles}
                      loading={configsLoading}
                      size="sm"
                    >
                      Search Vehicles
                    </Button>
                    <Text size="sm" c="#64748b">
                      {configurations.length} configurations found
                    </Text>
                  </Group>

                  <ScrollArea h={300}>
                    <Table striped highlightOnHover>
                      <Table.Thead>
                        <Table.Tr>
                          <Table.Th>
                            <Checkbox
                              checked={
                                selectedConfigs.length ===
                                  configurations.length &&
                                configurations.length > 0
                              }
                              indeterminate={
                                selectedConfigs.length > 0 &&
                                selectedConfigs.length < configurations.length
                              }
                              onChange={(event) => {
                                if (event.currentTarget.checked) {
                                  setSelectedConfigs(
                                    configurations.map(
                                      (config: any) => config.id,
                                    ),
                                  );
                                } else {
                                  setSelectedConfigs([]);
                                }
                              }}
                            />
                          </Table.Th>
                          <Table.Th>Year</Table.Th>
                          <Table.Th>Make</Table.Th>
                          <Table.Th>Model</Table.Th>
                          <Table.Th>Submodel</Table.Th>
                        </Table.Tr>
                      </Table.Thead>
                      <Table.Tbody>
                        {configurations.map((config: any) => (
                          <Table.Tr key={config.id}>
                            <Table.Td>
                              <Checkbox
                                checked={selectedConfigs.includes(config.id)}
                                onChange={(event) => {
                                  if (event.currentTarget.checked) {
                                    setSelectedConfigs((prev) => [
                                      ...prev,
                                      config.id,
                                    ]);
                                  } else {
                                    setSelectedConfigs((prev) =>
                                      prev.filter((id) => id !== config.id),
                                    );
                                  }
                                }}
                              />
                            </Table.Td>
                            <Table.Td>{config.year}</Table.Td>
                            <Table.Td>{config.make}</Table.Td>
                            <Table.Td>{config.model}</Table.Td>
                            <Table.Td>{config.submodel || "-"}</Table.Td>
                          </Table.Tr>
                        ))}
                      </Table.Tbody>
                    </Table>
                  </ScrollArea>
                </Stack>
              </Card>
            </Grid.Col>

            {/* Fitment Form */}
            <Grid.Col span={4}>
              <Card
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
                p="lg"
              >
                <Stack gap="md">
                  <Title order={4} c="#1e293b" fw={600}>
                    Fitment Details
                  </Title>

                  <Select
                    label="Part"
                    placeholder="Select part"
                    value={fitmentForm.partId}
                    onChange={(value) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        partId: value || "",
                      }))
                    }
                    data={
                      Array.isArray(parts)
                        ? parts.map((part: any) => ({
                            value: part.id,
                            label: part.name,
                          }))
                        : []
                    }
                  />

                  <Select
                    label="Part Type"
                    placeholder="Select part type"
                    value={fitmentForm.partTypeId}
                    onChange={(value) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        partTypeId: value || "",
                      }))
                    }
                    data={
                      Array.isArray(partTypes)
                        ? partTypes.map((type: any) => ({
                            value: type.id,
                            label: type.name,
                          }))
                        : []
                    }
                  />

                  <Select
                    label="Position"
                    placeholder="Select position"
                    value={fitmentForm.position}
                    onChange={(value) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        position: value || "",
                      }))
                    }
                    data={positions}
                  />

                  <NumberInput
                    label="Quantity"
                    value={fitmentForm.quantity}
                    onChange={(value) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        quantity: Number(value) || 1,
                      }))
                    }
                    min={1}
                    max={10}
                  />

                  <Button
                    fullWidth
                    size="md"
                    variant="filled"
                    color="blue"
                    disabled={
                      selectedConfigs.length === 0 ||
                      !fitmentForm.partId ||
                      !fitmentForm.partTypeId
                    }
                    loading={applyingFitment}
                    onClick={handleApplyFitment}
                    style={{
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "14px",
                      height: "44px",
                    }}
                  >
                    Apply Fitment ({selectedConfigs.length} configs)
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        )}
      </Stack>
    </div>
  );
}
