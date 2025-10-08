import React, { useState, useEffect } from "react";
import {
  Select,
  Button,
  Card,
  Text,
  Group,
  Badge,
  Stack,
  Loader,
  Alert,
  Menu,
  ActionIcon,
} from "@mantine/core";
import {
  IconBuilding,
  IconRefresh,
  IconInfoCircle,
  IconPlus,
  IconSettings,
  IconChevronDown,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";
import CreateEntityModal from "./CreateEntityModal";

interface Entity {
  id: string;
  name: string;
  slug: string | null;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  user_count: number;
  created_at: string;
}

interface EntitySelectorProps {
  currentEntityId?: string;
  onEntityChange?: (entity: Entity) => void;
  showStats?: boolean;
  compact?: boolean;
}

export const EntitySelector: React.FC<EntitySelectorProps> = ({
  currentEntityId,
  onEntityChange,
  showStats = false,
  compact = false,
}) => {
  const navigate = useNavigate();
  const [entities, setEntities] = useState<Entity[]>([]);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [menuOpened, setMenuOpened] = useState(false);
  const [createModalOpened, setCreateModalOpened] = useState(false);

  const fetchEntities = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/tenants/");
      setEntities(response.data);

      // Set current entity if provided
      if (currentEntityId) {
        const entity = response.data.find(
          (e: Entity) => e.id === currentEntityId
        );
        setCurrentEntity(entity || null);
      } else {
        // Check if we already have a current entity from localStorage
        if (!currentEntity) {
          // Find default entity
          const defaultEntity = response.data.find((e: Entity) => e.is_default);
          const entityToSet = defaultEntity || response.data[0] || null;
          setCurrentEntity(entityToSet);

          // Save to localStorage if we set a new entity
          if (entityToSet) {
            localStorage.setItem("current_entity", JSON.stringify(entityToSet));
          }
        }
      }
    } catch (err) {
      console.error("Failed to fetch entities:", err);
      setError("Failed to load entities");
    } finally {
      setLoading(false);
    }
  };

  const fetchCurrentEntity = async () => {
    try {
      console.log("DEBUG: fetchCurrentEntity called");

      // Check URL parameters first (for entity switching)
      const urlParams = new URLSearchParams(window.location.search);
      const entityIdFromUrl = urlParams.get("entity");
      console.log("DEBUG: entityIdFromUrl:", entityIdFromUrl);

      if (entityIdFromUrl) {
        // Find the entity in our entities list
        const entityFromUrl = entities.find((e) => e.id === entityIdFromUrl);
        if (entityFromUrl) {
          console.log(
            "DEBUG: Using entity from URL:",
            entityFromUrl.name,
            entityFromUrl.id
          );
          setCurrentEntity(entityFromUrl);
          localStorage.setItem("current_entity", JSON.stringify(entityFromUrl));
          // Remove the URL parameter
          const newUrl = new URL(window.location.href);
          newUrl.searchParams.delete("entity");
          window.history.replaceState({}, "", newUrl.toString());
          return;
        }
      }

      // First check localStorage for the current entity
      const storedEntity = localStorage.getItem("current_entity");
      console.log("DEBUG: storedEntity from localStorage:", storedEntity);

      if (storedEntity) {
        try {
          const entity = JSON.parse(storedEntity);
          setCurrentEntity(entity);
          console.log(
            "DEBUG: Using entity from localStorage:",
            entity.name,
            entity.id
          );
          return;
        } catch (err) {
          console.warn(
            "Invalid entity data in localStorage, fetching from API"
          );
          localStorage.removeItem("current_entity");
        }
      }

      // Fallback to API if localStorage is empty or invalid
      console.log("DEBUG: Fetching entity from API...");
      const response = await apiClient.get("/api/tenants/current/");
      setCurrentEntity(response.data);
      console.log(
        "DEBUG: Fetched entity from API:",
        response.data.name,
        response.data.id
      );
    } catch (err) {
      console.error("Failed to fetch current entity:", err);
    }
  };

  // Load current entity on mount and when entities change
  useEffect(() => {
    if (entities.length > 0) {
      fetchCurrentEntity();
    }
  }, [entities]);

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    if (currentEntityId) {
      fetchCurrentEntity();
    }
  }, [currentEntityId]);

  // Listen for entity change events
  useEffect(() => {
    const handleEntityChanged = (event: CustomEvent) => {
      const { entity } = event.detail;
      if (entity) {
        setCurrentEntity(entity);
        console.log(
          "DEBUG: Entity changed event received:",
          entity.name,
          entity.id
        );
      }
    };

    window.addEventListener(
      "entityChanged",
      handleEntityChanged as EventListener
    );

    return () => {
      window.removeEventListener(
        "entityChanged",
        handleEntityChanged as EventListener
      );
    };
  }, []);

  const handleEntityChange = async (entityId: string) => {
    try {
      setSwitching(true);
      setError(null);

      const entity = entities.find((e) => e.id === entityId);
      if (!entity) return;

      // Switch to the new entity
      await apiClient.post(`/api/tenants/switch/${entityId}/`);

      // Update local state
      setCurrentEntity(entity);

      // Save to localStorage for API client to use
      localStorage.setItem("current_entity", JSON.stringify(entity));

      // Verify localStorage was set correctly
      const verifyEntity = localStorage.getItem("current_entity");
      console.log("DEBUG: localStorage set to:", verifyEntity);

      if (!verifyEntity || JSON.parse(verifyEntity).id !== entity.id) {
        console.error("DEBUG: localStorage verification failed!");
        // Try again
        localStorage.setItem("current_entity", JSON.stringify(entity));
        console.log(
          "DEBUG: localStorage retry:",
          localStorage.getItem("current_entity")
        );
      }

      // Trigger callback if provided
      if (onEntityChange) {
        onEntityChange(entity);
      }

      // Dispatch custom event to notify all components about entity change
      const entityChangeEvent = new CustomEvent("entityChanged", {
        detail: { entity, entityId },
      });
      window.dispatchEvent(entityChangeEvent);

      console.log("Entity switched to:", entity.name, "ID:", entity.id);

      // Force a synchronous localStorage write
      localStorage.setItem("current_entity", JSON.stringify(entity));

      // Small delay to ensure localStorage is saved before redirect
      setTimeout(() => {
        const finalCheck = localStorage.getItem("current_entity");
        console.log(
          "DEBUG: Final localStorage check before redirect:",
          finalCheck
        );

        // Double-check that localStorage has the correct entity
        if (finalCheck) {
          try {
            const storedEntity = JSON.parse(finalCheck);
            if (storedEntity.id === entity.id) {
              console.log(
                "DEBUG: localStorage verified, redirecting to analytics"
              );
              // Redirect to analytics with entity ID as backup
              window.location.href = `/analytics?entity=${entity.id}`;
            } else {
              console.error("DEBUG: localStorage mismatch, forcing update");
              localStorage.setItem("current_entity", JSON.stringify(entity));
              window.location.href = `/analytics?entity=${entity.id}`;
            }
          } catch (err) {
            console.error("DEBUG: localStorage parse error, forcing update");
            localStorage.setItem("current_entity", JSON.stringify(entity));
            window.location.href = `/analytics?entity=${entity.id}`;
          }
        } else {
          console.error("DEBUG: No localStorage found, forcing update");
          localStorage.setItem("current_entity", JSON.stringify(entity));
          window.location.href = `/analytics?entity=${entity.id}`;
        }
      }, 200);
    } catch (err) {
      console.error("Failed to switch entity:", err);
    } finally {
      setSwitching(false);
    }
  };

  const handleRefresh = () => {
    fetchEntities();
  };

  // // Debug function to check localStorage
  // const debugLocalStorage = () => {
  //   const stored = localStorage.getItem("current_entity");
  //   console.log("DEBUG: Current localStorage:", stored);
  //   if (stored) {
  //     try {
  //       const parsed = JSON.parse(stored);
  //       console.log("DEBUG: Parsed entity:", parsed);
  //     } catch (err) {
  //       console.error("DEBUG: Parse error:", err);
  //     }
  //   }
  // };

  if (loading) {
    return (
      <Group>
        <Loader size="sm" />
        <Text size="sm" c="dimmed">
          Loading entities...
        </Text>
      </Group>
    );
  }

  if (error) {
    return (
      <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
        {error}
      </Alert>
    );
  }

  if (compact) {
    return (
      <>
        <Group gap="xs">
          <IconBuilding size={18} />
          <Menu
            shadow="md"
            width={280}
            position="bottom-end"
            opened={menuOpened}
            onChange={setMenuOpened}
          >
            <Menu.Target>
              <Button
                variant="light"
                size="sm"
                rightSection={<IconChevronDown size={16} />}
                disabled={switching}
                style={{
                  fontWeight: 500,
                  borderRadius: "8px",
                }}
              >
                {currentEntity?.name || "Select Entity"}
              </Button>
            </Menu.Target>

            <Menu.Dropdown>
              <Menu.Label>Switch Entity</Menu.Label>
              {entities.map((entity) => (
                <Menu.Item
                  key={entity.id}
                  onClick={() => {
                    handleEntityChange(entity.id);
                    setMenuOpened(false);
                  }}
                  leftSection={<IconBuilding size={16} />}
                  rightSection={
                    entity.id === currentEntity?.id ? (
                      <Badge size="xs" color="blue">
                        Current
                      </Badge>
                    ) : entity.is_default ? (
                      <Badge size="xs" color="gray">
                        Default
                      </Badge>
                    ) : null
                  }
                  style={{
                    backgroundColor:
                      entity.id === currentEntity?.id
                        ? "rgba(59, 130, 246, 0.1)"
                        : undefined,
                  }}
                >
                  {entity.name}
                </Menu.Item>
              ))}

              <Menu.Divider />

              <Menu.Item
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setMenuOpened(false);
                  setCreateModalOpened(true);
                }}
                style={{
                  fontWeight: 500,
                  color: "#3b82f6",
                }}
              >
                Create Entity
              </Menu.Item>

              <Menu.Item
                leftSection={<IconSettings size={16} />}
                onClick={() => {
                  setMenuOpened(false);
                  // Navigate to manage entities in same tab
                  navigate("/manage-entities");
                }}
                style={{
                  fontWeight: 500,
                }}
              >
                Manage Entities
              </Menu.Item>
            </Menu.Dropdown>
          </Menu>

          <ActionIcon
            variant="subtle"
            size="sm"
            onClick={handleRefresh}
            disabled={switching}
            style={{ borderRadius: "6px" }}
          >
            {switching ? <Loader size={14} /> : <IconRefresh size={16} />}
          </ActionIcon>
        </Group>

        {/* Create Entity Modal */}
        <CreateEntityModal
          opened={createModalOpened}
          onClose={() => setCreateModalOpened(false)}
          onEntityCreated={() => {
            // Refresh entities list after creation
            fetchEntities();
          }}
        />
      </>
    );
  }

  return (
    <>
      <Card shadow="sm" padding="md" radius="md" withBorder>
        <Stack gap="md">
          <Group justify="space-between" align="center">
            <Group gap="xs">
              <IconBuilding size={20} />
              <Text fw={500} size="lg">
                Current Entity
              </Text>
            </Group>
            <Button variant="subtle" size="xs" onClick={handleRefresh}>
              <IconRefresh size={14} />
            </Button>
          </Group>

          {currentEntity ? (
            <Stack gap="sm">
              <Group justify="space-between" align="flex-start">
                <Stack gap="xs">
                  <Text fw={500}>{currentEntity.name}</Text>
                  {currentEntity.description && (
                    <Text size="sm" c="dimmed">
                      {currentEntity.description}
                    </Text>
                  )}
                  <Group gap="xs">
                    <Badge
                      color={currentEntity.is_active ? "green" : "red"}
                      size="sm"
                    >
                      {currentEntity.is_active ? "Active" : "Inactive"}
                    </Badge>
                    {currentEntity.is_default && (
                      <Badge color="blue" size="sm">
                        Default
                      </Badge>
                    )}
                  </Group>
                </Stack>

                {showStats && (
                  <Stack gap="xs" align="flex-end">
                    <Text size="sm" c="dimmed">
                      {currentEntity.user_count} users
                    </Text>
                    <Text size="xs" c="dimmed">
                      Created{" "}
                      {new Date(currentEntity.created_at).toLocaleDateString()}
                    </Text>
                  </Stack>
                )}
              </Group>

              <Select
                label="Switch Entity"
                placeholder="Select a different entity"
                data={entities
                  .filter((entity) => entity.id !== currentEntity.id)
                  .map((entity) => ({
                    value: entity.id,
                    label: entity.name,
                  }))}
                onChange={(value) => value && handleEntityChange(value)}
                disabled={entities.length <= 1}
              />
            </Stack>
          ) : (
            <Text c="dimmed">No entity selected</Text>
          )}
        </Stack>
      </Card>

      {/* Create Entity Modal */}
      <CreateEntityModal
        opened={createModalOpened}
        onClose={() => setCreateModalOpened(false)}
        onEntityCreated={() => {
          // Refresh entities list after creation
          fetchEntities();
        }}
      />
    </>
  );
};

export default EntitySelector;
