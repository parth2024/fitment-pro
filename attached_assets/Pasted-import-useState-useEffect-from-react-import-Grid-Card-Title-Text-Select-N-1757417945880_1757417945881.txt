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
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "completed" | "error"
  >("idle");
  const [uploadedFiles, setUploadedFiles] = useState<{
    vcdb: boolean;
    products: boolean;
  }>({ vcdb: false, products: false });
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Fitment method selection
  const [selectedMethod, setSelectedMethod] = useState<"manual" | "ai" | null>(
    null
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
    []
  ) as any;
  const { data: parts } = useApi(
    () => partsService.getParts({ "with-fitments": false }),
    []
  );
  const { data: partTypes } = useApi(
    () => partsService.getPartTypes(),
    []
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
        fitmentUploadService.uploadFiles(vcdbFile, productsFile)
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log("Upload result:", result);

      if (result && result.data && result.data.session) {
        setUploadStatus("completed");
        setUploadedFiles({ vcdb: true, products: true });
        setSessionId(result.data.session.id);
        toast.success("Files uploaded successfully!");
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
        fitmentUploadService.processAiFitment(sessionId)
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
            Object.keys(result.data)
          );
        }
        toast.error(
          "No fitments were generated. Please check your uploaded files and try again."
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
        fitmentUploadService.applyAiFitments(sessionId, selectedAiFitments)
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
          }
        );
        setSelectedAiFitments([]);
        setAiFitments([]);
        setAppliedFitmentsCount(result.applied_count);

        // Show success modal with navigation option
        setTimeout(() => {
          if (
            confirm(
              `Successfully applied ${result.applied_count} fitments! Would you like to view them in the Fitments page?`
            )
          ) {
            window.location.href = "/fitments";
          }
        }, 1000);

        // Reset the method selection to allow new uploads
        setSelectedMethod(null);
        setUploadedFiles({ vcdb: false, products: false });
        setSessionId(null);
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
          param.wheelDiameter || param.tireDiameter || param.backspacing
      ),
      title: fitmentForm.title,
      description: fitmentForm.description,
      notes: fitmentForm.notes,
    };

    const result = await applyFitment(() =>
      fitmentsService.createFitment(fitmentData)
    );
    if (result) {
      toast.success(
        `Fitment applied to ${selectedConfigs.length} configurations`
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
        padding: "clamp(16px, 4vw, 32px)",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        minHeight: "calc(100vh - 80px)",
      }}
    >
      <div style={{ marginBottom: "clamp(20px, 4vw, 32px)" }}>
        <h1
          style={{
            fontSize: "clamp(24px, 5vw, 32px)",
            fontWeight: 700,
            background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            marginBottom: "8px",
            margin: 0,
            lineHeight: 1.2,
          }}
        >
          Apply Fitments
        </h1>
        <p
          style={{
            color: "#64748b",
            fontSize: "clamp(14px, 3vw, 18px)",
            margin: 0,
            fontWeight: 400,
            lineHeight: 1.4,
          }}
        >
          Upload files and apply fitments using manual or AI-powered methods
        </p>
      </div>

      {/* File Upload Section */}
      {!uploadedFiles.vcdb || !uploadedFiles.products ? (
        <Card
          shadow="lg"
          padding="xl"
          radius="xl"
          withBorder
          style={{ marginBottom: "24px" }}
        >
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Title
                  order={3}
                  style={{
                    color: "#1e293b",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  Upload Required Files
                </Title>
                <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                  Upload VCDB data and Products data to proceed
                </Text>
              </div>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconUpload size={20} color="white" />
              </div>
            </Group>

            <Grid>
              <Grid.Col span={6}>
                <FileInput
                  label="VCDB Data File"
                  placeholder="Select VCDB file (.csv, .xlsx, .json)"
                  value={vcdbFile}
                  onChange={setVcdbFile}
                  accept=".csv,.xlsx,.json"
                  leftSection={<IconFileText size={16} />}
                  size="md"
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <FileInput
                  label="Products Data File"
                  placeholder="Select Products file (.csv, .xlsx, .json)"
                  value={productsFile}
                  onChange={setProductsFile}
                  accept=".csv,.xlsx,.json"
                  leftSection={<IconFileText size={16} />}
                  size="md"
                />
              </Grid.Col>
            </Grid>

            {uploadStatus === "uploading" && (
              <div>
                <Text size="sm" fw={500} mb="xs">
                  Uploading files...
                </Text>
                <Progress value={uploadProgress} size="lg" radius="xl" />
              </div>
            )}

            {uploadStatus === "error" && (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="red"
                variant="light"
              >
                Failed to upload files. Please try again.
              </Alert>
            )}

            <Button
              fullWidth
              leftSection={<IconUpload size={16} />}
              variant="gradient"
              gradient={{ from: "primary.6", to: "secondary.6", deg: 135 }}
              onClick={handleFileUpload}
              loading={uploadingFiles}
              disabled={
                !vcdbFile || !productsFile || uploadStatus === "uploading"
              }
              size="md"
              radius="lg"
            >
              Upload Files
            </Button>
          </Stack>
        </Card>
      ) : (
        /* Method Selection Section */
        <Card
          shadow="lg"
          padding="xl"
          radius="xl"
          withBorder
          style={{ marginBottom: "24px" }}
        >
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Title
                  order={3}
                  style={{
                    color: "#1e293b",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  Choose Fitment Method
                </Title>
                <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                  Select how you want to apply fitments
                </Text>
              </div>
              {uploadedFiles.vcdb && uploadedFiles.products ? (
                <Badge
                  variant="gradient"
                  gradient={{ from: "green.6", to: "teal.6", deg: 135 }}
                  size="lg"
                >
                  Files Ready
                </Badge>
              ) : (
                <Badge variant="light" color="orange" size="lg">
                  Upload Files First
                </Badge>
              )}
            </Group>

            <Grid>
              <Grid.Col span={6}>
                <Paper
                  p="xl"
                  radius="lg"
                  withBorder
                  style={{
                    cursor: "pointer",
                    border:
                      selectedMethod === "manual"
                        ? "2px solid #3b82f6"
                        : "1px solid #e2e8f0",
                    background:
                      selectedMethod === "manual"
                        ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                        : "white",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setSelectedMethod("manual")}
                >
                  <Stack align="center" gap="md">
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                        borderRadius: "16px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconSettings size={24} color="white" />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <Title order={4} style={{ marginBottom: "8px" }}>
                        Manual Fitment
                      </Title>
                      <Text size="sm" c="dimmed">
                        Apply fitments manually using the existing interface
                      </Text>
                    </div>
                  </Stack>
                </Paper>
              </Grid.Col>
              <Grid.Col span={6}>
                <Paper
                  p="xl"
                  radius="lg"
                  withBorder
                  style={{
                    cursor: "pointer",
                    border:
                      selectedMethod === "ai"
                        ? "2px solid #8b5cf6"
                        : "1px solid #e2e8f0",
                    background:
                      selectedMethod === "ai"
                        ? "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)"
                        : "white",
                    transition: "all 0.2s ease",
                  }}
                  onClick={() => setSelectedMethod("ai")}
                >
                  <Stack align="center" gap="md">
                    <div
                      style={{
                        background:
                          "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                        borderRadius: "16px",
                        padding: "16px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      }}
                    >
                      <IconBrain size={24} color="white" />
                    </div>
                    <div style={{ textAlign: "center" }}>
                      <Title order={4} style={{ marginBottom: "8px" }}>
                        AI Fitment
                      </Title>
                      <Text size="sm" c="dimmed">
                        Use AI to automatically generate fitments
                      </Text>
                    </div>
                  </Stack>
                </Paper>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>
      )}

      {/* Success Message Section */}
      {appliedFitmentsCount !== null && (
        <Card
          shadow="lg"
          padding="xl"
          radius="xl"
          withBorder
          style={{
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            border: "2px solid #10b981",
            marginBottom: "24px",
          }}
        >
          <Stack gap="lg" align="center">
            <Group gap="sm">
              <IconCheck size={32} color="white" />
              <Title order={3} c="white">
                Fitments Applied Successfully!
              </Title>
            </Group>
            <Text size="lg" c="white" ta="center" fw={500}>
              {appliedFitmentsCount} AI-generated fitments have been applied to
              your database.
            </Text>
            <Group>
              <Button
                variant="white"
                color="green"
                size="lg"
                leftSection={<IconDownload size={16} />}
                onClick={() => (window.location.href = "/fitments")}
              >
                View Applied Fitments
              </Button>
              <Button
                variant="outline"
                color="white"
                size="lg"
                onClick={() => {
                  setAppliedFitmentsCount(null);
                  setSelectedMethod(null);
                  setUploadedFiles({ vcdb: false, products: false });
                  setSessionId(null);
                }}
              >
                Start New Upload
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* AI Fitment Processing Section */}
      {selectedMethod === "ai" && (
        <Card
          shadow="lg"
          padding="xl"
          radius="xl"
          withBorder
          style={{ marginBottom: "24px" }}
        >
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Title
                  order={3}
                  style={{
                    color: "#1e293b",
                    fontWeight: 700,
                    marginBottom: "4px",
                  }}
                >
                  AI Fitment Processing
                </Title>
                <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                  Let AI analyze your data and generate fitments
                </Text>
              </div>
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #8b5cf6 0%, #7c3aed 100%)",
                  borderRadius: "12px",
                  padding: "12px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <IconRobot size={20} color="white" />
              </div>
            </Group>

            <Alert icon={<IconBrain size={16} />} color="blue" variant="light">
              <Text size="sm">
                AI will analyze your VCDB and Products data to automatically
                generate fitment combinations. You'll be able to review and
                approve the suggested fitments before applying them.
              </Text>
            </Alert>

            {uploadedFiles.vcdb && uploadedFiles.products ? (
              <Button
                fullWidth
                bg="violet.6"
                leftSection={<IconRobot size={16} />}
                variant="gradient"
                gradient={{ from: "violet.6", to: "purple.6", deg: 135 }}
                onClick={handleAiFitment}
                loading={aiProcessing}
                size="lg"
                radius="lg"
              >
                {aiProcessing
                  ? "Processing with AI..."
                  : "Generate AI Fitments"}
              </Button>
            ) : (
              <Alert
                icon={<IconAlertCircle size={16} />}
                color="orange"
                variant="light"
              >
                <Text size="sm">
                  Please upload both VCDB and Products files first to enable AI
                  processing.
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>
      )}

      {/* AI Generated Fitments Preview Section */}
      {(() => {
        console.log(
          "Debug - selectedMethod:",
          selectedMethod,
          "aiFitments.length:",
          aiFitments.length,
          "aiFitments:",
          aiFitments
        );
        return null;
      })()}
      {selectedMethod === "ai" && (aiFitments.length > 0 || true) && (
        <Card
          shadow="lg"
          padding="xl"
          radius="xl"
          withBorder
          style={{
            background: "linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)",
            border: "2px solid #8b5cf6",
            marginBottom: "24px",
          }}
        >
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Group gap="sm" mb="xs">
                  <IconBrain size={24} color="#8b5cf6" />
                  <Title order={3} c="violet">
                    AI Generated Fitments
                  </Title>
                </Group>
                <Text size="sm" c="dimmed">
                  {aiFitments.length > 0
                    ? "Review and validate the AI-generated fitments below. Check/uncheck fitments based on your validation."
                    : "DEBUG: Section is showing but no fitments yet. Check console for API response details."}
                </Text>
              </div>
              {aiFitments.length > 0 && (
                <Group>
                  <Badge variant="light" color="violet" size="lg">
                    Total: {aiFitments.length}
                  </Badge>
                  <Badge variant="light" color="green" size="lg">
                    Selected: {selectedAiFitments.length}
                  </Badge>
                </Group>
              )}
            </Group>

            {/* Summary Stats */}
            {aiFitments.length > 0 && (
              <Group
                justify="space-between"
                p="md"
                style={{
                  background:
                    "linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)",
                  borderRadius: "12px",
                  border: "1px solid #c4b5fd",
                }}
              >
                <Group>
                  <Badge variant="light" color="green" size="lg">
                    High Confidence:{" "}
                    {aiFitments.filter((f: any) => f.confidence > 0.8).length}
                  </Badge>
                  <Badge variant="light" color="yellow" size="lg">
                    Medium Confidence:{" "}
                    {
                      aiFitments.filter(
                        (f: any) => f.confidence > 0.6 && f.confidence <= 0.8
                      ).length
                    }
                  </Badge>
                  <Badge variant="light" color="red" size="lg">
                    Low Confidence:{" "}
                    {aiFitments.filter((f: any) => f.confidence <= 0.6).length}
                  </Badge>
                </Group>
                <Text size="sm" fw={500} c="violet">
                  Select fitments to publish or export. Export buttons will
                  download selected fitments (or all if none selected).
                </Text>
              </Group>
            )}

            {/* Fitments Table */}
            {aiFitments.length > 0 && (
              <ScrollArea h={400}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>
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
                                aiFitments.map((fitment: any) => fitment.id)
                              );
                            } else {
                              setSelectedAiFitments([]);
                            }
                          }}
                        />
                      </Table.Th>
                      <Table.Th>Part ID</Table.Th>
                      <Table.Th>Part Description</Table.Th>
                      <Table.Th>Vehicle Details</Table.Th>
                      <Table.Th>Position</Table.Th>
                      <Table.Th>Quantity</Table.Th>
                      <Table.Th>Confidence</Table.Th>
                      <Table.Th>AI Reasoning</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {aiFitments.map((fitment: any) => (
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
                          <Text fw={500} size="sm" c="violet">
                            {fitment.part_id}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" lineClamp={2} maw={200}>
                            {fitment.part_description}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <div>
                            <Text size="sm" fw={500}>
                              {fitment.year} {fitment.make} {fitment.model}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {fitment.submodel} • {fitment.drive_type}
                            </Text>
                          </div>
                        </Table.Td>
                        <Table.Td>
                          <Badge variant="light" size="sm" color="cyan">
                            {fitment.position || "Universal"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={500} ta="center">
                            {fitment.quantity}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            variant="light"
                            color={
                              fitment.confidence > 0.8
                                ? "green"
                                : fitment.confidence > 0.6
                                ? "yellow"
                                : "red"
                            }
                            size="sm"
                          >
                            {Math.round(fitment.confidence * 100)}%
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed" lineClamp={2} maw={200}>
                            {fitment.ai_reasoning}
                          </Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            )}

            {/* Export and Publish Section */}
            {aiFitments.length > 0 ? (
              <Group
                justify="space-between"
                p="md"
                style={{
                  background:
                    "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)",
                  borderRadius: "12px",
                  border: "1px solid #0ea5e9",
                }}
              >
                <Group>
                  <Text size="sm" fw={500}>
                    {selectedAiFitments.length} of {aiFitments.length} fitments
                    selected
                  </Text>
                  {selectedAiFitments.length > 0 && (
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => setSelectedAiFitments([])}
                    >
                      Clear Selection
                    </Button>
                  )}
                  <Text size="xs" c="dimmed">
                    Export will include{" "}
                    {selectedAiFitments.length > 0
                      ? `${selectedAiFitments.length} selected`
                      : "all"}{" "}
                    fitments
                  </Text>
                </Group>
                <Group>
                  <Button
                    variant="light"
                    leftSection={<IconDownload size={16} />}
                    onClick={() => handleExportFitments("csv")}
                    size="sm"
                    disabled={aiFitments.length === 0}
                  >
                    Export CSV
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<IconDownload size={16} />}
                    onClick={() => handleExportFitments("xlsx")}
                    size="sm"
                    disabled={aiFitments.length === 0}
                  >
                    Export XLSX
                  </Button>
                  <Button
                    variant="light"
                    leftSection={<IconDownload size={16} />}
                    onClick={() => handleExportFitments("json")}
                    size="sm"
                    disabled={aiFitments.length === 0}
                  >
                    Export JSON
                  </Button>
                  <Button
                    leftSection={<IconCheck size={16} />}
                    variant="gradient"
                    gradient={{ from: "green.6", to: "teal.6", deg: 135 }}
                    onClick={handleApplyAiFitments}
                    loading={applyingFitment}
                    disabled={selectedAiFitments.length === 0}
                    size="md"
                  >
                    Publish Selected Fitments ({selectedAiFitments.length})
                  </Button>
                </Group>
              </Group>
            ) : (
              <Alert
                icon={<IconBrain size={16} />}
                color="blue"
                variant="light"
              >
                <Text size="sm">
                  No AI fitments generated yet. Click "Generate AI Fitments"
                  above to create fitment suggestions.
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>
      )}

      {/* Manual Fitment Interface */}
      {selectedMethod === "manual" &&
        uploadedFiles.vcdb &&
        uploadedFiles.products && (
          <Grid gutter={{ base: "md", md: "xl" }}>
            {/* Left Pane: Vehicle Configuration Filters */}
            <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 1, md: 1 }}>
              <Card
                shadow="lg"
                padding="lg"
                radius="xl"
                withBorder
                style={{
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.3s ease",
                  marginBottom: "clamp(16px, 3vw, 0)",
                }}
              >
                <Group justify="space-between" mb={{ base: "lg", md: "xl" }}>
                  <div>
                    <Title
                      order={4}
                      style={{
                        color: "#1e293b",
                        fontWeight: 700,
                        marginBottom: "4px",
                        fontSize: "clamp(18px, 4vw, 24px)",
                      }}
                    >
                      Vehicle Filters
                    </Title>
                    <Text size="xs" c="dimmed" style={{ fontWeight: 500 }}>
                      Specify target configurations
                    </Text>
                  </div>
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconCar size={20} color="white" />
                  </div>
                </Group>

                <Stack gap="md">
                  <Group grow>
                    <NumberInput
                      label="Year From"
                      value={filters.yearFrom}
                      onChange={(val) =>
                        setFilters((prev) => ({
                          ...prev,
                          yearFrom: typeof val === "number" ? val : 2020,
                        }))
                      }
                      min={2010}
                      max={2030}
                    />
                    <NumberInput
                      label="Year To"
                      value={filters.yearTo}
                      onChange={(val) =>
                        setFilters((prev) => ({
                          ...prev,
                          yearTo: typeof val === "number" ? val : 2025,
                        }))
                      }
                      min={2010}
                      max={2030}
                    />
                  </Group>

                  <Select
                    label="Make"
                    placeholder="Select make"
                    value={filters.make}
                    onChange={(val) =>
                      setFilters((prev) => ({ ...prev, make: val || "" }))
                    }
                    data={[
                      "Acura",
                      "Toyota",
                      "Ford",
                      "Jeep",
                      "Honda",
                      "Nissan",
                    ]}
                    searchable
                    clearable
                  />

                  <Select
                    label="Model"
                    placeholder="Select model"
                    value={filters.model}
                    onChange={(val) =>
                      setFilters((prev) => ({ ...prev, model: val || "" }))
                    }
                    data={[
                      "ADX",
                      "RAV4",
                      "F-150",
                      "Wrangler",
                      "Accord",
                      "Altima",
                    ]}
                    searchable
                    clearable
                  />

                  <Select
                    label="Submodel"
                    placeholder="Select submodel"
                    value={filters.submodel}
                    onChange={(val) =>
                      setFilters((prev) => ({ ...prev, submodel: val || "" }))
                    }
                    data={[
                      "Advance",
                      "XLE",
                      "Lariat",
                      "Rubicon",
                      "Sport",
                      "Touring",
                    ]}
                    searchable
                    clearable
                  />

                  <Group grow>
                    <Select
                      label="Drive Type"
                      placeholder="Select drive type"
                      value={filters.driveType}
                      onChange={(val) =>
                        setFilters((prev) => ({
                          ...prev,
                          driveType: val || "",
                        }))
                      }
                      data={["AWD", "FWD", "RWD", "4WD"]}
                      clearable
                    />
                    <Select
                      label="Fuel Type"
                      placeholder="Select fuel type"
                      value={filters.fuelType}
                      onChange={(val) =>
                        setFilters((prev) => ({ ...prev, fuelType: val || "" }))
                      }
                      data={["Gas", "Hybrid", "Electric", "Diesel"]}
                      clearable
                    />
                  </Group>

                  <Group grow>
                    <Select
                      label="Doors"
                      placeholder="Number of doors"
                      value={filters.numDoors}
                      onChange={(val) =>
                        setFilters((prev) => ({ ...prev, numDoors: val || "" }))
                      }
                      data={["2", "4", "5"]}
                      clearable
                    />
                    <Select
                      label="Body Type"
                      placeholder="Select body type"
                      value={filters.bodyType}
                      onChange={(val) =>
                        setFilters((prev) => ({ ...prev, bodyType: val || "" }))
                      }
                      data={[
                        "Sedan",
                        "SUV",
                        "Crossover",
                        "Truck",
                        "Coupe",
                        "Hatchback",
                      ]}
                      clearable
                    />
                  </Group>

                  <Button
                    fullWidth
                    leftSection={<IconSearch size={16} />}
                    variant="gradient"
                    gradient={{
                      from: "primary.6",
                      to: "secondary.6",
                      deg: 135,
                    }}
                    onClick={handleSearchVehicles}
                    loading={configsLoading}
                    size="md"
                    radius="lg"
                    style={{
                      fontWeight: 600,
                      fontSize: "clamp(14px, 3vw, 16px)",
                      height: "clamp(44px, 8vw, 48px)",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Display Vehicles
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>

            {/* Center Pane: Matched Vehicle Configurations */}
            <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 3, md: 2 }}>
              <Card
                shadow="lg"
                padding="lg"
                radius="xl"
                withBorder
                h={{ base: "auto", md: "100%" }}
                style={{
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.3s ease",
                  marginBottom: "clamp(16px, 3vw, 0)",
                }}
              >
                <Group justify="space-between" mb="xl">
                  <div>
                    <Title
                      order={3}
                      style={{
                        color: "#1e293b",
                        fontWeight: 700,
                        marginBottom: "4px",
                      }}
                    >
                      Vehicle Configurations
                    </Title>
                    <Text
                      size="sm"
                      style={{
                        color: "#64748b",
                        fontWeight: 500,
                        background:
                          configurations.length > 0
                            ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                            : "#6b7280",
                        WebkitBackgroundClip: "text",
                        WebkitTextFillColor: "transparent",
                      }}
                    >
                      {configurations.length} configurations found
                    </Text>
                  </div>
                  <ActionIcon
                    variant="gradient"
                    gradient={{
                      from: "primary.6",
                      to: "secondary.6",
                      deg: 135,
                    }}
                    size="lg"
                    radius="lg"
                    style={{
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    <IconDownload size={18} />
                  </ActionIcon>
                </Group>

                <ScrollArea
                  h={{ base: "auto", md: 400 }}
                  style={{ maxHeight: "60vh" }}
                >
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>
                          <Checkbox
                            checked={
                              selectedConfigs.length === configurations.length
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
                            size="sm"
                          />
                        </Table.Th>
                        <Table.Th
                          style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                        >
                          Year
                        </Table.Th>
                        <Table.Th
                          style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                        >
                          Make
                        </Table.Th>
                        <Table.Th
                          style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                          visibleFrom="md"
                        >
                          Model
                        </Table.Th>
                        <Table.Th
                          style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                          visibleFrom="md"
                        >
                          Submodel
                        </Table.Th>
                        <Table.Th
                          style={{ fontSize: "clamp(12px, 2.5vw, 14px)" }}
                          visibleFrom="md"
                        >
                          Drive
                        </Table.Th>
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
                              size="sm"
                            />
                          </Table.Td>
                          <Table.Td
                            style={{
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                              padding: "clamp(8px, 2vw, 12px)",
                            }}
                          >
                            {config.year}
                          </Table.Td>
                          <Table.Td
                            style={{
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                              padding: "clamp(8px, 2vw, 12px)",
                            }}
                          >
                            {config.make}
                          </Table.Td>
                          <Table.Td
                            style={{
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                              padding: "clamp(8px, 2vw, 12px)",
                            }}
                            visibleFrom="md"
                          >
                            {config.model}
                          </Table.Td>
                          <Table.Td
                            style={{
                              fontSize: "clamp(11px, 2.5vw, 14px)",
                              padding: "clamp(8px, 2vw, 12px)",
                            }}
                            visibleFrom="md"
                          >
                            {config.submodel}
                          </Table.Td>
                          <Table.Td visibleFrom="md">
                            <Badge variant="light" size="xs">
                              {config.driveType}
                            </Badge>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {selectedConfigs.length > 0 && (
                  <Group
                    justify="space-between"
                    mt="xl"
                    p="lg"
                    style={{
                      background:
                        "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                      borderRadius: "16px",
                      border: "1px solid #93c5fd",
                    }}
                  >
                    <Text
                      size="sm"
                      fw={600}
                      style={{
                        color: "#1e40af",
                        fontSize: "14px",
                      }}
                    >
                      {selectedConfigs.length} of {configurations.length}{" "}
                      selected
                    </Text>
                    <Button
                      size="xs"
                      variant="light"
                      onClick={() => setSelectedConfigs([])}
                      radius="lg"
                      style={{
                        fontWeight: 500,
                        transition: "all 0.2s ease",
                      }}
                    >
                      Clear Selection
                    </Button>
                  </Group>
                )}
              </Card>
            </Grid.Col>

            {/* Right Pane: Define Part Fitment */}
            <Grid.Col span={{ base: 12, md: 4 }} order={{ base: 2, md: 3 }}>
              <Card
                shadow="lg"
                padding="lg"
                radius="xl"
                withBorder
                h={{ base: "auto", md: "100%" }}
                style={{
                  background:
                    "linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)",
                  border: "1px solid #e2e8f0",
                  transition: "all 0.3s ease",
                  marginBottom: "clamp(16px, 3vw, 0)",
                }}
              >
                <Group justify="space-between" mb="xl">
                  <div>
                    <Title
                      order={3}
                      style={{
                        color: "#1e293b",
                        fontWeight: 700,
                        marginBottom: "4px",
                      }}
                    >
                      Part Fitment
                    </Title>
                    <Text size="sm" c="dimmed" style={{ fontWeight: 500 }}>
                      Configure part application
                    </Text>
                  </div>
                  <div
                    style={{
                      background:
                        "linear-gradient(135deg, #f59e0b 0%, #d97706 100%)",
                      borderRadius: "12px",
                      padding: "12px",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <IconSettings size={20} color="white" />
                  </div>
                </Group>

                <Stack gap="sm">
                  <Select
                    label="Part Name"
                    placeholder="Select part"
                    value={fitmentForm.partId}
                    onChange={(value) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        partId: value || "",
                      }))
                    }
                    data={(parts || ([] as any)).map((part: any) => ({
                      value: part.id || part.hash,
                      label: `${part.id || part.hash} - ${part.description}${
                        part.itemStatus !== 0 ? " (Inactive)" : ""
                      }`,
                    }))}
                    searchable
                    size="md"
                    styles={{
                      input: {
                        fontSize: "clamp(14px, 3vw, 16px)",
                        height: "clamp(42px, 8vw, 48px)",
                      },
                    }}
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
                    data={(partTypes || ([] as any)).map((type: any) => ({
                      value: type.id,
                      label: type.description,
                    }))}
                    size="md"
                    styles={{
                      input: {
                        fontSize: "clamp(14px, 3vw, 16px)",
                        height: "clamp(42px, 8vw, 48px)",
                      },
                    }}
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
                    size="md"
                    styles={{
                      input: {
                        fontSize: "clamp(14px, 3vw, 16px)",
                        height: "clamp(42px, 8vw, 48px)",
                      },
                    }}
                  />

                  <Group grow>
                    <NumberInput
                      label="Quantity"
                      placeholder="1"
                      min={1}
                      value={fitmentForm.quantity}
                      onChange={(val) =>
                        setFitmentForm((prev) => ({
                          ...prev,
                          quantity: typeof val === "number" ? val : 1,
                        }))
                      }
                    />
                    <Select
                      label="Wheel Type"
                      placeholder="Select wheel type"
                      value={fitmentForm.wheelType}
                      onChange={(value) =>
                        setFitmentForm((prev) => ({
                          ...prev,
                          wheelType: value || "",
                        }))
                      }
                      data={wheelTypes}
                    />
                  </Group>

                  <Select
                    label="Lift Height"
                    placeholder="Select lift height"
                    value={fitmentForm.liftHeight}
                    onChange={(value) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        liftHeight: value || "",
                      }))
                    }
                    data={liftHeights}
                  />

                  <Divider label="Wheel Parameters" labelPosition="center" />

                  <Grid>
                    <Grid.Col span={4}>
                      <Text size="sm" fw={500}>
                        Parameter
                      </Text>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <Text size="sm" fw={500}>
                        Values
                      </Text>
                    </Grid.Col>

                    <Grid.Col span={4}>
                      <Text size="sm">Wheel Diameter</Text>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <Group gap="xs">
                        <TextInput placeholder="18" size="xs" />
                        <TextInput placeholder="19" size="xs" />
                        <TextInput placeholder="20" size="xs" />
                      </Group>
                    </Grid.Col>

                    <Grid.Col span={4}>
                      <Text size="sm">Tire Diameter</Text>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <Group gap="xs">
                        <TextInput placeholder="255/55R18" size="xs" />
                        <TextInput placeholder="275/50R19" size="xs" />
                        <TextInput placeholder="295/45R20" size="xs" />
                      </Group>
                    </Grid.Col>

                    <Grid.Col span={4}>
                      <Text size="sm">Backspacing</Text>
                    </Grid.Col>
                    <Grid.Col span={8}>
                      <Group gap="xs">
                        <TextInput placeholder="35mm" size="xs" />
                        <TextInput placeholder="40mm" size="xs" />
                        <TextInput placeholder="45mm" size="xs" />
                      </Group>
                    </Grid.Col>
                  </Grid>

                  <TextInput
                    label="Title"
                    placeholder="Standard fit"
                    value={fitmentForm.title}
                    onChange={(event) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        title: event.currentTarget.value,
                      }))
                    }
                  />
                  <TextInput
                    label="Description"
                    placeholder="Works with OEM wheel"
                    value={fitmentForm.description}
                    onChange={(event) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        description: event.currentTarget.value,
                      }))
                    }
                  />
                  <Textarea
                    label="Notes"
                    placeholder="Check brake clearance"
                    rows={3}
                    value={fitmentForm.notes}
                    onChange={(event) =>
                      setFitmentForm((prev) => ({
                        ...prev,
                        notes: event.currentTarget.value,
                      }))
                    }
                  />

                  <Button
                    fullWidth
                    size="md"
                    variant="gradient"
                    gradient={{ from: "accent.6", to: "success.6", deg: 135 }}
                    disabled={
                      selectedConfigs.length === 0 ||
                      !fitmentForm.partId ||
                      !fitmentForm.partTypeId
                    }
                    loading={applyingFitment}
                    onClick={handleApplyFitment}
                    radius="lg"
                    style={{
                      marginTop: "clamp(16px, 4vw, 24px)",
                      fontWeight: 600,
                      fontSize: "clamp(14px, 3.5vw, 16px)",
                      height: "clamp(44px, 8vw, 48px)",
                      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      transition: "all 0.2s ease",
                    }}
                  >
                    Apply Fitment ({selectedConfigs.length} configs)
                  </Button>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>
        )}
    </div>
  );
}
