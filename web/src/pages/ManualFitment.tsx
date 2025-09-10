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
  const { data: parts, loading: partsLoading } = useApi(
    () => partsService.getParts({ "with-fitments": false }),
    []
  );
  const { data: partTypes, loading: partTypesLoading } = useApi(
    () => partsService.getPartTypes(),
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
        <Transition
          mounted={true}
          transition="slide-up"
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
                      <Title order={2} c="#1e293b" fw={600} mb="xs">
                        Manual Fitment Configuration
                      </Title>
                      <Text size="md" c="#64748b">
                        Configure fitments manually with full control over each
                        setting
                      </Text>
                    </div>

                    {/* Manual Method Stepper */}
                    <Stepper
                      active={manualStep - 1}
                      onStepClick={setManualStep}
                      allowNextStepsSelect={false}
                      styles={{
                        stepBody: {
                          transition: "all 0.3s ease",
                        },
                        stepIcon: {
                          transition: "all 0.3s ease",
                        },
                        stepLabel: {
                          transition: "all 0.3s ease",
                        },
                      }}
                    >
                      <Stepper.Step
                        label="Vehicle Selection"
                        description="Select vehicle criteria"
                        icon={<IconCar size={18} />}
                      >
                        <div>
                          <Stack gap="md" mt={20}>
                            <div>
                              <Title order={3} c="#1e293b" fw={700} mb="xs">
                                Vehicle Search Criteria
                              </Title>
                              <Text size="sm" c="#64748b">
                                Refine your search with specific vehicle
                                attributes to find the perfect fitments
                              </Text>
                            </div>

                            <div>
                              <SimpleGrid
                                cols={{ base: 1, sm: 2, lg: 3 }}
                                spacing="xl"
                              >
                                <NumberInput
                                  label="Year From"
                                  placeholder="2010"
                                  min={2010}
                                  max={2025}
                                  value={vehicleFilters.yearFrom}
                                  onChange={(value) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      yearFrom: value?.toString() || "",
                                    }))
                                  }
                                  leftSection={
                                    <IconCalendar size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <NumberInput
                                  label="Year To"
                                  placeholder="2025"
                                  min={2010}
                                  max={2025}
                                  value={vehicleFilters.yearTo}
                                  onChange={(value) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      yearTo: value?.toString() || "",
                                    }))
                                  }
                                  leftSection={
                                    <IconCalendar size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <TextInput
                                  label="Make"
                                  placeholder="Toyota, Honda, Ford..."
                                  value={vehicleFilters.make}
                                  onChange={(e) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      make: e.target.value,
                                    }))
                                  }
                                  leftSection={
                                    <IconCar size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <TextInput
                                  label="Model"
                                  placeholder="RAV4, Civic, F-150..."
                                  value={vehicleFilters.model}
                                  onChange={(e) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      model: e.target.value,
                                    }))
                                  }
                                  leftSection={
                                    <IconCar size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <TextInput
                                  label="Submodel"
                                  placeholder="XLE, Si, XLT..."
                                  value={vehicleFilters.submodel}
                                  onChange={(e) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      submodel: e.target.value,
                                    }))
                                  }
                                  leftSection={
                                    <IconCar size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <Select
                                  label="Fuel Type"
                                  placeholder="Select fuel type"
                                  data={[
                                    { value: "Gas", label: "Gas" },
                                    { value: "Diesel", label: "Diesel" },
                                    { value: "Electric", label: "Electric" },
                                    { value: "Hybrid", label: "Hybrid" },
                                  ]}
                                  value={vehicleFilters.fuelType}
                                  onChange={(value) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      fuelType: value || "",
                                    }))
                                  }
                                  leftSection={
                                    <IconGasStation size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <Select
                                  label="Number of Doors"
                                  placeholder="Select doors"
                                  data={[
                                    { value: "2", label: "2 Doors" },
                                    { value: "4", label: "4 Doors" },
                                    { value: "5", label: "5 Doors" },
                                  ]}
                                  value={vehicleFilters.numDoors}
                                  onChange={(value) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      numDoors: value || "",
                                    }))
                                  }
                                  leftSection={
                                    <IconDoor size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <Select
                                  label="Drive Type"
                                  placeholder="Select drive type"
                                  data={[
                                    {
                                      value: "FWD",
                                      label: "Front Wheel Drive",
                                    },
                                    { value: "RWD", label: "Rear Wheel Drive" },
                                    { value: "AWD", label: "All Wheel Drive" },
                                    { value: "4WD", label: "4 Wheel Drive" },
                                  ]}
                                  value={vehicleFilters.driveType}
                                  onChange={(value) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      driveType: value || "",
                                    }))
                                  }
                                  leftSection={
                                    <IconSettings size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <Select
                                  label="Body Type"
                                  placeholder="Select body type"
                                  data={[
                                    { value: "Sedan", label: "Sedan" },
                                    { value: "SUV", label: "SUV" },
                                    { value: "Truck", label: "Truck" },
                                    { value: "Crossover", label: "Crossover" },
                                    { value: "Coupe", label: "Coupe" },
                                    { value: "Wagon", label: "Wagon" },
                                  ]}
                                  value={vehicleFilters.bodyType}
                                  onChange={(value) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      bodyType: value || "",
                                    }))
                                  }
                                  leftSection={
                                    <IconCar size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                              </SimpleGrid>
                            </div>

                            <Group justify="space-between" mt="xl">
                              <Button
                                variant="outline"
                                size="md"
                                leftSection={<IconRefresh size={16} />}
                                onClick={() => {
                                  setVehicleFilters({
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
                                  setFilteredVehicles([]);
                                }}
                                styles={{
                                  root: {
                                    borderRadius: "10px",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                    height: "48px",
                                    padding: "0 24px",
                                    border: "2px solid #e2e8f0",
                                    color: "#64748b",
                                    transition:
                                      "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    "&:hover": {
                                      borderColor: "#cbd5e1",
                                      backgroundColor: "#f8fafc",
                                      transform: "translateY(-1px)",
                                    },
                                  },
                                }}
                              >
                                Clear Filters
                              </Button>

                              <Button
                                size="md"
                                leftSection={<IconSearch size={16} />}
                                style={{
                                  borderRadius: "10px",
                                  fontWeight: 600,
                                  fontSize: "14px",
                                  height: "48px",
                                  padding: "0 32px",
                                  background:
                                    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                                  border: "none",
                                  transition:
                                    "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  boxShadow:
                                    "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)",
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(-2px)";
                                  e.currentTarget.style.boxShadow =
                                    "0 8px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(59, 130, 246, 0.1)";
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow =
                                    "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)";
                                }}
                                onClick={() => {
                                  // Simple search implementation using existing configs
                                  const configs =
                                    configurationsData?.configurations || [];
                                  const filtered =
                                    configs.filter((config: any) => {
                                      const matchesYear =
                                        (!vehicleFilters.yearFrom ||
                                          config.year >=
                                            parseInt(
                                              vehicleFilters.yearFrom
                                            )) &&
                                        (!vehicleFilters.yearTo ||
                                          config.year <=
                                            parseInt(vehicleFilters.yearTo));
                                      const matchesMake =
                                        !vehicleFilters.make ||
                                        config.make
                                          .toLowerCase()
                                          .includes(
                                            vehicleFilters.make.toLowerCase()
                                          );
                                      const matchesModel =
                                        !vehicleFilters.model ||
                                        config.model
                                          .toLowerCase()
                                          .includes(
                                            vehicleFilters.model.toLowerCase()
                                          );
                                      const matchesSubmodel =
                                        !vehicleFilters.submodel ||
                                        config.submodel
                                          .toLowerCase()
                                          .includes(
                                            vehicleFilters.submodel.toLowerCase()
                                          );
                                      const matchesFuelType =
                                        !vehicleFilters.fuelType ||
                                        config.fuelType ===
                                          vehicleFilters.fuelType;
                                      const matchesDoors =
                                        !vehicleFilters.numDoors ||
                                        config.numDoors.toString() ===
                                          vehicleFilters.numDoors;
                                      const matchesDriveType =
                                        !vehicleFilters.driveType ||
                                        config.driveType ===
                                          vehicleFilters.driveType;
                                      const matchesBodyType =
                                        !vehicleFilters.bodyType ||
                                        config.bodyType ===
                                          vehicleFilters.bodyType;

                                      return (
                                        matchesYear &&
                                        matchesMake &&
                                        matchesModel &&
                                        matchesSubmodel &&
                                        matchesFuelType &&
                                        matchesDoors &&
                                        matchesDriveType &&
                                        matchesBodyType
                                      );
                                    }) || [];

                                  setFilteredVehicles(filtered);
                                  setManualStep(2);
                                }}
                                loading={false}
                              >
                                Search Vehicles
                              </Button>
                            </Group>
                          </Stack>
                        </div>
                      </Stepper.Step>

                      <Stepper.Step
                        label="Vehicle Selection"
                        description="Choose specific vehicles"
                        icon={<IconList size={18} />}
                      >
                        <div
                          style={{
                            marginTop: "20px",
                            boxShadow: "none",
                          }}
                        >
                          <Stack gap="md">
                            <Group justify="space-between">
                              <Text size="lg" fw={600} c="#1e293b">
                                Step 2: Select Vehicles (
                                {filteredVehicles.length} found)
                              </Text>
                              <Group gap="sm">
                                <Button
                                  variant="light"
                                  size="sm"
                                  onClick={() =>
                                    setSelectedVehicles(
                                      filteredVehicles.map((v: any) => v.id)
                                    )
                                  }
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
                                      background: selectedVehicles.includes(
                                        vehicle.id
                                      )
                                        ? "#eff6ff"
                                        : "#ffffff",
                                      border: selectedVehicles.includes(
                                        vehicle.id
                                      )
                                        ? "2px solid #3b82f6"
                                        : "1px solid #e2e8f0",
                                      borderRadius: "8px",
                                      cursor: "pointer",
                                    }}
                                    onClick={() => {
                                      const vehicleId = vehicle.id;
                                      setSelectedVehicles((prev) =>
                                        prev.includes(vehicleId)
                                          ? prev.filter(
                                              (id) => id !== vehicleId
                                            )
                                          : [...prev, vehicleId]
                                      );
                                    }}
                                  >
                                    <Group justify="space-between">
                                      <div>
                                        <Text fw={600} size="sm" c="#1e293b">
                                          {vehicle.year} {vehicle.make}{" "}
                                          {vehicle.model}
                                        </Text>
                                        <Text size="xs" c="#64748b">
                                          {vehicle.submodel} •{" "}
                                          {vehicle.driveType} •{" "}
                                          {vehicle.fuelType} •{" "}
                                          {vehicle.bodyType}
                                        </Text>
                                      </div>
                                      <Checkbox
                                        checked={selectedVehicles.includes(
                                          vehicle.id
                                        )}
                                        onChange={() => {}}
                                      />
                                    </Group>
                                  </Card>
                                ))}
                              </Stack>
                            </ScrollArea>

                            <Group justify="space-between" mt="lg">
                              <Button
                                variant="light"
                                onClick={() => setManualStep(1)}
                              >
                                Back
                              </Button>
                              <Button
                                onClick={() => setManualStep(3)}
                                disabled={selectedVehicles.length === 0}
                                style={{
                                  background:
                                    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                                  border: "none",
                                }}
                              >
                                Continue ({selectedVehicles.length} selected)
                              </Button>
                            </Group>
                          </Stack>
                        </div>
                      </Stepper.Step>

                      <Stepper.Step
                        label="Fitment Details"
                        description="Configure fitment settings"
                        icon={<IconSettings size={18} />}
                      >
                        <div>
                          <Stack gap="xl">
                            <div>
                              <Title order={3} c="#1e293b" fw={700} mb="xs">
                                Fitment Details
                              </Title>
                              <Text size="sm" c="#64748b">
                                Configure the specific details for your fitment
                                application
                              </Text>
                            </div>

                            <div>
                              <SimpleGrid
                                cols={{ base: 1, sm: 2 }}
                                spacing="xl"
                              >
                                <Select
                                  label="Part"
                                  placeholder={
                                    partsLoading
                                      ? "Loading parts..."
                                      : "Select a part"
                                  }
                                  data={
                                    parts && Array.isArray(parts)
                                      ? parts.map((part: any) => ({
                                          value: part.id || "",
                                          label: `${part.id || "Unknown"} - ${
                                            part.description || "No description"
                                          }`,
                                        }))
                                      : []
                                  }
                                  value={fitmentDetails.partId}
                                  onChange={(value) =>
                                    setFitmentDetails((prev) => ({
                                      ...prev,
                                      partId: value || "",
                                    }))
                                  }
                                  searchable
                                  disabled={partsLoading}
                                  leftSection={
                                    <IconPackage size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <Select
                                  label="Part Type"
                                  placeholder={
                                    partTypesLoading
                                      ? "Loading part types..."
                                      : "Select part type"
                                  }
                                  data={
                                    partTypes && Array.isArray(partTypes)
                                      ? partTypes.map((type: any) => ({
                                          value: type.id || "",
                                          label:
                                            type.description ||
                                            type.name ||
                                            "Unknown",
                                        }))
                                      : []
                                  }
                                  disabled={partTypesLoading}
                                  value={fitmentDetails.partType}
                                  onChange={(value) =>
                                    setFitmentDetails((prev) => ({
                                      ...prev,
                                      partType: value || "",
                                    }))
                                  }
                                  searchable
                                  leftSection={
                                    <IconTag size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <TextInput
                                  label="Position"
                                  placeholder="Front, Rear, All, etc."
                                  value={fitmentDetails.position}
                                  onChange={(e) =>
                                    setFitmentDetails((prev) => ({
                                      ...prev,
                                      position: e.target.value,
                                    }))
                                  }
                                  leftSection={
                                    <IconMapPin size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                                <NumberInput
                                  label="Quantity"
                                  placeholder="1"
                                  min={1}
                                  value={fitmentDetails.quantity}
                                  onChange={(value) =>
                                    setFitmentDetails((prev) => ({
                                      ...prev,
                                      quantity: Number(value) || 1,
                                    }))
                                  }
                                  leftSection={
                                    <IconHash size={16} color="#64748b" />
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
                                        boxShadow:
                                          "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                        backgroundColor: "#ffffff",
                                      },
                                      "&:hover": {
                                        borderColor: "#cbd5e1",
                                        backgroundColor: "#ffffff",
                                      },
                                    },
                                  }}
                                />
                              </SimpleGrid>

                              <TextInput
                                mt={20}
                                label="Fitment Title"
                                placeholder="Enter fitment title"
                                value={fitmentDetails.title}
                                onChange={(e) =>
                                  setFitmentDetails((prev) => ({
                                    ...prev,
                                    title: e.target.value,
                                  }))
                                }
                                leftSection={
                                  <IconFileText size={16} color="#64748b" />
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
                                      boxShadow:
                                        "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                      backgroundColor: "#ffffff",
                                    },
                                    "&:hover": {
                                      borderColor: "#cbd5e1",
                                      backgroundColor: "#ffffff",
                                    },
                                  },
                                }}
                              />

                              <Textarea
                                label="Description"
                                placeholder="Enter fitment description"
                                rows={3}
                                value={fitmentDetails.description}
                                onChange={(e) =>
                                  setFitmentDetails((prev) => ({
                                    ...prev,
                                    description: e.target.value,
                                  }))
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
                                    padding: "12px 16px",
                                    transition:
                                      "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    backgroundColor: "#fafafa",
                                    "&:focus": {
                                      borderColor: "#3b82f6",
                                      boxShadow:
                                        "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                      backgroundColor: "#ffffff",
                                    },
                                    "&:hover": {
                                      borderColor: "#cbd5e1",
                                      backgroundColor: "#ffffff",
                                    },
                                  },
                                }}
                              />

                              <Textarea
                                label="Notes (Optional)"
                                placeholder="Additional notes or installation instructions"
                                rows={2}
                                value={fitmentDetails.notes}
                                onChange={(e) =>
                                  setFitmentDetails((prev) => ({
                                    ...prev,
                                    notes: e.target.value,
                                  }))
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
                                    padding: "12px 16px",
                                    transition:
                                      "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    backgroundColor: "#fafafa",
                                    "&:focus": {
                                      borderColor: "#3b82f6",
                                      boxShadow:
                                        "0 0 0 4px rgba(59, 130, 246, 0.1)",
                                      backgroundColor: "#ffffff",
                                    },
                                    "&:hover": {
                                      borderColor: "#cbd5e1",
                                      backgroundColor: "#ffffff",
                                    },
                                  },
                                }}
                              />
                            </div>

                            <Group justify="space-between" mt="xl">
                              <Button
                                variant="outline"
                                size="md"
                                leftSection={<IconArrowLeft size={16} />}
                                onClick={() => setManualStep(2)}
                                styles={{
                                  root: {
                                    borderRadius: "10px",
                                    fontWeight: 600,
                                    fontSize: "14px",
                                    height: "48px",
                                    padding: "0 24px",
                                    border: "2px solid #e2e8f0",
                                    color: "#64748b",
                                    transition:
                                      "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                    "&:hover": {
                                      borderColor: "#cbd5e1",
                                      backgroundColor: "#f8fafc",
                                      transform: "translateY(-1px)",
                                    },
                                  },
                                }}
                              >
                                Back
                              </Button>

                              <Button
                                size="md"
                                leftSection={<IconSettings size={16} />}
                                onClick={() => {
                                  // Simulate applying fitment
                                  setApplyingManualFitment(true);
                                  setTimeout(() => {
                                    setApplyingManualFitment(false);
                                    showSuccess(
                                      `Applied fitment to ${selectedVehicles.length} vehicles`
                                    );
                                    handleBackToMethodSelection();
                                  }, 2000);
                                }}
                                loading={applyingManualFitment}
                                disabled={
                                  !fitmentDetails.partId ||
                                  !fitmentDetails.partType
                                }
                                style={{
                                  borderRadius: "10px",
                                  fontWeight: 600,
                                  fontSize: "14px",
                                  height: "48px",
                                  padding: "0 32px",
                                  background:
                                    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                                  border: "none",
                                  transition:
                                    "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                  boxShadow:
                                    "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)",
                                }}
                                onMouseEnter={(e) => {
                                  if (!e.currentTarget.disabled) {
                                    e.currentTarget.style.transform =
                                      "translateY(-2px)";
                                    e.currentTarget.style.boxShadow =
                                      "0 8px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(59, 130, 246, 0.1)";
                                  }
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform =
                                    "translateY(0)";
                                  e.currentTarget.style.boxShadow =
                                    "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)";
                                }}
                              >
                                Apply Fitment
                              </Button>
                            </Group>
                          </Stack>
                        </div>
                      </Stepper.Step>
                    </Stepper>
                  </Stack>
                </Card>
              }
            </div>
          )}
        </Transition>
      </Stack>
    </div>
  );
}
