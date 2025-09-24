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
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconBuilding,
  IconUsers,
  IconSettings,
  IconRefresh,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useEntity } from "../hooks/useEntity";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

interface Entity {
  id: string;
  name: string;
  slug: string;
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
}

const EntityManagement: React.FC = () => {
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

  const handleDelete = async (entity: Entity) => {
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

  const openEditModal = (entity: Entity) => {
    setSelectedEntity(entity);
    setFormData({
      name: entity.name,
      slug: entity.slug,
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
          <Group gap="md">
            <IconBuilding size={32} />
            <Title order={1}>Entity Management</Title>
          </Group>
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
                    <Table.Th>Slug</Table.Th>
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
                          {entity.slug}
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
              label="Slug"
              placeholder="Enter entity slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
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

        {/* Edit Modal */}
        <Modal
          opened={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Entity"
          size="lg"
        >
          <Stack gap="md" p="10px">
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
              label="Slug"
              placeholder="Enter entity slug"
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              required
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
                onClick={() => setIsEditModalOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button onClick={handleEdit} loading={submitting}>
                Update Entity
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default EntityManagement;
