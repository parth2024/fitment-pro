import React, { useState, useEffect } from "react";
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
  IconTrash,
  IconRefresh,
  IconInfoCircle,
  IconSettings,
  IconCheck,
  IconBuilding,
  IconArrowLeft,
} from "@tabler/icons-react";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";
import CreateEntityModal from "../components/CreateEntityModal";

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

const ManageEntitiesStandalone: React.FC = () => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [entityToDelete, setEntityToDelete] = useState<Entity | null>(null);
  const [confirmText, setConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/tenants/");
      setEntities(response.data);
    } catch (err) {
      console.error("Failed to fetch entities:", err);
      setError("Failed to load entities");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleSettings = (entity: Entity) => {
    // Navigate to standalone edit page (same as edit)
    window.location.href = `/edit-entity-standalone/${entity.id}`;
  };

  const handleSelectEntity = async (entity: Entity) => {
    try {
      // Switch to the entity
      await apiClient.post(`/api/tenants/switch/${entity.id}/`);

      // Update localStorage
      localStorage.setItem("current_entity", JSON.stringify(entity));

      // Dispatch event to notify other components
      const entityChangeEvent = new CustomEvent("entityChanged", {
        detail: { entity, entityId: entity.id },
      });
      window.dispatchEvent(entityChangeEvent);

      notifications.show({
        title: "Success",
        message: `Switched to ${entity.name}. Redirecting to dashboard...`,
        color: "green",
      });

      // Navigate to analytics with page reload to fetch new data
      setTimeout(() => {
        window.location.href = "/analytics";
      }, 500);
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
      await fetchEntities();
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

  const handleBackToApp = () => {
    window.location.href = "/analytics";
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center" style={{ minHeight: "60vh" }}>
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
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        padding: "40px 0",
      }}
    >
      <Container size="xl">
        <Stack gap="xl">
          {/* Header */}
          <Stack gap="md">
            {/* Back Button - Top Left */}
            <Group>
              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="subtle"
                onClick={handleBackToApp}
                size="sm"
                style={{ fontSize: "14px" }}
              >
                Back to App
              </Button>
            </Group>

            {/* Title and Actions - Second Line */}
            <Group justify="space-between" align="flex-start">
              <div>
                <Title order={3}>Entity Management</Title>
                <Text size="sm" c="dimmed">
                  Manage all your entities, configure settings, and switch
                  between them
                </Text>
              </div>
              <Group>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  variant="light"
                  onClick={fetchEntities}
                  size="sm"
                >
                  Refresh
                </Button>
                <Button
                  leftSection={<IconPlus size={16} />}
                  onClick={() => setCreateModalOpened(true)}
                  size="sm"
                  color="blue"
                >
                  Create Entity
                </Button>
              </Group>
            </Group>
          </Stack>

          {/* Entities List */}
          <Card shadow="sm" padding="xl" radius="md" withBorder>
            <Table striped highlightOnHover verticalSpacing="md">
              <Table.Thead>
                <Table.Tr>
                  <Table.Th style={{ width: "30%" }}>Name</Table.Th>
                  <Table.Th style={{ width: "15%" }}>URL</Table.Th>
                  <Table.Th style={{ width: "20%" }}>Status</Table.Th>
                  <Table.Th style={{ width: "15%" }}>Created</Table.Th>
                  <Table.Th style={{ width: "20%", textAlign: "right" }}>
                    Actions
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {entities.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <Text ta="center" c="dimmed" py="xl">
                        No entities found. Create your first entity to get
                        started.
                      </Text>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  entities.map((entity) => (
                    <Table.Tr key={entity.id}>
                      <Table.Td style={{ verticalAlign: "top" }}>
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
                      <Table.Td
                        style={{ verticalAlign: "top", paddingTop: "8px" }}
                      >
                        <Text size="sm" c="dimmed">
                          {entity.slug || "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td
                        style={{ verticalAlign: "top", paddingTop: "6px" }}
                      >
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
                      <Table.Td
                        style={{ verticalAlign: "top", paddingTop: "8px" }}
                      >
                        <Text size="sm" c="dimmed">
                          {new Date(entity.created_at).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td
                        style={{
                          verticalAlign: "top",
                          textAlign: "right",
                          paddingTop: "6px",
                        }}
                      >
                        <Group gap="xs" justify="flex-end">
                          <Tooltip label="Select & Use Entity">
                            <ActionIcon
                              color="blue"
                              variant="subtle"
                              onClick={() => handleSelectEntity(entity)}
                              size="sm"
                            >
                              <IconCheck size={16} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Entity Settings">
                            <ActionIcon
                              color="gray"
                              variant="subtle"
                              onClick={() => handleSettings(entity)}
                              size="sm"
                            >
                              <IconSettings size={16} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Delete Entity">
                            <ActionIcon
                              color="red"
                              variant="subtle"
                              onClick={() => openDeleteModal(entity)}
                              size="sm"
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Tooltip>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))
                )}
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
                    variant="subtle"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setEntityToDelete(null);
                      setConfirmText("");
                    }}
                    disabled={deleting}
                    size="sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    color="red"
                    variant="subtle"
                    onClick={handleDelete}
                    loading={deleting}
                    disabled={confirmText !== entityToDelete.name}
                    size="sm"
                  >
                    Delete
                  </Button>
                </Group>
              </>
            )}
          </Stack>
        </Modal>

        {/* Create Entity Modal */}
        <CreateEntityModal
          opened={createModalOpened}
          onClose={() => setCreateModalOpened(false)}
        />
      </Container>
    </div>
  );
};

export default ManageEntitiesStandalone;
