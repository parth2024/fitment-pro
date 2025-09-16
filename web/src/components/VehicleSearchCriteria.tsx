import React from "react";
import {
  SimpleGrid,
  Group,
  Button,
  Alert,
  Text,
  Title,
  Stack,
} from "@mantine/core";
import {
  IconRefresh,
  IconCalendar,
  IconCar,
  IconGasStation,
  IconDoor,
  IconSettings,
} from "@tabler/icons-react";
import DynamicFormField from "./DynamicFormField";
import { useApplyFitmentsFields } from "../hooks/useDynamicFields";

interface VehicleSearchCriteriaProps {
  vehicleFilters: {
    yearFrom: string;
    yearTo: string;
    make: string;
    model: string;
    submodel: string;
    fuelType: string;
    numDoors: string;
    driveType: string;
    bodyType: string;
  };
  setVehicleFilters: React.Dispatch<
    React.SetStateAction<{
      yearFrom: string;
      yearTo: string;
      make: string;
      model: string;
      submodel: string;
      fuelType: string;
      numDoors: string;
      driveType: string;
      bodyType: string;
    }>
  >;
  dropdownData: any;
  loadingDropdownData: boolean;
  onClearFilters: () => void;
}

export const VehicleSearchCriteria: React.FC<VehicleSearchCriteriaProps> = ({
  vehicleFilters,
  setVehicleFilters,
  dropdownData,
  loadingDropdownData,
  onClearFilters,
}) => {
  const {
    isVcdbFieldVisibleInApplyFitments,
    getVcdbFieldConfig,
    loading: fieldsLoading,
    error: fieldsError,
  } = useApplyFitmentsFields();

  // Field configurations with their corresponding data and icons
  const fieldConfigs = [
    {
      key: "yearFrom" as const,
      fieldName: "year_from",
      data: dropdownData?.years || [],
      icon: <IconCalendar size={16} color="#64748b" />,
    },
    {
      key: "yearTo" as const,
      fieldName: "year_to",
      data: dropdownData?.years || [],
      icon: <IconCalendar size={16} color="#64748b" />,
    },
    {
      key: "make" as const,
      fieldName: "make",
      data: dropdownData?.makes || [],
      icon: <IconCar size={16} color="#64748b" />,
    },
    {
      key: "model" as const,
      fieldName: "model",
      data: dropdownData?.models || [],
      icon: <IconCar size={16} color="#64748b" />,
    },
    {
      key: "submodel" as const,
      fieldName: "submodel",
      data: dropdownData?.submodels || [],
      icon: <IconCar size={16} color="#64748b" />,
    },
    {
      key: "fuelType" as const,
      fieldName: "fuel_type",
      data: dropdownData?.fuel_types || [],
      icon: <IconGasStation size={16} color="#64748b" />,
    },
    {
      key: "numDoors" as const,
      fieldName: "num_doors",
      data: dropdownData?.num_doors || [],
      icon: <IconDoor size={16} color="#64748b" />,
    },
    {
      key: "driveType" as const,
      fieldName: "drive_type",
      data: dropdownData?.drive_types || [],
      icon: <IconSettings size={16} color="#64748b" />,
    },
    {
      key: "bodyType" as const,
      fieldName: "body_type",
      data: dropdownData?.body_types || [],
      icon: <IconCar size={16} color="#64748b" />,
    },
  ];

  // Filter visible fields based on configuration
  const visibleFields = fieldConfigs.filter((fieldConfig) => {
    const isVisible = isVcdbFieldVisibleInApplyFitments(fieldConfig.key);
    return isVisible;
  });

  // Handle field value changes
  const handleFieldChange = (fieldKey: string, value: any) => {
    setVehicleFilters((prev) => ({
      ...prev,
      [fieldKey]: value || "",
    }));
  };

  // Show loading state
  if (fieldsLoading) {
    return (
      <Alert icon={<IconRefresh size={16} />} color="blue" radius="md" mt="md">
        <Text size="sm">Loading field configurations...</Text>
      </Alert>
    );
  }

  // Show error state
  if (fieldsError) {
    return (
      <Alert icon={<IconRefresh size={16} />} color="red" radius="md" mt="md">
        <Text size="sm">Error loading field configurations: {fieldsError}</Text>
      </Alert>
    );
  }

  // If no fields are visible, show a message
  if (visibleFields.length === 0) {
    return (
      <Alert color="yellow" radius="md" mt="md">
        <Text size="sm">
          No vehicle search criteria fields are currently enabled. Please
          configure field settings to enable search criteria.
        </Text>
      </Alert>
    );
  }

  return (
    <Stack gap="md">
      <div>
        <Title order={3} c="#1e293b" fw={700}>
          Vehicle Search Criteria
        </Title>
        <Text size="sm" c="#64748b">
          Refine your search with specific vehicle attributes to find the
          perfect fitments
        </Text>
        {loadingDropdownData && (
          <Alert
            icon={<IconRefresh size={16} />}
            color="blue"
            radius="md"
            mt="md"
          >
            <Text size="sm">Loading vehicle data from uploaded files...</Text>
          </Alert>
        )}
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="xl">
        {visibleFields.map((fieldConfig) => {
          const fieldDbConfig = getVcdbFieldConfig(fieldConfig.fieldName);

          // If no database configuration exists, use default field
          if (!fieldDbConfig) {
            return (
              <DynamicFormField
                key={fieldConfig.key}
                fieldConfig={{
                  id: 0,
                  name: fieldConfig.fieldName,
                  display_name:
                    fieldConfig.key.charAt(0).toUpperCase() +
                    fieldConfig.key.slice(1).replace(/([A-Z])/g, " $1"),
                  description: `Search by ${fieldConfig.key
                    .replace(/([A-Z])/g, " $1")
                    .toLowerCase()}`,
                  field_type: "string",
                  reference_type: "vcdb",
                  requirement_level: "optional",
                  is_enabled: true,
                  is_unique: false,
                  default_value: "",
                  display_order: 0,
                  show_in_filters: true,
                  show_in_forms: true,
                  validation_rules: {},
                  created_at: "",
                  updated_at: "",
                }}
                value={vehicleFilters[fieldConfig.key]}
                onChange={(value) => handleFieldChange(fieldConfig.key, value)}
                data={fieldConfig.data}
                disabled={loadingDropdownData}
                leftSection={fieldConfig.icon}
              />
            );
          }

          return (
            <DynamicFormField
              key={fieldConfig.key}
              fieldConfig={fieldDbConfig}
              value={vehicleFilters[fieldConfig.key]}
              onChange={(value) => handleFieldChange(fieldConfig.key, value)}
              data={fieldConfig.data}
              disabled={loadingDropdownData}
              leftSection={fieldConfig.icon}
            />
          );
        })}
      </SimpleGrid>

      <Group justify="space-between" mt="xl">
        <Button
          variant="outline"
          size="md"
          leftSection={<IconRefresh size={16} />}
          onClick={onClearFilters}
        >
          Clear All Filters
        </Button>
      </Group>
    </Stack>
  );
};

export default VehicleSearchCriteria;
