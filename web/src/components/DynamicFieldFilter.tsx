import {
  TextInput,
  Select,
  NumberInput,
  Switch,
  Group,
  Stack,
  Text,
  Badge,
  Box,
  Button,
  Collapse,
  ActionIcon,
  Tooltip,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import {
  IconFilter,
  IconFilterOff,
  IconChevronDown,
  IconChevronUp,
} from "@tabler/icons-react";
import {
  fieldConfigService,
  FieldConfiguration,
} from "../services/fieldConfigService";

interface DynamicFieldFilterProps {
  referenceType: "vcdb" | "product";
  onFilter: (filters: Record<string, any>) => void;
  onClear?: () => void;
  loading?: boolean;
  compact?: boolean;
  showAdvancedToggle?: boolean;
  defaultExpanded?: boolean;
}

const DynamicFieldFilter = ({
  referenceType,
  onFilter,
  onClear,
  loading = false,
  compact = false,
  showAdvancedToggle = true,
  defaultExpanded = false,
}: DynamicFieldFilterProps) => {
  const [fields, setFields] = useState<FieldConfiguration[]>([]);
  const [expanded, setExpanded] = useState(defaultExpanded);
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  const form = useForm({
    initialValues: {},
  });

  // Load filter field configurations
  useEffect(() => {
    const loadFilterFields = async () => {
      try {
        const filterFields = await fieldConfigService.getFilterFields(
          referenceType
        );
        const sortedFields =
          fieldConfigService.sortFieldsByDisplayOrder(filterFields);
        setFields(sortedFields);

        // Set up initial values
        const initialValues: Record<string, any> = {};
        sortedFields.forEach((field) => {
          initialValues[field.name] = fieldConfigService.getDefaultValue(field);
        });
        form.setValues(initialValues);
      } catch (error) {
        console.error("Error loading filter field configurations:", error);
      }
    };

    loadFilterFields();
  }, [referenceType]);

  // Check if filters are active
  useEffect(() => {
    const values = form.values;
    const hasActive = Object.values(values).some((value) => {
      if (value === null || value === undefined) return false;
      if (typeof value === "string") return value.trim() !== "";
      if (typeof value === "boolean") return value !== false;
      if (typeof value === "number") return value !== 0;
      return true;
    });
    setHasActiveFilters(hasActive);
  }, [form.values]);

  // Handle filter submission
  const handleFilter = (values: Record<string, any>) => {
    // Clean up empty values
    const cleanFilters: Record<string, any> = {};
    Object.entries(values).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        if (typeof value === "string" && value.trim() !== "") {
          cleanFilters[key] = value.trim();
        } else if (typeof value === "boolean" && value === true) {
          cleanFilters[key] = value;
        } else if (typeof value === "number" && value !== 0) {
          cleanFilters[key] = value;
        } else if (
          typeof value !== "string" &&
          typeof value !== "boolean" &&
          typeof value !== "number"
        ) {
          cleanFilters[key] = value;
        }
      }
    });

    onFilter(cleanFilters);
  };

  // Handle clear filters
  const handleClear = () => {
    const initialValues: Record<string, any> = {};
    fields.forEach((field) => {
      initialValues[field.name] = fieldConfigService.getDefaultValue(field);
    });
    form.setValues(initialValues);
    onClear?.();
    setHasActiveFilters(false);
  };

  // Render individual filter field
  const renderFilterField = (field: FieldConfiguration) => {
    const fieldProps = {
      key: field.name,
      label: (
        <Group gap="xs">
          <Text size="sm" fw={500}>
            {field.display_name}
          </Text>
          {fieldConfigService.isFieldRequired(field) && (
            <Badge size="xs" color="red" variant="light">
              Required
            </Badge>
          )}
        </Group>
      ),
      description: field.description,
      disabled: loading,
      ...form.getInputProps(field.name),
    };

    switch (field.field_type) {
      case "string":
      case "text":
        return (
          <TextInput
            {...fieldProps}
            placeholder={`Filter by ${field.display_name.toLowerCase()}`}
          />
        );

      case "number":
      case "decimal":
      case "integer":
        return (
          <NumberInput
            {...fieldProps}
            placeholder={`Filter by ${field.display_name.toLowerCase()}`}
            decimalScale={field.field_type === "integer" ? 0 : undefined}
            min={field.min_value}
            max={field.max_value}
          />
        );

      case "boolean":
        return (
          <Switch
            {...fieldProps}
            label={field.display_name}
            description={field.description}
            disabled={loading}
          />
        );

      case "enum":
        return (
          <Select
            {...fieldProps}
            data={[
              { value: "", label: `All ${field.display_name}` },
              ...field.enum_options.map((option) => ({
                value: option,
                label: option,
              })),
            ]}
            clearable
            searchable
          />
        );

      case "date":
        return (
          <TextInput
            {...fieldProps}
            type="date"
            placeholder={`Filter by ${field.display_name.toLowerCase()}`}
          />
        );

      default:
        return (
          <TextInput
            {...fieldProps}
            placeholder={`Filter by ${field.display_name.toLowerCase()}`}
          />
        );
    }
  };

  // Group fields by priority (required fields first)
  const requiredFields = fields.filter((field) =>
    fieldConfigService.isFieldRequired(field)
  );
  const optionalFields = fields.filter((field) =>
    fieldConfigService.isFieldOptional(field)
  );

  const primaryFields = compact ? requiredFields.slice(0, 3) : requiredFields;
  const secondaryFields = compact ? [] : optionalFields;

  if (fields.length === 0) {
    return (
      <Box>
        <Text size="sm" c="dimmed">
          No filter configurations found for {referenceType.toUpperCase()}.
        </Text>
      </Box>
    );
  }

  return (
    <Box>
      <form onSubmit={form.onSubmit(handleFilter)}>
        <Stack gap="md">
          {/* Primary Filters (Always Visible) */}
          {primaryFields.length > 0 && (
            <Box>
              {compact && (
                <Text size="sm" fw={500} mb="sm" c="dimmed">
                  Quick Filters
                </Text>
              )}
              <Stack gap="sm">
                {primaryFields.map((field) => (
                  <Box key={field.name}>{renderFilterField(field)}</Box>
                ))}
              </Stack>
            </Box>
          )}

          {/* Secondary Filters (Collapsible) */}
          {secondaryFields.length > 0 && showAdvancedToggle && (
            <Box>
              <Button
                variant="subtle"
                size="xs"
                leftSection={
                  expanded ? (
                    <IconChevronUp size={14} />
                  ) : (
                    <IconChevronDown size={14} />
                  )
                }
                onClick={() => setExpanded(!expanded)}
                rightSection={
                  hasActiveFilters ? (
                    <Badge size="xs" color="blue" variant="light">
                      Active
                    </Badge>
                  ) : null
                }
              >
                Advanced Filters
              </Button>

              <Collapse in={expanded}>
                <Stack gap="sm" mt="sm">
                  {secondaryFields.map((field) => (
                    <Box key={field.name}>{renderFilterField(field)}</Box>
                  ))}
                </Stack>
              </Collapse>
            </Box>
          )}

          {/* Filter Actions */}
          <Group justify="space-between" mt="md">
            <Group gap="xs">
              <Button
                type="submit"
                leftSection={<IconFilter size={16} />}
                loading={loading}
                size={compact ? "xs" : "sm"}
                disabled={!hasActiveFilters}
              >
                Apply Filters
              </Button>

              {hasActiveFilters && (
                <Button
                  variant="light"
                  leftSection={<IconFilterOff size={16} />}
                  onClick={handleClear}
                  size={compact ? "xs" : "sm"}
                  disabled={loading}
                >
                  Clear
                </Button>
              )}
            </Group>

            {hasActiveFilters && (
              <Tooltip label="Active filters detected">
                <ActionIcon color="blue" variant="light" size="sm">
                  <IconFilter size={16} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
        </Stack>
      </form>
    </Box>
  );
};

export default DynamicFieldFilter;
