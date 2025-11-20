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
  Pagination,
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
  IconCar,
  IconSearch,
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
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [creatingEntity, setCreatingEntity] = useState(false);
  const [navigatingBack, setNavigatingBack] = useState(false);
  const ITEMS_PER_PAGE = 10;

  const fetchEntities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/tenants/");
      setEntities(response.data);
      setCurrentPage(1); // Reset to first page on refresh
    } catch (err) {
      console.error("Failed to fetch entities:", err);
      setError("Failed to load entities");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    try {
      setRefreshing(true);

      // Smooth transition delay (1.5 seconds for better UX)
      await new Promise((resolve) => setTimeout(resolve, 1500));

      await fetchEntities();

      notifications.show({
        title: "Success",
        message: "Entities refreshed successfully",
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to refresh entities",
        color: "red",
      });
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchEntities();
  }, []);

  const handleSettings = (entity: Entity) => {
    // Navigate to standalone edit page (same as edit)
    // Add 'from' parameter to indicate we came from manage entities
    window.location.href = `/edit-entity-standalone/${entity.id}?from=manage`;
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

  const handleBackToApp = async () => {
    try {
      setNavigatingBack(true);

      // Smooth transition delay (2 seconds for better UX)
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Navigate back to analytics
      window.location.href = "/analytics";
    } catch (error) {
      setNavigatingBack(false);
    }
  };

  const handleCreateEntity = async () => {
    try {
      setCreatingEntity(true);

      // Smooth transition delay (1 second for better UX)
      // await new Promise((resolve) => setTimeout(resolve, 500));

      setCreateModalOpened(true);
    } catch (error) {
      setCreatingEntity(false);
    } finally {
      setCreatingEntity(false);
    }
  };

  // Filter entities based on search query
  const filteredEntities = entities.filter((entity) =>
    entity.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Calculate pagination for filtered results
  const totalPages = Math.ceil(filteredEntities.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const endIndex = startIndex + ITEMS_PER_PAGE;
  const paginatedEntities = filteredEntities.slice(startIndex, endIndex);

  // Reset to page 1 when search query changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  // Reset to page 1 when entities change
  useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [filteredEntities.length, currentPage, totalPages]);

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
            Loading entities...
          </Text>
        </Stack>
      </div>
    );
  }

  if (error) {
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
            {error}
          </Alert>
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
                  Entity Management
                </Text>
              </div>
            </Group>

            {/* Back Button */}
            <Button
              leftSection={<IconArrowLeft size={18} />}
              size="sm"
              onClick={handleBackToApp}
              loading={navigatingBack}
              disabled={refreshing || creatingEntity}
              style={{
                fontWeight: 500,
                borderRadius: "8px",
                background: "#2563eb",
              }}
            >
              Back to App
            </Button>
          </Group>
        </Container>
      </div>

      <Container size="xl">
        <Stack gap="24">
          {/* Page Header */}
          <Group justify="space-between" align="flex-start">
            <div>
              <Title
                order={2}
                style={{
                  fontWeight: 650,
                  fontSize: "24px",
                  color: "#1a1a1a",
                  letterSpacing: "-0.02em",
                }}
              >
                Manage Entities
              </Title>
              <Text
                size="sm"
                c="dimmed"
                style={{
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                Configure settings, create new entities, and switch between them
              </Text>
            </div>
            <Group gap="sm">
              <Button
                leftSection={<IconRefresh size={18} />}
                variant="light"
                onClick={handleRefresh}
                loading={refreshing}
                disabled={creatingEntity || navigatingBack}
                style={{
                  fontWeight: 500,
                  borderRadius: "8px",
                }}
              >
                Refresh
              </Button>
              <Button
                leftSection={<IconPlus size={18} />}
                onClick={handleCreateEntity}
                // loading={creatingEntity}
                disabled={refreshing || navigatingBack}
                style={{
                  fontWeight: 600,
                  borderRadius: "8px",
                  background: "#2563eb",
                }}
              >
                Create Entity
              </Button>
            </Group>
          </Group>

          {/* Search Bar */}
          <TextInput
            placeholder="Search entities by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.currentTarget.value)}
            leftSection={<IconSearch size={18} />}
            styles={{
              input: {
                borderRadius: "8px",
                fontSize: "14px",
                fontWeight: 500,
                border: "1px solid #e9ecef",
                padding: "10px 12px 10px 40px",
                "&:focus": {
                  borderColor: "#2563eb",
                },
              },
            }}
            style={{
              maxWidth: "400px",
            }}
          />

          {/* Entities List */}
          <Card
            padding="0"
            radius="12px"
            style={{
              border: "1px solid #e9ecef",
              overflow: "hidden",
            }}
          >
            <Table highlightOnHover verticalSpacing="sm">
              <Table.Thead>
                <Table.Tr
                  style={{
                    background: "#f8f9fa",
                    borderBottom: "1px solid #e9ecef",
                  }}
                >
                  <Table.Th
                    style={{
                      width: "30%",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "#4b5563",
                      padding: "16px 24px",
                    }}
                  >
                    Entity Name
                  </Table.Th>
                  <Table.Th
                    style={{
                      width: "15%",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "#4b5563",
                      padding: "16px 16px",
                    }}
                  >
                    Slug
                  </Table.Th>
                  <Table.Th
                    style={{
                      width: "20%",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "#4b5563",
                      padding: "16px 16px",
                    }}
                  >
                    Status
                  </Table.Th>
                  <Table.Th
                    style={{
                      width: "15%",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "#4b5563",
                      padding: "16px 16px",
                    }}
                  >
                    Created
                  </Table.Th>
                  <Table.Th
                    style={{
                      width: "20%",
                      textAlign: "right",
                      fontWeight: 600,
                      fontSize: "13px",
                      color: "#4b5563",
                      padding: "16px 24px",
                    }}
                  >
                    Actions
                  </Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {filteredEntities.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={5}>
                      <div
                        style={{
                          padding: "64px 24px",
                          textAlign: "center",
                        }}
                      >
                        <IconBuilding
                          size={48}
                          color="#cbd5e1"
                          style={{ marginBottom: "16px" }}
                        />
                        <Text
                          fw={500}
                          size="sm"
                          c="dimmed"
                          style={{ fontSize: "14px", color: "#6b7280" }}
                        >
                          {searchQuery
                            ? `No entities found matching "${searchQuery}"`
                            : "No entities found. Create your first entity to get started."}
                        </Text>
                      </div>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  paginatedEntities.map((entity) => (
                    <Table.Tr
                      key={entity.id}
                      style={{ borderBottom: "1px solid #f1f5f9" }}
                    >
                      <Table.Td
                        style={{
                          verticalAlign: "top",
                          padding: "16px 24px",
                        }}
                      >
                        <Group gap="10px">
                          <IconBuilding
                            size={20}
                            color="#2563eb"
                            stroke={1.75}
                          />
                          <div>
                            <Text
                              fw={600}
                              size="sm"
                              style={{
                                fontSize: "14px",
                                color: "#1a1a1a",
                                marginBottom: "2px",
                              }}
                            >
                              {entity.name}
                            </Text>
                            {entity.description && (
                              <Text
                                size="xs"
                                c="dimmed"
                                lineClamp={1}
                                style={{
                                  fontSize: "13px",
                                  color: "#6b7280",
                                  fontWeight: 500,
                                }}
                              >
                                {entity.description}
                              </Text>
                            )}
                          </div>
                        </Group>
                      </Table.Td>
                      <Table.Td
                        style={{
                          verticalAlign: "top",
                          padding: "16px",
                        }}
                      >
                        <Text
                          size="sm"
                          c="dimmed"
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            fontWeight: 500,
                          }}
                        >
                          {entity.slug || "-"}
                        </Text>
                      </Table.Td>
                      <Table.Td
                        style={{
                          verticalAlign: "top",
                          padding: "16px",
                        }}
                      >
                        <Group gap="6px">
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
                      </Table.Td>
                      <Table.Td
                        style={{
                          verticalAlign: "top",
                          padding: "16px",
                        }}
                      >
                        <Text
                          size="sm"
                          c="dimmed"
                          style={{
                            fontSize: "13px",
                            color: "#6b7280",
                            fontWeight: 500,
                          }}
                        >
                          {new Date(entity.created_at).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td
                        style={{
                          verticalAlign: "top",
                          textAlign: "right",
                          padding: "16px 24px",
                        }}
                      >
                        <Group gap="6px" justify="flex-end">
                          <Tooltip label="Select & Use Entity">
                            <ActionIcon
                              color="blue"
                              variant="light"
                              onClick={() => handleSelectEntity(entity)}
                              size="lg"
                              style={{ borderRadius: "8px" }}
                            >
                              <IconCheck size={18} stroke={2} />
                            </ActionIcon>
                          </Tooltip>
                          <Tooltip label="Entity Settings">
                            <ActionIcon
                              color="gray"
                              variant="light"
                              onClick={() => handleSettings(entity)}
                              size="lg"
                              style={{ borderRadius: "8px" }}
                            >
                              <IconSettings size={18} stroke={1.75} />
                            </ActionIcon>
                          </Tooltip>

                          <Tooltip label="Delete Entity">
                            <ActionIcon
                              color="red"
                              variant="light"
                              onClick={() => openDeleteModal(entity)}
                              size="lg"
                              style={{ borderRadius: "8px" }}
                            >
                              <IconTrash size={18} stroke={1.75} />
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

          {/* Pagination */}
          {filteredEntities.length > ITEMS_PER_PAGE && (
            <Group justify="space-between" align="center">
              <Text
                size="sm"
                c="dimmed"
                style={{
                  fontWeight: 500,
                  fontSize: "14px",
                  color: "#6b7280",
                }}
              >
                Showing {startIndex + 1} to{" "}
                {Math.min(endIndex, filteredEntities.length)} of{" "}
                {filteredEntities.length} {searchQuery ? "filtered " : ""}
                {filteredEntities.length === 1 ? "entity" : "entities"}
              </Text>
              <Pagination
                total={totalPages}
                value={currentPage}
                onChange={setCurrentPage}
                size="sm"
                styles={{
                  control: {
                    borderRadius: "6px",
                    fontWeight: 500,
                    fontSize: "14px",
                    border: "1px solid #e9ecef",
                    "&[data-active]": {
                      background: "#2563eb",
                      borderColor: "#2563eb",
                      fontWeight: 600,
                    },
                  },
                }}
              />
            </Group>
          )}

          {/* Bottom Spacing */}
          <div style={{ height: "40px" }} />
        </Stack>

        {/* Delete Confirmation Modal */}
        <Modal
          opened={deleteModalOpen}
          onClose={() => {
            setDeleteModalOpen(false);
            setEntityToDelete(null);
            setConfirmText("");
          }}
          title={
            <Text
              fw={650}
              style={{
                fontSize: "18px",
                color: "#1a1a1a",
                letterSpacing: "-0.015em",
              }}
            >
              Delete Entity
            </Text>
          }
          centered
          radius="12px"
          size="md"
        >
          <Stack gap="md">
            <Alert
              color="red"
              title="Warning"
              icon={<IconInfoCircle size={18} />}
              variant="light"
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
              This action cannot be undone. All data associated with this entity
              will be permanently deleted.
            </Alert>
            {entityToDelete && (
              <>
                <Text
                  style={{
                    fontWeight: 500,
                    fontSize: "14px",
                    color: "#4b5563",
                  }}
                >
                  Please type{" "}
                  <strong style={{ color: "#1a1a1a" }}>
                    {entityToDelete.name}
                  </strong>{" "}
                  to confirm deletion:
                </Text>
                <TextInput
                  placeholder={`Type "${entityToDelete.name}" to confirm`}
                  value={confirmText}
                  onChange={(e) => setConfirmText(e.target.value)}
                  styles={{
                    input: {
                      borderRadius: "8px",
                      fontSize: "14px",
                      fontWeight: 500,
                      border: "1px solid #e9ecef",
                      "&:focus": {
                        borderColor: "#ef4444",
                      },
                    },
                  }}
                />
                <Group justify="flex-end" mt="md" gap="sm">
                  <Button
                    variant="light"
                    onClick={() => {
                      setDeleteModalOpen(false);
                      setEntityToDelete(null);
                      setConfirmText("");
                    }}
                    disabled={deleting}
                    style={{
                      fontWeight: 500,
                      borderRadius: "8px",
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    color="red"
                    onClick={handleDelete}
                    loading={deleting}
                    disabled={confirmText !== entityToDelete.name}
                    style={{
                      fontWeight: 600,
                      borderRadius: "8px",
                    }}
                  >
                    Delete Entity
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
          fromManage={true}
        />
      </Container>
    </div>
  );
};

export default ManageEntitiesStandalone;
