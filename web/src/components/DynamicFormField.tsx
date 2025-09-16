import React from "react";
import {
  Select,
  NumberInput,
  TextInput,
  Textarea,
  Switch,
  Group,
  Text,
  Badge,
  Tooltip,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";

interface DynamicFormFieldProps {
  fieldConfig: any;
  value: any;
  onChange: (value: any) => void;
  data?: Array<{ value: string; label: string }>;
  disabled?: boolean;
  error?: string;
  styles?: any;
  leftSection?: React.ReactNode;
}

export const DynamicFormField: React.FC<DynamicFormFieldProps> = ({
  fieldConfig,
  value,
  onChange,
  data = [],
  disabled = false,
  error,
  styles,
  leftSection,
}) => {
  // Don't render if field is disabled
  if (fieldConfig.requirement_level === "disabled" || !fieldConfig.is_enabled) {
    return null;
  }

  // Don't render if field shouldn't show in forms
  if (!fieldConfig.show_in_forms) {
    return null;
  }

  const isRequired = fieldConfig.requirement_level === "required";
  const hasError = !!error;

  // Common styles for all inputs
  const commonStyles = {
    label: {
      fontWeight: 600,
      fontSize: "13px",
      color: "#374151",
      marginBottom: "8px",
      textTransform: "uppercase",
      letterSpacing: "0.5px",
      display: "flex",
      alignItems: "center",
      gap: "4px",
    },
    input: {
      borderRadius: "10px",
      border: hasError ? "2px solid #ef4444" : "2px solid #e2e8f0",
      fontSize: "14px",
      height: "48px",
      paddingLeft: leftSection ? "40px" : "12px",
      transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
      backgroundColor: disabled ? "#f8fafc" : "#fafafa",
      "&:focus": {
        borderColor: hasError ? "#ef4444" : "#3b82f6",
        boxShadow: hasError
          ? "0 0 0 4px rgba(239, 68, 68, 0.1)"
          : "0 0 0 4px rgba(59, 130, 246, 0.1)",
        backgroundColor: "#ffffff",
      },
      "&:hover": {
        borderColor: hasError ? "#ef4444" : "#cbd5e1",
        backgroundColor: disabled ? "#f8fafc" : "#ffffff",
      },
    },
    ...styles,
  };

  // Label with required indicator and description
  const renderLabel = () => (
    <Group gap="xs" align="center">
      <Text
        style={{
          fontWeight: 600,
          fontSize: "13px",
          color: "#374151",
          textTransform: "uppercase",
          letterSpacing: "0.5px",
        }}
      >
        {fieldConfig.display_name}
      </Text>
      {isRequired && (
        <Badge size="xs" color="red" variant="light">
          Required
        </Badge>
      )}
      {fieldConfig.description && (
        <Tooltip label={fieldConfig.description} multiline w={300}>
          <IconInfoCircle
            size={14}
            color="#64748b"
            style={{ cursor: "help" }}
          />
        </Tooltip>
      )}
    </Group>
  );

  // Render different input types based on field configuration
  const renderInput = () => {
    switch (fieldConfig.field_type) {
      case "string":
      case "text":
        if (fieldConfig.field_type === "text") {
          return (
            <Textarea
              label={renderLabel()}
              placeholder={
                fieldConfig.default_value ||
                `Enter ${fieldConfig.display_name.toLowerCase()}`
              }
              value={value || ""}
              onChange={(event) => onChange(event.currentTarget.value)}
              disabled={disabled}
              error={error}
              styles={commonStyles}
              minRows={3}
              maxRows={6}
              autosize
            />
          );
        }
        // If data is provided, render as Select, otherwise as TextInput
        if (data && data.length > 0) {
          return (
            <Select
              label={renderLabel()}
              placeholder={
                fieldConfig.default_value ||
                `Select ${fieldConfig.display_name.toLowerCase()}`
              }
              data={data}
              value={value || ""}
              onChange={onChange}
              disabled={disabled}
              error={error}
              styles={commonStyles}
              leftSection={leftSection}
              searchable
              clearable={!isRequired}
            />
          );
        }
        return (
          <TextInput
            label={renderLabel()}
            placeholder={
              fieldConfig.default_value ||
              `Enter ${fieldConfig.display_name.toLowerCase()}`
            }
            value={value || ""}
            onChange={(event) => onChange(event.currentTarget.value)}
            disabled={disabled}
            error={error}
            styles={commonStyles}
            leftSection={leftSection}
          />
        );

      case "number":
      case "integer":
      case "decimal":
        return (
          <NumberInput
            label={renderLabel()}
            placeholder={
              fieldConfig.default_value ||
              `Enter ${fieldConfig.display_name.toLowerCase()}`
            }
            value={value || undefined}
            onChange={onChange}
            disabled={disabled}
            error={error}
            styles={commonStyles}
            leftSection={leftSection}
            min={
              fieldConfig.min_value ? Number(fieldConfig.min_value) : undefined
            }
            max={
              fieldConfig.max_value ? Number(fieldConfig.max_value) : undefined
            }
            decimalScale={fieldConfig.field_type === "decimal" ? 2 : 0}
            allowDecimal={fieldConfig.field_type !== "integer"}
          />
        );

      case "boolean":
        return (
          <div>
            {renderLabel()}
            <Switch
              checked={value || false}
              onChange={(event) => onChange(event.currentTarget.checked)}
              disabled={disabled}
              size="md"
              color="blue"
              style={{ marginTop: "8px" }}
            />
          </div>
        );

      case "enum":
        return (
          <Select
            label={renderLabel()}
            placeholder={`Select ${fieldConfig.display_name.toLowerCase()}`}
            data={fieldConfig.enum_options || data || []}
            value={value || ""}
            onChange={onChange}
            disabled={disabled}
            error={error}
            styles={commonStyles}
            leftSection={leftSection}
            searchable
            clearable={!isRequired}
          />
        );

      case "date":
        return (
          <TextInput
            label={renderLabel()}
            placeholder={fieldConfig.default_value || "YYYY-MM-DD"}
            value={value || ""}
            onChange={(event) => onChange(event.currentTarget.value)}
            disabled={disabled}
            error={error}
            styles={commonStyles}
            leftSection={leftSection}
            type="date"
          />
        );

      default:
        return (
          <TextInput
            label={renderLabel()}
            placeholder={
              fieldConfig.default_value ||
              `Enter ${fieldConfig.display_name.toLowerCase()}`
            }
            value={value || ""}
            onChange={(event) => onChange(event.currentTarget.value)}
            disabled={disabled}
            error={error}
            styles={commonStyles}
            leftSection={leftSection}
          />
        );
    }
  };

  return <div>{renderInput()}</div>;
};

export default DynamicFormField;
