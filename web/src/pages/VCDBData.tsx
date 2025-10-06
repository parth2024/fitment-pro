import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Card,
  Button,
  Group,
  Text,
  Badge,
  ActionIcon,
  Stack,
  Alert,
  Loader,
  Paper,
  Modal,
  TextInput,
  Textarea,
  FileInput,
  Table,
  Progress,
  Tooltip,
} from "@mantine/core";
import {
  IconPlus,
  IconTrash,
  IconEye,
  IconRefresh,
  IconInfoCircle,
  IconDatabase,
} from "@tabler/icons-react";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

interface VCDBCategory {
  id: string;
  name: string;
  description?: string;
  filename: string;
  file_size: number;
  version: string;
  is_valid: boolean;
  record_count: number;
  is_active: boolean;
  created_at: string;
  validation_errors?: any;
}

interface VCDBCategoryFormData {
  name: string;
  description: string;
  file: File | null;
}

const VCDBData: React.FC = () => {
  const [categories, setCategories] = useState<VCDBCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [formData, setFormData] = useState<VCDBCategoryFormData>({
    name: "",
    description: "",
    file: null,
  });

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const response = await apiClient.get(`/api/vcdb-categories/categories/`);
      setCategories(response.data);
    } catch (error) {
      setError("Failed to load VCDB categories");
      notifications.show({
        title: "Error",
        message: "Failed to load VCDB categories",
        color: "red",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const handleCreateCategory = async () => {
    if (!formData.name || !formData.file) {
      notifications.show({
        title: "Error",
        message: "Please fill in all required fields",
        color: "red",
      });
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("name", formData.name);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("file", formData.file);

      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      await apiClient.post("/api/vcdb-categories/categories/", formDataToSend, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      clearInterval(progressInterval);
      setUploadProgress(100);

      notifications.show({
        title: "Success",
        message: "VCDB category created successfully",
        color: "green",
      });

      setShowCreateModal(false);
      setFormData({ name: "", description: "", file: null });
      await fetchCategories();
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message:
          error.response?.data?.error || "Failed to create VCDB category",
        color: "red",
      });
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (!confirm("Are you sure you want to delete this VCDB category?")) return;

    try {
      await apiClient.delete(`/api/vcdb-categories/categories/${categoryId}/`);
      notifications.show({
        title: "Success",
        message: "VCDB category deleted successfully",
        color: "green",
      });
      await fetchCategories();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete VCDB category",
        color: "red",
      });
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading VCDB categories...</Text>
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
          <Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="outline"
              onClick={fetchCategories}
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={() => setShowCreateModal(true)}
            >
              Add Global VCDB Data
            </Button>
          </Group>
        </Group>

        {/* Categories List */}
        <Card shadow="sm" padding="md" radius="md" withBorder>
          <Title order={3} mb="md">
            Global VCDB Categories
          </Title>
          {categories.length === 0 ? (
            <Paper p="xl" style={{ textAlign: "center" }}>
              <IconDatabase
                size={48}
                color="#ccc"
                style={{ margin: "0 auto 16px" }}
              />
              <Text c="dimmed">No global VCDB categories found</Text>
              <Text size="sm" c="dimmed" mt="xs">
                Create your first global VCDB category to get started
              </Text>
            </Paper>
          ) : (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Name</Table.Th>
                  <Table.Th>Version</Table.Th>
                  <Table.Th>File</Table.Th>
                  <Table.Th>Records</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {categories.map((category) => (
                  <Table.Tr key={category.id}>
                    <Table.Td>
                      <Stack gap={4}>
                        <Text fw={500}>{category.name}</Text>
                        {category.description && (
                          <Text size="sm" c="dimmed">
                            {category.description}
                          </Text>
                        )}
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Badge variant="light" color="blue">
                        {category.version}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Stack gap={4}>
                        <Text size="sm" fw={500}>
                          {category.filename}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {formatFileSize(category.file_size)}
                        </Text>
                      </Stack>
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{category.record_count}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Badge
                          color={category.is_valid ? "green" : "red"}
                          size="sm"
                        >
                          {category.is_valid ? "Valid" : "Invalid"}
                        </Badge>
                        {category.is_active && (
                          <Badge color="blue" size="sm">
                            Active
                          </Badge>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {formatDate(category.created_at)}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Tooltip label="View Details">
                          <ActionIcon variant="subtle" color="blue">
                            <IconEye size={16} />
                          </ActionIcon>
                        </Tooltip>
                        <Tooltip label="Delete">
                          <ActionIcon
                            variant="subtle"
                            color="red"
                            onClick={() => handleDeleteCategory(category.id)}
                          >
                            <IconTrash size={16} />
                          </ActionIcon>
                        </Tooltip>
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          )}
        </Card>

        {/* Create Category Modal */}
        <Modal
          opened={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          title="Add Global VCDB Data"
          size="md"
        >
          <Stack gap="md">
            <TextInput
              label="Category Name"
              placeholder="Enter category name (e.g., Light Duty, Heavy Duty)"
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
              required
            />

            <Textarea
              label="Description"
              placeholder="Enter category description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
              rows={3}
            />

            <FileInput
              label="VCDB File"
              placeholder="Select VCDB data file"
              value={formData.file}
              onChange={(file) => setFormData({ ...formData, file })}
              accept=".csv,.xlsx,.xls,.json"
              required
            />

            {uploading && (
              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Uploading and processing file...
                </Text>
                <Progress value={uploadProgress} size="sm" />
              </Stack>
            )}

            <Group justify="flex-end" gap="sm">
              <Button
                variant="outline"
                onClick={() => setShowCreateModal(false)}
                disabled={uploading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleCreateCategory}
                loading={uploading}
                disabled={!formData.name || !formData.file}
              >
                {uploading ? "Processing..." : "Create Category"}
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default VCDBData;
