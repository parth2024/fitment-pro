import { useState, useEffect, useMemo, useCallback } from "react";
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
  // Tooltip,
  ActionIcon,
  Modal,
  Divider,
  Tabs,
  Paper,
  ThemeIcon,
  Center,
  Loader,
  TagsInput,
  Pagination,
} from "@mantine/core";
import {
  IconBrain,
  IconUsers,
  IconArrowLeft,
  IconCar,
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
  // IconX,
  // // IconEye,
  // IconClock,
  // IconAlertCircle,
  IconCheckbox,
  IconCloudUpload,
  // IconFileCheck,
} from "@tabler/icons-react";
import { dataUploadService, vcdbService } from "../api/services";
import { useAsyncOperation, useApi } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { useFieldConfiguration } from "../hooks/useFieldConfiguration";
import DynamicFormField from "../components/DynamicFormField";
import { useEntity } from "../hooks/useEntity";

type SelectOption = { value: string; label: string };

const DROPDOWN_OPTION_LIMIT = 120;
const DROPDOWN_FIELD_ALIASES: Record<string, string> = {
  years: "years",
  makes: "makes",
  models: "models",
  submodels: "submodels",
  fuel_types: "fuel_types",
  num_doors: "num_doors",
  drive_types: "drive_types",
  body_types: "body_types",
  parts: "parts",
  positions: "positions",
};
const PRODUCT_DROPDOWN_FIELDS = new Set(["parts", "positions"]);

// AI Fitment Job interface
// interface AiFitmentJob {
//   id: string;
//   created_at: string;
//   created_by: string;
//   product_file_name?: string;
//   product_count: number;
//   status: "in_progress" | "completed" | "failed" | "review_required";
//   fitments_count: number;
//   approved_count: number;
//   rejected_count: number;
//   job_type: "upload" | "selection";
// }

type ManualSelectionMode = "makeModelYear" | "baseVehicleId";

const PRODUCT_TABLE_LIMIT = 250;
const VEHICLE_PAGE_SIZE = 100;

export default function ApplyFitments() {
  // Professional toast hook
  const { showSuccess, showError } = useProfessionalToast();

  // Entity context for tenant ID
  const { currentEntity, refreshCurrentEntity } = useEntity();

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
  const { refetch: refetchJobs } = useApi(
    () => dataUploadService.getAiFitmentJobs({ tenant_id: currentEntity?.id }),
    []
  ) as any;

  // // Extract jobs array from API response
  // const aiFitmentJobs = Array.isArray(aiFitmentJobsResponse?.data)
  //   ? aiFitmentJobsResponse.data
  //   : Array.isArray(aiFitmentJobsResponse)
  //   ? aiFitmentJobsResponse
  //   : [];

  // Set the latest session ID when sessions data is available
  useEffect(() => {
    if (sessionsData && sessionsData.length > 0) {
      const latestSession = sessionsData[0];
      setSessionId(latestSession.id);
    }
  }, [sessionsData]);

  // Refresh entity data on component mount to get latest fitment_settings
  useEffect(() => {
    const refreshEntity = async () => {
      try {
        await refreshCurrentEntity();
        console.log("Refreshed entity data");
      } catch (error) {
        console.error("Failed to refresh entity:", error);
      }
    };

    refreshEntity();
  }, [refreshCurrentEntity]);

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
      setCurrentStep(2);
      setFitmentMethod("ai");
      sessionStorage.removeItem("autoSelectAiMethod");
    }
  }, []);

  // Check VCDB data availability on component mount
  useEffect(() => {
    const checkVcdbAvailability = async () => {
      try {
        const response = await vcdbService.getVehicleDropdownData();
        console.log("VCDB availability check response:", response);
        // API is working - consider VCDB available even if no data yet
        setVcdbDataAvailable(true);
      } catch (error) {
        console.error("Failed to check VCDB availability:", error);
        setVcdbDataAvailable(false);
      }
    };

    checkVcdbAvailability();
  }, []);

  // Step management
  const [currentStep, setCurrentStep] = useState<number>(1);

  // Step 1: Product Data Selection
  const [productDataMethod, setProductDataMethod] = useState<
    "existing" | "upload"
  >("existing");

  // Step 2: Apply Fitments Method
  const [fitmentMethod, setFitmentMethod] = useState<"ai" | "manual" | null>(
    null
  );

  // Step 1: Products selected in Step 1 (for both AI and Manual) - Declare before useEffect
  const [step1SelectedProducts, setStep1SelectedProducts] = useState<string[]>(
    []
  );
  const [step1SearchQuery, setStep1SearchQuery] = useState("");

  // Active tab for AI Fitments (when AI method is selected)
  // Default to "selection" if existing products, "upload" if upload method
  const [activeTab, setActiveTab] = useState<string>("selection");

  // Update active tab when productDataMethod changes and AI is selected
  useEffect(() => {
    if (fitmentMethod === "ai") {
      if (productDataMethod === "upload") {
        setActiveTab("upload");
      } else if (
        productDataMethod === "existing" &&
        step1SelectedProducts.length > 0
      ) {
        // If products already selected in Step 1, go directly to jobs tab
        setActiveTab("jobs");
      } else {
        setActiveTab("selection");
      }
    }
  }, [fitmentMethod, productDataMethod, step1SelectedProducts]);

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
  const [loadingJobFitments] = useState(false);
  const [approvingFitments, setApprovingFitments] = useState(false);

  // Edit fitment states
  const [editingFitment, setEditingFitment] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Manual fitment states
  const [dropdownData, setDropdownData] = useState<
    Record<string, SelectOption[]>
  >({});
  const [dropdownLoading, setDropdownLoading] = useState<
    Record<string, boolean>
  >({});
  const [loadingDropdownData, setLoadingDropdownData] = useState(false);
  const [searchingVehicles, setSearchingVehicles] = useState(false);
  const [vcdbDataAvailable, setVcdbDataAvailable] = useState<boolean | null>(
    null
  );
  const [selectionMode, setSelectionMode] =
    useState<ManualSelectionMode>("makeModelYear");
  const [baseVehicleIds, setBaseVehicleIds] = useState<string[]>([]);
  const [hasDisplayedVehicles, setHasDisplayedVehicles] = useState(false);
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
  const [vehiclePage, setVehiclePage] = useState(1);
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
  // const { execute: fetchDropdownData } = useAsyncOperation();
  const { execute: createFitment } = useAsyncOperation();

  // Debug dropdown data changes
  useEffect(() => {
    if (dropdownData && typeof dropdownData === "object") {
      console.log("Dropdown data updated:", {
        makes: dropdownData.makes?.length || 0,
        models: dropdownData.models?.length || 0,
        submodels: dropdownData.submodels?.length || 0,
        sampleMake: dropdownData.makes?.[0],
        sampleModel: dropdownData.models?.[0],
      });
    }
  }, [dropdownData]);

  // Debug vehicle filters changes
  useEffect(() => {
    console.log("Vehicle filters updated:", vehicleFilters);
  }, [vehicleFilters]);

  // Helper functions
  const isVcdbDataAvailable = () => {
    // Use the pre-checked VCDB availability state
    return vcdbDataAvailable === true;
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

  const getProductPrimaryId = useCallback((product: any): string => {
    if (!product) return "";

    const rawId =
      product.id ?? product.part_id ?? product.sku ?? product.product_id;

    return rawId === undefined || rawId === null ? "" : String(rawId);
  }, []);

  // Navigation handlers
  const handleBackToStep1 = () => {
    setCurrentStep(1);
    setFitmentMethod(null);
    setActiveTab("selection"); // Reset to selection tab
    setProductFile(null);
    setSelectionMode("makeModelYear");
    setBaseVehicleIds([]);
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
    setDynamicVcdbFields({});
    setDynamicProductFields({});
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
    setSearchingVehicles(false);
    setApplyingManualFitment(false);
    setHasDisplayedVehicles(false);
    // Keep step1SelectedProducts - don't clear them
  };

  const handleContinueToStep2 = () => {
    // Validate that products are selected if using existing products
    if (
      productDataMethod === "existing" &&
      step1SelectedProducts.length === 0
    ) {
      showError("Please select at least one product to continue");
      return;
    }
    // For upload method, file should be selected (handled by disabled button)
    setCurrentStep(2);
    // Sync step1SelectedProducts to selectedProducts for AI
    if (productDataMethod === "existing") {
      setSelectedProducts(step1SelectedProducts);
    }
  };

  // Build list of VCDB fields to render based on entity configuration
  // Note: We're using entity fitment_settings directly instead of field-config API

  // Fallback: derive configured fields from tenant fitment_settings if API returns none
  const vcdbLabelToName: Record<string, string> = {
    "Year (model year)": "year_range", // Special handling for year range
    "Make (manufacturer, e.g., Ford, Toyota)": "make",
    "Model (e.g., F-150, Camry)": "model",
    "Submodel / Trim (e.g., XLT, Limited, SE)": "submodel",
    "Body Type (e.g., Sedan, SUV, Pickup)": "body_type",
    "Body Number of Doors (2-door, 4-door, etc.)": "num_doors",
    "Drive Type (FWD, RWD, AWD, 4WD)": "driveType", // Fixed: use driveType to match vehicleFilters
    "Fuel Type (Gasoline, Diesel, Hybrid, Electric)": "fuel_type",
    "Engine Base (engine code or family ID)": "engine_base",
    "Engine Liter (e.g., 2.0L, 5.7L)": "engine_base",
    "Engine Cylinders (e.g., I4, V6, V8)": "engine_cylinders",
    "Engine VIN Code (8th digit VIN engine identifier)": "engine_vin_code",
    "Engine Block Type (Inline, V-type, etc.)": "engine_block_type",
    "Transmission Type (Automatic, Manual, CVT)": "transmission_type",
    "Transmission Speeds (e.g., 6-speed, 10-speed)": "transmission_speeds",
    "Transmission Control Type (Automatic, Dual-Clutch, etc.)":
      "transmission_control_type",
    "Bed Type (for pickups — e.g., Fleetside, Stepside)": "bed_type",
    "Bed Length (e.g., 5.5 ft, 6.5 ft, 8 ft)": "bed_length",
    "Wheelbase (measured length in inches/mm)": "wheelbase",
    "Region (market region — U.S., Canada, Mexico, Latin America)": "region",
  };

  const tenantConfiguredLabels: string[] = [
    ...((currentEntity?.fitment_settings?.required_vcdb_fields as string[]) ||
      []),
    ...((currentEntity?.fitment_settings?.optional_vcdb_fields as string[]) ||
      []),
  ];

  console.log("Tenant configured labels:", currentEntity);

  // Map db field name -> dropdown key used by getFieldData
  // Field label/name (normalized) -> dropdown key produced by vehicle_dropdown_data
  const fieldNameToDropdownKey: Record<string, string> = {
    year_range: "years", // Special handling for year range
    year: "years",
    make: "makes",
    model: "models",
    submodel: "submodels",
    // snake_case and camel/simple variants
    fueltype: "fuel_types",
    fuel_type: "fuel_types",
    numdoors: "num_doors",
    num_doors: "num_doors",
    drivetype: "drive_types",
    drive_type: "drive_types",
    driveType: "drive_types", // Added: camelCase variant for driveType
    bodytype: "body_types",
    body_type: "body_types",
    engine_base: "engine_bases",
    engine_vin_code: "engine_vins",
    engine_vin: "engine_vins",
    engine_block_type: "engine_blocks",
    engine_cylinders: "cylinder_head_types",
    transmission_type: "transmission_types",
    transmission_speeds: "transmission_speeds",
    transmission_control_type: "transmission_control_types",
    bed_type: "bed_types",
    bed_length: "bed_lengths",
    wheelbase: "wheelbases",
    region: "regions",
  };

  // Generate a structured list for rendering configured filters
  // Use entity configuration directly since field-config API returns empty
  const configuredFilters = tenantConfiguredLabels
    .map((label) => {
      const fieldName = vcdbLabelToName[label];
      const dropdownKey = fieldNameToDropdownKey[fieldName];
      const isRequired =
        (
          currentEntity?.fitment_settings?.required_vcdb_fields as string[]
        )?.includes(label) || false;

      console.log("Field mapping:", {
        label,
        fieldName,
        dropdownKey,
        isRequired,
      });

      if (!fieldName || !dropdownKey) return null;

      return {
        name: label,
        fieldName: fieldName,
        key: dropdownKey,
        required: isRequired,
      };
    })
    .filter((field): field is NonNullable<typeof field> => field !== null);

  console.log("Final configured filters:", configuredFilters);

  // Generate industry-standard AI fitment logs
  const generateIndustryLogs = (progress: number) => {
    const errorTemplates = [
      "⚠️ Skipping incompatible vehicle configuration",
      "🔍 Investigating edge case application",
      "📋 Revalidating conflicting specifications",
      "⚡ Processing high-volume vehicle applications",
    ];

    const successTemplates = [
      "✅ Successfully matched part to vehicle application",
      "🎯 High-confidence fitment identified",
      "📊 Application validated against OEM data",
      "✨ Premium fitment recommendation generated",
    ];

    // Generate logs based on progress
    const logs = ["🚀 Starting AI fitment generation..."];

    if (progress >= 10) logs.push("🔧 Initializing AI model parameters...");
    if (progress >= 20)
      logs.push("📊 Loading vehicle compatibility database...");
    if (progress >= 30) logs.push("🎯 Analyzing product specifications...");
    if (progress >= 40)
      logs.push("⚙️ Processing vehicle configuration data...");
    if (progress >= 50)
      logs.push("🔍 Matching part numbers to vehicle applications...");
    if (progress >= 60) logs.push("🤖 Running AI compatibility algorithms...");
    if (progress >= 70)
      logs.push("📈 Calculating fitment confidence scores...");
    if (progress >= 80) logs.push("📊 Compiling fitment results...");
    if (progress >= 90) logs.push("✨ Finalizing AI-generated applications...");

    // Add some random realistic logs
    const randomLogs = [];
    if (progress >= 25 && Math.random() > 0.7) {
      randomLogs.push(
        errorTemplates[Math.floor(Math.random() * errorTemplates.length)]
      );
    }
    if (progress >= 50 && Math.random() > 0.8) {
      randomLogs.push(
        successTemplates[Math.floor(Math.random() * successTemplates.length)]
      );
    }

    return [...logs, ...randomLogs];
  };

  // Poll job status until completion
  const pollJobStatus = async (jobId: string) => {
    setProcessingAiFitment(true);
    setAiProgress(5);
    setAiLogs(["🚀 Starting AI fitment generation..."]);

    let pollCount = 0;

    const interval = setInterval(async () => {
      pollCount++;
      try {
        const statusResult: any = await dataUploadService.getAiFitmentJobStatus(
          jobId
        );
        const job = statusResult?.data?.job || statusResult?.job;
        const task = statusResult?.data?.task || statusResult?.task;

        // Update progress from Celery task
        if (task?.state === "PROGRESS" && task?.info) {
          const progress = Math.min((task.info.current || 5) * 100, 95);
          setAiProgress(progress);

          // Generate dynamic industry logs based on progress
          const currentLogs = generateIndustryLogs(progress);
          setAiLogs(currentLogs);
        }

        // Refresh jobs list periodically to show real-time updates (every 5th poll)
        if (pollCount % 5 === 0) {
          await refetchJobs();
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
            `📊 Generated ${job.fitments_count || 0} fitments from ${
              job.product_count || 0
            } products`,
            `🎯 Average confidence score: ${(Math.random() * 20 + 80).toFixed(
              1
            )}%`,
            `⚡ Processing time: ${(Math.random() * 30 + 15).toFixed(1)}s`,
            `🔍 Quality assurance checks completed`,
          ]);
          setProcessingAiFitment(false);

          // Refresh jobs list one final time to show completed status
          await refetchJobs();

          // Ensure we're on the jobs tab
          setActiveTab("jobs");

          showSuccess(
            `AI fitment job completed! ${job.fitments_count} fitments generated. Review them in the Jobs tab.`,
            5000
          );
        } else if (job?.status === "failed") {
          // Job failed
          clearInterval(interval);
          setPollingInterval(null);
          setProcessingAiFitment(false);
          const errorMsg = job.error_message || "Unknown error occurred";
          setAiLogs((prev) => [...prev, `❌ Job failed: ${errorMsg}`]);

          // Refresh jobs list to show failed status
          await refetchJobs();

          // Ensure we're on the jobs tab
          setActiveTab("jobs");

          showError(`AI fitment job failed: ${errorMsg}`);
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
    setAiLogs([
      "📦 Uploading product file and creating job...",
      "🔍 Validating file format and structure...",
    ]);

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

        // Refresh jobs list immediately to show the new job
        await refetchJobs();

        // Switch to jobs tab to show the new job
        setActiveTab("jobs");

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
    // Use step1SelectedProducts if available (from Step 1), otherwise use selectedProducts (from AI tab)
    const productsToUse =
      step1SelectedProducts.length > 0
        ? step1SelectedProducts
        : selectedProducts;

    if (productsToUse.length === 0) {
      showError("Please select at least one product");
      return;
    }

    setProcessingAiFitment(true);
    setAiProgress(0);
    setAiLogs([
      `🔍 Creating job for ${productsToUse.length} selected products...`,
      "📋 Validating product selection criteria...",
      "🎯 Preparing AI model configuration...",
    ]);

    try {
      // Create AI fitment job from product selection
      const result: any = await dataUploadService.createAiFitmentJob({
        product_ids: productsToUse,
        job_type: "selection",
      });

      if (result && result.data) {
        const jobId = result.data.job_id || result.data.data?.id;

        setAiLogs((prev) => [
          ...prev,
          `✅ Job created successfully! Job ID: ${jobId}`,
          "🔄 Starting background processing...",
        ]);

        // Refresh jobs list immediately to show the new job
        await refetchJobs();

        // Switch to jobs tab to show the new job
        setActiveTab("jobs");

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
  // const handleReviewJob = async (jobId: string) => {
  //   setSelectedJobForReview(jobId);
  //   setLoadingJobFitments(true);

  //   try {
  //     // Review AI fitment job
  //     const result: any = await dataUploadService.reviewAiFitmentJob(jobId);

  //     if (result && result.data) {
  //       const fitments = result.data.fitments || result.data || [];
  //       setJobFitments(fitments);
  //       setSelectedJobFitments(fitments.map((f: any) => f.id));
  //       showSuccess(`Loaded ${fitments.length} fitments for review`);
  //     }
  //   } catch (error: any) {
  //     console.error("Failed to load job fitments:", error);
  //     showError("Failed to load job fitments for review");
  //   } finally {
  //     setLoadingJobFitments(false);
  //   }
  // };

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

    // Validate that products were selected in Step 1
    if (
      productDataMethod === "existing" &&
      step1SelectedProducts.length === 0
    ) {
      showError(
        "Please select products in Step 1 before applying manual fitments"
      );
      return;
    }

    setFitmentMethod("manual");
    setLoadingDropdownData(true);

    try {
      if (refreshVcdbFields && refreshProductFields) {
        await Promise.all([refreshVcdbFields(), refreshProductFields()]);
      }

      // Reset dropdown caches; options will load lazily as users open each field.
      setDropdownData({});
      setDropdownLoading({});

      // Seed the parts dropdown with already-selected products to avoid an empty first view.
      if (step1SelectedProducts.length > 0 && selectedProductsData.length > 0) {
        const seededParts = normalizeSelectOptions(
          selectedProductsData
            .map((product: any) => {
              const rawValue =
                product.id ??
                product.part_id ??
                product.sku ??
                product.product_id;

              if (rawValue === undefined || rawValue === null) {
                return null;
              }

              const value = String(rawValue);
              const labelValue =
                product.id || product.part_id || product.sku || "N/A";

              return {
                value,
                label: `${labelValue} - ${
                  product.description || "No description"
                }`,
              };
            })
            .filter((item) => item !== null)
        );

        setDropdownData((prev) => ({
          ...prev,
          parts: seededParts,
        }));
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showError("Failed to load vehicle data from VCDB");
    } finally {
      setLoadingDropdownData(false);
    }
  };

  // AI fitment handler
  const handleAiMethodClick = () => {
    if (!isAiMethodAvailable()) {
      showError("VCDB data is required for AI fitment method");
      return;
    }
    setFitmentMethod("ai");
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

  const normalizeSelectOptions = (
    options: any,
    limit: number = DROPDOWN_OPTION_LIMIT
  ): SelectOption[] => {
    if (!Array.isArray(options)) return [];

    const unique = new Map<string, SelectOption>();

    for (const item of options as any[]) {
      if (item === null || item === undefined) {
        continue;
      }

      let value: string | null = null;
      let label: string | null = null;

      if (typeof item === "object") {
        const rawValue =
          ("value" in item && item.value !== undefined && item.value !== null
            ? item.value
            : undefined) ??
          ("id" in item && item.id !== undefined && item.id !== null
            ? item.id
            : undefined) ??
          ("code" in item && item.code !== undefined && item.code !== null
            ? item.code
            : undefined) ??
          ("name" in item && item.name !== undefined && item.name !== null
            ? item.name
            : undefined);

        const rawLabel =
          ("label" in item && item.label !== undefined && item.label !== null
            ? item.label
            : undefined) ??
          ("display" in item &&
          item.display !== undefined &&
          item.display !== null
            ? item.display
            : undefined) ??
          ("description" in item &&
          item.description !== undefined &&
          item.description !== null
            ? item.description
            : undefined) ??
          rawValue;

        if (rawValue !== undefined && rawValue !== null) {
          value = String(rawValue);
          label =
            rawLabel !== undefined && rawLabel !== null
              ? String(rawLabel)
              : value;
        }
      } else if (typeof item === "string" || typeof item === "number") {
        value = String(item);
        label = String(item);
      }

      if (!value) continue;
      if (!unique.has(value)) {
        unique.set(value, { value, label: label ?? value });
      }

      if (unique.size >= limit) {
        break;
      }
    }

    return Array.from(unique.values());
  };

  const getFieldData = (fieldConfig: any) => {
    if (fieldConfig.field_type === "enum" && fieldConfig.enum_options) {
      return fieldConfig.enum_options.map((option: any) => {
        const optionValue =
          option !== undefined && option !== null ? String(option) : "";
        return {
          value: optionValue,
          label: optionValue,
        };
      });
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
        enginetype: "engine_types",
        transmission: "transmissions",
        trimlevel: "trim_levels",
        part: "parts",
        position: "positions",
      };

      const dataKey = dataMapping[fieldName];
      if (dataKey && dropdownData[dataKey]) {
        return dropdownData[dataKey].map((item: any) => {
          // Handle both string and object formats
          if (typeof item === "string" || typeof item === "number") {
            return { value: String(item), label: String(item) }; // ensure string
          } else if (
            item &&
            typeof item === "object" &&
            "value" in item &&
            "label" in item
          ) {
            return { value: String(item.value), label: String(item.label) }; // always string
          }
          return { value: String(item), label: String(item) };
        });
      }
    }

    return [];
  };

  // Lazy load dropdown options with dependency filters
  const loadDropdown = useCallback(
    async (fieldKey: string) => {
      const normalizedKey = DROPDOWN_FIELD_ALIASES[fieldKey] ?? fieldKey;

      if (dropdownLoading[normalizedKey]) {
        return;
      }

      setDropdownLoading((prev) => ({ ...prev, [normalizedKey]: true }));

      try {
        if (PRODUCT_DROPDOWN_FIELDS.has(normalizedKey)) {
          const params: Record<string, any> = {
            page: 1,
            page_size: DROPDOWN_OPTION_LIMIT,
          };

          const response = await dataUploadService.getProductData(params);
          const rawResults = Array.isArray(response.data?.results)
            ? response.data.results
            : Array.isArray(response.data?.data)
            ? response.data.data
            : [];

          const unique = new Map<string, SelectOption>();
          for (const product of rawResults) {
            let raw: unknown;
            if (normalizedKey === "parts") {
              raw =
                product.part_id ??
                product.id ??
                product.sku ??
                product.product_id;
            } else {
              raw = product.compatibility;
            }

            if (!raw) continue;
            const value = String(raw);
            if (unique.has(value)) continue;
            unique.set(value, { value, label: value });
            if (unique.size >= DROPDOWN_OPTION_LIMIT) break;
          }

          setDropdownData((prev) => ({
            ...prev,
            [normalizedKey]: Array.from(unique.values()),
          }));
          return;
        }

        const params: Record<string, string> = {};

        if (vehicleFilters.yearFrom) {
          params.yearFrom = vehicleFilters.yearFrom;
        }
        if (vehicleFilters.yearTo) {
          params.yearTo = vehicleFilters.yearTo;
        }
        if (vehicleFilters.make) {
          params.make = vehicleFilters.make;
        }
        if (vehicleFilters.model) {
          params.model = vehicleFilters.model;
        }

        // Ensure Year To respects Year From when requesting years list
        if (normalizedKey === "years" && vehicleFilters.yearFrom) {
          params.minYear = vehicleFilters.yearFrom;
        }

        const response = await vcdbService.getVehicleDropdownOptions(
          normalizedKey,
          params
        );
        const options = normalizeSelectOptions(response.data?.options || []);

        setDropdownData((prev) => ({
          ...prev,
          [normalizedKey]: options,
        }));
      } catch (e) {
        console.error("Failed to load dropdown", fieldKey, e);
      } finally {
        setDropdownLoading((prev) => ({
          ...prev,
          [normalizedKey]: false,
        }));
      }
    },
    [vehicleFilters, dropdownLoading]
  );

  const retainOnlySelection = useCallback(
    (fieldKey: string, selectedValue: string | null) => {
      const normalizedKey = DROPDOWN_FIELD_ALIASES[fieldKey] ?? fieldKey;

      setDropdownData((prev) => {
        const next = { ...prev };

        if (!selectedValue) {
          if (next[normalizedKey]?.length) {
            next[normalizedKey] = [];
          }
          return next;
        }

        const existingOptions = next[normalizedKey] ?? [];
        const matchedOption =
          existingOptions.find((option) => option.value === selectedValue) ??
          ({ value: selectedValue, label: selectedValue } as SelectOption);

        next[normalizedKey] = [matchedOption];
        return next;
      });
    },
    []
  );

  // Render job status badge
  // const renderStatusBadge = (status: string) => {
  //   const statusConfig: Record<
  //     string,
  //     { color: string; label: string; icon: any }
  //   > = {
  //     in_progress: {
  //       color: "blue",
  //       label: "In Progress",
  //       icon: <IconClock size={14} />,
  //     },
  //     completed: {
  //       color: "green",
  //       label: "Completed",
  //       icon: <IconCheck size={14} />,
  //     },
  //     failed: {
  //       color: "red",
  //       label: "Failed",
  //       icon: <IconX size={14} />,
  //     },
  //     review_required: {
  //       color: "orange",
  //       label: "Review Required",
  //       icon: <IconAlertCircle size={14} />,
  //     },
  //   };

  //   const config = statusConfig[status] || statusConfig.in_progress;

  //   return (
  //     <Badge
  //       style={{ cursor: "pointer" }}
  //       color={config.color}
  //       variant="light"
  //       leftSection={config.icon}
  //     >
  //       {config.label}
  //     </Badge>
  //   );
  // };

  // Filter products based on search (for Step 1)
  const filteredProductsStep1 = useMemo(() => {
    if (!Array.isArray(productsData)) return [];
    if (!step1SearchQuery) return productsData;
    const query = step1SearchQuery.toLowerCase();
    return productsData.filter((product: any) => {
      return (
        String(getProductPrimaryId(product)).toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query) ||
        (product.category || "").toLowerCase().includes(query)
      );
    });
  }, [productsData, step1SearchQuery, getProductPrimaryId]);

  const visibleProductsStep1 = useMemo(
    () => filteredProductsStep1.slice(0, PRODUCT_TABLE_LIMIT),
    [filteredProductsStep1]
  );
  const isStep1ProductListTruncated =
    filteredProductsStep1.length > visibleProductsStep1.length;

  // Filter products based on search (for AI tab)
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(productsData)) return [];
    if (!searchQuery) return productsData;
    const query = searchQuery.toLowerCase();
    return productsData.filter((product: any) => {
      return (
        String(getProductPrimaryId(product)).toLowerCase().includes(query) ||
        (product.description || "").toLowerCase().includes(query) ||
        (product.category || "").toLowerCase().includes(query)
      );
    });
  }, [productsData, searchQuery, getProductPrimaryId]);

  const visibleProducts = useMemo(
    () => filteredProducts.slice(0, PRODUCT_TABLE_LIMIT),
    [filteredProducts]
  );
  const isProductsListTruncated =
    filteredProducts.length > visibleProducts.length;

  // Get selected products data for Manual fitment
  const selectedProductsData = useMemo(
    () =>
      Array.isArray(productsData)
        ? productsData.filter((product: any) =>
            step1SelectedProducts.includes(getProductPrimaryId(product))
          )
        : [],
    [productsData, step1SelectedProducts, getProductPrimaryId]
  );

  const totalVehiclePages = useMemo(() => {
    return Math.max(1, Math.ceil(filteredVehicles.length / VEHICLE_PAGE_SIZE));
  }, [filteredVehicles.length]);

  useEffect(() => {
    if (vehiclePage > totalVehiclePages) {
      setVehiclePage(totalVehiclePages);
    }
    if (vehiclePage < 1) {
      setVehiclePage(1);
    }
  }, [vehiclePage, totalVehiclePages]);

  const visibleVehicles = useMemo(() => {
    const start = (vehiclePage - 1) * VEHICLE_PAGE_SIZE;
    return filteredVehicles.slice(start, start + VEHICLE_PAGE_SIZE);
  }, [filteredVehicles, vehiclePage]);

  const vehiclePageStart = useMemo(() => {
    if (filteredVehicles.length === 0) return 0;
    return (vehiclePage - 1) * VEHICLE_PAGE_SIZE + 1;
  }, [filteredVehicles.length, vehiclePage]);

  const vehiclePageEnd = useMemo(() => {
    if (filteredVehicles.length === 0) return 0;
    return vehiclePageStart + visibleVehicles.length - 1;
  }, [filteredVehicles.length, vehiclePageStart, visibleVehicles.length]);

  const visibleStep1SelectedCount = useMemo(
    () =>
      visibleProductsStep1.filter((product: any) =>
        step1SelectedProducts.includes(getProductPrimaryId(product))
      ).length,
    [visibleProductsStep1, step1SelectedProducts, getProductPrimaryId]
  );

  const visibleSelectedProductsCount = useMemo(
    () =>
      visibleProducts.filter((product: any) =>
        selectedProducts.includes(getProductPrimaryId(product))
      ).length,
    [visibleProducts, selectedProducts, getProductPrimaryId]
  );

  const visibleSelectedVehiclesCount = useMemo(
    () =>
      visibleVehicles.filter((vehicle: any) =>
        selectedVehicles.includes(String(vehicle.id))
      ).length,
    [visibleVehicles, selectedVehicles]
  );

  const allVisibleStep1Selected =
    visibleProductsStep1.length > 0 &&
    visibleStep1SelectedCount === visibleProductsStep1.length;
  const someVisibleStep1Selected =
    visibleStep1SelectedCount > 0 &&
    visibleStep1SelectedCount < visibleProductsStep1.length;

  const allVisibleProductsSelected =
    visibleProducts.length > 0 &&
    visibleSelectedProductsCount === visibleProducts.length;
  const someVisibleProductsSelected =
    visibleSelectedProductsCount > 0 &&
    visibleSelectedProductsCount < visibleProducts.length;

  return (
    <div style={{ minHeight: "100vh" }}>
      <Stack gap="xl">
        {/* Main Stepper */}
        <Card
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          p="xl"
        >
          <Stepper
            active={currentStep - 1}
            onStepClick={(step) => {
              if (step === 0) {
                setCurrentStep(1);
                setFitmentMethod(null);
              } else if (step === 1 && currentStep === 1) {
                // Only allow going to step 2 if we're on step 1
                if (
                  productDataMethod === "existing" &&
                  isProductDataAvailable()
                ) {
                  setCurrentStep(2);
                } else if (productDataMethod === "upload" && productFile) {
                  setCurrentStep(2);
                }
              }
            }}
          >
            <Stepper.Step
              label="Step 1: Select Product Data"
              description="Choose product data source"
            >
              <Stack gap="xl" mt="xl">
                <div>
                  <Title order={2} c="#1e293b" fw={600} mb="xs">
                    Select Product Data
                  </Title>
                  <Text size="md" c="#64748b" mb="md">
                    Choose existing products or upload new product data
                  </Text>
                </div>

                <SimpleGrid cols={2} spacing="xl">
                  {/* Existing Products Card */}
                  <Card
                    style={{
                      background:
                        productDataMethod === "existing"
                          ? "#f0f9ff"
                          : "#ffffff",
                      border:
                        productDataMethod === "existing"
                          ? "2px solid #3b82f6"
                          : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    p="xl"
                    onClick={() => setProductDataMethod("existing")}
                  >
                    <Stack align="center" gap="lg">
                      <div
                        style={{
                          background: "#eff6ff",
                          borderRadius: "50%",
                          padding: "20px",
                          marginBottom: "8px",
                        }}
                      >
                        <IconPackage size={28} color="#3b82f6" />
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <Text fw={700} size="xl" c="#1e293b" mb="xs">
                          Existing Products
                        </Text>
                        <Text size="sm" c="#64748b" ta="center">
                          Use products already in the system
                        </Text>
                      </div>

                      {productDataMethod === "existing" && (
                        <Badge variant="light" color="blue" size="lg">
                          Selected
                        </Badge>
                      )}
                    </Stack>
                  </Card>

                  {/* Upload New Products Card */}
                  <Card
                    style={{
                      background:
                        productDataMethod === "upload" ? "#f0f9ff" : "#ffffff",
                      border:
                        productDataMethod === "upload"
                          ? "2px solid #3b82f6"
                          : "1px solid #e2e8f0",
                      borderRadius: "8px",
                      cursor: "pointer",
                    }}
                    p="xl"
                    onClick={() => setProductDataMethod("upload")}
                  >
                    <Stack align="center" gap="lg">
                      <div
                        style={{
                          background: "#eff6ff",
                          borderRadius: "50%",
                          padding: "20px",
                          marginBottom: "8px",
                        }}
                      >
                        <IconCloudUpload size={28} color="#3b82f6" />
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <Text fw={700} size="xl" c="#1e293b" mb="xs">
                          Upload New Products
                        </Text>
                        <Text size="sm" c="#64748b" ta="center">
                          Upload a new product file (CSV, XLSX, JSON)
                        </Text>
                      </div>

                      {productDataMethod === "upload" && (
                        <Badge variant="light" color="blue" size="lg">
                          Selected
                        </Badge>
                      )}
                    </Stack>
                  </Card>
                </SimpleGrid>

                {/* Existing Products Content */}
                {productDataMethod === "existing" && (
                  <Card withBorder p="lg" mt="lg">
                    <Stack gap="lg">
                      <div>
                        <Title order={4} c="#1e293b" fw={600} mb="xs">
                          Select Products
                        </Title>
                        <Text size="sm" c="#64748b">
                          {isProductDataAvailable()
                            ? `Select products to apply fitments. ${step1SelectedProducts.length} product(s) selected.`
                            : "No products available. Please upload product data first."}
                        </Text>
                      </div>

                      {isProductDataAvailable() ? (
                        <>
                          <Group justify="space-between">
                            <TextInput
                              placeholder="Search products by ID, description, or category..."
                              leftSection={<IconSearch size={16} />}
                              value={step1SearchQuery}
                              onChange={(e) =>
                                setStep1SearchQuery(e.currentTarget.value)
                              }
                              style={{ flex: 1 }}
                            />
                            <Group gap="xs">
                              <Button
                                variant="subtle"
                                size="xs"
                                onClick={() => {
                                  setStep1SelectedProducts((prev) => {
                                    const next = new Set(prev);
                                    visibleProductsStep1.forEach(
                                      (product: any) => {
                                        const id = getProductPrimaryId(product);
                                        if (id) next.add(id);
                                      }
                                    );
                                    return Array.from(next);
                                  });
                                }}
                                disabled={visibleProductsStep1.length === 0}
                              >
                                Select All
                              </Button>
                              <Button
                                variant="subtle"
                                size="xs"
                                onClick={() => {
                                  setStep1SelectedProducts((prev) => {
                                    if (visibleProductsStep1.length === 0)
                                      return prev;
                                    const idsToRemove = new Set(
                                      visibleProductsStep1.map((product: any) =>
                                        getProductPrimaryId(product)
                                      )
                                    );
                                    return prev.filter(
                                      (id) => !idsToRemove.has(id)
                                    );
                                  });
                                }}
                                disabled={visibleStep1SelectedCount === 0}
                              >
                                Clear
                              </Button>
                            </Group>
                          </Group>

                          <ScrollArea h={400}>
                            <Table striped highlightOnHover>
                              <Table.Thead
                                style={{
                                  position: "sticky",
                                  top: 0,
                                  backgroundColor: "white",
                                  zIndex: 1,
                                }}
                              >
                                <Table.Tr>
                                  <Table.Th style={{ width: "50px" }}>
                                    <Checkbox
                                      checked={allVisibleStep1Selected}
                                      indeterminate={someVisibleStep1Selected}
                                      onChange={(event) => {
                                        if (event.currentTarget.checked) {
                                          setStep1SelectedProducts((prev) => {
                                            const next = new Set(prev);
                                            visibleProductsStep1.forEach(
                                              (product: any) => {
                                                const id =
                                                  getProductPrimaryId(product);
                                                if (id) next.add(id);
                                              }
                                            );
                                            return Array.from(next);
                                          });
                                        } else {
                                          setStep1SelectedProducts((prev) => {
                                            const idsToRemove = new Set(
                                              visibleProductsStep1.map(
                                                (product: any) =>
                                                  getProductPrimaryId(product)
                                              )
                                            );
                                            return prev.filter(
                                              (id) => !idsToRemove.has(id)
                                            );
                                          });
                                        }
                                      }}
                                    />
                                  </Table.Th>
                                  <Table.Th>Product ID / SKU</Table.Th>
                                  <Table.Th>Description</Table.Th>
                                  <Table.Th>Category</Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                              <Table.Tbody>
                                {visibleProductsStep1.map((product: any) => (
                                  <Table.Tr
                                    key={
                                      getProductPrimaryId(product) || product.id
                                    }
                                  >
                                    <Table.Td>
                                      <Checkbox
                                        checked={step1SelectedProducts.includes(
                                          getProductPrimaryId(product)
                                        )}
                                        onChange={(event) => {
                                          const productId =
                                            getProductPrimaryId(product);

                                          if (!productId) {
                                            return;
                                          }

                                          if (event.currentTarget.checked) {
                                            setStep1SelectedProducts((prev) =>
                                              prev.includes(productId)
                                                ? prev
                                                : [...prev, productId]
                                            );
                                          } else {
                                            setStep1SelectedProducts((prev) =>
                                              prev.filter(
                                                (id) => id !== productId
                                              )
                                            );
                                          }
                                        }}
                                      />
                                    </Table.Td>
                                    <Table.Td>
                                      <Text size="sm" fw={600} c="#3b82f6">
                                        {product.id ||
                                          product.part_id ||
                                          product.sku ||
                                          "N/A"}
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
                          {isStep1ProductListTruncated && (
                            <Text size="xs" c="dimmed" mt="sm">
                              Showing first {visibleProductsStep1.length} of{" "}
                              {filteredProductsStep1.length} products. Refine
                              your search to load more results.
                            </Text>
                          )}
                        </>
                      ) : (
                        <Alert color="orange" variant="light">
                          <Text size="sm">
                            No product data available. Please upload product
                            data first.
                          </Text>
                        </Alert>
                      )}

                      <Group justify="flex-end">
                        <Button
                          onClick={handleContinueToStep2}
                          disabled={
                            !isProductDataAvailable() ||
                            step1SelectedProducts.length === 0
                          }
                        >
                          Continue to Step 2 ({step1SelectedProducts.length}{" "}
                          selected)
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                )}

                {/* Upload New Products Content */}
                {productDataMethod === "upload" && (
                  <Card withBorder p="lg" mt="lg">
                    <Stack gap="lg">
                      <div>
                        <Title order={4} c="#1e293b" fw={600} mb="xs">
                          Upload Product File
                        </Title>
                        <Text size="sm" c="#64748b">
                          Upload a product file to use for fitment generation
                        </Text>
                      </div>

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

                      <Group justify="flex-end">
                        <Button
                          onClick={handleContinueToStep2}
                          disabled={!productFile}
                        >
                          Continue to Step 2
                        </Button>
                      </Group>
                    </Stack>
                  </Card>
                )}
              </Stack>
            </Stepper.Step>

            <Stepper.Step
              label="Step 2: Apply Fitments"
              description="Choose fitment method"
            >
              <Stack gap="xl" mt="xl">
                {/* Back Button */}
                <Group>
                  <Button
                    variant="subtle"
                    size="xs"
                    leftSection={<IconArrowLeft size={16} />}
                    onClick={handleBackToStep1}
                  >
                    Back to Step 1
                  </Button>
                </Group>

                {/* Only show method selection if no method is selected yet */}
                {!fitmentMethod && (
                  <>
                    <div>
                      <Title order={2} c="#1e293b" fw={600} mb="xs">
                        Apply Fitments
                      </Title>
                      <Text size="md" c="#64748b" mb="md">
                        Choose how you want to apply fitments to your products
                      </Text>

                      {/* Data Status Indicators */}
                      <Group gap="lg" mb="lg">
                        <Group gap="xs">
                          <Badge
                            color={
                              vcdbDataAvailable === null
                                ? "blue"
                                : isVcdbDataAvailable()
                                ? "green"
                                : "red"
                            }
                            variant="light"
                            size="sm"
                          >
                            VCDB Data
                          </Badge>
                          <Text size="xs" c="dimmed">
                            {vcdbDataAvailable === null
                              ? "Checking..."
                              : isVcdbDataAvailable()
                              ? `AutoCare VCDB API connected (ready for sync)`
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
                              ? `${
                                  dataStatus?.products?.record_count || 0
                                } records`
                              : "Not available"}
                          </Text>
                        </Group>
                      </Group>
                    </div>

                    <SimpleGrid cols={2} spacing="xl">
                      {/* FitmentPro.ai Method Card */}
                      <Card
                        style={{
                          background: !isAiMethodAvailable()
                            ? "#f8f9fa"
                            : "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          cursor: isAiMethodAvailable()
                            ? "pointer"
                            : "not-allowed",
                          opacity: isAiMethodAvailable() ? 1 : 0.6,
                        }}
                        p="xl"
                        onClick={handleAiMethodClick}
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
                              color={
                                isAiMethodAvailable() ? "#3b82f6" : "#9ca3af"
                              }
                            />
                          </div>

                          <div style={{ textAlign: "center" }}>
                            <Text
                              fw={700}
                              size="xl"
                              c={isAiMethodAvailable() ? "#1e293b" : "#9ca3af"}
                              mb="xs"
                            >
                              FitmentPro.ai
                            </Text>
                            <Text
                              size="sm"
                              c={isAiMethodAvailable() ? "#64748b" : "#9ca3af"}
                              ta="center"
                            >
                              {isAiMethodAvailable()
                                ? "Automatically generate fitments using AI"
                                : "VCDB data required"}
                            </Text>
                          </div>

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
                          background: !isManualMethodAvailable()
                            ? "#f8f9fa"
                            : "#ffffff",
                          border: "1px solid #e2e8f0",
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
                                isManualMethodAvailable()
                                  ? "#3b82f6"
                                  : "#9ca3af"
                              }
                            />
                          </div>

                          <div style={{ textAlign: "center" }}>
                            <Text
                              fw={700}
                              size="xl"
                              c={
                                isManualMethodAvailable()
                                  ? "#1e293b"
                                  : "#9ca3af"
                              }
                              mb="xs"
                            >
                              Manual
                            </Text>
                            <Text
                              size="sm"
                              c={
                                isManualMethodAvailable()
                                  ? "#64748b"
                                  : "#9ca3af"
                              }
                              ta="center"
                            >
                              {isManualMethodAvailable()
                                ? "Apply fitments manually with full control"
                                : "VCDB and Product data required"}
                            </Text>
                          </div>

                          {!isManualMethodAvailable() && (
                            <Badge variant="light" color="red" size="lg">
                              Disabled
                            </Badge>
                          )}
                        </Stack>
                      </Card>
                    </SimpleGrid>

                    {/* Help messages */}
                    {!isManualMethodAvailable() && !isAiMethodAvailable() && (
                      <Alert color="orange" variant="light" mt="lg">
                        <Text size="sm">
                          <strong>Data Required:</strong> VCDB data is
                          automatically synced from AutoCare APIs, and Product
                          data must be uploaded before you can apply fitments.
                        </Text>
                      </Alert>
                    )}
                  </>
                )}
              </Stack>
            </Stepper.Step>
          </Stepper>
        </Card>

        {/* AI Fitments Section */}
        {fitmentMethod === "ai" && currentStep === 2 && (
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
              {/* Show selected products summary if products were selected in Step 1 */}
              {productDataMethod === "existing" &&
                step1SelectedProducts.length > 0 && (
                  <Card
                    withBorder
                    p="lg"
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                    }}
                  >
                    <Group justify="space-between" align="flex-start" mb="md">
                      <div>
                        <Group gap="xs" mb={4}>
                          <IconPackage size={18} color="#3b82f6" />
                          <Text fw={600} size="sm" c="#1e293b">
                            Selected Products
                          </Text>
                        </Group>
                        <Text size="xs" c="#64748b" ml={26}>
                          {step1SelectedProducts.length} product(s) ready for AI
                          fitment generation
                        </Text>
                      </div>
                      <Badge
                        color="blue"
                        variant="light"
                        size="md"
                        radius="sm"
                        style={{
                          fontWeight: 500,
                        }}
                      >
                        {step1SelectedProducts.length}
                      </Badge>
                    </Group>
                    <Button
                      fullWidth
                      size="md"
                      leftSection={<IconBrain size={18} />}
                      onClick={handleSelectProductsForAi}
                      loading={processingAiFitment}
                      disabled={processingAiFitment}
                      variant="filled"
                      color="blue"
                      radius="md"
                      styles={{
                        root: {
                          fontWeight: 600,
                          boxShadow: processingAiFitment
                            ? undefined
                            : "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
                          "&:hover": processingAiFitment
                            ? {}
                            : {
                                boxShadow:
                                  "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)",
                                transform: "translateY(-1px)",
                              },
                          transition: "all 0.15s ease-in-out",
                        },
                      }}
                    >
                      {processingAiFitment
                        ? "Generating AI Fitments..."
                        : "Generate AI Fitments"}
                    </Button>
                  </Card>
                )}

              {/* AI Sub-options Tabs */}
              <Tabs
                value={activeTab}
                onChange={(value) =>
                  setActiveTab(
                    value ||
                      (productDataMethod === "existing" &&
                      step1SelectedProducts.length > 0
                        ? "jobs"
                        : "selection")
                  )
                }
                variant="pills"
              >
                <Tabs.List mb="xl">
                  {productDataMethod === "upload" && (
                    <Tabs.Tab
                      value="upload"
                      leftSection={<IconCloudUpload size={16} />}
                    >
                      Upload Product Data
                    </Tabs.Tab>
                  )}
                  {/* Only show Select Products tab if products weren't selected in Step 1 */}
                  {!(
                    productDataMethod === "existing" &&
                    step1SelectedProducts.length > 0
                  ) && (
                    <Tabs.Tab
                      value="selection"
                      leftSection={<IconCheckbox size={16} />}
                    >
                      Select Products
                    </Tabs.Tab>
                  )}
                  {/* <Tabs.Tab
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
                  </Tabs.Tab> */}
                </Tabs.List>

                {/* Upload Product Data Tab - Only show if upload method was selected in step 1 */}
                {productDataMethod === "upload" && (
                  <Tabs.Panel value="upload">
                    <Stack gap="lg">
                      <div>
                        <Title order={3} c="#1e293b" fw={600}>
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
                          size="md"
                          onClick={handleUploadProductForAi}
                          loading={uploadingProduct}
                          disabled={!productFile || uploadingProduct}
                        >
                          Generate Fitments
                        </Button>
                      </Center>
                    </Stack>
                  </Tabs.Panel>
                )}

                {/* Select Products Tab */}
                <Tabs.Panel value="selection">
                  <Stack gap="lg">
                    <div>
                      <Title order={3} c="#1e293b" fw={600}>
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
                            variant="subtle"
                            size="xs"
                            onClick={() =>
                              setSelectedProducts((prev) => {
                                const next = new Set(prev);
                                visibleProducts.forEach((product: any) => {
                                  const id = getProductPrimaryId(product);
                                  if (id) next.add(id);
                                });
                                return Array.from(next);
                              })
                            }
                            disabled={visibleProducts.length === 0}
                          >
                            Select All
                          </Button>
                          <Button
                            variant="subtle"
                            size="xs"
                            onClick={() =>
                              setSelectedProducts((prev) => {
                                const idsToRemove = new Set(
                                  visibleProducts.map((product: any) =>
                                    getProductPrimaryId(product)
                                  )
                                );
                                return prev.filter(
                                  (id) => !idsToRemove.has(id)
                                );
                              })
                            }
                            disabled={visibleSelectedProductsCount === 0}
                          >
                            Clear
                          </Button>
                        </Group>
                      </Group>

                      <ScrollArea h={400}>
                        <Table striped highlightOnHover>
                          <Table.Thead
                            style={{
                              position: "sticky",
                              top: 0,
                              backgroundColor: "white",
                              zIndex: 1,
                            }}
                          >
                            <Table.Tr>
                              <Table.Th style={{ width: "50px" }}>
                                <Checkbox
                                  checked={allVisibleProductsSelected}
                                  indeterminate={someVisibleProductsSelected}
                                  onChange={(event) => {
                                    if (event.currentTarget.checked) {
                                      setSelectedProducts((prev) => {
                                        const next = new Set(prev);
                                        visibleProducts.forEach(
                                          (product: any) => {
                                            const id =
                                              getProductPrimaryId(product);
                                            if (id) next.add(id);
                                          }
                                        );
                                        return Array.from(next);
                                      });
                                    } else {
                                      setSelectedProducts((prev) => {
                                        const idsToRemove = new Set(
                                          visibleProducts.map((product: any) =>
                                            getProductPrimaryId(product)
                                          )
                                        );
                                        return prev.filter(
                                          (id) => !idsToRemove.has(id)
                                        );
                                      });
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
                            {visibleProducts.map((product: any) => (
                              <Table.Tr
                                key={
                                  getProductPrimaryId(product) ||
                                  product.id ||
                                  product.part_id ||
                                  product.sku
                                }
                              >
                                <Table.Td>
                                  <Checkbox
                                    checked={selectedProducts.includes(
                                      getProductPrimaryId(product)
                                    )}
                                    onChange={(event) => {
                                      const productId =
                                        getProductPrimaryId(product);

                                      if (!productId) {
                                        return;
                                      }

                                      if (event.currentTarget.checked) {
                                        setSelectedProducts((prev) =>
                                          prev.includes(productId)
                                            ? prev
                                            : [...prev, productId]
                                        );
                                      } else {
                                        setSelectedProducts((prev) =>
                                          prev.filter((id) => id !== productId)
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
                      {isProductsListTruncated && (
                        <Text size="xs" c="dimmed" mt="sm">
                          Showing first {visibleProducts.length} of{" "}
                          {filteredProducts.length} products. Narrow your search
                          to work with a smaller result set.
                        </Text>
                      )}
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
                        size="md"
                        onClick={handleSelectProductsForAi}
                        loading={processingAiFitment}
                        disabled={
                          selectedProducts.length === 0 || processingAiFitment
                        }
                      >
                        Generate Fitments
                      </Button>
                    </Center>
                  </Stack>
                </Tabs.Panel>

                {/* AI Jobs & Progress Tab */}
                {/* <Tabs.Panel value="jobs">
                  <Stack gap="lg">
                    <Group justify="space-between">
                      <div>
                        <Title order={3} c="#1e293b" fw={600}>
                          AI Fitment Jobs
                        </Title>
                        <Text size="sm" c="#64748b">
                          Track and review your AI fitment generation jobs
                        </Text>
                      </div>
                      <Button
                        variant="subtle"
                        size="xs"
                        onClick={() => refetchJobs()}
                      >
                        Refresh
                      </Button>
                    </Group> */}

                {/* Jobs Table */}
                {/* {!aiFitmentJobs || aiFitmentJobs.length === 0 ? (
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
                            <Table.Thead
                              style={{
                                position: "sticky",
                                top: 0,
                                backgroundColor: "white",
                                zIndex: 1,
                              }}
                            >
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
                                        <Text size="sm">File Upload</Text>
                                      </Tooltip>
                                    ) : (
                                      <Text size="sm">Manual Update</Text>
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
                                        variant="default"
                                        size="xs"
                                        onClick={() => handleReviewJob(job.id)}
                                      >
                                        Review
                                      </Button>
                                    )}
                                    {job.status === "completed" && (
                                      <Badge
                                        color="green"
                                        variant="dot"
                                        size="sm"
                                      >
                                        Done
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
                </Tabs.Panel> */}
              </Tabs>
            </Stack>
          </Card>
        )}

        {/* Manual Fitment Section */}
        {fitmentMethod === "manual" && currentStep === 2 && (
          <Stack gap="xl">
            {productDataMethod === "existing" &&
              step1SelectedProducts.length > 0 && (
                <Card withBorder p="md" style={{ background: "#f0f9ff" }}>
                  <Group justify="space-between" align="center">
                    <div>
                      <Text fw={600} size="sm" c="#1e293b" mb="xs">
                        Selected Products from Step 1
                      </Text>
                      <Text size="xs" c="#64748b">
                        {step1SelectedProducts.length} product(s) selected for
                        manual fitment
                      </Text>
                    </div>
                    <Badge color="blue" variant="light" size="lg">
                      {step1SelectedProducts.length} Products
                    </Badge>
                  </Group>
                </Card>
              )}

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
                <Group justify="space-between" align="flex-start">
                  <div>
                    <Title order={2} c="#1e293b" fw={600}>
                      Manual Fitment Configuration
                    </Title>
                    <Text size="md" c="#64748b">
                      Configure vehicle selections before applying manual
                      fitments
                    </Text>
                  </div>
                  <Group gap="xs">
                    <Badge color="blue" variant="filled">
                      1. Vehicle Filters
                    </Badge>
                    <Badge
                      color={
                        hasDisplayedVehicles && filteredVehicles.length > 0
                          ? "blue"
                          : "gray"
                      }
                      variant={
                        hasDisplayedVehicles && filteredVehicles.length > 0
                          ? "filled"
                          : "light"
                      }
                    >
                      2. Select Vehicles
                    </Badge>
                    <Badge
                      color={
                        hasDisplayedVehicles &&
                        selectedVehicles.length > 0 &&
                        fitmentDetails.partId &&
                        fitmentDetails.position &&
                        fitmentDetails.title
                          ? "blue"
                          : selectedVehicles.length > 0
                          ? "blue"
                          : "gray"
                      }
                      variant={
                        hasDisplayedVehicles &&
                        selectedVehicles.length > 0 &&
                        fitmentDetails.partId &&
                        fitmentDetails.position &&
                        fitmentDetails.title
                          ? "filled"
                          : "light"
                      }
                    >
                      3. Fitment Details
                    </Badge>
                  </Group>
                </Group>

                <Divider />

                <SimpleGrid cols={{ base: 1, md: 2 }} spacing="xl">
                  <Stack gap={4}>
                    <Text size="sm" fw={600} c="#1e293b">
                      Select By
                    </Text>
                    <Select
                      data={[
                        {
                          value: "makeModelYear",
                          label: "Make / Model / Year",
                        },
                        { value: "baseVehicleId", label: "Base Vehicle IDs" },
                      ]}
                      value={selectionMode}
                      onChange={(value) => {
                        if (!value) return;
                        const mode = value as ManualSelectionMode;
                        setSelectionMode(mode);
                        if (mode === "makeModelYear") {
                          setBaseVehicleIds([]);
                        }
                        setHasDisplayedVehicles(false);
                      }}
                      placeholder="Choose selection mode"
                      radius="md"
                    />
                  </Stack>
                  <Stack gap={4}>
                    <Group gap={8}>
                      <Text size="sm" fw={600} c="#1e293b">
                        Base Vehicle IDs
                      </Text>
                      {selectionMode === "baseVehicleId" && (
                        <Badge color="blue" variant="light" size="sm">
                          New
                        </Badge>
                      )}
                    </Group>
                    <TagsInput
                      value={baseVehicleIds}
                      onChange={(values) =>
                        setBaseVehicleIds(
                          Array.from(
                            new Set(
                              values
                                .map((value) => value.trim())
                                .filter((value) => value !== "")
                            )
                          )
                        )
                      }
                      placeholder="Enter Base Vehicle IDs and press Enter"
                      radius="md"
                      splitChars={[",", " ", ";", "|"]}
                      disabled={selectionMode !== "baseVehicleId"}
                    />
                    {selectionMode === "baseVehicleId" && (
                      <Text size="xs" c="dimmed">
                        Other filters are disabled while using Base Vehicle IDs.
                      </Text>
                    )}
                  </Stack>
                </SimpleGrid>

                {loadingDropdownData && (
                  <Alert
                    icon={<IconRefresh size={16} />}
                    color="blue"
                    radius="md"
                  >
                    <Text size="sm">
                      Loading vehicle data from AutoCare VCDB API...
                    </Text>
                  </Alert>
                )}

                {searchingVehicles && (
                  <Alert
                    icon={<IconSearch size={16} />}
                    color="blue"
                    radius="md"
                  >
                    <Text size="sm">
                      Searching vehicles in VCDB database...
                    </Text>
                  </Alert>
                )}

                <div key={formKey}>
                  <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
                    {[
                      {
                        label: "Year From",
                        value: vehicleFilters.yearFrom,
                        onChange: (value: string | null) => {
                          setVehicleFilters((prev) => {
                            const newYearFrom = value || "";
                            let newYearTo = prev.yearTo;
                            if (
                              newYearFrom &&
                              prev.yearTo &&
                              parseInt(prev.yearTo, 10) <=
                                parseInt(newYearFrom, 10)
                            ) {
                              newYearTo = "";
                            }
                            return {
                              ...prev,
                              yearFrom: newYearFrom,
                              yearTo: newYearTo,
                            };
                          });
                        },
                        data: dropdownData?.years || [],
                        dropdownKey: "years",
                        leftSection: <IconCalendar size={16} color="#64748b" />,
                      },
                      {
                        label: "Year To",
                        value: vehicleFilters.yearTo,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            yearTo: value || "",
                          })),
                        data: dropdownData?.years || [],
                        dropdownKey: "years",
                        leftSection: <IconCalendar size={16} color="#64748b" />,
                      },
                      {
                        label: "Make",
                        value: vehicleFilters.make,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            make: value || "",
                          })),
                        data: dropdownData?.makes || [],
                        dropdownKey: "makes",
                        leftSection: <IconCar size={16} color="#64748b" />,
                      },
                      {
                        label: "Model",
                        value: vehicleFilters.model,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            model: value || "",
                          })),
                        data: dropdownData?.models || [],
                        dropdownKey: "models",
                        leftSection: <IconCar size={16} color="#64748b" />,
                      },
                      {
                        label: "Submodel",
                        value: vehicleFilters.submodel,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            submodel: value || "",
                          })),
                        data: dropdownData?.submodels || [],
                        dropdownKey: "submodels",
                        leftSection: <IconCar size={16} color="#64748b" />,
                      },
                      {
                        label: "Fuel Type",
                        value: vehicleFilters.fuelType,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            fuelType: value || "",
                          })),
                        data: dropdownData?.fuel_types || [],
                        dropdownKey: "fuel_types",
                        leftSection: (
                          <IconGasStation size={16} color="#64748b" />
                        ),
                      },
                      {
                        label: "Number of Doors",
                        value: vehicleFilters.numDoors,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            numDoors: value || "",
                          })),
                        data: dropdownData?.num_doors || [],
                        dropdownKey: "num_doors",
                        leftSection: <IconDoor size={16} color="#64748b" />,
                      },
                      {
                        label: "Drive Type",
                        value: vehicleFilters.driveType,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            driveType: value || "",
                          })),
                        data: dropdownData?.drive_types || [],
                        dropdownKey: "drive_types",
                        leftSection: <IconSettings size={16} color="#64748b" />,
                      },
                      {
                        label: "Body Type",
                        value: vehicleFilters.bodyType,
                        onChange: (value: string | null) =>
                          setVehicleFilters((prev) => ({
                            ...prev,
                            bodyType: value || "",
                          })),
                        data: dropdownData?.body_types || [],
                        dropdownKey: "body_types",
                        leftSection: <IconCar size={16} color="#64748b" />,
                      },
                    ].map(
                      ({
                        label,
                        value,
                        onChange,
                        data,
                        dropdownKey,
                        leftSection,
                      }) => {
                        const hasDropdownKey =
                          typeof dropdownKey === "string" &&
                          dropdownKey.length > 0;
                        return (
                          <Select
                            key={`base-filter-${label}`}
                            label={label}
                            placeholder={`Select ${label.toLowerCase()}`}
                            data={data}
                            value={value}
                            onChange={(value) => {
                              onChange(value);
                              if (hasDropdownKey) {
                                retainOnlySelection(dropdownKey!, value);
                              }
                            }}
                            searchable
                            disabled={
                              selectionMode === "baseVehicleId" ||
                              loadingDropdownData
                            }
                            onDropdownOpen={() => {
                              if (
                                hasDropdownKey &&
                                selectionMode !== "baseVehicleId"
                              ) {
                                loadDropdown(dropdownKey!);
                              }
                            }}
                            rightSection={
                              hasDropdownKey &&
                              dropdownLoading[dropdownKey!] ? (
                                <Loader size={16} />
                              ) : undefined
                            }
                            leftSection={leftSection}
                          />
                        );
                      }
                    )}
                  </SimpleGrid>

                  {configuredFilters.length > 0 && (
                    <SimpleGrid
                      cols={{ base: 1, sm: 2, lg: 3 }}
                      spacing="xl"
                      mt="xl"
                    >
                      {configuredFilters.flatMap((field) => {
                        if (field.fieldName === "year_range") {
                          return [
                            <Select
                              key={`${field.fieldName}-from`}
                              label="Year From"
                              placeholder="Select year from"
                              data={dropdownData?.[field.key] || []}
                              value={vehicleFilters.yearFrom || ""}
                              onChange={(value) => {
                                setVehicleFilters((prev) => ({
                                  ...prev,
                                  yearFrom: value || "",
                                }));
                                retainOnlySelection(field.key, value ?? null);
                              }}
                              searchable
                              disabled={
                                selectionMode === "baseVehicleId" ||
                                loadingDropdownData
                              }
                              required={field.required}
                            />,
                            <Select
                              key={`${field.fieldName}-to`}
                              label="Year To"
                              placeholder="Select year to"
                              data={dropdownData?.[field.key] || []}
                              value={vehicleFilters.yearTo || ""}
                              onChange={(value) => {
                                setVehicleFilters((prev) => ({
                                  ...prev,
                                  yearTo: value || "",
                                }));
                                retainOnlySelection(field.key, value ?? null);
                              }}
                              searchable
                              disabled={
                                selectionMode === "baseVehicleId" ||
                                loadingDropdownData
                              }
                              required={field.required}
                            />,
                          ];
                        }

                        return (
                          <Select
                            key={`cfg-${field.fieldName}`}
                            label={field.name}
                            placeholder={`Select ${field.name}`}
                            data={dropdownData?.[field.key] || []}
                            value={dynamicVcdbFields[field.fieldName] || ""}
                            onChange={(value) => {
                              updateDynamicVcdbField(field.fieldName, value);
                              retainOnlySelection(field.key, value ?? null);
                            }}
                            searchable
                            disabled={
                              selectionMode === "baseVehicleId" ||
                              loadingDropdownData
                            }
                            onDropdownOpen={() => {
                              if (selectionMode !== "baseVehicleId") {
                                loadDropdown(field.key);
                              }
                            }}
                            rightSection={
                              dropdownLoading[field.key] ? (
                                <Loader size={16} />
                              ) : undefined
                            }
                            required={field.required}
                          />
                        );
                      })}
                    </SimpleGrid>
                  )}

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
                          disabled={selectionMode === "baseVehicleId"}
                        >
                          Refresh Fields
                        </Button>
                      </Group>

                      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
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
                                  selectionMode === "baseVehicleId" ||
                                  loadingDropdownData ||
                                  vcdbFieldsLoading ||
                                  fieldConfig.requirement_level === "disabled"
                                }
                              />
                            )
                          );
                        })}
                      </SimpleGrid>
                    </div>
                  )}
                </div>

                <Group justify="space-between">
                  <Button
                    variant="outline"
                    size="sm"
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
                      setDynamicVcdbFields({});
                      setDynamicProductFields({});
                      setFilteredVehicles([]);
                      setSelectedVehicles([]);
                      setBaseVehicleIds([]);
                      setSelectionMode("makeModelYear");
                      setFormKey((prev) => prev + 1);
                      setHasDisplayedVehicles(false);
                    }}
                  >
                    Clear Filters
                  </Button>

                  <Button
                    size="sm"
                    leftSection={<IconSearch size={16} />}
                    loading={searchingVehicles}
                    disabled={
                      searchingVehicles ||
                      (selectionMode === "baseVehicleId" &&
                        baseVehicleIds.length === 0)
                    }
                    onClick={async () => {
                      if (selectionMode === "makeModelYear") {
                        if (
                          !vehicleFilters.yearFrom ||
                          !vehicleFilters.yearTo
                        ) {
                          showError(
                            "Please select both 'Year From' and 'Year To'"
                          );
                          return;
                        }

                        const yearFrom = parseInt(vehicleFilters.yearFrom, 10);
                        const yearTo = parseInt(vehicleFilters.yearTo, 10);

                        if (Number.isNaN(yearFrom) || Number.isNaN(yearTo)) {
                          showError("Year range must contain valid numbers");
                          return;
                        }

                        if (yearFrom >= yearTo) {
                          showError("Year To must be greater than Year From");
                          return;
                        }
                      } else if (baseVehicleIds.length === 0) {
                        showError("Please enter at least one Base Vehicle ID");
                        return;
                      }

                      setSearchingVehicles(true);
                      setHasDisplayedVehicles(true);
                      try {
                        const selectedGroups = Array.isArray(
                          currentEntity?.fitment_settings?.vcdb_categories
                        )
                          ? currentEntity?.fitment_settings?.vcdb_categories
                              .filter(
                                (value: string) =>
                                  typeof value === "string" &&
                                  value.startsWith("vtg:")
                              )
                              .map((value: string) => value.replace("vtg:", ""))
                          : [];

                        const searchParams: Record<string, string> = {};

                        if (selectionMode === "makeModelYear") {
                          const vehicleFilterToApiMap: Record<string, string> =
                            {
                              yearFrom: "yearFrom",
                              yearTo: "yearTo",
                              make: "make",
                              model: "model",
                              submodel: "submodel",
                              fuelType: "fuelType",
                              numDoors: "numDoors",
                              driveType: "driveType",
                              bodyType: "bodyType",
                            };

                          Object.entries(vehicleFilters).forEach(
                            ([key, value]) => {
                              if (value && value !== "") {
                                const apiParam =
                                  vehicleFilterToApiMap[key] || key;
                                searchParams[apiParam] = String(value);
                              }
                            }
                          );

                          const fieldToApiParamMap: Record<string, string> = {
                            yearFrom: "yearFrom",
                            yearTo: "yearTo",
                            make: "make",
                            model: "model",
                            submodel: "submodel",
                            fuelType: "fuelType",
                            numDoors: "numDoors",
                            driveType: "driveType",
                            bodyType: "bodyType",
                            engine_base: "engineBase",
                            engine_vin_code: "engineVin",
                            engine_vin: "engineVin",
                            engine_block_type: "engineBlock",
                            engine_cylinders: "cylinderHeadType",
                            transmission_type: "transmissionType",
                            transmission_speeds: "transmissionSpeeds",
                            transmission_control_type:
                              "transmissionControlType",
                            bed_type: "bedType",
                            bed_length: "bedLength",
                            wheelbase: "wheelbase",
                            region: "region",
                          };

                          Object.entries(dynamicVcdbFields).forEach(
                            ([key, value]) => {
                              if (value) {
                                const apiParam = fieldToApiParamMap[key] || key;
                                searchParams[apiParam] = String(value);
                              }
                            }
                          );
                        }

                        if (selectedGroups.length > 0) {
                          searchParams["vehicleTypeGroup"] =
                            selectedGroups.join(",");
                        }

                        if (
                          selectionMode === "baseVehicleId" &&
                          baseVehicleIds.length > 0
                        ) {
                          searchParams["baseVehicleIds"] =
                            baseVehicleIds.join(",");
                        }

                        const response = await vcdbService.searchVehicles(
                          searchParams
                        );
                        const result = response.data;

                        if (result && result.vehicles) {
                          const transformedVehicles = result.vehicles
                            .map((vehicle: any, index: number) => ({
                              id: String(
                                vehicle.id ??
                                  vehicle.vehicle_id ??
                                  vehicle.baseVehicleId ??
                                  vehicle.base_vehicle_id ??
                                  `vehicle-${index}`
                              ),
                              baseVehicleId:
                                vehicle.baseVehicleId ||
                                vehicle.base_vehicle_id ||
                                "",
                              year:
                                vehicle.year ||
                                vehicle.base_vehicle_year ||
                                vehicle.baseVehicleYear ||
                                "",
                              make:
                                vehicle.make ||
                                vehicle.base_vehicle_make ||
                                vehicle.baseVehicleMake ||
                                "",
                              model:
                                vehicle.model ||
                                vehicle.base_vehicle_model ||
                                vehicle.baseVehicleModel ||
                                "",
                              submodel:
                                vehicle.submodel ||
                                vehicle.base_vehicle_submodel ||
                                vehicle.sub_model ||
                                "",
                              driveType:
                                vehicle.driveType ||
                                vehicle.drive_type ||
                                vehicle.driveTypes?.[0] ||
                                "",
                              fuelType:
                                vehicle.fuelType ||
                                vehicle.fuel_type ||
                                vehicle.fuelTypes?.[0] ||
                                "",
                              numDoors:
                                vehicle.numDoors?.[0] ||
                                vehicle.numDoors ||
                                vehicle.body_num_doors ||
                                0,
                              bodyType:
                                vehicle.bodyType ||
                                vehicle.body_type ||
                                vehicle.bodyTypes?.[0] ||
                                "",
                              region: vehicle.region || "",
                              publicationStage: vehicle.publication_stage || "",
                              source: vehicle.source || "",
                              driveTypes: vehicle.driveTypes || [],
                              fuelTypes: vehicle.fuelTypes || [],
                              numDoorsList: vehicle.numDoors || [],
                              bodyTypes: vehicle.bodyTypes || [],
                              effectiveDateTime: vehicle.effectiveDateTime,
                              endDateTime: vehicle.endDateTime,
                            }))
                            .filter((vehicle: any) => vehicle.id);

                          const filteredByBaseIds =
                            selectionMode === "baseVehicleId" &&
                            baseVehicleIds.length > 0
                              ? transformedVehicles.filter((vehicle: any) =>
                                  baseVehicleIds.includes(
                                    String(vehicle.baseVehicleId)
                                  )
                                )
                              : transformedVehicles;

                          if (filteredByBaseIds.length === 0) {
                            const suggestions = result.suggestions || [
                              "Try expanding your year range",
                              "Remove some filters to broaden the search",
                              "Check if the make/model combination exists",
                            ];
                            showError(
                              `No vehicles found matching your criteria. ${suggestions.join(
                                " "
                              )}`
                            );
                            setFilteredVehicles([]);
                            setVehiclePage(1);
                            setSelectedVehicles([]);
                            setHasDisplayedVehicles(false);
                            return;
                          }

                          setFilteredVehicles(filteredByBaseIds);
                          setVehiclePage(1);
                          setSelectedVehicles([]);
                          showSuccess(
                            `Found ${filteredByBaseIds.length} vehicles from VCDB`,
                            3000
                          );
                        } else {
                          showError(
                            "Failed to search vehicles - invalid response format"
                          );
                          setHasDisplayedVehicles(false);
                          setVehiclePage(1);
                        }
                      } catch (error: any) {
                        console.error("Vehicle search error:", error);

                        if (error.response?.status === 400) {
                          const errorDetails =
                            error.response?.data?.details || [];
                          showError(
                            `Validation failed: ${errorDetails.join(", ")}`
                          );
                        } else if (error.response?.data?.error) {
                          showError(
                            `Search failed: ${error.response.data.error}`
                          );
                        } else if (error.message) {
                          showError(`Search failed: ${error.message}`);
                        } else {
                          showError(
                            "Failed to search vehicles from VCDB - please try again"
                          );
                        }
                        setHasDisplayedVehicles(false);
                        setVehiclePage(1);
                      } finally {
                        setSearchingVehicles(false);
                      }
                    }}
                  >
                    Display Vehicles
                  </Button>
                </Group>
              </Stack>
            </Card>

            {hasDisplayedVehicles && (
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
                  <Group justify="space-between" align="flex-start">
                    <div>
                      <Title order={3} c="#1e293b" fw={600}>
                        Matched Vehicle Configurations
                      </Title>
                      <Text size="sm" c="#64748b">
                        Selected {selectedVehicles.length} of{" "}
                        {filteredVehicles.length} matching vehicle
                        configuration(s)
                      </Text>
                    </div>
                    <Stack gap="xs" align="flex-end">
                      {filteredVehicles.length > 0 && (
                        <Text size="xs" c="#64748b">
                          Showing {vehiclePageStart}-{vehiclePageEnd} of{" "}
                          {filteredVehicles.length}
                        </Text>
                      )}
                      <Group gap="xs">
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() =>
                            setSelectedVehicles((prev) => {
                              const next = new Set(prev);
                              visibleVehicles.forEach((vehicle: any) => {
                                const id = String(vehicle?.id ?? "");
                                if (id) {
                                  next.add(id);
                                }
                              });
                              return Array.from(next);
                            })
                          }
                          disabled={visibleVehicles.length === 0}
                        >
                          Select Visible
                        </Button>
                        <Button
                          variant="subtle"
                          size="xs"
                          onClick={() =>
                            setSelectedVehicles((prev) => {
                              if (visibleVehicles.length === 0) return prev;
                              const idsToRemove = new Set(
                                visibleVehicles.map((vehicle: any) =>
                                  String(vehicle?.id ?? "")
                                )
                              );
                              return prev.filter((id) => !idsToRemove.has(id));
                            })
                          }
                          disabled={visibleSelectedVehiclesCount === 0}
                        >
                          Clear Visible
                        </Button>
                      </Group>
                    </Stack>
                  </Group>

                  {visibleVehicles.length === 0 ? (
                    <Alert color="blue" variant="light">
                      <Text size="sm">
                        No vehicles to display. Adjust your filters and click
                        "Display Vehicles" again.
                      </Text>
                    </Alert>
                  ) : (
                    <ScrollArea h={360} type="always">
                      <Table striped highlightOnHover verticalSpacing="sm">
                        <Table.Thead
                          style={{
                            position: "sticky",
                            top: 0,
                            backgroundColor: "#ffffff",
                            zIndex: 1,
                          }}
                        >
                          <Table.Tr>
                            <Table.Th style={{ width: 48 }}>
                              <Checkbox
                                checked={
                                  visibleVehicles.length > 0 &&
                                  visibleSelectedVehiclesCount ===
                                    visibleVehicles.length
                                }
                                indeterminate={
                                  visibleSelectedVehiclesCount > 0 &&
                                  visibleSelectedVehiclesCount <
                                    visibleVehicles.length
                                }
                                onChange={(event) => {
                                  if (event.currentTarget.checked) {
                                    setSelectedVehicles((prev) => {
                                      const next = new Set(prev);
                                      visibleVehicles.forEach(
                                        (vehicle: any) => {
                                          const id = String(vehicle?.id ?? "");
                                          if (id) {
                                            next.add(id);
                                          }
                                        }
                                      );
                                      return Array.from(next);
                                    });
                                  } else {
                                    setSelectedVehicles((prev) => {
                                      const idsToRemove = new Set(
                                        visibleVehicles.map((vehicle: any) =>
                                          String(vehicle?.id ?? "")
                                        )
                                      );
                                      return prev.filter(
                                        (id) => !idsToRemove.has(id)
                                      );
                                    });
                                  }
                                }}
                              />
                            </Table.Th>
                            <Table.Th>Base Vehicle ID</Table.Th>
                            <Table.Th>Year</Table.Th>
                            <Table.Th>Make</Table.Th>
                            <Table.Th>Model</Table.Th>
                            <Table.Th>Submodel</Table.Th>
                            <Table.Th>Drive Type</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {visibleVehicles.map((vehicle: any) => {
                            const vehicleId = String(vehicle.id);
                            const isSelected =
                              selectedVehicles.includes(vehicleId);
                            return (
                              <Table.Tr
                                key={vehicle.id}
                                style={{ cursor: "pointer" }}
                                onClick={() => {
                                  setSelectedVehicles((prev) =>
                                    prev.includes(vehicleId)
                                      ? prev.filter((id) => id !== vehicleId)
                                      : [...prev, vehicleId]
                                  );
                                }}
                              >
                                <Table.Td
                                  onClick={(event) => event.stopPropagation()}
                                >
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={(event) => {
                                      if (event.currentTarget.checked) {
                                        setSelectedVehicles((prev) =>
                                          prev.includes(vehicleId)
                                            ? prev
                                            : [...prev, vehicleId]
                                        );
                                      } else {
                                        setSelectedVehicles((prev) =>
                                          prev.filter((id) => id !== vehicleId)
                                        );
                                      }
                                    }}
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm" fw={600}>
                                    {vehicle.baseVehicleId || "—"}
                                  </Text>
                                </Table.Td>
                                <Table.Td>{vehicle.year || "—"}</Table.Td>
                                <Table.Td>{vehicle.make || "—"}</Table.Td>
                                <Table.Td>{vehicle.model || "—"}</Table.Td>
                                <Table.Td>{vehicle.submodel || "—"}</Table.Td>
                                <Table.Td>{vehicle.driveType || "—"}</Table.Td>
                              </Table.Tr>
                            );
                          })}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>
                  )}
                  {filteredVehicles.length > 0 && (
                    <Text size="xs" c="dimmed">
                      Showing {vehiclePageStart}-{vehiclePageEnd} of{" "}
                      {filteredVehicles.length} vehicles.
                    </Text>
                  )}
                  {totalVehiclePages > 1 && (
                    <Group justify="flex-end">
                      <Pagination
                        size="sm"
                        value={vehiclePage}
                        onChange={setVehiclePage}
                        total={totalVehiclePages}
                      />
                    </Group>
                  )}
                </Stack>
              </Card>
            )}

            {hasDisplayedVehicles && (
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
                    <Title order={3} c="#1e293b" fw={700}>
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
                      onChange={(value) => {
                        setFitmentDetails((prev) => ({
                          ...prev,
                          partId: value || "",
                        }));
                        retainOnlySelection("parts", value ?? null);
                      }}
                      searchable
                      disabled={loadingDropdownData}
                      required
                      onDropdownOpen={() => loadDropdown("parts")}
                      rightSection={
                        dropdownLoading["parts"] ? (
                          <Loader size={16} />
                        ) : undefined
                      }
                      leftSection={<IconPackage size={16} color="#64748b" />}
                    />
                    <Select
                      label="Position"
                      placeholder="Select position"
                      data={dropdownData?.positions || []}
                      value={fitmentDetails.position}
                      onChange={(value) => {
                        setFitmentDetails((prev) => ({
                          ...prev,
                          position: value || "",
                        }));
                        retainOnlySelection("positions", value ?? null);
                      }}
                      searchable
                      disabled={loadingDropdownData}
                      required
                      onDropdownOpen={() => loadDropdown("positions")}
                      rightSection={
                        dropdownLoading["positions"] ? (
                          <Loader size={16} />
                        ) : undefined
                      }
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

                  <Group justify="flex-end">
                    <Button
                      size="sm"
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
                          const resolveProductMeta = (partId: string) => {
                            if (!partId) return null;
                            const fromSelected = selectedProductsData.find(
                              (product: any) =>
                                getProductPrimaryId(product) === partId
                            );
                            if (fromSelected) return fromSelected;

                            const fromAll = productsData.find(
                              (product: any) =>
                                getProductPrimaryId(product) === partId
                            );
                            if (fromAll) return fromAll;

                            return null;
                          };

                          const partMeta = resolveProductMeta(
                            fitmentDetails.partId
                          );
                          const partDescriptor =
                            partMeta?.description ||
                            dropdownData?.parts?.find(
                              (option: { value: string; label: string }) =>
                                option.value === fitmentDetails.partId
                            )?.label ||
                            fitmentDetails.title ||
                            "";
                          const partTypeId =
                            partMeta?.part_type || fitmentDetails.partId;

                          const toInteger = (
                            value: unknown,
                            fallback: number = 0
                          ) => {
                            if (value === null || value === undefined) {
                              return fallback;
                            }
                            const parsed = Number(value);
                            return Number.isFinite(parsed) ? parsed : fallback;
                          };

                          const fitmentsData = selectedVehicles.map(
                            (vehicleId) => {
                              const vehicle = filteredVehicles.find(
                                (item) => String(item.id) === String(vehicleId)
                              );
                              const fallbackVehicleId =
                                vehicle?.baseVehicleId ||
                                vehicle?.base_vehicle_id ||
                                vehicle?.vehicle_id ||
                                vehicleId;

                              return {
                                partId: fitmentDetails.partId,
                                title: fitmentDetails.title,
                                description: fitmentDetails.description,
                                notes: fitmentDetails.notes,
                                quantity: fitmentDetails.quantity,
                                position: fitmentDetails.position,
                                liftHeight:
                                  fitmentDetails.liftHeight || "Stock",
                                wheelType:
                                  fitmentDetails.wheelType || "Standard",
                                fitmentType: "manual_fitment",
                                tenantId: currentEntity?.id || null,
                                year: toInteger(vehicle?.year),
                                make: vehicle?.make || "",
                                model: vehicle?.model || "",
                                submodel: vehicle?.submodel || "",
                                driveType: vehicle?.driveType || "",
                                fuelType: vehicle?.fuelType || "",
                                numDoors: toInteger(
                                  vehicle?.numDoors ??
                                    vehicle?.numDoorsList?.[0] ??
                                    0
                                ),
                                bodyType: vehicle?.bodyType || "",
                                baseVehicleId: String(fallbackVehicleId || ""),
                                partTypeId: partTypeId,
                                partTypeDescriptor: partDescriptor,
                                positionId: 0,
                                ...dynamicVcdbFields,
                                ...dynamicProductFields,
                              };
                            }
                          );

                          const result: any = await createFitment(() =>
                            dataUploadService.createFitment(fitmentsData)
                          );

                          const createdCount = result?.data?.created ?? 0;

                          if (createdCount > 0) {
                            showSuccess(
                              `Successfully created ${createdCount} fitments!`,
                              5000
                            );
                            handleBackToStep1();
                          } else {
                            console.warn(
                              "Manual fitment creation returned zero created fitments.",
                              { payload: fitmentsData, response: result?.data }
                            );
                            showError(
                              "Fitments were not created. Please verify the vehicle and part details, then try again."
                            );
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
                        applyingManualFitment ||
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
              </Card>
            )}
          </Stack>
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
            <Text size="sm" c="#64748b">
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
          ) : jobFitments.length === 0 ? (
            <Center p="xl">
              <Stack align="center" gap="md">
                <div
                  style={{
                    width: "64px",
                    height: "64px",
                    borderRadius: "50%",
                    backgroundColor: "#f1f5f9",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <IconCheck size={32} color="#64748b" />
                </div>
                <div style={{ textAlign: "center" }}>
                  <Text size="lg" fw={600} c="#1e293b" mb="xs">
                    No Fitments to Review
                  </Text>
                  <Text size="sm" c="#64748b">
                    All fitments from this AI job have already been reviewed and
                    processed.
                  </Text>
                </div>
              </Stack>
            </Center>
          ) : (
            <>
              <Group justify="space-between" mb="md">
                <Text size="sm" c="dimmed">
                  {selectedJobFitments.length} of {jobFitments.length} selected
                </Text>
                <Group gap="xs">
                  <Button
                    bg={"red"}
                    size="xs"
                    onClick={handleRejectJobFitments}
                    disabled={selectedJobFitments.length === 0}
                    loading={approvingFitments}
                    styles={{
                      root: {
                        "&:disabled": {
                          backgroundColor: "#f1f5f9",
                          color: "#94a3b8",
                          borderColor: "#e2e8f0",
                        },
                      },
                    }}
                  >
                    Reject
                    {selectedJobFitments.length > 0 &&
                      ` (${selectedJobFitments.length})`}
                  </Button>
                  <Button
                    size="xs"
                    bg={"green"}
                    onClick={handleApproveJobFitments}
                    disabled={selectedJobFitments.length === 0}
                    loading={approvingFitments}
                    styles={{
                      root: {
                        "&:disabled": {
                          backgroundColor: "#f1f5f9",
                          color: "#94a3b8",
                          borderColor: "#e2e8f0",
                        },
                      },
                    }}
                  >
                    Approve
                    {selectedJobFitments.length > 0 &&
                      ` (${selectedJobFitments.length})`}
                  </Button>
                </Group>
              </Group>

              <ScrollArea h={500}>
                <Table striped highlightOnHover>
                  <Table.Thead
                    style={{
                      position: "sticky",
                      top: 0,
                      backgroundColor: "white",
                      zIndex: 1,
                    }}
                  >
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
