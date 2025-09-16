import {
  Modal,
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Switch,
  Button,
  Group,
  Stack,
  Grid,
  Divider,
  Text,
  Badge,
  ActionIcon,
  Box,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import {
  IconPlus,
  IconTrash,
  IconAlertCircle,
  IconInfoCircle,
} from "@tabler/icons-react";

interface FieldConfiguration {
  id: number;
  name: string;
  display_name: string;
  description: string;
  field_type: string;
  reference_type: "vcdb" | "product" | "both";
  requirement_level: "required" | "optional" | "disabled";
  is_enabled: boolean;
  is_unique: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  enum_options?: string[];
  default_value: string;
  display_order: number;
  show_in_filters: boolean;
  show_in_forms: boolean;
  validation_rules?: any;
  created_at: string;
  updated_at: string;
}

interface FieldConfigurationModalProps {
  opened: boolean;
  onClose: () => void;
  onSave: (field: Partial<FieldConfiguration>) => Promise<void>;
  field?: FieldConfiguration | null;
  loading: boolean;
}

const FieldConfigurationModal = ({
  opened,
  onClose,
  onSave,
  field,
  loading,
}: FieldConfigurationModalProps) => {
  const [enumOptions, setEnumOptions] = useState<string[]>([]);
  const [newEnumOption, setNewEnumOption] = useState("");

  const form = useForm({
    initialValues: {
      name: "",
      display_name: "",
      description: "",
      field_type: "string",
      reference_type: "vcdb" as "vcdb" | "product" | "both",
      requirement_level: "optional" as "required" | "optional" | "disabled",
      is_enabled: true,
      is_unique: false,
      min_length: undefined as number | undefined,
      max_length: undefined as number | undefined,
      min_value: undefined as number | undefined,
      max_value: undefined as number | undefined,
      default_value: "",
      display_order: 0,
      show_in_filters: true,
      show_in_forms: true,
    },
    validate: {
      name: (value) => {
        if (!value) return "Field name is required";
        if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
          return "Field name must start with a letter and contain only letters, numbers, and underscores";
        }
        return null;
      },
      display_name: (value) => (!value ? "Display name is required" : null),
      field_type: (value) => (!value ? "Field type is required" : null),
      reference_type: (value) => (!value ? "Reference type is required" : null),
      requirement_level: (value) =>
        !value ? "Requirement level is required" : null,
      min_length: (value, values) => {
        if (
          value !== undefined &&
          values.max_length !== undefined &&
          value > values.max_length
        ) {
          return "Min length cannot be greater than max length";
        }
        return null;
      },
      max_length: (value, values) => {
        if (
          value !== undefined &&
          values.min_length !== undefined &&
          value < values.min_length
        ) {
          return "Max length cannot be less than min length";
        }
        return null;
      },
      min_value: (value, values) => {
        if (
          value !== undefined &&
          values.max_value !== undefined &&
          value > values.max_value
        ) {
          return "Min value cannot be greater than max value";
        }
        return null;
      },
      max_value: (value, values) => {
        if (
          value !== undefined &&
          values.min_value !== undefined &&
          value < values.min_value
        ) {
          return "Max value cannot be less than min value";
        }
        return null;
      },
    },
  });

  // Reset form when modal opens/closes or field changes
  useEffect(() => {
    if (opened) {
      if (field) {
        form.setValues({
          name: field.name,
          display_name: field.display_name,
          description: field.description,
          field_type: field.field_type,
          reference_type: field.reference_type,
          requirement_level: field.requirement_level,
          is_enabled: field.is_enabled,
          is_unique: field.is_unique,
          min_length: field.min_length,
          max_length: field.max_length,
          min_value: field.min_value,
          max_value: field.max_value,
          default_value: field.default_value,
          display_order: field.display_order,
          show_in_filters: field.show_in_filters,
          show_in_forms: field.show_in_forms,
        });
        setEnumOptions(field.enum_options || []);
      } else {
        form.reset();
        setEnumOptions([]);
      }
    }
  }, [opened, field]);

  const handleSubmit = async (values: typeof form.values) => {
    const fieldData = {
      ...values,
      enum_options: enumOptions,
    };
    await onSave(fieldData);
  };

  const addEnumOption = () => {
    if (newEnumOption.trim() && !enumOptions.includes(newEnumOption.trim())) {
      setEnumOptions([...enumOptions, newEnumOption.trim()]);
      setNewEnumOption("");
    }
  };

  const removeEnumOption = (option: string) => {
    setEnumOptions(enumOptions.filter((o) => o !== option));
  };

  const fieldTypes = [
    { value: "string", label: "String" },
    { value: "number", label: "Number" },
    { value: "boolean", label: "Boolean" },
    { value: "enum", label: "Enum (Dropdown)" },
    { value: "date", label: "Date" },
    { value: "text", label: "Text (Long)" },
    { value: "decimal", label: "Decimal" },
    { value: "integer", label: "Integer" },
  ];

  const referenceTypes = [
    { value: "vcdb", label: "VCDB Only" },
    { value: "product", label: "Product Only" },
    { value: "both", label: "Both VCDB & Product" },
  ];

  const requirementLevels = [
    { value: "required", label: "Required", color: "red" },
    { value: "optional", label: "Optional", color: "blue" },
    { value: "disabled", label: "Disabled", color: "gray" },
  ];

  const isNumericField = ["number", "decimal", "integer"].includes(
    form.values.field_type
  );
  const isStringField = ["string", "text"].includes(form.values.field_type);
  const isEnumField = form.values.field_type === "enum";

  return (
    <Modal
      opened={opened}
      onClose={onClose}
      title={
        <Group gap="sm">
          <Text fw={600} size="lg">
            {field ? "Edit Field Configuration" : "Create Field Configuration"}
          </Text>
          {field && (
            <Badge color="blue" variant="light">
              {field.reference_type.toUpperCase()}
            </Badge>
          )}
        </Group>
      }
      size="lg"
      centered
    >
      <form onSubmit={form.onSubmit(handleSubmit)}>
        <Stack gap="md">
          {/* Basic Information */}
          <Box>
            <Text fw={500} mb="md">
              Basic Information
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <TextInput
                  label="Field Name"
                  placeholder="e.g., engine_type"
                  description="Internal field name (letters, numbers, underscores only)"
                  required
                  {...form.getInputProps("name")}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Display Name"
                  placeholder="e.g., Engine Type"
                  description="Human-readable label for forms"
                  required
                  {...form.getInputProps("display_name")}
                />
              </Grid.Col>
              <Grid.Col span={12}>
                <Textarea
                  label="Description"
                  placeholder="Optional description of what this field represents"
                  minRows={2}
                  {...form.getInputProps("description")}
                />
              </Grid.Col>
            </Grid>
          </Box>

          <Divider />

          {/* Field Configuration */}
          <Box>
            <Text fw={500} mb="md">
              Field Configuration
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Field Type"
                  placeholder="Select field type"
                  required
                  data={fieldTypes}
                  {...form.getInputProps("field_type")}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Reference Type"
                  placeholder="Select reference type"
                  required
                  data={referenceTypes}
                  disabled={!!field} // Can't change reference type after creation
                  {...form.getInputProps("reference_type")}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Requirement Level"
                  placeholder="Select requirement level"
                  required
                  data={requirementLevels.map((level) => ({
                    value: level.value,
                    label: level.label,
                  }))}
                  {...form.getInputProps("requirement_level")}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Display Order"
                  placeholder="0"
                  description="Order for displaying in forms"
                  min={0}
                  {...form.getInputProps("display_order")}
                />
              </Grid.Col>
            </Grid>
          </Box>

          {/* Enum Options */}
          {isEnumField && (
            <>
              <Divider />
              <Box>
                <Text fw={500} mb="md">
                  Enum Options
                </Text>
                <Stack gap="sm">
                  {enumOptions.map((option, index) => (
                    <Group key={index} justify="space-between">
                      <Text size="sm">{option}</Text>
                      <ActionIcon
                        color="red"
                        variant="light"
                        size="sm"
                        onClick={() => removeEnumOption(option)}
                      >
                        <IconTrash size={14} />
                      </ActionIcon>
                    </Group>
                  ))}
                  <Group gap="xs">
                    <TextInput
                      placeholder="Enter enum option"
                      value={newEnumOption}
                      onChange={(e) => setNewEnumOption(e.target.value)}
                      style={{ flex: 1 }}
                      onKeyPress={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          addEnumOption();
                        }
                      }}
                    />
                    <Button
                      size="xs"
                      leftSection={<IconPlus size={14} />}
                      onClick={addEnumOption}
                      disabled={!newEnumOption.trim()}
                    >
                      Add
                    </Button>
                  </Group>
                  {enumOptions.length === 0 && (
                    <Alert
                      icon={<IconAlertCircle size={16} />}
                      color="yellow"
                      variant="light"
                    >
                      Enum fields must have at least one option
                    </Alert>
                  )}
                </Stack>
              </Box>
            </>
          )}

          {/* Validation Rules */}
          <Divider />
          <Box>
            <Text fw={500} mb="md">
              Validation Rules
            </Text>
            <Grid>
              {isStringField && (
                <>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Min Length"
                      placeholder="Optional"
                      min={0}
                      {...form.getInputProps("min_length")}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Max Length"
                      placeholder="Optional"
                      min={1}
                      {...form.getInputProps("max_length")}
                    />
                  </Grid.Col>
                </>
              )}
              {isNumericField && (
                <>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Min Value"
                      placeholder="Optional"
                      {...form.getInputProps("min_value")}
                    />
                  </Grid.Col>
                  <Grid.Col span={6}>
                    <NumberInput
                      label="Max Value"
                      placeholder="Optional"
                      {...form.getInputProps("max_value")}
                    />
                  </Grid.Col>
                </>
              )}
              <Grid.Col span={12}>
                <TextInput
                  label="Default Value"
                  placeholder="Optional default value"
                  {...form.getInputProps("default_value")}
                />
              </Grid.Col>
            </Grid>
          </Box>

          {/* Display Options */}
          <Divider />
          <Box>
            <Text fw={500} mb="md">
              Display Options
            </Text>
            <Grid>
              <Grid.Col span={6}>
                <Switch
                  label="Show in Filters"
                  description="Include in filter forms"
                  checked={form.values.show_in_filters}
                  onChange={(event) =>
                    form.setFieldValue(
                      "show_in_filters",
                      event.currentTarget.checked
                    )
                  }
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Switch
                  label="Show in Forms"
                  description="Include in data entry forms"
                  checked={form.values.show_in_forms}
                  onChange={(event) =>
                    form.setFieldValue(
                      "show_in_forms",
                      event.currentTarget.checked
                    )
                  }
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Switch
                  label="Enable Field"
                  description="Field is active and available"
                  checked={form.values.is_enabled}
                  onChange={(event) =>
                    form.setFieldValue(
                      "is_enabled",
                      event.currentTarget.checked
                    )
                  }
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Switch
                  label="Unique Values"
                  description="Field values must be unique"
                  checked={form.values.is_unique}
                  onChange={(event) =>
                    form.setFieldValue("is_unique", event.currentTarget.checked)
                  }
                />
              </Grid.Col>
            </Grid>
          </Box>

          {/* Information Alert */}
          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
          >
            <Text size="sm">
              <strong>Required fields</strong> will appear in all forms and
              require validation during data uploads.
              <br />
              <strong>Optional fields</strong> will appear in forms but allow
              empty values.
              <br />
              <strong>Disabled fields</strong> will not appear anywhere and skip
              validation.
            </Text>
          </Alert>

          {/* Actions */}
          <Group justify="flex-end" mt="md">
            <Button variant="light" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
            <Button type="submit" loading={loading}>
              {field ? "Update Field" : "Create Field"}
            </Button>
          </Group>
        </Stack>
      </form>
    </Modal>
  );
};

export default FieldConfigurationModal;
