import React, { useState } from "react";
import {
  Modal,
  Button,
  Group,
  Text,
  TextInput,
  Textarea,
  Switch,
  Stack,
  Divider,
  Select,
  Alert,
  Tooltip,
} from "@mantine/core";
import {
  IconAlertCircle,
  IconInfoCircle,
  IconDeviceFloppy,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

interface CreateEntityModalProps {
  opened: boolean;
  onClose: () => void;
  onEntityCreated?: () => void;
  fromManage?: boolean; // Indicates if called from manage entities page
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
}

const CreateEntityModal: React.FC<CreateEntityModalProps> = ({
  opened,
  onClose,
  onEntityCreated,
  fromManage = false,
}) => {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{
    name?: string;
    contact_email?: string;
  }>({});

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
  });

  // Form validation
  const validateForm = () => {
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

  const handleCreate = async () => {
    try {
      setSubmitting(true);

      // Validate form
      if (!validateForm()) {
        notifications.show({
          title: "Validation Error",
          message:
            "Please fix the validation errors before creating the entity",
          color: "red",
        });
        setSubmitting(false);
        return;
      }

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

      const response = await apiClient.post("/api/tenants/", basicInfo);
      const newEntity = response.data;

      // Smooth transition delay (2 seconds for better UX)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      notifications.show({
        title: "Success",
        message:
          "Entity created successfully! Redirecting to configuration page...",
        color: "green",
      });

      // Call callback if provided to refresh entities
      if (onEntityCreated) {
        onEntityCreated();
      }

      // Close modal
      onClose();

      // Reset form
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
        default_fitment_method: "manual",
      });

      // Redirect to standalone edit page with from=manage parameter only if called from manage entities
      const redirectUrl = fromManage
        ? `/edit-entity-standalone/${newEntity.id}?from=manage`
        : `/edit-entity-standalone/${newEntity.id}`;
      navigate(redirectUrl);
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error?.response?.data?.error || "Failed to create entity",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!submitting) {
      onClose();
      // Reset form on close
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
        default_fitment_method: "manual",
      });
    }
  };

  return (
    <Modal
      opened={opened}
      onClose={handleClose}
      title={
        <Text
          fw={650}
          style={{
            fontSize: "18px",
            color: "#1a1a1a",
            letterSpacing: "-0.015em",
          }}
        >
          Create New Entity
        </Text>
      }
      size="lg"
      centered
      radius="12px"
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
      styles={{
        title: {
          paddingLeft: "var(--mantine-spacing-sm)",
          paddingRight: "var(--mantine-spacing-sm)",
        },
        content: {
          border: "1px solid #e9ecef",
        },
      }}
    >
      <Stack gap="lg" px="sm">
        <Alert
          color="blue"
          icon={<IconAlertCircle size={16} />}
          styles={{
            root: {
              borderRadius: "8px",
            },
            title: {
              fontWeight: 600,
              fontSize: "14px",
            },
            message: {
              fontWeight: 500,
              fontSize: "14px",
            },
          }}
        >
          <Text size="sm">
            Fill in the basic information below. You can configure additional
            settings after creation.
          </Text>
        </Alert>

        <div>
          <Stack gap="md">
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
              disabled={submitting}
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
              placeholder="Enter entity URL slug (optional)"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              disabled={submitting}
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
              label="Description"
              placeholder="Enter entity description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
              disabled={submitting}
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

        <Divider label="Contact Information" />

        <div>
          <Stack gap="md">
            <TextInput
              label="Contact Email"
              placeholder="contact@example.com"
              value={formData.contact_email}
              onChange={(e) => {
                setFormData({ ...formData, contact_email: e.target.value });
                if (validationErrors.contact_email) {
                  setValidationErrors({
                    ...validationErrors,
                    contact_email: "",
                  });
                }
              }}
              error={validationErrors.contact_email}
              disabled={submitting}
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
              label="Contact Phone"
              placeholder="+1 (555) 123-4567"
              value={formData.contact_phone}
              onChange={(e) =>
                setFormData({ ...formData, contact_phone: e.target.value })
              }
              disabled={submitting}
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
              label="Company Address"
              placeholder="Enter company address"
              value={formData.company_address}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  company_address: e.target.value,
                })
              }
              rows={2}
              disabled={submitting}
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

        <Divider label="Fitment Settings" />

        <div>
          <Group gap="xs" mb="xs">
            <Text fw={600} size="sm" style={{ color: "#1a1a1a" }}>
              Fitment Configuration
            </Text>
            <Tooltip label="Configure default fitment method and AI instructions">
              <IconInfoCircle size={16} color="#9ca3af" />
            </Tooltip>
          </Group>
          <Stack gap="md">
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
              disabled={submitting}
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
              placeholder="Enter AI instructions for fitment processing"
              value={formData.ai_instructions}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  ai_instructions: e.target.value,
                })
              }
              rows={3}
              disabled={submitting}
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
          <Text fw={600} size="sm" mb="md" style={{ color: "#1a1a1a" }}>
            Entity Status
          </Text>
          <Group gap="xl">
            <Switch
              label="Active"
              description="Enable or disable this entity"
              checked={formData.is_active}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_active: e.currentTarget.checked,
                })
              }
              disabled={submitting}
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
            <Switch
              label="Default Entity"
              description="Set as default entity for new users"
              checked={formData.is_default}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  is_default: e.currentTarget.checked,
                })
              }
              disabled={submitting}
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
          </Group>
        </div>

        <Group justify="flex-end" mt="md">
          <Button
            variant="light"
            onClick={handleClose}
            disabled={submitting}
            style={{
              fontWeight: 500,
              borderRadius: "8px",
            }}
          >
            Cancel
          </Button>
          <Button
            leftSection={<IconDeviceFloppy size={18} />}
            onClick={handleCreate}
            loading={submitting}
            style={{
              fontWeight: 600,
              borderRadius: "8px",
              background: "#2563eb",
            }}
          >
            Create Entity
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
};

export default CreateEntityModal;
