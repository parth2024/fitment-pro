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
  // Divider,
  Tabs,
  MultiSelect,
  Accordion,
  ActionIcon,
  Paper,
  Grid,
  Checkbox,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconCar,
  // IconDatabase,
  IconArrowLeft,
  IconCheck,
  IconInfoCircle,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { useParams, useLocation } from "react-router-dom";
import apiClient from "../api/client";
import { vcdbService } from "../api/services";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

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

// Removed VCDBCategory interface as categories list now comes solely from VehicleTypeGroups API

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

const EditEntityStandalone: React.FC = () => {
  const { id: routeId } = useParams<{ id: string }>();
  const location = useLocation();
  const { showSuccess, showError } = useProfessionalToast();

  // Extract ID from URL manually since we're not in a proper route context
  const pathParts = window.location.pathname.split("/");
  const id = routeId || pathParts[pathParts.length - 1];

  // Check if user came from manage entities page
  const fromManage =
    location.state?.from === "manage" ||
    location.search.includes("from=manage");

  console.log("DEBUG: EditEntityStandalone component rendered with id:", id);
  console.log("DEBUG: routeId from useParams:", routeId);
  console.log("DEBUG: pathParts:", pathParts);
  console.log("DEBUG: fromManage:", fromManage);
  const [entity, setEntity] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingBasic, setSavingBasic] = useState(false);
  const [savingFitment, setSavingFitment] = useState(false);
  const [savingProduct, setSavingProduct] = useState(false);
  const [switchingEntity, setSwitchingEntity] = useState(false);
  const [navigatingBack, setNavigatingBack] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Categories now sourced only from VehicleTypeGroups
  const [vehicleTypeGroups, setVehicleTypeGroups] = useState<any[]>([]);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string>
  >({});

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
            DEFAULT_REQUIRED_VCDB_FIELDS,
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
        showError(errorMessage);
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

  const validateBasicInfo = () => {
    const errors: Record<string, string> = {};

    if (!formData.name.trim()) {
      errors.name = "Entity name is required";
    }

    if (
      formData.contact_email &&
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.contact_email)
    ) {
      errors.contact_email = "Invalid email format";
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

      // Smooth transition delay (2 seconds for better UX)
      await new Promise((resolve) => setTimeout(resolve, 2000));

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

  const handleBackNavigation = async () => {
    try {
      setNavigatingBack(true);

      // Smooth transition delay (2 seconds)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate back based on where user came from
      if (fromManage) {
        window.location.href = "/manage-entities";
      } else {
        window.location.href = "/manage-entities";
      }
    } catch (error) {
      setNavigatingBack(false);
    }
  };

  const handleUseThisEntity = async () => {
    if (!entity) return;

    try {
      setSwitchingEntity(true);

      // Switch to this entity
      await apiClient.post(`/api/tenants/switch/${entity.id}/`);

      // Update localStorage
      localStorage.setItem("current_entity", JSON.stringify(entity));

      // Dispatch event to notify other components
      const entityChangeEvent = new CustomEvent("entityChanged", {
        detail: { entity, entityId: entity.id },
      });
      window.dispatchEvent(entityChangeEvent);

      showSuccess(`Switched to ${entity.name}. Redirecting to dashboard...`);

      // Smooth transition with delay (2.5 seconds for better UX)
      await new Promise((resolve) => setTimeout(resolve, 2500));

      // Navigate to analytics/dashboard
      window.location.href = "/analytics";
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.detail ||
        error?.response?.data?.error ||
        "Failed to switch to entity";
      showError(errorMessage);
      setSwitchingEntity(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f9fa",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Stack align="center" gap="md">
          <Loader size="lg" color="#2563eb" />
          <Text
            fw={500}
            style={{
              fontSize: "15px",
              color: "#6b7280",
            }}
          >
            Loading entity settings...
          </Text>
        </Stack>
      </div>
    );
  }

  if (error || (!loading && !entity)) {
    return (
      <div
        style={{
          minHeight: "100vh",
          background: "#f8f9fa",
          padding: "40px 0",
        }}
      >
        <Container size="xl">
          <Alert
            icon={<IconInfoCircle size={18} />}
            title="Error"
            color="red"
            variant="light"
            styles={{
              root: {
                borderRadius: "12px",
              },
              title: {
                fontWeight: 600,
                fontSize: "16px",
              },
              message: {
                fontWeight: 500,
                fontSize: "14px",
              },
            }}
          >
            {error || "Entity not found"}
          </Alert>
          <Text
            size="sm"
            c="dimmed"
            mt="sm"
            style={{
              fontWeight: 500,
              fontSize: "14px",
              color: "#6b7280",
            }}
          >
            Entity ID: {id}
          </Text>
          <Group mt="md" gap="sm">
            {fromManage && (
              <Button
                leftSection={<IconArrowLeft size={18} />}
                onClick={() => (window.location.href = "/manage-entities")}
                variant="light"
                style={{
                  fontWeight: 500,
                  borderRadius: "8px",
                }}
              >
                Back to Manage Entities
              </Button>
            )}
            <Button
              variant="light"
              onClick={() => window.location.reload()}
              style={{
                fontWeight: 500,
                borderRadius: "8px",
              }}
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
        background: "#f8f9fa",
      }}
    >
      {/* Header Bar */}
      <div
        style={{
          background: "#ffffff",
          borderBottom: "1px solid #e9ecef",
          padding: "20px 0",
          marginBottom: "32px",
        }}
      >
        <Container size="xl">
          <Group justify="space-between" align="center">
            {/* Logo and Brand */}
            <Group gap="12px" align="center">
              <div
                style={{
                  background: "#2563eb",
                  borderRadius: "8px",
                  width: "36px",
                  height: "36px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                }}
              >
                <IconCar size={20} color="white" stroke={2.2} />
              </div>
              <div>
                <Title
                  order={3}
                  style={{
                    color: "#1a1a1a",
                    fontWeight: 650,
                    fontSize: "18px",
                    letterSpacing: "-0.015em",
                    margin: 0,
                  }}
                >
                  FitmentPro.ai
                </Title>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{
                    fontWeight: 500,
                    fontSize: "12px",
                    marginTop: "2px",
                  }}
                >
                  Entity Configuration
                </Text>
              </div>
            </Group>

            {/* Right Actions */}
            <Group gap="sm">
              {fromManage && (
                <Button
                  leftSection={<IconArrowLeft size={18} />}
                  variant="light"
                  onClick={handleBackNavigation}
                  loading={navigatingBack}
                  disabled={
                    savingBasic ||
                    savingFitment ||
                    savingProduct ||
                    switchingEntity
                  }
                  style={{
                    fontWeight: 500,
                    borderRadius: "8px",
                  }}
                >
                  {fromManage ? "Back to Manage Entities" : "Back to Entities"}
                </Button>
              )}
              <Button
                leftSection={<IconCheck size={18} />}
                onClick={handleUseThisEntity}
                loading={switchingEntity}
                disabled={
                  savingBasic ||
                  savingFitment ||
                  savingProduct ||
                  navigatingBack
                }
                style={{
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "#2563eb",
                }}
              >
                Use This Entity
              </Button>
            </Group>
          </Group>
        </Container>
      </div>

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

                  {/* <Divider /> */}
                  {/* <div>
                    <Group gap="xs" mb="xs">
                      <Text fw={600} size="sm" style={{ color: "#1a1a1a" }}>
                        Fitment Settings
                      </Text>
                      <Tooltip label="Configure default fitment application settings">
                        <IconInfoCircle size={16} color="#9ca3af" />
                      </Tooltip>
                    </Group>
                    <Stack gap="md">
                      <Select
                        label="Default Fitment Method"
                        placeholder="Select default method"
                        data={[
                          { value: "manual", label: "Manual Application" },
                          { value: "ai", label: "AI-Powered Application" },
                        ]}
                        value={formData.default_fitment_method}
                        onChange={(value) =>
                          setFormData({
                            ...formData,
                            default_fitment_method: value as "manual" | "ai",
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
                      <Textarea
                        label="AI Instructions"
                        placeholder="Enter specific instructions for AI fitment processing..."
                        value={formData.ai_instructions}
                        onChange={(e) =>
                          setFormData({
                            ...formData,
                            ai_instructions: e.target.value,
                          })
                        }
                        rows={4}
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
                  </div> */}

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
                      disabled={
                        savingFitment || savingProduct || switchingEntity
                      }
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
                      {/* <Text fw={600} size="sm" style={{ color: "#1a1a1a" }}>
                        Source to VCDB identifier Field(s)
                      </Text>
                      <Tooltip label="Select required and optional VCDB fields">
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
                      disabled={savingBasic || savingProduct || switchingEntity}
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

              <Tabs.Panel value="products">
                <Stack gap="lg">
                  <div>
                    <Group gap="xs" mb="xs">
                      <Text fw={600} size="sm" style={{ color: "#1a1a1a" }}>
                        Source to Part identifier Field(s)
                      </Text>
                      <Tooltip label="Configure required product fields and additional attributes">
                        <IconInfoCircle size={16} color="#9ca3af" />
                      </Tooltip>
                    </Group>
                    <Stack gap="md">
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
                      disabled={savingBasic || savingFitment || switchingEntity}
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
            </Tabs>
          </Card>

          {/* Bottom Spacing */}
          <div style={{ height: "40px" }} />
        </Stack>
      </Container>
    </div>
  );
};

export default EditEntityStandalone;
