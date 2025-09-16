import {
  TextInput,
  Textarea,
  Select,
  NumberInput,
  Switch,
  Group,
  Stack,
  Text,
  Badge,
  Box,
  Alert,
} from "@mantine/core";
import { useForm } from "@mantine/form";
import { useState, useEffect } from "react";
import {
  fieldConfigService,
  FieldConfiguration,
} from "../services/fieldConfigService";

interface DynamicFieldFormProps {
  referenceType: "vcdb" | "product";
  initialValues?: Record<string, any>;
  onSubmit: (values: Record<string, any>) => void;
  onValidate?: (values: Record<string, any>) => Promise<boolean>;
  loading?: boolean;
  showValidationErrors?: boolean;
  compact?: boolean;
}

const DynamicFieldForm = ({
  referenceType,
  initialValues = {},
  onSubmit,
  onValidate,
  loading = false,
  showValidationErrors = true,
  compact = false,
}: DynamicFieldFormProps) => {
  const [fields, setFields] = useState<FieldConfiguration[]>([]);
  const [validationErrors] = useState<Record<string, string[]>>({});

  const form = useForm({
    initialValues: {},
    validate: {},
  });

  // Load field configurations
  useEffect(() => {
    const loadFields = async () => {
      try {
        const formFields = await fieldConfigService.getFormFields(
          referenceType
        );
        const sortedFields =
          fieldConfigService.sortFieldsByDisplayOrder(formFields);
        setFields(sortedFields);

        // Set up form validation and initial values
        const validationRules: Record<string, (value: any) => string | null> =
          {};
        const formInitialValues: Record<string, any> = {};

        sortedFields.forEach((field) => {
          // Set initial value
          if (initialValues[field.name] !== undefined) {
            formInitialValues[field.name] = initialValues[field.name];
          } else {
            formInitialValues[field.name] =
              fieldConfigService.getDefaultValue(field);
          }

          // Set up validation
          if (fieldConfigService.isFieldRequired(field)) {
            validationRules[field.name] = (value) => {
              if (
                !value ||
                (typeof value === "string" && value.trim() === "")
              ) {
                return `${field.display_name} is required`;
              }
              return null;
            };
          }

          // Add field-specific validation
          if (field.field_type === "string" || field.field_type === "text") {
            const originalValidator = validationRules[field.name];
            validationRules[field.name] = (value) => {
              if (originalValidator) {
                const requiredError = originalValidator(value);
                if (requiredError) return requiredError;
              }

              if (value && typeof value === "string") {
                if (field.min_length && value.length < field.min_length) {
                  return `Must be at least ${field.min_length} characters`;
                }
                if (field.max_length && value.length > field.max_length) {
                  return `Must be at most ${field.max_length} characters`;
                }
              }
              return null;
            };
          }

          if (
            field.field_type === "number" ||
            field.field_type === "decimal" ||
            field.field_type === "integer"
          ) {
            const originalValidator = validationRules[field.name];
            validationRules[field.name] = (value) => {
              if (originalValidator) {
                const requiredError = originalValidator(value);
                if (requiredError) return requiredError;
              }

              if (value !== null && value !== undefined) {
                const numValue =
                  typeof value === "string" ? parseFloat(value) : value;
                if (isNaN(numValue)) {
                  return "Must be a valid number";
                }
                if (
                  field.min_value !== undefined &&
                  numValue < field.min_value
                ) {
                  return `Must be at least ${field.min_value}`;
                }
                if (
                  field.max_value !== undefined &&
                  numValue > field.max_value
                ) {
                  return `Must be at most ${field.max_value}`;
                }
              }
              return null;
            };
          }
        });

        form.setValues(formInitialValues);
        form.clearErrors();
      } catch (error) {
        console.error("Error loading field configurations:", error);
      }
    };

    loadFields();
  }, [referenceType, initialValues]);

  // Handle form submission
  const handleSubmit = async (values: Record<string, any>) => {
    if (onValidate) {
      setIsValidating(true);
      try {
        const isValid = await onValidate(values);
        if (!isValid) {
          return;
        }
      } catch (error) {
        console.error("Validation error:", error);
        return;
      } finally {
        setIsValidating(false);
      }
    }

    onSubmit(values);
  };

  // Render individual field based on configuration
  const renderField = (field: FieldConfiguration) => {
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
          {field.is_unique && (
            <Badge size="xs" color="blue" variant="light">
              Unique
            </Badge>
          )}
        </Group>
      ),
      description: field.description,
      required: fieldConfigService.isFieldRequired(field),
      disabled: loading,
      ...form.getInputProps(field.name),
    };

    switch (field.field_type) {
      case "string":
      case "text":
        return field.field_type === "text" ? (
          <Textarea
            {...fieldProps}
            minRows={compact ? 2 : 3}
            maxRows={compact ? 4 : 6}
          />
        ) : (
          <TextInput {...fieldProps} />
        );

      case "number":
      case "decimal":
      case "integer":
        return (
          <NumberInput
            {...fieldProps}
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
            data={field.enum_options}
            searchable
            clearable={!fieldConfigService.isFieldRequired(field)}
          />
        );

      case "date":
        return <TextInput {...fieldProps} type="date" />;

      default:
        return <TextInput {...fieldProps} />;
    }
  };

  if (fields.length === 0) {
    return (
      <Alert color="blue" variant="light">
        <Text size="sm">
          No field configurations found for {referenceType.toUpperCase()}.
          <br />
          Configure fields in the Settings tab to enable custom validation and
          display options.
        </Text>
      </Alert>
    );
  }

  return (
    <form onSubmit={form.onSubmit(handleSubmit)}>
      <Stack gap={compact ? "sm" : "md"}>
        {fields.map((field) => (
          <Box key={field.name}>
            {renderField(field)}
            {showValidationErrors && validationErrors[field.name] && (
              <Alert color="red" variant="light" mt="xs">
                {validationErrors[field.name].map((error, index) => (
                  <Text key={index} size="xs">
                    {error}
                  </Text>
                ))}
              </Alert>
            )}
          </Box>
        ))}
      </Stack>
    </form>
  );
};

export default DynamicFieldForm;
function setIsValidating(arg0: boolean) {
  throw new Error("Function not implemented." + arg0);
}
