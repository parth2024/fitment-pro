import { useState } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Alert,
  Paper,
  Divider,
  Box,
} from "@mantine/core";
import {
  IconCar,
  IconSettings,
  IconDatabase,
  IconAlertCircle,
} from "@tabler/icons-react";
import DynamicFieldFilter from "../components/DynamicFieldFilter";
import DynamicFieldForm from "../components/DynamicFieldForm";
import {
  useFormWithFieldValidation,
  useFilterWithFieldConfiguration,
} from "../hooks/useFieldConfiguration";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

/**
 * Example integration showing how to use dynamic field configuration
 * in the ManualFitment page for vehicle filtering and fitment details
 */
export default function ManualFitmentWithDynamicFields() {
  const { showSuccess, showError } = useProfessionalToast();

  // Vehicle filter using dynamic field configuration
  const {
    activeFilters,
    hasActiveFilters,
    loading: filterLoading,
    updateFilters,
    clearFilters,
  } = useFilterWithFieldConfiguration("vcdb", (filters) => {
    console.log("Vehicle filters changed:", filters);
    // Apply filters to vehicle data
    applyVehicleFilters(filters);
  });

  // Fitment details form using dynamic field configuration
  const {
    formData: fitmentData,
    loading: fitmentLoading,
    validateFormData,
  } = useFormWithFieldValidation("product", {
    partId: "",
    partType: "",
    position: "Front",
    quantity: 1,
  });

  // State for demonstration
  const [filteredVehicles, setFilteredVehicles] = useState<any[]>([]);
  const [selectedVehicles, setSelectedVehicles] = useState<string[]>([]);
  const [processing, setProcessing] = useState(false);

  // Apply vehicle filters (mock implementation)
  const applyVehicleFilters = async (filters: Record<string, any>) => {
    try {
      setProcessing(true);

      // In a real implementation, this would call the API with the filters
      console.log("Applying filters:", filters);

      // Mock filtered results
      const mockVehicles = [
        { id: "1", year: 2020, make: "Toyota", model: "RAV4", submodel: "XLE" },
        { id: "2", year: 2021, make: "Honda", model: "Civic", submodel: "Si" },
        { id: "3", year: 2022, make: "Ford", model: "F-150", submodel: "XLT" },
      ];

      setFilteredVehicles(mockVehicles);

      if (hasActiveFilters) {
        showSuccess(
          `${mockVehicles.length} vehicles found matching your filters`
        );
      }
    } catch (error) {
      showError("Failed to apply vehicle filters");
      console.error("Filter error:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Handle fitment form submission
  const handleFitmentSubmit = async (values: Record<string, any>) => {
    try {
      setProcessing(true);

      // Validate the form data
      const isValid = await validateFormData();
      if (!isValid) {
        showError("Please fix validation errors before submitting");
        return;
      }

      // In a real implementation, this would save the fitment
      console.log("Submitting fitment:", values);
      console.log("Selected vehicles:", selectedVehicles);

      showSuccess("Fitment created successfully!");
    } catch (error) {
      showError("Failed to create fitment");
      console.error("Fitment submission error:", error);
    } finally {
      setProcessing(false);
    }
  };

  // Validate fitment data (custom validation)
  const validateFitmentData = async (values: Record<string, any>) => {
    // Custom validation logic
    if (selectedVehicles.length === 0) {
      showError("Please select at least one vehicle");
      return false;
    }

    if (!values.partId) {
      showError("Part ID is required");
      return false;
    }

    return true;
  };

  return (
    <Box p="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="xs">
            Manual Fitment with Dynamic Fields
          </Title>
          <Text c="dimmed">
            Example showing how to use dynamic field configuration for vehicle
            filtering and fitment details
          </Text>
        </Box>

        {/* Vehicle Filter Section */}
        <Card withBorder padding="lg">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <IconCar size={24} color="#3b82f6" />
              <Title order={3}>Vehicle Filter</Title>
              {hasActiveFilters && (
                <Badge color="blue" variant="light">
                  {Object.keys(activeFilters).length} filters active
                </Badge>
              )}
            </Group>
            <Group gap="xs">
              <Badge color="cyan" variant="light" size="sm">
                Dynamic Fields
              </Badge>
              <Badge color="green" variant="light" size="sm">
                VCDB Config
              </Badge>
            </Group>
          </Group>

          <Alert
            icon={<IconAlertCircle size={16} />}
            color="blue"
            variant="light"
            mb="md"
          >
            <Text size="sm">
              This filter uses dynamic field configuration from the Settings
              tab. Configure fields in Settings → VCDB Fields to customize
              validation and display options.
            </Text>
          </Alert>

          <DynamicFieldFilter
            referenceType="vcdb"
            onFilter={updateFilters}
            onClear={clearFilters}
            loading={filterLoading || processing}
            showAdvancedToggle={true}
            defaultExpanded={false}
          />

          {filteredVehicles.length > 0 && (
            <Box mt="md">
              <Divider mb="md" />
              <Text size="sm" fw={500} mb="sm">
                Filtered Vehicles ({filteredVehicles.length})
              </Text>
              <Stack gap="xs">
                {filteredVehicles.map((vehicle) => (
                  <Paper key={vehicle.id} p="sm" withBorder>
                    <Group justify="space-between">
                      <Text size="sm">
                        {vehicle.year} {vehicle.make} {vehicle.model}{" "}
                        {vehicle.submodel}
                      </Text>
                      <Button
                        size="xs"
                        variant={
                          selectedVehicles.includes(vehicle.id)
                            ? "filled"
                            : "outline"
                        }
                        onClick={() => {
                          setSelectedVehicles((prev) =>
                            prev.includes(vehicle.id)
                              ? prev.filter((id) => id !== vehicle.id)
                              : [...prev, vehicle.id]
                          );
                        }}
                      >
                        {selectedVehicles.includes(vehicle.id)
                          ? "Selected"
                          : "Select"}
                      </Button>
                    </Group>
                  </Paper>
                ))}
              </Stack>
            </Box>
          )}
        </Card>

        {/* Fitment Details Section */}
        <Card withBorder padding="lg">
          <Group justify="space-between" mb="md">
            <Group gap="sm">
              <IconDatabase size={24} color="#10b981" />
              <Title order={3}>Fitment Details</Title>
              {selectedVehicles.length > 0 && (
                <Badge color="green" variant="light">
                  {selectedVehicles.length} vehicles selected
                </Badge>
              )}
            </Group>
            <Group gap="xs">
              <Badge color="cyan" variant="light" size="sm">
                Dynamic Fields
              </Badge>
              <Badge color="green" variant="light" size="sm">
                Product Config
              </Badge>
            </Group>
          </Group>

          <Alert
            icon={<IconAlertCircle size={16} />}
            color="blue"
            variant="light"
            mb="md"
          >
            <Text size="sm">
              This form uses dynamic field configuration from the Settings tab.
              Configure fields in Settings → Product Fields to customize
              validation and display options.
            </Text>
          </Alert>

          <DynamicFieldForm
            referenceType="product"
            initialValues={fitmentData}
            onSubmit={handleFitmentSubmit}
            onValidate={validateFitmentData}
            loading={fitmentLoading || processing}
            showValidationErrors={true}
          />

          <Group justify="flex-end" mt="md">
            <Button
              onClick={() => {
                const form = document.querySelector("form");
                form?.dispatchEvent(
                  new Event("submit", { cancelable: true, bubbles: true })
                );
              }}
              loading={processing}
              disabled={selectedVehicles.length === 0}
            >
              Create Fitment
            </Button>
          </Group>
        </Card>

        {/* Configuration Info */}
        <Paper withBorder p="md" bg="gray.0">
          <Group gap="sm" mb="sm">
            <IconSettings size={20} color="#666" />
            <Text fw={500} size="sm">
              Field Configuration
            </Text>
          </Group>
          <Text size="xs" c="dimmed">
            To customize these forms:
            <br />
            1. Go to Settings → VCDB Fields to configure vehicle filter fields
            <br />
            2. Go to Settings → Product Fields to configure fitment detail
            fields
            <br />
            3. Set fields as Required, Optional, or Disabled
            <br />
            4. Configure validation rules (min/max values, length limits, etc.)
            <br />
            5. Choose whether fields appear in forms and filters
          </Text>
        </Paper>
      </Stack>
    </Box>
  );
}
