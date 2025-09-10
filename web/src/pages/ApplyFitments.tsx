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
  Textarea,
  Group,
  Stack,
  Divider,
  Badge,
  ActionIcon,
  ScrollArea,
  FileInput,
  Progress,
  Alert,
  Paper,
  Container,
  SimpleGrid,
} from "@mantine/core";
import {
  IconSearch,
  IconDownload,
  IconCar,
  IconSettings,
  IconUpload,
  IconFileText,
  IconRobot,
  IconCheck,
  IconAlertCircle,
  IconBrain,
  IconUsers,
  IconDatabase,
  IconChevronRight,
  IconCloudUpload,
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
  const [currentStep, setCurrentStep] = useState<1 | 2>(1); // 1 = Upload Files, 2 = Choose Method

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
  const [appliedFitmentsCount, setAppliedFitmentsCount] = useState<
    number | null
  >(null);

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
  const wheelTypes = ["Steel", "Alloy", "Forged", "Carbon Fiber"];
  const liftHeights = ["Stock", "0-1in", "1-2in", "2-3in", "3-4in", "4+in"];

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
    try {
      // Call Azure AI Foundry API
      const result: any = await processAiFitment(() =>
        fitmentUploadService.processAiFitment(sessionId),
      );

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
        setAiFitments(fitments);
        // Auto-select all fitments by default
        setSelectedAiFitments(fitments.map((fitment: any) => fitment.id));
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
      console.error("AI fitment error:", error);
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
        setAppliedFitmentsCount(result.applied_count);

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
        background: "#f8fafc",
        padding: "24px",
      }}
    >
      <Container size="xl">
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
                        color="blue"
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
                    color="blue"
                    onClick={handleFileUpload}
                    loading={uploadingFiles}
                    disabled={
                      !vcdbFile || !productsFile || uploadStatus === "uploading"
                    }
                    style={{
                      borderRadius: "8px",
                      fontSize: "16px",
                      fontWeight: 600,
                      padding: "12px 24px",
                      height: "48px",
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
                <div>
                  <Title order={2} c="#1e293b" fw={600} mb="xs">
                    Choose Fitment Method
                  </Title>
                  <Text size="md" c="#64748b">
                    Select how you want to apply fitments to your vehicle configurations
                  </Text>
                </div>

                <SimpleGrid cols={2} spacing="xl">
                  {/* Manual Method Card */}
                  <Card
                    style={{
                      background: selectedMethod === "manual" ? "#f0f9ff" : "#fefefe",
                      border: selectedMethod === "manual" 
                        ? "2px solid #3b82f6" 
                        : "2px solid #f1f5f9",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: selectedMethod === "manual" 
                        ? "0 4px 12px rgba(59, 130, 246, 0.15)" 
                        : "0 2px 4px rgba(0, 0, 0, 0.05)",
                    }}
                    p="xl"
                    onClick={() => setSelectedMethod("manual")}
                  >
                    <Stack align="center" gap="lg">
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "16px",
                        }}
                      >
                        <IconUsers size={32} color="#3b82f6" />
                      </div>
                      
                      <div style={{ textAlign: "center" }}>
                        <Text fw={700} size="xl" c="#1e293b" mb="xs">
                          Manual Method
                        </Text>
                        <Text size="sm" c="#64748b" ta="center">
                          Apply fitments manually with full control over each configuration
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
                      border: selectedMethod === "ai" 
                        ? "2px solid #10b981" 
                        : "2px solid #f1f5f9",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: selectedMethod === "ai" 
                        ? "0 4px 12px rgba(16, 185, 129, 0.15)" 
                        : "0 2px 4px rgba(0, 0, 0, 0.05)",
                    }}
                    p="xl"
                    onClick={() => setSelectedMethod("ai")}
                  >
                    <Stack align="center" gap="lg">
                      <div
                        style={{
                          background: "#f8fafc",
                          borderRadius: "12px",
                          padding: "16px",
                        }}
                      >
                        <IconBrain size={32} color="#10b981" />
                      </div>
                      
                      <div style={{ textAlign: "center" }}>
                        <Text fw={700} size="xl" c="#1e293b" mb="xs">
                          AI Method
                        </Text>
                        <Text size="sm" c="#64748b" ta="center">
                          Let AI automatically generate and apply fitments based on your data
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

                {/* Action Buttons */}
                {selectedMethod && (
                  <Group justify="center" mt="lg">
                    {selectedMethod === "ai" && (
                      <Button
                        size="lg"
                        leftSection={<IconRobot size={20} />}
                        variant="filled"
                        color="green"
                        onClick={handleAiFitment}
                        loading={aiProcessing}
                        style={{
                          borderRadius: "8px",
                          fontSize: "16px",
                          fontWeight: 600,
                          padding: "12px 24px",
                          height: "48px",
                        }}
                      >
                        Generate AI Fitments
                      </Button>
                    )}
                  </Group>
                )}
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleExportFitments("csv")}
                    >
                      Export CSV
                    </Button>
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
                        <Table.Th>
                          <Checkbox
                            checked={selectedAiFitments.length === aiFitments.length}
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
                          />
                        </Table.Th>
                        <Table.Th>Part</Table.Th>
                        <Table.Th>Vehicle</Table.Th>
                        <Table.Th>Position</Table.Th>
                        <Table.Th>Confidence</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {aiFitments.map((fitment) => (
                        <Table.Tr key={fitment.id}>
                          <Table.Td>
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
                          <Table.Td>
                            <Text size="sm" fw={500}>
                              {fitment.part_name}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm">
                              {fitment.year} {fitment.make} {fitment.model}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Badge variant="light" size="sm">
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
                              yearFrom: value || 2020,
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
                              yearTo: value || 2025,
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
                                  selectedConfigs.length === configurations.length &&
                                  configurations.length > 0
                                }
                                indeterminate={
                                  selectedConfigs.length > 0 &&
                                  selectedConfigs.length < configurations.length
                                }
                                onChange={(event) => {
                                  if (event.currentTarget.checked) {
                                    setSelectedConfigs(
                                      configurations.map((config: any) => config.id)
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
                                        prev.filter((id) => id !== config.id)
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
                        parts?.map((part: any) => ({
                          value: part.id,
                          label: part.name,
                        })) || []
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
                        partTypes?.map((type: any) => ({
                          value: type.id,
                          label: type.name,
                        })) || []
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
                          quantity: value || 1,
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
      </Container>
    </div>
  );
}