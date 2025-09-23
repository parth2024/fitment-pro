import { useState, useEffect, useRef } from "react";
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
  Transition,
  Table,
  Progress,
  Tooltip,
  ActionIcon,
  Modal,
  Divider,
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
} from "@tabler/icons-react";
import {
  dataUploadService,
  fitmentUploadService,
  type FieldConfiguration,
} from "../api/services";
import { useAsyncOperation, useApi } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { useFieldConfiguration } from "../hooks/useFieldConfiguration";
import DynamicFormField from "../components/DynamicFormField";
import { useEntity } from "../hooks/useEntity";

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

  // Set the latest session ID when sessions data is available
  useEffect(() => {
    if (sessionsData && sessionsData.length > 0) {
      // Get the most recent session (first in the list since they're ordered by created_at desc)
      const latestSession = sessionsData[0];
      setSessionId(latestSession.id);
    }
  }, [sessionsData]);

  // Listen for entity change events from EntitySelector
  useEffect(() => {
    const handleEntityChange = async () => {
      console.log("Entity changed, refreshing ApplyFitments...");
      await Promise.all([refetchSessions(), refetchDataStatus()]);
    };

    // Listen for custom entity change events
    window.addEventListener("entityChanged", handleEntityChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [refetchSessions, refetchDataStatus]);

  // Step management for UI flow
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1); // 1 = Choose Method, 2 = Manual Method, 3 = AI Method (disabled)

  // Navigation handlers
  const handleBackToMethodSelection = () => {
    setCurrentStep(1);
    setSelectedMethod(null);
    // Reset AI-related states
    setAiProcessing(false);
    setAiProgress(0);
    setAiLogs([]);
    setAiFitments([]);
    setSelectedAiFitments([]);
    setApplyingAiFitment(false);
  };

  // Helper functions to check data availability
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

  const isAiMethodAvailable = () => {
    return isVcdbDataAvailable() && isProductDataAvailable();
  };

  const handleManualMethodClick = async () => {
    if (!isManualMethodAvailable()) {
      showError("VCDB and Product data are required for manual fitment method");
      return;
    }

    setSelectedMethod("manual");
    setCurrentStep(2);

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

  const handleAiMethodClick = async () => {
    if (!isAiMethodAvailable()) {
      showError("VCDB and Product data are required for AI fitment method");
      return;
    }

    setSelectedMethod("ai");
    setCurrentStep(3);
  };

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
          "No fitments were generated. Please check your VCDB and Product data and try again."
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

  const handleApplyDirectAiFitments = async () => {
    if (selectedAiFitments.length === 0) {
      showError("Please select fitments to apply");
      return;
    }

    setApplyingAiFitment(true);
    try {
      // Get the selected fitments with their dynamic fields
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
          dynamicFields: fitment.dynamicFields || {}, // Include dynamic fields
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
        handleBackToMethodSelection();
      }
    } catch (error) {
      showError("Failed to apply AI fitments");
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
      dynamicFields: fitment.dynamicFields || {}, // Include dynamic fields
    });
    setEditModalOpen(true);
  };

  const handleSaveEdit = async () => {
    if (!editingFitment) return;

    setSavingEdit(true);
    try {
      // Update the fitment in the local state
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

  const handleExportDirectAiFitments = async (
    format: "csv" | "xlsx" | "json"
  ) => {
    try {
      // Export only selected AI fitments if any are selected, otherwise export all AI fitments
      const fitmentIds =
        selectedAiFitments.length > 0 ? selectedAiFitments : undefined;

      const response = await fitmentUploadService.exportAiFitments(
        format,
        "", // No session ID needed for direct export
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

  // Fitment method selection
  const [selectedMethod, setSelectedMethod] = useState<"manual" | "ai" | null>(
    null
  );

  // Manual fitment states (existing logic) - removed unused filters

  // Session dropdown data states
  const [dropdownData, setDropdownData] = useState<any>(null);
  const [loadingDropdownData, setLoadingDropdownData] = useState(false);

  // Manual Method Stepper State
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

  // Wheel parameters state
  const [wheelParameters, setWheelParameters] = useState([
    { tireDiameter: "", wheelDiameter: "", backspacing: "" },
    { tireDiameter: "", wheelDiameter: "", backspacing: "" },
    { tireDiameter: "", wheelDiameter: "", backspacing: "" },
  ]);

  // Lookup data state
  const [lookupData, setLookupData] = useState<any>(null);
  const [applyingManualFitment, setApplyingManualFitment] = useState(false);

  // AI fitment states
  const [aiFitments, setAiFitments] = useState<any[]>([]);
  const [aiProcessing, setAiProcessing] = useState(false);
  const [selectedAiFitments, setSelectedAiFitments] = useState<string[]>([]);
  const [aiProgress, setAiProgress] = useState(0);
  const [aiLogs, setAiLogs] = useState<string[]>([]);
  const [applyingAiFitment, setApplyingAiFitment] = useState(false);

  // Edit fitment states
  const [editingFitment, setEditingFitment] = useState<any>(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState<any>({});
  const [savingEdit, setSavingEdit] = useState(false);

  // Ref for auto-scrolling logs
  const logsScrollAreaRef = useRef<HTMLDivElement>(null);

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

  // Dynamic field handling for edit modal
  const handleDynamicFieldChange = (
    fieldConfig: FieldConfiguration,
    value: any
  ) => {
    setEditFormData((prev: any) => {
      const newDynamicFields = { ...prev.dynamicFields };

      // Find existing field data or create new
      const existingKey = Object.keys(newDynamicFields).find((key) => {
        const fieldData = newDynamicFields[key];
        return fieldData.field_config_id === fieldConfig.id;
      });

      if (existingKey) {
        // Update existing field
        newDynamicFields[existingKey] = {
          ...newDynamicFields[existingKey],
          value: value,
        };
      } else {
        // Create new field entry
        newDynamicFields[String(fieldConfig.id)] = {
          value: value,
          field_name: fieldConfig.name,
          field_config_id: fieldConfig.id,
          field_config_name: fieldConfig.name,
          field_config_display_name: fieldConfig.display_name,
        };
      }

      return {
        ...prev,
        dynamicFields: newDynamicFields,
      };
    });
  };

  // Combine all field configurations for edit modal
  const allFieldConfigs = [
    ...(vcdbFormFields || []),
    ...(productFormFields || []),
  ];

  // Filter field configs that should be shown in the edit modal
  const dynamicFieldConfigs = allFieldConfigs.filter((config) => {
    // Show all enabled field configs that should be shown in forms
    return config.is_enabled && config.show_in_forms;
  });

  // Fallback: Create field configs for dynamic fields that don't have matching field configurations
  const fallbackFieldConfigs = Object.values(editFormData.dynamicFields || {})
    .filter((fieldData: any) => {
      // Check if this field data doesn't have a matching field config
      return !allFieldConfigs.some(
        (config) => config.id === fieldData.field_config_id
      );
    })
    .map((fieldData: any) => ({
      id: fieldData.field_config_id,
      name: fieldData.field_config_name,
      display_name: fieldData.field_config_display_name,
      description: "",
      field_type: "string" as const,
      reference_type: "both" as const,
      requirement_level: "optional" as const,
      is_enabled: true,
      is_unique: false,
      enum_options: [],
      default_value: "",
      display_order: 0,
      show_in_filters: true,
      show_in_forms: true,
      validation_rules: {},
      created_at: "",
      updated_at: "",
    }));

  // Combine field configs with fallback configs
  const allDynamicFieldConfigs = [
    ...dynamicFieldConfigs,
    ...fallbackFieldConfigs,
  ];

  // Render dynamic field based on field configuration
  const renderDynamicField = (fieldConfig: FieldConfiguration) => {
    // Find the dynamic field data for this field config
    const dynamicFieldData = Object.values(
      editFormData.dynamicFields || {}
    ).find(
      (fieldData: any) => fieldData.field_config_id === fieldConfig.id
    ) as any;

    const fieldValue =
      dynamicFieldData?.value || fieldConfig.default_value || "";
    const isRequired = fieldConfig.requirement_level === "required";
    const isDisabled =
      fieldConfig.requirement_level === "disabled" || !fieldConfig.is_enabled;

    const commonProps = {
      label: fieldConfig.display_name,
      placeholder: `Enter ${fieldConfig.display_name.toLowerCase()}`,
      value: fieldValue,
      required: isRequired,
      disabled: isDisabled,
      description: fieldConfig.description,
      styles: {
        label: {
          fontWeight: 600,
          fontSize: "13px",
          color: "#374151",
          marginBottom: "8px",
          textTransform: "uppercase" as const,
          letterSpacing: "0.5px",
        },
        input: {
          borderRadius: "10px",
          border: "2px solid #e2e8f0",
          fontSize: "14px",
          height: "48px",
          paddingLeft: "12px",
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
      },
    };

    const fieldElement = (() => {
      switch (fieldConfig.field_type) {
        case "string":
        case "text":
          return (
            <TextInput
              {...commonProps}
              onChange={(event) =>
                handleDynamicFieldChange(fieldConfig, event.currentTarget.value)
              }
              minLength={fieldConfig.min_length}
              maxLength={fieldConfig.max_length}
            />
          );

        case "number":
        case "decimal":
        case "integer":
          return (
            <NumberInput
              {...commonProps}
              onChange={(value) => handleDynamicFieldChange(fieldConfig, value)}
              min={fieldConfig.min_value}
              max={fieldConfig.max_value}
              decimalScale={fieldConfig.field_type === "decimal" ? 2 : 0}
            />
          );

        case "boolean":
          return (
            <Checkbox
              label={fieldConfig.display_name}
              checked={Boolean(fieldValue)}
              onChange={(event) =>
                handleDynamicFieldChange(
                  fieldConfig,
                  event.currentTarget.checked
                )
              }
              disabled={isDisabled}
              description={fieldConfig.description}
            />
          );

        case "enum":
          return (
            <Select
              {...commonProps}
              onChange={(value) =>
                handleDynamicFieldChange(fieldConfig, value || "")
              }
              data={fieldConfig.enum_options.map((option) => ({
                value: option,
                label: option,
              }))}
              searchable
            />
          );

        case "date":
          return (
            <TextInput
              {...commonProps}
              type="date"
              onChange={(event) =>
                handleDynamicFieldChange(fieldConfig, event.currentTarget.value)
              }
            />
          );

        default:
          return (
            <TextInput
              {...commonProps}
              onChange={(event) =>
                handleDynamicFieldChange(fieldConfig, event.currentTarget.value)
              }
            />
          );
      }
    })();

    // Wrap with tooltip if description exists
    if (fieldConfig.description) {
      return (
        <Tooltip label={fieldConfig.description} position="top-start" multiline>
          <div>{fieldElement}</div>
        </Tooltip>
      );
    }

    return fieldElement;
  };

  // Refresh field configurations when component mounts or session changes
  useEffect(() => {
    // Refresh field configurations to get the latest values
    if (refreshVcdbFields && refreshProductFields) {
      refreshVcdbFields();
      refreshProductFields();
    }
  }, [sessionId, refreshVcdbFields, refreshProductFields]);

  // Auto-scroll logs to bottom when new logs are added
  useEffect(() => {
    if (logsScrollAreaRef.current && aiLogs.length > 0) {
      const scrollArea = logsScrollAreaRef.current.querySelector(
        "[data-radix-scroll-area-viewport]"
      );
      if (scrollArea) {
        scrollArea.scrollTop = scrollArea.scrollHeight;
      }
    }
  }, [aiLogs]);

  // Configurable columns state (removed unused variables)

  // API hooks
  const { execute: fetchDropdownData } = useAsyncOperation();
  const { execute: fetchFilteredVehicles } = useAsyncOperation();
  const { execute: fetchLookupData } = useAsyncOperation();
  const { execute: createFitment } = useAsyncOperation();

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

  return (
    <div
      style={{
        minHeight: "100vh",
      }}
    >
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
        
        @keyframes shimmer {
          0% {
            left: -100%;
          }
          100% {
            left: 100%;
          }
        }
        
        @keyframes progress {
          0% {
            width: 0%;
          }
          50% {
            width: 45%;
          }
          100% {
            width: 0%;
          }
        }
      `}</style>
      <Stack gap="xl">
        {/* Step 1: Method Selection Section */}
        <Transition
          mounted={currentStep === 1}
          transition="slide-left"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
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
                              ? `${
                                  dataStatus?.products?.record_count || 0
                                } records`
                              : "Not available"}
                          </Text>
                        </Group>
                      </Group>
                    </div>

                    <SimpleGrid cols={2} spacing="xl">
                      {/* Manual Method Card */}
                      <Card
                        style={{
                          background:
                            selectedMethod === "manual"
                              ? "#f0f9ff"
                              : !isManualMethodAvailable()
                              ? "#f8f9fa"
                              : "#fefefe",
                          border:
                            selectedMethod === "manual"
                              ? "2px solid #3b82f6"
                              : !isManualMethodAvailable()
                              ? "2px solid #e9ecef"
                              : "2px solid #f1f5f9",
                          borderRadius: "12px",
                          cursor: isManualMethodAvailable()
                            ? "pointer"
                            : "not-allowed",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow:
                            selectedMethod === "manual"
                              ? "0 4px 12px rgba(59, 130, 246, 0.15)"
                              : "0 2px 4px rgba(0, 0, 0, 0.05)",
                          transform: "translateY(0)",
                          opacity: isManualMethodAvailable() ? 1 : 0.6,
                        }}
                        onMouseEnter={(e) => {
                          if (
                            selectedMethod !== "manual" &&
                            isManualMethodAvailable()
                          ) {
                            e.currentTarget.style.transform =
                              "translateY(-4px)";
                            e.currentTarget.style.boxShadow =
                              "0 8px 25px rgba(0, 0, 0, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedMethod !== "manual") {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 4px rgba(0, 0, 0, 0.05)";
                          }
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
                                ? "#f8fafc"
                                : "#f1f3f4",
                              borderRadius: "12px",
                              padding: "16px",
                              marginBottom: "8px",
                            }}
                          >
                            <IconUsers
                              size={32}
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
                              Manual Method
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
                                ? "Apply fitments manually with full control over each configuration"
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

                      {/* AI Method Card */}
                      <Card
                        style={{
                          background:
                            selectedMethod === "ai"
                              ? "#f0f9ff"
                              : !isAiMethodAvailable()
                              ? "#f8f9fa"
                              : "#fefefe",
                          border:
                            selectedMethod === "ai"
                              ? "2px solid #3b82f6"
                              : !isAiMethodAvailable()
                              ? "2px solid #e9ecef"
                              : "2px solid #f1f5f9",
                          borderRadius: "12px",
                          cursor: isAiMethodAvailable()
                            ? "pointer"
                            : "not-allowed",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow:
                            selectedMethod === "ai"
                              ? "0 4px 12px rgba(59, 130, 246, 0.15)"
                              : "0 2px 4px rgba(0, 0, 0, 0.05)",
                          transform: "translateY(0)",
                          opacity: isAiMethodAvailable() ? 1 : 0.6,
                        }}
                        onMouseEnter={(e) => {
                          if (
                            selectedMethod !== "ai" &&
                            isAiMethodAvailable()
                          ) {
                            e.currentTarget.style.transform =
                              "translateY(-4px)";
                            e.currentTarget.style.boxShadow =
                              "0 8px 25px rgba(0, 0, 0, 0.1)";
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedMethod !== "ai") {
                            e.currentTarget.style.transform = "translateY(0)";
                            e.currentTarget.style.boxShadow =
                              "0 2px 4px rgba(0, 0, 0, 0.05)";
                          }
                        }}
                        p="xl"
                        onClick={
                          isAiMethodAvailable()
                            ? handleAiMethodClick
                            : undefined
                        }
                      >
                        <Stack align="center" gap="lg">
                          <div
                            style={{
                              background: isAiMethodAvailable()
                                ? "linear-gradient(135deg, #e0e7ff 0%, #c7d2fe 100%)"
                                : "linear-gradient(135deg, #f3f4f6 0%, #e5e7eb 100%)",
                              borderRadius: "12px",
                              padding: "16px",
                              marginBottom: "8px",
                              position: "relative",
                            }}
                          >
                            <IconBrain
                              size={32}
                              color={
                                isAiMethodAvailable() ? "#6366f1" : "#9ca3af"
                              }
                            />
                            {/* Subtle pulse effect - only when available */}
                            {isAiMethodAvailable() && (
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
                            )}
                          </div>

                          <div style={{ textAlign: "center" }}>
                            <Text
                              fw={700}
                              size="xl"
                              c={isAiMethodAvailable() ? "#1e293b" : "#9ca3af"}
                              mb="xs"
                            >
                              AI Method
                            </Text>
                            <Text
                              size="sm"
                              c={isAiMethodAvailable() ? "#64748b" : "#9ca3af"}
                              ta="center"
                            >
                              {isAiMethodAvailable()
                                ? "Let AI automatically generate and apply fitments based on your VCDB and Product data"
                                : "VCDB and Product data required"}
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
                    </SimpleGrid>

                    {/* Help message when both methods are disabled */}
                    {!isManualMethodAvailable() && !isAiMethodAvailable() && (
                      <Alert color="orange" variant="light" mt="lg">
                        <Text size="sm">
                          <strong>Data Required:</strong> Both VCDB and Product
                          data must be uploaded before you can apply fitments.
                          Please go to the <strong>Upload Data</strong> page to
                          upload your vehicle and product data files.
                        </Text>
                      </Alert>
                    )}
                  </Stack>
                </Card>
              )}
            </div>
          )}
        </Transition>

        {/* Step 2: Manual Method Page */}
        <Transition
          mounted={currentStep === 2}
          transition="slide-up"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
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
                        onClick={handleBackToMethodSelection}
                        style={{
                          color: "#64748b",
                          fontWeight: 500,
                        }}
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
                        label="Specify Vehicle Configurations"
                        description="Specify vehicle criteria"
                        icon={<IconCar size={18} />}
                      >
                        <div>
                          <Stack gap="md" mt={20}>
                            <div style={{ marginBottom: "15px" }}>
                              <Title order={3} c="#1e293b" fw={700}>
                                Vehicle Search Criteria
                              </Title>
                              <Text size="sm" c="#64748b">
                                Refine your search with specific vehicle
                                attributes to find the perfect fitments
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
                              <SimpleGrid
                                cols={{ base: 1, sm: 2, lg: 3 }}
                                spacing="xl"
                              >
                                <Select
                                  label="Year From"
                                  placeholder="Select year from"
                                  data={dropdownData?.years || []}
                                  value={vehicleFilters.yearFrom}
                                  onChange={(value) => {
                                    setVehicleFilters((prev) => {
                                      const newYearFrom = value || "";
                                      // Clear yearTo if it's not greater than the new yearFrom
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
                                <Select
                                  label="Year To"
                                  placeholder="Select year to"
                                  data={
                                    dropdownData?.years
                                      ? dropdownData.years.filter(
                                          (year: string) => {
                                            if (!vehicleFilters.yearFrom)
                                              return true;
                                            return (
                                              parseInt(year) >
                                              parseInt(vehicleFilters.yearFrom)
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
                                  disabled={loadingDropdownData}
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

                              {/* Dynamic VCDB Fields for Vehicle Search */}
                              {vcdbFormFields.length > 0 && (
                                <div style={{ marginTop: "24px" }}>
                                  <Group
                                    justify="space-between"
                                    align="center"
                                    mb="md"
                                  >
                                    <div>
                                      <Title
                                        order={4}
                                        c="#1e293b"
                                        fw={600}
                                        mb="xs"
                                      >
                                        Additional Vehicle Search Fields
                                      </Title>
                                      <Text size="sm" c="#64748b">
                                        Additional vehicle fields configured in
                                        Settings for more precise filtering
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
                                      styles={{
                                        root: {
                                          borderRadius: "8px",
                                          fontSize: "12px",
                                          height: "32px",
                                          padding: "0 12px",
                                        },
                                      }}
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
                                        fieldConfig.reference_type ===
                                          "vcdb" && (
                                          <DynamicFormField
                                            key={`search-${fieldConfig.id}`}
                                            fieldConfig={fieldConfig}
                                            value={
                                              dynamicVcdbFields[
                                                fieldConfig.name
                                              ]
                                            }
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
                                  console.log("Clearing filters...");

                                  // Clear all vehicle filters
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

                                  // Clear vehicle selection results
                                  setFilteredVehicles([]);
                                  setSelectedVehicles([]);

                                  // Clear fitment details
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

                                  // Clear wheel parameters
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

                                  // Clear dynamic fields
                                  setDynamicVcdbFields({});
                                  setDynamicProductFields({});

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
                                onClick={async () => {
                                  // Validate required fields
                                  if (
                                    !vehicleFilters.yearFrom ||
                                    !vehicleFilters.yearTo
                                  ) {
                                    showError(
                                      "Please select both 'Year From' and 'Year To' before searching for vehicles."
                                    );
                                    return;
                                  }

                                  // Validate year range
                                  const yearFrom = parseInt(
                                    vehicleFilters.yearFrom
                                  );
                                  const yearTo = parseInt(
                                    vehicleFilters.yearTo
                                  );

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

                                    const result: any =
                                      await fetchFilteredVehicles(() =>
                                        fitmentUploadService.getFilteredVehicles(
                                          sessionId || "",
                                          searchCriteria
                                        )
                                      );

                                    if (
                                      result &&
                                      result.data &&
                                      result.data.vehicles
                                    ) {
                                      if (result.data.vehicles.length === 0) {
                                        showError(
                                          "No vehicles found matching your criteria. Please adjust your search filters and try again."
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
                                    console.error(
                                      "Vehicle search error:",
                                      error
                                    );
                                    showError("Failed to search vehicles");
                                  }
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
                                    <Group gap={40}>
                                      <Checkbox
                                        checked={selectedVehicles.includes(
                                          vehicle.id
                                        )}
                                        onChange={() => {}}
                                      />
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
                              {/* Core Fitment Fields */}
                              <div style={{ marginBottom: "32px" }}>
                                <Text fw={600} size="md" c="#1e293b" mb="md">
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
                              </div>

                              {/* Optional Configuration Fields */}
                              <div style={{ marginBottom: "32px" }}>
                                <Text fw={600} size="md" c="#1e293b" mb="md">
                                  Optional Configuration
                                </Text>
                                <SimpleGrid
                                  cols={{ base: 1, sm: 2, lg: 3 }}
                                  spacing="lg"
                                >
                                  <Select
                                    label="Lift Height"
                                    placeholder="Select lift height"
                                    data={
                                      lookupData?.lift_heights?.map(
                                        (item: any) => ({
                                          value: item.value,
                                          label: item.value,
                                        })
                                      ) || []
                                    }
                                    value={fitmentDetails.liftHeight}
                                    onChange={(value) =>
                                      setFitmentDetails((prev) => ({
                                        ...prev,
                                        liftHeight: value || "",
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
                                    label="Wheel Type"
                                    placeholder="Select wheel type"
                                    data={
                                      lookupData?.wheel_types?.map(
                                        (item: any) => ({
                                          value: item.value,
                                          label: item.value,
                                        })
                                      ) || []
                                    }
                                    value={fitmentDetails.wheelType}
                                    onChange={(value) =>
                                      setFitmentDetails((prev) => ({
                                        ...prev,
                                        wheelType: value || "",
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
                              </div>

                              {/* Fitment Details Section */}
                              <div style={{ marginBottom: "32px" }}>
                                <Text fw={600} size="md" c="#1e293b" mb="md">
                                  Fitment Details
                                </Text>
                                <Stack gap="lg">
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
                                </Stack>
                              </div>

                              {/* Dynamic Product Fields */}
                              {productFormFields.length > 0 && (
                                <div style={{ marginTop: "24px" }}>
                                  <Group
                                    justify="space-between"
                                    align="center"
                                    mb="md"
                                  >
                                    <div>
                                      <Title
                                        order={4}
                                        c="#1e293b"
                                        fw={600}
                                        mb="xs"
                                      >
                                        Product Configuration Fields
                                      </Title>
                                      <Text size="sm" c="#64748b">
                                        Additional product configuration fields
                                        configured in Settings
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
                                      styles={{
                                        root: {
                                          borderRadius: "8px",
                                          fontSize: "12px",
                                          height: "32px",
                                          padding: "0 12px",
                                        },
                                      }}
                                    >
                                      Refresh Fields
                                    </Button>
                                  </Group>

                                  <SimpleGrid
                                    cols={{ base: 1, sm: 2 }}
                                    spacing="lg"
                                  >
                                    {productFormFields.map((fieldConfig) => {
                                      return (
                                        fieldConfig.show_in_forms &&
                                        fieldConfig.is_enabled &&
                                        fieldConfig.reference_type ===
                                          "product" && (
                                          <DynamicFormField
                                            key={fieldConfig.id}
                                            fieldConfig={fieldConfig}
                                            value={
                                              dynamicProductFields[
                                                fieldConfig.name
                                              ]
                                            }
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

                              {/* Wheel Parameters Section */}
                              <div style={{ marginTop: "24px" }}>
                                <Title order={4} c="#1e293b" fw={600} mb="md">
                                  Wheel Parameters
                                </Title>
                                <Text size="sm" c="#64748b" mb="lg">
                                  Configure tire diameter, wheel diameter, and
                                  backspacing for each wheel position
                                </Text>

                                <SimpleGrid cols={3} spacing="lg">
                                  {wheelParameters.map((param, index) => (
                                    <Card
                                      key={index}
                                      withBorder
                                      p="md"
                                      style={{ backgroundColor: "#f8fafc" }}
                                    >
                                      <Stack gap="sm">
                                        <Text size="sm" fw={600} c="#374151">
                                          Position {index + 1}
                                        </Text>

                                        <Select
                                          label="Tire Diameter"
                                          placeholder="Select diameter"
                                          data={
                                            lookupData?.tire_diameters?.map(
                                              (item: any) => ({
                                                value: item.value,
                                                label: item.value,
                                              })
                                            ) || []
                                          }
                                          value={param.tireDiameter}
                                          onChange={(value) => {
                                            const newParams = [
                                              ...wheelParameters,
                                            ];
                                            newParams[index].tireDiameter =
                                              value || "";
                                            setWheelParameters(newParams);
                                          }}
                                          searchable
                                          disabled={loadingDropdownData}
                                          size="sm"
                                        />

                                        <Select
                                          label="Wheel Diameter"
                                          placeholder="Select diameter"
                                          data={
                                            lookupData?.wheel_diameters?.map(
                                              (item: any) => ({
                                                value: item.value,
                                                label: item.value,
                                              })
                                            ) || []
                                          }
                                          value={param.wheelDiameter}
                                          onChange={(value) => {
                                            const newParams = [
                                              ...wheelParameters,
                                            ];
                                            newParams[index].wheelDiameter =
                                              value || "";
                                            setWheelParameters(newParams);
                                          }}
                                          searchable
                                          disabled={loadingDropdownData}
                                          size="sm"
                                        />

                                        <Select
                                          label="Backspacing"
                                          placeholder="Select backspacing"
                                          data={
                                            lookupData?.backspacing?.map(
                                              (item: any) => ({
                                                value: item.value,
                                                label: item.value,
                                              })
                                            ) || []
                                          }
                                          value={param.backspacing}
                                          onChange={(value) => {
                                            const newParams = [
                                              ...wheelParameters,
                                            ];
                                            newParams[index].backspacing =
                                              value || "";
                                            setWheelParameters(newParams);
                                          }}
                                          searchable
                                          disabled={loadingDropdownData}
                                          size="sm"
                                        />
                                      </Stack>
                                    </Card>
                                  ))}
                                </SimpleGrid>
                              </div>
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

                                  // Validate required dynamic fields
                                  const requiredVcdbFields =
                                    vcdbFormFields.filter(
                                      (field) =>
                                        field.requirement_level ===
                                          "required" &&
                                        field.is_enabled &&
                                        field.show_in_filters
                                    );

                                  const requiredProductFields =
                                    productFormFields.filter(
                                      (field) =>
                                        field.requirement_level ===
                                          "required" &&
                                        field.is_enabled &&
                                        field.show_in_forms
                                    );

                                  for (const field of requiredVcdbFields) {
                                    if (!dynamicVcdbFields[field.name]) {
                                      showError(
                                        `Please fill in the required field: ${field.display_name}`
                                      );
                                      return;
                                    }
                                  }

                                  for (const field of requiredProductFields) {
                                    if (!dynamicProductFields[field.name]) {
                                      showError(
                                        `Please fill in the required field: ${field.display_name}`
                                      );
                                      return;
                                    }
                                  }

                                  if (selectedVehicles.length === 0) {
                                    showError(
                                      "Please select at least one vehicle"
                                    );
                                    return;
                                  }

                                  setApplyingManualFitment(true);
                                  try {
                                    // Create fitments for each selected vehicle
                                    const fitmentsData = selectedVehicles.map(
                                      (vehicleId) => {
                                        const vehicle = filteredVehicles.find(
                                          (v) => v.id === vehicleId
                                        );
                                        return {
                                          partId: fitmentDetails.partId,
                                          title: fitmentDetails.title,
                                          description:
                                            fitmentDetails.description,
                                          notes: fitmentDetails.notes,
                                          quantity: fitmentDetails.quantity,
                                          position: fitmentDetails.position,
                                          liftHeight: fitmentDetails.liftHeight,
                                          wheelType: fitmentDetails.wheelType,
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
                                          partTypeDescriptor:
                                            fitmentDetails.title,
                                          positionId: 0,
                                          // Dynamic VCDB fields
                                          ...dynamicVcdbFields,
                                          // Dynamic Product fields
                                          ...dynamicProductFields,
                                        };
                                      }
                                    );

                                    const result: any = await createFitment(
                                      () =>
                                        dataUploadService.createFitment(
                                          fitmentsData
                                        )
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
                                    console.error(
                                      "Create fitment error:",
                                      error
                                    );
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
              )}
            </div>
          )}
        </Transition>

        {/* Step 3: AI Method Page */}
        <Transition
          mounted={currentStep === 3}
          transition="fade"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
              {currentStep === 3 &&
                !aiProcessing &&
                aiFitments.length === 0 && (
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
                        <Title order={2} c="#1e293b" fw={600}>
                          AI Fitment Generation
                        </Title>
                        <Text size="sm" c="#64748b" mb="lg">
                          Let our AI automatically generate optimal fitments
                          based on your VCDB and Product data
                        </Text>

                        {/* Generate Fitment Button */}
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
                              transition:
                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
                      </div>
                    </Stack>
                  </Card>
                )}

              {/* AI Progress Display */}
              {currentStep === 3 && aiProcessing && (
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
                    {/* Back Button at the top */}
                    <Group>
                      <Button
                        variant="subtle"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => {
                          // Reset AI states but stay on AI method
                          setAiProcessing(false);
                          setAiProgress(0);
                          setAiLogs([]);
                          setAiFitments([]);
                          setSelectedAiFitments([]);
                          setApplyingAiFitment(false);
                        }}
                        style={{
                          color: "#64748b",
                          fontWeight: 500,
                        }}
                      >
                        Back
                      </Button>
                    </Group>

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

                    <ScrollArea h={600} ref={logsScrollAreaRef}>
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
              {currentStep === 3 && aiFitments.length > 0 && (
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
                    {/* Back Button at the top */}
                    <Group>
                      <Button
                        variant="subtle"
                        leftSection={<IconArrowLeft size={16} />}
                        onClick={() => {
                          // Reset AI states but stay on AI method
                          setAiProcessing(false);
                          setAiProgress(0);
                          setAiLogs([]);
                          setAiFitments([]);
                          setSelectedAiFitments([]);
                          setApplyingAiFitment(false);
                        }}
                        style={{
                          color: "#64748b",
                          fontWeight: 500,
                        }}
                      >
                        Back
                      </Button>
                    </Group>

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
                            onClick={() => handleExportDirectAiFitments("csv")}
                          >
                            CSV
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportDirectAiFitments("xlsx")}
                          >
                            XLSX
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleExportDirectAiFitments("json")}
                          >
                            JSON
                          </Button>
                        </Group>
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
                            <Table.Th style={{ width: "130px" }}>
                              Part ID
                            </Table.Th>
                            <Table.Th style={{ width: "80px" }}>Year</Table.Th>
                            <Table.Th style={{ width: "100px" }}>Make</Table.Th>
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
                                      {Math.round(fitment.confidence * 100)}%
                                    </Badge>
                                  </Tooltip>
                                </Table.Td>
                                <Table.Td style={{ width: "80px" }}>
                                  <ActionIcon
                                    variant="subtle"
                                    color="blue"
                                    onClick={() => handleEditFitment(fitment)}
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
        </Transition>

        {/* AI Progress Display (legacy - only show when NOT using new steps)
        {/* {currentStep !== 4 && selectedMethod === "ai" && aiProcessing && (
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
        )} */}

        {/* AI Fitments Results */}
        {/* {selectedMethod === "ai" && aiFitments.length > 0 && (
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
        )} */}

        {/* <div style={{ position: "relative" }}> */}
        {/* Static Table Header */}
        {/* <Table striped highlightOnHover>
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
          </Table> */}

        {/* Scrollable Table Body */}
        {/* <ScrollArea h={600} style={{ marginTop: "-1px" }}>
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
          </ScrollArea> */}
        {/* </div> */}

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

                <Textarea
                  label="Part Description"
                  placeholder="Enter part description"
                  value={editFormData.part_description || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      part_description: e.target.value,
                    })
                  }
                  rows={3}
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

                <Textarea
                  label="Confidence Explanation"
                  placeholder="Enter confidence explanation"
                  value={editFormData.confidence_explanation || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      confidence_explanation: e.target.value,
                    })
                  }
                  rows={3}
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

                <Textarea
                  label="AI Reasoning"
                  placeholder="Enter AI reasoning"
                  value={editFormData.ai_reasoning || ""}
                  onChange={(e) =>
                    setEditFormData({
                      ...editFormData,
                      ai_reasoning: e.target.value,
                    })
                  }
                  rows={4}
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

            {/* Dynamic Fields Section */}
            {allDynamicFieldConfigs.length > 0 ? (
              <div>
                <Divider
                  label={
                    <Group gap="sm">
                      <Text fw={600} size="lg" c="#1e293b">
                        Dynamic Fields
                      </Text>
                      <Tooltip label="Fields configured based on VCDB and Product field configurations">
                        <IconFileText size={16} color="#64748b" />
                      </Tooltip>
                    </Group>
                  }
                  labelPosition="center"
                  my="lg"
                  styles={{
                    label: {
                      padding: "0 16px",
                    },
                  }}
                />
                <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="lg">
                  {allDynamicFieldConfigs.map((fieldConfig) => (
                    <div key={fieldConfig.id}>
                      {renderDynamicField(fieldConfig)}
                    </div>
                  ))}
                </SimpleGrid>
              </div>
            ) : (
              <div>
                <Divider
                  label={
                    <Group gap="sm">
                      <Text fw={600} size="lg" c="#1e293b">
                        Dynamic Fields
                      </Text>
                      <Tooltip label="Fields configured based on VCDB and Product field configurations">
                        <IconFileText size={16} color="#64748b" />
                      </Tooltip>
                    </Group>
                  }
                  labelPosition="center"
                  my="lg"
                  styles={{
                    label: {
                      padding: "0 16px",
                    },
                  }}
                />
                <Alert color="blue" variant="light" mt="md">
                  <Text size="sm">
                    <strong>No Dynamic Fields Available:</strong> No field
                    configurations have been set up yet. Go to{" "}
                    <strong>Settings</strong> to configure additional fields for
                    VCDB and Product data.
                  </Text>
                </Alert>
              </div>
            )}

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
      </Stack>
    </div>
  );
}
