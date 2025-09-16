import {
  Table,
  Badge,
  ActionIcon,
  Group,
  Text,
  Tooltip,
  Box,
  ScrollArea,
  Paper,
  Menu,
} from "@mantine/core";
import {
  IconEdit,
  IconTrash,
  IconToggleLeft,
  IconToggleRight,
  IconEye,
  IconEyeOff,
  IconFilter,
  IconFilterOff,
  IconDots,
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

interface FieldConfigurationTableProps {
  fields: FieldConfiguration[];
  loading: boolean;
  onEdit: (field: FieldConfiguration) => void;
  onDelete: (fieldId: number) => void;
  onToggle: (field: FieldConfiguration) => void;
}

const FieldConfigurationTable = ({
  fields,
  loading,
  onEdit,
  onDelete,
  onToggle,
}: FieldConfigurationTableProps) => {
  const getFieldTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      string: "blue",
      number: "green",
      boolean: "purple",
      enum: "orange",
      date: "cyan",
      text: "indigo",
      decimal: "teal",
      integer: "lime",
    };
    return colors[type] || "gray";
  };

  const getRequirementLevelColor = (level: string) => {
    const colors: Record<string, string> = {
      required: "red",
      optional: "blue",
      disabled: "gray",
    };
    return colors[level] || "gray";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getValidationSummary = (field: FieldConfiguration) => {
    const rules = [];

    if (field.min_length || field.max_length) {
      rules.push(`Length: ${field.min_length || 0}-${field.max_length || "∞"}`);
    }

    if (field.min_value !== undefined || field.max_value !== undefined) {
      rules.push(`Value: ${field.min_value || "-∞"}-${field.max_value || "∞"}`);
    }

    // Safely check enum_options
    if (
      field.enum_options &&
      Array.isArray(field.enum_options) &&
      field.enum_options.length > 0
    ) {
      rules.push(`${field.enum_options.length} options`);
    }

    if (field.is_unique) {
      rules.push("Unique");
    }

    return rules.join(", ") || "None";
  };

  if (fields.length === 0) {
    return (
      <Paper withBorder p="xl" radius="md">
        <Box ta="center">
          <Text c="dimmed" size="lg" mb="sm">
            No field configurations found
          </Text>
          <Text c="dimmed" size="sm">
            Create your first field configuration to get started
          </Text>
        </Box>
      </Paper>
    );
  }

  return (
    <Paper withBorder radius="md">
      <ScrollArea>
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>Field</Table.Th>
              <Table.Th>Type</Table.Th>
              <Table.Th>Requirement</Table.Th>
              <Table.Th>Status</Table.Th>
              <Table.Th>Display</Table.Th>
              <Table.Th>Validation</Table.Th>
              <Table.Th>Updated</Table.Th>
              <Table.Th w={80}>Actions</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {fields.map((field) => (
              <Table.Tr key={field.id}>
                <Table.Td>
                  <Box>
                    <Text fw={500} size="sm">
                      {field.display_name}
                    </Text>
                    <Text c="dimmed" size="xs">
                      {field.name}
                    </Text>
                    {field.description && (
                      <Text c="dimmed" size="xs" lineClamp={1}>
                        {field.description}
                      </Text>
                    )}
                  </Box>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color={getFieldTypeColor(field.field_type)}
                    variant="light"
                    size="sm"
                  >
                    {field.field_type}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Badge
                    color={getRequirementLevelColor(field.requirement_level)}
                    variant="light"
                    size="sm"
                  >
                    {field.requirement_level}
                  </Badge>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <Badge
                      color={field.is_enabled ? "green" : "red"}
                      variant="light"
                      size="sm"
                    >
                      {field.is_enabled ? "Enabled" : "Disabled"}
                    </Badge>
                  </Group>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <Tooltip
                      label={
                        field.show_in_filters
                          ? "Shows in filters"
                          : "Hidden from filters"
                      }
                    >
                      {field.show_in_filters ? (
                        <IconFilter size={16} color="green" />
                      ) : (
                        <IconFilterOff size={16} color="gray" />
                      )}
                    </Tooltip>
                    <Tooltip
                      label={
                        field.show_in_forms
                          ? "Shows in forms"
                          : "Hidden from forms"
                      }
                    >
                      {field.show_in_forms ? (
                        <IconEye size={16} color="green" />
                      ) : (
                        <IconEyeOff size={16} color="gray" />
                      )}
                    </Tooltip>
                  </Group>
                </Table.Td>

                <Table.Td>
                  <Text size="xs" c="dimmed" lineClamp={1}>
                    {getValidationSummary(field)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Text size="xs" c="dimmed">
                    {formatDate(field.updated_at)}
                  </Text>
                </Table.Td>

                <Table.Td>
                  <Group gap="xs">
                    <Tooltip label="Edit field">
                      <ActionIcon
                        color="blue"
                        variant="light"
                        size="sm"
                        onClick={() => onEdit(field)}
                        disabled={loading}
                      >
                        <IconEdit size={14} />
                      </ActionIcon>
                    </Tooltip>

                    <Menu position="bottom-end" withArrow>
                      <Menu.Target>
                        <ActionIcon
                          color="gray"
                          variant="light"
                          size="sm"
                          disabled={loading}
                        >
                          <IconDots size={14} />
                        </ActionIcon>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={
                            field.is_enabled ? (
                              <IconToggleLeft size={14} />
                            ) : (
                              <IconToggleRight size={14} />
                            )
                          }
                          onClick={() => onToggle(field)}
                        >
                          {field.is_enabled ? "Disable" : "Enable"} Field
                        </Menu.Item>
                        <Menu.Divider />
                        <Menu.Item
                          leftSection={<IconTrash size={14} />}
                          color="red"
                          onClick={() => onDelete(field.id)}
                        >
                          Delete Field
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      </ScrollArea>
    </Paper>
  );
};

export default FieldConfigurationTable;
