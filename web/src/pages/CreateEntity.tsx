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
  Divider,
  Select,
} from "@mantine/core";
import { IconArrowLeft } from "@tabler/icons-react";
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
}

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

      // Redirect to new entity settings page
      navigate(`/new-entity-settings/${newEntity.id}`);
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
              size="md"
            >
              Back to Entities
            </Button>
            <Title order={2}>Create New Entity</Title>
          </Group>
        </Group>

        {/* Create Form */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
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

          <Group justify="flex-end" mt="xl">
            <Button
              variant="outline"
              onClick={() => navigate("/entities")}
              disabled={submitting}
              size="md"
            >
              Cancel
            </Button>
            <Button onClick={handleCreate} loading={submitting} size="md">
              Create Entity
            </Button>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
};

export default CreateEntity;
