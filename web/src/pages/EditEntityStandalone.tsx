import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Card,
  Button,
  Group,
  Text,
  Badge,
  TextInput,
  Textarea,
  Switch,
  Stack,
  Alert,
  Loader,
  Divider,
  Tabs,
  MultiSelect,
  Select,
  Accordion,
  ActionIcon,
  Paper,
  Grid,
  Checkbox,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconCar,
  IconDatabase,
  IconArrowLeft,
  IconCheck,
} from "@tabler/icons-react";
import { useParams } from "react-router-dom";
import apiClient from "../api/client";
import { toast } from "react-toastify";

// interface Entity {
//   id: string;
//   name: string;
//   slug: string | null;
//   description?: string;
//   is_active: boolean;
//   is_default: boolean;
//   user_count: number;
//   created_at: string;
//   fitment_settings?: Record<string, any>;
//   ai_instructions?: string;
//   contact_email?: string;
//   contact_phone?: string;
//   company_address?: string;
//   default_fitment_method?: string;
// }

interface EntityFormData {
  name: string;
  slug: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  company_address: string;
  ai_instructions: string;
  is_active: boolean;
  is_default: boolean;
  default_fitment_method: "manual" | "ai";
  vcdb_categories: string[];
  required_vcdb_fields: string[];
  optional_vcdb_fields: string[];
  required_product_fields: string[];
  additional_attributes: Array<{
    name: string;
    value: string;
    uom: string;
    is_entity_specific: boolean;
  }>;
}

interface VCDBCategory {
  id: string;
  name: string;
  version: string;
  is_valid: boolean;
  record_count: number;
}

const VCDB_FIELDS = [
  "Year (model year)",
  "Make (manufacturer, e.g., Ford, Toyota)",
  "Model (e.g., F-150, Camry)",
  "Submodel / Trim (e.g., XLT, Limited, SE)",
  "Body Type (e.g., Sedan, SUV, Pickup)",
  "Body Number of Doors (2-door, 4-door, etc.)",
  "Drive Type (FWD, RWD, AWD, 4WD)",
  "Fuel Type (Gasoline, Diesel, Hybrid, Electric)",
  "Engine Base (engine code or family ID)",
  "Engine Liter (e.g., 2.0L, 5.7L)",
  "Engine Cylinders (e.g., I4, V6, V8)",
  "Engine VIN Code (8th digit VIN engine identifier)",
  "Engine Block Type (Inline, V-type, etc.)",
  "Transmission Type (Automatic, Manual, CVT)",
  "Transmission Speeds (e.g., 6-speed, 10-speed)",
  "Transmission Control Type (Automatic, Dual-Clutch, etc.)",
  "Bed Type (for pickups — e.g., Fleetside, Stepside)",
  "Bed Length (e.g., 5.5 ft, 6.5 ft, 8 ft)",
  "Wheelbase (measured length in inches/mm)",
  "Region (market region — U.S., Canada, Mexico, Latin America)",
];

const REQUIRED_PRODUCT_FIELDS = [
  "Part Number",
  "Part Terminology Name",
  "PTID",
  "Parent/Child",
];

const EditEntityStandalone: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();

  // Extract ID from URL manually since we're not in a proper route context
  const pathParts = window.location.pathname.split("/");
  const id = routeId || pathParts[pathParts.length - 1];

  console.log("DEBUG: EditEntityStandalone component rendered with id:", id);
  console.log("DEBUG: routeId from useParams:", routeId);
  console.log("DEBUG: pathParts:", pathParts);
  const [entity, setEntity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vcdbCategories, setVcdbCategories] = useState<VCDBCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  const [formData, setFormData] = useState<EntityFormData>({
    name: "",
    slug: "",
    description: "",
    contact_email: "",
    contact_phone: "",
    company_address: "",
    ai_instructions: "",
    is_active: true,
    is_default: false,
    default_fitment_method: "manual",
    vcdb_categories: [],
    required_vcdb_fields: [],
    optional_vcdb_fields: [],
    required_product_fields: [],
    additional_attributes: [],
  });

  // Fetch entity data
  useEffect(() => {
    console.log("DEBUG: useEffect triggered for fetchEntity");
    const fetchEntity = async () => {
      console.log("DEBUG: fetchEntity called with id:", id);
      if (!id) {
        console.log("DEBUG: No id provided, returning");
        return;
      }

      try {
        setLoading(true);
        setError(null);
        console.log("DEBUG: Fetching entity with ID:", id);
        console.log("DEBUG: Making API call to:", `/api/tenants/${id}/`);

        const response = await apiClient.get(`/api/tenants/${id}/`);
        console.log("DEBUG: Entity response:", response.data);

        const entityData = response.data;
        setEntity(entityData);

        const fitmentSettings = entityData.fitment_settings || {};
        setFormData({
          name: entityData.name,
          slug: entityData.slug || "",
          description: entityData.description || "",
          contact_email: entityData.contact_email || "",
          contact_phone: entityData.contact_phone || "",
          company_address: entityData.company_address || "",
          ai_instructions: entityData.ai_instructions || "",
          is_active: entityData.is_active,
          is_default: entityData.is_default,
          default_fitment_method: entityData.default_fitment_method || "manual",
          vcdb_categories:
            fitmentSettings.vcdb_categories || entityData.vcdb_categories || [],
          required_vcdb_fields:
            fitmentSettings.required_vcdb_fields ||
            entityData.required_vcdb_fields ||
            [],
          optional_vcdb_fields:
            fitmentSettings.optional_vcdb_fields ||
            entityData.optional_vcdb_fields ||
            [],
          required_product_fields:
            fitmentSettings.required_product_fields ||
            entityData.required_product_fields ||
            [],
          additional_attributes:
            fitmentSettings.additional_attributes ||
            entityData.additional_attributes ||
            [],
        });
      } catch (error: any) {
        console.error("Failed to load entity data:", error);
        console.error("Error response:", error?.response?.data);
        console.error("Error status:", error?.response?.status);
        console.error("Error message:", error?.message);

        let errorMessage = "Failed to load entity data";

        if (error?.code === "ECONNABORTED") {
          errorMessage =
            "Request timed out. Please check your connection and try again.";
        } else if (error?.response?.status === 404) {
          errorMessage = "Entity not found. Please check the entity ID.";
        } else if (error?.response?.status === 403) {
          errorMessage =
            "Access denied. You don't have permission to view this entity.";
        } else if (error?.response?.status === 500) {
          errorMessage = "Server error. Please try again later.";
        } else if (error?.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error?.response?.data?.detail) {
          errorMessage = error.response.data.detail;
        } else if (error?.message) {
          errorMessage = error.message;
        }

        setError(errorMessage);
        toast.error(errorMessage);
      } finally {
        setLoading(false);
      }
    };

    fetchEntity();
  }, [id]);

  // Fetch VCDB categories
  const fetchVCDBCategories = async () => {
    if (!id) return;

    try {
      setLoadingCategories(true);
      const response = await apiClient.get(
        `/api/vcdb-categories/categories/?tenant_id=${id}`,
        {
          headers: {
            "X-Tenant-ID": id,
          },
        }
      );
      setVcdbCategories(response.data);
    } catch (error) {
      toast.error("Failed to load VCDB categories");
    } finally {
      setLoadingCategories(false);
    }
  };

  useEffect(() => {
    if (id) {
      fetchVCDBCategories();
    }
  }, [id]);

  const handleUpdate = async () => {
    if (!entity) return;

    try {
      setSubmitting(true);

      const updateData = {
        ...formData,
        fitment_settings: {
          vcdb_categories: formData.vcdb_categories,
          required_vcdb_fields: formData.required_vcdb_fields,
          optional_vcdb_fields: formData.optional_vcdb_fields,
          required_product_fields: formData.required_product_fields,
          additional_attributes: formData.additional_attributes,
        },
      };

      await apiClient.put(`/api/tenants/${entity.id}/`, updateData);

      const response = await apiClient.get(`/api/tenants/${entity.id}/`);
      setEntity(response.data);

      toast.success("Entity settings updated successfully");
    } catch (error) {
      toast.error("Failed to update entity settings");
    } finally {
      setSubmitting(false);
    }
  };

  const handleUseThisEntity = async () => {
    if (!entity) return;

    try {
      setSubmitting(true);

      // First save any changes
      await handleUpdate();

      // Switch to this entity
      await apiClient.post(`/api/tenants/switch/${entity.id}/`);

      // Update localStorage
      localStorage.setItem("current_entity", JSON.stringify(entity));

      // Dispatch event to notify other components
      const entityChangeEvent = new CustomEvent("entityChanged", {
        detail: { entity, entityId: entity.id },
      });
      window.dispatchEvent(entityChangeEvent);

      toast.success(`Switched to ${entity.name}. Redirecting to dashboard...`);

      // Navigate to analytics/dashboard
      setTimeout(() => {
        window.location.href = "/analytics";
      }, 500);
    } catch (error) {
      toast.error("Failed to switch to entity");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          padding: "40px 0",
        }}
      >
        <Container size="xl">
          <Group justify="center" style={{ minHeight: "60vh" }}>
            <Loader size="lg" />
            <Text>Loading entity settings...</Text>
          </Group>
        </Container>
      </div>
    );
  }

  if (error || (!loading && !entity)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          padding: "40px 0",
        }}
      >
        <Container size="xl">
          <Alert title="Error" color="red">
            {error || "Entity not found"}
          </Alert>
          <Text size="sm" c="dimmed" mt="sm">
            Entity ID: {id}
          </Text>
          <Group mt="md">
            <Button
              leftSection={<IconArrowLeft size={16} />}
              onClick={() => (window.location.href = "/manage-entities")}
              size="sm"
              variant="subtle"
              style={{ fontSize: "14px" }}
            >
              Back to Manage Entities
            </Button>
            <Button
              variant="light"
              onClick={() => window.location.reload()}
              size="sm"
            >
              Retry
            </Button>
          </Group>
        </Container>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        padding: "40px 0",
      }}
    >
      <Container size="xl">
        <Stack gap="sm">
          {/* Header */}
          <Group justify="space-between" align="center">
            <Group>
              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="subtle"
                onClick={() => (window.location.href = "/manage-entities")}
                size="sm"
                style={{ fontSize: "14px" }}
              >
                Back to Manage Entities
              </Button>
            </Group>
            <Group>
              <Badge color={entity.is_active ? "green" : "red"} size="lg">
                {entity.is_active ? "Active" : "Inactive"}
              </Badge>
              {entity.is_default && (
                <Badge color="blue" size="lg">
                  Default
                </Badge>
              )}
            </Group>
          </Group>

          {/* Configuration Form with Tabs */}
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Title order={3} mb={"xl"}>
              {entity.name}
            </Title>
            <Tabs
              defaultValue="basic"
              variant="outline"
              onChange={(value) => value}
            >
              <Tabs.List>
                <Tabs.Tab
                  value="basic"
                  leftSection={<IconDatabase size={16} />}
                >
                  Basic Info
                </Tabs.Tab>
                <Tabs.Tab value="fitments" leftSection={<IconCar size={16} />}>
                  Fitments
                </Tabs.Tab>
                <Tabs.Tab
                  value="products"
                  leftSection={<IconDatabase size={16} />}
                >
                  Products
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="basic" pt="md">
                <Stack gap="md">
                  <TextInput
                    label="Name"
                    placeholder="Enter entity name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    required
                  />
                  <TextInput
                    label="URL"
                    placeholder="Enter entity URL"
                    value={formData.slug}
                    onChange={(e) =>
                      setFormData({ ...formData, slug: e.target.value })
                    }
                  />
                  <Textarea
                    label="Description"
                    placeholder="Enter entity description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData({ ...formData, description: e.target.value })
                    }
                    rows={3}
                  />
                  <Divider />
                  <Text fw={500}>Contact Information</Text>
                  <TextInput
                    label="Contact Email"
                    placeholder="Enter contact email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_email: e.target.value,
                      })
                    }
                  />
                  <TextInput
                    label="Contact Phone"
                    placeholder="Enter contact phone"
                    value={formData.contact_phone}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        contact_phone: e.target.value,
                      })
                    }
                  />
                  <Textarea
                    label="Company Address"
                    placeholder="Enter company address"
                    value={formData.company_address}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        company_address: e.target.value,
                      })
                    }
                    rows={3}
                  />
                  <Select
                    label="Default Fitment Application"
                    placeholder="Select default method"
                    data={[
                      { value: "manual", label: "Manual" },
                      { value: "ai", label: "AI" },
                    ]}
                    value={formData.default_fitment_method}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        default_fitment_method: value as "manual" | "ai",
                      })
                    }
                  />
                  <Textarea
                    label="AI Instructions"
                    placeholder="Enter AI instructions for fitment processing"
                    value={formData.ai_instructions}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        ai_instructions: e.target.value,
                      })
                    }
                    rows={4}
                  />
                  <Group>
                    <Switch
                      label="Active"
                      checked={formData.is_active}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_active: e.currentTarget.checked,
                        })
                      }
                    />
                    <Switch
                      label="Default Entity"
                      checked={formData.is_default}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          is_default: e.currentTarget.checked,
                        })
                      }
                    />
                  </Group>

                  <Group justify="flex-end" mt="xl">
                    <Button
                      variant="light"
                      onClick={handleUpdate}
                      loading={submitting}
                      size="sm"
                      color="blue"
                    >
                      Save Changes
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="fitments" pt="md">
                <Stack gap="md">
                  <Text fw={500} size="lg">
                    Fitment Configuration
                  </Text>

                  <MultiSelect
                    label="VCDB Categories"
                    placeholder="Select VCDB categories"
                    data={vcdbCategories.map((cat) => ({
                      value: cat.id,
                      label: `${cat.name} (${cat.version}) - ${cat.record_count} records`,
                    }))}
                    value={formData.vcdb_categories}
                    onChange={(value) =>
                      setFormData({ ...formData, vcdb_categories: value })
                    }
                    searchable
                    clearable
                    disabled={loadingCategories}
                  />

                  <Group grow>
                    <MultiSelect
                      label="Required VCDB Fields"
                      placeholder="Select required fields"
                      data={VCDB_FIELDS}
                      value={formData.required_vcdb_fields}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          required_vcdb_fields: value,
                        })
                      }
                      searchable
                      clearable
                      maxValues={9}
                    />
                    <MultiSelect
                      label="Optional VCDB Fields"
                      placeholder="Select optional fields"
                      data={VCDB_FIELDS.filter(
                        (field) =>
                          !formData.required_vcdb_fields.includes(field)
                      )}
                      value={formData.optional_vcdb_fields}
                      onChange={(value) =>
                        setFormData({
                          ...formData,
                          optional_vcdb_fields: value,
                        })
                      }
                      searchable
                      clearable
                    />
                  </Group>

                  <Group justify="flex-end" mt="md">
                    <Button
                      variant="light"
                      onClick={handleUpdate}
                      loading={submitting}
                      size="sm"
                      color="blue"
                    >
                      Save Fitment Configuration
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="products" pt="md">
                <Stack gap="md">
                  <Text fw={500} size="lg">
                    Product Configuration
                  </Text>

                  <MultiSelect
                    label="Required Product Fields"
                    placeholder="Select required product fields"
                    data={REQUIRED_PRODUCT_FIELDS}
                    value={formData.required_product_fields}
                    onChange={(value) =>
                      setFormData({
                        ...formData,
                        required_product_fields: value,
                      })
                    }
                    searchable
                    clearable
                  />

                  <Divider />
                  <Text fw={500}>Additional Attributes</Text>

                  <Accordion variant="contained">
                    <Accordion.Item value="attributes">
                      <Accordion.Control>
                        <Group>
                          <Text>Define Additional Attributes</Text>
                          <Badge size="sm">
                            {formData.additional_attributes.length}
                          </Badge>
                        </Group>
                      </Accordion.Control>
                      <Accordion.Panel>
                        <Stack gap="md">
                          {formData.additional_attributes.map((attr, index) => (
                            <Paper key={index} p="md" withBorder>
                              <Grid>
                                <Grid.Col span={4}>
                                  <TextInput
                                    label="Attribute Name"
                                    placeholder="e.g., Material, Color"
                                    value={attr.name}
                                    onChange={(e) => {
                                      const newAttrs = [
                                        ...formData.additional_attributes,
                                      ];
                                      newAttrs[index] = {
                                        ...attr,
                                        name: e.target.value,
                                      };
                                      setFormData({
                                        ...formData,
                                        additional_attributes: newAttrs,
                                      });
                                    }}
                                  />
                                </Grid.Col>
                                <Grid.Col span={4}>
                                  <TextInput
                                    label="Attribute Value"
                                    placeholder="e.g., Steel, Red"
                                    value={attr.value}
                                    onChange={(e) => {
                                      const newAttrs = [
                                        ...formData.additional_attributes,
                                      ];
                                      newAttrs[index] = {
                                        ...attr,
                                        value: e.target.value,
                                      };
                                      setFormData({
                                        ...formData,
                                        additional_attributes: newAttrs,
                                      });
                                    }}
                                  />
                                </Grid.Col>
                                <Grid.Col span={3}>
                                  <TextInput
                                    label="Unit of Measure"
                                    placeholder="e.g., lbs, inches"
                                    value={attr.uom}
                                    onChange={(e) => {
                                      const newAttrs = [
                                        ...formData.additional_attributes,
                                      ];
                                      newAttrs[index] = {
                                        ...attr,
                                        uom: e.target.value,
                                      };
                                      setFormData({
                                        ...formData,
                                        additional_attributes: newAttrs,
                                      });
                                    }}
                                  />
                                </Grid.Col>
                                <Grid.Col span={1}>
                                  <Group justify="center" mt="xl">
                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      onClick={() => {
                                        const newAttrs =
                                          formData.additional_attributes.filter(
                                            (_, i) => i !== index
                                          );
                                        setFormData({
                                          ...formData,
                                          additional_attributes: newAttrs,
                                        });
                                      }}
                                    >
                                      <IconTrash size={16} />
                                    </ActionIcon>
                                  </Group>
                                </Grid.Col>
                              </Grid>
                              <Group mt="sm">
                                <Checkbox
                                  label="Entity Specific"
                                  checked={attr.is_entity_specific}
                                  onChange={(e) => {
                                    const newAttrs = [
                                      ...formData.additional_attributes,
                                    ];
                                    newAttrs[index] = {
                                      ...attr,
                                      is_entity_specific:
                                        e.currentTarget.checked,
                                    };
                                    setFormData({
                                      ...formData,
                                      additional_attributes: newAttrs,
                                    });
                                  }}
                                />
                              </Group>
                            </Paper>
                          ))}
                          <Button
                            variant="light"
                            leftSection={<IconPlus size={16} />}
                            onClick={() => {
                              setFormData({
                                ...formData,
                                additional_attributes: [
                                  ...formData.additional_attributes,
                                  {
                                    name: "",
                                    value: "",
                                    uom: "",
                                    is_entity_specific: false,
                                  },
                                ],
                              });
                            }}
                            size="sm"
                            color="blue"
                          >
                            Add Attribute
                          </Button>
                        </Stack>
                      </Accordion.Panel>
                    </Accordion.Item>
                  </Accordion>

                  <Group justify="flex-end" mt="md">
                    <Button
                      variant="light"
                      onClick={handleUpdate}
                      loading={submitting}
                      size="sm"
                      color="blue"
                    >
                      Save Product Configuration
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>
            </Tabs>
          </Card>

          {/* Action Buttons */}
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <Group justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                Click "Use This Entity" to switch to this entity and return to
                the dashboard
              </Text>
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleUseThisEntity}
                loading={submitting}
                size="md"
                color="blue"
              >
                Use This Entity
              </Button>
            </Group>
          </Card>
        </Stack>
      </Container>
    </div>
  );
};

export default EditEntityStandalone;
