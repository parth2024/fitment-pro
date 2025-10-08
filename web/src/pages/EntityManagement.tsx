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
  Stack,
  Alert,
  Loader,
  Tooltip,
  Modal,
  TextInput,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconInfoCircle,
  IconSettings,
  IconCheck,
  IconBuilding,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import { useEntity } from "../hooks/useEntity";
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

const EntityManagement: React.FC = () => {
  const { entities, loading, error, refreshEntities, switchEntity } =
    useEntity();
  const navigate = useNavigate();
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleEdit = (entity: Entity) => {
    navigate(`/edit-entity/${entity.id}`);
  };

  const handleSettings = (entity: Entity) => {
    navigate(`/edit-entity/${entity.id}`);
  };

  const handleSelectEntity = async (entity: Entity) => {
    try {
      await switchEntity(entity.id);
      notifications.show({
        title: "Success",
        message: `Switched to ${entity.name}`,
        color: "green",
      });
      navigate("/analytics");
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to switch entity",
        color: "red",
      });
    }
  };

  const openDeleteModal = (entity: Entity) => {
    setEntityToDelete(entity);
    setConfirmText("");
    setDeleteModalOpen(true);
  };

  const handleDelete = async () => {
    if (!entityToDelete || confirmText !== entityToDelete.name) {
      return;
    }

    try {
      setDeleting(true);
      await apiClient.delete(`/api/tenants/${entityToDelete.id}/`);
      notifications.show({
        title: "Success",
        message: "Entity deleted successfully",
        color: "green",
      });
      setDeleteModalOpen(false);
      setEntityToDelete(null);
      await refreshEntities();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete entity",
        color: "red",
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleCreate = () => {
    navigate("/create-entity");
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
        {/* Header */}
        <Group justify="space-between" align="center">
          <div>
            <Title order={2} mb="xs">
              Entity Management
            </Title>
            <Text size="sm" c="dimmed">
              Manage all your entities, configure settings, and switch between
              them
            </Text>
          </div>
          <Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="outline"
              onClick={refreshEntities}
              size="md"
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={handleCreate}
              size="md"
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
              }}
            >
              Create New Entity
            </Button>
          </Group>
        </Group>

        {/* Entities List */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Table striped highlightOnHover verticalSpacing="md">
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Name</Table.Th>
                <Table.Th>URL</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Created</Table.Th>
                <Table.Th style={{ textAlign: "right" }}>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {entities.map((entity) => (
                <Table.Tr key={entity.id}>
                  <Table.Td>
                    <Group gap="xs">
                      <IconBuilding size={18} color="#3b82f6" />
                      <div>
                        <Text fw={600} size="sm">
                          {entity.name}
                        </Text>
                        {entity.description && (
                          <Text size="xs" c="dimmed" lineClamp={1}>
                            {entity.description}
                          </Text>
                        )}
                      </div>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {entity.slug || "-"}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <Badge
                        color={entity.is_active ? "green" : "red"}
                        variant="light"
                      >
                        {entity.is_active ? "Active" : "Inactive"}
                      </Badge>
                      {entity.is_default && (
                        <Badge color="blue" variant="light">
                          Default
                        </Badge>
                      )}
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {new Date(entity.created_at).toLocaleDateString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs" justify="flex-end">
                      <Tooltip label="Select & Use Entity">
                        <ActionIcon
                          color="blue"
                          variant="light"
                          onClick={() => handleSelectEntity(entity)}
                          size="lg"
                        >
                          <IconCheck size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Entity Settings">
                        <ActionIcon
                          color="violet"
                          variant="light"
                          onClick={() => handleSettings(entity)}
                          size="lg"
                        >
                          <IconSettings size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Edit Entity">
                        <ActionIcon
                          color="orange"
                          variant="light"
                          onClick={() => handleEdit(entity)}
                          size="lg"
                        >
                          <IconEdit size={18} />
                        </ActionIcon>
                      </Tooltip>
                      <Tooltip label="Delete Entity">
                        <ActionIcon
                          color="red"
                          variant="light"
                          onClick={() => openDeleteModal(entity)}
                          size="lg"
                        >
                          <IconTrash size={18} />
                        </ActionIcon>
                      </Tooltip>
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => {
          setDeleteModalOpen(false);
          setEntityToDelete(null);
          setConfirmText("");
        }}
        title="Delete Entity"
        centered
      >
        <Stack gap="md">
          <Alert
            color="red"
            title="Warning"
            icon={<IconInfoCircle size={16} />}
          >
            This action cannot be undone. All data associated with this entity
            will be permanently deleted.
          </Alert>
          {entityToDelete && (
            <>
              <Text>
                Please type <strong>{entityToDelete.name}</strong> to confirm
                deletion:
              </Text>
              <TextInput
                placeholder={`Type "${entityToDelete.name}" to confirm`}
                value={confirmText}
                onChange={(e) => setConfirmText(e.target.value)}
              />
              <Group justify="flex-end" mt="md">
                <Button
                  variant="outline"
                  onClick={() => {
                    setDeleteModalOpen(false);
                    setEntityToDelete(null);
                    setConfirmText("");
                  }}
                  disabled={deleting}
                >
                  Cancel
                </Button>
                <Button
                  color="red"
                  onClick={handleDelete}
                  loading={deleting}
                  disabled={confirmText !== entityToDelete.name}
                >
                  Delete Entity
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Container>
  );
};

export default EntityManagement;
