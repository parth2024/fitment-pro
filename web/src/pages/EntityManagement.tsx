import React from "react";
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
  Grid,
  Paper,
} from "@mantine/core";
import {
  IconPlus,
  IconEdit,
  IconTrash,
  IconRefresh,
  IconInfoCircle,
  IconSettings,
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
  const { entities, loading, error, refreshEntities } = useEntity();
  const navigate = useNavigate();

  const handleEdit = (entity: Entity) => {
    navigate(`/edit-entity/${entity.id}`);
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
        <Group justify="space-between" align="center">
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
                    <Table.Th>URL</Table.Th>
                    <Table.Th>Status</Table.Th>
                    {/* <Table.Th>Users</Table.Th> */}
                    <Table.Th>Created</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {entities.map((entity) => (
                    <Table.Tr key={entity.id}>
                      <Table.Td>
                        <Stack gap={4}>
                          <Text
                            fw={500}
                            style={{ cursor: "pointer", color: "#3b82f6" }}
                            onClick={() => handleEdit(entity)}
                          >
                            {entity.name}
                          </Text>
                          {entity.description && (
                            <Text size="sm" c="dimmed">
                              {entity.description}
                            </Text>
                          )}
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {entity.slug || "No URL"}
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
                      {/* <Table.Td>
                        <Group gap="xs">
                          <IconUsers size={16} />
                          <Text size="sm">{entity.user_count}</Text>
                        </Group>
                      </Table.Td> */}
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
                            onClick={() => handleEdit(entity)}
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
                  {/* <Group justify="space-between">
                    <Text size="sm">Total Users</Text>
                    <Text fw={500}>
                      {entities.reduce((sum, e) => sum + e.user_count, 0)}
                    </Text>
                  </Group> */}
                </Stack>
              </Paper>
            </Stack>
          </Grid.Col>
        </Grid>
      </Stack>
    </Container>
  );
};

export default EntityManagement;
