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
  Transition,
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
} from "@tabler/icons-react";
import { dataUploadService, fitmentUploadService } from "../api/services";
import { useAsyncOperation, useApi } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

export default function ApplyFitments() {
  // Professional toast hook
  const { showSuccess, showError } = useProfessionalToast();

  // Session state
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Get latest session on component mount
  const { data: sessionsData } = useApi(
    () => dataUploadService.getSessions(),
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

  // Step management for UI flow
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3>(1); // 1 = Choose Method, 2 = Manual Method, 3 = AI Method (disabled)

  // Navigation handlers
  const handleBackToMethodSelection = () => {
    setCurrentStep(1);
    setSelectedMethod(null);
  };

  const handleManualMethodClick = async () => {
    setSelectedMethod("manual");
    setCurrentStep(2);

    // Fetch dropdown data from VCDBData and ProductData tables
    setLoadingDropdownData(true);
    try {
      const [dropdownResult, lookupResult] = await Promise.all([
        fetchDropdownData(() => dataUploadService.getNewDataDropdownData()),
        fetchLookupData(() => dataUploadService.getLookupData()),
      ]);

      if (dropdownResult && dropdownResult.data) {
        setDropdownData(dropdownResult.data);

        // Set available columns based on VCDB data structure
        const vcdbColumns = [
          "year",
          "make",
          "model",
          "submodel",
          "fuelType",
          "bodyType",
          "driveType",
          "numDoors",
          "engineType",
          "transmission",
          "trimLevel",
        ];
        setAvailableColumns(vcdbColumns);
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

  // const handleAiMethodClick = () => {
  //   // AI method is disabled - show coming soon message
  //   showError("AI Method is coming soon! Please use Manual Method for now.");
  // };

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

  // Configurable columns state
  const [showColumnConfig, setShowColumnConfig] = useState(false);
  const [availableColumns, setAvailableColumns] = useState<string[]>([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([
    "year",
    "make",
    "model",
    "submodel",
    "fuelType",
    "bodyType",
    "driveType",
  ]);

  // API hooks
  const { execute: fetchDropdownData } = useAsyncOperation();
  const { execute: fetchFilteredVehicles } = useAsyncOperation();
  const { execute: fetchLookupData } = useAsyncOperation();
  const { execute: createFitment } = useAsyncOperation();

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
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow:
                            selectedMethod === "manual"
                              ? "0 4px 12px rgba(59, 130, 246, 0.15)"
                              : "0 2px 4px rgba(0, 0, 0, 0.05)",
                          transform: "translateY(0)",
                        }}
                        onMouseEnter={(e) => {
                          if (selectedMethod !== "manual") {
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
                              Apply fitments manually with full control over
                              each configuration
                            </Text>
                          </div>

                          {selectedMethod === "manual" && (
                            <Badge variant="light" color="blue" size="lg">
                              Selected
                            </Badge>
                          )}
                        </Stack>
                      </Card>

                      {/* AI Method Card - Coming Soon */}
                      <Card
                        aria-disabled={true}
                        style={{
                          background:
                            "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                          border: "2px solid #e2e8f0",
                          borderRadius: "12px",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.05)",
                          transform: "translateY(0)",
                          position: "relative",
                          opacity: 0.85,
                        }}
                        p="xl"
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
                            <Text fw={700} size="xl" c="#374151" mb="xs">
                              AI Method
                            </Text>
                            <Text size="sm" c="#6b7280" ta="center">
                              Let AI automatically generate and apply fitments
                              based on your data
                            </Text>
                          </div>

                          <div style={{ position: "relative" }}>
                            <Badge
                              variant="gradient"
                              gradient={{ from: "indigo", to: "violet" }}
                              size="lg"
                              style={{
                                fontWeight: 600,
                                letterSpacing: "0.5px",
                                textTransform: "uppercase",
                                fontSize: "11px",
                              }}
                            >
                              Coming Soon
                            </Badge>
                            {/* Subtle shimmer effect */}
                            <div
                              style={{
                                position: "absolute",
                                top: 0,
                                left: "-100%",
                                width: "100%",
                                height: "100%",
                                background:
                                  "linear-gradient(90deg, transparent, rgba(255,255,255,0.4), transparent)",
                                animation: "shimmer 3s infinite",
                              }}
                            />
                          </div>
                        </Stack>
                      </Card>
                    </SimpleGrid>
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
                                  onChange={(value) =>
                                    setVehicleFilters((prev) => ({
                                      ...prev,
                                      yearFrom: value || "",
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
                                  label="Year To"
                                  placeholder="Select year to"
                                  data={dropdownData?.years || []}
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

                                  // Reset to first step
                                  setManualStep(1);

                                  // Reset column configuration
                                  setShowColumnConfig(false);
                                  setSelectedColumns([
                                    "year",
                                    "make",
                                    "model",
                                    "submodel",
                                    "fuelType",
                                    "bodyType",
                                    "driveType",
                                  ]);

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
                                  try {
                                    const result: any =
                                      await fetchFilteredVehicles(() =>
                                        fitmentUploadService.getFilteredVehicles(
                                          sessionId || "",
                                          vehicleFilters
                                        )
                                      );

                                    if (
                                      result &&
                                      result.data &&
                                      result.data.vehicles
                                    ) {
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
                              <SimpleGrid
                                cols={{ base: 1, sm: 2 }}
                                spacing="xl"
                              >
                                <Select
                                  label="Part"
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

                            {/* Configurable Columns Section */}
                            <div>
                              <Group
                                justify="space-between"
                                align="center"
                                mb="md"
                              >
                                <div>
                                  <Title order={4} c="#1e293b" fw={600} mb="xs">
                                    Configurable Columns
                                  </Title>
                                  <Text size="sm" c="#64748b">
                                    Select which vehicle attributes to include
                                    in the fitment
                                  </Text>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() =>
                                    setShowColumnConfig(!showColumnConfig)
                                  }
                                  leftSection={<IconSettings size={16} />}
                                >
                                  {showColumnConfig ? "Hide" : "Configure"}
                                </Button>
                              </Group>

                              {showColumnConfig && (
                                <Card
                                  withBorder
                                  p="md"
                                  style={{
                                    backgroundColor: "#f8fafc",
                                    border: "1px solid #e2e8f0",
                                  }}
                                >
                                  <Stack gap="sm">
                                    <Text size="sm" fw={500} c="#374151">
                                      Select columns to display:
                                    </Text>
                                    <SimpleGrid cols={4} spacing="sm">
                                      {availableColumns.map((column) => (
                                        <Checkbox
                                          key={column}
                                          label={
                                            column.charAt(0).toUpperCase() +
                                            column.slice(1)
                                          }
                                          checked={selectedColumns.includes(
                                            column
                                          )}
                                          onChange={(event) => {
                                            if (event.currentTarget.checked) {
                                              setSelectedColumns((prev) => [
                                                ...prev,
                                                column,
                                              ]);
                                            } else {
                                              setSelectedColumns((prev) =>
                                                prev.filter(
                                                  (col) => col !== column
                                                )
                                              );
                                            }
                                          }}
                                          size="sm"
                                        />
                                      ))}
                                    </SimpleGrid>
                                  </Stack>
                                </Card>
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
                                leftSection={<IconSettings size={16} />}
                                onClick={async () => {
                                  if (!sessionId) {
                                    showError("Session not found");
                                    return;
                                  }

                                  if (!fitmentDetails.partId) {
                                    showError("Please select a part");
                                    return;
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

        {/* Step 3: AI Method Page - Disabled */}
        <Transition
          mounted={currentStep === 3}
          transition="fade"
          duration={400}
          timingFunction="ease"
        >
          {(styles) => (
            <div style={styles}>
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
                      <Title order={2} c="#1e293b" fw={600}>
                        AI Fitment Generation
                      </Title>
                      <Text size="sm" c="#64748b">
                        Let our AI automatically generate optimal fitments based
                        on your data
                      </Text>
                    </div>

                    {/* Generate AI Fitments Button */}
                    {/* {!aiProcessing && aiFitments.length === 0 && (
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
                    )} */}
                  </Stack>
                </Card>
              )}

              {/* AI Progress Display (only show on step 4) */}
              {/*{currentStep === 4 && aiProcessing && (
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
              )} */}
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
      </Stack>
    </div>
  );
}
