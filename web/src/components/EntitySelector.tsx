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
  TextInput,
} from "@mantine/core";
import {
  IconBuilding,
  IconRefresh,
  IconInfoCircle,
  IconPlus,
  IconSettings,
  IconChevronDown,
  IconSearch,
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
  const [searchQuery, setSearchQuery] = useState("");

  // Check localStorage on every render to ensure sync
  const checkLocalStorageEntity = () => {
    const storedEntity = localStorage.getItem("current_entity");
    if (storedEntity) {
      try {
        const entity = JSON.parse(storedEntity);
        // If current entity is different from stored entity, update it
        if (!currentEntity || currentEntity.id !== entity.id) {
          console.log(
            "DEBUG: Force updating entity from localStorage on render:",
            entity.name,
            entity.id
          );
          setCurrentEntity(entity);
        }
      } catch (err) {
        console.warn("Invalid entity data in localStorage on render check");
      }
    }
  };

  // Run localStorage check on every render
  checkLocalStorageEntity();

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
      console.log("DEBUG: Available entities:", entities.length);

      // Check URL parameters first (for entity switching)
      const urlParams = new URLSearchParams(window.location.search);
      const entityIdFromUrl = urlParams.get("entity");
      console.log("DEBUG: entityIdFromUrl:", entityIdFromUrl);

      if (entityIdFromUrl && entities.length > 0) {
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

      // Check localStorage for the current entity
      const storedEntity = localStorage.getItem("current_entity");
      console.log("DEBUG: storedEntity from localStorage:", storedEntity);

      if (storedEntity && entities.length > 0) {
        try {
          const entity = JSON.parse(storedEntity);
          // Verify the entity exists in our entities list
          const entityExists = entities.find((e) => e.id === entity.id);
          if (entityExists) {
            setCurrentEntity(entityExists);
            console.log(
              "DEBUG: Using entity from localStorage:",
              entityExists.name,
              entityExists.id
            );
            return;
          } else {
            console.warn("DEBUG: Stored entity not found in entities list");
            localStorage.removeItem("current_entity");
          }
        } catch (err) {
          console.warn(
            "Invalid entity data in localStorage, fetching from API"
          );
          localStorage.removeItem("current_entity");
        }
      }

      // Fallback to API if localStorage is empty or invalid
      if (entities.length === 0) {
        console.log("DEBUG: No entities loaded yet, waiting...");
        return;
      }

      console.log("DEBUG: Fetching entity from API...");
      const response = await apiClient.get("/api/tenants/current/");
      const apiEntity = response.data;
      setCurrentEntity(apiEntity);
      localStorage.setItem("current_entity", JSON.stringify(apiEntity));
      console.log(
        "DEBUG: Fetched entity from API:",
        apiEntity.name,
        apiEntity.id
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

  // Force check localStorage if current entity doesn't match
  useEffect(() => {
    const checkLocalStorageSync = () => {
      const storedEntity = localStorage.getItem("current_entity");
      if (storedEntity) {
        try {
          const entity = JSON.parse(storedEntity);
          // If current entity is null or doesn't match stored entity, update it
          if (!currentEntity || currentEntity.id !== entity.id) {
            console.log(
              "DEBUG: Syncing current entity with localStorage:",
              entity.name,
              entity.id
            );
            setCurrentEntity(entity);
          }
        } catch (err) {
          console.warn("Invalid entity data in localStorage during sync check");
        }
      }
    };

    // Run check immediately
    checkLocalStorageSync();

    // Also run on a small delay to catch any race conditions
    const timeoutId = setTimeout(checkLocalStorageSync, 100);

    return () => clearTimeout(timeoutId);
  }, [currentEntity]);

  useEffect(() => {
    fetchEntities();
  }, []);

  // Immediate localStorage check on mount
  useEffect(() => {
    console.log(
      "DEBUG: EntitySelector mounted, checking localStorage immediately"
    );
    const storedEntity = localStorage.getItem("current_entity");
    if (storedEntity) {
      try {
        const entity = JSON.parse(storedEntity);
        console.log(
          "DEBUG: Setting initial entity from localStorage:",
          entity.name,
          entity.id
        );
        setCurrentEntity(entity);
      } catch (err) {
        console.warn("Invalid entity data in localStorage on mount");
      }
    }
  }, []);

  useEffect(() => {
    if (currentEntityId) {
      fetchCurrentEntity();
    }
  }, [currentEntityId]);

  // Listen for entity change events and window focus
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

    const handleWindowFocus = () => {
      console.log(
        "DEBUG: Window focused, checking localStorage for entity updates"
      );
      const storedEntity = localStorage.getItem("current_entity");
      if (storedEntity) {
        try {
          const entity = JSON.parse(storedEntity);
          // Only update if different from current
          if (!currentEntity || currentEntity.id !== entity.id) {
            console.log(
              "DEBUG: Updating entity from localStorage on focus:",
              entity.name,
              entity.id
            );
            setCurrentEntity(entity);
          }
        } catch (err) {
          console.warn("Invalid entity data in localStorage on focus");
        }
      }
    };

    window.addEventListener(
      "entityChanged",
      handleEntityChanged as EventListener
    );

    window.addEventListener("focus", handleWindowFocus);

    return () => {
      window.removeEventListener(
        "entityChanged",
        handleEntityChanged as EventListener
      );
      window.removeEventListener("focus", handleWindowFocus);
    };
  }, [currentEntity]);

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
    // Filter entities based on search query
    const filteredEntities = entities.filter((entity) =>
      entity.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
      <>
        <Group gap="xs">
          <IconBuilding size={18} />
          <Menu
            shadow="md"
            width={320}
            position="bottom-end"
            opened={menuOpened}
            onChange={(opened) => {
              setMenuOpened(opened);
              // Clear search when menu closes
              if (!opened) {
                setSearchQuery("");
              }
            }}
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

            <Menu.Dropdown
              style={{
                padding: "8px",
              }}
            >
              <div style={{ padding: "4px 8px 8px 8px" }}>
                <TextInput
                  placeholder="Search entities..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.currentTarget.value)}
                  leftSection={<IconSearch size={16} />}
                  size="sm"
                  styles={{
                    input: {
                      borderRadius: "6px",
                      fontSize: "14px",
                      fontWeight: 500,
                      border: "1px solid #e9ecef",
                      "&:focus": {
                        borderColor: "#2563eb",
                      },
                    },
                  }}
                />
              </div>

              <Menu.Label
                style={{
                  fontSize: "12px",
                  fontWeight: 600,
                  color: "#6b7280",
                  padding: "8px 12px 4px",
                }}
              >
                {filteredEntities.length > 0
                  ? `Entities (${filteredEntities.length})`
                  : "No entities found"}
              </Menu.Label>

              <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                {filteredEntities.map((entity) => (
                  <Menu.Item
                    key={entity.id}
                    onClick={() => {
                      handleEntityChange(entity.id);
                      setMenuOpened(false);
                      setSearchQuery("");
                    }}
                    leftSection={<IconBuilding size={16} />}
                    rightSection={
                      entity.id === currentEntity?.id ? (
                        <Badge size="xs" color="blue" variant="light">
                          Current
                        </Badge>
                      ) : entity.is_default ? (
                        <Badge size="xs" color="gray" variant="light">
                          Default
                        </Badge>
                      ) : null
                    }
                    style={{
                      borderRadius: "6px",
                      margin: "2px 0",
                      fontWeight: entity.id === currentEntity?.id ? 600 : 500,
                      fontSize: "14px",
                      backgroundColor:
                        entity.id === currentEntity?.id
                          ? "#f1f5f9"
                          : "transparent",
                      border:
                        entity.id === currentEntity?.id
                          ? "1px solid #e2e8f0"
                          : "1px solid transparent",
                    }}
                  >
                    {entity.name}
                  </Menu.Item>
                ))}
              </div>

              <Menu.Divider style={{ margin: "8px 0" }} />

              <Menu.Item
                leftSection={<IconPlus size={16} />}
                onClick={() => {
                  setMenuOpened(false);
                  setSearchQuery("");
                  setCreateModalOpened(true);
                }}
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  color: "#2563eb",
                  borderRadius: "6px",
                }}
              >
                Create Entity
              </Menu.Item>

              <Menu.Item
                leftSection={<IconSettings size={16} />}
                onClick={() => {
                  setMenuOpened(false);
                  setSearchQuery("");
                  // Navigate to manage entities in same tab
                  navigate("/manage-entities");
                }}
                style={{
                  fontWeight: 600,
                  fontSize: "14px",
                  borderRadius: "6px",
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
