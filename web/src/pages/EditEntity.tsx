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
  Table,
  Progress,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconCar,
  IconDatabase,
  IconArrowLeft,
  IconClock,
} from "@tabler/icons-react";
import { useParams, useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

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

interface VCDBCategory {
  id: string;
  name: string;
  version: string;
  is_valid: boolean;
  record_count: number;
}

interface FitmentJob {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  started_at?: string;
  finished_at?: string;
  result?: any;
  params?: any;
  progress?: number;
  duration?: string;
}

// VCDB Field Options

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

const EditEntity: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // New state for VCDB categories and jobs
  const [vcdbCategories, setVcdbCategories] = useState<VCDBCategory[]>([]);
  const [fitmentJobs, setFitmentJobs] = useState<FitmentJob[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [historyTabLoaded, setHistoryTabLoaded] = useState(false);

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

  // Fetch entity data
  useEffect(() => {
    const fetchEntity = async () => {
      if (!id) return;

      try {
        setLoading(true);
        const response = await apiClient.get(`/api/tenants/${id}/`);
        const entityData = response.data;
        setEntity(entityData);

        // Populate form with entity data
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
          // Fitments Configuration - use fitment_settings if available
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
          // Products Configuration - read from fitment_settings
          required_product_fields:
            fitmentSettings.required_product_fields ||
            entityData.required_product_fields ||
            [],
          additional_attributes:
            fitmentSettings.additional_attributes ||
            entityData.additional_attributes ||
            [],
          uploaded_files: [],
        });
      } catch (error) {
        setError("Failed to load entity data");
        notifications.show({
          title: "Error",
          message: "Failed to load entity data",
          color: "red",
        });
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
        `/api/vcdb-categories/categories/?tenant_id=${id}`
      );
      setVcdbCategories(response.data);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load VCDB categories",
        color: "red",
      });
    } finally {
      setLoadingCategories(false);
    }
  };

  // Fetch fitment jobs
  const fetchFitmentJobs = async () => {
    if (!id) return;

    try {
      setLoadingJobs(true);
      const response = await apiClient.get(
        `/api/data-uploads/job-history/?tenant_id=${id}`
      );
      const newJobs = response.data.job_history || [];

      // Check for newly completed jobs and show notifications
      newJobs.forEach((newJob: any) => {
        const existingJob = fitmentJobs.find((job) => job.id === newJob.id);

        // If job status changed from pending/processing to completed
        if (
          existingJob &&
          ["pending", "processing"].includes(existingJob.status) &&
          ["failed", "completed", "completed_with_warnings"].includes(
            newJob.status
          )
        ) {
          if (
            newJob.status === "failed" &&
            newJob.result?.fitments_failed > 0
          ) {
            notifications.show({
              title: "Fitments Already Exist",
              message:
                newJob.result.error_message ||
                `All ${newJob.result.fitments_failed} fitments already exist. No new fitments were created.`,
              color: "orange",
              autoClose: 10000,
            });
          } else if (
            newJob.status === "completed_with_warnings" &&
            newJob.result?.fitments_failed > 0
          ) {
            notifications.show({
              title: "Fitments Created with Warnings",
              message:
                newJob.result.error_message ||
                `Created ${newJob.result.fitments_created} new fitments, but ${newJob.result.fitments_failed} already existed.`,
              color: "yellow",
              autoClose: 10000,
            });
          } else if (
            newJob.status === "completed" &&
            newJob.result?.fitments_created > 0
          ) {
            notifications.show({
              title: "Fitments Created Successfully",
              message: `Successfully created ${newJob.result.fitments_created} new fitments.`,
              color: "green",
              autoClose: 5000,
            });
          }
        }
      });

      setFitmentJobs(newJobs);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load fitment jobs",
        color: "red",
      });
    } finally {
      setLoadingJobs(false);
    }
  };

  // Load VCDB categories when component mounts
  useEffect(() => {
    if (id) {
      fetchVCDBCategories();
    }
  }, [id]);

  // Poll for job status updates every 3 seconds (only when history tab is loaded)
  useEffect(() => {
    if (!id || !historyTabLoaded) return;

    const interval = setInterval(() => {
      fetchFitmentJobs();
    }, 3000);

    return () => clearInterval(interval);
  }, [id, historyTabLoaded]);

  // Track previous job statuses to detect changes
  const [previousJobStatuses, setPreviousJobStatuses] = useState<
    Record<string, string>
  >({});

  // Show notifications for job status changes
  useEffect(() => {
    if (fitmentJobs.length > 0) {
      // Check all jobs for status changes
      fitmentJobs.forEach((job) => {
        const jobId = job.id;
        const currentStatus = job.status;
        const previousStatus = previousJobStatuses[jobId];

        // Only show notification if status changed to a completed state
        if (previousStatus && previousStatus !== currentStatus) {
          if (currentStatus === "failed" && job.result?.fitments_failed > 0) {
            notifications.show({
              title: "Fitments Already Exist",
              message:
                job.result.error_message ||
                `All ${job.result.fitments_failed} fitments already exist. No new fitments were created.`,
              color: "orange",
              autoClose: 10000,
            });
          } else if (
            currentStatus === "completed_with_warnings" &&
            job.result?.fitments_failed > 0
          ) {
            notifications.show({
              title: "Fitments Created with Warnings",
              message:
                job.result.error_message ||
                `Created ${job.result.fitments_created} new fitments, but ${job.result.fitments_failed} already existed.`,
              color: "yellow",
              autoClose: 10000,
            });
          } else if (
            currentStatus === "completed" &&
            job.result?.fitments_created > 0
          ) {
            notifications.show({
              title: "Fitments Created Successfully",
              message: `Successfully created ${job.result.fitments_created} new fitments.`,
              color: "green",
              autoClose: 5000,
            });
          }
        }
      });

      // Update previous statuses
      const newStatuses: Record<string, string> = {};
      fitmentJobs.forEach((job) => {
        newStatuses[job.id] = job.status;
      });
      setPreviousJobStatuses(newStatuses);
    }
  }, [fitmentJobs]);

  // Function to handle tab change and load history data when needed
  const handleTabChange = (value: string | null) => {
    if (value === "history" && !historyTabLoaded) {
      setHistoryTabLoaded(true);
      fetchFitmentJobs();
    }
  };

  const handleUpdate = async () => {
    if (!entity) return;

    try {
      setSubmitting(true);

      // Save all tenant data including fitment settings
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

      // Refresh entity data to get updated info
      const response = await apiClient.get(`/api/tenants/${entity.id}/`);
      setEntity(response.data);

      notifications.show({
        title: "Success",
        message: "Entity updated successfully",
        color: "green",
      });
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

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading entity...</Text>
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
          leftSection={<IconArrowLeft size={16} />}
          onClick={() => navigate("/entities")}
          mt="md"
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
            <Button
              leftSection={<IconArrowLeft size={16} />}
              variant="outline"
              onClick={() => navigate("/entities")}
            >
              Back to Entities
            </Button>
            <Title order={2}>Edit Entity: {entity.name}</Title>
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

        {/* Edit Form with Tabs */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Tabs
            defaultValue="basic"
            variant="outline"
            onChange={handleTabChange}
          >
            <Tabs.List>
              <Tabs.Tab value="basic" leftSection={<IconDatabase size={16} />}>
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
              <Tabs.Tab
                value="history"
                leftSection={<IconDatabase size={16} />}
              >
                History
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
                    onClick={() => navigate("/entities")}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleUpdate} loading={submitting}>
                    Update Entity
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
                    placeholder="Select required fields (first 8 + engine type)"
                    data={VCDB_FIELDS}
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
                    data={VCDB_FIELDS.filter(
                      (field) => !formData.required_vcdb_fields.includes(field)
                    )}
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
                    onClick={async () => {
                      try {
                        setSubmitting(true);

                        // Save fitment configuration to tenant
                        const fitmentConfig = {
                          vcdb_categories: formData.vcdb_categories,
                          required_vcdb_fields: formData.required_vcdb_fields,
                          optional_vcdb_fields: formData.optional_vcdb_fields,
                        };

                        await apiClient.put(`/api/tenants/${entity.id}/`, {
                          ...formData,
                          fitment_settings: fitmentConfig,
                        });

                        notifications.show({
                          title: "Success",
                          message: "Fitment configuration saved",
                          color: "green",
                        });
                      } catch (error) {
                        notifications.show({
                          title: "Error",
                          message: "Failed to save fitment configuration",
                          color: "red",
                        });
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    loading={submitting}
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
                <Alert color="blue" title="How to use this tab:">
                  <Text size="sm">
                    1. Configure your product fields below
                    <br />
                    2. Upload product files (CSV/Excel)
                    <br />
                    3. Click "Upload Files & Start Fitment Job" to process
                    <br />
                    4. Check the History tab to monitor progress
                  </Text>
                </Alert>

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

                <Group justify="flex-end" mt="md">
                  <Button
                    variant="outline"
                    onClick={async () => {
                      try {
                        setSubmitting(true);

                        // Save product configuration to tenant
                        const updateData = {
                          ...formData,
                          fitment_settings: {
                            vcdb_categories: formData.vcdb_categories,
                            required_vcdb_fields: formData.required_vcdb_fields,
                            optional_vcdb_fields: formData.optional_vcdb_fields,
                            required_product_fields:
                              formData.required_product_fields,
                            additional_attributes:
                              formData.additional_attributes,
                          },
                        };

                        await apiClient.put(
                          `/api/tenants/${entity.id}/`,
                          updateData
                        );

                        notifications.show({
                          title: "Success",
                          message: "Product configuration saved successfully",
                          color: "green",
                        });
                      } catch (error) {
                        notifications.show({
                          title: "Error",
                          message: "Failed to save product configuration",
                          color: "red",
                        });
                      } finally {
                        setSubmitting(false);
                      }
                    }}
                    loading={submitting}
                  >
                    Save Configuration
                  </Button>
                  {formData.uploaded_files.length > 0 && (
                    <Button
                      onClick={async () => {
                        try {
                          setSubmitting(true);

                          // First save configuration
                          const updateData = {
                            ...formData,
                            fitment_settings: {
                              vcdb_categories: formData.vcdb_categories,
                              required_vcdb_fields:
                                formData.required_vcdb_fields,
                              optional_vcdb_fields:
                                formData.optional_vcdb_fields,
                              required_product_fields:
                                formData.required_product_fields,
                              additional_attributes:
                                formData.additional_attributes,
                            },
                          };
                          await apiClient.put(
                            `/api/tenants/${entity.id}/`,
                            updateData
                          );

                          // Then upload files and create fitment job
                          const formDataToSend = new FormData();
                          formDataToSend.append("tenant_id", entity.id);
                          formDataToSend.append(
                            "required_product_fields",
                            JSON.stringify(formData.required_product_fields)
                          );
                          formDataToSend.append(
                            "additional_attributes",
                            JSON.stringify(formData.additional_attributes)
                          );

                          // Include fitment settings for job creation
                          const fitmentSettings = {
                            vcdb_categories: formData.vcdb_categories,
                            required_vcdb_fields: formData.required_vcdb_fields,
                            optional_vcdb_fields: formData.optional_vcdb_fields,
                          };
                          formDataToSend.append(
                            "fitment_settings",
                            JSON.stringify(fitmentSettings)
                          );

                          formData.uploaded_files.forEach((file) => {
                            formDataToSend.append(`files`, file);
                          });

                          await apiClient.post(
                            "/api/products/upload/",
                            formDataToSend,
                            {
                              headers: {
                                "Content-Type": "multipart/form-data",
                              },
                            }
                          );

                          // Refresh fitment jobs to show the new job
                          fetchFitmentJobs();

                          notifications.show({
                            title: "Success",
                            message:
                              "Files uploaded and fitment job started! Check History tab for progress.",
                            color: "green",
                          });
                        } catch (error) {
                          notifications.show({
                            title: "Error",
                            message: "Failed to upload files",
                            color: "red",
                          });
                        } finally {
                          setSubmitting(false);
                        }
                      }}
                      loading={submitting}
                    >
                      Upload Files & Start Fitment Job
                    </Button>
                  )}
                </Group>
              </Stack>
            </Tabs.Panel>

            <Tabs.Panel value="history" pt="md">
              <Stack gap="md">
                <Group justify="space-between" align="center">
                  <Text fw={500} size="lg">
                    Fitment Job History
                  </Text>
                  <Button
                    size="xs"
                    variant="outline"
                    onClick={() => {
                      notifications.show({
                        title: "Test Notification",
                        message:
                          "This is a test notification to verify the system is working.",
                        color: "blue",
                        autoClose: 3000,
                      });
                    }}
                  >
                    Test Notifications
                  </Button>
                </Group>

                {loadingJobs ? (
                  <Group justify="center">
                    <Loader size="sm" />
                    <Text>Loading job history...</Text>
                  </Group>
                ) : fitmentJobs.length === 0 ? (
                  <Paper p="xl" style={{ textAlign: "center" }}>
                    <Text c="dimmed">No fitment jobs found</Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      Upload product files in the Products tab and click "Upload
                      Files & Start Fitment Job" to create your first job
                    </Text>
                  </Paper>
                ) : (
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Job Type</Table.Th>
                        <Table.Th>Status</Table.Th>
                        <Table.Th>Progress</Table.Th>
                        <Table.Th>Results</Table.Th>
                        <Table.Th>Created</Table.Th>
                        <Table.Th>Duration</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {fitmentJobs.map((job) => (
                        <Table.Tr key={job.id}>
                          <Table.Td>
                            <Badge
                              color={
                                job.job_type === "ai_fitment" ? "blue" : "green"
                              }
                              variant="light"
                            >
                              {job.job_type === "ai_fitment"
                                ? "AI"
                                : job.job_type === "manual_fitment"
                                ? "MANUAL"
                                : job.job_type.toUpperCase()}
                            </Badge>
                          </Table.Td>
                          <Table.Td>
                            <Group gap="xs">
                              <Badge
                                color={
                                  job.status === "completed"
                                    ? "green"
                                    : job.status === "failed"
                                    ? "red"
                                    : job.status === "completed_with_warnings"
                                    ? "yellow"
                                    : job.status === "processing"
                                    ? "blue"
                                    : "gray"
                                }
                                size="sm"
                              >
                                {job.status === "completed_with_warnings"
                                  ? "COMPLETED WITH WARNINGS"
                                  : job.status.toUpperCase()}
                              </Badge>
                              {job.status === "processing" && (
                                <IconClock size={16} color="#3b82f6" />
                              )}
                            </Group>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap="xs">
                              <Progress
                                value={job.progress || 0}
                                size="sm"
                                color={
                                  job.status === "completed"
                                    ? "green"
                                    : job.status === "failed"
                                    ? "red"
                                    : "blue"
                                }
                              />
                              <Text size="xs" c="dimmed">
                                {job.status === "completed"
                                  ? "Completed"
                                  : job.status === "failed"
                                  ? "Failed"
                                  : job.status === "processing"
                                  ? "Processing..."
                                  : "Pending"}
                              </Text>
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Stack gap="xs">
                              <Text size="sm">
                                Created: {job.result?.fitments_created || 0}
                              </Text>
                              {job.result?.fitments_failed > 0 && (
                                <Text
                                  size="sm"
                                  c={job.status === "failed" ? "red" : "orange"}
                                >
                                  {job.status === "failed"
                                    ? "Duplicates: "
                                    : "Failed: "}
                                  {job.result.fitments_failed}
                                </Text>
                              )}
                              {job.result?.error_message && (
                                <Text
                                  size="xs"
                                  c="dimmed"
                                  style={{
                                    maxWidth: 200,
                                    overflow: "hidden",
                                    textOverflow: "ellipsis",
                                  }}
                                >
                                  {job.result.error_message}
                                </Text>
                              )}
                            </Stack>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {new Date(job.created_at).toLocaleString()}
                            </Text>
                          </Table.Td>
                          <Table.Td>
                            <Text size="sm" c="dimmed">
                              {job.duration ||
                                (job.finished_at
                                  ? `${Math.round(
                                      (new Date(job.finished_at).getTime() -
                                        new Date(
                                          job.started_at || job.created_at
                                        ).getTime()) /
                                        1000
                                    )}s`
                                  : job.started_at
                                  ? "Running..."
                                  : "Pending")}
                            </Text>
                          </Table.Td>
                        </Table.Tr>
                      ))}
                    </Table.Tbody>
                  </Table>
                )}
              </Stack>
            </Tabs.Panel>
          </Tabs>
        </Card>
      </Stack>
    </Container>
  );
};

export default EditEntity;
