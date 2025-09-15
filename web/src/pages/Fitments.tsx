import { useState, useEffect, useCallback } from "react";
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
  NumberInput,
  Collapse,
  Grid,
  Tooltip,
  Divider,
} from "@mantine/core";
import {
  IconSearch,
  IconDownload,
  IconTrash,
  IconFilter,
  IconEdit,
  IconEye,
  IconChevronDown,
  IconChevronUp,
  IconX,
  IconCheck,
  IconFileSpreadsheet,
  IconFileText,
} from "@tabler/icons-react";
import { useApi } from "../hooks/useApi";
import {
  fitmentsService,
  fitmentUploadService,
  type FlattenedAppliedFitment,
} from "../api/services";
import { notifications } from "@mantine/notifications";

interface FilterOptions {
  itemStatus: string[];
  makeName: string[];
  modelName: string[];
  driveTypeName: string[];
  fuelTypeName: string[];
  bodyTypeName: string[];
  partTypeDescriptor: string[];
  position: string[];
  liftHeight: string[];
  wheelType: string[];
  fitmentType: string[];
  createdBy: string[];
  yearRange: { min: number; max: number };
}

interface AdvancedFilters {
  partId: string;
  itemStatus: string;
  yearFrom: number | null;
  yearTo: number | null;
  makeName: string;
  modelName: string;
  subModelName: string;
  driveTypeName: string;
  fuelTypeName: string;
  bodyTypeName: string;
  partTypeDescriptor: string;
  position: string;
  liftHeight: string;
  wheelType: string;
  fitmentType: string;
  createdBy: string;
  createdAtFrom: string;
  createdAtTo: string;
  updatedAtFrom: string;
  updatedAtTo: string;
}

export default function Fitments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFitments, setSelectedFitments] = useState<string[]>([]);
  const [expandedView, setExpandedView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 50;
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  // Advanced filtering state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterOptions, setFilterOptions] = useState<FilterOptions | null>(
    null
  );
  const [advancedFilters, setAdvancedFilters] = useState<AdvancedFilters>({
    partId: "",
    itemStatus: "",
    yearFrom: null,
    yearTo: null,
    makeName: "",
    modelName: "",
    subModelName: "",
    driveTypeName: "",
    fuelTypeName: "",
    bodyTypeName: "",
    partTypeDescriptor: "",
    position: "",
    liftHeight: "",
    wheelType: "",
    fitmentType: "",
    createdBy: "",
    createdAtFrom: "",
    createdAtTo: "",
    updatedAtFrom: "",
    updatedAtTo: "",
  });

  // Edit functionality state
  const [editingFitment, setEditingFitment] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<any>({});

  // View details state
  const [viewDetailsModalOpen, setViewDetailsModalOpen] = useState(false);
  const [selectedFitmentDetails, setSelectedFitmentDetails] =
    useState<any>(null);

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  // Build API parameters including advanced filters
  const buildApiParams = useCallback(() => {
    const params: any = {
      search: searchTerm || undefined,
      sortBy,
      sortOrder,
      page: currentPage,
      pageSize: 50,
    };

    // Add advanced filters
    Object.entries(advancedFilters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params[key] = value;
      }
    });

    return params;
  }, [searchTerm, sortBy, sortOrder, currentPage, advancedFilters]);

  const { data, loading, error, refetch } = useApi<{
    fitments: FlattenedAppliedFitment[];
    totalCount: number;
  }>(() => fitmentsService.getFitments(buildApiParams()), [buildApiParams]);

  // Fetch AI-generated fitments from Django backend
  const { refetch: refetchAi } = useApi<{
    fitments: any[];
    total_fitments: number;
  }>(() => fitmentUploadService.getAppliedFitments(), []);

  // Fetch filter options
  const { data: filterOptionsData, refetch: refetchFilterOptions } =
    useApi<FilterOptions>(() => fitmentsService.getFilterOptions(), []);

  const fitments = data?.fitments ?? [];

  // Update filter options when data is loaded
  useEffect(() => {
    if (filterOptionsData) {
      setFilterOptions(filterOptionsData);
    }
  }, [filterOptionsData]);
  useEffect(() => {
    const onFocus = () => {
      refetch();
      refetchAi();
      refetchFilterOptions();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        refetch();
        refetchAi();
        refetchFilterOptions();
      }
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch, refetchAi, refetchFilterOptions]);

  // Handler functions
  const handleAdvancedFilterChange = (
    field: keyof AdvancedFilters,
    value: any
  ) => {
    setAdvancedFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearAdvancedFilters = () => {
    setAdvancedFilters({
      partId: "",
      itemStatus: "",
      yearFrom: null,
      yearTo: null,
      makeName: "",
      modelName: "",
      subModelName: "",
      driveTypeName: "",
      fuelTypeName: "",
      bodyTypeName: "",
      partTypeDescriptor: "",
      position: "",
      liftHeight: "",
      wheelType: "",
      fitmentType: "",
      createdBy: "",
      createdAtFrom: "",
      createdAtTo: "",
      updatedAtFrom: "",
      updatedAtTo: "",
    });
    setCurrentPage(1);
  };

  const handleEditFitment = (fitment: FlattenedAppliedFitment) => {
    setEditingFitment(fitment.hash);
    setEditFormData({
      itemStatus: fitment.itemStatus,
      year: fitment.year,
      makeName: fitment.makeName,
      modelName: fitment.modelName,
      subModelName: fitment.subModelName,
      driveTypeName: fitment.driveTypeName,
      fuelTypeName: fitment.fuelTypeName,
      bodyTypeName: fitment.bodyTypeName,
      partTypeDescriptor: fitment.partTypeDescriptor,
      position: fitment.position,
      liftHeight: fitment.liftHeight,
      wheelType: fitment.wheelType,
      fitmentTitle: fitment.fitmentTitle,
      fitmentDescription: fitment.fitmentDescription,
      fitmentNotes: fitment.fitmentNotes,
      quantity: fitment.quantity,
    });
  };

  const handleSaveEdit = async () => {
    if (!editingFitment) return;

    try {
      await fitmentsService.updateFitment(editingFitment, {
        ...editFormData,
        updatedBy: "user",
      });

      notifications.show({
        title: "Success",
        message: "Fitment updated successfully",
        color: "green",
      });

      setEditingFitment(null);
      setEditFormData({});
      refetch();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update fitment",
        color: "red",
      });
    }
  };

  const handleCancelEdit = () => {
    setEditingFitment(null);
    setEditFormData({});
  };

  const handleViewDetails = async (fitmentHash: string) => {
    try {
      const response = await fitmentsService.getFitmentDetail(fitmentHash);
      setSelectedFitmentDetails(response.data);
      setViewDetailsModalOpen(true);
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to load fitment details",
        color: "red",
      });
    }
  };

  const handleDeleteFitment = async (fitmentHash: string) => {
    try {
      await fitmentsService.deleteFitment(fitmentHash);
      notifications.show({
        title: "Success",
        message: "Fitment deleted successfully",
        color: "green",
      });
      refetch();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete fitment",
        color: "red",
      });
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    setExportLoading(true);
    try {
      const response = await fitmentsService.exportFitments(
        format,
        buildApiParams()
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `fitments_export.${format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      notifications.show({
        title: "Success",
        message: `Fitments exported as ${format.toUpperCase()}`,
        color: "green",
      });
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to export fitments",
        color: "red",
      });
    } finally {
      setExportLoading(false);
    }
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
                      onChange={(value) => setSortBy(value || "updatedAt")}
                      data={[
                        { value: "partId", label: "Part ID" },
                        { value: "makeName", label: "Make" },
                        { value: "modelName", label: "Model" },
                        { value: "year", label: "Year" },
                        { value: "updatedAt", label: "Last Updated" },
                        { value: "createdAt", label: "Created Date" },
                        { value: "itemStatus", label: "Status" },
                        { value: "fitmentType", label: "Fitment Type" },
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

                    <Button
                      leftSection={
                        showAdvancedFilters ? (
                          <IconChevronUp size={16} />
                        ) : (
                          <IconChevronDown size={16} />
                        )
                      }
                      variant="outline"
                      onClick={() =>
                        setShowAdvancedFilters(!showAdvancedFilters)
                      }
                      styles={{
                        root: {
                          borderRadius: "10px",
                          fontWeight: 600,
                          fontSize: "14px",
                          height: "48px",
                          padding: "0 20px",
                          border: "2px solid #e2e8f0",
                          color: "#374151",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          "&:hover": {
                            backgroundColor: "#f8fafc",
                            borderColor: "#cbd5e1",
                            transform: "translateY(-1px)",
                          },
                        },
                      }}
                    >
                      Advanced Filters
                    </Button>
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

                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <Button
                          leftSection={<IconDownload size={16} />}
                          variant="filled"
                          loading={exportLoading}
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
                              transition:
                                "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
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
                          Export
                        </Button>
                      </Menu.Target>
                      <Menu.Dropdown>
                        <Menu.Item
                          leftSection={<IconFileText size={14} />}
                          onClick={() => handleExport("csv")}
                        >
                          Export as CSV
                        </Menu.Item>
                        <Menu.Item
                          leftSection={<IconFileSpreadsheet size={14} />}
                          onClick={() => handleExport("xlsx")}
                        >
                          Export as XLSX
                        </Menu.Item>
                      </Menu.Dropdown>
                    </Menu>
                  </Group>
                </Group>
              </div>

              {/* Advanced Filters */}
              <Collapse in={showAdvancedFilters}>
                <Card
                  withBorder
                  radius="md"
                  p="lg"
                  style={{ backgroundColor: "#f8fafc" }}
                >
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={600} size="sm" c="#374151">
                        Advanced Filters
                      </Text>
                      <Button
                        size="xs"
                        variant="light"
                        onClick={clearAdvancedFilters}
                        leftSection={<IconX size={12} />}
                      >
                        Clear All
                      </Button>
                    </Group>

                    <Grid>
                      <Grid.Col span={6}>
                        <TextInput
                          label="Part ID"
                          placeholder="Filter by Part ID"
                          value={advancedFilters.partId}
                          onChange={(event) =>
                            handleAdvancedFilterChange(
                              "partId",
                              event.currentTarget.value
                            )
                          }
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Select
                          label="Status"
                          placeholder="Select status"
                          value={advancedFilters.itemStatus}
                          onChange={(value) =>
                            handleAdvancedFilterChange(
                              "itemStatus",
                              value || ""
                            )
                          }
                          data={
                            filterOptions?.itemStatus.map((status) => ({
                              value: status,
                              label: status,
                            })) || []
                          }
                          clearable
                        />
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <NumberInput
                          label="Year From"
                          placeholder="Min year"
                          value={advancedFilters.yearFrom || undefined}
                          onChange={(value) =>
                            handleAdvancedFilterChange("yearFrom", value)
                          }
                          min={filterOptions?.yearRange.min || 2000}
                          max={filterOptions?.yearRange.max || 2030}
                        />
                      </Grid.Col>
                      <Grid.Col span={3}>
                        <NumberInput
                          label="Year To"
                          placeholder="Max year"
                          value={advancedFilters.yearTo || undefined}
                          onChange={(value) =>
                            handleAdvancedFilterChange("yearTo", value)
                          }
                          min={filterOptions?.yearRange.min || 2000}
                          max={filterOptions?.yearRange.max || 2030}
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Select
                          label="Make"
                          placeholder="Select make"
                          value={advancedFilters.makeName}
                          onChange={(value) =>
                            handleAdvancedFilterChange("makeName", value || "")
                          }
                          data={
                            filterOptions?.makeName.map((make) => ({
                              value: make,
                              label: make,
                            })) || []
                          }
                          clearable
                          searchable
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Select
                          label="Model"
                          placeholder="Select model"
                          value={advancedFilters.modelName}
                          onChange={(value) =>
                            handleAdvancedFilterChange("modelName", value || "")
                          }
                          data={
                            filterOptions?.modelName.map((model) => ({
                              value: model,
                              label: model,
                            })) || []
                          }
                          clearable
                          searchable
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Select
                          label="Drive Type"
                          placeholder="Select drive type"
                          value={advancedFilters.driveTypeName}
                          onChange={(value) =>
                            handleAdvancedFilterChange(
                              "driveTypeName",
                              value || ""
                            )
                          }
                          data={
                            filterOptions?.driveTypeName.map((drive) => ({
                              value: drive,
                              label: drive,
                            })) || []
                          }
                          clearable
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Select
                          label="Fuel Type"
                          placeholder="Select fuel type"
                          value={advancedFilters.fuelTypeName}
                          onChange={(value) =>
                            handleAdvancedFilterChange(
                              "fuelTypeName",
                              value || ""
                            )
                          }
                          data={
                            filterOptions?.fuelTypeName.map((fuel) => ({
                              value: fuel,
                              label: fuel,
                            })) || []
                          }
                          clearable
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Select
                          label="Position"
                          placeholder="Select position"
                          value={advancedFilters.position}
                          onChange={(value) =>
                            handleAdvancedFilterChange("position", value || "")
                          }
                          data={
                            filterOptions?.position.map((pos) => ({
                              value: pos,
                              label: pos,
                            })) || []
                          }
                          clearable
                        />
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <Select
                          label="Lift Height"
                          placeholder="Select lift height"
                          value={advancedFilters.liftHeight}
                          onChange={(value) =>
                            handleAdvancedFilterChange(
                              "liftHeight",
                              value || ""
                            )
                          }
                          data={
                            filterOptions?.liftHeight.map((lift) => ({
                              value: lift,
                              label: lift,
                            })) || []
                          }
                          clearable
                        />
                      </Grid.Col>
                    </Grid>
                  </Stack>
                </Card>
              </Collapse>
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
                        {editingFitment === fitment.hash ? (
                          <TextInput
                            value={editFormData.partId || fitment.partId}
                            onChange={(event) =>
                              setEditFormData((prev: any) => ({
                                ...prev,
                                partId: event.currentTarget.value,
                              }))
                            }
                            size="xs"
                            styles={{
                              input: { fontSize: "12px", height: "28px" },
                            }}
                          />
                        ) : (
                          <Text fw={500}>{fitment.partId}</Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {editingFitment === fitment.hash ? (
                          <Select
                            value={
                              editFormData.itemStatus || fitment.itemStatus
                            }
                            onChange={(value) =>
                              setEditFormData((prev: any) => ({
                                ...prev,
                                itemStatus: value || "",
                              }))
                            }
                            data={
                              filterOptions?.itemStatus.map((status) => ({
                                value: status,
                                label: status,
                              })) || []
                            }
                            size="xs"
                            styles={{
                              input: { fontSize: "12px", height: "28px" },
                            }}
                          />
                        ) : (
                          <Badge
                            variant="light"
                            color={getStatusColor(fitment.itemStatus)}
                            size="sm"
                          >
                            {fitment.itemStatus}
                          </Badge>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {editingFitment === fitment.hash ? (
                          <Stack gap="xs">
                            <Group gap="xs">
                              <NumberInput
                                value={editFormData.year || fitment.year}
                                onChange={(value) =>
                                  setEditFormData((prev: any) => ({
                                    ...prev,
                                    year: value || fitment.year,
                                  }))
                                }
                                size="xs"
                                styles={{
                                  input: {
                                    fontSize: "12px",
                                    height: "28px",
                                    width: "60px",
                                  },
                                }}
                              />
                              <TextInput
                                value={
                                  editFormData.makeName || fitment.makeName
                                }
                                onChange={(event) =>
                                  setEditFormData((prev: any) => ({
                                    ...prev,
                                    makeName: event.currentTarget.value,
                                  }))
                                }
                                size="xs"
                                styles={{
                                  input: {
                                    fontSize: "12px",
                                    height: "28px",
                                    width: "80px",
                                  },
                                }}
                              />
                              <TextInput
                                value={
                                  editFormData.modelName || fitment.modelName
                                }
                                onChange={(event) =>
                                  setEditFormData((prev: any) => ({
                                    ...prev,
                                    modelName: event.currentTarget.value,
                                  }))
                                }
                                size="xs"
                                styles={{
                                  input: {
                                    fontSize: "12px",
                                    height: "28px",
                                    width: "80px",
                                  },
                                }}
                              />
                            </Group>
                            <Group gap="xs">
                              <TextInput
                                value={
                                  editFormData.subModelName ||
                                  fitment.subModelName
                                }
                                onChange={(event) =>
                                  setEditFormData((prev: any) => ({
                                    ...prev,
                                    subModelName: event.currentTarget.value,
                                  }))
                                }
                                size="xs"
                                styles={{
                                  input: {
                                    fontSize: "12px",
                                    height: "28px",
                                    width: "80px",
                                  },
                                }}
                                placeholder="Sub Model"
                              />
                              <TextInput
                                value={
                                  editFormData.driveTypeName ||
                                  fitment.driveTypeName
                                }
                                onChange={(event) =>
                                  setEditFormData((prev: any) => ({
                                    ...prev,
                                    driveTypeName: event.currentTarget.value,
                                  }))
                                }
                                size="xs"
                                styles={{
                                  input: {
                                    fontSize: "12px",
                                    height: "28px",
                                    width: "80px",
                                  },
                                }}
                                placeholder="Drive Type"
                              />
                            </Group>
                          </Stack>
                        ) : (
                          <div>
                            <Text size="sm" fw={500}>
                              {fitment.year} {fitment.makeName}{" "}
                              {fitment.modelName}
                            </Text>
                            <Text size="xs" c="dimmed">
                              {fitment.subModelName} • {fitment.driveTypeName}
                            </Text>
                          </div>
                        )}
                      </Table.Td>
                      <Table.Td>
                        {editingFitment === fitment.hash ? (
                          <TextInput
                            value={
                              editFormData.partTypeDescriptor ||
                              fitment.partTypeDescriptor
                            }
                            onChange={(event) =>
                              setEditFormData((prev: any) => ({
                                ...prev,
                                partTypeDescriptor: event.currentTarget.value,
                              }))
                            }
                            size="xs"
                            styles={{
                              input: { fontSize: "12px", height: "28px" },
                            }}
                          />
                        ) : (
                          fitment.partTypeDescriptor
                        )}
                      </Table.Td>
                      <Table.Td>
                        {editingFitment === fitment.hash ? (
                          <Select
                            value={editFormData.position || fitment.position}
                            onChange={(value) =>
                              setEditFormData((prev: any) => ({
                                ...prev,
                                position: value || "",
                              }))
                            }
                            data={
                              filterOptions?.position.map((pos) => ({
                                value: pos,
                                label: pos,
                              })) || []
                            }
                            size="xs"
                            styles={{
                              input: { fontSize: "12px", height: "28px" },
                            }}
                          />
                        ) : (
                          fitment.position
                        )}
                      </Table.Td>
                      <Table.Td>
                        {editingFitment === fitment.hash ? (
                          <TextInput
                            value={
                              editFormData.fitmentTitle || fitment.fitmentTitle
                            }
                            onChange={(event) =>
                              setEditFormData((prev: any) => ({
                                ...prev,
                                fitmentTitle: event.currentTarget.value,
                              }))
                            }
                            size="xs"
                            styles={{
                              input: { fontSize: "12px", height: "28px" },
                            }}
                          />
                        ) : (
                          fitment.fitmentTitle
                        )}
                      </Table.Td>
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
                        <Group gap="xs">
                          {editingFitment === fitment.hash ? (
                            <>
                              <Tooltip label="Save changes">
                                <ActionIcon
                                  color="green"
                                  variant="light"
                                  size="sm"
                                  onClick={handleSaveEdit}
                                >
                                  <IconCheck size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Cancel editing">
                                <ActionIcon
                                  color="gray"
                                  variant="light"
                                  size="sm"
                                  onClick={handleCancelEdit}
                                >
                                  <IconX size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          ) : (
                            <>
                              <Tooltip label="View details">
                                <ActionIcon
                                  color="blue"
                                  variant="light"
                                  size="sm"
                                  onClick={() =>
                                    handleViewDetails(fitment.hash)
                                  }
                                >
                                  <IconEye size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Edit fitment">
                                <ActionIcon
                                  color="orange"
                                  variant="light"
                                  size="sm"
                                  onClick={() => handleEditFitment(fitment)}
                                >
                                  <IconEdit size={14} />
                                </ActionIcon>
                              </Tooltip>
                              <Tooltip label="Delete fitment">
                                <ActionIcon
                                  color="red"
                                  variant="light"
                                  size="sm"
                                  onClick={() =>
                                    handleDeleteFitment(fitment.hash)
                                  }
                                >
                                  <IconTrash size={14} />
                                </ActionIcon>
                              </Tooltip>
                            </>
                          )}
                        </Group>
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

      {/* View Details Modal */}
      <Modal
        opened={viewDetailsModalOpen}
        onClose={() => setViewDetailsModalOpen(false)}
        title="Fitment Details"
        size="lg"
        centered
      >
        {selectedFitmentDetails && (
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Part ID
                </Text>
                <Text size="sm">{selectedFitmentDetails.partId}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Status
                </Text>
                <Badge
                  variant="light"
                  color={getStatusColor(selectedFitmentDetails.itemStatus)}
                  size="sm"
                >
                  {selectedFitmentDetails.itemStatus}
                </Badge>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Year
                </Text>
                <Text size="sm">{selectedFitmentDetails.year}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Make
                </Text>
                <Text size="sm">{selectedFitmentDetails.makeName}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Model
                </Text>
                <Text size="sm">{selectedFitmentDetails.modelName}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Sub Model
                </Text>
                <Text size="sm">{selectedFitmentDetails.subModelName}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Drive Type
                </Text>
                <Text size="sm">{selectedFitmentDetails.driveTypeName}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Fuel Type
                </Text>
                <Text size="sm">{selectedFitmentDetails.fuelTypeName}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Body Type
                </Text>
                <Text size="sm">{selectedFitmentDetails.bodyTypeName}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Part Type
                </Text>
                <Text size="sm">
                  {selectedFitmentDetails.partTypeDescriptor}
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Position
                </Text>
                <Text size="sm">{selectedFitmentDetails.position}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Lift Height
                </Text>
                <Text size="sm">{selectedFitmentDetails.liftHeight}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Wheel Type
                </Text>
                <Text size="sm">{selectedFitmentDetails.wheelType}</Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Quantity
                </Text>
                <Text size="sm">{selectedFitmentDetails.quantity}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text fw={600} size="sm" c="#374151">
                  Fitment Title
                </Text>
                <Text size="sm">{selectedFitmentDetails.fitmentTitle}</Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text fw={600} size="sm" c="#374151">
                  Description
                </Text>
                <Text size="sm">
                  {selectedFitmentDetails.fitmentDescription ||
                    "No description"}
                </Text>
              </Grid.Col>
              <Grid.Col span={12}>
                <Text fw={600} size="sm" c="#374151">
                  Notes
                </Text>
                <Text size="sm">
                  {selectedFitmentDetails.fitmentNotes || "No notes"}
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Created
                </Text>
                <Text size="sm">
                  {new Date(selectedFitmentDetails.createdAt).toLocaleString()}
                </Text>
              </Grid.Col>
              <Grid.Col span={6}>
                <Text fw={600} size="sm" c="#374151">
                  Updated
                </Text>
                <Text size="sm">
                  {new Date(selectedFitmentDetails.updatedAt).toLocaleString()}
                </Text>
              </Grid.Col>
            </Grid>

            <Divider />

            <Group justify="flex-end">
              <Button
                variant="light"
                onClick={() => setViewDetailsModalOpen(false)}
              >
                Close
              </Button>
              <Button
                leftSection={<IconEdit size={14} />}
                onClick={() => {
                  setViewDetailsModalOpen(false);
                  handleEditFitment(selectedFitmentDetails);
                }}
              >
                Edit Fitment
              </Button>
            </Group>
          </Stack>
        )}
      </Modal>
    </div>
  );
}
