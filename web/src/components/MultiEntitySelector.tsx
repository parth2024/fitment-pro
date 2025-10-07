import React, { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Group,
  Stack,
  Checkbox,
  Button,
  Badge,
  ScrollArea,
  Skeleton,
  Alert,
  Divider,
  ActionIcon,
  Tooltip,
  Box,
} from "@mantine/core";
import {
  IconBuilding,
  IconCheck,
  IconX,
  IconRefresh,
  IconInfoCircle,
  IconUsers,
  IconDatabase,
} from "@tabler/icons-react";
import apiClient from "../api/client";

interface Entity {
  id: string;
  name: string;
  slug: string;
  is_default?: boolean;
  company_name?: string;
  company_address?: string;
}

interface MultiEntitySelectorProps {
  selectedEntities: string[];
  onEntitySelectionChange: (entityIds: string[]) => void;
  onDataFetch: (entityIds: string[]) => void;
  title?: string;
  description?: string;
  showStats?: boolean;
  compact?: boolean;
}

export const MultiEntitySelector: React.FC<MultiEntitySelectorProps> = ({
  selectedEntities,
  onEntitySelectionChange,
  onDataFetch,
  title = "Select Entities",
  description = "Choose one or more entities to view their data",
  compact = false,
}) => {
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [fetchingData, setFetchingData] = useState(false);

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

  const handleEntityToggle = (entityId: string) => {
    const newSelection = selectedEntities.includes(entityId)
      ? selectedEntities.filter((id) => id !== entityId)
      : [...selectedEntities, entityId];

    onEntitySelectionChange(newSelection);
  };

  const handleSelectAll = () => {
    if (selectedEntities.length === entities.length) {
      onEntitySelectionChange([]);
    } else {
      onEntitySelectionChange(entities.map((e) => e.id));
    }
  };

  const handleFetchData = async () => {
    if (selectedEntities.length === 0) {
      return;
    }

    try {
      setFetchingData(true);
      await onDataFetch(selectedEntities);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setFetchingData(false);
    }
  };

  const handleClearSelection = () => {
    onEntitySelectionChange([]);
  };

  if (loading) {
    return (
      <Card withBorder p="lg" radius="md">
        <Stack gap="md">
          <Skeleton height={24} width={200} />
          <Skeleton height={16} width={300} />
          <Stack gap="sm">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} height={40} width="100%" />
            ))}
          </Stack>
        </Stack>
      </Card>
    );
  }

  if (error) {
    return (
      <Card withBorder p="lg" radius="md">
        <Alert color="red" title="Error" icon={<IconX size={16} />}>
          {error}
        </Alert>
      </Card>
    );
  }

  return (
    <Card
      withBorder
      p={compact ? "md" : "lg"}
      radius="md"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
        border: "1px solid #e2e8f0",
      }}
    >
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="flex-start">
          <div>
            <Group gap="sm" mb="xs">
              <IconBuilding size={20} color="#3b82f6" />
              <Title order={4} c="#1e293b">
                {title}
              </Title>
            </Group>
            <Text size="sm" c="#64748b">
              {description}
            </Text>
          </div>
          <Group gap="xs">
            <Tooltip label="Refresh entities">
              <ActionIcon
                variant="subtle"
                color="blue"
                onClick={fetchEntities}
                loading={loading}
              >
                <IconRefresh size={16} />
              </ActionIcon>
            </Tooltip>
            <Tooltip label="Information">
              <ActionIcon variant="subtle" color="gray">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Selection Summary */}
        {selectedEntities.length > 0 && (
          <Box
            style={{
              background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
              borderRadius: "8px",
              border: "1px solid #93c5fd",
              padding: "12px 16px",
            }}
          >
            <Group justify="space-between" align="center">
              <Group gap="sm">
                <div
                  style={{
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    backgroundColor: "#3b82f6",
                  }}
                />
                <Text size="sm" fw={600} c="#1e40af">
                  {selectedEntities.length} of {entities.length} entities
                  selected
                </Text>
                <Badge variant="light" color="blue" size="sm">
                  {selectedEntities.length} selected
                </Badge>
              </Group>
              <Button
                size="xs"
                variant="light"
                color="blue"
                onClick={handleClearSelection}
                leftSection={<IconX size={12} />}
              >
                Clear
              </Button>
            </Group>
          </Box>
        )}

        {/* Entity List */}
        <ScrollArea h={compact ? 200 : 300}>
          <Stack gap="xs">
            {/* Select All Option */}
            <Box
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "8px",
                padding: "12px",
                cursor: "pointer",
                transition: "all 0.2s ease",
              }}
              onClick={handleSelectAll}
            >
              <Group justify="space-between">
                <Group gap="sm">
                  <Checkbox
                    checked={selectedEntities.length === entities.length}
                    indeterminate={
                      selectedEntities.length > 0 &&
                      selectedEntities.length < entities.length
                    }
                    onChange={handleSelectAll}
                    size="sm"
                  />
                  <IconUsers size={16} color="#64748b" />
                  <Text size="sm" fw={500} c="#1e293b">
                    Select All Entities
                  </Text>
                </Group>
                <Badge variant="light" color="blue" size="sm">
                  {entities.length} total
                </Badge>
              </Group>
            </Box>

            <Divider />

            {/* Individual Entities */}
            {entities.map((entity) => (
              <Box
                key={entity.id}
                style={{
                  background: selectedEntities.includes(entity.id)
                    ? "linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)"
                    : "#ffffff",
                  border: selectedEntities.includes(entity.id)
                    ? "1px solid #0ea5e9"
                    : "1px solid #e2e8f0",
                  borderRadius: "8px",
                  padding: "12px",
                  cursor: "pointer",
                  transition: "all 0.2s ease",
                }}
                onClick={() => handleEntityToggle(entity.id)}
              >
                <Group justify="space-between">
                  <Group gap="sm">
                    <Checkbox
                      checked={selectedEntities.includes(entity.id)}
                      onChange={() => handleEntityToggle(entity.id)}
                      size="sm"
                    />
                    <IconBuilding size={16} color="#64748b" />
                    <div>
                      <Text size="sm" fw={500} c="#1e293b">
                        {entity.name}
                      </Text>
                      {entity.company_name && (
                        <Text size="xs" c="#64748b">
                          {entity.company_name}
                        </Text>
                      )}
                    </div>
                    {entity.is_default && (
                      <Badge variant="light" color="green" size="xs">
                        Default
                      </Badge>
                    )}
                  </Group>
                  {selectedEntities.includes(entity.id) && (
                    <IconCheck size={16} color="#0ea5e9" />
                  )}
                </Group>
              </Box>
            ))}
          </Stack>
        </ScrollArea>

        {/* Action Buttons */}
        <Divider />

        <Group justify="space-between">
          <Text size="xs" c="#64748b">
            {selectedEntities.length === 0
              ? "Select entities to view their data"
              : `Ready to fetch data for ${selectedEntities.length} entities`}
          </Text>
          <Group gap="sm">
            <Button
              variant="light"
              color="gray"
              size="sm"
              onClick={handleClearSelection}
              disabled={selectedEntities.length === 0}
            >
              Clear Selection
            </Button>
            <Button
              color="blue"
              size="sm"
              onClick={handleFetchData}
              loading={fetchingData}
              disabled={selectedEntities.length === 0}
              leftSection={<IconDatabase size={16} />}
            >
              {fetchingData ? "Fetching Data..." : "Fetch Data"}
            </Button>
          </Group>
        </Group>
      </Stack>
    </Card>
  );
};

export default MultiEntitySelector;
