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
  Skeleton,
  Center,
} from "@mantine/core";
import {
  IconSearch,
  IconDownload,
  IconTrash,
  IconFilter,
  IconDots,
  IconEdit,
  IconEye,
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
  const pageSize = 50;
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
    [searchTerm, sortBy, sortOrder, currentPage]
  );

  // Fetch AI-generated fitments from Django backend
  const { data: aiFitmentsData, refetch: refetchAi } = useApi<{
    fitments: any[];
    total_fitments: number;
  }>(() => fitmentUploadService.getAppliedFitments(), []);

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
    <div
      style={{
        minHeight: "100vh",
      }}
    >
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

          {/* Professional Filters and Actions */}
          <div>
            <Stack gap="lg">
              <div>
                <Group justify="space-between" align="flex-end">
                  <Group gap="md" style={{ flex: 1 }}>
                    <TextInput
                      placeholder="Search by Part ID, Make, Model..."
                      leftSection={<IconSearch size={16} color="#64748b" />}
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.currentTarget.value)
                      }
                      styles={{
                        root: { flex: 1, minWidth: 320 },
                        label: {
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "#374151",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        },
                        input: {
                          borderRadius: "10px",
                          border: "2px solid #e2e8f0",
                          fontSize: "14px",
                          height: "48px",
                          paddingLeft: "40px",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:focus": {
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)",
                            backgroundColor: "#ffffff",
                          },
                          "&:hover": {
                            borderColor: "#cbd5e1",
                            backgroundColor: "#ffffff",
                          },
                        },
                      }}
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
                      leftSection={<IconFilter size={16} color="#64748b" />}
                      styles={{
                        root: { minWidth: 160 },
                        label: {
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "#374151",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        },
                        input: {
                          borderRadius: "10px",
                          border: "2px solid #e2e8f0",
                          fontSize: "14px",
                          height: "48px",
                          paddingLeft: "40px",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:focus": {
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)",
                            backgroundColor: "#ffffff",
                          },
                          "&:hover": {
                            borderColor: "#cbd5e1",
                            backgroundColor: "#ffffff",
                          },
                        },
                      }}
                    />

                    <Select
                      value={sortOrder}
                      onChange={(value) =>
                        setSortOrder(value as "asc" | "desc")
                      }
                      data={[
                        { value: "asc", label: "Ascending" },
                        { value: "desc", label: "Descending" },
                      ]}
                      styles={{
                        root: { minWidth: 140 },
                        label: {
                          fontWeight: 600,
                          fontSize: "13px",
                          color: "#374151",
                          marginBottom: "8px",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                        },
                        input: {
                          borderRadius: "10px",
                          border: "2px solid #e2e8f0",
                          fontSize: "14px",
                          height: "48px",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:focus": {
                            borderColor: "#3b82f6",
                            boxShadow: "0 0 0 4px rgba(59, 130, 246, 0.1)",
                            backgroundColor: "#ffffff",
                          },
                          "&:hover": {
                            borderColor: "#cbd5e1",
                            backgroundColor: "#ffffff",
                          },
                        },
                      }}
                    />
                  </Group>

                  <Group gap="sm">
                    {selectedFitments.length > 0 && (
                      <Button
                        leftSection={<IconTrash size={16} />}
                        color="red"
                        variant="outline"
                        onClick={() => setDeleteModalOpen(true)}
                        styles={{
                          root: {
                            borderRadius: "10px",
                            fontWeight: 600,
                            fontSize: "14px",
                            height: "48px",
                            padding: "0 20px",
                            border: "2px solid #ef4444",
                            color: "#ef4444",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              backgroundColor: "#fef2f2",
                              borderColor: "#dc2626",
                              transform: "translateY(-1px)",
                            },
                          },
                        }}
                      >
                        Delete ({selectedFitments.length})
                      </Button>
                    )}
                    <Button
                      leftSection={<IconDownload size={16} />}
                      variant="filled"
                      onClick={handleExport}
                      styles={{
                        root: {
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "14px",
                          height: "48px",
                          padding: "0 24px",
                          background:
                            "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                          border: "none",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          boxShadow:
                            "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)",
                          "&:hover": {
                            transform: "translateY(-2px)",
                            boxShadow:
                              "0 8px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                          },
                        },
                      }}
                    >
                      Export CSV
                    </Button>
                  </Group>
                </Group>
              </div>
            </Stack>
          </div>

          {/* Professional Selection Summary */}
          {selectedFitments.length > 0 && (
            <div
              style={{
                background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                borderRadius: "12px",
                border: "1px solid #93c5fd",
                padding: "16px 20px",
                boxShadow: "0 2px 4px rgba(59, 130, 246, 0.1)",
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
                    {selectedFitments.length} of {fitments.length} fitments
                    selected
                  </Text>
                </Group>
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => setSelectedFitments([])}
                  styles={{
                    root: {
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "12px",
                      height: "32px",
                      padding: "0 16px",
                      border: "1px solid #93c5fd",
                      color: "#1e40af",
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        transform: "translateY(-1px)",
                      },
                    },
                  }}
                >
                  Clear Selection
                </Button>
              </Group>
            </div>
          )}

          {/* AI Generated Fitments Section */}

          {/* Table */}
          {error && <Text c="red">{error}</Text>}
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
                      ml={7}
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
                {loading ? (
                  // Professional loading skeleton rows
                  Array.from({ length: 8 }).map((_, index) => (
                    <Table.Tr key={`skeleton-${index}`}>
                      <Table.Td>
                        <Skeleton height={16} width={16} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={16} width={80} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={20} width={60} radius="sm" />
                      </Table.Td>
                      <Table.Td>
                        <Stack gap="xs">
                          <Skeleton height={14} width={150} />
                          <Skeleton height={12} width={100} />
                        </Stack>
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={16} width={90} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={16} width={70} />
                      </Table.Td>
                      <Table.Td>
                        <Skeleton height={16} width={120} />
                      </Table.Td>
                      {expandedView && (
                        <>
                          <Table.Td>
                            <Skeleton height={16} width={150} />
                          </Table.Td>
                          <Table.Td>
                            <Skeleton height={16} width={40} />
                          </Table.Td>
                          <Table.Td>
                            <Skeleton height={16} width={60} />
                          </Table.Td>
                          <Table.Td>
                            <Skeleton height={16} width={80} />
                          </Table.Td>
                          <Table.Td>
                            <Skeleton height={16} width={90} />
                          </Table.Td>
                        </>
                      )}
                      <Table.Td>
                        <Skeleton height={24} width={24} radius="sm" />
                      </Table.Td>
                    </Table.Tr>
                  ))
                ) : fitments.length === 0 ? (
                  <Table.Tr>
                    <Table.Td colSpan={expandedView ? 12 : 8}>
                      <Center py="xl">
                        <Stack align="center" gap="md">
                          <Text size="lg" c="dimmed">
                            No fitments found
                          </Text>
                          <Text size="sm" c="dimmed">
                            Try adjusting your search criteria or filters
                          </Text>
                        </Stack>
                      </Center>
                    </Table.Td>
                  </Table.Tr>
                ) : (
                  fitments.map((fitment) => (
                    <Table.Tr key={fitment.hash}>
                      <Table.Td>
                        <Checkbox
                          checked={selectedFitments.includes(fitment.hash)}
                          onChange={(event) =>
                            handleSelectFitment(
                              fitment.hash,
                              event.currentTarget.checked
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
                            {fitment.year} {fitment.makeName}{" "}
                            {fitment.modelName}
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
                  ))
                )}
              </Table.Tbody>
            </Table>
          </ScrollArea>

          {/* Pagination */}
          {!loading && (
            <Flex justify="space-between" align="center">
              <Text size="sm" c="dimmed">
                {data?.totalCount ? (
                  <>
                    Showing {(currentPage - 1) * pageSize + 1}-
                    {Math.min(currentPage * pageSize, data.totalCount)} of{" "}
                    {data.totalCount} fitments
                  </>
                ) : (
                  `${fitments.length} fitments`
                )}
              </Text>
              {data?.totalCount && data.totalCount > pageSize && (
                <Pagination
                  value={currentPage}
                  onChange={setCurrentPage}
                  total={Math.ceil(data.totalCount / pageSize)}
                  size="sm"
                  withEdges
                  styles={{
                    control: {
                      "&[data-active]": {
                        background:
                          "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                        borderColor: "transparent",
                      },
                    },
                  }}
                />
              )}
            </Flex>
          )}
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
