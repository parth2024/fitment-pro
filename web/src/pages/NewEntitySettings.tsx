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
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { vcdbService } from "../api/services";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

interface Entity {
  id: string;
  name: string;
  slug: string | null;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  user_count: number;
  created_at: string;
  fitment_settings?: Record<string, any>;
  ai_instructions?: string;
  contact_email?: string;
  contact_phone?: string;
  company_address?: string;
}

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

// Removed VCDBCategory interface as categories list now comes solely from VehicleTypeGroups API

const VCDB_REQUIRED_FIELDS = [
  "Year (model year)",
  "Make (manufacturer, e.g., Ford, Toyota)",
  "Model (e.g., F-150, Camry)",
  "Submodel / Trim (e.g., XLT, Limited, SE)",
  "Body Type (e.g., Sedan, SUV, Pickup)",
  "Body Number of Doors (2-door, 4-door, etc.)",
  "Drive Type (FWD, RWD, AWD, 4WD)",
  "Fuel Type (Gasoline, Diesel, Hybrid, Electric)",
];

const VCDB_OPTIONAL_FIELDS = [
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

const NewEntitySettings: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showSuccess, showError } = useProfessionalToast();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vehicleTypeGroups, setVehicleTypeGroups] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);

  // Default required VCDB fields
  const DEFAULT_REQUIRED_VCDB_FIELDS = [
    "Year (model year)",
    "Make (manufacturer, e.g., Ford, Toyota)",
    "Model (e.g., F-150, Camry)",
    "Submodel / Trim (e.g., XLT, Limited, SE)",
    "Fuel Type (Gasoline, Diesel, Hybrid, Electric)",
    "Body Number of Doors (2-door, 4-door, etc.)",
    "Drive Type (FWD, RWD, AWD, 4WD)",
    "Body Type (e.g., Sedan, SUV, Pickup)",
  ];

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
    required_vcdb_fields: DEFAULT_REQUIRED_VCDB_FIELDS,
    optional_vcdb_fields: [],
    required_product_fields: [],
    additional_attributes: [],
  });

  // Fetch entity data
  useEffect(() => {
    const fetchEntity = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await apiClient.get(`/api/tenants/${id}/`);
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
      } catch (error) {
        setError("Failed to load entity data");
        showError("Failed to load entity data");
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
      const vtgResp = await vcdbService.getVehicleTypeGroups();
      const vtg = (vtgResp.data?.results || vtgResp.data || []).map(
        (g: any) => ({
          value: `vtg:${g.vehicle_type_group_id}`,
          label: `Vehicle Type Group: ${g.vehicle_type_group_name}`,
        })
      );
      setVehicleTypeGroups(vtg);
    } catch (error) {
      showError("Failed to load VCDB categories");
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

      // Update localStorage with the updated entity data
      localStorage.setItem("current_entity", JSON.stringify(response.data));

      showSuccess("Entity settings updated successfully");
    } catch (error) {
      showError("Failed to update entity settings");
    } finally {
      setSubmitting(false);
    }
  };

  const handleFinishAndSelectEntity = async () => {
    if (!entity) return;

    try {
      setSubmitting(true);

      // First save any changes
      await handleUpdate();

      // Switch to the new entity
      await apiClient.post(`/api/tenants/switch/${entity.id}/`);

      // Update localStorage
      localStorage.setItem("current_entity", JSON.stringify(entity));

      // Dispatch event to notify other components
      const entityChangeEvent = new CustomEvent("entityChanged", {
        detail: { entity, entityId: entity.id },
      });
      window.dispatchEvent(entityChangeEvent);

      showSuccess(`Switched to ${entity.name}. Welcome to your new entity!`);

      // Navigate to analytics/dashboard
      navigate("/analytics");
    } catch (error) {
      showError("Failed to switch to entity");
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading entity settings...</Text>
        </Group>
      </Container>
    );
  }

  if (error || !entity) {
    return (
      <Container size="xl" py="xl">
        <Alert title="Error" color="red">
          {error || "Entity not found"}
        </Alert>
        <Button
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => navigate("/entities")}
          mt="md"
          size="sm"
          variant="subtle"
          style={{ fontSize: "14px" }}
        >
          Back to Entities
        </Button>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <Title order={2}>Configure Entity: {entity.name}</Title>
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

        <Alert color="blue" title="Welcome! Complete your entity setup">
          <Text size="sm">
            Configure your entity settings below. You can skip any section and
            come back later by editing the entity from the Manage Entities page.
          </Text>
        </Alert>

        {/* Configuration Form with Tabs */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Tabs
            defaultValue="basic"
            variant="outline"
            onChange={(value) => value}
          >
            <Tabs.List>
              <Tabs.Tab value="basic" leftSection={<IconDatabase size={16} />}>
                Basic Info
              </Tabs.Tab>
              <Tabs.Tab value="fitments" leftSection={<IconCar size={16} />}>
                VCDB Configuration
              </Tabs.Tab>
              <Tabs.Tab
                value="products"
                leftSection={<IconDatabase size={16} />}
              >
                Products Configuration
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
                    setFormData({ ...formData, contact_email: e.target.value })
                  }
                />
                <TextInput
                  label="Contact Phone"
                  placeholder="Enter contact phone"
                  value={formData.contact_phone}
                  onChange={(e) =>
                    setFormData({ ...formData, contact_phone: e.target.value })
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
                    variant="outline"
                    onClick={handleUpdate}
                    loading={submitting}
                    size="md"
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
                  data={vehicleTypeGroups}
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
                    data={VCDB_REQUIRED_FIELDS}
                    value={formData.required_vcdb_fields}
                    onChange={(value) =>
                      setFormData({ ...formData, required_vcdb_fields: value })
                    }
                    searchable
                    clearable
                    maxValues={9}
                  />
                  <MultiSelect
                    label="Optional VCDB Fields"
                    placeholder="Select optional fields"
                    data={VCDB_OPTIONAL_FIELDS}
                    value={formData.optional_vcdb_fields}
                    onChange={(value) =>
                      setFormData({ ...formData, optional_vcdb_fields: value })
                    }
                    searchable
                    clearable
                  />
                </Group>

                <Group justify="flex-end" mt="md">
                  <Button
                    variant="outline"
                    onClick={handleUpdate}
                    loading={submitting}
                    size="md"
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
                    setFormData({ ...formData, required_product_fields: value })
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
                                    is_entity_specific: e.currentTarget.checked,
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
                          variant="outline"
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
                        >
                          Add Attribute
                        </Button>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>

                <Group justify="flex-end" mt="md">
                  <Button
                    variant="outline"
                    onClick={handleUpdate}
                    loading={submitting}
                    size="md"
                  >
                    Save
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
              You can continue configuring this entity later from Manage
              Entities
            </Text>
            <Group>
              <Button
                variant="outline"
                onClick={() => navigate("/entities")}
                size="md"
              >
                Skip & Go to Entities
              </Button>
              <Button
                leftSection={<IconCheck size={16} />}
                onClick={handleFinishAndSelectEntity}
                loading={submitting}
                size="md"
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                }}
              >
                Finish & Use This Entity
              </Button>
            </Group>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
};

export default NewEntitySettings;
