import React, { useState } from "react";
import {
  Container,
  Title,
  Card,
  Table,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Modal,
  TextInput,
  Textarea,
  Switch,
  Stack,
  Alert,
  Loader,
  Grid,
  Paper,
  Divider,
  Tabs,
  MultiSelect,
  NumberInput,
  Tooltip,
  FileInput,
  Progress,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconUsers,
  IconSettings,
  IconRefresh,
  IconInfoCircle,
  IconDatabase,
  IconFileText,
  IconBrain,
  IconUpload,
  IconDownload,
} from "@tabler/icons-react";
import { useEntity } from "../hooks/useEntity";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

interface Entity {
  id: string;
  name: string;
  slug?: string;
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
  slug?: string;
  description: string;
  contact_email: string;
  contact_phone: string;
  company_address: string;
  ai_instructions: string;
  is_active: boolean;
  is_default: boolean;
}

// VCDB Options
const VCDB_OPTIONS = [
  "Light Duty & Powersports, North America",
  "Medium & Heavy Duty Trucks (Classes 4–8), North America",
  "Off-Highway & Equipment, North America",
];

// Required VCDB Fields (first 8 + engine type)
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

// Product Required Fields
const PRODUCT_REQUIRED_FIELDS = [
  "Part Number",
  "Part Terminology Name",
  "PTID",
  "Parent/Child",
];

interface VCDBConfiguration {
  selectedVCDB: string[];
  requiredFields: string[];
  optionalFields: string[];
  fieldSequence: { [key: string]: number };
  defaultFitmentMode: "manual" | "ai";
}

interface ProductConfiguration {
  requiredFields: string[];
  additionalAttributes: Array<{
    name: string;
    value: string;
    uom: string;
    isEntitySpecific: boolean;
  }>;
  mappingMode: "manual" | "ai";
}

interface UploadedFile {
  id: string;
  filename: string;
  uploadDate: string;
  status: "processing" | "completed" | "error";
  size: string;
}

const EntityManagementEnhanced: React.FC = () => {
  const { entities, loading, error, refreshEntities } = useEntity();
  const [selectedEntity, setSelectedEntity] = useState<Entity | null>(null);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
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
  });
  const [submitting, setSubmitting] = useState(false);

  // Fitments and Products Configuration State
  const [vcdbConfig, setVcdbConfig] = useState<VCDBConfiguration>({
    selectedVCDB: [],
    requiredFields: [],
    optionalFields: [],
    fieldSequence: {},
    defaultFitmentMode: "manual",
  });

  const [productConfig, setProductConfig] = useState<ProductConfiguration>({
    requiredFields: [],
    additionalAttributes: [],
    mappingMode: "manual",
  });

  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleCreate = async () => {
    try {
      setSubmitting(true);
      await apiClient.post("/api/tenants/", formData);
      notifications.show({
        title: "Success",
        message: "Entity created successfully",
        color: "green",
      });
      setIsCreateModalOpen(false);
      resetForm();
      await refreshEntities();
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

  const handleEdit = async () => {
    if (!selectedEntity) return;

    try {
      setSubmitting(true);
      await apiClient.put(`/api/tenants/${selectedEntity.id}/`, formData);
      notifications.show({
        title: "Success",
        message: "Entity updated successfully",
        color: "green",
      });
      setIsEditModalOpen(false);
      resetForm();
      await refreshEntities();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update entity",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (entity: any) => {
    if (!confirm(`Are you sure you want to delete "${entity.name}"?`)) return;

    try {
      await apiClient.delete(`/api/tenants/${entity.id}/`);
      notifications.show({
        title: "Success",
        message: "Entity deleted successfully",
        color: "green",
      });
      await refreshEntities();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete entity",
        color: "red",
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: "",
      slug: "",
      description: "",
      contact_email: "",
      contact_phone: "",
      company_address: "",
      ai_instructions: "",
      is_active: true,
      is_default: false,
    });
  };

  const openEditModal = (entity: any) => {
    setSelectedEntity(entity);
    setFormData({
      name: entity.name,
      slug: entity.slug || "",
      description: entity.description || "",
      contact_email: entity.contact_email || "",
      contact_phone: entity.contact_phone || "",
      company_address: entity.company_address || "",
      ai_instructions: entity.ai_instructions || "",
      is_active: entity.is_active,
      is_default: entity.is_default,
    });
    setIsEditModalOpen(true);
  };

  const openCreateModal = () => {
    resetForm();
    setIsCreateModalOpen(true);
  };

  // Handle VCDB field sequence changes
  const handleFieldSequenceChange = (field: string, sequence: number) => {
    setVcdbConfig((prev) => ({
      ...prev,
      fieldSequence: {
        ...prev.fieldSequence,
        [field]: sequence,
      },
    }));
  };

  // Handle additional attribute changes
  const handleAttributeChange = (
    index: number,
    field: string,
    value: string | boolean
  ) => {
    setProductConfig((prev) => ({
      ...prev,
      additionalAttributes: prev.additionalAttributes.map((attr, i) =>
        i === index ? { ...attr, [field]: value } : attr
      ),
    }));
  };

  const addAttribute = () => {
    setProductConfig((prev) => ({
      ...prev,
      additionalAttributes: [
        ...prev.additionalAttributes,
        { name: "", value: "", uom: "", isEntitySpecific: false },
      ],
    }));
  };

  const removeAttribute = (index: number) => {
    setProductConfig((prev) => ({
      ...prev,
      additionalAttributes: prev.additionalAttributes.filter(
        (_, i) => i !== index
      ),
    }));
  };

  // Handle file upload
  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              filename: file.name,
              uploadDate: new Date().toISOString(),
              status: "completed",
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            },
          ]);
          notifications.show({
            title: "Success",
            message: "File uploaded successfully!",
            color: "green",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading entities...</Text>
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <Group justify="space-between" align="center">
          <Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="outline"
              onClick={refreshEntities}
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={openCreateModal}
            >
              Create Entity
            </Button>
          </Group>
        </Group>

        <Grid>
          <Grid.Col span={8}>
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Title order={3} mb="md">
                Entities
              </Title>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Name</Table.Th>
                    <Table.Th>URL</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Users</Table.Th>
                    <Table.Th>Created</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entities.map((entity) => (
                    <Table.Tr key={entity.id}>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text fw={500}>{entity.name}</Text>
                          {entity.description && (
                            <Text size="sm" c="dimmed">
                              {entity.description}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {entity.slug || "—"}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <Badge
                            color={entity.is_active ? "green" : "red"}
                            size="sm"
                          >
                            {entity.is_active ? "Active" : "Inactive"}
                          </Badge>
                          {entity.is_default && (
                            <Badge color="blue" size="sm">
                              Default
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <IconUsers size={16} />
                          <Text size="sm">{entity.user_count}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {new Date(entity.created_at).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => openEditModal(entity)}
                          >
                            <IconEdit size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDelete(entity)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Card>
          </Grid.Col>

          <Grid.Col span={4}>
            <Stack gap="md">
              <Paper shadow="sm" radius="md" withBorder p="md">
                <Group gap="md" mb="sm">
                  <IconSettings size={20} />
                  <Text fw={500}>Quick Stats</Text>
                </Group>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm">Total Entities</Text>
                    <Text fw={500}>{entities.length}</Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Active Entities</Text>
                    <Text fw={500}>
                      {entities.filter((e) => e.is_active).length}
                    </Text>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm">Total Users</Text>
                    <Text fw={500}>
                      {entities.reduce((sum, e) => sum + e.user_count, 0)}
                    </Text>
                  </Group>
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>

        {/* Create Modal */}
        <Modal
          opened={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          title="Create New Entity"
          size="lg"
        >
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
                setFormData({ ...formData, company_address: e.target.value })
              }
              rows={3}
            />
            <Divider />
            <Textarea
              label="AI Instructions"
              placeholder="Enter default AI instructions for this entity"
              value={formData.ai_instructions}
              onChange={(e) =>
                setFormData({ ...formData, ai_instructions: e.target.value })
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
            <Group justify="flex-end">
              <Button
                variant="outline"
                onClick={() => setIsCreateModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleCreate} loading={submitting}>
                Create Entity
              </Button>
            </Group>
          </Stack>
        </Modal>

        {/* Edit Modal with Tabs */}
        <Modal
          opened={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Entity"
          size="xl"
        >
          <Tabs defaultValue="basic">
            <Tabs.List>
              <Tabs.Tab value="basic" leftSection={<IconSettings size={16} />}>
                Basic Info
              </Tabs.Tab>
              <Tabs.Tab
                value="fitments"
                leftSection={<IconDatabase size={16} />}
              >
                Fitments
              </Tabs.Tab>
              <Tabs.Tab
                value="products"
                leftSection={<IconFileText size={16} />}
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
                  disabled
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
                <Divider />
                <Textarea
                  label="AI Instructions"
                  placeholder="Enter default AI instructions for this entity"
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
              <Stack gap="lg">
                {/* VCDB Selection */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>VCDB Selection</Title>
                      <Tooltip label="Select the VCDB categories you want to work with">
                        <ActionIcon variant="subtle" color="blue">
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <MultiSelect
                      label="VCDB Categories"
                      placeholder="Select VCDB categories"
                      data={VCDB_OPTIONS}
                      value={vcdbConfig.selectedVCDB}
                      onChange={(value) =>
                        setVcdbConfig((prev) => ({
                          ...prev,
                          selectedVCDB: value,
                        }))
                      }
                      searchable
                      clearable
                    />
                  </Stack>
                </Card>

                {/* Required VCDB Fields */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>Required VCDB Fitment Fields</Title>
                      <Tooltip label="These fields are mandatory and will be sequenced">
                        <ActionIcon variant="subtle" color="blue">
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <MultiSelect
                      label="Required Fields"
                      placeholder="Select required fields"
                      data={REQUIRED_VCDB_FIELDS}
                      value={vcdbConfig.requiredFields}
                      onChange={(value) =>
                        setVcdbConfig((prev) => ({
                          ...prev,
                          requiredFields: value,
                        }))
                      }
                      searchable
                      clearable
                    />

                    {/* Field Sequencing */}
                    {vcdbConfig.requiredFields.length > 0 && (
                      <Stack gap="sm">
                        <Text size="sm" fw={500}>
                          Field Sequence
                        </Text>
                        {vcdbConfig.requiredFields.map((field, index) => (
                          <Group key={field} justify="space-between">
                            <Text size="sm">{field}</Text>
                            <NumberInput
                              size="sm"
                              w={80}
                              min={1}
                              max={vcdbConfig.requiredFields.length}
                              value={
                                vcdbConfig.fieldSequence[field] || index + 1
                              }
                              onChange={(value) =>
                                handleFieldSequenceChange(
                                  field,
                                  Number(value) || 1
                                )
                              }
                            />
                          </Group>
                        ))}
                      </Stack>
                    )}
                  </Stack>
                </Card>

                {/* Optional VCDB Fields */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>Optional VCDB Fields</Title>
                      <Tooltip label="These fields are optional and support alpha matching">
                        <ActionIcon variant="subtle" color="blue">
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <MultiSelect
                      label="Optional Fields"
                      placeholder="Select optional fields"
                      data={OPTIONAL_VCDB_FIELDS}
                      value={vcdbConfig.optionalFields}
                      onChange={(value) =>
                        setVcdbConfig((prev) => ({
                          ...prev,
                          optionalFields: value,
                        }))
                      }
                      searchable
                      clearable
                    />
                  </Stack>
                </Card>

                {/* Default Fitment Application Toggle */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>Default Fitment Application</Title>
                      <Tooltip label="Choose between manual or AI-powered fitment application">
                        <ActionIcon variant="subtle" color="blue">
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <Switch
                      label={
                        vcdbConfig.defaultFitmentMode === "ai"
                          ? "AI Mode"
                          : "Manual Mode"
                      }
                      description={
                        vcdbConfig.defaultFitmentMode === "ai"
                          ? "AI will automatically apply fitments based on learned patterns"
                          : "Manual application requires user intervention for each fitment"
                      }
                      checked={vcdbConfig.defaultFitmentMode === "ai"}
                      onChange={(event) =>
                        setVcdbConfig((prev) => ({
                          ...prev,
                          defaultFitmentMode: event.currentTarget.checked
                            ? "ai"
                            : "manual",
                        }))
                      }
                      thumbIcon={
                        vcdbConfig.defaultFitmentMode === "ai" ? (
                          <IconBrain size={12} />
                        ) : (
                          <IconUsers size={12} />
                        )
                      }
                    />
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="products" pt="md">
              <Stack gap="lg">
                {/* Product Required Fields */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>Product Required Fields</Title>
                      <Tooltip label="These fields are mandatory for product identification">
                        <ActionIcon variant="subtle" color="blue">
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <MultiSelect
                      label="Required Fields"
                      placeholder="Select required product fields"
                      data={PRODUCT_REQUIRED_FIELDS}
                      value={productConfig.requiredFields}
                      onChange={(value) =>
                        setProductConfig((prev) => ({
                          ...prev,
                          requiredFields: value,
                        }))
                      }
                      searchable
                      clearable
                    />
                  </Stack>
                </Card>

                {/* Additional Attributes */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Group>
                        <Title order={4}>Additional Attributes</Title>
                        <Tooltip label="Define custom attributes for products">
                          <ActionIcon variant="subtle" color="blue">
                            <IconInfoCircle size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                      <Button
                        leftSection={<IconPlus size={16} />}
                        onClick={addAttribute}
                        size="sm"
                      >
                        Add Attribute
                      </Button>
                    </Group>

                    {productConfig.additionalAttributes.map((attr, index) => (
                      <Card key={index} withBorder p="md">
                        <Grid>
                          <Grid.Col span={3}>
                            <TextInput
                              label="Attribute Name"
                              placeholder="Enter attribute name"
                              value={attr.name}
                              onChange={(event) =>
                                handleAttributeChange(
                                  index,
                                  "name",
                                  event.currentTarget.value
                                )
                              }
                            />
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <TextInput
                              label="Attribute Value"
                              placeholder="Enter attribute value"
                              value={attr.value}
                              onChange={(event) =>
                                handleAttributeChange(
                                  index,
                                  "value",
                                  event.currentTarget.value
                                )
                              }
                            />
                          </Grid.Col>
                          <Grid.Col span={3}>
                            <TextInput
                              label="Unit of Measure (UoM)"
                              placeholder="Enter UoM"
                              value={attr.uom}
                              onChange={(event) =>
                                handleAttributeChange(
                                  index,
                                  "uom",
                                  event.currentTarget.value
                                )
                              }
                            />
                          </Grid.Col>
                          <Grid.Col span={2}>
                            <Stack gap="xs">
                              <Text size="sm" fw={500}>
                                Scope
                              </Text>
                              <Switch
                                label={
                                  attr.isEntitySpecific
                                    ? "Entity Specific"
                                    : "Global"
                                }
                                checked={attr.isEntitySpecific}
                                onChange={(event) =>
                                  handleAttributeChange(
                                    index,
                                    "isEntitySpecific",
                                    event.currentTarget.checked
                                  )
                                }
                              />
                            </Stack>
                          </Grid.Col>
                          <Grid.Col span={1}>
                            <Stack gap="xs">
                              <Text size="sm" fw={500}>
                                Actions
                              </Text>
                              <ActionIcon
                                color="red"
                                variant="subtle"
                                onClick={() => removeAttribute(index)}
                              >
                                <IconTrash size={16} />
                              </ActionIcon>
                            </Stack>
                          </Grid.Col>
                        </Grid>
                      </Card>
                    ))}
                  </Stack>
                </Card>

                {/* Mapping Mode Toggle */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>Field Mapping Mode</Title>
                      <Tooltip label="Choose between manual mapping or AI-powered field matching">
                        <ActionIcon variant="subtle" color="blue">
                          <IconInfoCircle size={16} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                    <Switch
                      label={
                        productConfig.mappingMode === "ai"
                          ? "AI Match Fields"
                          : "Manually Map"
                      }
                      description={
                        productConfig.mappingMode === "ai"
                          ? "AI will automatically match fields from uploaded data"
                          : "Manual mapping requires user to specify field relationships"
                      }
                      checked={productConfig.mappingMode === "ai"}
                      onChange={(event) =>
                        setProductConfig((prev) => ({
                          ...prev,
                          mappingMode: event.currentTarget.checked
                            ? "ai"
                            : "manual",
                        }))
                      }
                      thumbIcon={
                        productConfig.mappingMode === "ai" ? (
                          <IconBrain size={12} />
                        ) : (
                          <IconSettings size={12} />
                        )
                      }
                    />
                  </Stack>
                </Card>

                {/* File Upload */}
                <Card withBorder>
                  <Stack gap="md">
                    <Title order={4}>Upload File</Title>
                    <FileInput
                      label="Select file to upload"
                      placeholder="Choose file"
                      leftSection={<IconUpload size={16} />}
                      onChange={handleFileUpload}
                      accept=".csv,.xlsx,.xls"
                    />
                    {uploading && (
                      <Stack gap="sm">
                        <Text size="sm">Uploading file...</Text>
                        <Progress value={uploadProgress} animated />
                      </Stack>
                    )}
                  </Stack>
                </Card>

                {/* Upload History */}
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Title order={4}>Upload History</Title>
                      <Badge color="blue" variant="light">
                        {uploadedFiles.length} files
                      </Badge>
                    </Group>

                    {uploadedFiles.length === 0 ? (
                      <Alert icon={<IconFileText size={16} />} color="gray">
                        No files uploaded yet
                      </Alert>
                    ) : (
                      <Table>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Filename</Table.Th>
                            <Table.Th>Upload Date</Table.Th>
                            <Table.Th>Size</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Actions</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {uploadedFiles.map((file) => (
                            <Table.Tr key={file.id}>
                              <Table.Td>
                                <Group gap="sm">
                                  <IconFileText size={16} />
                                  <Text size="sm">{file.filename}</Text>
                                </Group>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">
                                  {new Date(
                                    file.uploadDate
                                  ).toLocaleDateString()}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm">{file.size}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={
                                    file.status === "completed"
                                      ? "green"
                                      : file.status === "processing"
                                      ? "yellow"
                                      : "red"
                                  }
                                  variant="light"
                                >
                                  {file.status}
                                </Badge>
                              </Table.Td>
                              <Table.Td>
                                <Group gap="xs">
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="blue"
                                  >
                                    <IconDownload size={14} />
                                  </ActionIcon>
                                  <ActionIcon
                                    size="sm"
                                    variant="subtle"
                                    color="red"
                                  >
                                    <IconTrash size={14} />
                                  </ActionIcon>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Stack>
                </Card>
              </Stack>
            </Tabs.Panel>
          </Tabs>

          <Group justify="flex-end" mt="xl">
            <Button
              variant="outline"
              onClick={() => setIsEditModalOpen(false)}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button onClick={handleEdit} loading={submitting}>
              Update Entity
            </Button>
          </Group>
        </Modal>
      </Stack>
    </Container>
  );
};

export default EntityManagementEnhanced;
