import React, { useState } from "react";
import {
  Container,
  Title,
  Card,
  Button,
  Group,
  Text,
  TextInput,
  Textarea,
  Switch,
  Stack,
  Grid,
  Paper,
  Divider,
  Tabs,
  MultiSelect,
  Select,
  Checkbox,
  FileInput,
  Accordion,
  ActionIcon,
  Badge,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconCar,
  IconDatabase,
  IconArrowLeft,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

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
  // Fitments Configuration
  vcdb_categories: string[];
  required_vcdb_fields: string[];
  optional_vcdb_fields: string[];
  // Products Configuration
  required_product_fields: string[];
  additional_attributes: Array<{
    name: string;
    value: string;
    uom: string;
    is_entity_specific: boolean;
  }>;
  uploaded_files: File[];
}

// VCDB Field Options
const VCDB_CATEGORIES = [
  "Light Duty & Powersports, North America",
  "Medium & Heavy Duty Trucks (Classes 4–8), North America",
  "Off-Highway & Equipment, North America",
];

const REQUIRED_VCDB_FIELDS = [
  "Year (model year)",
  "Make (manufacturer, e.g., Ford, Toyota)",
  "Model (e.g., F-150, Camry)",
  "Submodel / Trim (e.g., XLT, Limited, SE)",
  "Body Type (e.g., Sedan, SUV, Pickup)",
  "Body Number of Doors (2-door, 4-door, etc.)",
  "Drive Type (FWD, RWD, AWD, 4WD)",
  "Fuel Type (Gasoline, Diesel, Hybrid, Electric)",
  "Engine Type (engine code or family ID)",
];

// Optional VCDB Fields
const OPTIONAL_VCDB_FIELDS = [
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

const CreateEntity: React.FC = () => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

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
    // Fitments Configuration
    vcdb_categories: [],
    required_vcdb_fields: [],
    optional_vcdb_fields: [],
    // Products Configuration
    required_product_fields: [],
    additional_attributes: [],
    uploaded_files: [],
  });

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      // Only send basic info for creation
      const basicInfo = {
        name: formData.name,
        slug: formData.slug,
        description: formData.description,
        contact_email: formData.contact_email,
        contact_phone: formData.contact_phone,
        company_address: formData.company_address,
        ai_instructions: formData.ai_instructions,
        is_active: formData.is_active,
        is_default: formData.is_default,
        default_fitment_method: formData.default_fitment_method,
      };
      await apiClient.post("/api/tenants/", basicInfo);
      notifications.show({
        title: "Success",
        message: "Entity created successfully",
        color: "green",
      });
      navigate("/entities");
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to create entity",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <Button
              leftSection={<IconArrowLeft size={16} />}
              variant="outline"
              onClick={() => navigate("/entities")}
            >
              Back to Entities
            </Button>
            <Title order={2}>Create New Entity</Title>
          </Group>
        </Group>

        {/* Create Form with Tabs */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Tabs defaultValue="basic" variant="outline">
            <Tabs.List>
              <Tabs.Tab value="basic" leftSection={<IconDatabase size={16} />}>
                Basic Info
              </Tabs.Tab>
              <Tabs.Tab
                value="fitments"
                leftSection={<IconCar size={16} />}
                disabled
              >
                Fitments
              </Tabs.Tab>
              <Tabs.Tab
                value="products"
                leftSection={<IconDatabase size={16} />}
                disabled
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
                  placeholder="Enter entity URL (optional)"
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
                  data={VCDB_CATEGORIES}
                  value={formData.vcdb_categories}
                  onChange={(value) =>
                    setFormData({ ...formData, vcdb_categories: value })
                  }
                  searchable
                  clearable
                />

                <Group grow>
                  <MultiSelect
                    label="Required VCDB Fields"
                    placeholder="Select required fields (first 8 + engine type)"
                    data={REQUIRED_VCDB_FIELDS}
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
                    data={OPTIONAL_VCDB_FIELDS}
                    value={formData.optional_vcdb_fields}
                    onChange={(value) =>
                      setFormData({ ...formData, optional_vcdb_fields: value })
                    }
                    searchable
                    clearable
                  />
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
                        >
                          Add Attribute
                        </Button>
                      </Stack>
                    </Accordion.Panel>
                  </Accordion.Item>
                </Accordion>

                <FileInput
                  label="Upload Product Files"
                  placeholder="Upload product data files"
                  multiple
                  accept=".csv,.xlsx,.json"
                  value={formData.uploaded_files}
                  onChange={(files) =>
                    setFormData({ ...formData, uploaded_files: files || [] })
                  }
                />
              </Stack>
            </Tabs.Panel>
          </Tabs>

          <Group justify="flex-end" mt="xl">
            <Button
              variant="outline"
              onClick={() => navigate("/entities")}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={submitting}>
              Create Entity
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
};

export default CreateEntity;
