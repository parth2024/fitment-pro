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
  IconPackage,
  IconMapPin,
  IconHash,
  IconCar,
  IconFileText,
} from "@tabler/icons-react";
import DynamicFormField from "./DynamicFormField";
import { useApplyFitmentsFields } from "../hooks/useDynamicFields";

interface FitmentDetailsProps {
  fitmentDetails: {
    partId: string;
    position: string;
    quantity: number;
    title: string;
    description: string;
    notes: string;
    liftHeight: string;
    wheelType: string;
  };
  setFitmentDetails: React.Dispatch<
    React.SetStateAction<{
      partId: string;
      position: string;
      quantity: number;
      title: string;
      description: string;
      notes: string;
      liftHeight: string;
      wheelType: string;
    }>
  >;
  dropdownData: any;
  lookupData: any;
  loadingDropdownData: boolean;
  onClearFitmentDetails: () => void;
}

export const FitmentDetails: React.FC<FitmentDetailsProps> = ({
  fitmentDetails,
  setFitmentDetails,
  dropdownData,
  lookupData,
  loadingDropdownData,
  onClearFitmentDetails,
}) => {
  const {
    isProductFieldVisibleInApplyFitments,
    getProductFieldConfig,
    loading: fieldsLoading,
    error: fieldsError,
  } = useApplyFitmentsFields();

  // Field configurations with their corresponding data and icons
  const fieldConfigs = [
    {
      key: "partId" as const,
      fieldName: "part_id",
      data: dropdownData?.parts || [],
      icon: <IconPackage size={16} color="#64748b" />,
      placeholder: loadingDropdownData ? "Loading parts..." : "Select a part",
    },
    {
      key: "position" as const,
      fieldName: "position",
      data: dropdownData?.positions || [],
      icon: <IconMapPin size={16} color="#64748b" />,
      placeholder: "Select position",
    },
    {
      key: "quantity" as const,
      fieldName: "quantity",
      data: [],
      icon: <IconHash size={16} color="#64748b" />,
      placeholder: "1",
      isNumber: true,
    },
    {
      key: "title" as const,
      fieldName: "title",
      data: [],
      icon: <IconFileText size={16} color="#64748b" />,
      placeholder: "Enter fitment title",
    },
    {
      key: "description" as const,
      fieldName: "description",
      data: [],
      icon: <IconFileText size={16} color="#64748b" />,
      placeholder: "Enter fitment description",
      isTextarea: true,
    },
    {
      key: "notes" as const,
      fieldName: "notes",
      data: [],
      icon: <IconFileText size={16} color="#64748b" />,
      placeholder: "Enter additional notes",
      isTextarea: true,
    },
    {
      key: "liftHeight" as const,
      fieldName: "lift_height",
      data:
        lookupData?.lift_heights?.map((item: any) => ({
          value: item.value,
          label: item.value,
        })) || [],
      icon: <IconCar size={16} color="#64748b" />,
      placeholder: "Select lift height",
    },
    {
      key: "wheelType" as const,
      fieldName: "wheel_type",
      data:
        lookupData?.wheel_types?.map((item: any) => ({
          value: item.value,
          label: item.value,
        })) || [],
      icon: <IconCar size={16} color="#64748b" />,
      placeholder: "Select wheel type",
    },
  ];

  // Filter visible fields based on configuration
  const visibleFields = fieldConfigs.filter((fieldConfig) => {
    const isVisible = isProductFieldVisibleInApplyFitments(fieldConfig.key);
    return isVisible;
  });

  // Handle field value changes
  const handleFieldChange = (fieldKey: string, value: any) => {
    setFitmentDetails((prev) => ({
      ...prev,
      [fieldKey]: value,
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
          No fitment detail fields are currently enabled. Please configure field
          settings to enable fitment details.
        </Text>
      </Alert>
    );
  }

  return (
    <Stack gap="xl">
      <div>
        <Title order={3} c="#1e293b" fw={700} mb="xs">
          Fitment Details
        </Title>
        <Text size="sm" c="#64748b">
          Configure the specific details for your fitment application
        </Text>
      </div>

      <SimpleGrid cols={{ base: 1, sm: 2 }} spacing="xl">
        {visibleFields.map((fieldConfig) => {
          const fieldDbConfig = getProductFieldConfig(fieldConfig.fieldName);

          // If no database configuration exists, use default field
          if (!fieldDbConfig) {
            const defaultConfig = {
              id: 0,
              name: fieldConfig.fieldName,
              display_name:
                fieldConfig.key.charAt(0).toUpperCase() +
                fieldConfig.key.slice(1).replace(/([A-Z])/g, " $1"),
              description: `Configure ${fieldConfig.key
                .replace(/([A-Z])/g, " $1")
                .toLowerCase()}`,
              field_type: fieldConfig.isNumber
                ? "integer"
                : fieldConfig.isTextarea
                ? "text"
                : "string",
              reference_type: "product" as const,
              requirement_level:
                fieldConfig.key === "partId"
                  ? ("required" as const)
                  : ("optional" as const),
              is_enabled: true,
              is_unique: false,
              default_value: fieldConfig.key === "quantity" ? "1" : "",
              display_order: 0,
              show_in_filters: true,
              show_in_forms: true,
              validation_rules: {},
              created_at: "",
              updated_at: "",
            };

            return (
              <DynamicFormField
                key={fieldConfig.key}
                fieldConfig={defaultConfig}
                value={fitmentDetails[fieldConfig.key]}
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
              value={fitmentDetails[fieldConfig.key]}
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
          onClick={onClearFitmentDetails}
        >
          Clear Fitment Details
        </Button>
      </Group>
    </Stack>
  );
};

export default FitmentDetails;
