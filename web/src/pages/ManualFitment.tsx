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
} from "@mantine/core";
import {
  IconFileText,
  IconAlertCircle,
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
  partsService,
  fitmentUploadService,
  dataUploadService,
} from "../api/services";
import { useApi, useAsyncOperation } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

export default function ApplyFitments() {
  // Professional toast hook
  const { showSuccess, showError } = useProfessionalToast();

  // Manual fitment specific states

  // Manual fitment states (existing logic) - keeping for year range

  // Uploaded data states
  const [uploadedSessions, setUploadedSessions] = useState<any[]>([]);
  const [selectedSession, setSelectedSession] = useState<string | null>(null);
  const [uploadedVehicles, setUploadedVehicles] = useState<any[]>([]);
  const [uploadedProducts, setUploadedProducts] = useState<any[]>([]);
  const [loadingSessionData, setLoadingSessionData] = useState(false);
  const loadingRef = useRef(false);

  // Manual fitment specific states

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

  // API hooks
  // Removed yearRange API call as we're using uploaded vehicles
  // Removed parts API call as we're using uploaded products
  const { data: partTypes, loading: partTypesLoading } = useApi(
    () => partsService.getPartTypes(),
    []
  ) as any;
  // Removed configurationsData as we're using uploaded vehicles

  // Uploaded data API hooks
  const { data: sessionsData, loading: sessionsLoading } = useApi(
    () => dataUploadService.getSessions(),
    []
  ) as any;
  const { execute: applyFitment } = useAsyncOperation();

  // Update year range when data loads (if needed for future use)
  // useEffect(() => {
  //   if (yearRange) {
  //     // Could be used for setting default year ranges
  //   }
  // }, [yearRange]);

  // Load uploaded sessions
  useEffect(() => {
    if (sessionsData && Array.isArray(sessionsData)) {
      console.log("Sessions data loaded:", sessionsData);
      setUploadedSessions(sessionsData);
      // Auto-select the most recent session if available and no session is currently selected
      if (sessionsData.length > 0 && !selectedSession) {
        const mostRecent = sessionsData[0];
        console.log("Auto-selecting session:", mostRecent.id);
        setSelectedSession(mostRecent.id);
      }
    }
  }, [sessionsData]); // Removed selectedSession from dependencies to prevent loops

  // Load session data when session is selected
  useEffect(() => {
    if (selectedSession && !loadingRef.current) {
      console.log("Loading session data for:", selectedSession);
      loadingRef.current = true;
      setLoadingSessionData(true);

      const loadData = async () => {
        try {
          console.log("Making API calls for session:", selectedSession);
          const [vehiclesResponse, productsResponse] = await Promise.all([
            dataUploadService.getFileData(selectedSession, "vcdb"),
            dataUploadService.getFileData(selectedSession, "products"),
          ]);

          const result = {
            vehicles: vehiclesResponse?.data || [],
            products: productsResponse?.data || [],
          };

          console.log("Session data loaded:", result);
          setUploadedVehicles(result.vehicles?.data);
          setUploadedProducts(result.products?.data);
        } catch (error) {
          console.error("Failed to load session data:", error);
          showError("Failed to load uploaded data");
        } finally {
          setLoadingSessionData(false);
          loadingRef.current = false;
        }
      };

      loadData();
    }

    // Cleanup function to reset loading state when session changes
    return () => {
      loadingRef.current = false;
    };
  }, [selectedSession]); // Removed showError from dependencies to prevent unnecessary re-runs

  // Manual fitment functions

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

                            {/* Session Selector */}
                            <Card
                              withBorder
                              radius="md"
                              p="md"
                              style={{ backgroundColor: "#f8fafc" }}
                            >
                              <Stack gap="sm">
                                <Group gap="sm">
                                  <IconDatabase size={20} color="#3b82f6" />
                                  <Text fw={600} size="sm" c="#1e293b">
                                    Data Source
                                  </Text>
                                </Group>
                                <Select
                                  label="Select Upload Session"
                                  placeholder={
                                    sessionsLoading || loadingSessionData
                                      ? "Loading sessions..."
                                      : uploadedSessions.length === 0
                                      ? "No uploaded data available"
                                      : "Select a session"
                                  }
                                  data={uploadedSessions.map(
                                    (session: any) => ({
                                      value: session.id,
                                      label: `${
                                        session.name || `Session ${session.id}`
                                      } - ${new Date(
                                        session.created_at
                                      ).toLocaleDateString()}`,
                                    })
                                  )}
                                  value={selectedSession}
                                  onChange={(value) =>
                                    setSelectedSession(value)
                                  }
                                  disabled={
                                    sessionsLoading ||
                                    loadingSessionData ||
                                    uploadedSessions.length === 0
                                  }
                                  leftSection={
                                    <IconDatabase size={16} color="#64748b" />
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
                                {selectedSession && (
                                  <Group gap="sm">
                                    <Badge
                                      color="blue"
                                      variant="light"
                                      size="sm"
                                    >
                                      {loadingSessionData
                                        ? "Loading..."
                                        : `${uploadedVehicles.length} Vehicles`}
                                    </Badge>
                                    <Badge
                                      color="green"
                                      variant="light"
                                      size="sm"
                                    >
                                      {loadingSessionData
                                        ? "Loading..."
                                        : `${uploadedProducts.length} Products`}
                                    </Badge>
                                  </Group>
                                )}
                              </Stack>
                            </Card>

                            {/* Warning if no data available */}
                            {uploadedSessions.length === 0 && (
                              <Alert
                                icon={<IconAlertCircle size={16} />}
                                title="No Uploaded Data Available"
                                color="orange"
                                variant="light"
                                radius="md"
                              >
                                <Text size="sm">
                                  Please upload VCDB and Products files in the{" "}
                                  <strong>Upload Data</strong> section first
                                  before using manual fitment.
                                </Text>
                              </Alert>
                            )}

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
                                  // Search using uploaded vehicles instead of VCDB service
                                  if (
                                    !selectedSession ||
                                    uploadedVehicles.length === 0
                                  ) {
                                    showError(
                                      "No uploaded vehicle data available. Please upload data first."
                                    );
                                    return;
                                  }

                                  const filtered = uploadedVehicles.filter(
                                    (vehicle: any) => {
                                      const matchesYear =
                                        (!vehicleFilters.yearFrom ||
                                          vehicle.year >=
                                            parseInt(
                                              vehicleFilters.yearFrom
                                            )) &&
                                        (!vehicleFilters.yearTo ||
                                          vehicle.year <=
                                            parseInt(vehicleFilters.yearTo));
                                      const matchesMake =
                                        !vehicleFilters.make ||
                                        vehicle.make
                                          .toLowerCase()
                                          .includes(
                                            vehicleFilters.make.toLowerCase()
                                          );
                                      const matchesModel =
                                        !vehicleFilters.model ||
                                        vehicle.model
                                          .toLowerCase()
                                          .includes(
                                            vehicleFilters.model.toLowerCase()
                                          );
                                      const matchesSubmodel =
                                        !vehicleFilters.submodel ||
                                        vehicle.submodel
                                          .toLowerCase()
                                          .includes(
                                            vehicleFilters.submodel.toLowerCase()
                                          );
                                      const matchesFuelType =
                                        !vehicleFilters.fuelType ||
                                        vehicle.fuelType ===
                                          vehicleFilters.fuelType;
                                      const matchesDoors =
                                        !vehicleFilters.numDoors ||
                                        vehicle.numDoors?.toString() ===
                                          vehicleFilters.numDoors;
                                      const matchesDriveType =
                                        !vehicleFilters.driveType ||
                                        vehicle.driveType ===
                                          vehicleFilters.driveType;
                                      const matchesBodyType =
                                        !vehicleFilters.bodyType ||
                                        vehicle.bodyType ===
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
                                    }
                                  );

                                  setFilteredVehicles(filtered);
                                  setManualStep(2);
                                  showSuccess(
                                    `Found ${filtered.length} vehicles matching your criteria`
                                  );
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
                                    uploadedProducts.length === 0
                                      ? "No uploaded products available"
                                      : "Select a part"
                                  }
                                  data={
                                    uploadedProducts &&
                                    Array.isArray(uploadedProducts)
                                      ? uploadedProducts.map((part: any) => ({
                                          value: part.id || part.part_id || "",
                                          label: `${
                                            part.id || part.part_id || "Unknown"
                                          } - ${
                                            part.description ||
                                            part.name ||
                                            "No description"
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
                                  disabled={uploadedProducts.length === 0}
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
                                onClick={async () => {
                                  if (!selectedSession) {
                                    showError(
                                      "Please select an upload session first"
                                    );
                                    return;
                                  }

                                  setApplyingManualFitment(true);
                                  try {
                                    const result = await applyFitment(() =>
                                      fitmentUploadService.applyManualFitment({
                                        sessionId: selectedSession,
                                        vehicleIds: selectedVehicles,
                                        partId: fitmentDetails.partId,
                                        position: fitmentDetails.position,
                                        quantity: fitmentDetails.quantity,
                                        title: fitmentDetails.title,
                                        description: fitmentDetails.description,
                                        notes: fitmentDetails.notes,
                                      })
                                    );

                                    if (result) {
                                      showSuccess(
                                        `Successfully applied fitment to ${selectedVehicles.length} vehicles`
                                      );
                                      // Reset form
                                      setFitmentDetails({
                                        partId: "",
                                        partType: "",
                                        position: "",
                                        quantity: 1,
                                        title: "",
                                        description: "",
                                        notes: "",
                                      });
                                      setSelectedVehicles([]);
                                      setFilteredVehicles([]);
                                      setManualStep(1);
                                    }
                                  } catch (error) {
                                    showError("Failed to apply manual fitment");
                                  } finally {
                                    setApplyingManualFitment(false);
                                  }
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
