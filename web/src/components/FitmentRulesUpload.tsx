import { useState, useRef, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Select,
  Progress,
  Badge,
  Alert,
  Stepper,
  Table,
  Paper,
  Center,
  ThemeIcon,
  ScrollArea,
  ActionIcon,
  Tooltip,
  Loader,
  Autocomplete,
} from "@mantine/core";
import {
  IconCloudUpload,
  IconChecks,
  IconCheck,
  IconX,
  IconAlertCircle,
  IconFileSpreadsheet,
  IconBrain,
  IconInfoCircle,
  // IconDownload,
  // IconChevronDown,
  // IconChevronUp,
  IconEdit,
} from "@tabler/icons-react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { fitmentRulesService, dataUploadService } from "../api/services";
import { useEntity } from "../hooks/useEntity";

interface ColumnMapping {
  source: string;
  target: string;
  confidence: number;
  status: "auto" | "manual" | "pending";
  editable?: boolean;
}

// Standard VCDB target fields
const VCDB_FITMENT_FIELDS = [
  "year",
  "makeName",
  "modelName",
  "subModelName",
  "driveTypeName",
  "fuelTypeName",
  "bodyNumDoors",
  "bodyTypeName",
  "partId",
  "position",
  "engine",
  "productType",
  "rotorDiameter",
  "boltPattern",
  "kitParts",
  "uniqueVehicleId",
];

const VCDB_PRODUCT_FIELDS = [
  "partId",
  "partName",
  "description",
  "category",
  "partType",
  "specifications",
  "brand",
  "sku",
  "price",
  "weight",
  "dimensions",
];

interface ProcessingStep {
  step: number;
  label: string;
  status: "pending" | "in_progress" | "completed" | "error";
  message?: string;
}

export default function FitmentRulesUpload() {
  const { currentEntity } = useEntity();
  const [dataType, setDataType] = useState<string | null>("fitments");
  const [file, setFile] = useState<File | null>(null);
  const [uploadId, setUploadId] = useState<string | null>(null);
  const [activeStep, setActiveStep] = useState(0);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);

  // Get entity configuration
  const fitmentSettings = currentEntity?.fitment_settings || {};
  const requiredVcdbFields = fitmentSettings.required_vcdb_fields || [];
  const optionalVcdbFields = fitmentSettings.optional_vcdb_fields || [];
  const requiredProductFields = fitmentSettings.required_product_fields || [];
  const partNumberSkuDescription =
    fitmentSettings.part_number_sku_description || "";
  const ptidMatch = fitmentSettings.ptid_match || false;
  const seekParentChild =
    fitmentSettings.seek_parent_child_relationships || false;
  const parentChildExample = fitmentSettings.parent_child_example_format || "";
  const additionalAttributes = fitmentSettings.additional_attributes || [];

  const [processingSteps, setProcessingSteps] = useState<ProcessingStep[]>([
    { step: 0, label: "Upload File", status: "pending" },
    { step: 1, label: "AI Mapping", status: "pending" },
    { step: 2, label: "Validation", status: "pending" },
    { step: 3, label: "Review & Finalize", status: "pending" },
  ]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);
  const [reviewData, setReviewData] = useState<any>(null);
  const [publishResult, setPublishResult] = useState<any>(null);
  const [isPublishing, setIsPublishing] = useState(false);
  // const [recommendations, setRecommendations] = useState<Record<string, any[]>>(
  //   {}
  // );
  // const [loadingRecommendations, setLoadingRecommendations] = useState(false);
  // const [expandedRecommendations, setExpandedRecommendations] = useState<
  //   Set<string>
  // >(new Set());
  const [editingMappingIndex, setEditingMappingIndex] = useState<number | null>(
    null
  );
  const [editingMappingValue, setEditingMappingValue] = useState<string>("");
  const [aiStatusText, setAiStatusText] = useState<string>(
    "Analyzing columns..."
  );

  const { showSuccess, showError } = useProfessionalToast();
  const navigate = useNavigate();

  // AI status animation effect
  useEffect(() => {
    if (isProcessing && activeStep === 1) {
      const statusMessages = [
        "Analyzing column headers...",
        "Detecting data patterns...",
        "Mapping to VCDB standards...",
        "Extracting vehicle information...",
        "Normalizing field names...",
        "Finalizing mappings...",
      ];
      let currentIndex = 0;
      setAiStatusText(statusMessages[0]);
      const interval = setInterval(() => {
        currentIndex = (currentIndex + 1) % statusMessages.length;
        setAiStatusText(statusMessages[currentIndex]);
      }, 2000);
      return () => clearInterval(interval);
    }
  }, [isProcessing, activeStep]);

  const handleFileSelect = (selectedFile: File) => {
    // Validate file type
    const validExtensions = [".csv", ".tsv", ".xlsx", ".xls"];
    const fileExtension = selectedFile.name
      .toLowerCase()
      .substring(selectedFile.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExtension)) {
      showError("Invalid file type. Please upload CSV, TSV, or Excel files.");
      return;
    }

    // Validate file size (250MB limit)
    const maxSize = 250 * 1024 * 1024; // 250MB
    if (selectedFile.size > maxSize) {
      showError("File size exceeds 250MB limit.");
      return;
    }

    // Reset all state when new file is selected
    setFile(selectedFile);
    setUploadId(null);
    setActiveStep(0);
    setColumnMappings([]);
    setUploadProgress(0);
    setPublishResult(null);
    setReviewData(null);
    setIsProcessing(false);
    setIsPublishing(false);
    resetProcessingSteps();
  };

  const resetProcessingSteps = () => {
    setProcessingSteps([
      { step: 0, label: "Upload File", status: "pending" },
      { step: 1, label: "AI Mapping", status: "pending" },
      { step: 2, label: "Validation", status: "pending" },
      { step: 3, label: "Review & Finalize", status: "pending" },
    ]);
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  }, []);

  const handleUpload = async () => {
    if (!file || !dataType) {
      showError("Please select a data type and file.");
      return;
    }

    // Prevent multiple simultaneous uploads
    if (isProcessing) {
      showError("Upload already in progress. Please wait...");
      return;
    }

    try {
      setIsProcessing(true);
      updateStepStatus(0, "in_progress", "Uploading file...");
      setUploadProgress(20);

      const response = await fitmentRulesService.uploadFile(
        file,
        (dataType || "fitments") as "fitments" | "products"
      );

      // Ensure we have the upload ID before proceeding
      if (!response || !response.data) {
        throw new Error("Upload failed: No response received from server");
      }

      if (!response.data.id) {
        throw new Error("Upload failed: No upload ID received from server");
      }

      const newUploadId = response.data.id;

      // Set upload ID immediately
      setUploadId(newUploadId);
      setUploadProgress(80);
      updateStepStatus(0, "completed", "File uploaded successfully");

      // Wait a brief moment to ensure state is updated
      await new Promise((resolve) => setTimeout(resolve, 200));

      // Use the upload ID directly instead of relying on state
      setActiveStep(1);
      showSuccess("File uploaded successfully. Starting AI mapping...");

      // Trigger AI mapping with the upload ID directly
      await handleAiMappingWithId(newUploadId);

      // Don't automatically move to validation - wait for user to click "Continue to Validation"
      setUploadProgress(100);
    } catch (error: any) {
      console.error("Upload error:", error);
      updateStepStatus(0, "error", error.message || "Upload failed");
      showError(error.message || "Failed to upload file. Please try again.");
      setUploadId(null);
      setActiveStep(0);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleAiMappingWithId = async (idToUse: string) => {
    try {
      setIsProcessing(true);
      updateStepStatus(1, "in_progress", "Analyzing columns with AI...");
      setUploadProgress(30);

      // Prepare entity configuration to pass to backend
      const entityConfig = {
        requiredVcdbFields: requiredVcdbFields,
        optionalVcdbFields: optionalVcdbFields,
        requiredProductFields: requiredProductFields,
        partNumberSkuDescription: partNumberSkuDescription,
        ptidMatch: ptidMatch,
        seekParentChild: seekParentChild,
        parentChildExample: parentChildExample,
        additionalAttributes: additionalAttributes,
      };

      const response = await fitmentRulesService.aiMap(
        idToUse,
        (dataType || "fitments") as "fitments" | "products",
        entityConfig
      );
      const mappings = response.data.suggestions?.columnMappings || [];

      setColumnMappings(
        mappings.map((m: any) => ({
          source: m.source,
          target: m.target,
          confidence: m.confidence || 0,
          status: m.confidence >= 0.9 ? "auto" : "pending",
        }))
      );

      setUploadProgress(60);
      updateStepStatus(
        1,
        "completed",
        `Found ${mappings.length} column mappings`
      );

      // Automatically trigger transformation (backend handles it silently)
      try {
        await fitmentRulesService.transform(idToUse);
      } catch (error) {
        console.error("Transformation error:", error);
        // Continue anyway - transformation happens in backend
      }

      // Stay on step 1 (Column Mapping) - user will click "Continue to Validation" to proceed
    } catch (error: any) {
      updateStepStatus(1, "error", error.message || "AI mapping failed");
      showError(error.message || "Failed to process AI mapping");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleTransform = async () => {
    if (!uploadId) {
      showError("No upload found. Please upload a file first.");
      return;
    }

    try {
      setIsProcessing(true);
      updateStepStatus(2, "in_progress", "Transforming data...");
      setUploadProgress(65);

      const response = await fitmentRulesService.transform(uploadId);
      const result = response.data;

      setUploadProgress(75);
      updateStepStatus(
        2,
        "completed",
        `Transformed ${result.originalRows || 0} → ${
          result.transformedRows || 0
        } rows`
      );
      showSuccess(
        `Data transformation complete! ${
          result.transformationsApplied || 0
        } transformations applied.`
      );

      // Transformation happens automatically, move to validation
    } catch (error: any) {
      const errorMessage =
        error.response?.data?.error ||
        error.response?.data?.details ||
        error.message ||
        "Failed to transform data";
      updateStepStatus(2, "error", errorMessage);
      showError(`Transformation failed: ${errorMessage}`);
      console.error("Transform error:", error.response?.data || error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleValidation = async (idToUse?: string) => {
    const uploadIdToUse = idToUse || uploadId;
    if (!uploadIdToUse) {
      showError("Please upload a file first.");
      return;
    }

    try {
      setIsProcessing(true);
      updateStepStatus(2, "in_progress", "Validating against VCDB...");
      setUploadProgress(80);

      const response = await fitmentRulesService.validate(uploadIdToUse);
      const results = response.data;

      setUploadProgress(90);
      updateStepStatus(2, "completed", "Validation completed");
      // Stay on validation step - user will click "Continue to Review" button
      showSuccess("Validation completed successfully");

      // Prepare review data from response
      setReviewData({
        totalRows: results?.totalRows || results?.total_count || 0,
        validRows: results?.validRows || results?.valid_count || 0,
        errors: results?.errors || results?.validation_errors || [],
        warnings: results?.warnings || results?.validation_warnings || [],
      });

      // Fetch recommendations for unique part IDs (if fitments data type)
      if (
        dataType === "fitments" &&
        results?.uniquePartIds &&
        results.uniquePartIds.length > 0
      ) {
        // setLoadingRecommendations(true);
        try {
          const recommendationsMap: Record<string, any[]> = {};

          // Fetch recommendations for each part ID (limit to first 5 to avoid too many requests)
          const partIdsToFetch = results.uniquePartIds.slice(0, 5);

          for (const partId of partIdsToFetch) {
            try {
              const recResponse = await dataUploadService.getPotentialFitments(
                partId,
                "similarity"
              );
              if (recResponse.data && recResponse.data.length > 0) {
                recommendationsMap[partId] = recResponse.data.slice(0, 10); // Limit to top 10 per part
              }
            } catch (err) {
              console.error(
                `Failed to fetch recommendations for part ${partId}:`,
                err
              );
            }
          }

          // setRecommendations(recommendationsMap);
        } catch (error) {
          console.error("Failed to fetch recommendations:", error);
        } finally {
          // setLoadingRecommendations(false);
        }
      }
    } catch (error: any) {
      updateStepStatus(2, "error", error.message || "Validation failed");
      showError(error.message || "Failed to validate file");
    } finally {
      setIsProcessing(false);
    }
  };

  const updateStepStatus = (
    stepIndex: number,
    status: ProcessingStep["status"],
    message?: string
  ) => {
    setProcessingSteps((prev) =>
      prev.map((step, idx) =>
        idx === stepIndex ? { ...step, status, message } : step
      )
    );
  };

  const handleAcceptMapping = (index: number) => {
    setColumnMappings((prev) =>
      prev.map((m, i) => (i === index ? { ...m, status: "auto" as const } : m))
    );
  };

  const handleRejectMapping = (index: number) => {
    setColumnMappings((prev) =>
      prev.map((m, i) =>
        i === index ? { ...m, status: "pending" as const } : m
      )
    );
  };

  const handlePublish = async () => {
    if (!uploadId) {
      showError("No upload found. Please upload a file first.");
      return;
    }

    try {
      setIsPublishing(true);
      updateStepStatus(3, "in_progress", "Creating review job...");
      setUploadProgress(95);

      const response = await fitmentRulesService.publishForReview(uploadId);
      const result = response.data;

      console.log("Publish for review response:", result);

      setPublishResult(result);
      setUploadProgress(100);

      updateStepStatus(
        3,
        "completed",
        `Job created with status: ${result.status || "pending"}`
      );

      showSuccess(
        `✅ Data published for review! Job ID: ${
          result.jobId || result.id
        }. Redirecting to Jobs History...`
      );

      // Redirect to analytics page and scroll to Jobs History section
      setTimeout(() => {
        navigate("/analytics?scrollToJobs=true");
      }, 1500);
    } catch (error: any) {
      updateStepStatus(3, "error", error.message || "Publishing failed");
      showError(error.message || "Failed to publish for review");
    } finally {
      setIsPublishing(false);
    }
  };

  const getStepIcon = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return <IconCheck size={16} />;
      case "in_progress":
        return <IconBrain size={16} />;
      case "error":
        return <IconX size={16} />;
      default:
        return null;
    }
  };

  const getStepColor = (status: ProcessingStep["status"]) => {
    switch (status) {
      case "completed":
        return "green";
      case "in_progress":
        return "blue";
      case "error":
        return "red";
      default:
        return "gray";
    }
  };

  //   const handleDownloadExample = (type: string) => {
  //     // Working Fitments Example - Has proper structure but tests AI extraction
  //     // This file has Year, Make, Model in separate columns OR in descriptions (tests AI flexibility)
  //     const fitmentsExample = `Year,Make,Model,Part Number,Product Description,Position,Engine,Submodel,Notes
  // 2023,Ford,F-150,SHK-001,Pro Performance Shock for 2023 Ford F-150 5.0L,FRONT,5.0L V8,Platinum,Heavy duty application
  // 2024,Chevrolet,Silverado 1500,SHK-003,Ultra Shock fits 2024 Chevy Silverado 1500 6.2L,FRONT,6.2L,LT,Standard replacement
  // 2023,Toyota,Tacoma,SHK-005,Economy Shock - 2023 Toyota Tacoma 2.7L I4,FRONT,2.7L I4,SR,Budget option
  // 2021,BMW,X5,BRK-001,Premium Brake Pad Set - 2021 BMW X5 3.0L I6 M50i,FRONT,3.0L I6,M50i,Ceramic pads
  // 2011,KIA,Optima,ROT-001,Performance Rotor - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,OEM Plus
  // 2012,KIA,Optima,ROT-001,Performance Rotor - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,OEM Plus
  // 2011,KIA,Optima,JAYczadj,Street Sport Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,2000 Street Sport
  // 2012,KIA,Optima,JAYczadj,Street Sport Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,2000 Street Sport
  // 2011,KIA,Optima,JAYwzadjC,Premium Street Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,Premium Street
  // 2012,KIA,Optima,JAYwzadjC,Premium Street Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,Premium Street
  // 2011,KIA,Optima,JAYjzadjR,Flagship Range Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,Our Flagship range
  // 2012,KIA,Optima,JAYjzadjR,Flagship Range Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,Our Flagship range
  // 2011,KIA,Optima,JAYmzadjNPC,NPC Fastest Street Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,NPC Fastest Street and Race Pads
  // 2012,KIA,Optima,JAYmzadjNPC,NPC Fastest Street Pad - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,NPC Fastest Street and Race Pads
  // 2011,KIA,Optima,UXzjjm,OEM Plus Pad - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,OEM Plus
  // 2012,KIA,Optima,UXzjjm,OEM Plus Pad - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,OEM Plus
  // 2011,KIA,Optima,JAYczadm,2000 Street Sport Pad - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,2000 Street Sport
  // 2012,KIA,Optima,JAYczadm,2000 Street Sport Pad - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,2000 Street Sport
  // 2011,KIA,Optima,JAYwzadmC,Premium Street Pad - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,Premium Street
  // 2012,KIA,Optima,JAYwzadmC,Premium Street Pad - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,Premium Street
  // 2011,KIA,Optima,PATowaw,Rotors - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,Rotors
  // 2012,KIA,Optima,PATowaw,Rotors - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,Rotors
  // 2011,KIA,Optima,DANowaw,GD Rotors - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,GD Rotors
  // 2012,KIA,Optima,DANowaw,GD Rotors - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,GD Rotors
  // 2011,KIA,Optima,BOBowaw,USR Rotors - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,USR Rotors
  // 2012,KIA,Optima,BOBowaw,USR Rotors - 2011-2012 KIA Optima 2.4L,FRONT,2.4L,,USR Rotors
  // 2011,KIA,Optima,PATodaa,Rotors - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,Rotors
  // 2012,KIA,Optima,PATodaa,Rotors - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,Rotors
  // 2011,KIA,Optima,GXodaa,GD Rotors - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,GD Rotors
  // 2012,KIA,Optima,GXodaa,GD Rotors - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,GD Rotors
  // 2011,KIA,Optima,BOBodaa,USR Rotors - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,USR Rotors
  // 2012,KIA,Optima,BOBodaa,USR Rotors - 2011-2012 KIA Optima 2.4L,REAR,2.4L,,USR Rotors
  // 2022,Honda,CR-V,SHK-007,Shock Absorber - 2022 Honda CR-V 1.5L Turbo EX-L,FRONT,1.5L Turbo,EX-L,Premium finish
  // 2022,Honda,CR-V,WHEEL-001,Alloy Wheel 18x8 - 2022 Honda CR-V 1.5L Turbo,FRONT,1.5L Turbo,EX-L,18" Alloy
  // 2005,Chevrolet,Impala,BRK-003,Performance Brake Pad - 2005 Chevrolet Impala 3.8L,FRONT,3.8L,,Ceramic
  // 2005,Chevrolet,Impala,BRK-004,Performance Brake Pad - 2005 Chevrolet Impala 3.8L,REAR,3.8L,,Ceramic
  // 2018,Ford,F-150,SHK-008,Shock Absorber - 2018 Ford F150 3.5L EcoBoost,FRONT,3.5L EcoBoost,,Heavy duty
  // 2018,Ford,F-150,SHK-009,Shock Absorber - 2018 Ford F150 3.5L EcoBoost,REAR,3.5L EcoBoost,,Heavy duty
  // 1992,Acura,Vigor,BRK-005,Premium Brake Pad - 1992 Acura Vigor 2.5L,FRONT,2.5L,,Ceramic
  // 1992,Acura,Vigor,BRK-006,Premium Brake Pad - 1992 Acura Vigor 2.5L,REAR,2.5L,,Ceramic
  // 1963,AC,Cobra,JAYczd5,Street Sport Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,2000 Street Sport
  // 1964,AC,Cobra,JAYczd5,Street Sport Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,2000 Street Sport
  // 1965,AC,Cobra,JAYczd5,Street Sport Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,2000 Street Sport
  // 1966,AC,Cobra,JAYczd5,Street Sport Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,2000 Street Sport
  // 1967,AC,Cobra,JAYczd5,Street Sport Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,2000 Street Sport
  // 1968,AC,Cobra,JAYczd5,Street Sport Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,2000 Street Sport
  // 1969,AC,Cobra,JAYczd5,Street Sport Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,2000 Street Sport
  // 1963,AC,Cobra,JAYwzd5C,Premium Street Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Premium Street
  // 1964,AC,Cobra,JAYwzd5C,Premium Street Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Premium Street
  // 1965,AC,Cobra,JAYwzd5C,Premium Street Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Premium Street
  // 1966,AC,Cobra,JAYwzd5C,Premium Street Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Premium Street
  // 1967,AC,Cobra,JAYwzd5C,Premium Street Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Premium Street
  // 1968,AC,Cobra,JAYwzd5C,Premium Street Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Premium Street
  // 1969,AC,Cobra,JAYwzd5C,Premium Street Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Premium Street
  // 1963,AC,Cobra,JAYjzd5R,Flagship Range Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Our Flagship range
  // 1964,AC,Cobra,JAYjzd5R,Flagship Range Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Our Flagship range
  // 1965,AC,Cobra,JAYjzd5R,Flagship Range Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Our Flagship range
  // 1966,AC,Cobra,JAYjzd5R,Flagship Range Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Our Flagship range
  // 1967,AC,Cobra,JAYjzd5R,Flagship Range Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Our Flagship range
  // 1968,AC,Cobra,JAYjzd5R,Flagship Range Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Our Flagship range
  // 1969,AC,Cobra,JAYjzd5R,Flagship Range Pad - 1963-1969 AC Cobra 4.7L,FRONT,4.7L,,Our Flagship range`;

  //     // Working Products Example - Has proper structure with Part ID and Description
  //     const productsExample = `Part ID,Part Name,Description,Category,Part Type,Specifications,Price,Weight,Compatibility
  // P-12345,Pro Performance Shock,Heavy-duty shock absorber designed for trucks and SUVs. Fits 2023 Ford F-150 5.0L V8 models. Length: 18.5 inches, Travel: 6.5 inches, Load capacity: 2000 lbs.,Shock Absorber,Suspension,"Length: 18.5in, Travel: 6.5in, Load: 2000lbs",89.99,4.2,Fits most 1/2 ton trucks - Ford F-150, Chevy Silverado, Ram 1500
  // P-67890,Ultra Shock,Standard replacement shock absorber. Universal fitment for most vehicles. Length: 16 inches, Travel: 5 inches, Load capacity: 1500 lbs.,Shock Absorber,Suspension,"Length: 16in, Travel: 5in, Load: 1500lbs",49.99,3.1,Universal fitment
  // P-11111,Economy Shock,Budget-friendly shock absorber for basic replacement needs. Length: 15 inches, Travel: 4.5 inches, Load capacity: 1200 lbs.,Shock Absorber,Suspension,"Length: 15in, Travel: 4.5in, Load: 1200lbs",29.99,2.8,Basic replacement
  // P-22222,18" Alloy Wheel,Premium aluminum alloy wheel. Size: 18x8 inches, Offset: +35mm, Bolt Pattern: 5x114.3. Fits 2022 Honda CR-V and similar vehicles.,Wheel,Rims,"Size: 18x8, Offset: +35, Bolt Pattern: 5x114.3",199.99,22.5,Multiple vehicle fitment - Honda CR-V, Toyota RAV4, Nissan Rogue
  // P-33333,Performance Brake Pad,Ceramic brake pad set for high-performance vehicles. Material: Ceramic, Thickness: 12mm, Friction coefficient: 0.42. Fits 2021 BMW X5 3.0L I6 models.,Brake,Brake Pads,"Material: Ceramic, Thickness: 12mm, Friction: 0.42",79.99,2.1,High-performance vehicles - BMW X5, Mercedes GLE, Audi Q7
  // P-44444,LED Headlight Bulb,Ultra-bright LED replacement bulb. Power: 60W, Lumens: 6000, Color temperature: 6000K. Universal H4/H7 fitment.,Lighting,Bulbs,"Power: 60W, Lumens: 6000, Color: 6000K",39.99,0.3,Universal H4/H7 fitment - Most vehicles
  // P-55555,Air Filter,High-flow air filter for improved engine performance. Size: 12x8x2 inches, Material: Cotton gauze, Air flow: +15% over stock. Fits most 4-cylinder and V6 engines.,Engine,Air Filter,"Size: 12x8x2in, Material: Cotton gauze, Flow: +15%",24.99,0.5,Multiple applications - Most 4-cyl and V6 engines
  // P-66666,Oil Filter,Standard oil filter for regular maintenance. Thread size: 3/4-16, Gasket diameter: 2.5 inches, Capacity: 1 quart. Universal fitment.,Engine,Oil Filter,"Thread: 3/4-16, Gasket: 2.5in, Capacity: 1qt",8.99,0.2,Universal fitment - Most vehicles
  // SHK-001,Pro Performance Shock,Heavy-duty shock absorber for 2023 Ford F-150 5.0L V8 Platinum trim. Front left position.,Shock Absorber,Suspension,"Length: 18.5in, Travel: 6.5in, Load: 2000lbs",89.99,4.2,2023 Ford F-150 5.0L V8
  // BRK-001,Performance Brake Pad,Ceramic brake pad set for 2021 BMW X5 3.0L I6 M50i. Front position.,Brake,Brake Pads,"Material: Ceramic, Thickness: 12mm, Friction: 0.42",79.99,2.1,2021 BMW X5 3.0L I6 M50i
  // ROT-001,Performance Rotor,OEM Plus rotor for 2011-2012 KIA Optima 2.4L. Front position. Rotor diameter: 11.8 inches (300mm).,Brake,Rotors,"Diameter: 11.8in (300mm), Bolt Pattern: 5x114.3",129.99,15.2,2011-2012 KIA Optima 2.4L
  // JAYczadj,Street Sport Pad,2000 Street Sport brake pad for 2011-2012 KIA Optima 2.4L. Front position.,Brake,Brake Pads,"Material: Ceramic, Thickness: 28mm new, 26mm min",59.99,1.8,2011-2012 KIA Optima 2.4L
  // JAYwzadjC,Premium Street Pad,Premium Street brake pad for 2011-2012 KIA Optima 2.4L. Front position.,Brake,Brake Pads,"Material: Ceramic, Thickness: 28mm new, 26mm min",69.99,1.9,2011-2012 KIA Optima 2.4L
  // JAYjzadjR,Flagship Range Pad,Our Flagship range brake pad for 2011-2012 KIA Optima 2.4L. Front position.,Brake,Brake Pads,"Material: Ceramic, Thickness: 28mm new, 26mm min",79.99,2.0,2011-2012 KIA Optima 2.4L
  // JAYmzadjNPC,NPC Fastest Street Pad,NPC Fastest Street and Race Pads for 2011-2012 KIA Optima 2.4L. Front position.,Brake,Brake Pads,"Material: Ceramic, Thickness: 28mm new, 26mm min",89.99,2.1,2011-2012 KIA Optima 2.4L
  // UXzjjm,OEM Plus Pad,OEM Plus brake pad for 2011-2012 KIA Optima 2.4L. Rear position.,Brake,Brake Pads,"Material: Ceramic, Thickness: 28mm new, 26mm min",59.99,1.8,2011-2012 KIA Optima 2.4L
  // PATowaw,Rotors,Rotors for 2011-2012 KIA Optima 2.4L. Front position. Rotor diameter: 11.8 inches (300mm).,Brake,Rotors,"Diameter: 11.8in (300mm), Bolt Pattern: 5x114.3",129.99,15.2,2011-2012 KIA Optima 2.4L
  // DANowaw,GD Rotors,GD Rotors for 2011-2012 KIA Optima 2.4L. Front position. Rotor diameter: 11.8 inches (300mm).,Brake,Rotors,"Diameter: 11.8in (300mm), Bolt Pattern: 5x114.3",139.99,15.5,2011-2012 KIA Optima 2.4L
  // BOBowaw,USR Rotors,USR Rotors for 2011-2012 KIA Optima 2.4L. Front position. Rotor diameter: 11.8 inches (300mm).,Brake,Rotors,"Diameter: 11.8in (300mm), Bolt Pattern: 5x114.3",149.99,15.8,2011-2012 KIA Optima 2.4L
  // BP-12345,Brake Pad Kit,Complete brake pad kit with front and rear pads. Material: Ceramic, Color: Black,Brake,Brake Pads,"Material: Ceramic, Color: Black",129.99,4.5,Universal fitment
  // BP-12345-FRONT,Brake Pad Front,Front brake pad only. Material: Ceramic, Color: Black,Brake,Brake Pads,"Material: Ceramic, Color: Black",69.99,2.2,Universal fitment
  // BP-12345-REAR,Brake Pad Rear,Rear brake pad only. Material: Ceramic, Color: Black,Brake,Brake Pads,"Material: Ceramic, Color: Black",59.99,2.3,Universal fitment`;

  //     const content = type === "fitments" ? fitmentsExample : productsExample;
  //     const filename =
  //       type === "fitments" ? "example_fitments.csv" : "example_products.csv";

  //     // Create blob and download
  //     const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  //     const link = document.createElement("a");
  //     const url = URL.createObjectURL(blob);

  //     link.setAttribute("href", url);
  //     link.setAttribute("download", filename);
  //     link.style.visibility = "hidden";
  //     document.body.appendChild(link);
  //     link.click();
  //     document.body.removeChild(link);

  //     showSuccess(`Downloaded ${filename}`);
  //   };

  return (
    <Stack gap="xl">
      {/* Data Type Selection */}
      <Card withBorder padding="lg" radius="md">
        <Stack gap="md">
          <div>
            {/* <Title order={4} mb="xs" style={{ color: "#2c3e50" }}>
              Select Data Type
            </Title> */}
            <Text size="sm" c="dimmed" mb="md">
              Choose whether you're uploading Fitments or Products data
            </Text>
          </div>
          <Group>
            <Text fw={600} size="lg" style={{ minWidth: 120 }}>
              Data Type:
            </Text>
            <Select
              value={dataType}
              onChange={(value) => {
                setDataType(value);
                setFile(null);
                setUploadId(null);
                setActiveStep(0);
                setColumnMappings([]);
                resetProcessingSteps();
              }}
              data={[
                { value: "fitments", label: "Fitments" },
                { value: "products", label: "Products" },
              ]}
              placeholder="Select data type"
              style={{ width: 250 }}
              size="md"
              required
            />
            {dataType && (
              <Badge
                color={dataType === "fitments" ? "blue" : "green"}
                size="lg"
                variant="light"
              >
                {dataType === "fitments" ? "Fitments" : "Products"} Selected
              </Badge>
            )}
          </Group>

          {/* Download Example File Buttons */}
          {/* <div
            style={{
              marginTop: "1rem",
              paddingTop: "1rem",
              borderTop: "1px solid #e5e7eb",
            }}
          >
            <Text size="sm" fw={500} mb="xs" style={{ color: "#2c3e50" }}>
              Download Example Files:
            </Text>
            <Group gap="sm" mt="xs">
              <Button
                leftSection={<IconDownload size={16} />}
                variant="light"
                color="blue"
                onClick={() => handleDownloadExample("fitments")}
                size="sm"
              >
                Download Fitments Example
              </Button>
              <Button
                leftSection={<IconDownload size={16} />}
                variant="light"
                color="green"
                onClick={() => handleDownloadExample("products")}
                size="sm"
              >
                Download Products Example
              </Button>
            </Group>
            <Text size="xs" c="dimmed" mt="xs">
              Use these templates to format your data correctly. The example
              files show the expected column structure.
            </Text>
          </div> */}
        </Stack>
      </Card>

      {/* Processing Steps */}
      <Card withBorder padding="lg" radius="md">
        <Stepper active={activeStep} size="sm">
          {processingSteps.map((step, index) => (
            <Stepper.Step
              key={index}
              label={step.label}
              description={step.message}
              icon={getStepIcon(step.status)}
              color={getStepColor(step.status)}
            />
          ))}
        </Stepper>
      </Card>

      {/* File Upload Section */}
      <Card withBorder padding="lg" radius="md">
        <Stack gap="md">
          <Group justify="space-between">
            <div>
              <Title order={4} mb="xs">
                1. Upload File
              </Title>
              <Text size="sm" c="dimmed">
                Drag and drop your file or click to browse
              </Text>
            </div>
            {file && (
              <Badge color="green" variant="light" size="lg">
                {file.name}
              </Badge>
            )}
          </Group>

          <Paper
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            style={{
              border: `2px dashed ${isDragOver ? "#3b82f6" : "#d1d5db"}`,
              borderRadius: "12px",
              padding: "40px",
              textAlign: "center",
              cursor: "pointer",
              backgroundColor: isDragOver ? "#f0f9ff" : "#ffffff",
              transition: "all 0.2s ease",
            }}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,.tsv,.xlsx,.xls"
              style={{ display: "none" }}
              onChange={(e) =>
                e.target.files?.[0] && handleFileSelect(e.target.files[0])
              }
            />

            <Center>
              <Stack align="center" gap="sm">
                <ThemeIcon
                  size="xl"
                  variant="light"
                  color={file ? "green" : "blue"}
                  radius="xl"
                >
                  {file ? (
                    <IconFileSpreadsheet size={32} />
                  ) : (
                    <IconCloudUpload size={32} />
                  )}
                </ThemeIcon>
                <Text fw={500} size="lg">
                  {file ? file.name : "Select CSV, TSV, or Excel file"}
                </Text>
                {file && (
                  <Text size="sm" c="dimmed">
                    {file.size > 1024 * 1024
                      ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                      : `${(file.size / 1024).toFixed(2)} KB`}
                  </Text>
                )}
                {!file && (
                  <Text size="sm" c="dimmed">
                    Maximum file size: 250 MB
                  </Text>
                )}
              </Stack>
            </Center>
          </Paper>

          {uploadProgress > 0 && uploadProgress < 100 && activeStep === 0 && (
            <Progress value={uploadProgress} size="lg" radius="xl" />
          )}

          <Group justify="flex-end">
            <Button
              leftSection={<IconCloudUpload size={16} />}
              onClick={handleUpload}
              disabled={!file || isProcessing}
              loading={isProcessing && activeStep === 0}
            >
              Upload File
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* AI Processing Animation */}
      {isProcessing && activeStep === 1 && (
        <Card withBorder padding="lg" radius="md">
          <Stack align="center" gap="md">
            <Group gap="md" align="center">
              <ThemeIcon size={48} radius="xl" variant="light" color="blue">
                <IconBrain size={24} />
              </ThemeIcon>
              <Stack gap={4}>
                <Text fw={600} size="lg">
                  Analyzing your data
                </Text>
                <Text size="sm" c="dimmed" style={{ minHeight: "20px" }}>
                  {aiStatusText}
                </Text>
              </Stack>
            </Group>
          </Stack>
        </Card>
      )}

      {/* AI Mapping Results - Only show on step 1 */}
      {activeStep === 1 && columnMappings.length > 0 && !isProcessing && (
        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={4} mb="xs">
                  Column Mapping
                </Title>
                <Text size="sm" c="dimmed">
                  Review and adjust column mappings. Click the edit icon to
                  change target fields.
                </Text>
              </div>
              <Badge color="blue" variant="light" size="lg">
                {columnMappings.length} mappings found
              </Badge>
            </Group>

            <ScrollArea h={300}>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Source Column</Table.Th>
                    <Table.Th>VCDB Target</Table.Th>
                    <Table.Th>Confidence</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {columnMappings.map((mapping, index) => {
                    const availableFields =
                      dataType === "fitments"
                        ? VCDB_FITMENT_FIELDS
                        : VCDB_PRODUCT_FIELDS;
                    const isEditing = editingMappingIndex === index;

                    return (
                      <Table.Tr key={index}>
                        <Table.Td>
                          <Text fw={500}>{mapping.source}</Text>
                        </Table.Td>
                        <Table.Td>
                          {isEditing ? (
                            <Autocomplete
                              value={editingMappingValue}
                              onChange={setEditingMappingValue}
                              data={availableFields}
                              placeholder="Select VCDB field"
                              size="xs"
                              onBlur={() => {
                                if (editingMappingValue !== mapping.target) {
                                  const updated = [...columnMappings];
                                  updated[index] = {
                                    ...updated[index],
                                    target: editingMappingValue,
                                    status: "manual" as const,
                                  };
                                  setColumnMappings(updated);
                                }
                                setEditingMappingIndex(null);
                                setEditingMappingValue("");
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  if (editingMappingValue !== mapping.target) {
                                    const updated = [...columnMappings];
                                    updated[index] = {
                                      ...updated[index],
                                      target: editingMappingValue,
                                      status: "manual" as const,
                                    };
                                    setColumnMappings(updated);
                                  }
                                  setEditingMappingIndex(null);
                                  setEditingMappingValue("");
                                } else if (e.key === "Escape") {
                                  setEditingMappingValue(mapping.target);
                                  setEditingMappingIndex(null);
                                }
                              }}
                              autoFocus
                              styles={{
                                input: { minWidth: 150 },
                              }}
                            />
                          ) : (
                            <Group gap="xs">
                              <Text size="sm" fw={500}>
                                {mapping.target}
                              </Text>
                              <ActionIcon
                                size="xs"
                                variant="subtle"
                                color="blue"
                                onClick={() => {
                                  setEditingMappingIndex(index);
                                  setEditingMappingValue(mapping.target);
                                }}
                              >
                                <IconEdit size={12} />
                              </ActionIcon>
                            </Group>
                          )}
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              mapping.confidence >= 0.9
                                ? "green"
                                : mapping.confidence >= 0.7
                                ? "yellow"
                                : "red"
                            }
                            variant="light"
                          >
                            {Math.round(mapping.confidence * 100)}%
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Badge
                            color={
                              mapping.status === "auto"
                                ? "green"
                                : mapping.status === "manual"
                                ? "blue"
                                : "gray"
                            }
                            variant="light"
                          >
                            {mapping.status === "auto"
                              ? "Auto"
                              : mapping.status === "manual"
                              ? "Manual"
                              : "Pending"}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            <Tooltip label="Accept mapping">
                              <ActionIcon
                                color="green"
                                variant="light"
                                onClick={() => handleAcceptMapping(index)}
                              >
                                <IconCheck size={16} />
                              </ActionIcon>
                            </Tooltip>
                            <Tooltip label="Reject mapping">
                              <ActionIcon
                                color="red"
                                variant="light"
                                onClick={() => handleRejectMapping(index)}
                              >
                                <IconX size={16} />
                              </ActionIcon>
                            </Tooltip>
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    );
                  })}
                </Table.Tbody>
              </Table>
            </ScrollArea>

            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
            >
              <Text size="sm">
                Mappings with confidence ≥ 90% are automatically approved.
                Review and adjust lower confidence mappings as needed.
              </Text>
            </Alert>

            {/* Continue to Validation Button */}
            <Group justify="flex-end" mt="md">
              <Button
                leftSection={<IconChecks size={16} />}
                onClick={async () => {
                  // Transformation happens automatically in backend
                  try {
                    await handleTransform();
                  } catch (error) {
                    console.error("Transformation error:", error);
                  }
                  // Move to validation step
                  setActiveStep(2);
                  await handleValidation();
                }}
                disabled={isProcessing || activeStep > 1}
                loading={isProcessing}
                size="md"
                color="blue"
              >
                Continue to Validation
              </Button>
            </Group>
          </Stack>
        </Card>
      )}

      {/* Validation Step */}
      {activeStep === 2 && (
        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={4} mb="xs">
                  Validation
                </Title>
                <Text size="sm" c="dimmed">
                  Validating data against VCDB standards
                </Text>
              </div>
              {isProcessing && (
                <Badge color="blue" variant="light" size="lg">
                  Validating...
                </Badge>
              )}
            </Group>

            {isProcessing && !reviewData && (
              <Center p="xl">
                <Stack align="center" gap="md">
                  <Loader size="lg" />
                  <Text size="sm" c="dimmed">
                    Validating against VCDB standards...
                  </Text>
                </Stack>
              </Center>
            )}

            {reviewData && (
              <Group justify="flex-end" mt="md">
                <Button
                  leftSection={<IconChecks size={16} />}
                  onClick={() => {
                    setActiveStep(3);
                  }}
                  color="blue"
                  size="md"
                >
                  Continue to Review
                </Button>
              </Group>
            )}
          </Stack>
        </Card>
      )}

      {/* Review Step */}
      {activeStep >= 3 && (
        <Card withBorder padding="lg" radius="md">
          <Stack gap="md">
            <Group justify="space-between">
              <div>
                <Title order={4} mb="xs">
                  Review & Finalize
                </Title>
                <Text size="sm" c="dimmed">
                  Review validation results and finalize your data
                </Text>
              </div>
              {reviewData && (
                <Badge color="green" variant="light" size="lg">
                  {reviewData.validRows} / {reviewData.totalRows} Valid
                </Badge>
              )}
            </Group>

            {reviewData ? (
              <Stack gap="md">
                {/* Summary Stats */}
                <Group grow>
                  <Paper
                    p="md"
                    withBorder
                    radius="md"
                    style={{ backgroundColor: "#f8f9fa" }}
                  >
                    <Stack gap="xs" align="center">
                      <Text size="xs" c="dimmed" fw={500}>
                        Total Rows
                      </Text>
                      <Text size="xl" fw={700} c="dark">
                        {reviewData.totalRows}
                      </Text>
                    </Stack>
                  </Paper>
                  <Paper
                    p="md"
                    withBorder
                    radius="md"
                    style={{ backgroundColor: "#f0fdf4" }}
                  >
                    <Stack gap="xs" align="center">
                      <Text size="xs" c="dimmed" fw={500}>
                        Valid Rows
                      </Text>
                      <Text size="xl" fw={700} c="green">
                        {reviewData.validRows}
                      </Text>
                    </Stack>
                  </Paper>
                  <Paper
                    p="md"
                    withBorder
                    radius="md"
                    style={{ backgroundColor: "#fef2f2" }}
                  >
                    <Stack gap="xs" align="center">
                      <Text size="xs" c="dimmed" fw={500}>
                        Errors
                      </Text>
                      <Text size="xl" fw={700} c="red">
                        {reviewData.errors?.length || 0}
                      </Text>
                    </Stack>
                  </Paper>
                  <Paper
                    p="md"
                    withBorder
                    radius="md"
                    style={{ backgroundColor: "#fffbeb" }}
                  >
                    <Stack gap="xs" align="center">
                      <Text size="xs" c="dimmed" fw={500}>
                        Warnings
                      </Text>
                      <Text size="xl" fw={700} c="yellow">
                        {reviewData.warnings?.length || 0}
                      </Text>
                    </Stack>
                  </Paper>
                </Group>

                {/* Validation Errors */}
                {reviewData.errors && reviewData.errors.length > 0 && (
                  <Alert
                    icon={<IconAlertCircle size={16} />}
                    color="red"
                    variant="light"
                  >
                    <Text size="sm" fw={500} mb="xs">
                      Validation Errors ({reviewData.errors.length})
                    </Text>
                    <ScrollArea h={150}>
                      <Stack gap="xs">
                        {reviewData.errors
                          .slice(0, 10)
                          .map((error: any, idx: number) => (
                            <Text key={idx} size="xs">
                              Row {error.row || "?"}: {error.message || error}
                            </Text>
                          ))}
                        {reviewData.errors.length > 10 && (
                          <Text size="xs" c="dimmed">
                            ... and {reviewData.errors.length - 10} more errors
                          </Text>
                        )}
                      </Stack>
                    </ScrollArea>
                  </Alert>
                )}

                {/* Validation Warnings */}
                {reviewData.warnings && reviewData.warnings.length > 0 && (
                  <Alert
                    icon={<IconInfoCircle size={16} />}
                    color="yellow"
                    variant="light"
                  >
                    <Text size="sm" fw={500} mb="xs">
                      Warnings ({reviewData.warnings.length})
                    </Text>
                    <ScrollArea h={150}>
                      <Stack gap="xs">
                        {reviewData.warnings
                          .slice(0, 10)
                          .map((warning: any, idx: number) => (
                            <Text key={idx} size="xs">
                              Row {warning.row || "?"}:{" "}
                              {warning.message || warning}
                            </Text>
                          ))}
                        {reviewData.warnings.length > 10 && (
                          <Text size="xs" c="dimmed">
                            ... and {reviewData.warnings.length - 10} more
                            warnings
                          </Text>
                        )}
                      </Stack>
                    </ScrollArea>
                  </Alert>
                )}

                {/* AI Recommendations with Transparent Scoring */}
                {/* {loadingRecommendations && (
                  <Card withBorder p="md">
                    <Group>
                      <Loader size="sm" />
                      <Text size="sm">Loading AI recommendations...</Text>
                    </Group>
                  </Card>
                )} */}

                {/* {!loadingRecommendations &&
                  Object.keys(recommendations).length > 0 && (
                    <Card
                      withBorder
                      p="md"
                      style={{ backgroundColor: "#f0f9ff" }}
                    >
                      <Group mb="md" align="center">
                        <IconBrain size={20} color="#2563eb" />
                        <Title order={5}>AI Recommendations</Title>
                        <Badge color="blue" variant="light">
                          {Object.keys(recommendations).length} part
                          {Object.keys(recommendations).length !== 1 ? "s" : ""}
                        </Badge>
                      </Group>
                      <Text size="sm" c="dimmed" mb="md">
                        Based on your uploaded data, here are similar fitments
                        that might be compatible. Click to see detailed source
                        evidence and confidence breakdown.
                      </Text>
                      <Stack gap="md">
                        {Object.entries(recommendations).map(
                          ([partId, configs]) => (
                            <Card
                              key={partId}
                              withBorder
                              p="sm"
                              style={{ backgroundColor: "white" }}
                            >
                              <Group mb="sm" justify="space-between">
                                <Text fw={600} size="sm">
                                  Part: {partId}
                                </Text>
                                <Badge variant="light" color="blue">
                                  {configs.length} recommendation
                                  {configs.length !== 1 ? "s" : ""}
                                </Badge>
                              </Group>
                              <Stack gap="xs">
                                {configs.slice(0, 5).map((config: any) => {
                                  const configKey = `${partId}-${config.id}`;
                                  const isExpanded =
                                    expandedRecommendations.has(configKey);
                                  return (
                                    <Paper key={config.id} p="xs" withBorder>
                                      <Group
                                        justify="space-between"
                                        align="center"
                                      >
                                        <div style={{ flex: 1 }}>
                                          <Group gap="xs">
                                            <Text size="sm" fw={500}>
                                              {config.year} {config.make}{" "}
                                              {config.model}
                                            </Text>
                                            {config.submodel && (
                                              <Text size="xs" c="dimmed">
                                                ({config.submodel})
                                              </Text>
                                            )}
                                            <Badge
                                              color={
                                                config.relevance >= 80
                                                  ? "green"
                                                  : config.relevance >= 60
                                                  ? "yellow"
                                                  : "orange"
                                              }
                                              variant="light"
                                              size="sm"
                                            >
                                              {config.relevance}% Match
                                            </Badge>
                                            {config.sourceEvidence &&
                                              config.sourceEvidence.length >
                                                0 && (
                                                <Badge
                                                  variant="dot"
                                                  color="blue"
                                                  size="sm"
                                                >
                                                  {config.sourceEvidence.length}{" "}
                                                  source
                                                  {config.sourceEvidence
                                                    .length !== 1
                                                    ? "s"
                                                    : ""}
                                                </Badge>
                                              )}
                                          </Group>
                                        </div>
                                        {config.sourceEvidence &&
                                          config.sourceEvidence.length > 0 && (
                                            <Button
                                              variant="light"
                                              size="xs"
                                              color="blue"
                                              leftSection={
                                                isExpanded ? (
                                                  <IconChevronUp size={14} />
                                                ) : (
                                                  <IconChevronDown size={14} />
                                                )
                                              }
                                              onClick={() => {
                                                const newExpanded = new Set(
                                                  expandedRecommendations
                                                );
                                                if (
                                                  newExpanded.has(configKey)
                                                ) {
                                                  newExpanded.delete(configKey);
                                                } else {
                                                  newExpanded.add(configKey);
                                                }
                                                setExpandedRecommendations(
                                                  newExpanded
                                                );
                                              }}
                                            >
                                              {isExpanded ? "Hide" : "View"}{" "}
                                              Details
                                            </Button>
                                          )}
                                      </Group>

                                      {isExpanded &&
                                        config.sourceEvidence &&
                                        config.sourceEvidence.length > 0 && (
                                          <Card
                                            mt="xs"
                                            p="sm"
                                            withBorder
                                            style={{
                                              backgroundColor: "#f8f9fa",
                                            }}
                                          >
                                            <Stack gap="sm">
                                              {config.confidenceBreakdown && (
                                                <Paper
                                                  p="xs"
                                                  withBorder
                                                  style={{
                                                    backgroundColor: "white",
                                                  }}
                                                >
                                                  <Text
                                                    size="xs"
                                                    fw={500}
                                                    mb="xs"
                                                  >
                                                    How this score was
                                                    calculated:
                                                  </Text>
                                                  <Group gap="xs" wrap="wrap">
                                                    {config.confidenceBreakdown
                                                      .baseVehicleMatch > 0 && (
                                                      <Badge
                                                        variant="light"
                                                        color="blue"
                                                        size="sm"
                                                      >
                                                        Base Vehicle: +
                                                        {
                                                          config
                                                            .confidenceBreakdown
                                                            .baseVehicleMatch
                                                        }
                                                        %
                                                      </Badge>
                                                    )}
                                                    {config.confidenceBreakdown
                                                      .partTypeMatch > 0 && (
                                                      <Badge
                                                        variant="light"
                                                        color="green"
                                                        size="sm"
                                                      >
                                                        Part Type: +
                                                        {
                                                          config
                                                            .confidenceBreakdown
                                                            .partTypeMatch
                                                        }
                                                        %
                                                      </Badge>
                                                    )}
                                                    {config.confidenceBreakdown
                                                      .yearProximity > 0 && (
                                                      <Badge
                                                        variant="light"
                                                        color="yellow"
                                                        size="sm"
                                                      >
                                                        Year: +
                                                        {
                                                          config
                                                            .confidenceBreakdown
                                                            .yearProximity
                                                        }
                                                        %
                                                      </Badge>
                                                    )}
                                                    {config.confidenceBreakdown
                                                      .attributeMatches > 0 && (
                                                      <Badge
                                                        variant="light"
                                                        color="cyan"
                                                        size="sm"
                                                      >
                                                        Attributes: +
                                                        {
                                                          config
                                                            .confidenceBreakdown
                                                            .attributeMatches
                                                        }
                                                        %
                                                      </Badge>
                                                    )}
                                                    <Badge
                                                      variant="filled"
                                                      color="green"
                                                      size="sm"
                                                    >
                                                      Total:{" "}
                                                      {
                                                        config
                                                          .confidenceBreakdown
                                                          .total
                                                      }
                                                      %
                                                    </Badge>
                                                  </Group>
                                                </Paper>
                                              )}

                                              <div>
                                                <Text
                                                  size="xs"
                                                  fw={500}
                                                  mb="xs"
                                                >
                                                  Matched Against Existing
                                                  Fitments:
                                                </Text>
                                                <Stack gap="xs">
                                                  {config.sourceEvidence.map(
                                                    (
                                                      evidence: any,
                                                      idx: number
                                                    ) => (
                                                      <Paper
                                                        key={idx}
                                                        p="xs"
                                                        withBorder
                                                        style={{
                                                          backgroundColor:
                                                            "white",
                                                        }}
                                                      >
                                                        <Stack gap={4}>
                                                          <Group gap="xs">
                                                            <Text
                                                              size="xs"
                                                              fw={500}
                                                            >
                                                              {
                                                                evidence.fitment
                                                                  .year
                                                              }{" "}
                                                              {
                                                                evidence.fitment
                                                                  .makeName
                                                              }{" "}
                                                              {
                                                                evidence.fitment
                                                                  .modelName
                                                              }
                                                            </Text>
                                                            {evidence.similarity && (
                                                              <Badge
                                                                size="xs"
                                                                variant="light"
                                                                color="blue"
                                                              >
                                                                {Math.round(
                                                                  evidence.similarity *
                                                                    100
                                                                )}
                                                                % similar
                                                              </Badge>
                                                            )}
                                                          </Group>
                                                          <Text
                                                            size="xs"
                                                            c="dimmed"
                                                          >
                                                            Part:{" "}
                                                            {
                                                              evidence.fitment
                                                                .partId
                                                            }{" "}
                                                            • Position:{" "}
                                                            {evidence.fitment
                                                              .position ||
                                                              "N/A"}
                                                          </Text>
                                                          {evidence.matchedAttributes && (
                                                            <div>
                                                              {evidence
                                                                .matchedAttributes
                                                                .matched
                                                                .length > 0 && (
                                                                <Group
                                                                  gap={4}
                                                                  mb={4}
                                                                >
                                                                  {evidence.matchedAttributes.matched.map(
                                                                    (
                                                                      attr: string
                                                                    ) => (
                                                                      <Badge
                                                                        key={
                                                                          attr
                                                                        }
                                                                        size="xs"
                                                                        color="green"
                                                                        variant="light"
                                                                      >
                                                                        <IconCheck
                                                                          size={
                                                                            8
                                                                          }
                                                                          style={{
                                                                            marginRight: 2,
                                                                          }}
                                                                        />
                                                                        {attr}
                                                                      </Badge>
                                                                    )
                                                                  )}
                                                                </Group>
                                                              )}
                                                              {evidence
                                                                .matchedAttributes
                                                                .differences
                                                                .length > 0 && (
                                                                <Group gap={4}>
                                                                  {evidence.matchedAttributes.differences.map(
                                                                    (
                                                                      diff: string,
                                                                      diffIdx: number
                                                                    ) => (
                                                                      <Badge
                                                                        key={
                                                                          diffIdx
                                                                        }
                                                                        size="xs"
                                                                        color="orange"
                                                                        variant="light"
                                                                      >
                                                                        <IconX
                                                                          size={
                                                                            8
                                                                          }
                                                                          style={{
                                                                            marginRight: 2,
                                                                          }}
                                                                        />
                                                                        {diff}
                                                                      </Badge>
                                                                    )
                                                                  )}
                                                                </Group>
                                                              )}
                                                            </div>
                                                          )}
                                                        </Stack>
                                                      </Paper>
                                                    )
                                                  )}
                                                </Stack>
                                              </div>

                                              {config.explanation && (
                                                <Paper
                                                  p="xs"
                                                  withBorder
                                                  style={{
                                                    backgroundColor: "white",
                                                  }}
                                                >
                                                  <Text
                                                    size="xs"
                                                    fw={500}
                                                    mb={4}
                                                  >
                                                    AI Explanation:
                                                  </Text>
                                                  <Text size="xs" c="dimmed">
                                                    {config.explanation}
                                                  </Text>
                                                </Paper>
                                              )}
                                            </Stack>
                                          </Card>
                                        )}
                                    </Paper>
                                  );
                                })}
                              </Stack>
                            </Card>
                          )
                        )}
                      </Stack>
                    </Card>
                  )} */}

                {/* Success Message */}
                {(!reviewData.errors || reviewData.errors.length === 0) && (
                  <Alert
                    icon={<IconCheck size={16} />}
                    color="green"
                    variant="light"
                  >
                    <Text size="sm" fw={500}>
                      ✅ All data validated successfully!
                    </Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      Your data is ready to be processed and published to
                      FitmentPro.ai
                    </Text>
                  </Alert>
                )}

                {/* Publish Result */}
                {publishResult && (
                  <Alert
                    icon={<IconCheck size={16} />}
                    color="green"
                    variant="light"
                  >
                    <Text size="sm" fw={500} mb="xs">
                      ✅ Publishing Complete!
                    </Text>
                    <Stack gap="xs">
                      <Text size="sm" c="dimmed">
                        Successfully published{" "}
                        <strong>
                          {publishResult.result?.publishedCount || 0}
                        </strong>{" "}
                        records
                      </Text>
                      {publishResult.createdCount > 0 && (
                        <Text size="sm" c="dimmed">
                          ✅ Created{" "}
                          <strong>{publishResult.createdCount}</strong>{" "}
                          {dataType === "fitments" ? "fitment" : "product"}(s)
                          in the database
                        </Text>
                      )}
                      {publishResult.errorCount > 0 && (
                        <Text size="sm" c="orange">
                          ⚠️ {publishResult.errorCount} error(s) occurred during
                          processing
                        </Text>
                      )}
                      {publishResult.jobId && (
                        <Text size="xs" c="dimmed" mt="xs">
                          Job ID: {publishResult.jobId}
                        </Text>
                      )}
                    </Stack>
                  </Alert>
                )}

                {/* Action Buttons */}
                <Group justify="space-between" mt="md">
                  <Button
                    variant="light"
                    color="red"
                    leftSection={<IconFileSpreadsheet size={16} />}
                    onClick={async () => {
                      if (!uploadId) return;
                      try {
                        const response =
                          await fitmentRulesService.exportInvalidRows(uploadId);
                        const blob = new Blob([response.data], {
                          type: "text/csv",
                        });
                        const url = window.URL.createObjectURL(blob);
                        const link = document.createElement("a");
                        link.href = url;
                        link.download = `invalid_rows_${uploadId}.csv`;
                        document.body.appendChild(link);
                        link.click();
                        document.body.removeChild(link);
                        window.URL.revokeObjectURL(url);
                        showSuccess("Invalid rows exported successfully");
                      } catch (error: any) {
                        showError(
                          error.message || "Failed to export invalid rows"
                        );
                      }
                    }}
                    disabled={
                      !reviewData?.errors || reviewData.errors.length === 0
                    }
                  >
                    Export Invalid Rows
                  </Button>
                  <Group>
                    <Button
                      variant="light"
                      color="gray"
                      onClick={() => {
                        setActiveStep(1);
                      }}
                      disabled={isPublishing}
                    >
                      Back to Mappings
                    </Button>
                    {!publishResult && (
                      <Button
                        leftSection={<IconCheck size={16} />}
                        color="blue"
                        onClick={() => handlePublish()}
                        disabled={isPublishing}
                        loading={isPublishing}
                      >
                        {isPublishing
                          ? "Publishing for Review..."
                          : "Publish for Review"}
                      </Button>
                    )}
                  </Group>
                </Group>
              </Stack>
            ) : (
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
              >
                <Text size="sm">
                  Validation completed. Review the results above and proceed to
                  finalize your data.
                </Text>
              </Alert>
            )}
          </Stack>
        </Card>
      )}
    </Stack>
  );
}
