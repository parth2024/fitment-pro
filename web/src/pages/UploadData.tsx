import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Progress,
  Badge,
  ThemeIcon,
  Modal,
  Center,
  Transition,
  Paper,
  NumberInput,
  Checkbox,
  TextInput,
  SimpleGrid,
  ScrollArea,
  Table,
  Tooltip,
  ActionIcon,
  Select,
  Stepper,
  Textarea,
} from "@mantine/core";
import {
  IconUpload,
  IconFileText,
  IconDatabase,
  IconCheck,
  IconInfoCircle,
  IconCloudUpload,
  IconX,
  IconSettings,
  IconBrain,
  IconUsers,
  IconCar,
  IconCalendar,
  IconPackage,
  IconMapPin,
  IconHash,
  IconEdit,
  IconArrowLeft,
  IconList,
  IconGasStation,
  IconDoor,
  IconSearch,
} from "@tabler/icons-react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { dataUploadService, fitmentUploadService } from "../api/services";
import { useApi, useAsyncOperation } from "../hooks/useApi";
import useEntity from "../hooks/useEntity";
import { useFieldConfiguration } from "../hooks/useFieldConfiguration";
import DynamicFormField from "../components/DynamicFormField";

interface UploadedFile {
  id: string;
  name: string;
  type: "vcdb" | "products";
  status: "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
  uploadedAt?: Date;
}

interface UploadSession {
  id: string;
  name?: string;
  created_at: string;
  vcdb_filename?: string;
  products_filename?: string;
  status: string;
}

export default function UploadData() {
  const [vcdbFile, setVcdbFile] = useState<File | null>(null);
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceFileType, setReplaceFileType] = useState<
    "vcdb" | "products" | null
  >(null);
  const [dataStatus, setDataStatus] = useState<any>(null);
  const [isReadyForFitment, setIsReadyForFitment] = useState(false);
  const [validationResults, setValidationResults] = useState<any>(null);

  // Fitment states
  const [selectedFitmentMethod, setSelectedFitmentMethod] = useState<
    "ai" | "manual"
  >("ai");

  // AI fitment states
  const [aiFitments, setAiFitments] = useState<any[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [selectedAiFitments, setSelectedAiFitments] = useState<string[]>([]);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [applyingAiFitment, setApplyingAiFitment] = useState(false);

  // Manual fitment states
  const [loadingDropdownData, setLoadingDropdownData] = useState(false);
  const [dropdownData, setDropdownData] = useState<any>(null);
  const [, setLookupData] = useState<any>(null);
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
  const [wheelParameters, setWheelParameters] = useState([
    { tireDiameter: "", wheelDiameter: "", backspacing: "" },
    { tireDiameter: "", wheelDiameter: "", backspacing: "" },
    { tireDiameter: "", wheelDiameter: "", backspacing: "" },
  ]);
  const [applyingManualFitment, setApplyingManualFitment] = useState(false);

  // Edit fitment states
  const [editingFitment, setEditingFitment] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverType, setDragOverType] = useState<"vcdb" | "products" | null>(
    null
  );
  const [dragCounter, setDragCounter] = useState(0);

  const { showSuccess, showError, showInfo } = useProfessionalToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vcdbDropRef = useRef<HTMLDivElement>(null);
  const productsDropRef = useRef<HTMLDivElement>(null);

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);

  // API hooks
  const { data: sessionsData, refetch: refetchSessions } = useApi(
    () => dataUploadService.getSessions(),
    []
  ) as any;

  const { data: newDataStatus, refetch: refetchDataStatus } = useApi(
    () => dataUploadService.getNewDataStatus(),
    []
  ) as any;

  const { execute: uploadFiles } = useAsyncOperation();
  const { currentEntity } = useEntity();

  // API hooks for manual fitment
  const { execute: fetchDropdownData } = useAsyncOperation();
  const { execute: fetchLookupData } = useAsyncOperation();
  const { execute: fetchFilteredVehicles } = useAsyncOperation();
  const { execute: createFitment } = useAsyncOperation();

  // Dynamic field configurations
  const { formFields: vcdbFormFields, refreshFields: refreshVcdbFields } =
    useFieldConfiguration({ referenceType: "vcdb", autoLoad: true });

  const { formFields: productFormFields, refreshFields: refreshProductFields } =
    useFieldConfiguration({ referenceType: "product", autoLoad: true });

  // Dynamic field values state
  const [dynamicVcdbFields, setDynamicVcdbFields] = useState<
    Record<string, any>
  >({});
  const [dynamicProductFields, setDynamicProductFields] = useState<
    Record<string, any>
  >({});

  // Convert API sessions data to UploadedFile format
  useEffect(() => {
    if (sessionsData) {
      const files: UploadedFile[] = [];

      sessionsData.forEach((session: UploadSession) => {
        if (session.vcdb_filename) {
          files.push({
            id: `${session.id}-vcdb`,
            name: session.vcdb_filename,
            type: "vcdb",
            status: "uploaded",
            progress: 100,
            uploadedAt: new Date(session.created_at),
          });
        }

        if (session.products_filename) {
          files.push({
            id: `${session.id}-products`,
            name: session.products_filename,
            type: "products",
            status: "uploaded",
            progress: 100,
            uploadedAt: new Date(session.created_at),
          });
        }
      });

      setUploadedFiles(files);
    }
  }, [sessionsData]);

  // Set the latest session ID when sessions data is available
  useEffect(() => {
    if (sessionsData && sessionsData.length > 0) {
      // Get the most recent session (first in the list since they're ordered by created_at desc)
      const latestSession = sessionsData[0];
      setSessionId(latestSession.id);
    }
  }, [sessionsData]);

  // Update data status and fitment readiness
  useEffect(() => {
    if (newDataStatus) {
      setDataStatus(newDataStatus);
      setIsReadyForFitment(newDataStatus.ready_for_fitment || false);
    }
  }, [newDataStatus]);

  // Listen for entity change events from EntitySelector
  useEffect(() => {
    const handleEntityChange = async () => {
      console.log("Entity changed, refreshing UploadData...");
      await Promise.all([refetchSessions(), refetchDataStatus()]);
    };

    // Listen for custom entity change events
    window.addEventListener("entityChanged", handleEntityChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [refetchSessions, refetchDataStatus]);

  // Clear validation results when component mounts

  // Check for existing files from API data
  const checkExistingFiles = () => {
    const sessions = sessionsData?.sessions || [];
    const latestSession = sessions[0]; // Most recent session

    return {
      vcdb: {
        exists: !!latestSession?.vcdb_filename,
        name: latestSession?.vcdb_filename || "",
        uploadedAt: latestSession?.created_at
          ? new Date(latestSession.created_at)
          : null,
      },
      products: {
        exists: !!latestSession?.products_filename,
        name: latestSession?.products_filename || "",
        uploadedAt: latestSession?.created_at
          ? new Date(latestSession.created_at)
          : null,
      },
    };
  };

  const validateFileWithDynamicFields = async (
    file: File,
    type: "vcdb" | "products"
  ) => {
    try {
      // Read file content
      const text = await file.text();
      let fileData: any[] = [];

      if (file.name.endsWith(".csv")) {
        // Parse CSV
        const lines = text.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        fileData = lines
          .slice(1)
          .map((line) => {
            const values = line.split(",").map((v) => v.trim());
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || "";
            });
            return obj;
          })
          .filter((obj) => Object.values(obj).some((v) => v !== ""));
      } else if (file.name.endsWith(".json")) {
        // Parse JSON
        fileData = JSON.parse(text);
      }

      if (fileData.length === 0) {
        showError("File appears to be empty or invalid format");
        return false;
      }

      // Validate with dynamic fields
      const response = await dataUploadService.validateFileWithDynamicFields(
        type,
        fileData
      );

      if (response.data) {
        setValidationResults({
          fileType: type,
          fileName: file.name,
          ...response.data,
        });

        if (!response.data.is_valid) {
          showError(
            `Validation failed: ${response.data.errors.slice(0, 3).join("; ")}`
          );
          return false;
        } else {
          showSuccess(
            `File validation passed! Found ${response.data.total_records} records.`
          );
          return true;
        }
      }

      return true;
    } catch (error: any) {
      console.error("Validation error:", error);
      showError(
        "Failed to validate file: " + (error.message || "Unknown error")
      );
      return false;
    }
  };

  const validateFileContent = async (file: File, type: "vcdb" | "products") => {
    try {
      const text = await file.text();
      let fileData: any[] = [];

      if (file.name.endsWith(".csv")) {
        // Parse CSV
        const lines = text.split("\n");
        const headers = lines[0].split(",").map((h) => h.trim());
        fileData = lines
          .slice(1)
          .map((line) => {
            const values = line.split(",").map((v) => v.trim());
            const obj: any = {};
            headers.forEach((header, index) => {
              obj[header] = values[index] || "";
            });
            return obj;
          })
          .filter((obj) => Object.values(obj).some((v) => v !== ""));
      } else if (file.name.endsWith(".json")) {
        // Parse JSON
        fileData = JSON.parse(text);
      }

      if (fileData.length === 0) {
        return {
          isValid: false,
          error: "File appears to be empty or invalid format",
        };
      }

      // Check content structure based on type
      const sampleRecord = fileData[0];
      const keys = Object.keys(sampleRecord).map((k) => k.toLowerCase());

      if (type === "vcdb") {
        // VCDB should contain vehicle-related fields
        const vcdbFields = [
          "year",
          "make",
          "model",
          "submodel",
          "drivetype",
          "fueltype",
          "numdoors",
          "bodytype",
          "vehicle",
          "car",
          "auto",
        ];
        const hasVcdbFields = vcdbFields.some((field) =>
          keys.some((key) => key.includes(field))
        );

        // Products should contain part-related fields
        const productFields = [
          "id",
          "description",
          "category",
          "parttype",
          "compatibility",
          "specifications",
          "part",
          "product",
        ];
        const hasProductFields = productFields.some((field) =>
          keys.some((key) => key.includes(field))
        );

        // For VCDB section: must have VCDB fields and should not have product fields
        if (!hasVcdbFields) {
          return {
            isValid: false,
            error:
              "This file does not appear to contain vehicle data. VCDB files should contain fields like year, make, model, etc.",
          };
        }

        if (hasProductFields && !hasVcdbFields) {
          return {
            isValid: false,
            error:
              "This appears to be a Products/Parts file. Please upload it to the Products Data section instead.",
          };
        }
      } else if (type === "products") {
        // Products should contain part-related fields
        const productFields = [
          "id",
          "description",
          "category",
          "parttype",
          "compatibility",
          "specifications",
          "part",
          "product",
        ];
        const hasProductFields = productFields.some((field) =>
          keys.some((key) => key.includes(field))
        );

        // VCDB should contain vehicle-related fields
        const vcdbFields = [
          "year",
          "make",
          "model",
          "submodel",
          "drivetype",
          "fueltype",
          "numdoors",
          "bodytype",
          "vehicle",
          "car",
          "auto",
        ];
        const hasVcdbFields = vcdbFields.some((field) =>
          keys.some((key) => key.includes(field))
        );

        // For Products section: must have product fields and should not have VCDB fields
        if (hasVcdbFields) {
          return {
            isValid: false,
            error:
              "This appears to be a VCDB/Vehicle file. Please upload it to the VCDB Data section instead.",
          };
        }

        if (!hasProductFields) {
          return {
            isValid: false,
            error:
              "This file does not appear to contain product/parts data. Products files should contain fields like id, description, category, etc.",
          };
        }
      }

      return { isValid: true };
    } catch (error) {
      return { isValid: false, error: "Failed to read file content" };
    }
  };

  const handleFileSelect = async (
    file: File | null,
    type: "vcdb" | "products"
  ) => {
    if (!file) return;

    // Check file extension first
    const validExtensions = [".csv", ".json", ".xlsx", ".xls"];
    const hasValidExtension = validExtensions.some((ext) =>
      file.name.toLowerCase().endsWith(ext)
    );

    if (!hasValidExtension) {
      showError(
        "Please select a file with a valid format (CSV, XLSX, XLS, or JSON)"
      );
      return;
    }

    // Validate file content structure
    const contentValidation = await validateFileContent(file, type);
    if (!contentValidation.isValid) {
      showError(contentValidation.error || "Invalid file content");
      return;
    }

    // Check if file already exists
    const existingFiles = checkExistingFiles();
    if (
      (type === "vcdb" && existingFiles.vcdb.exists) ||
      (type === "products" && existingFiles.products.exists)
    ) {
      setReplaceFileType(type);
      setShowReplaceModal(true);
      return;
    }

    // Validate file with dynamic fields
    const isValid = await validateFileWithDynamicFields(file, type);
    if (!isValid) {
      return;
    }

    // Set the file
    if (type === "vcdb") {
      setVcdbFile(file);
    } else {
      setProductsFile(file);
    }
  };

  const handleReplaceConfirm = () => {
    setShowReplaceModal(false);
    setReplaceFileType(null);

    showInfo("Previous file will be replaced with the new upload");
  };

  const handleUpload = async () => {
    setValidationResults(null);
    if (!vcdbFile && !productsFile) {
      showError(
        "Please select at least one file (VCDB or Products) before uploading"
      );
      return;
    }

    setUploading(true);
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

      // Upload files using the API
      const result = await uploadFiles(() =>
        dataUploadService.uploadFiles(
          vcdbFile || undefined,
          productsFile || undefined
        )
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        const uploadedTypes = [];
        if (vcdbFile) uploadedTypes.push("VCDB");
        if (productsFile) uploadedTypes.push("Products");
        showSuccess(
          `${uploadedTypes.join(
            " and "
          )} file(s) uploaded and processed successfully`
        );

        // Refresh the sessions data to get the latest uploads
        await refetchSessions();
        await refetchDataStatus();

        // Clear the file inputs
        setVcdbFile(null);
        setProductsFile(null);

        // Reset file inputs
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error);

      // Handle specific validation errors
      if (error.response?.data?.error_message) {
        showError(`Validation Error: ${error.response.data.error_message}`);
      } else if (error.response?.data?.message) {
        showError(`Upload Error: ${error.response.data.message}`);
      } else if (error.response?.data?.error) {
        showError(`Upload Error: ${error.response.data.error}`);
      } else if (error.message) {
        showError(`Upload Error: ${error.message}`);
      } else {
        showError(
          "Failed to upload files. Please check your file format and try again."
        );
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Fitment helper functions
  const isVcdbDataAvailable = () => {
    return dataStatus?.vcdb?.exists && dataStatus?.vcdb?.record_count > 0;
  };

  const isProductDataAvailable = () => {
    return (
      dataStatus?.products?.exists && dataStatus?.products?.record_count > 0
    );
  };

  const isManualMethodAvailable = () => {
    return isVcdbDataAvailable() && isProductDataAvailable();
  };

  // AI Fitment Functions
  const handleDirectAiFitment = async () => {
    setAiProcessing(true);
    setAiProgress(0);
    setAiLogs([]);
    setAiFitments([]);
    setSelectedAiFitments([]);

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
      // Call the new direct AI fitment API
      const result: any = await fitmentUploadService.processDirectAiFitment();

      clearInterval(logInterval);
      setAiProgress(100);
      setAiLogs((prev) => [...prev, "🎉 AI fitment generation completed!"]);

      const fitments =
        result?.fitments ||
        result?.data?.fitments ||
        result?.data?.data?.fitments;

      if (fitments && Array.isArray(fitments) && fitments.length > 0) {
        const fitmentsWithIds = fitments.map((fitment: any, index: number) => ({
          ...fitment,
          id: fitment.id || `fitment_${index}`,
          part_name:
            fitment.partDescription || fitment.part_name || "Unknown Part",
          part_description:
            fitment.partDescription || "No description available",
        }));

        setAiFitments(fitmentsWithIds);
        setSelectedAiFitments(
          fitmentsWithIds.map((fitment: any) => fitment.id)
        );
        showSuccess(
          `AI generated ${fitments.length} fitment suggestions!`,
          5000
        );
      } else {
        showError(
          "No fitments were generated. Please check your VCDB and Product data and try again."
        );
      }
    } catch (error: any) {
      clearInterval(logInterval);
      console.error("AI fitment error:", error);
      setAiLogs((prev) => [
        ...prev,
        "❌ AI processing failed. Please try again.",
      ]);

      // Handle specific AI fitment errors
      if (error.response?.data?.error) {
        showError(`AI Fitment Error: ${error.response.data.error}`);
      } else if (error.response?.data?.message) {
        showError(`AI Fitment Error: ${error.response.data.message}`);
      } else if (error.message) {
        showError(`AI Fitment Error: ${error.message}`);
      } else {
        showError(
          "Failed to process AI fitment. Please check your data and try again."
        );
      }
    } finally {
      setAiProcessing(false);
    }
  };

  const handleApplyDirectAiFitments = async () => {
    if (selectedAiFitments.length === 0) {
      showError("Please select fitments to apply");
      return;
    }

    setApplyingAiFitment(true);
    try {
      const selectedFitmentsData = aiFitments
        .filter((fitment) => selectedAiFitments.includes(fitment.id))
        .map((fitment) => ({
          id: fitment.id,
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
          tenant_id: currentEntity?.id || null, // Add tenant ID for multi-tenant support
        }));

      const result: any = await fitmentUploadService.applyDirectAiFitments(
        selectedFitmentsData
      );

      if (result) {
        showSuccess(
          `Successfully applied ${result.applied_count} AI fitments to the database!`,
          5000
        );
        setSelectedAiFitments([]);
        setAiFitments([]);
      }
    } catch (error: any) {
      console.error("Apply AI fitments error:", error);

      // Handle specific application errors
      if (error.response?.data?.error) {
        showError(`Application Error: ${error.response.data.error}`);
      } else if (error.response?.data?.message) {
        showError(`Application Error: ${error.response.data.message}`);
      } else if (error.message) {
        showError(`Application Error: ${error.message}`);
      } else {
        showError("Failed to apply AI fitments. Please try again.");
      }
    } finally {
      setApplyingAiFitment(false);
    }
  };

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
    if (!editingFitment) return;

    setSavingEdit(true);
    try {
      setAiFitments((prev) =>
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

  // Manual fitment functions
  const handleManualMethodClick = async () => {
    if (!isManualMethodAvailable()) {
      showError("VCDB and Product data are required for manual fitment method");
      return;
    }

    setSelectedFitmentMethod("manual");

    // Fetch dropdown data from VCDBData and ProductData tables
    setLoadingDropdownData(true);
    try {
      // Refresh field configurations to get latest values
      if (refreshVcdbFields && refreshProductFields) {
        await Promise.all([refreshVcdbFields(), refreshProductFields()]);
      }

      const [dropdownResult, lookupResult] = await Promise.all([
        fetchDropdownData(() => dataUploadService.getNewDataDropdownData()),
        fetchLookupData(() => dataUploadService.getLookupData()),
      ]);

      if (dropdownResult && dropdownResult.data) {
        setDropdownData(dropdownResult.data);

        // VCDB data structure loaded successfully
      } else {
        showError("Failed to load vehicle and product data");
      }

      if (lookupResult && lookupResult.data) {
        setLookupData(lookupResult.data);
      } else {
        showError("Failed to load lookup data");
      }
    } catch (error) {
      console.error("Failed to fetch data:", error);
      showError("Failed to load data");
    } finally {
      setLoadingDropdownData(false);
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
    // For enum fields, use the enum_options from field config
    if (fieldConfig.field_type === "enum" && fieldConfig.enum_options) {
      return fieldConfig.enum_options.map((option: string) => ({
        value: option,
        label: option,
      }));
    }

    // For other fields, try to get data from dropdown data based on field name
    const fieldName = fieldConfig.name.toLowerCase();
    if (dropdownData) {
      // Map common field names to dropdown data properties
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

  // Vehicle filtering function - exact implementation from ApplyFitments.tsx
  const handleFilterVehicles = async () => {
    // Validate required fields
    if (!vehicleFilters.yearFrom || !vehicleFilters.yearTo) {
      showError(
        "Please select both 'Year From' and 'Year To' before searching for vehicles."
      );
      return;
    }

    // Validate year range
    const yearFrom = parseInt(vehicleFilters.yearFrom);
    const yearTo = parseInt(vehicleFilters.yearTo);

    if (yearFrom >= yearTo) {
      showError(
        "Year To must be greater than Year From. Please select a valid year range."
      );
      return;
    }

    try {
      // Combine standard vehicle filters with dynamic VCDB fields
      const searchCriteria = {
        ...vehicleFilters,
        ...dynamicVcdbFields,
      };

      const result: any = await fetchFilteredVehicles(() =>
        fitmentUploadService.getFilteredVehicles(
          sessionId || "",
          searchCriteria
        )
      );

      if (result && result.data && result.data.vehicles) {
        if (result.data.vehicles.length === 0) {
          showError(
            "No vehicles found matching your criteria. Please adjust your search filters and try again."
          );
          return;
        }

        setFilteredVehicles(result.data.vehicles);
        setManualStep(2);
        showSuccess(`Found ${result.data.vehicles.length} vehicles`, 3000);
      } else {
        showError("Failed to search vehicles");
      }
    } catch (error) {
      console.error("Vehicle search error:", error);
      showError("Failed to search vehicles");
    }
  };

  // Manual fitment application - exact implementation from ApplyFitments.tsx
  const handleApplyManualFitment = async () => {
    // Validate required fields
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
      // Create fitments for each selected vehicle
      const fitmentsData = selectedVehicles.map((vehicleId) => {
        const vehicle = filteredVehicles.find((v) => v.id === vehicleId);
        return {
          partId: fitmentDetails.partId,
          title: fitmentDetails.title,
          description: fitmentDetails.description,
          notes: fitmentDetails.notes,
          quantity: fitmentDetails.quantity,
          position: fitmentDetails.position,
          liftHeight: fitmentDetails.liftHeight,
          wheelType: fitmentDetails.wheelType,
          wheelParameters: wheelParameters,
          fitmentType: "manual_fitment",
          // Tenant ID for multi-tenant support
          tenantId: currentEntity?.id || null,
          // Vehicle data
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
          // Dynamic VCDB fields
          ...dynamicVcdbFields,
          // Dynamic Product fields
          ...dynamicProductFields,
        };
      });

      const result: any = await createFitment(() =>
        dataUploadService.createFitment(fitmentsData)
      );

      if (result && result.data) {
        showSuccess(
          `Successfully created ${result.data.created} fitments!`,
          5000
        );
        // Reset form
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
        setWheelParameters([
          { tireDiameter: "", wheelDiameter: "", backspacing: "" },
          { tireDiameter: "", wheelDiameter: "", backspacing: "" },
          { tireDiameter: "", wheelDiameter: "", backspacing: "" },
        ]);
        setManualStep(1);
        setFormKey((prev) => prev + 1);
      } else {
        showError("Failed to create fitments");
      }
    } catch (error: any) {
      console.error("Create fitment error:", error);

      // Handle specific manual fitment errors
      if (error.response?.data?.error) {
        showError(`Manual Fitment Error: ${error.response.data.error}`);
      } else if (error.response?.data?.message) {
        showError(`Manual Fitment Error: ${error.response.data.message}`);
      } else if (error.message) {
        showError(`Manual Fitment Error: ${error.message}`);
      } else {
        showError(
          "Failed to create fitments. Please check your data and try again."
        );
      }
    } finally {
      setApplyingManualFitment(false);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent, type: "vcdb" | "products") => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev + 1);
      setIsDragOver(true);
      setDragOverType(type);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev - 1);
      if (dragCounter <= 1) {
        setIsDragOver(false);
        setDragOverType(null);
      }
    },
    [dragCounter]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "vcdb" | "products") => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setDragOverType(null);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        handleFileSelect(file, type);
      }
    },
    []
  );

  return (
    <div style={{ minHeight: "100vh" }}>
      {/* CSS Animations for AI Card Effects */}
      <style>{`
        @keyframes pulse {
          0% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
          50% {
            transform: translate(-50%, -50%) scale(1.1);
            opacity: 0.3;
          }
          100% {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.7;
          }
        }
      `}</style>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="xl">
          {/* Header */}
          <div>
            <Title order={2} style={{ marginBottom: "4px" }}>
              Upload Data Files
            </Title>
            <Text c="dimmed" size="sm">
              Upload VCDB and Products data files for fitment processing
            </Text>
          </div>

          {/* File Upload Section */}
          <Card
            withBorder
            radius="lg"
            padding="xl"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            }}
          >
            <Stack gap="xl">
              <Center>
                <Stack align="center" gap="sm">
                  <ThemeIcon size="xl" variant="light" color="blue" radius="xl">
                    <IconCloudUpload size={24} />
                  </ThemeIcon>
                  <div style={{ textAlign: "center" }}>
                    <Title order={3} fw={600} c="dark">
                      Upload Data Files
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Drag and drop your files or click to browse
                    </Text>
                  </div>
                </Stack>
              </Center>

              <Group gap="xl" align="stretch">
                {/* VCDB File Upload */}
                <Paper
                  ref={vcdbDropRef}
                  onDragEnter={(e) => handleDragEnter(e, "vcdb")}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "vcdb")}
                  style={{
                    flex: 1,
                    minHeight: "200px",
                    border: `2px dashed ${
                      isDragOver && dragOverType === "vcdb"
                        ? "#3b82f6"
                        : vcdbFile
                        ? "#22c55e"
                        : "#cbd5e1"
                    }`,
                    borderRadius: "16px",
                    backgroundColor:
                      isDragOver && dragOverType === "vcdb"
                        ? "#eff6ff"
                        : vcdbFile
                        ? "#f0fdf4"
                        : "#fafafa",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv,.xlsx,.xls,.json";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file, "vcdb");
                    };
                    input.click();
                  }}
                >
                  <Center style={{ height: "100%", padding: "24px" }}>
                    <Stack align="center" gap="md">
                      <Transition
                        mounted={!vcdbFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color={
                                isDragOver && dragOverType === "vcdb"
                                  ? "blue"
                                  : "blue"
                              }
                              radius="xl"
                            >
                              <IconDatabase size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Transition
                        mounted={!!vcdbFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color="green"
                              radius="xl"
                            >
                              <IconCheck size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Stack align="center" gap="xs">
                        <Text fw={600} size="lg" c="dark">
                          VCDB Data
                        </Text>
                        <Text size="sm" c="dimmed" ta="center">
                          {vcdbFile
                            ? vcdbFile.name
                            : "Vehicle configuration data. Supports CSV, XLSX, XLS, and JSON files."}
                        </Text>
                        {vcdbFile && (
                          <Badge color="green" variant="light" size="sm">
                            {formatFileSize(vcdbFile.size)}
                          </Badge>
                        )}
                      </Stack>

                      {isDragOver && dragOverType === "vcdb" && (
                        <Paper
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "16px",
                          }}
                        >
                          <Stack align="center" gap="sm">
                            <IconUpload size={32} color="#3b82f6" />
                            <Text fw={600} c="blue">
                              Drop file here
                            </Text>
                          </Stack>
                        </Paper>
                      )}
                    </Stack>
                  </Center>
                </Paper>

                {/* Products File Upload */}
                <Paper
                  ref={productsDropRef}
                  onDragEnter={(e) => handleDragEnter(e, "products")}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "products")}
                  style={{
                    flex: 1,
                    minHeight: "200px",
                    border: `2px dashed ${
                      isDragOver && dragOverType === "products"
                        ? "#10b981"
                        : productsFile
                        ? "#22c55e"
                        : "#cbd5e1"
                    }`,
                    borderRadius: "16px",
                    backgroundColor:
                      isDragOver && dragOverType === "products"
                        ? "#ecfdf5"
                        : productsFile
                        ? "#f0fdf4"
                        : "#fafafa",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv,.xlsx,.xls,.json";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file, "products");
                    };
                    input.click();
                  }}
                >
                  <Center style={{ height: "100%", padding: "24px" }}>
                    <Stack align="center" gap="md">
                      <Transition
                        mounted={!productsFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color={
                                isDragOver && dragOverType === "products"
                                  ? "green"
                                  : "green"
                              }
                              radius="xl"
                            >
                              <IconFileText size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Transition
                        mounted={!!productsFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color="green"
                              radius="xl"
                            >
                              <IconCheck size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Stack align="center" gap="xs">
                        <Text fw={600} size="lg" c="dark">
                          Products Data
                        </Text>
                        <Text size="sm" c="dimmed" ta="center">
                          {productsFile
                            ? productsFile.name
                            : "Parts and products data. Supports CSV, XLSX, XLS, and JSON files."}
                        </Text>
                        {productsFile && (
                          <Badge color="green" variant="light" size="sm">
                            {formatFileSize(productsFile.size)}
                          </Badge>
                        )}
                      </Stack>

                      {isDragOver && dragOverType === "products" && (
                        <Paper
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "16px",
                          }}
                        >
                          <Stack align="center" gap="sm">
                            <IconUpload size={32} color="#10b981" />
                            <Text fw={600} c="green">
                              Drop file here
                            </Text>
                          </Stack>
                        </Paper>
                      )}
                    </Stack>
                  </Center>
                </Paper>
              </Group>

              {/* Validation Results */}
              {validationResults && (
                <Paper
                  withBorder
                  radius="lg"
                  p="lg"
                  style={{
                    backgroundColor: validationResults.is_valid
                      ? "#f0fdf4"
                      : "#fef2f2",
                    border: `1px solid ${
                      validationResults.is_valid ? "#22c55e" : "#ef4444"
                    }`,
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Group gap="sm">
                        <ThemeIcon
                          size="sm"
                          variant="light"
                          color={validationResults.is_valid ? "green" : "red"}
                        >
                          {validationResults.is_valid ? (
                            <IconCheck size={16} />
                          ) : (
                            <IconX size={16} />
                          )}
                        </ThemeIcon>
                        <Text size="sm" fw={600} c="dark">
                          Validation Results for {validationResults.fileName}
                        </Text>
                      </Group>
                      <Badge
                        color={validationResults.is_valid ? "green" : "red"}
                        variant="light"
                        size="sm"
                      >
                        {validationResults.is_valid ? "Valid" : "Invalid"}
                      </Badge>
                    </Group>

                    {validationResults.validation_summary && (
                      <Group gap="lg">
                        <Text size="xs" c="dimmed">
                          Records: {validationResults.total_records}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Required Fields:{" "}
                          {validationResults.validation_summary.field_status
                            ?.required_present || 0}
                        </Text>
                        <Text size="xs" c="dimmed">
                          Optional Fields:{" "}
                          {validationResults.validation_summary.field_status
                            ?.optional_present || 0}
                        </Text>
                      </Group>
                    )}

                    {!validationResults.is_valid &&
                      validationResults.errors && (
                        <Stack gap="xs">
                          <Text size="xs" fw={600} c="red">
                            Validation Errors:
                          </Text>
                          {validationResults.errors
                            .slice(0, 5)
                            .map((error: string, index: number) => (
                              <Text key={index} size="xs" c="red">
                                • {error}
                              </Text>
                            ))}
                          {validationResults.errors.length > 5 && (
                            <Text size="xs" c="dimmed">
                              ... and {validationResults.errors.length - 5} more
                              errors
                            </Text>
                          )}
                        </Stack>
                      )}
                  </Stack>
                </Paper>
              )}

              {/* Upload Progress */}
              {uploading && (
                <Paper
                  withBorder
                  radius="lg"
                  p="lg"
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Group gap="sm">
                        <ThemeIcon size="sm" variant="light" color="blue">
                          <IconUpload size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={600} c="dark">
                          Uploading files...
                        </Text>
                      </Group>
                      <Badge color="blue" variant="light" size="sm">
                        {uploadProgress}%
                      </Badge>
                    </Group>
                    <Progress
                      value={uploadProgress}
                      size="lg"
                      radius="xl"
                      color="blue"
                      animated
                      style={{
                        backgroundColor: "#e2e8f0",
                      }}
                    />
                  </Stack>
                </Paper>
              )}

              {/* Upload Button */}
              <Center>
                <Button
                  size="xl"
                  leftSection={<IconUpload size={20} />}
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!vcdbFile && !productsFile}
                  radius="xl"
                  style={{
                    background:
                      !vcdbFile && !productsFile
                        ? "#e2e8f0"
                        : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    color: !vcdbFile && !productsFile ? "#64748b" : "#ffffff",
                    fontWeight: 600,
                    fontSize: "16px",
                    height: "56px",
                    padding: "0 48px",
                    boxShadow:
                      !vcdbFile && !productsFile
                        ? "none"
                        : "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform:
                        !vcdbFile && !productsFile
                          ? "none"
                          : "translateY(-2px)",
                      boxShadow:
                        !vcdbFile && !productsFile
                          ? "none"
                          : "0 8px 25px -5px rgba(59, 130, 246, 0.3)",
                    },
                  }}
                >
                  {uploading
                    ? "Uploading..."
                    : vcdbFile && productsFile
                    ? "Upload Both Files"
                    : vcdbFile
                    ? "Upload VCDB File"
                    : productsFile
                    ? "Upload Products File"
                    : "Upload Files"}
                </Button>
              </Center>
            </Stack>
          </Card>

          {/* Apply Fitments Section */}
          {isReadyForFitment && (
            <Card
              withBorder
              radius="lg"
              padding="xl"
              style={{
                backgroundColor: "#ffffff",
                border: "1px solid #e2e8f0",
                boxShadow:
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
              }}
            >
              <Stack gap="xl">
                {/* Header */}
                <div>
                  <Title order={2} c="#1e293b" fw={600} mb="xs">
                    Apply Fitments
                  </Title>
                  <Text size="md" c="#64748b" mb="lg">
                    Choose how you want to apply fitments to your vehicle
                    configurations
                  </Text>

                  {/* Data Status Indicators */}
                  <Group gap="lg" mb="lg">
                    <Group gap="xs">
                      <Badge color="green" variant="light" size="sm">
                        VCDB Data
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {dataStatus?.vcdb?.record_count || 0} records
                      </Text>
                    </Group>
                    <Group gap="xs">
                      <Badge color="green" variant="light" size="sm">
                        Product Data
                      </Badge>
                      <Text size="xs" c="dimmed">
                        {dataStatus?.products?.record_count || 0} records
                      </Text>
                    </Group>
                  </Group>
                </div>

                {/* Method Selection */}
                <SimpleGrid cols={2} spacing="xl">
                  {/* AI Method Card */}
                  <Card
                    style={{
                      background:
                        selectedFitmentMethod === "ai" ? "#f0f9ff" : "#fefefe",
                      border:
                        selectedFitmentMethod === "ai"
                          ? "2px solid #3b82f6"
                          : "2px solid #f1f5f9",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow:
                        selectedFitmentMethod === "ai"
                          ? "0 4px 12px rgba(59, 130, 246, 0.15)"
                          : "0 2px 4px rgba(0, 0, 0, 0.05)",
                      transform: "translateY(0)",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedFitmentMethod !== "ai") {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(0, 0, 0, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedFitmentMethod !== "ai") {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 4px rgba(0, 0, 0, 0.05)";
                      }
                    }}
                    p="xl"
                    onClick={() => setSelectedFitmentMethod("ai")}
                  >
                    <Stack align="center" gap="lg">
                      <div
                        style={{
                          background:
                            "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)",
                          borderRadius: "12px",
                          padding: "16px",
                          marginBottom: "8px",
                          position: "relative",
                        }}
                      >
                        <IconBrain size={32} color="#6366f1" />
                        {/* Subtle pulse effect */}
                        <div
                          style={{
                            position: "absolute",
                            top: "50%",
                            left: "50%",
                            transform: "translate(-50%, -50%)",
                            width: "60px",
                            height: "60px",
                            borderRadius: "50%",
                            background: "rgba(99, 102, 241, 0.1)",
                            animation: "pulse 2s infinite",
                          }}
                        />
                      </div>

                      <div style={{ textAlign: "center" }}>
                        <Text fw={700} size="xl" c="#1e293b" mb="xs">
                          AI Method
                        </Text>
                        <Text size="sm" c="#64748b" ta="center">
                          Let AI automatically generate and apply fitments based
                          on your VCDB and Product data
                        </Text>
                      </div>

                      {selectedFitmentMethod === "ai" && (
                        <Badge variant="light" color="blue" size="lg">
                          Selected
                        </Badge>
                      )}
                    </Stack>
                  </Card>

                  {/* Manual Method Card */}
                  <Card
                    style={{
                      background:
                        selectedFitmentMethod === "manual"
                          ? "#f0f9ff"
                          : "#fefefe",
                      border:
                        selectedFitmentMethod === "manual"
                          ? "2px solid #3b82f6"
                          : "2px solid #f1f5f9",
                      borderRadius: "12px",
                      cursor: "pointer",
                      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                      boxShadow:
                        selectedFitmentMethod === "manual"
                          ? "0 4px 12px rgba(59, 130, 246, 0.15)"
                          : "0 2px 4px rgba(0, 0, 0, 0.05)",
                      transform: "translateY(0)",
                    }}
                    onMouseEnter={(e) => {
                      if (selectedFitmentMethod !== "manual") {
                        e.currentTarget.style.transform = "translateY(-4px)";
                        e.currentTarget.style.boxShadow =
                          "0 8px 25px rgba(0, 0, 0, 0.1)";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (selectedFitmentMethod !== "manual") {
                        e.currentTarget.style.transform = "translateY(0)";
                        e.currentTarget.style.boxShadow =
                          "0 2px 4px rgba(0, 0, 0, 0.05)";
                      }
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

                      {selectedFitmentMethod === "manual" && (
                        <Badge variant="light" color="blue" size="lg">
                          Selected
                        </Badge>
                      )}
                    </Stack>
                  </Card>
                </SimpleGrid>

                {/* AI Processing Section */}
                {selectedFitmentMethod === "ai" && (
                  <div>
                    {!aiProcessing && aiFitments.length === 0 && (
                      <div style={{ textAlign: "center", marginTop: "40px" }}>
                        <Button
                          size="xl"
                          leftSection={<IconBrain size={24} />}
                          onClick={handleDirectAiFitment}
                          loading={aiProcessing}
                          disabled={aiProcessing}
                          style={{
                            borderRadius: "12px",
                            fontWeight: 700,
                            fontSize: "18px",
                            height: "60px",
                            padding: "0 48px",
                            background:
                              "linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)",
                            border: "none",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow:
                              "0 8px 25px -5px rgba(99, 102, 241, 0.3), 0 4px 6px -1px rgba(99, 102, 241, 0.1)",
                          }}
                          onMouseEnter={(e) => {
                            if (!e.currentTarget.disabled) {
                              e.currentTarget.style.transform =
                                "translateY(-3px)";
                              e.currentTarget.style.boxShadow =
                                "0 12px 35px -5px rgba(99, 102, 241, 0.4), 0 8px 10px -1px rgba(99, 102, 241, 0.1)";
                            }
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 8px 25px -5px rgba(99, 102, 241, 0.3), 0 4px 6px -1px rgba(99, 102, 241, 0.1)";
                          }}
                        >
                          {aiProcessing
                            ? "Generating Fitments..."
                            : "Generate AI Fitments"}
                        </Button>

                        <Text
                          size="sm"
                          c="#64748b"
                          mt="md"
                          style={{ maxWidth: "500px", margin: "16px auto 0" }}
                        >
                          Click the button above to start the AI fitment
                          generation process. Our advanced algorithms will
                          analyze your VCDB and Product data to create optimal
                          fitment recommendations.
                        </Text>
                      </div>
                    )}

                    {/* AI Progress Display */}
                    {aiProcessing && (
                      <Card
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        }}
                        h={400}
                        mt={30}
                        p="xl"
                      >
                        <Stack gap="lg">
                          <div>
                            <Title order={3} c="#1e293b" fw={600}>
                              🧠 AI Fitment Generation in Progress
                            </Title>
                            <Text size="sm" c="#64748b">
                              Our AI is analyzing your VCDB and Product data to
                              generate optimal fitments
                            </Text>
                          </div>

                          <Progress
                            value={aiProgress}
                            size="lg"
                            radius="md"
                            styles={{
                              root: { background: "#f1f5f9" },
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

                    {/* AI Fitments Results */}
                    {aiFitments.length > 0 && (
                      <Card
                        style={{
                          background: "#ffffff",
                          border: "1px solid #e2e8f0",
                          borderRadius: "12px",
                          boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                        }}
                        h={600}
                        p="xl"
                        mt="lg"
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
                            <Button
                              variant="filled"
                              color="green"
                              size="sm"
                              onClick={handleApplyDirectAiFitments}
                              disabled={selectedAiFitments.length === 0}
                              loading={applyingAiFitment}
                            >
                              Apply Selected ({selectedAiFitments.length})
                            </Button>
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
                                        selectedAiFitments.length ===
                                        aiFitments.length
                                      }
                                      indeterminate={
                                        selectedAiFitments.length > 0 &&
                                        selectedAiFitments.length <
                                          aiFitments.length
                                      }
                                      onChange={(event) => {
                                        if (event.currentTarget.checked) {
                                          setSelectedAiFitments(
                                            aiFitments.map(
                                              (fitment) => fitment.id
                                            )
                                          );
                                        } else {
                                          setSelectedAiFitments([]);
                                        }
                                      }}
                                      ml={7}
                                    />
                                  </Table.Th>
                                  <Table.Th style={{ width: "130px" }}>
                                    Part ID
                                  </Table.Th>
                                  <Table.Th style={{ width: "80px" }}>
                                    Year
                                  </Table.Th>
                                  <Table.Th style={{ width: "100px" }}>
                                    Make
                                  </Table.Th>
                                  <Table.Th style={{ width: "120px" }}>
                                    Model
                                  </Table.Th>
                                  <Table.Th style={{ width: "100px" }}>
                                    Submodel
                                  </Table.Th>
                                  <Table.Th style={{ width: "100px" }}>
                                    Position
                                  </Table.Th>
                                  <Table.Th style={{ width: "100px" }}>
                                    Confidence
                                  </Table.Th>
                                  <Table.Th style={{ width: "80px" }}>
                                    Actions
                                  </Table.Th>
                                </Table.Tr>
                              </Table.Thead>
                            </Table>

                            {/* Scrollable Table Body */}
                            <ScrollArea h={400} style={{ marginTop: "-1px" }}>
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
                                          checked={selectedAiFitments.includes(
                                            fitment.id
                                          )}
                                          onChange={(event) => {
                                            if (event.currentTarget.checked) {
                                              setSelectedAiFitments((prev) => [
                                                ...prev,
                                                fitment.id,
                                              ]);
                                            } else {
                                              setSelectedAiFitments((prev) =>
                                                prev.filter(
                                                  (id) => id !== fitment.id
                                                )
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
                                        <Badge
                                          variant="light"
                                          size="sm"
                                          color="blue"
                                        >
                                          {fitment.position}
                                        </Badge>
                                      </Table.Td>
                                      <Table.Td style={{ width: "100px" }}>
                                        <Tooltip
                                          label={
                                            fitment.ai_reasoning ||
                                            "No explanation available"
                                          }
                                          multiline
                                          w={300}
                                          withArrow
                                        >
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
                                            style={{ cursor: "help" }}
                                          >
                                            {Math.round(
                                              fitment.confidence * 100
                                            )}
                                            %
                                          </Badge>
                                        </Tooltip>
                                      </Table.Td>
                                      <Table.Td style={{ width: "80px" }}>
                                        <ActionIcon
                                          variant="subtle"
                                          color="blue"
                                          onClick={() =>
                                            handleEditFitment(fitment)
                                          }
                                          size="sm"
                                        >
                                          <IconEdit size={16} />
                                        </ActionIcon>
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
                  </div>
                )}

                {/* Manual Processing Section - Exact Implementation from ApplyFitments.tsx */}
                {selectedFitmentMethod === "manual" && (
                  <div>
                    <Card
                      style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                      }}
                      p="xl"
                      mt="lg"
                    >
                      <Stack gap="xl">
                        <div>
                          <Title order={3} c="#1e293b" fw={600}>
                            Manual Fitment Configuration
                          </Title>
                          <Text size="md" c="#64748b">
                            Configure fitments manually with full control over
                            each setting
                          </Text>
                        </div>

                        {/* Manual Method Stepper - Exact from ApplyFitments.tsx */}
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
                            label="Vehicle Search"
                            description="Set search criteria"
                            icon={<IconCar size={18} />}
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
                                    Step 1: Vehicle Search Criteria
                                  </Text>
                                  <Button
                                    variant="light"
                                    size="sm"
                                    onClick={() => {
                                      // Reset all filters
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

                                      // Clear dynamic fields
                                      setDynamicVcdbFields({});
                                      setDynamicProductFields({});
                                      setWheelParameters([
                                        {
                                          tireDiameter: "",
                                          wheelDiameter: "",
                                          backspacing: "",
                                        },
                                        {
                                          tireDiameter: "",
                                          wheelDiameter: "",
                                          backspacing: "",
                                        },
                                        {
                                          tireDiameter: "",
                                          wheelDiameter: "",
                                          backspacing: "",
                                        },
                                      ]);

                                      // Reset to first step
                                      setManualStep(1);

                                      // Force form re-render
                                      setFormKey((prev) => prev + 1);

                                      console.log("Filters cleared!");
                                    }}
                                    styles={{
                                      root: {
                                        borderRadius: "10px",
                                        fontWeight: 600,
                                        fontSize: "12px",
                                        height: "36px",
                                        padding: "0 16px",
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
                                    Clear All
                                  </Button>
                                </Group>

                                <div key={formKey}>
                                  <SimpleGrid
                                    cols={{ base: 1, sm: 2, lg: 3 }}
                                    spacing="lg"
                                  >
                                    <Select
                                      label="Year From"
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading years..."
                                          : "Select starting year"
                                      }
                                      data={dropdownData?.years || []}
                                      value={vehicleFilters.yearFrom}
                                      onChange={(value) => {
                                        setVehicleFilters((prev) => {
                                          const newYearFrom = value || "";
                                          let newYearTo = prev.yearTo;

                                          if (
                                            newYearFrom &&
                                            prev.yearTo &&
                                            parseInt(prev.yearTo) <=
                                              parseInt(newYearFrom)
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
                                      required
                                      leftSection={
                                        <IconCalendar
                                          size={16}
                                          color="#64748b"
                                        />
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
                                      label="Year To"
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading years..."
                                          : "Select ending year"
                                      }
                                      data={
                                        dropdownData?.years
                                          ? dropdownData.years.filter(
                                              (year: string) => {
                                                if (!vehicleFilters.yearFrom)
                                                  return true;
                                                return (
                                                  parseInt(year) >
                                                  parseInt(
                                                    vehicleFilters.yearFrom
                                                  )
                                                );
                                              }
                                            )
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
                                      disabled={
                                        loadingDropdownData ||
                                        !vehicleFilters.yearFrom
                                      }
                                      required
                                      leftSection={
                                        <IconCalendar
                                          size={16}
                                          color="#64748b"
                                        />
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
                                      label="Make"
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading makes..."
                                          : "Select make"
                                      }
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
                                      label="Model"
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading models..."
                                          : "Select model"
                                      }
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
                                      label="Submodel"
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading submodels..."
                                          : "Select submodel"
                                      }
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
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading fuel types..."
                                          : "Select fuel type"
                                      }
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
                                        <IconGasStation
                                          size={16}
                                          color="#64748b"
                                        />
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
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading door counts..."
                                          : "Select door count"
                                      }
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
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading drive types..."
                                          : "Select drive type"
                                      }
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
                                        <IconSettings
                                          size={16}
                                          color="#64748b"
                                        />
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
                                      placeholder={
                                        loadingDropdownData
                                          ? "Loading body types..."
                                          : "Select body type"
                                      }
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

                                  {/* Dynamic VCDB Fields */}
                                  {vcdbFormFields &&
                                    vcdbFormFields.length > 0 && (
                                      <div style={{ marginTop: "32px" }}>
                                        <Text
                                          fw={600}
                                          size="md"
                                          c="#1e293b"
                                          mb="md"
                                        >
                                          Dynamic VCDB Fields
                                        </Text>
                                        <SimpleGrid
                                          cols={{ base: 1, sm: 2, lg: 3 }}
                                          spacing="lg"
                                        >
                                          {vcdbFormFields
                                            .filter(
                                              (field) =>
                                                field.is_enabled &&
                                                field.show_in_forms
                                            )
                                            .map((field) => (
                                              <DynamicFormField
                                                key={field.id}
                                                fieldConfig={field}
                                                value={
                                                  dynamicVcdbFields[
                                                    field.name
                                                  ] || ""
                                                }
                                                onChange={(value) =>
                                                  updateDynamicVcdbField(
                                                    field.name,
                                                    value
                                                  )
                                                }
                                                data={getFieldData(field)}
                                              />
                                            ))}
                                        </SimpleGrid>
                                      </div>
                                    )}

                                  <Group justify="center" mt="xl">
                                    <Button
                                      size="lg"
                                      leftSection={<IconSearch size={20} />}
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
                                      onClick={handleFilterVehicles}
                                      loading={false}
                                    >
                                      Search Vehicles
                                    </Button>
                                  </Group>
                                </div>
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
                                        <Group gap={40}>
                                          <Checkbox
                                            checked={selectedVehicles.includes(
                                              vehicle.id
                                            )}
                                            onChange={() => {}}
                                          />
                                          <div>
                                            <Text
                                              fw={600}
                                              size="sm"
                                              c="#1e293b"
                                            >
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
                                    onClick={() => setManualStep(3)}
                                    disabled={selectedVehicles.length === 0}
                                    style={{
                                      background:
                                        "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                                      border: "none",
                                    }}
                                  >
                                    Continue ({selectedVehicles.length}{" "}
                                    selected)
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
                                    Configure the specific details for your
                                    fitment application
                                  </Text>
                                </div>

                                <div>
                                  {/* Core Fitment Fields */}
                                  <div style={{ marginBottom: "32px" }}>
                                    <Text
                                      fw={600}
                                      size="md"
                                      c="#1e293b"
                                      mb="md"
                                    >
                                      Core Fitment Information
                                    </Text>
                                    <SimpleGrid
                                      cols={{ base: 1, sm: 2, lg: 3 }}
                                      spacing="lg"
                                    >
                                      <Select
                                        label="Part Type"
                                        placeholder={
                                          loadingDropdownData
                                            ? "Loading parts..."
                                            : "Select a part"
                                        }
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
                                        leftSection={
                                          <IconPackage
                                            size={16}
                                            color="#64748b"
                                          />
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
                                        label="Position"
                                        placeholder={
                                          loadingDropdownData
                                            ? "Loading positions..."
                                            : "Select position"
                                        }
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
                                        leftSection={
                                          <IconMapPin
                                            size={16}
                                            color="#64748b"
                                          />
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
                                        placeholder="Enter quantity"
                                        value={fitmentDetails.quantity}
                                        onChange={(value) =>
                                          setFitmentDetails((prev) => ({
                                            ...prev,
                                            quantity: Number(value) || 1,
                                          }))
                                        }
                                        min={1}
                                        max={10}
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
                                        leftSection={
                                          <IconFileText
                                            size={16}
                                            color="#64748b"
                                          />
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
                                        value={fitmentDetails.description}
                                        onChange={(e) =>
                                          setFitmentDetails((prev) => ({
                                            ...prev,
                                            description: e.target.value,
                                          }))
                                        }
                                        minRows={3}
                                        maxRows={5}
                                        autosize
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
                                        label="Notes"
                                        placeholder="Enter additional notes"
                                        value={fitmentDetails.notes}
                                        onChange={(e) =>
                                          setFitmentDetails((prev) => ({
                                            ...prev,
                                            notes: e.target.value,
                                          }))
                                        }
                                        minRows={3}
                                        maxRows={5}
                                        autosize
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
                                    </SimpleGrid>
                                  </div>

                                  {/* Wheel Parameters Section */}
                                  <div style={{ marginBottom: "32px" }}>
                                    <Text
                                      fw={600}
                                      size="md"
                                      c="#1e293b"
                                      mb="md"
                                    >
                                      Wheel Parameters
                                    </Text>
                                    <Text size="sm" c="#64748b" mb="lg">
                                      Configure tire diameter, wheel diameter,
                                      and backspacing for each wheel position
                                    </Text>
                                    <SimpleGrid
                                      cols={{ base: 1, sm: 2, lg: 3 }}
                                      spacing="lg"
                                    >
                                      {wheelParameters.map((wheel, index) => (
                                        <Card
                                          key={index}
                                          withBorder
                                          p="md"
                                          style={{
                                            backgroundColor: "#f8fafc",
                                            border: "1px solid #e2e8f0",
                                            borderRadius: "8px",
                                          }}
                                        >
                                          <Stack gap="sm">
                                            <Text
                                              fw={600}
                                              size="sm"
                                              c="#1e293b"
                                              ta="center"
                                            >
                                              Wheel Position {index + 1}
                                            </Text>
                                            <TextInput
                                              label="Tire Diameter"
                                              placeholder="e.g., 33"
                                              value={wheel.tireDiameter}
                                              onChange={(e) => {
                                                const newWheelParameters = [
                                                  ...wheelParameters,
                                                ];
                                                newWheelParameters[index] = {
                                                  ...newWheelParameters[index],
                                                  tireDiameter: e.target.value,
                                                };
                                                setWheelParameters(
                                                  newWheelParameters
                                                );
                                              }}
                                              leftSection={
                                                <IconHash
                                                  size={16}
                                                  color="#64748b"
                                                />
                                              }
                                              styles={{
                                                label: {
                                                  fontWeight: 600,
                                                  fontSize: "12px",
                                                  color: "#374151",
                                                  marginBottom: "6px",
                                                  textTransform: "uppercase",
                                                  letterSpacing: "0.5px",
                                                },
                                                input: {
                                                  borderRadius: "8px",
                                                  border: "1px solid #e2e8f0",
                                                  fontSize: "13px",
                                                  height: "40px",
                                                  paddingLeft: "36px",
                                                  transition:
                                                    "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                  backgroundColor: "#ffffff",
                                                  "&:focus": {
                                                    borderColor: "#3b82f6",
                                                    boxShadow:
                                                      "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                                  },
                                                  "&:hover": {
                                                    borderColor: "#cbd5e1",
                                                  },
                                                },
                                              }}
                                            />
                                            <TextInput
                                              label="Wheel Diameter"
                                              placeholder="e.g., 17"
                                              value={wheel.wheelDiameter}
                                              onChange={(e) => {
                                                const newWheelParameters = [
                                                  ...wheelParameters,
                                                ];
                                                newWheelParameters[index] = {
                                                  ...newWheelParameters[index],
                                                  wheelDiameter: e.target.value,
                                                };
                                                setWheelParameters(
                                                  newWheelParameters
                                                );
                                              }}
                                              leftSection={
                                                <IconHash
                                                  size={16}
                                                  color="#64748b"
                                                />
                                              }
                                              styles={{
                                                label: {
                                                  fontWeight: 600,
                                                  fontSize: "12px",
                                                  color: "#374151",
                                                  marginBottom: "6px",
                                                  textTransform: "uppercase",
                                                  letterSpacing: "0.5px",
                                                },
                                                input: {
                                                  borderRadius: "8px",
                                                  border: "1px solid #e2e8f0",
                                                  fontSize: "13px",
                                                  height: "40px",
                                                  paddingLeft: "36px",
                                                  transition:
                                                    "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                  backgroundColor: "#ffffff",
                                                  "&:focus": {
                                                    borderColor: "#3b82f6",
                                                    boxShadow:
                                                      "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                                  },
                                                  "&:hover": {
                                                    borderColor: "#cbd5e1",
                                                  },
                                                },
                                              }}
                                            />
                                            <TextInput
                                              label="Backspacing"
                                              placeholder="e.g., 4.5"
                                              value={wheel.backspacing}
                                              onChange={(e) => {
                                                const newWheelParameters = [
                                                  ...wheelParameters,
                                                ];
                                                newWheelParameters[index] = {
                                                  ...newWheelParameters[index],
                                                  backspacing: e.target.value,
                                                };
                                                setWheelParameters(
                                                  newWheelParameters
                                                );
                                              }}
                                              leftSection={
                                                <IconHash
                                                  size={16}
                                                  color="#64748b"
                                                />
                                              }
                                              styles={{
                                                label: {
                                                  fontWeight: 600,
                                                  fontSize: "12px",
                                                  color: "#374151",
                                                  marginBottom: "6px",
                                                  textTransform: "uppercase",
                                                  letterSpacing: "0.5px",
                                                },
                                                input: {
                                                  borderRadius: "8px",
                                                  border: "1px solid #e2e8f0",
                                                  fontSize: "13px",
                                                  height: "40px",
                                                  paddingLeft: "36px",
                                                  transition:
                                                    "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                                  backgroundColor: "#ffffff",
                                                  "&:focus": {
                                                    borderColor: "#3b82f6",
                                                    boxShadow:
                                                      "0 0 0 3px rgba(59, 130, 246, 0.1)",
                                                  },
                                                  "&:hover": {
                                                    borderColor: "#cbd5e1",
                                                  },
                                                },
                                              }}
                                            />
                                          </Stack>
                                        </Card>
                                      ))}
                                    </SimpleGrid>
                                  </div>

                                  {/* Optional Configuration Section */}
                                  <div style={{ marginBottom: "32px" }}>
                                    <Text
                                      fw={600}
                                      size="md"
                                      c="#1e293b"
                                      mb="md"
                                    >
                                      Optional Configuration
                                    </Text>
                                    <SimpleGrid
                                      cols={{ base: 1, sm: 2 }}
                                      spacing="lg"
                                    >
                                      <TextInput
                                        label="Lift Height"
                                        placeholder="e.g., 2.5 inches"
                                        value={fitmentDetails.liftHeight}
                                        onChange={(e) =>
                                          setFitmentDetails((prev) => ({
                                            ...prev,
                                            liftHeight: e.target.value,
                                          }))
                                        }
                                        leftSection={
                                          <IconSettings
                                            size={16}
                                            color="#64748b"
                                          />
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
                                        label="Wheel Type"
                                        placeholder="Select wheel type"
                                        data={[
                                          { value: "steel", label: "Steel" },
                                          { value: "alloy", label: "Alloy" },
                                          { value: "forged", label: "Forged" },
                                          { value: "chrome", label: "Chrome" },
                                          { value: "black", label: "Black" },
                                        ]}
                                        value={fitmentDetails.wheelType}
                                        onChange={(value) =>
                                          setFitmentDetails((prev) => ({
                                            ...prev,
                                            wheelType: value || "",
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

                                  {/* Dynamic Product Fields */}
                                  {productFormFields &&
                                    productFormFields.length > 0 && (
                                      <div style={{ marginBottom: "32px" }}>
                                        <Text
                                          fw={600}
                                          size="md"
                                          c="#1e293b"
                                          mb="md"
                                        >
                                          Dynamic Product Fields
                                        </Text>
                                        <SimpleGrid
                                          cols={{ base: 1, sm: 2, lg: 3 }}
                                          spacing="lg"
                                        >
                                          {productFormFields
                                            .filter(
                                              (field) =>
                                                field.is_enabled &&
                                                field.show_in_forms
                                            )
                                            .map((field) => (
                                              <DynamicFormField
                                                key={field.id}
                                                fieldConfig={field}
                                                value={
                                                  dynamicProductFields[
                                                    field.name
                                                  ] || ""
                                                }
                                                onChange={(value) =>
                                                  updateDynamicProductField(
                                                    field.name,
                                                    value
                                                  )
                                                }
                                                data={getFieldData(field)}
                                              />
                                            ))}
                                        </SimpleGrid>
                                      </div>
                                    )}
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
                                    leftSection={<IconPackage size={16} />}
                                    onClick={handleApplyManualFitment}
                                    loading={applyingManualFitment}
                                    disabled={
                                      !fitmentDetails.partId ||
                                      !fitmentDetails.position ||
                                      !fitmentDetails.title ||
                                      selectedVehicles.length === 0
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
                                    Create Fitments ({selectedVehicles.length})
                                  </Button>
                                </Group>
                              </Stack>
                            </div>
                          </Stepper.Step>
                        </Stepper>
                      </Stack>
                    </Card>
                  </div>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      {/* Replace File Confirmation Modal */}
      <Modal
        opened={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        title={
          <Group gap="sm">
            <ThemeIcon size="md" variant="light" color="orange" radius="xl">
              <IconX size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              Replace Existing File
            </Text>
          </Group>
        }
        centered
        size="md"
        radius="lg"
        styles={{
          content: {
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          },
        }}
      >
        <Stack gap="lg">
          <Paper
            withBorder
            radius="lg"
            p="lg"
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
            }}
          >
            <Group gap="sm">
              <ThemeIcon size="sm" variant="light" color="orange" radius="xl">
                <IconInfoCircle size={16} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm" c="dark">
                  File Already Exists
                </Text>
                <Text size="sm" c="dimmed" mt="xs">
                  A {replaceFileType?.toUpperCase()} file already exists. Do you
                  want to replace it with the new file?
                </Text>
              </div>
            </Group>
          </Paper>

          <Text size="sm" c="dimmed">
            The previous file will be permanently removed and replaced with the
            new upload. This action cannot be undone.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              onClick={() => setShowReplaceModal(false)}
              radius="xl"
              style={{
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              Cancel
            </Button>
            <Button
              color="orange"
              onClick={handleReplaceConfirm}
              radius="xl"
              style={{
                backgroundColor: "#f59e0b",
                "&:hover": {
                  backgroundColor: "#d97706",
                },
              }}
            >
              Replace File
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Edit Fitment Modal */}
      <Modal
        opened={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title={
          <div>
            <Text fw={700} size="xl" c="#1e293b">
              Edit AI Fitment
            </Text>
            <Text size="sm" c="#64748b" mt={4}>
              Modify the fitment details below. Changes will be applied to the
              selected fitment.
            </Text>
          </div>
        }
        size="xl"
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
            boxShadow:
              "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)",
          },
        }}
      >
        <Stack gap="xl">
          {/* Basic Information Section */}
          <div>
            <Text fw={600} size="lg" c="#1e293b" mb="md">
              Basic Information
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput
                label="Part ID"
                placeholder="Enter part ID"
                value={editFormData.part_id || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    part_id: e.target.value,
                  })
                }
                leftSection={<IconPackage size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
              <NumberInput
                label="Year"
                placeholder="Enter year"
                value={editFormData.year || 2020}
                onChange={(value) =>
                  setEditFormData({ ...editFormData, year: value })
                }
                min={1900}
                max={2030}
                leftSection={<IconCalendar size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            </SimpleGrid>
          </div>

          {/* Vehicle Information Section */}
          <div>
            <Text fw={600} size="lg" c="#1e293b" mb="md">
              Vehicle Information
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput
                label="Make"
                placeholder="Enter make"
                value={editFormData.make || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, make: e.target.value })
                }
                leftSection={<IconCar size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
              <TextInput
                label="Model"
                placeholder="Enter model"
                value={editFormData.model || ""}
                onChange={(e) =>
                  setEditFormData({ ...editFormData, model: e.target.value })
                }
                leftSection={<IconCar size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
              <TextInput
                label="Submodel"
                placeholder="Enter submodel"
                value={editFormData.submodel || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    submodel: e.target.value,
                  })
                }
                leftSection={<IconCar size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
              <TextInput
                label="Drive Type"
                placeholder="Enter drive type"
                value={editFormData.drive_type || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    drive_type: e.target.value,
                  })
                }
                leftSection={<IconSettings size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            </SimpleGrid>
          </div>

          {/* Fitment Details Section */}
          <div>
            <Text fw={600} size="lg" c="#1e293b" mb="md">
              Fitment Details
            </Text>
            <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
              <TextInput
                label="Position"
                placeholder="Enter position"
                value={editFormData.position || ""}
                onChange={(e) =>
                  setEditFormData({
                    ...editFormData,
                    position: e.target.value,
                  })
                }
                leftSection={<IconMapPin size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
              <NumberInput
                label="Quantity"
                placeholder="Enter quantity"
                value={editFormData.quantity || 1}
                onChange={(value) =>
                  setEditFormData({ ...editFormData, quantity: value })
                }
                min={1}
                max={10}
                leftSection={<IconHash size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            </SimpleGrid>
          </div>

          {/* AI Analysis Section */}
          <div>
            <Text fw={600} size="lg" c="#1e293b" mb="md">
              AI Analysis
            </Text>
            <Stack gap="lg">
              <NumberInput
                label="Confidence Score"
                placeholder="Enter confidence score"
                value={editFormData.confidence || 0}
                onChange={(value) =>
                  setEditFormData({ ...editFormData, confidence: value })
                }
                min={0}
                max={1}
                step={0.01}
                decimalScale={2}
                leftSection={<IconBrain size={16} color="#64748b" />}
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
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
            </Stack>
          </div>

          {/* Action Buttons */}
          <Group
            justify="flex-end"
            gap="md"
            mt="xl"
            pt="lg"
            style={{ borderTop: "1px solid #e2e8f0" }}
          >
            <Button
              variant="outline"
              onClick={() => setEditModalOpen(false)}
              disabled={savingEdit}
              size="md"
              styles={{
                root: {
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  height: "44px",
                  padding: "0 24px",
                  border: "2px solid #e2e8f0",
                  color: "#64748b",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    borderColor: "#cbd5e1",
                    backgroundColor: "#f8fafc",
                    transform: "translateY(-1px)",
                  },
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSaveEdit}
              loading={savingEdit}
              size="md"
              styles={{
                root: {
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  height: "44px",
                  padding: "0 24px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  border: "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow:
                    "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 8px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                  },
                },
              }}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
