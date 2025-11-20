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
  // Divider,
  Tabs,
  MultiSelect,
  FileInput,
  Accordion,
  ActionIcon,
  Table,
  Progress,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  // IconCar,
  // IconDatabase,
  IconClock,
  IconRefresh,
  IconX,
  IconInfoCircle,
  IconDeviceFloppy,
  IconArrowLeft,
  IconShieldCheck,
} from "@tabler/icons-react";
import { useParams, useLocation } from "react-router-dom";
import apiClient from "../api/client";
import { vcdbService } from "../api/services";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import FitmentRulesUpload from "../components/FitmentRulesUpload";

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
  part_number_sku_description: string;
  seek_parent_child_relationships: boolean;
  parent_child_example_format: string;
  ptid_match: boolean;
  additional_attributes: Array<{
    name: string;
    value: string;
    uom: string;
    is_entity_specific: boolean;
    acpn_recommendations: boolean;
  }>;
  uploaded_files: File[];
}

// Removed VCDBCategory interface as categories list now comes solely from VehicleTypeGroups API

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

// const VCDB_REQUIRED_FIELDS = [
//   "Part Number",
//   // "Year (model year)",
//   // "Make (manufacturer, e.g., Ford, Toyota)",
//   // "Model (e.g., F-150, Camry)",
//   // "Submodel / Trim (e.g., XLT, Limited, SE)",
//   // "Body Type (e.g., Sedan, SUV, Pickup)",
//   // "Body Number of Doors (2-door, 4-door, etc.)",
//   // "Drive Type (FWD, RWD, AWD, 4WD)",
//   // "Fuel Type (Gasoline, Diesel, Hybrid, Electric)",
// ];

const VCDB_OPTIONAL_FIELDS = [
  // "Engine Base (engine code or family ID)",
  // "Engine Liter (e.g., 2.0L, 5.7L)",
  // "Engine Cylinders (e.g., I4, V6, V8)",
  // "Engine VIN Code (8th digit VIN engine identifier)",
  // "Engine Block Type (Inline, V-type, etc.)",
  // "Transmission Type (Automatic, Manual, CVT)",
  // "Transmission Speeds (e.g., 6-speed, 10-speed)",
  // "Transmission Control Type (Automatic, Dual-Clutch, etc.)",
  // "Bed Type (for pickups — e.g., Fleetside, Stepside)",
  // "Bed Length (e.g., 5.5 ft, 6.5 ft, 8 ft)",
  // "Wheelbase (measured length in inches/mm)",
  // "Region (market region — U.S., Canada, Mexico, Latin America)",
  "Year (model year)",
  "Make (manufacturer, e.g., Ford, Toyota)",
  "Model (e.g., F-150, Camry)",
  "Submodel / Trim (e.g., XLT, Limited, SE)",
  "Body Type (e.g., Sedan, SUV, Pickup)",
  "Body Number of Doors (2-door, 4-door, etc.)",
  "Drive Type (FWD, RWD, AWD, 4WD)",
  "Fuel Type (Gas)",
  "Transmission Code",
];

const REQUIRED_PRODUCT_FIELDS = [
  "Part Number",
  "Part Terminology Name",
  "PTID",
  "Parent/Child",
];

const EditEntity: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const location = useLocation();
  const { showSuccess, showError, showInfo, showWarning } =
    useProfessionalToast();

  // Check if user came from manage entities page
  const fromManage =
    location.state?.from === "manage" ||
    location.search.includes("from=manage");
  const [entity, setEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingFitment, setSavingFitment] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    contact_email?: string;
  }>({});
  const [navigatingBack, setNavigatingBack] = useState(false);

  // New state for VCDB categories and jobs
  // Categories now sourced only from VehicleTypeGroups
  const [vehicleTypeGroups, setVehicleTypeGroups] = useState<any[]>([]);
  const [fitmentJobs, setFitmentJobs] = useState<FitmentJob[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [historyTabLoaded, setHistoryTabLoaded] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("basic");
  const [checkingFiles, setCheckingFiles] = useState(false);
  const [uploadHistory, setUploadHistory] = useState<any[]>([]);
  const [loadingUploadHistory, setLoadingUploadHistory] = useState(false);

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

  // Default VCDB output fields (Year, Make, Model)
  const DEFAULT_OPTIONAL_VCDB_FIELDS = [
    "Year (model year)",
    "Make (manufacturer, e.g., Ford, Toyota)",
    "Model (e.g., F-150, Camry)",
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
    // Fitments Configuration
    vcdb_categories: [],
    required_vcdb_fields: DEFAULT_REQUIRED_VCDB_FIELDS,
    optional_vcdb_fields: DEFAULT_OPTIONAL_VCDB_FIELDS,
    // Products Configuration
    required_product_fields: [],
    part_number_sku_description: "",
    seek_parent_child_relationships: false,
    parent_child_example_format: "",
    ptid_match: false,
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
            DEFAULT_REQUIRED_VCDB_FIELDS,
          optional_vcdb_fields:
            fitmentSettings.optional_vcdb_fields ||
            entityData.optional_vcdb_fields ||
            DEFAULT_OPTIONAL_VCDB_FIELDS,
          // Products Configuration - read from fitment_settings
          required_product_fields:
            fitmentSettings.required_product_fields ||
            entityData.required_product_fields ||
            [],
          part_number_sku_description:
            fitmentSettings.part_number_sku_description || "",
          seek_parent_child_relationships:
            fitmentSettings.seek_parent_child_relationships || false,
          parent_child_example_format:
            fitmentSettings.parent_child_example_format || "",
          ptid_match: fitmentSettings.ptid_match || false,
          additional_attributes: (
            fitmentSettings.additional_attributes ||
            entityData.additional_attributes ||
            []
          ).map((attr: any) => ({
            ...attr,
            acpn_recommendations: attr.acpn_recommendations || false,
          })),
          uploaded_files: [],
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

  // Fetch fitment jobs
  const fetchFitmentJobs = async () => {
    if (!id || !entity) {
      return;
    }

    try {
      setLoadingJobs(true);

      // Override the global X-Tenant-ID header with the specific entity ID being edited
      const response = await apiClient.get(
        `/api/data-uploads/job-history/?tenant_id=${id}`,
        {
          headers: {
            "X-Tenant-ID": id, // Override with the specific entity ID from URL
          },
        }
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
            showWarning(
              newJob.result.error_message ||
                `All ${newJob.result.fitments_failed} fitments already exist. No new fitments were created.`,
              10000
            );
          } else if (
            newJob.status === "completed_with_warnings" &&
            newJob.result?.fitments_failed > 0
          ) {
            showWarning(
              newJob.result.error_message ||
                `Created ${newJob.result.fitments_created} new fitments, but ${newJob.result.fitments_failed} already existed.`,
              10000
            );
          } else if (
            newJob.status === "completed" &&
            newJob.result?.fitments_created > 0
          ) {
            showSuccess(
              `Successfully created ${newJob.result.fitments_created} new fitments.`,
              5000
            );
          }
        }
      });

      setFitmentJobs(newJobs);
    } catch (error) {
      showError("Failed to load fitment jobs");
    } finally {
      setLoadingJobs(false);
    }
  };

  const checkExistingFiles = async () => {
    if (!id) return;

    try {
      setCheckingFiles(true);
      // Check existing files if needed
      await apiClient.get(`/api/products/upload/check_existing_files/`, {
        headers: {
          "X-Tenant-ID": id, // Override with the specific entity ID from URL
        },
      });
      // File checking logic can be added here if needed
    } catch (error) {
      console.error("Error checking existing files:", error);
    } finally {
      setCheckingFiles(false);
    }
  };

  const fetchUploadHistory = async () => {
    if (!id) return;

    try {
      setLoadingUploadHistory(true);
      const response = await apiClient.get(`/api/products/upload/history/`, {
        headers: {
          "X-Tenant-ID": id, // Override with the specific entity ID from URL
        },
      });
      setUploadHistory(response.data || []);
    } catch (error) {
      console.error("Error fetching upload history:", error);
      showError("Failed to load upload history");
    } finally {
      setLoadingUploadHistory(false);
    }
  };

  // Load VCDB categories when component mounts
  useEffect(() => {
    if (id) {
      fetchVCDBCategories();
    }
  }, [id]);

  // Clear job history when entity changes
  useEffect(() => {
    if (id) {
      setFitmentJobs([]);
      setHistoryTabLoaded(false);
    }
  }, [id]);

  // Remove automatic polling - only fetch when manually requested

  // Track previous job statuses to detect changes
  const [previousJobStatuses, setPreviousJobStatuses] = useState<
    Record<string, string>
  >({});

  // Show notifications for job status changes (only when manually refreshing)
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
            showWarning(
              job.result.error_message ||
                `All ${job.result.fitments_failed} fitments already exist. No new fitments were created.`,
              10000
            );
          } else if (
            currentStatus === "completed_with_warnings" &&
            job.result?.fitments_failed > 0
          ) {
            showWarning(
              job.result.error_message ||
                `Created ${job.result.fitments_created} new fitments, but ${job.result.fitments_failed} already existed.`,
              10000
            );
          } else if (
            currentStatus === "completed" &&
            job.result?.fitments_created > 0
          ) {
            showSuccess(
              `Successfully created ${job.result.fitments_created} new fitments.`,
              5000
            );
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
    if (value) {
      setActiveTab(value);
    }
    console.log(activeTab);

    if (value === "history") {
      if (!historyTabLoaded) {
        setHistoryTabLoaded(true);
      }
      // Always fetch fresh data when switching to history tab
      fetchFitmentJobs();
    }
    if (value === "products") {
      checkExistingFiles();
    }
    if (value === "apply-fitment") {
      checkExistingFiles();
      fetchUploadHistory();
    }
  };

  // Form validation
  const validateBasicInfo = () => {
    const errors: { name?: string; contact_email?: string } = {};

    if (!formData.name.trim()) {
      errors.name = "Entity name is required";
    }

    if (formData.contact_email && formData.contact_email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.contact_email)) {
        errors.contact_email = "Please enter a valid email address";
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleUpdate = async (
    section: "basic" | "fitment" | "product" = "basic"
  ) => {
    if (!entity) return;

    // Validate based on section
    if (section === "basic" && !validateBasicInfo()) {
      showError("Please fix validation errors before saving");
      return;
    }

    try {
      // Set appropriate loading state
      if (section === "basic") setSavingBasic(true);
      if (section === "fitment") setSavingFitment(true);
      if (section === "product") setSavingProduct(true);

      // Save all tenant data including fitment settings
      const updateData = {
        ...formData,
        fitment_settings: {
          vcdb_categories: formData.vcdb_categories,
          required_vcdb_fields: formData.required_vcdb_fields,
          optional_vcdb_fields: formData.optional_vcdb_fields,
          required_product_fields: formData.required_product_fields,
          part_number_sku_description: formData.part_number_sku_description,
          seek_parent_child_relationships:
            formData.seek_parent_child_relationships,
          parent_child_example_format: formData.parent_child_example_format,
          ptid_match: formData.ptid_match,
          additional_attributes: formData.additional_attributes,
        },
      };

      await apiClient.put(`/api/tenants/${entity.id}/`, updateData);

      // Smooth transition delay (2 seconds for better UX)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Refresh entity data to get updated info
      const response = await apiClient.get(`/api/tenants/${entity.id}/`);
      setEntity(response.data);

      // Update localStorage with the updated entity data
      localStorage.setItem("current_entity", JSON.stringify(response.data));

      showSuccess("Settings updated successfully");
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "Failed to update settings";
      showError(errorMessage);
    } finally {
      if (section === "basic") setSavingBasic(false);
      if (section === "fitment") setSavingFitment(false);
      if (section === "product") setSavingProduct(false);
    }
  };

  const handleBackToManage = async () => {
    try {
      setNavigatingBack(true);

      // Smooth transition delay (2 seconds for better UX)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate back to manage entities
      window.location.href = "/manage-entities";
    } catch (error) {
      setNavigatingBack(false);
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
        {/* <Button
          leftSection={<IconArrowLeft size={14} />}
          onClick={() => navigate("/entities")}
          mt="md"
          size="sm"
          variant="subtle"
          style={{ fontSize: "14px" }}
        >
          Back to Entities
        </Button> */}
      </Container>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f8f9fa",
      }}
    >
      {/* Header Bar */}

      <Container size="xl">
        <Stack gap="24">
          {/* Page Header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Group gap="sm" align="center">
                <Title
                  order={2}
                  style={{
                    fontWeight: 650,
                    fontSize: "24px",
                    color: "#1a1a1a",
                    letterSpacing: "-0.02em",
                  }}
                >
                  {entity.name}
                </Title>
                <Badge
                  color={entity.is_active ? "green" : "red"}
                  variant="light"
                  style={{
                    fontWeight: 500,
                    fontSize: "12px",
                  }}
                >
                  {entity.is_active ? "Active" : "Inactive"}
                </Badge>
                {entity.is_default && (
                  <Badge
                    color="blue"
                    variant="light"
                    style={{
                      fontWeight: 500,
                      fontSize: "12px",
                    }}
                  >
                    Default
                  </Badge>
                )}
              </Group>
              <Text
                size="sm"
                c="dimmed"
                style={{
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                Configure entity settings, VCDB categories, and product fields
              </Text>
            </div>

            {/* Back to Manage Entities Button - Only show when coming from manage entities */}
            {fromManage && (
              <Button
                leftSection={<IconArrowLeft size={18} />}
                variant="light"
                onClick={handleBackToManage}
                loading={navigatingBack}
                disabled={savingBasic || savingFitment || savingProduct}
                style={{
                  fontWeight: 500,
                  borderRadius: "8px",
                }}
              >
                Back to Manage Entities
              </Button>
            )}
          </Group>

          {/* Configuration Form with Tabs */}
          <Card
            padding="0"
            radius="12px"
            style={{
              border: "1px solid #e9ecef",
              overflow: "hidden",
            }}
          >
            <Tabs
              defaultValue="basic"
              onChange={handleTabChange}
              styles={{
                root: {
                  background: "#ffffff",
                },
                list: {
                  borderBottom: "1px solid #e9ecef",
                  padding: "0 24px",
                },
                tab: {
                  fontWeight: 500,
                  fontSize: "14px",
                  padding: "16px 20px",
                  color: "#6b7280",
                  borderRadius: "0",
                  "&[data-active]": {
                    color: "#2563eb",
                    borderColor: "#2563eb",
                    fontWeight: 600,
                    background: "transparent",
                  },
                  "&:hover": {
                    background: "#f1f5f9",
                    borderRadius: "0",
                  },
                },
                panel: {
                  padding: "24px",
                },
              }}
            >
              <Tabs.List>
                <Tabs.Tab
                  value="basic"
                  // leftSection={<IconDatabase size={18} />}
                >
                  Profile
                </Tabs.Tab>
                <Tabs.Tab value="fitments">Fitment Rules</Tabs.Tab>
                <Tabs.Tab
                  value="products"
                  // leftSection={<IconDatabase size={18} />}
                >
                  Part Rules
                </Tabs.Tab>
                <Tabs.Tab value="data-upload">Data Upload</Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel value="basic">
                <Stack gap="lg">
                  <div style={{ maxWidth: "80%" }}>
                    <Stack gap="md">
                      <Group grow gap="md">
                        <TextInput
                          label="Entity Name"
                          placeholder="Enter entity name"
                          value={formData.name}
                          onChange={(e) => {
                            setFormData({ ...formData, name: e.target.value });
                            if (validationErrors.name) {
                              setValidationErrors({
                                ...validationErrors,
                                name: "",
                              });
                            }
                          }}
                          required
                          error={validationErrors.name}
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                            },
                          }}
                        />
                        <TextInput
                          label="URL Slug"
                          placeholder="Enter entity URL slug"
                          value={formData.slug}
                          onChange={(e) =>
                            setFormData({ ...formData, slug: e.target.value })
                          }
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                            },
                          }}
                        />
                      </Group>
                      <Textarea
                        label="Description"
                        placeholder="Enter entity description"
                        value={formData.description}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            description: e.target.value,
                          })
                        }
                        rows={3}
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                            marginBottom: "6px",
                          },
                          input: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                          },
                        }}
                      />
                    </Stack>
                  </div>

                  {/* <Divider label="Contact Information" /> */}

                  <div style={{ maxWidth: "80%" }}>
                    <Stack gap="md">
                      <Group grow gap="md">
                        <TextInput
                          label="Email"
                          placeholder="contact@example.com"
                          value={formData.contact_email}
                          onChange={(e) => {
                            setFormData({
                              ...formData,
                              contact_email: e.target.value,
                            });
                            if (validationErrors.contact_email) {
                              setValidationErrors({
                                ...validationErrors,
                                contact_email: "",
                              });
                            }
                          }}
                          error={validationErrors.contact_email}
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                            },
                          }}
                        />
                        <TextInput
                          label="Phone"
                          placeholder="+1 (555) 123-4567"
                          value={formData.contact_phone}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              contact_phone: e.target.value,
                            })
                          }
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                            },
                          }}
                        />
                      </Group>
                      <Textarea
                        label="Address"
                        placeholder="Enter company address"
                        value={formData.company_address}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            company_address: e.target.value,
                          })
                        }
                        rows={3}
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                            marginBottom: "6px",
                          },
                          input: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                          },
                        }}
                      />
                    </Stack>
                  </div>
                  {/* <Divider label="Entity Status" /> */}

                  <div>
                    <Text
                      fw={600}
                      size="sm"
                      mb="md"
                      style={{ color: "#1a1a1a" }}
                    >
                      Status
                    </Text>
                    <Group gap="xl">
                      <Switch
                        label="Active"
                        checked={formData.is_active}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            is_active: e.currentTarget.checked,
                          })
                        }
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                          },
                          description: {
                            fontSize: "12px",
                            color: "#6b7280",
                          },
                        }}
                      />
                      <Group gap="xs" align="center">
                        <Switch
                          label="Default Entity"
                          checked={formData.is_default}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              is_default: e.currentTarget.checked,
                            })
                          }
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                            },
                          }}
                        />
                        <Tooltip label="Set as default entity for new users">
                          <IconInfoCircle
                            size={16}
                            color="#9ca3af"
                            style={{ cursor: "help" }}
                          />
                        </Tooltip>
                      </Group>
                    </Group>
                  </div>

                  <Group justify="center" mt="md">
                    <Button
                      leftSection={<IconDeviceFloppy size={18} />}
                      onClick={() => handleUpdate("basic")}
                      loading={savingBasic}
                      disabled={savingFitment || savingProduct}
                      style={{
                        fontWeight: 600,
                        borderRadius: "8px",
                        background: "#2563eb",
                      }}
                    >
                      Save
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="fitments">
                <Stack gap="lg">
                  <div>
                    <Group gap="xs" mb="xs">
                      <Text fw={600} size="sm" style={{ color: "#1a1a1a" }}>
                        VCDB Type
                      </Text>
                      <Tooltip label="Configure VCDB categories and fields for this entity">
                        <IconInfoCircle size={16} color="#9ca3af" />
                      </Tooltip>
                    </Group>
                    <Stack gap="md">
                      <MultiSelect
                        placeholder="Select VCDB categories"
                        data={vehicleTypeGroups}
                        value={formData.vcdb_categories}
                        onChange={(value) =>
                          setFormData({ ...formData, vcdb_categories: value })
                        }
                        searchable
                        clearable
                        disabled={loadingCategories}
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                            marginBottom: "6px",
                          },
                          input: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                          },
                        }}
                      />
                    </Stack>
                  </div>

                  <div>
                    <Group gap="xs" mb="xs">
                      {/* <Tooltip label="Select required and optional VCDB fields">
                        <IconInfoCircle size={16} color="#9ca3af" />
                      </Tooltip> */}
                    </Group>
                    <Group grow align="flex-start">
                      <MultiSelect
                        label="Source to VCDB identifier Field(s)"
                        placeholder="Select required fields"
                        data={VCDB_OPTIONAL_FIELDS}
                        value={formData.required_vcdb_fields}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            required_vcdb_fields: value,
                          })
                        }
                        searchable
                        clearable
                        maxValues={1}
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                            marginBottom: "6px",
                          },
                          input: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                          },
                        }}
                      />
                      <MultiSelect
                        label="VCDB Output Fields"
                        placeholder="Select optional fields"
                        data={VCDB_OPTIONAL_FIELDS}
                        value={formData.optional_vcdb_fields}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            optional_vcdb_fields: value,
                          })
                        }
                        searchable
                        clearable
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                            marginBottom: "6px",
                          },
                          input: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                          },
                        }}
                      />
                    </Group>
                  </div>

                  <Group justify="center" mt="md">
                    <Button
                      leftSection={<IconDeviceFloppy size={18} />}
                      onClick={() => handleUpdate("fitment")}
                      loading={savingFitment}
                      disabled={savingBasic || savingProduct}
                      style={{
                        fontWeight: 600,
                        borderRadius: "8px",
                        background: "#2563eb",
                      }}
                    >
                      Save
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="data-upload">
                <Stack gap="lg">
                  <div>
                    {/* <Title order={3} style={{ color: "#2c3e50" }}>
                      Data Upload & VCDB Mapping
                    </Title>
                    <Text size="sm" c="dimmed">
                      Upload your fitment or product files and let AI
                      automatically map columns to VCDB standards
                    </Text> */}
                  </div>

                  {/* Fitment Rules Upload Component */}
                  <FitmentRulesUpload />
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="products">
                <Stack gap="lg">
                  <div>
                    <Group gap="xs" mb="xs">
                      <Text fw={600} size="sm" style={{ color: "#1a1a1a" }}>
                        Required Product Fields
                      </Text>
                      <Tooltip label="Configure required product fields and additional attributes">
                        <IconInfoCircle size={16} color="#9ca3af" />
                      </Tooltip>
                    </Group>
                    <Stack gap="md">
                      <Text
                        size="sm"
                        c="dimmed"
                        mb="xs"
                        style={{ fontStyle: "italic" }}
                      >
                        Only one Single label Source-to-Part Identifier
                        Fields(s)
                      </Text>
                      <MultiSelect
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
                        maxValues={1}
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                            marginBottom: "6px",
                          },
                          input: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 500,
                          },
                        }}
                      />
                      {/* Part Number with SKU Description - Always shown as Part Number is required */}
                      <Group grow align="flex-start">
                        {/* <TextInput
                          label="Part Number"
                          value="Part Number"
                          disabled
                          required
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                            },
                          }}
                        /> */}
                        <TextInput
                          label="SKU Description"
                          placeholder="Describe the unique part identifier in upload file (SKU)"
                          value={formData.part_number_sku_description}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              part_number_sku_description: e.target.value,
                            })
                          }
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                            },
                          }}
                        />
                      </Group>
                      {/* PTID Match Toggle */}
                      <Switch
                        label="PTID Match"
                        checked={formData.ptid_match}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ptid_match: e.currentTarget.checked,
                          })
                        }
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                          },
                        }}
                      />
                      {/* Parent/Child Relationships */}
                      <Switch
                        label="Seek out parent/child relationships?"
                        checked={formData.seek_parent_child_relationships}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            seek_parent_child_relationships:
                              e.currentTarget.checked,
                          })
                        }
                        styles={{
                          label: {
                            fontWeight: 500,
                            fontSize: "14px",
                          },
                        }}
                      />
                      {formData.seek_parent_child_relationships && (
                        <TextInput
                          label="Example Format of Child Data"
                          placeholder="Enter example format of child data"
                          value={formData.parent_child_example_format}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              parent_child_example_format: e.target.value,
                            })
                          }
                          styles={{
                            label: {
                              fontWeight: 500,
                              fontSize: "14px",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 500,
                            },
                          }}
                        />
                      )}
                    </Stack>
                  </div>

                  <div>
                    <Group gap="xs" mb="md">
                      <Text fw={600} size="sm" style={{ color: "#1a1a1a" }}>
                        Additional Attributes
                      </Text>
                      <Tooltip label="Define custom attributes for products">
                        <IconInfoCircle size={16} color="#9ca3af" />
                      </Tooltip>
                    </Group>

                    <Accordion
                      variant="contained"
                      styles={{
                        control: {
                          borderRadius: "8px",
                          fontWeight: 500,
                        },
                      }}
                    >
                      <Accordion.Item value="attributes">
                        <Accordion.Control>
                          <Group>
                            <Text fw={500} size="sm">
                              Define Additional Attributes
                            </Text>
                            <Badge size="sm" variant="light">
                              {formData.additional_attributes.length}
                            </Badge>
                          </Group>
                        </Accordion.Control>
                        <Accordion.Panel>
                          <Stack gap="md">
                            {formData.additional_attributes.map(
                              (attr, index) => (
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
                                        label="Attribute Value(s)"
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
                                    <Switch
                                      label="Global Attribute"
                                      checked={!attr.is_entity_specific}
                                      onChange={(e) => {
                                        const newAttrs = [
                                          ...formData.additional_attributes,
                                        ];
                                        newAttrs[index] = {
                                          ...attr,
                                          is_entity_specific:
                                            !e.currentTarget.checked,
                                        };
                                        setFormData({
                                          ...formData,
                                          additional_attributes: newAttrs,
                                        });
                                      }}
                                      styles={{
                                        label: {
                                          fontWeight: 500,
                                          fontSize: "14px",
                                        },
                                      }}
                                    />
                                    <Group gap="xs">
                                      <Switch
                                        label="ACPN recommendations"
                                        checked={
                                          attr.acpn_recommendations || false
                                        }
                                        onChange={(e) => {
                                          const newAttrs = [
                                            ...formData.additional_attributes,
                                          ];
                                          newAttrs[index] = {
                                            ...attr,
                                            acpn_recommendations:
                                              e.currentTarget.checked,
                                          };
                                          setFormData({
                                            ...formData,
                                            additional_attributes: newAttrs,
                                          });
                                        }}
                                        styles={{
                                          label: {
                                            fontWeight: 500,
                                            fontSize: "14px",
                                          },
                                        }}
                                      />
                                      {attr.acpn_recommendations && (
                                        <Tooltip label="ACPN Compliant - This field uses AutoCare PIES industry standard naming">
                                          <IconShieldCheck
                                            size={18}
                                            color="#10b981"
                                            style={{ cursor: "help" }}
                                          />
                                        </Tooltip>
                                      )}
                                    </Group>
                                  </Group>
                                </Paper>
                              )
                            )}
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
                                      acpn_recommendations: false,
                                    },
                                  ],
                                });
                              }}
                              style={{
                                fontWeight: 500,
                                borderRadius: "8px",
                              }}
                            >
                              Add Attribute
                            </Button>
                          </Stack>
                        </Accordion.Panel>
                      </Accordion.Item>
                    </Accordion>
                  </div>

                  <Group justify="center" mt="md">
                    <Button
                      leftSection={<IconDeviceFloppy size={18} />}
                      onClick={() => handleUpdate("product")}
                      loading={savingProduct}
                      disabled={savingBasic || savingFitment}
                      style={{
                        fontWeight: 600,
                        borderRadius: "8px",
                        background: "#2563eb",
                      }}
                    >
                      Save
                    </Button>
                  </Group>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="apply-fitment">
                <Stack gap="md">
                  <Text fw={500} size="lg">
                    Apply Fitment
                  </Text>

                  {checkingFiles && (
                    <Alert
                      color="yellow"
                      title="Checking for existing files..."
                    >
                      <Text size="sm">
                        Please wait while we check for existing product files.
                      </Text>
                    </Alert>
                  )}

                  {/* Enhanced File Upload Section */}
                  <Card
                    withBorder
                    p="lg"
                    style={{ backgroundColor: "#fafbfc" }}
                  >
                    <Stack gap="md">
                      <Group justify="space-between" align="center">
                        <div>
                          <Text fw={600} size="lg" c="dark">
                            Product Files Upload
                          </Text>
                          <Text size="sm" c="dimmed">
                            Upload CSV, XLSX, or JSON files containing your
                            product data
                          </Text>
                        </div>
                        <Badge color="blue" variant="light" size="lg">
                          {formData.uploaded_files.length} files
                        </Badge>
                      </Group>

                      <FileInput
                        placeholder="Click to browse or drag & drop files here"
                        multiple
                        accept=".csv,.xlsx,.json"
                        value={formData.uploaded_files}
                        onChange={(files) =>
                          setFormData({
                            ...formData,
                            uploaded_files: files || [],
                          })
                        }
                        styles={{
                          input: {
                            border: "2px dashed #dee2e6",
                            backgroundColor: "#ffffff",
                            borderRadius: "8px",
                            padding: "24px",
                            textAlign: "center",
                            cursor: "pointer",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              borderColor: "#339af0",
                              backgroundColor: "#f8f9ff",
                            },
                          },
                          placeholder: {
                            color: "#6c757d",
                            fontSize: "14px",
                          },
                        }}
                      />

                      {/* File Type Guidelines */}
                      <Alert variant="light" radius="md">
                        <Text size="sm" fw={500} mb="xs">
                          Supported File Types:
                        </Text>
                        <Group gap="md">
                          <Badge color="green" variant="light" size="sm">
                            CSV Files
                          </Badge>
                          <Badge color="orange" variant="light" size="sm">
                            Excel Files
                          </Badge>
                          <Badge color="purple" variant="light" size="sm">
                            JSON Files
                          </Badge>
                        </Group>
                      </Alert>

                      {/* Enhanced File List */}
                      {formData.uploaded_files.length > 0 && (
                        <Card withBorder radius="md" p="md">
                          <Group justify="space-between" mb="md">
                            <Text fw={600} size="md" c="dark">
                              Uploaded Files
                            </Text>
                            <Button
                              variant="light"
                              color="red"
                              size="sm"
                              onClick={() =>
                                setFormData({ ...formData, uploaded_files: [] })
                              }
                            >
                              Clear All
                            </Button>
                          </Group>

                          <Stack gap="xs">
                            {formData.uploaded_files.map((file, index) => (
                              <Paper
                                key={index}
                                p="sm"
                                radius="md"
                                style={{
                                  backgroundColor: "#ffffff",
                                  border: "1px solid #e9ecef",
                                  transition: "all 0.2s ease",
                                }}
                              >
                                <Group justify="space-between" align="center">
                                  <Group gap="sm">
                                    <div
                                      style={{
                                        width: "8px",
                                        height: "8px",
                                        borderRadius: "50%",
                                        backgroundColor: "#51cf66",
                                      }}
                                    />
                                    <div>
                                      <Text size="sm" fw={500} c="dark">
                                        {file.name}
                                      </Text>
                                      <Text size="xs" c="dimmed">
                                        {file.size < 1024 * 1024
                                          ? `${(file.size / 1024).toFixed(
                                              1
                                            )} KB`
                                          : `${(
                                              file.size /
                                              1024 /
                                              1024
                                            ).toFixed(2)} MB`}
                                      </Text>
                                    </div>
                                  </Group>

                                  <Group gap="xs">
                                    <Badge
                                      color={
                                        file.name.endsWith(".csv")
                                          ? "green"
                                          : file.name.endsWith(".xlsx")
                                          ? "orange"
                                          : file.name.endsWith(".json")
                                          ? "purple"
                                          : "gray"
                                      }
                                      variant="light"
                                      size="xs"
                                    >
                                      {file.name
                                        .split(".")
                                        .pop()
                                        ?.toUpperCase()}
                                    </Badge>

                                    <ActionIcon
                                      color="red"
                                      variant="subtle"
                                      size="sm"
                                      onClick={() => {
                                        const newFiles =
                                          formData.uploaded_files.filter(
                                            (_, i) => i !== index
                                          );
                                        setFormData({
                                          ...formData,
                                          uploaded_files: newFiles,
                                        });
                                      }}
                                    >
                                      <IconX size={14} />
                                    </ActionIcon>
                                  </Group>
                                </Group>
                              </Paper>
                            ))}
                          </Stack>
                        </Card>
                      )}
                    </Stack>
                  </Card>

                  {/* Enhanced Fitment Method Display */}
                  {formData.default_fitment_method && (
                    <Card
                      withBorder
                      p="md"
                      style={{ backgroundColor: "#f8f9ff" }}
                    >
                      <Group justify="space-between" align="center" mb="sm">
                        <Text fw={600} size="md" c="dark">
                          🎯 Fitment Configuration
                        </Text>
                        <Badge
                          color={
                            formData.default_fitment_method === "ai"
                              ? "purple"
                              : "blue"
                          }
                          variant="light"
                          size="lg"
                        >
                          {formData.default_fitment_method === "ai"
                            ? "🤖 AI Fitment"
                            : "👤 Manual Fitment"}
                        </Badge>
                      </Group>

                      <Stack gap="xs">
                        <Text size="sm">
                          <strong>Processing Method:</strong>{" "}
                          {formData.default_fitment_method === "ai"
                            ? "AI-Powered"
                            : "Manual Mapping"}
                        </Text>

                        {formData.default_fitment_method === "ai" && (
                          <Text size="xs" c="dimmed">
                            <strong>AI Instructions:</strong>{" "}
                            {formData.ai_instructions ||
                              "Using default AI processing"}
                          </Text>
                        )}

                        <Text size="xs" c="dimmed">
                          When you click "Apply Fitment", a{" "}
                          {formData.default_fitment_method} fitment job will be
                          created and started automatically.
                        </Text>
                      </Stack>
                    </Card>
                  )}

                  <Group justify="flex-end" mt="md">
                    {/* Only allow Apply Fitment when new files are uploaded */}
                    {formData.uploaded_files.length > 0 ? (
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

                            // Show processing notification
                            showInfo(
                              "🚀 Starting Fitment Process - Uploading files and configuring fitment settings...",
                              3000
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
                              required_vcdb_fields:
                                formData.required_vcdb_fields,
                              optional_vcdb_fields:
                                formData.optional_vcdb_fields,
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
                                  "X-Tenant-ID": id, // Override with the specific entity ID from URL
                                },
                              }
                            );

                            // Show job creation notification
                            const jobType =
                              formData.default_fitment_method === "ai"
                                ? "AI"
                                : "Manual";
                            showInfo(
                              `⚙️ Creating ${jobType} Fitment Job - Setting up with your uploaded files...`,
                              3000
                            );

                            // Refresh fitment jobs to show the new job
                            fetchFitmentJobs();

                            // Refresh upload history to show the latest uploads
                            fetchUploadHistory();

                            // Show success message with job type
                            showSuccess(
                              `✅ ${jobType} Fitment Started! Your ${jobType.toLowerCase()} fitment process has been initiated successfully. Check the History tab to monitor progress.`,
                              6000
                            );
                          } catch (error) {
                            showError("❌ Failed to upload files", 5000);
                          } finally {
                            setSubmitting(false);
                          }
                        }}
                        loading={submitting}
                      >
                        {formData.default_fitment_method === "ai"
                          ? "Apply AI Fitment"
                          : "Apply Manual Fitment"}
                      </Button>
                    ) : (
                      <Button disabled>Upload Files Required</Button>
                    )}
                  </Group>

                  {/* Upload History Section */}
                  <Card withBorder>
                    <Group justify="space-between" align="center" mb="md">
                      <Text fw={500}>Upload History</Text>
                      <Button
                        size="sm"
                        variant="light"
                        onClick={fetchUploadHistory}
                        loading={loadingUploadHistory}
                      >
                        Refresh
                      </Button>
                    </Group>

                    {loadingUploadHistory ? (
                      <Group justify="center" py="md">
                        <Loader size="sm" />
                        <Text size="sm">Loading upload history...</Text>
                      </Group>
                    ) : uploadHistory.length === 0 ? (
                      <Text
                        size="sm"
                        c="dimmed"
                        py="md"
                        style={{ textAlign: "center" }}
                      >
                        No upload history found
                      </Text>
                    ) : (
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Filename</Table.Th>
                            <Table.Th>Size</Table.Th>
                            <Table.Th>Upload Date</Table.Th>
                            <Table.Th>Status</Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {uploadHistory.map((upload, index) => (
                            <Table.Tr key={index}>
                              <Table.Td>
                                <Text size="sm">{upload.filename}</Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" c="dimmed">
                                  {upload.file_size < 1024 * 1024
                                    ? `${(upload.file_size / 1024).toFixed(
                                        1
                                      )} KB`
                                    : `${(
                                        upload.file_size /
                                        1024 /
                                        1024
                                      ).toFixed(2)} MB`}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" c="dimmed">
                                  {new Date(
                                    upload.uploaded_at
                                  ).toLocaleString()}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                <Badge
                                  color={
                                    upload.status === "processed"
                                      ? "green"
                                      : upload.status === "processing"
                                      ? "blue"
                                      : upload.status === "failed"
                                      ? "red"
                                      : "gray"
                                  }
                                  size="sm"
                                >
                                  {upload.status}
                                </Badge>
                              </Table.Td>
                            </Table.Tr>
                          ))}
                        </Table.Tbody>
                      </Table>
                    )}
                  </Card>
                </Stack>
              </Tabs.Panel>

              <Tabs.Panel value="history" key={`history-${id}`}>
                <Stack gap="md">
                  <Group justify="space-between" align="center">
                    <Group>
                      <Text fw={500} size="lg">
                        Fitment Job History
                      </Text>
                      <Badge color="blue" variant="light" size="sm">
                        Entity: {entity?.name}
                      </Badge>
                    </Group>
                    <Group>
                      <Button
                        size="sm"
                        variant="light"
                        leftSection={<IconRefresh size={16} />}
                        onClick={() => {
                          fetchFitmentJobs();
                          showInfo("Job history is being refreshed...", 2000);
                        }}
                        loading={loadingJobs}
                      >
                        Refresh
                      </Button>
                    </Group>
                  </Group>

                  {loadingJobs ? (
                    <Group justify="center">
                      <Loader size="sm" />
                      <Text>Loading job history...</Text>
                    </Group>
                  ) : fitmentJobs.length === 0 ? (
                    <Paper p="xl" style={{ textAlign: "center" }}>
                      <Text c="dimmed">
                        No fitment jobs found for this entity
                      </Text>
                      <Text size="sm" c="dimmed" mt="xs">
                        Upload product files in the Products tab and click
                        "Upload Files & Start Fitment Job" to create your first
                        job
                      </Text>
                      <Text size="xs" c="dimmed" mt="xs">
                        Showing job history for: <strong>{entity?.name}</strong>
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
                                  job.job_type === "ai_fitment"
                                    ? "blue"
                                    : "green"
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
                                    c={
                                      job.status === "failed" ? "red" : "orange"
                                    }
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

          {/* Bottom Spacing */}
          <div style={{ height: "40px" }} />
        </Stack>
      </Container>
    </div>
  );
};

export default EditEntity;
