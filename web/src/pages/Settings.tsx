import {
  Container,
  Title,
  Paper,
  Tabs,
  Text,
  Group,
  Button,
  Badge,
  Stack,
  Card,
  Grid,
  Alert,
  Box,
} from "@mantine/core";
import {
  IconPlus,
  IconDatabase,
  IconCar,
  IconAlertCircle,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import FieldConfigurationModal from "../components/FieldConfigurationModal";
import FieldConfigurationTable from "../components/FieldConfigurationTable";
import { fieldConfigService } from "../api/services";

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

const Settings = () => {
  const [activeTab, setActiveTab] = useState<string>("vcdb");
  const [vcdbFields, setVcdbFields] = useState<FieldConfiguration[]>([]);
  const [productFields, setProductFields] = useState<FieldConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingField, setEditingField] = useState<FieldConfiguration | null>(
    null
  );

  const { showSuccess, showError } = useProfessionalToast();

  // Fetch field configurations
  const fetchFields = async (referenceType: string) => {
    try {
      setLoading(true);
      const response = await fieldConfigService.getFields({
        reference_type: referenceType as "vcdb" | "product" | "both",
      });

      console.log(`Field config response for ${referenceType}:`, response);

      // Handle different response structures
      let fields = [];
      const responseData = response.data || response;

      if (Array.isArray(responseData)) {
        fields = responseData;
      } else if (responseData && Array.isArray(responseData.results)) {
        fields = responseData.results;
      } else if (responseData && Array.isArray(responseData.data)) {
        fields = responseData.data;
      } else {
        console.warn("Unexpected response structure:", responseData);
        fields = [];
      }

      console.log(`Processed fields for ${referenceType}:`, fields);

      return fields;
    } catch (error) {
      console.error("Error fetching fields:", error);
      showError("Failed to fetch field configurations");
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Load all fields
  const loadFields = async () => {
    const [vcdbData, productData] = await Promise.all([
      fetchFields("vcdb"),
      fetchFields("product"),
    ]);

    setVcdbFields(vcdbData);
    setProductFields(productData);
  };

  useEffect(() => {
    loadFields();
  }, []);

  // Handle field creation/update
  const handleSaveField = async (fieldData: Partial<FieldConfiguration>) => {
    try {
      setLoading(true);

      // Check if we're editing an existing field (has a valid ID > 0)
      if (editingField && editingField.id > 0) {
        await fieldConfigService.updateField(editingField.id, fieldData);
        showSuccess("Field configuration updated successfully");
      } else {
        // Create a new field
        await fieldConfigService.createField(fieldData);
        showSuccess("Field configuration created successfully");
      }

      setModalOpen(false);
      setEditingField(null);
      await loadFields();
    } catch (error) {
      console.error("Error saving field:", error);
      showError(
        error instanceof Error ? error.message : "Failed to save field"
      );
    } finally {
      setLoading(false);
    }
  };

  // Handle field deletion
  const handleDeleteField = async (fieldId: number) => {
    try {
      setLoading(true);
      await fieldConfigService.deleteField(fieldId);
      showSuccess("Field configuration deleted successfully");
      await loadFields();
    } catch (error) {
      console.error("Error deleting field:", error);
      showError("Failed to delete field configuration");
    } finally {
      setLoading(false);
    }
  };

  // Handle field toggle
  const handleToggleField = async (field: FieldConfiguration) => {
    try {
      setLoading(true);
      await fieldConfigService.toggleField(field.id);
      showSuccess(
        `Field ${field.is_enabled ? "disabled" : "enabled"} successfully`
      );
      await loadFields();
    } catch (error) {
      console.error("Error toggling field:", error);
      showError("Failed to toggle field status");
    } finally {
      setLoading(false);
    }
  };

  // Handle edit field
  const handleEditField = (field: FieldConfiguration) => {
    setEditingField(field);
    setModalOpen(true);
  };

  // Handle create new field
  const handleCreateField = (referenceType: string) => {
    setEditingField({
      id: 0,
      name: "",
      display_name: "",
      description: "",
      field_type: "string",
      reference_type: referenceType as "vcdb" | "product" | "both",
      requirement_level: "optional",
      is_enabled: true,
      is_unique: false,
      enum_options: [],
      default_value: "",
      display_order: 0,
      show_in_filters: true,
      show_in_forms: true,
      validation_rules: {},
      created_at: "",
      updated_at: "",
    });
    setModalOpen(true);
  };

  // Get field counts
  const getFieldCounts = () => {
    // Ensure fields are arrays before processing
    const vcdbFieldsArray = Array.isArray(vcdbFields) ? vcdbFields : [];
    const productFieldsArray = Array.isArray(productFields)
      ? productFields
      : [];

    const vcdbCounts = {
      total: vcdbFieldsArray.length,
      enabled: vcdbFieldsArray.filter((f) => f.is_enabled).length,
      required: vcdbFieldsArray.filter(
        (f) => f.requirement_level === "required"
      ).length,
    };

    const productCounts = {
      total: productFieldsArray.length,
      enabled: productFieldsArray.filter((f) => f.is_enabled).length,
      required: productFieldsArray.filter(
        (f) => f.requirement_level === "required"
      ).length,
    };

    return { vcdb: vcdbCounts, product: productCounts };
  };

  const fieldCounts = getFieldCounts();

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Box>
          <Title order={1} mb="xs" style={{ color: "#2c3e50" }}>
            Field Configuration Settings
          </Title>
          <Text c="dimmed" size="lg">
            Configure custom fields for VCDB and Product data with validation
            rules and display options.
          </Text>
        </Box>

        {/* Overview Cards */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <IconDatabase size={24} color="#3b82f6" />
                  <Text fw={600} size="lg">
                    VCDB Fields
                  </Text>
                </Group>
                <Badge color="blue" variant="light">
                  {fieldCounts.vcdb.total} total
                </Badge>
              </Group>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Enabled
                  </Text>
                  <Badge color="green" variant="light">
                    {fieldCounts.vcdb.enabled}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Required
                  </Text>
                  <Badge color="red" variant="light">
                    {fieldCounts.vcdb.required}
                  </Badge>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card withBorder padding="lg" radius="md">
              <Group justify="space-between" mb="md">
                <Group gap="sm">
                  <IconCar size={24} color="#10b981" />
                  <Text fw={600} size="lg">
                    Product Fields
                  </Text>
                </Group>
                <Badge color="green" variant="light">
                  {fieldCounts.product.total} total
                </Badge>
              </Group>
              <Stack gap="xs">
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Enabled
                  </Text>
                  <Badge color="green" variant="light">
                    {fieldCounts.product.enabled}
                  </Badge>
                </Group>
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">
                    Required
                  </Text>
                  <Badge color="red" variant="light">
                    {fieldCounts.product.required}
                  </Badge>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Information Alert */}
        <Alert
          icon={<IconAlertCircle size={16} />}
          title="Field Configuration Impact"
          color="blue"
          variant="light"
        >
          <Text size="sm">
            <strong>Required fields:</strong> Will appear in all forms and
            require validation during data uploads.
            <br />
            <strong>Optional fields:</strong> Will appear in forms but allow
            empty values.
            <br />
            <strong>Disabled fields:</strong> Will not appear anywhere and skip
            validation.
          </Text>
        </Alert>

        {/* Main Configuration Interface */}
        <Paper withBorder radius="lg" p="md">
          <Tabs
            value={activeTab}
            onChange={(value) => setActiveTab(value || "vcdb")}
            styles={{
              list: {
                borderBottom: "none",
                gap: "var(--mantine-spacing-xs)",
                marginBottom: "var(--mantine-spacing-xl)",
              },
              tab: {
                border: "2px solid transparent",
                borderRadius: "var(--mantine-radius-md)",
                padding: "var(--mantine-spacing-md) var(--mantine-spacing-lg)",
                fontWeight: 500,
                fontSize: "var(--mantine-font-size-sm)",
                transition: "all 0.2s ease",
                "&[data-active]": {
                  borderColor: "var(--mantine-color-blue-4)",
                  backgroundColor: "var(--mantine-color-blue-0)",
                  color: "var(--mantine-color-blue-7)",
                  boxShadow: "0 2px 8px rgba(34, 139, 34, 0.1)",
                },
                "&:hover": {
                  backgroundColor: "var(--mantine-color-gray-0)",
                  borderColor: "var(--mantine-color-gray-3)",
                },
                "&[data-active]:hover": {
                  backgroundColor: "var(--mantine-color-blue-1)",
                  borderColor: "var(--mantine-color-blue-5)",
                },
              },
              panel: {
                paddingTop: 0,
              },
            }}
          >
            <Tabs.List>
              <Tabs.Tab
                value="vcdb"
                leftSection={<IconDatabase size={18} />}
                rightSection={
                  <Badge
                    size="sm"
                    color="blue"
                    variant="light"
                    radius="xl"
                    styles={{
                      root: {
                        fontWeight: 600,
                        minWidth: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    }}
                  >
                    {fieldCounts.vcdb.total}
                  </Badge>
                }
              >
                VCDB Fields
              </Tabs.Tab>
              <Tabs.Tab
                value="product"
                leftSection={<IconCar size={18} />}
                rightSection={
                  <Badge
                    size="sm"
                    color="green"
                    variant="light"
                    radius="xl"
                    styles={{
                      root: {
                        fontWeight: 600,
                        minWidth: 24,
                        height: 24,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    }}
                  >
                    {fieldCounts.product.total}
                  </Badge>
                }
              >
                Product Fields
              </Tabs.Tab>
            </Tabs.List>

            <Tabs.Panel value="vcdb" pt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={500}>Vehicle Configuration Database Fields</Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleCreateField("vcdb")}
                    loading={loading}
                  >
                    Add VCDB Field
                  </Button>
                </Group>

                <FieldConfigurationTable
                  fields={vcdbFields}
                  loading={loading}
                  onEdit={handleEditField}
                  onDelete={handleDeleteField}
                  onToggle={handleToggleField}
                />
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="product" pt="md">
              <Stack gap="md">
                <Group justify="space-between">
                  <Text fw={500}>Product/Part Fields</Text>
                  <Button
                    leftSection={<IconPlus size={16} />}
                    onClick={() => handleCreateField("product")}
                    loading={loading}
                  >
                    Add Product Field
                  </Button>
                </Group>

                <FieldConfigurationTable
                  fields={productFields}
                  loading={loading}
                  onEdit={handleEditField}
                  onDelete={handleDeleteField}
                  onToggle={handleToggleField}
                />
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Paper>
      </Stack>

      {/* Field Configuration Modal */}
      <FieldConfigurationModal
        opened={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingField(null);
        }}
        onSave={handleSaveField}
        field={editingField}
        loading={loading}
      />
    </Container>
  );
};

export default Settings;
