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
} from "@mantine/core";
import { IconBuilding, IconRefresh, IconInfoCircle } from "@tabler/icons-react";
import apiClient from "../api/client";

interface Entity {
  id: string;
  name: string;
  slug: string;
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
  const [entities, setEntities] = useState<Entity[]>([]);
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [loading, setLoading] = useState(true);
  const [switching, setSwitching] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      const response = await apiClient.get("/api/tenants/current/");
      setCurrentEntity(response.data);
    } catch (err) {
      console.error("Failed to fetch current entity:", err);
    }
  };

  // Load current entity from localStorage on mount
  useEffect(() => {
    const storedEntity = localStorage.getItem("current_entity");
    if (storedEntity) {
      try {
        const entity = JSON.parse(storedEntity);
        setCurrentEntity(entity);
        console.log(
          "DEBUG: Loaded entity from localStorage:",
          entity.name,
          entity.id
        );
      } catch (err) {
        console.warn("Invalid entity data in localStorage");
        localStorage.removeItem("current_entity");
      }
    }
  }, []);

  useEffect(() => {
    fetchEntities();
  }, []);

  useEffect(() => {
    if (currentEntityId) {
      fetchCurrentEntity();
    }
  }, [currentEntityId]);

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

      // Trigger callback if provided
      if (onEntityChange) {
        onEntityChange(entity);
      }

      console.log("Entity switched to:", entity.name, "ID:", entity.id);
    } catch (err) {
      console.error("Failed to switch entity:", err);
      setError("Failed to switch entity");
    } finally {
      setSwitching(false);
    }
  };

  const handleRefresh = () => {
    fetchEntities();
  };

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
      <Group gap="xs">
        <IconBuilding size={16} />
        <Select
          data={entities.map((entity) => ({
            value: entity.id,
            label: entity.name,
          }))}
          value={currentEntity?.id || ""}
          onChange={(value) => value && handleEntityChange(value)}
          placeholder="Select entity"
          size="xs"
          style={{ minWidth: 150 }}
          disabled={switching}
        />
        <Button
          variant="subtle"
          size="xs"
          onClick={handleRefresh}
          disabled={switching}
        >
          {switching ? <Loader size={12} /> : <IconRefresh size={14} />}
        </Button>
      </Group>
    );
  }

  return (
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
  );
};

export default EntitySelector;
