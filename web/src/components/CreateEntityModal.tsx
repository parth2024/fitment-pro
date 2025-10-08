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
} from "@mantine/core";
import { IconAlertCircle } from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

interface CreateEntityModalProps {
  opened: boolean;
  onClose: () => void;
  onEntityCreated?: () => void;
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
}) => {
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
  });

  const handleCreate = async () => {
    try {
      setSubmitting(true);

      // Validate required fields
      if (!formData.name.trim()) {
        notifications.show({
          title: "Validation Error",
          message: "Entity name is required",
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

      notifications.show({
        title: "Success",
        message:
          "Entity created successfully! Configure additional settings below.",
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

      // Redirect to standalone edit page
      navigate(`/edit-entity-standalone/${newEntity.id}`);
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
      title="Create New Entity"
      size="lg"
      centered
      closeOnClickOutside={!submitting}
      closeOnEscape={!submitting}
    >
      <Stack gap="md">
        <Alert color="blue" icon={<IconAlertCircle size={16} />}>
          <Text size="sm">
            Fill in the basic information below. You can configure additional
            settings after creation.
          </Text>
        </Alert>

        <TextInput
          label="Name"
          placeholder="Enter entity name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          disabled={submitting}
        />

        <TextInput
          label="URL"
          placeholder="Enter entity URL (optional)"
          value={formData.slug}
          onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
          disabled={submitting}
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
        />

        <Divider label="Contact Information" />

        <TextInput
          label="Contact Email"
          placeholder="Enter contact email"
          value={formData.contact_email}
          onChange={(e) =>
            setFormData({ ...formData, contact_email: e.target.value })
          }
          disabled={submitting}
        />

        <TextInput
          label="Contact Phone"
          placeholder="Enter contact phone"
          value={formData.contact_phone}
          onChange={(e) =>
            setFormData({ ...formData, contact_phone: e.target.value })
          }
          disabled={submitting}
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
        />

        <Divider label="Fitment Settings" />

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
            disabled={submitting}
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
            disabled={submitting}
          />
        </Group>

        <Group justify="flex-end" mt="md">
          <Button variant="outline" onClick={handleClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            onClick={handleCreate}
            loading={submitting}
            style={{
              background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
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
