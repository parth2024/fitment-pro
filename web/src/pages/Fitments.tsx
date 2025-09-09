import { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Table,
  Checkbox,
  TextInput,
  Group,
  Stack,
  Badge,
  ActionIcon,
  Pagination,
  Select,
  Switch,
  Menu,
  Modal,
  Flex,
  ScrollArea,
} from "@mantine/core";
import {
  IconSearch,
  IconDownload,
  IconTrash,
  IconFilter,
  IconDots,
  IconEdit,
  IconEye,
  IconBrain,
} from "@tabler/icons-react";
import { useApi } from "../hooks/useApi";
import {
  fitmentsService,
  fitmentUploadService,
  type FlattenedAppliedFitment,
} from "../api/services";

export default function Fitments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFitments, setSelectedFitments] = useState<string[]>([]);
  const [expandedView, setExpandedView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [sortBy, setSortBy] = useState("partId");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const { data, loading, error, refetch } = useApi<{
    fitments: FlattenedAppliedFitment[];
    totalCount: number;
  }>(
    () =>
      fitmentsService.getFitments({
        search: searchTerm || undefined,
        sortBy,
        sortOrder,
        page: currentPage,
        pageSize: 50,
      }),
    [searchTerm, sortBy, sortOrder, currentPage],
  );

  // Fetch AI-generated fitments from Django backend
  const {
    data: aiFitmentsData,
    loading: aiLoading,
    refetch: refetchAi,
  } = useApi<{ fitments: any[]; total_fitments: number }>(
    () => fitmentUploadService.getAppliedFitments(),
    [],
  );

  const fitments = data?.fitments ?? [];
  const aiFitments = aiFitmentsData?.fitments ?? [];

  // Debug logging
  console.log("AI Fitments Data:", aiFitmentsData);
  console.log("AI Fitments Array:", aiFitments);
  useEffect(() => {
    const onFocus = () => {
      refetch();
      refetchAi();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetch();
        refetchAi();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch, refetchAi]);
  const handleExport = () => {
    const params = new URLSearchParams();
    if (searchTerm) params.set("search", searchTerm);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    window.location.href = `http://localhost:8000/api/fitments/export?${params.toString()}`;
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedFitments(fitments.map((f) => f.hash));
    } else {
      setSelectedFitments([]);
    }
  };

  const handleSelectFitment = (hash: string, checked: boolean) => {
    if (checked) {
      setSelectedFitments((prev) => [...prev, hash]);
    } else {
      setSelectedFitments((prev) => prev.filter((h) => h !== hash));
    }
  };

  const handleBulkDelete = () => {
    console.log("Deleting fitments:", selectedFitments);
    setSelectedFitments([]);
    setDeleteModalOpen(false);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "Active":
        return "green";
      case "Inactive":
        return "red";
      case "Sunset":
        return "orange";
      default:
        return "gray";
    }
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={2}>Fitments Management</Title>
              <Text c="dimmed">
                View and manage all fitments with advanced filtering
              </Text>
            </div>
            <Group>
              <Switch
                label="Expanded View"
                checked={expandedView}
                onChange={(event) =>
                  setExpandedView(event.currentTarget.checked)
                }
              />
            </Group>
          </Group>

          {/* Filters and Actions */}
          <Group justify="space-between">
            <Group>
              <TextInput
                placeholder="Search by Part ID, Make, Model..."
                leftSection={<IconSearch size={16} />}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                style={{ minWidth: 300 }}
              />
              <Select
                placeholder="Sort by"
                value={sortBy}
                onChange={(value) => setSortBy(value || "partId")}
                data={[
                  { value: "partId", label: "Part ID" },
                  { value: "makeName", label: "Make" },
                  { value: "modelName", label: "Model" },
                  { value: "year", label: "Year" },
                  { value: "updatedAt", label: "Last Updated" },
                ]}
                leftSection={<IconFilter size={16} />}
              />
              <Select
                value={sortOrder}
                onChange={(value) => setSortOrder(value as "asc" | "desc")}
                data={[
                  { value: "asc", label: "Ascending" },
                  { value: "desc", label: "Descending" },
                ]}
                w={120}
              />
            </Group>

            <Group>
              {selectedFitments.length > 0 && (
                <Button
                  leftSection={<IconTrash size={16} />}
                  color="red"
                  variant="light"
                  onClick={() => setDeleteModalOpen(true)}
                >
                  Delete ({selectedFitments.length})
                </Button>
              )}
              <Button
                leftSection={<IconDownload size={16} />}
                variant="filled"
                onClick={handleExport}
              >
                Export CSV
              </Button>
            </Group>
          </Group>

          {/* Selection Summary */}
          {selectedFitments.length > 0 && (
            <Group
              justify="space-between"
              p="sm"
              style={{
                backgroundColor: "var(--mantine-color-blue-0)",
                borderRadius: 4,
              }}
            >
              <Text size="sm" fw={500}>
                {selectedFitments.length} of {fitments.length} fitments selected
              </Text>
              <Button
                size="xs"
                variant="light"
                onClick={() => setSelectedFitments([])}
              >
                Clear Selection
              </Button>
            </Group>
          )}

          {/* AI Generated Fitments Section */}

          {/* Table */}
          {error && <Text c="red">{error}</Text>}
          {(loading || aiLoading) && <Text>Loading...</Text>}
          <ScrollArea>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>
                    <Checkbox
                      checked={selectedFitments.length === fitments.length}
                      indeterminate={
                        selectedFitments.length > 0 &&
                        selectedFitments.length < fitments.length
                      }
                      onChange={(event) =>
                        handleSelectAll(event.currentTarget.checked)
                      }
                    />
                  </Table.Th>
                  <Table.Th>Part ID</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Vehicle</Table.Th>
                  <Table.Th>Part Type</Table.Th>
                  <Table.Th>Position</Table.Th>
                  <Table.Th>Title</Table.Th>
                  {expandedView && (
                    <>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>Quantity</Table.Th>
                      <Table.Th>Lift Height</Table.Th>
                      <Table.Th>Wheel Type</Table.Th>
                      <Table.Th>Updated</Table.Th>
                    </>
                  )}
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {fitments.map((fitment) => (
                  <Table.Tr key={fitment.hash}>
                    <Table.Td>
                      <Checkbox
                        checked={selectedFitments.includes(fitment.hash)}
                        onChange={(event) =>
                          handleSelectFitment(
                            fitment.hash,
                            event.currentTarget.checked,
                          )
                        }
                      />
                    </Table.Td>
                    <Table.Td>
                      <Text fw={500}>{fitment.partId}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        variant="light"
                        color={getStatusColor(fitment.itemStatus)}
                        size="sm"
                      >
                        {fitment.itemStatus}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <div>
                        <Text size="sm" fw={500}>
                          {fitment.year} {fitment.makeName} {fitment.modelName}
                        </Text>
                        <Text size="xs" c="dimmed">
                          {fitment.subModelName} • {fitment.driveTypeName}
                        </Text>
                      </div>
                    </Table.Td>
                    <Table.Td>{fitment.partTypeDescriptor}</Table.Td>
                    <Table.Td>{fitment.position}</Table.Td>
                    <Table.Td>{fitment.fitmentTitle}</Table.Td>
                    {expandedView && (
                      <>
                        <Table.Td>
                          <Text size="sm" truncate="end" maw={200}>
                            {fitment.fitmentDescription}
                          </Text>
                        </Table.Td>
                        <Table.Td>{fitment.quantity}</Table.Td>
                        <Table.Td>{fitment.liftHeight}</Table.Td>
                        <Table.Td>{fitment.wheelType}</Table.Td>
                        <Table.Td>
                          <Text size="xs" c="dimmed">
                            {new Date(fitment.updatedAt).toLocaleDateString()}
                          </Text>
                        </Table.Td>
                      </>
                    )}
                    <Table.Td>
                      <Menu shadow="md" width={200}>
                        <Menu.Target>
                          <ActionIcon variant="light" size="sm">
                            <IconDots size={16} />
                          </ActionIcon>
                        </Menu.Target>
                        <Menu.Dropdown>
                          <Menu.Item leftSection={<IconEye size={14} />}>
                            View Details
                          </Menu.Item>
                          <Menu.Item leftSection={<IconEdit size={14} />}>
                            Edit Fitment
                          </Menu.Item>
                          <Menu.Divider />
                          <Menu.Item
                            leftSection={<IconTrash size={14} />}
                            color="red"
                          >
                            Delete
                          </Menu.Item>
                        </Menu.Dropdown>
                      </Menu>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          <Flex justify="space-between" align="center">
            <Text size="sm" c="dimmed">
              Showing 1-{fitments.length} of{" "}
              {data?.totalCount ?? fitments.length} fitments
            </Text>
            <Pagination
              value={currentPage}
              onChange={setCurrentPage}
              total={5}
            />
          </Flex>
        </Stack>
      </Card>

      {/* Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Deletion"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete {selectedFitments.length} fitment
            {selectedFitments.length !== 1 ? "s" : ""}? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button variant="light" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button color="red" onClick={handleBulkDelete}>
              Delete Fitments
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
