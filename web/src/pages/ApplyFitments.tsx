import { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Select,
  NumberInput,
  Button,
  Checkbox,
  TextInput,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Alert,
  SimpleGrid,
  Stepper,
  Textarea,
  Table,
  Progress,
  Tooltip,
  ActionIcon,
  Modal,
  Tabs,
  Paper,
  ThemeIcon,
  Center,
} from "@mantine/core";
import {
  IconBrain,
  IconUsers,
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
  IconMapPin,
  IconHash,
  IconFileText,
  IconEdit,
  IconCheck,
  IconX,
  IconEye,
  IconClock,
  IconAlertCircle,
  IconCheckbox,
  IconCloudUpload,
  IconFileCheck,
} from "@tabler/icons-react";
import { dataUploadService, fitmentUploadService } from "../api/services";
import { useAsyncOperation, useApi } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { useFieldConfiguration } from "../hooks/useFieldConfiguration";
import DynamicFormField from "../components/DynamicFormField";
import { useEntity } from "../hooks/useEntity";

// AI Fitment Job interface
interface AiFitmentJob {
  id: string;
  created_at: string;
  created_by: string;
  product_file_name?: string;
  product_count: number;
  status: "in_progress" | "completed" | "failed" | "review_required";
  fitments_count: number;
  approved_count: number;
  rejected_count: number;
  job_type: "upload" | "selection";
}

export default function ApplyFitments() {
  // Professional toast hook
  const { showSuccess, showError } = useProfessionalToast();

  // Entity context for tenant ID
  const { currentEntity } = useEntity();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Get latest session on component mount
  const { data: sessionsData, refetch: refetchSessions } = useApi(
    () => dataUploadService.getSessions(),
    []
  ) as any;

  // Get data status to check if VCDB and Product data exist
  const { data: dataStatus, refetch: refetchDataStatus } = useApi(
    () => dataUploadService.getDataStatus(),
    []
  ) as any;

  // AI Fitment Jobs API
  const { data: aiFitmentJobsResponse, refetch: refetchJobs } = useApi(
    () => dataUploadService.getAiFitmentJobs({ tenant_id: currentEntity?.id }),
    []
  ) as any;

  // Extract jobs array from API response
  const aiFitmentJobs = Array.isArray(aiFitmentJobsResponse?.data)
    ? aiFitmentJobsResponse.data
    : Array.isArray(aiFitmentJobsResponse)
    ? aiFitmentJobsResponse
    : [];

  // Set the latest session ID when sessions data is available
  useEffect(() => {
    if (sessionsData && sessionsData.length > 0) {
      const latestSession = sessionsData[0];
      setSessionId(latestSession.id);
    }
  }, [sessionsData]);

  // Listen for entity change events from EntitySelector
  useEffect(() => {
    const handleEntityChange = async () => {
      console.log("Entity changed, refreshing ApplyFitments...");
      await Promise.all([
        refetchSessions(),
        refetchDataStatus(),
        refetchJobs(),
      ]);
    };

    window.addEventListener("entityChanged", handleEntityChange);

    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [refetchSessions, refetchDataStatus, refetchJobs]);

  // Auto-select AI method if redirected from Products page
  useEffect(() => {
    const autoSelectAi = sessionStorage.getItem("autoSelectAiMethod");
    if (autoSelectAi === "true") {
      setSelectedMethod("ai");
      sessionStorage.removeItem("autoSelectAiMethod");
    }
  }, []);

  // Main method selection
  const [selectedMethod, setSelectedMethod] = useState<"ai" | "manual" | null>(
    null
  );

  // AI Fitments sub-option selection
  const [aiSubOption, setAiSubOption] = useState<
    "upload" | "selection" | "jobs" | null
  >(null);

  // AI Upload Product states
  const [productFile, setProductFile] = useState<File | null>(null);
  const [uploadingProduct, setUploadingProduct] = useState(false);
  const [processingAiFitment, setProcessingAiFitment] = useState(false);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [pollingInterval, setPollingInterval] = useState<ReturnType<
    typeof setInterval
  > | null>(null);

  // AI Product Selection states
  const { data: productsResponse } = useApi(
    () => dataUploadService.getProductData(),
    []
  ) as any;
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  // Extract products array from API response
  const productsData = productsResponse?.data || [];

  // AI Fitment Jobs Review states
  const [selectedJobForReview, setSelectedJobForReview] = useState<
    string | null
  >(null);
  const [jobFitments, setJobFitments] = useState<any[]>([]);
  const [selectedJobFitments, setSelectedJobFitments] = useState<string[]>([]);
  const [loadingJobFitments, setLoadingJobFitments] = useState(false);
  const [approvingFitments, setApprovingFitments] = useState(false);

  // Edit fitment states
  const [editingFitment, setEditingFitment] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual fitment states
  const [dropdownData, setDropdownData] = useState<any>(null);
  const [loadingDropdownData, setLoadingDropdownData] = useState(false);
  const [manualStep, setManualStep] = useState(1);
  const [formKey, setFormKey] = useState(0);
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
    position: "",
    quantity: 1,
    title: "",
    description: "",
    notes: "",
    liftHeight: "",
    wheelType: "",
  });
  const [applyingManualFitment, setApplyingManualFitment] = useState(false);

  // Dynamic field configurations
  const {
    formFields: vcdbFormFields,
    loading: vcdbFieldsLoading,
    refreshFields: refreshVcdbFields,
  } = useFieldConfiguration({ referenceType: "vcdb", autoLoad: true });

  const {
    formFields: productFormFields,
    loading: productFieldsLoading,
    refreshFields: refreshProductFields,
  } = useFieldConfiguration({ referenceType: "product", autoLoad: true });

  // Dynamic field values state
  const [dynamicVcdbFields, setDynamicVcdbFields] = useState<
    Record<string, any>
  >({});
  const [dynamicProductFields, setDynamicProductFields] = useState<
    Record<string, any>
  >({});

  // API hooks
  const { execute: fetchDropdownData } = useAsyncOperation();
  const { execute: fetchFilteredVehicles } = useAsyncOperation();
  const { execute: createFitment } = useAsyncOperation();

  // Helper functions
  const isVcdbDataAvailable = () => {
    return dataStatus?.vcdb?.exists && dataStatus?.vcdb?.record_count > 0;
  };

  const isProductDataAvailable = () => {
    return (
      dataStatus?.products?.exists && dataStatus?.products?.record_count > 0
    );
  };

  const isAiMethodAvailable = () => {
    return isVcdbDataAvailable();
  };

  const isManualMethodAvailable = () => {
    return isVcdbDataAvailable() && isProductDataAvailable();
  };

  // Navigation handlers
  const handleBackToMethodSelection = () => {
    setSelectedMethod(null);
    setAiSubOption(null);
    setProductFile(null);
    setSelectedProducts([]);
    setSearchQuery("");
    setManualStep(1);
  };

  const handleBackToAiOptions = () => {
    setAiSubOption(null);
    setProductFile(null);
    setSelectedProducts([]);
    setSearchQuery("");
    setProcessingAiFitment(false);
    setAiProgress(0);
    setAiLogs([]);
  };

  // Poll job status until completion
  const pollJobStatus = async (jobId: string) => {
    setProcessingAiFitment(true);
    setAiProgress(5);
    setAiLogs(["🚀 Starting AI fitment generation..."]);

    const interval = setInterval(async () => {
      try {
        const statusResult: any = await dataUploadService.getAiFitmentJobStatus(
          jobId
        );
        const job = statusResult?.data?.job || statusResult?.job;
        const task = statusResult?.data?.task || statusResult?.task;

        // Update progress from Celery task
        if (task?.state === "PROGRESS" && task?.info) {
          const progress = task.info.current || 5;
          const statusMsg = task.info.status || "Processing...";
          setAiProgress(progress);
          setAiLogs((prev) => {
            const newLogs = [...prev];
            if (newLogs[newLogs.length - 1] !== statusMsg) {
              newLogs.push(`⏳ ${statusMsg}`);
            }
            return newLogs;
          });
        }

        // Check job status
        if (job?.status === "review_required" || job?.status === "completed") {
          // Job completed successfully
          clearInterval(interval);
          setPollingInterval(null);
          setAiProgress(100);
          setAiLogs((prev) => [
            ...prev,
            `✅ AI fitment generation completed!`,
            `📊 Generated ${job.fitments_count} fitments from ${job.product_count} products`,
          ]);
          setProcessingAiFitment(false);

          showSuccess(
            `AI fitment job completed! ${job.fitments_count} fitments generated. Review them in the Jobs tab.`,
            5000
          );

          // Refresh jobs list
          await refetchJobs();

          // Auto-navigate to jobs tab
          setTimeout(() => {
            setAiSubOption("jobs");
          }, 2000);
        } else if (job?.status === "failed") {
          // Job failed
          clearInterval(interval);
          setPollingInterval(null);
          setProcessingAiFitment(false);
          const errorMsg = job.error_message || "Unknown error occurred";
          setAiLogs((prev) => [...prev, `❌ Job failed: ${errorMsg}`]);
          showError(`AI fitment job failed: ${errorMsg}`);
          await refetchJobs();
        }
      } catch (error: any) {
        console.error("Error polling job status:", error);
        // Don't stop polling on network errors, just log
      }
    }, 3000); // Poll every 3 seconds

    setPollingInterval(interval);
  };

  // Stop polling on component unmount or when navigating away
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  // AI Fitment: Upload Product Data handler
  const handleUploadProductForAi = async () => {
    if (!productFile) {
      showError("Please select a product file to upload");
      return;
    }

    setUploadingProduct(true);
    setProcessingAiFitment(true);
    setAiProgress(0);
    setAiLogs(["📦 Uploading product file and creating job..."]);

    try {
      // Create AI fitment job with product file upload
      const result: any = await dataUploadService.createAiFitmentJob({
        product_file: productFile,
        job_type: "upload",
      });

      if (result && result.data) {
        const jobId = result.data.job_id || result.data.data?.id;

        setAiLogs((prev) => [
          ...prev,
          `✅ Job created successfully! Job ID: ${jobId}`,
          "🔄 Starting background processing...",
        ]);

        // Start polling for job status
        await pollJobStatus(jobId);
      }
    } catch (error: any) {
      console.error("AI fitment job creation error:", error);
      setAiLogs((prev) => [...prev, "❌ Failed to create AI fitment job"]);
      setProcessingAiFitment(false);

      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create AI fitment job";
      showError(errorMsg);
    } finally {
      setUploadingProduct(false);
    }
  };

  // AI Fitment: Select Products handler
  const handleSelectProductsForAi = async () => {
    if (selectedProducts.length === 0) {
      showError("Please select at least one product");
      return;
    }

    setProcessingAiFitment(true);
    setAiProgress(0);
    setAiLogs([
      `🔍 Creating job for ${selectedProducts.length} selected products...`,
    ]);

    try {
      // Create AI fitment job from product selection
      const result: any = await dataUploadService.createAiFitmentJob({
        product_ids: selectedProducts,
        job_type: "selection",
      });

      if (result && result.data) {
        const jobId = result.data.job_id || result.data.data?.id;

        setAiLogs((prev) => [
          ...prev,
          `✅ Job created successfully! Job ID: ${jobId}`,
          "🔄 Starting background processing...",
        ]);

        // Start polling for job status
        await pollJobStatus(jobId);
      }
    } catch (error: any) {
      console.error("AI fitment job creation error:", error);
      setAiLogs((prev) => [...prev, "❌ Failed to create AI fitment job"]);
      setProcessingAiFitment(false);

      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        error.message ||
        "Failed to create AI fitment job";
      showError(errorMsg);
    }
  };

  // Review AI Fitment Job
  const handleReviewJob = async (jobId: string) => {
    setSelectedJobForReview(jobId);
    setLoadingJobFitments(true);

    try {
      // Review AI fitment job
      const result: any = await dataUploadService.reviewAiFitmentJob(jobId);

      if (result && result.data) {
        const fitments = result.data.fitments || result.data || [];
        setJobFitments(fitments);
        setSelectedJobFitments(fitments.map((f: any) => f.id));
        showSuccess(`Loaded ${fitments.length} fitments for review`);
      }
    } catch (error: any) {
      console.error("Failed to load job fitments:", error);
      showError("Failed to load job fitments for review");
    } finally {
      setLoadingJobFitments(false);
    }
  };

  // Approve AI Fitments
  const handleApproveJobFitments = async () => {
    if (!selectedJobForReview) return;

    if (selectedJobFitments.length === 0) {
      showError("Please select fitments to approve");
      return;
    }

    setApprovingFitments(true);

    try {
      // Approve AI fitments - this will change status to 'approved' and create Fitment records
      await dataUploadService.approveAiFitments(
        selectedJobForReview,
        selectedJobFitments
      );

      showSuccess(
        `Successfully approved ${selectedJobFitments.length} fitments! They are now active in Fitment Management.`,
        5000
      );

      // Refresh jobs list to update counts
      await refetchJobs();

      // Close review modal and reset
      setSelectedJobForReview(null);
      setJobFitments([]);
      setSelectedJobFitments([]);
    } catch (error: any) {
      console.error("Failed to approve fitments:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to approve fitments";
      showError(errorMsg);
    } finally {
      setApprovingFitments(false);
    }
  };

  // Reject AI Fitments
  const handleRejectJobFitments = async () => {
    if (!selectedJobForReview) return;

    if (selectedJobFitments.length === 0) {
      showError("Please select fitments to reject");
      return;
    }

    const confirmReject = window.confirm(
      `Are you sure you want to reject ${selectedJobFitments.length} fitments? This will delete them permanently.`
    );

    if (!confirmReject) return;

    setApprovingFitments(true);

    try {
      // Reject AI fitments - this will delete them
      await dataUploadService.rejectAiFitments(
        selectedJobForReview,
        selectedJobFitments
      );

      showSuccess(
        `Successfully rejected ${selectedJobFitments.length} fitments. They have been removed.`,
        5000
      );

      // Remove rejected fitments from local state
      setJobFitments((prev) =>
        prev.filter((f) => !selectedJobFitments.includes(f.id))
      );
      setSelectedJobFitments([]);

      // Refresh jobs list to update counts
      await refetchJobs();
    } catch (error: any) {
      console.error("Failed to reject fitments:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to reject fitments";
      showError(errorMsg);
    } finally {
      setApprovingFitments(false);
    }
  };

  // Manual fitment handler
  const handleManualMethodClick = async () => {
    if (!isManualMethodAvailable()) {
      showError("VCDB and Product data are required for manual fitment method");
      return;
    }

    setSelectedMethod("manual");
    setLoadingDropdownData(true);

    try {
      if (refreshVcdbFields && refreshProductFields) {
        await Promise.all([refreshVcdbFields(), refreshProductFields()]);
      }

      const dropdownResult = await fetchDropdownData(() =>
        dataUploadService.getNewDataDropdownData()
      );

      if (dropdownResult && dropdownResult.data) {
        setDropdownData(dropdownResult.data);
      } else {
        showError("Failed to load vehicle and product data");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showError("Failed to load data");
    } finally {
      setLoadingDropdownData(false);
    }
  };

  // Edit fitment handler
  const handleEditFitment = (fitment: any) => {
    setEditingFitment(fitment);
    setEditFormData({
      part_id: fitment.part_id,
      part_description: fitment.part_description,
      year: fitment.year,
      make: fitment.make,
      model: fitment.model,
      submodel: fitment.submodel,
      drive_type: fitment.drive_type,
      position: fitment.position,
      quantity: fitment.quantity,
      confidence: fitment.confidence,
      confidence_explanation: fitment.confidence_explanation,
      ai_reasoning: fitment.ai_reasoning,
      dynamicFields: fitment.dynamicFields || {},
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFitment || !selectedJobForReview) return;

    setSavingEdit(true);
    try {
      // Update AI fitment
      await dataUploadService.updateAiFitment(
        selectedJobForReview,
        editingFitment.id,
        editFormData
      );

      // Update local state
      setJobFitments((prev) =>
        prev.map((fitment) =>
          fitment.id === editingFitment.id
            ? { ...fitment, ...editFormData }
            : fitment
        )
      );

      setEditModalOpen(false);
      setEditingFitment(null);
      showSuccess("Fitment updated successfully");
    } catch (error: any) {
      showError("Failed to update fitment");
    } finally {
      setSavingEdit(false);
    }
  };

  // Helper functions for dynamic fields
  const updateDynamicVcdbField = (fieldName: string, value: any) => {
    setDynamicVcdbFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const updateDynamicProductField = (fieldName: string, value: any) => {
    setDynamicProductFields((prev) => ({
      ...prev,
      [fieldName]: value,
    }));
  };

  const getFieldData = (fieldConfig: any) => {
    if (fieldConfig.field_type === "enum" && fieldConfig.enum_options) {
      return fieldConfig.enum_options.map((option: string) => ({
        value: option,
        label: option,
      }));
    }

    const fieldName = fieldConfig.name.toLowerCase();
    if (dropdownData) {
      const dataMapping: Record<string, string> = {
        year: "years",
        make: "makes",
        model: "models",
        submodel: "submodels",
        fueltype: "fuel_types",
        numdoors: "num_doors",
        drivetype: "drive_types",
        bodytype: "body_types",
        part: "parts",
        position: "positions",
      };

      const dataKey = dataMapping[fieldName];
      if (dataKey && dropdownData[dataKey]) {
        return dropdownData[dataKey].map((item: string) => ({
          value: item,
          label: item,
        }));
      }
    }

    return [];
  };

  // Render job status badge
  const renderStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; label: string; icon: any }
    > = {
      in_progress: {
        color: "blue",
        label: "In Progress",
        icon: <IconClock size={14} />,
      },
      completed: {
        color: "green",
        label: "Completed",
        icon: <IconCheck size={14} />,
      },
      failed: {
        color: "red",
        label: "Failed",
        icon: <IconX size={14} />,
      },
      review_required: {
        color: "orange",
        label: "Review Required",
        icon: <IconAlertCircle size={14} />,
      },
    };

    const config = statusConfig[status] || statusConfig.in_progress;

    return (
      <Badge color={config.color} variant="light" leftSection={config.icon}>
        {config.label}
      </Badge>
    );
  };

  // Filter products based on search
  const filteredProducts = Array.isArray(productsData)
    ? productsData.filter((product: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          product.id?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
      })
    : [];

  return (
    <div style={{ minHeight: "100vh" }}>
      <Stack gap="xl">
        {/* Step 1: Method Selection */}
        {!selectedMethod && (
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
                <Text size="md" c="#64748b" mb="md">
                  Select how you want to apply fitments to your vehicle
                  configurations
                </Text>

                {/* Data Status Indicators */}
                <Group gap="lg" mb="lg">
                  <Group gap="xs">
                    <Badge
                      color={isVcdbDataAvailable() ? "green" : "red"}
                      variant="light"
                      size="sm"
                    >
                      VCDB Data
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {isVcdbDataAvailable()
                        ? `${dataStatus?.vcdb?.record_count || 0} records`
                        : "Not available"}
                    </Text>
                  </Group>
                  <Group gap="xs">
                    <Badge
                      color={isProductDataAvailable() ? "green" : "red"}
                      variant="light"
                      size="sm"
                    >
                      Product Data
                    </Badge>
                    <Text size="xs" c="dimmed">
                      {isProductDataAvailable()
                        ? `${dataStatus?.products?.record_count || 0} records`
                        : "Not available"}
                    </Text>
                  </Group>
                </Group>
              </div>

              <SimpleGrid cols={2} spacing="xl">
                {/* AI Method Card */}
                <Card
                  style={{
                    background:
                      selectedMethod === "ai"
                        ? "#f0f9ff"
                        : !isAiMethodAvailable()
                        ? "#f8f9fa"
                        : "#ffffff",
                    border:
                      selectedMethod === "ai"
                        ? "2px solid #3b82f6"
                        : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    cursor: isAiMethodAvailable() ? "pointer" : "not-allowed",
                    opacity: isAiMethodAvailable() ? 1 : 0.6,
                  }}
                  p="xl"
                  onClick={() => {
                    if (isAiMethodAvailable()) {
                      setSelectedMethod("ai");
                    }
                  }}
                >
                  <Stack align="center" gap="lg">
                    <div
                      style={{
                        background: isAiMethodAvailable()
                          ? "#eff6ff"
                          : "#f1f3f4",
                        borderRadius: "50%",
                        padding: "20px",
                        marginBottom: "8px",
                      }}
                    >
                      <IconBrain
                        size={28}
                        color={isAiMethodAvailable() ? "#3b82f6" : "#9ca3af"}
                      />
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <Text
                        fw={700}
                        size="xl"
                        c={isAiMethodAvailable() ? "#1e293b" : "#9ca3af"}
                        mb="xs"
                      >
                        AI Fitments
                      </Text>
                      <Text
                        size="sm"
                        c={isAiMethodAvailable() ? "#64748b" : "#9ca3af"}
                        ta="center"
                      >
                        {isAiMethodAvailable()
                          ? "Upload products or select products to generate AI fitments"
                          : "VCDB data required"}
                      </Text>
                    </div>

                    {selectedMethod === "ai" && (
                      <Badge variant="light" color="blue" size="lg">
                        Selected
                      </Badge>
                    )}

                    {!isAiMethodAvailable() && (
                      <Badge variant="light" color="red" size="lg">
                        Disabled
                      </Badge>
                    )}
                  </Stack>
                </Card>

                {/* Manual Method Card */}
                <Card
                  style={{
                    background:
                      selectedMethod === "manual"
                        ? "#f0f9ff"
                        : !isManualMethodAvailable()
                        ? "#f8f9fa"
                        : "#ffffff",
                    border:
                      selectedMethod === "manual"
                        ? "2px solid #3b82f6"
                        : "1px solid #e2e8f0",
                    borderRadius: "8px",
                    cursor: isManualMethodAvailable()
                      ? "pointer"
                      : "not-allowed",
                    opacity: isManualMethodAvailable() ? 1 : 0.6,
                  }}
                  p="xl"
                  onClick={
                    isManualMethodAvailable()
                      ? handleManualMethodClick
                      : undefined
                  }
                >
                  <Stack align="center" gap="lg">
                    <div
                      style={{
                        background: isManualMethodAvailable()
                          ? "#eff6ff"
                          : "#f1f3f4",
                        borderRadius: "50%",
                        padding: "20px",
                        marginBottom: "8px",
                      }}
                    >
                      <IconUsers
                        size={28}
                        color={
                          isManualMethodAvailable() ? "#3b82f6" : "#9ca3af"
                        }
                      />
                    </div>

                    <div style={{ textAlign: "center" }}>
                      <Text
                        fw={700}
                        size="xl"
                        c={isManualMethodAvailable() ? "#1e293b" : "#9ca3af"}
                        mb="xs"
                      >
                        Manual Fitment
                      </Text>
                      <Text
                        size="sm"
                        c={isManualMethodAvailable() ? "#64748b" : "#9ca3af"}
                        ta="center"
                      >
                        {isManualMethodAvailable()
                          ? "Apply fitments manually with full control"
                          : "VCDB and Product data required"}
                      </Text>
                    </div>

                    {selectedMethod === "manual" && (
                      <Badge variant="light" color="blue" size="lg">
                        Selected
                      </Badge>
                    )}

                    {!isManualMethodAvailable() && (
                      <Badge variant="light" color="red" size="lg">
                        Disabled
                      </Badge>
                    )}
                  </Stack>
                </Card>
              </SimpleGrid>

              {/* Help message when both methods are disabled */}
              {!isManualMethodAvailable() && !isAiMethodAvailable() && (
                <Alert color="orange" variant="light" mt="lg">
                  <Text size="sm">
                    <strong>Data Required:</strong> Both VCDB and Product data
                    must be uploaded before you can apply fitments. Please go to
                    the <strong>Upload Data</strong> page to upload your vehicle
                    and product data files.
                  </Text>
                </Alert>
              )}
            </Stack>
          </Card>
        )}

        {/* AI Fitments Section */}
        {selectedMethod === "ai" && (
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
                  onClick={
                    aiSubOption
                      ? handleBackToAiOptions
                      : handleBackToMethodSelection
                  }
                >
                  {aiSubOption
                    ? "Back to AI Options"
                    : "Back to Method Selection"}
                </Button>
              </Group>

              <div>
                <Title order={2} c="#1e293b" fw={600} mb="xs">
                  AI Fitments
                </Title>
                <Text size="md" c="#64748b">
                  Automate fitment generation using AI
                </Text>
              </div>

              {/* AI Sub-options Tabs */}
              {!aiSubOption && (
                <Tabs defaultValue="upload" variant="pills">
                  <Tabs.List mb="xl">
                    <Tabs.Tab
                      value="upload"
                      leftSection={<IconCloudUpload size={16} />}
                    >
                      Upload Product Data
                    </Tabs.Tab>
                    <Tabs.Tab
                      value="selection"
                      leftSection={<IconCheckbox size={16} />}
                    >
                      Select Products
                    </Tabs.Tab>
                    <Tabs.Tab
                      value="jobs"
                      leftSection={<IconFileCheck size={16} />}
                      rightSection={
                        aiFitmentJobs?.filter(
                          (j: any) => j.status === "review_required"
                        ).length > 0 && (
                          <Badge size="xs" variant="filled" color="orange">
                            {
                              aiFitmentJobs.filter(
                                (j: any) => j.status === "review_required"
                              ).length
                            }
                          </Badge>
                        )
                      }
                    >
                      AI Jobs & Progress
                    </Tabs.Tab>
                  </Tabs.List>

                  {/* Upload Product Data Tab */}
                  <Tabs.Panel value="upload">
                    <Stack gap="lg">
                      <div>
                        <Title order={3} c="#1e293b" fw={600} mb="xs">
                          Upload Product Data for AI Fitments
                        </Title>
                        <Text size="sm" c="#64748b">
                          Upload a product file and let AI generate fitments
                          automatically
                        </Text>
                      </div>

                      {/* File Upload Area */}
                      <Paper
                        style={{
                          minHeight: "200px",
                          border: `2px dashed ${
                            productFile ? "#22c55e" : "#cbd5e1"
                          }`,
                          borderRadius: "16px",
                          backgroundColor: productFile ? "#f0fdf4" : "#fafafa",
                          cursor: "pointer",
                        }}
                        onClick={() => {
                          const input = document.createElement("input");
                          input.type = "file";
                          input.accept = ".csv,.xlsx,.xls,.json";
                          input.onchange = (e) => {
                            const file = (e.target as HTMLInputElement)
                              .files?.[0];
                            if (file) setProductFile(file);
                          };
                          input.click();
                        }}
                      >
                        <Center style={{ height: "100%", padding: "24px" }}>
                          <Stack align="center" gap="md">
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color={productFile ? "green" : "blue"}
                              radius="xl"
                            >
                              {productFile ? (
                                <IconCheck size={28} />
                              ) : (
                                <IconCloudUpload size={28} />
                              )}
                            </ThemeIcon>

                            <Stack align="center" gap="xs">
                              <Text fw={600} size="lg" c="dark">
                                {productFile
                                  ? productFile.name
                                  : "Product Data"}
                              </Text>
                              <Text size="sm" c="dimmed" ta="center">
                                {productFile
                                  ? "Click to change file"
                                  : "Click to upload product file (CSV, XLSX, XLS, JSON)"}
                              </Text>
                              {productFile && (
                                <Badge color="green" variant="light" size="sm">
                                  Ready to process
                                </Badge>
                              )}
                            </Stack>
                          </Stack>
                        </Center>
                      </Paper>

                      {/* Processing Progress */}
                      {processingAiFitment && (
                        <Card withBorder p="lg">
                          <Stack gap="md">
                            <Group justify="space-between">
                              <Text fw={600} size="sm">
                                Processing AI Fitments...
                              </Text>
                              <Badge color="blue" variant="light">
                                {Math.round(aiProgress)}%
                              </Badge>
                            </Group>
                            <Progress value={aiProgress} size="lg" animated />
                            <ScrollArea h={200}>
                              <Stack gap="xs">
                                {aiLogs.map((log, index) => (
                                  <Text
                                    key={index}
                                    size="sm"
                                    c="#374151"
                                    style={{
                                      fontFamily: "monospace",
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

                      {/* Upload Button */}
                      <Center>
                        <Button
                          size="lg"
                          leftSection={<IconBrain size={20} />}
                          onClick={handleUploadProductForAi}
                          loading={uploadingProduct}
                          disabled={!productFile || uploadingProduct}
                        >
                          Generate AI Fitments from Upload
                        </Button>
                      </Center>
                    </Stack>
                  </Tabs.Panel>

                  {/* Select Products Tab */}
                  <Tabs.Panel value="selection">
                    <Stack gap="lg">
                      <div>
                        <Title order={3} c="#1e293b" fw={600} mb="xs">
                          Select Products for AI Fitments
                        </Title>
                        <Text size="sm" c="#64748b">
                          Choose specific products to generate AI fitments
                        </Text>
                      </div>

                      {/* Search Bar */}
                      <TextInput
                        placeholder="Search products by ID, description, or category..."
                        leftSection={<IconSearch size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                      />

                      {/* Products Table */}
                      <Card withBorder>
                        <Group justify="space-between" mb="md">
                          <Text fw={600} size="sm">
                            Available Products ({filteredProducts.length})
                          </Text>
                          <Group gap="xs">
                            <Button
                              variant="light"
                              size="xs"
                              onClick={() =>
                                setSelectedProducts(
                                  filteredProducts.map((p: any) => p.id)
                                )
                              }
                            >
                              Select All
                            </Button>
                            <Button
                              variant="light"
                              size="xs"
                              onClick={() => setSelectedProducts([])}
                            >
                              Clear All
                            </Button>
                          </Group>
                        </Group>

                        <ScrollArea h={400}>
                          <Table striped highlightOnHover>
                            <Table.Thead>
                              <Table.Tr>
                                <Table.Th style={{ width: "50px" }}>
                                  <Checkbox
                                    checked={
                                      selectedProducts.length ===
                                        filteredProducts.length &&
                                      filteredProducts.length > 0
                                    }
                                    indeterminate={
                                      selectedProducts.length > 0 &&
                                      selectedProducts.length <
                                        filteredProducts.length
                                    }
                                    onChange={(event) => {
                                      if (event.currentTarget.checked) {
                                        setSelectedProducts(
                                          filteredProducts.map((p: any) => p.id)
                                        );
                                      } else {
                                        setSelectedProducts([]);
                                      }
                                    }}
                                  />
                                </Table.Th>
                                <Table.Th>Product ID</Table.Th>
                                <Table.Th>Description</Table.Th>
                                <Table.Th>Category</Table.Th>
                              </Table.Tr>
                            </Table.Thead>
                            <Table.Tbody>
                              {filteredProducts.map((product: any) => (
                                <Table.Tr key={product.id}>
                                  <Table.Td>
                                    <Checkbox
                                      checked={selectedProducts.includes(
                                        product.id
                                      )}
                                      onChange={(event) => {
                                        if (event.currentTarget.checked) {
                                          setSelectedProducts((prev) => [
                                            ...prev,
                                            product.id,
                                          ]);
                                        } else {
                                          setSelectedProducts((prev) =>
                                            prev.filter(
                                              (id) => id !== product.id
                                            )
                                          );
                                        }
                                      }}
                                    />
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm" fw={600} c="#3b82f6">
                                      {product.id}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Text size="sm">
                                      {product.description || "N/A"}
                                    </Text>
                                  </Table.Td>
                                  <Table.Td>
                                    <Badge variant="light" size="sm">
                                      {product.category || "Uncategorized"}
                                    </Badge>
                                  </Table.Td>
                                </Table.Tr>
                              ))}
                            </Table.Tbody>
                          </Table>
                        </ScrollArea>
                      </Card>

                      {/* Processing Progress */}
                      {processingAiFitment && (
                        <Card withBorder p="lg">
                          <Stack gap="md">
                            <Group justify="space-between">
                              <Text fw={600} size="sm">
                                Processing AI Fitments...
                              </Text>
                              <Badge color="blue" variant="light">
                                {Math.round(aiProgress)}%
                              </Badge>
                            </Group>
                            <Progress value={aiProgress} size="lg" animated />
                            <ScrollArea h={200}>
                              <Stack gap="xs">
                                {aiLogs.map((log, index) => (
                                  <Text
                                    key={index}
                                    size="sm"
                                    c="#374151"
                                    style={{
                                      fontFamily: "monospace",
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

                      {/* Generate Button */}
                      <Center>
                        <Button
                          size="lg"
                          leftSection={<IconBrain size={20} />}
                          onClick={handleSelectProductsForAi}
                          loading={processingAiFitment}
                          disabled={
                            selectedProducts.length === 0 || processingAiFitment
                          }
                        >
                          Generate AI Fitments ({selectedProducts.length}{" "}
                          products)
                        </Button>
                      </Center>
                    </Stack>
                  </Tabs.Panel>

                  {/* AI Jobs & Progress Tab */}
                  <Tabs.Panel value="jobs">
                    <Stack gap="lg">
                      <Group justify="space-between">
                        <div>
                          <Title order={3} c="#1e293b" fw={600} mb="xs">
                            AI Fitment Jobs
                          </Title>
                          <Text size="sm" c="#64748b">
                            Track and review your AI fitment generation jobs
                          </Text>
                        </div>
                        <Button
                          variant="light"
                          size="sm"
                          leftSection={<IconRefresh size={14} />}
                          onClick={() => refetchJobs()}
                        >
                          Refresh
                        </Button>
                      </Group>

                      {/* Jobs Table */}
                      {!aiFitmentJobs || aiFitmentJobs.length === 0 ? (
                        <Alert color="blue" variant="light">
                          <Text size="sm">
                            No AI fitment jobs yet. Upload products or select
                            products to generate AI fitments.
                          </Text>
                        </Alert>
                      ) : (
                        <Card withBorder>
                          <ScrollArea h={500}>
                            <Table striped highlightOnHover>
                              <Table.Thead>
                                <Table.Tr>
                                  <Table.Th>Date</Table.Th>
                                  <Table.Th>Created By</Table.Th>
                                  <Table.Th>Source</Table.Th>
                                  <Table.Th>Products</Table.Th>
                                  <Table.Th>Fitments</Table.Th>
                                  <Table.Th>Status</Table.Th>
                                  <Table.Th>Actions</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {aiFitmentJobs.map((job: AiFitmentJob) => (
                                  <Table.Tr key={job.id}>
                                    <Table.Td>
                                      <Text size="sm">
                                        {new Date(
                                          job.created_at
                                        ).toLocaleDateString()}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {new Date(
                                          job.created_at
                                        ).toLocaleTimeString()}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm">
                                        {job.created_by || "System"}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      {job.job_type === "upload" ? (
                                        <Tooltip label={job.product_file_name}>
                                          <Badge variant="light" color="blue">
                                            File Upload
                                          </Badge>
                                        </Tooltip>
                                      ) : (
                                        <Badge variant="light" color="green">
                                          Product Selection
                                        </Badge>
                                      )}
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm" fw={600}>
                                        {job.product_count}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Group gap="xs">
                                        <Text size="sm" fw={600}>
                                          {job.fitments_count}
                                        </Text>
                                        {job.status === "review_required" && (
                                          <>
                                            <Text size="xs" c="dimmed">
                                              ({job.approved_count} approved,{" "}
                                              {job.rejected_count} rejected)
                                            </Text>
                                          </>
                                        )}
                                      </Group>
                                    </Table.Td>
                                    <Table.Td>
                                      {renderStatusBadge(job.status)}
                                    </Table.Td>
                                    <Table.Td>
                                      {job.status === "review_required" && (
                                        <Button
                                          variant="light"
                                          size="xs"
                                          leftSection={<IconEye size={14} />}
                                          onClick={() =>
                                            handleReviewJob(job.id)
                                          }
                                        >
                                          Review
                                        </Button>
                                      )}
                                      {job.status === "completed" && (
                                        <Badge color="green" variant="light">
                                          Approved
                                        </Badge>
                                      )}
                                    </Table.Td>
                                  </Table.Tr>
                                ))}
                              </Table.Tbody>
                            </Table>
                          </ScrollArea>
                        </Card>
                      )}
                    </Stack>
                  </Tabs.Panel>
                </Tabs>
              )}
            </Stack>
          </Card>
        )}

        {/* Manual Fitment Section */}
        {selectedMethod === "manual" && (
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
                >
                  Back to Method Selection
                </Button>
              </Group>

              <div style={{ marginBottom: "15px" }}>
                <Title order={2} c="#1e293b" fw={600}>
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
                onStepClick={(step) => setManualStep(step + 1)}
                allowNextStepsSelect={false}
              >
                <Stepper.Step
                  label="Specify Vehicle Configurations"
                  description="Specify vehicle criteria"
                  icon={<IconCar size={18} />}
                >
                  <Stack gap="md" mt={20}>
                    <div style={{ marginBottom: "15px" }}>
                      <Title order={3} c="#1e293b" fw={700}>
                        Vehicle Search Criteria
                      </Title>
                      <Text size="sm" c="#64748b">
                        Refine your search with specific vehicle attributes
                      </Text>
                      {loadingDropdownData && (
                        <Alert
                          icon={<IconRefresh size={16} />}
                          color="blue"
                          radius="md"
                          mt="md"
                        >
                          <Text size="sm">
                            Loading vehicle data from uploaded files...
                          </Text>
                        </Alert>
                      )}
                    </div>

                    <div key={formKey}>
                      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                        <Select
                          label="Year From"
                          placeholder="Select year from"
                          data={dropdownData?.years || []}
                          value={vehicleFilters.yearFrom}
                          onChange={(value) => {
                            setVehicleFilters((prev) => {
                              const newYearFrom = value || "";
                              let newYearTo = prev.yearTo;
                              if (
                                newYearFrom &&
                                prev.yearTo &&
                                parseInt(prev.yearTo) <= parseInt(newYearFrom)
                              ) {
                                newYearTo = "";
                              }
                              return {
                                ...prev,
                                yearFrom: newYearFrom,
                                yearTo: newYearTo,
                              };
                            });
                          }}
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={
                            <IconCalendar size={16} color="#64748b" />
                          }
                        />
                        <Select
                          label="Year To"
                          placeholder="Select year to"
                          data={
                            dropdownData?.years
                              ? dropdownData.years.filter((year: string) => {
                                  if (!vehicleFilters.yearFrom) return true;
                                  return (
                                    parseInt(year) >
                                    parseInt(vehicleFilters.yearFrom)
                                  );
                                })
                              : []
                          }
                          value={vehicleFilters.yearTo}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              yearTo: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={
                            <IconCalendar size={16} color="#64748b" />
                          }
                        />
                        <Select
                          label="Make"
                          placeholder="Select make"
                          data={dropdownData?.makes || []}
                          value={vehicleFilters.make}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              make: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={<IconCar size={16} color="#64748b" />}
                        />
                        <Select
                          label="Model"
                          placeholder="Select model"
                          data={dropdownData?.models || []}
                          value={vehicleFilters.model}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              model: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={<IconCar size={16} color="#64748b" />}
                        />
                        <Select
                          label="Submodel"
                          placeholder="Select submodel"
                          data={dropdownData?.submodels || []}
                          value={vehicleFilters.submodel}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              submodel: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={<IconCar size={16} color="#64748b" />}
                        />
                        <Select
                          label="Fuel Type"
                          placeholder="Select fuel type"
                          data={dropdownData?.fuel_types || []}
                          value={vehicleFilters.fuelType}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              fuelType: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={
                            <IconGasStation size={16} color="#64748b" />
                          }
                        />
                        <Select
                          label="Number of Doors"
                          placeholder="Select doors"
                          data={dropdownData?.num_doors || []}
                          value={vehicleFilters.numDoors}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              numDoors: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={<IconDoor size={16} color="#64748b" />}
                        />
                        <Select
                          label="Drive Type"
                          placeholder="Select drive type"
                          data={dropdownData?.drive_types || []}
                          value={vehicleFilters.driveType}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              driveType: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={
                            <IconSettings size={16} color="#64748b" />
                          }
                        />
                        <Select
                          label="Body Type"
                          placeholder="Select body type"
                          data={dropdownData?.body_types || []}
                          value={vehicleFilters.bodyType}
                          onChange={(value) =>
                            setVehicleFilters((prev) => ({
                              ...prev,
                              bodyType: value || "",
                            }))
                          }
                          searchable
                          disabled={loadingDropdownData}
                          leftSection={<IconCar size={16} color="#64748b" />}
                        />
                      </SimpleGrid>

                      {/* Dynamic VCDB Fields */}
                      {vcdbFormFields.length > 0 && (
                        <div style={{ marginTop: "24px" }}>
                          <Group justify="space-between" align="center" mb="md">
                            <div>
                              <Title order={4} c="#1e293b" fw={600} mb="xs">
                                Additional Vehicle Search Fields
                              </Title>
                              <Text size="sm" c="#64748b">
                                Additional vehicle fields configured in Settings
                              </Text>
                            </div>
                            <Button
                              variant="outline"
                              size="xs"
                              leftSection={<IconRefresh size={14} />}
                              onClick={() => {
                                if (refreshVcdbFields) {
                                  refreshVcdbFields();
                                }
                              }}
                              loading={vcdbFieldsLoading}
                            >
                              Refresh Fields
                            </Button>
                          </Group>

                          <SimpleGrid
                            cols={{ base: 1, sm: 2, lg: 3 }}
                            spacing="lg"
                          >
                            {vcdbFormFields.map((fieldConfig) => {
                              return (
                                fieldConfig.show_in_filters &&
                                fieldConfig.is_enabled &&
                                fieldConfig.reference_type === "vcdb" && (
                                  <DynamicFormField
                                    key={`search-${fieldConfig.id}`}
                                    fieldConfig={fieldConfig}
                                    value={dynamicVcdbFields[fieldConfig.name]}
                                    onChange={(value) =>
                                      updateDynamicVcdbField(
                                        fieldConfig.name,
                                        value
                                      )
                                    }
                                    data={getFieldData(fieldConfig)}
                                    disabled={
                                      loadingDropdownData ||
                                      vcdbFieldsLoading ||
                                      fieldConfig.requirement_level ===
                                        "disabled"
                                    }
                                  />
                                )
                              );
                            })}
                          </SimpleGrid>
                        </div>
                      )}
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
                          setSelectedVehicles([]);
                          setFitmentDetails({
                            partId: "",
                            position: "",
                            quantity: 1,
                            title: "",
                            description: "",
                            notes: "",
                            liftHeight: "",
                            wheelType: "",
                          });
                          setDynamicVcdbFields({});
                          setDynamicProductFields({});
                          setManualStep(1);
                          setFormKey((prev) => prev + 1);
                        }}
                      >
                        Clear Filters
                      </Button>

                      <Button
                        size="md"
                        leftSection={<IconSearch size={16} />}
                        onClick={async () => {
                          if (
                            !vehicleFilters.yearFrom ||
                            !vehicleFilters.yearTo
                          ) {
                            showError(
                              "Please select both 'Year From' and 'Year To'"
                            );
                            return;
                          }

                          const yearFrom = parseInt(vehicleFilters.yearFrom);
                          const yearTo = parseInt(vehicleFilters.yearTo);

                          if (yearFrom >= yearTo) {
                            showError("Year To must be greater than Year From");
                            return;
                          }

                          try {
                            const searchCriteria = {
                              ...vehicleFilters,
                              ...dynamicVcdbFields,
                            };

                            const result: any = await fetchFilteredVehicles(
                              () =>
                                fitmentUploadService.getFilteredVehicles(
                                  sessionId || "",
                                  searchCriteria
                                )
                            );

                            if (result && result.data && result.data.vehicles) {
                              if (result.data.vehicles.length === 0) {
                                showError(
                                  "No vehicles found matching your criteria"
                                );
                                return;
                              }

                              setFilteredVehicles(result.data.vehicles);
                              setManualStep(2);
                              showSuccess(
                                `Found ${result.data.vehicles.length} vehicles`,
                                3000
                              );
                            } else {
                              showError("Failed to search vehicles");
                            }
                          } catch (error) {
                            console.error("Vehicle search error:", error);
                            showError("Failed to search vehicles");
                          }
                        }}
                      >
                        Search Vehicles
                      </Button>
                    </Group>
                  </Stack>
                </Stepper.Step>

                <Stepper.Step
                  label="Vehicle Selection"
                  description="Choose specific vehicles"
                  icon={<IconList size={18} />}
                >
                  <Stack gap="md" mt={20}>
                    <Group justify="space-between">
                      <Text size="lg" fw={600} c="#1e293b">
                        Step 2: Select Vehicles ({filteredVehicles.length}{" "}
                        found)
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
                              background: selectedVehicles.includes(vehicle.id)
                                ? "#eff6ff"
                                : "#ffffff",
                              border: selectedVehicles.includes(vehicle.id)
                                ? "2px solid #3b82f6"
                                : "1px solid #e2e8f0",
                              borderRadius: "8px",
                              cursor: "pointer",
                            }}
                            onClick={() => {
                              const vehicleId = vehicle.id;
                              setSelectedVehicles((prev) =>
                                prev.includes(vehicleId)
                                  ? prev.filter((id) => id !== vehicleId)
                                  : [...prev, vehicleId]
                              );
                            }}
                          >
                            <Group gap={40}>
                              <Checkbox
                                checked={selectedVehicles.includes(vehicle.id)}
                                onChange={() => {}}
                              />
                              <div>
                                <Text fw={600} size="sm" c="#1e293b">
                                  {vehicle.year} {vehicle.make} {vehicle.model}
                                </Text>
                                <Text size="xs" c="#64748b">
                                  {vehicle.submodel} • {vehicle.driveType} •{" "}
                                  {vehicle.fuelType} • {vehicle.bodyType}
                                </Text>
                              </div>
                            </Group>
                          </Card>
                        ))}
                      </Stack>
                    </ScrollArea>

                    <Group justify="space-between" mt="lg">
                      <Button
                        variant="outline"
                        size="md"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => setManualStep(1)}
                      >
                        Back
                      </Button>
                      <Button
                        onClick={() => setManualStep(3)}
                        disabled={selectedVehicles.length === 0}
                      >
                        Continue ({selectedVehicles.length} selected)
                      </Button>
                    </Group>
                  </Stack>
                </Stepper.Step>

                <Stepper.Step
                  label="Fitment Details"
                  description="Configure fitment settings"
                  icon={<IconSettings size={18} />}
                >
                  <Stack gap="xl" mt={20}>
                    <div>
                      <Title order={3} c="#1e293b" fw={700} mb="xs">
                        Fitment Details
                      </Title>
                      <Text size="sm" c="#64748b">
                        Configure the specific details for your fitment
                        application
                      </Text>
                    </div>

                    <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
                      <Select
                        label="Part Type"
                        placeholder="Select a part"
                        data={dropdownData?.parts || []}
                        value={fitmentDetails.partId}
                        onChange={(value) =>
                          setFitmentDetails((prev) => ({
                            ...prev,
                            partId: value || "",
                          }))
                        }
                        searchable
                        disabled={loadingDropdownData}
                        required
                        leftSection={<IconPackage size={16} color="#64748b" />}
                      />
                      <Select
                        label="Position"
                        placeholder="Select position"
                        data={dropdownData?.positions || []}
                        value={fitmentDetails.position}
                        onChange={(value) =>
                          setFitmentDetails((prev) => ({
                            ...prev,
                            position: value || "",
                          }))
                        }
                        searchable
                        disabled={loadingDropdownData}
                        required
                        leftSection={<IconMapPin size={16} color="#64748b" />}
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
                        leftSection={<IconHash size={16} color="#64748b" />}
                      />
                    </SimpleGrid>

                    <TextInput
                      label="Fitment Title"
                      placeholder="Enter fitment title"
                      value={fitmentDetails.title}
                      onChange={(e) =>
                        setFitmentDetails((prev) => ({
                          ...prev,
                          title: e.target.value,
                        }))
                      }
                      required
                      leftSection={<IconFileText size={16} color="#64748b" />}
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
                    />

                    {/* Dynamic Product Fields */}
                    {productFormFields.length > 0 && (
                      <div>
                        <Group justify="space-between" align="center" mb="md">
                          <div>
                            <Title order={4} c="#1e293b" fw={600} mb="xs">
                              Product Configuration Fields
                            </Title>
                            <Text size="sm" c="#64748b">
                              Additional product fields configured in Settings
                            </Text>
                          </div>
                          <Button
                            variant="outline"
                            size="xs"
                            leftSection={<IconRefresh size={14} />}
                            onClick={() => {
                              if (refreshProductFields) {
                                refreshProductFields();
                              }
                            }}
                            loading={productFieldsLoading}
                          >
                            Refresh Fields
                          </Button>
                        </Group>

                        <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                          {productFormFields.map((fieldConfig) => {
                            return (
                              fieldConfig.show_in_forms &&
                              fieldConfig.is_enabled &&
                              fieldConfig.reference_type === "product" && (
                                <DynamicFormField
                                  key={fieldConfig.id}
                                  fieldConfig={fieldConfig}
                                  value={dynamicProductFields[fieldConfig.name]}
                                  onChange={(value) =>
                                    updateDynamicProductField(
                                      fieldConfig.name,
                                      value
                                    )
                                  }
                                  data={getFieldData(fieldConfig)}
                                  disabled={
                                    loadingDropdownData ||
                                    productFieldsLoading ||
                                    fieldConfig.requirement_level === "disabled"
                                  }
                                />
                              )
                            );
                          })}
                        </SimpleGrid>
                      </div>
                    )}

                    <Group justify="space-between" mt="xl">
                      <Button
                        variant="outline"
                        size="md"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => setManualStep(2)}
                      >
                        Back
                      </Button>

                      <Button
                        size="md"
                        leftSection={<IconSettings size={16} />}
                        onClick={async () => {
                          if (!sessionId) {
                            showError("Session not found");
                            return;
                          }

                          if (!fitmentDetails.partId) {
                            showError("Please select a part type");
                            return;
                          }

                          if (!fitmentDetails.position) {
                            showError("Please select a position");
                            return;
                          }

                          if (!fitmentDetails.title) {
                            showError("Please enter a fitment title");
                            return;
                          }

                          if (selectedVehicles.length === 0) {
                            showError("Please select at least one vehicle");
                            return;
                          }

                          setApplyingManualFitment(true);
                          try {
                            const fitmentsData = selectedVehicles.map(
                              (vehicleId) => {
                                const vehicle = filteredVehicles.find(
                                  (v) => v.id === vehicleId
                                );
                                return {
                                  partId: fitmentDetails.partId,
                                  title: fitmentDetails.title,
                                  description: fitmentDetails.description,
                                  notes: fitmentDetails.notes,
                                  quantity: fitmentDetails.quantity,
                                  position: fitmentDetails.position,
                                  liftHeight: fitmentDetails.liftHeight,
                                  wheelType: fitmentDetails.wheelType,
                                  fitmentType: "manual_fitment",
                                  tenantId: currentEntity?.id || null,
                                  year: vehicle?.year || 0,
                                  make: vehicle?.make || "",
                                  model: vehicle?.model || "",
                                  submodel: vehicle?.submodel || "",
                                  driveType: vehicle?.driveType || "",
                                  fuelType: vehicle?.fuelType || "",
                                  numDoors: vehicle?.numDoors || 0,
                                  bodyType: vehicle?.bodyType || "",
                                  baseVehicleId: vehicleId,
                                  partTypeId: fitmentDetails.partId,
                                  partTypeDescriptor: fitmentDetails.title,
                                  positionId: 0,
                                  ...dynamicVcdbFields,
                                  ...dynamicProductFields,
                                };
                              }
                            );

                            const result: any = await createFitment(() =>
                              dataUploadService.createFitment(fitmentsData)
                            );

                            if (result && result.data) {
                              showSuccess(
                                `Successfully created ${result.data.created} fitments!`,
                                5000
                              );
                              handleBackToMethodSelection();
                            } else {
                              showError("Failed to create fitments");
                            }
                          } catch (error) {
                            console.error("Create fitment error:", error);
                            showError("Failed to create fitments");
                          } finally {
                            setApplyingManualFitment(false);
                          }
                        }}
                        loading={applyingManualFitment}
                        disabled={
                          !fitmentDetails.partId ||
                          !fitmentDetails.position ||
                          !fitmentDetails.title ||
                          selectedVehicles.length === 0
                        }
                      >
                        Apply Fitment
                      </Button>
                    </Group>
                  </Stack>
                </Stepper.Step>
              </Stepper>
            </Stack>
          </Card>
        )}
      </Stack>

      {/* Review & Approve Modal */}
      <Modal
        opened={!!selectedJobForReview}
        onClose={() => {
          setSelectedJobForReview(null);
          setJobFitments([]);
          setSelectedJobFitments([]);
        }}
        size="xl"
        title={
          <div>
            <Text fw={700} size="xl" c="#1e293b">
              Review AI Fitments
            </Text>
            <Text size="sm" c="#64748b" mt={4}>
              Review and approve fitments before moving them to Fitment
              Management
            </Text>
          </div>
        }
        styles={{
          header: {
            padding: "24px 24px 16px 24px",
            borderBottom: "1px solid #e2e8f0",
          },
          body: {
            padding: "24px",
          },
          content: {
            borderRadius: "12px",
          },
        }}
      >
        <Stack gap="lg">
          {loadingJobFitments ? (
            <Center p="xl">
              <Stack align="center" gap="md">
                <Progress value={100} size="lg" w="100%" animated />
                <Text size="sm" c="dimmed">
                  Loading fitments for review...
                </Text>
              </Stack>
            </Center>
          ) : (
            <>
              <Group justify="space-between">
                <Group gap="xs">
                  <Checkbox
                    checked={
                      selectedJobFitments.length === jobFitments.length &&
                      jobFitments.length > 0
                    }
                    indeterminate={
                      selectedJobFitments.length > 0 &&
                      selectedJobFitments.length < jobFitments.length
                    }
                    onChange={(event) => {
                      if (event.currentTarget.checked) {
                        setSelectedJobFitments(
                          jobFitments.map((f: any) => f.id)
                        );
                      } else {
                        setSelectedJobFitments([]);
                      }
                    }}
                    label={
                      <Text size="sm" fw={600}>
                        Select All ({selectedJobFitments.length}/
                        {jobFitments.length})
                      </Text>
                    }
                  />
                </Group>
                <Group gap="sm">
                  <Button
                    variant="light"
                    color="red"
                    size="sm"
                    leftSection={<IconX size={16} />}
                    onClick={handleRejectJobFitments}
                    disabled={selectedJobFitments.length === 0}
                    loading={approvingFitments}
                  >
                    Reject Selected ({selectedJobFitments.length})
                  </Button>
                  <Button
                    variant="filled"
                    color="green"
                    size="sm"
                    leftSection={<IconCheck size={16} />}
                    onClick={handleApproveJobFitments}
                    disabled={selectedJobFitments.length === 0}
                    loading={approvingFitments}
                  >
                    Approve Selected ({selectedJobFitments.length})
                  </Button>
                </Group>
              </Group>

              <ScrollArea h={500}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: "50px" }}>
                        <Checkbox
                          checked={
                            selectedJobFitments.length === jobFitments.length
                          }
                          indeterminate={
                            selectedJobFitments.length > 0 &&
                            selectedJobFitments.length < jobFitments.length
                          }
                          onChange={(event) => {
                            if (event.currentTarget.checked) {
                              setSelectedJobFitments(
                                jobFitments.map((f: any) => f.id)
                              );
                            } else {
                              setSelectedJobFitments([]);
                            }
                          }}
                        />
                      </Table.Th>
                      <Table.Th>Part ID</Table.Th>
                      <Table.Th>Year</Table.Th>
                      <Table.Th>Make</Table.Th>
                      <Table.Th>Model</Table.Th>
                      <Table.Th>Confidence</Table.Th>
                      <Table.Th>Actions</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {jobFitments.map((fitment: any) => (
                      <Table.Tr key={fitment.id}>
                        <Table.Td>
                          <Checkbox
                            checked={selectedJobFitments.includes(fitment.id)}
                            onChange={(event) => {
                              if (event.currentTarget.checked) {
                                setSelectedJobFitments((prev) => [
                                  ...prev,
                                  fitment.id,
                                ]);
                              } else {
                                setSelectedJobFitments((prev) =>
                                  prev.filter((id) => id !== fitment.id)
                                );
                              }
                            }}
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm" fw={600} c="#3b82f6">
                            {fitment.part_id}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{fitment.year}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{fitment.make}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{fitment.model}</Text>
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
                          >
                            {Math.round(fitment.confidence * 100)}%
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => handleEditFitment(fitment)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>
            </>
          )}
        </Stack>
      </Modal>

      {/* Edit Fitment Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={
          <div>
            <Text fw={700} size="xl" c="#1e293b">
              Edit Fitment
            </Text>
            <Text size="sm" c="#64748b" mt={4}>
              Modify the fitment details before approval
            </Text>
          </div>
        }
        size="lg"
      >
        <Stack gap="lg">
          <SimpleGrid cols={2} spacing="lg">
            <TextInput
              label="Part ID"
              value={editFormData.part_id || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, part_id: e.target.value })
              }
            />
            <NumberInput
              label="Year"
              value={editFormData.year || 2020}
              onChange={(value) =>
                setEditFormData({ ...editFormData, year: value })
              }
            />
            <TextInput
              label="Make"
              value={editFormData.make || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, make: e.target.value })
              }
            />
            <TextInput
              label="Model"
              value={editFormData.model || ""}
              onChange={(e) =>
                setEditFormData({ ...editFormData, model: e.target.value })
              }
            />
          </SimpleGrid>

          <Group justify="flex-end" gap="md" mt="lg">
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={savingEdit}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveEdit} loading={savingEdit}>
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
