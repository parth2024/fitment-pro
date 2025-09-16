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
  IconChevronDown,
  IconChevronUp,
  IconX,
  IconFileSpreadsheet,
  IconFileText,
} from "@tabler/icons-react";
import FilterableSortableHeader from "../components/FilterableSortableHeader";
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

interface ColumnFilters {
  partId: string;
  itemStatus: string;
  makeName: string;
  modelName: string;
  partTypeDescriptor: string;
  position: string;
  fitmentTitle: string;
  quantity: number | null;
  liftHeight: string;
  wheelType: string;
  updatedAt: string;
}

export default function Fitments() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFitments, setSelectedFitments] = useState<string[]>([]);
  const [expandedView, setExpandedView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [singleDeleteModalOpen, setSingleDeleteModalOpen] = useState(false);
  const [fitmentToDelete, setFitmentToDelete] = useState<string | null>(null);

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

  // Column-specific filters state
  const [columnFilters, setColumnFilters] = useState<ColumnFilters>({
    partId: "",
    itemStatus: "",
    makeName: "",
    modelName: "",
    partTypeDescriptor: "",
    position: "",
    fitmentTitle: "",
    quantity: null,
    liftHeight: "",
    wheelType: "",
    updatedAt: "",
  });

  // Export state
  const [exportLoading, setExportLoading] = useState(false);
  // Build API parameters including advanced filters and column filters
  const buildApiParams = useCallback(() => {
    const params: any = {
      search: searchTerm || undefined,
      sortBy,
      sortOrder,
      page: currentPage,
      pageSize: 20,
    };

    // Add advanced filters
    Object.entries(advancedFilters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params[key] = value;
      }
    });

    // Add column filters
    Object.entries(columnFilters).forEach(([key, value]) => {
      if (value !== "" && value !== null && value !== undefined) {
        params[`column_${key}`] = value;
      }
    });

    return params;
  }, [
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    advancedFilters,
    columnFilters,
  ]);

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
  const handleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === "asc" ? "desc" : "asc");
    } else {
      setSortBy(field);
      setSortOrder("desc");
    }
    setCurrentPage(1); // Reset to first page when sorting changes
  };

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

  const handleColumnFilterChange = (field: string, value: any) => {
    setColumnFilters((prev) => ({
      ...prev,
      [field]: value,
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const handleColumnFilterClear = (field: string) => {
    setColumnFilters((prev) => ({
      ...prev,
      [field]: field === "quantity" ? null : "",
    }));
    setCurrentPage(1); // Reset to first page when filters change
  };

  const clearAdvancedFilters = () => {
    // Clear search term
    setSearchTerm("");

    // Clear advanced filters
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

    // Clear column filters
    setColumnFilters({
      partId: "",
      itemStatus: "",
      makeName: "",
      modelName: "",
      partTypeDescriptor: "",
      position: "",
      fitmentTitle: "",
      quantity: null,
      liftHeight: "",
      wheelType: "",
      updatedAt: "",
    });

    // Reset sorting to default
    setSortBy("updatedAt");
    setSortOrder("desc");

    // Reset page to first
    setCurrentPage(1);

    // Clear any selected fitments
    setSelectedFitments([]);
  };

  const handleEditFitment = (fitment: FlattenedAppliedFitment) => {
    const event = new CustomEvent("editFitment", {
      detail: { fitmentHash: fitment.hash },
    });
    window.dispatchEvent(event);
  };

  const handleDeleteFitment = (fitmentHash: string) => {
    setFitmentToDelete(fitmentHash);
    setSingleDeleteModalOpen(true);
  };

  const confirmDeleteFitment = async () => {
    if (!fitmentToDelete) return;

    try {
      await fitmentsService.deleteFitment(fitmentToDelete);
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
    } finally {
      setSingleDeleteModalOpen(false);
      setFitmentToDelete(null);
    }
  };

  const handleExport = async (format: "csv" | "xlsx") => {
    setExportLoading(true);
    try {
      const response = await fitmentsService.exportFitments(format);

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
                  p="xl"
                  style={{
                    backgroundColor: "#ffffff",
                    border: "1px solid #e2e8f0",
                    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  }}
                >
                  <Stack gap="lg">
                    <Group justify="space-between">
                      <div>
                        <Text fw={700} size="lg" c="#1e293b">
                          Advanced Filters
                        </Text>
                        <Text size="sm" c="#64748b">
                          Refine your search with detailed filters
                        </Text>
                      </div>
                      <Button
                        size="sm"
                        variant="light"
                        color="gray"
                        onClick={clearAdvancedFilters}
                        leftSection={<IconX size={14} />}
                        styles={{
                          root: {
                            borderRadius: "8px",
                            fontWeight: 600,
                            fontSize: "13px",
                            height: "36px",
                            padding: "0 16px",
                            border: "1px solid #e2e8f0",
                            color: "#64748b",
                            backgroundColor: "#f8fafc",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              backgroundColor: "#f1f5f9",
                              borderColor: "#cbd5e1",
                            },
                          },
                        }}
                      >
                        Clear All
                      </Button>
                    </Group>

                    <Divider />

                    <Grid>
                      {/* Basic Information Row */}
                      <Grid.Col span={12}>
                        <Text fw={600} size="sm" c="#374151" mb="sm">
                          Basic Information
                        </Text>
                      </Grid.Col>

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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      {/* Year Range */}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      {/* Vehicle Information */}
                      <Grid.Col span={12} mt="md">
                        <Text fw={600} size="sm" c="#374151" mb="sm">
                          Vehicle Information
                        </Text>
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <TextInput
                          label="Sub Model"
                          placeholder="Enter sub model"
                          value={advancedFilters.subModelName}
                          onChange={(event) =>
                            handleAdvancedFilterChange(
                              "subModelName",
                              event.currentTarget.value
                            )
                          }
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <Select
                          label="Body Type"
                          placeholder="Select body type"
                          value={advancedFilters.bodyTypeName}
                          onChange={(value) =>
                            handleAdvancedFilterChange(
                              "bodyTypeName",
                              value || ""
                            )
                          }
                          data={
                            filterOptions?.bodyTypeName.map((body) => ({
                              value: body,
                              label: body,
                            })) || []
                          }
                          clearable
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      {/* Part Information */}
                      <Grid.Col span={12} mt="md">
                        <Text fw={600} size="sm" c="#374151" mb="sm">
                          Part Information
                        </Text>
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <Select
                          label="Part Type"
                          placeholder="Select part type"
                          value={advancedFilters.partTypeDescriptor}
                          onChange={(value) =>
                            handleAdvancedFilterChange(
                              "partTypeDescriptor",
                              value || ""
                            )
                          }
                          data={
                            filterOptions?.partTypeDescriptor.map((part) => ({
                              value: part,
                              label: part,
                            })) || []
                          }
                          clearable
                          searchable
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <Select
                          label="Wheel Type"
                          placeholder="Select wheel type"
                          value={advancedFilters.wheelType}
                          onChange={(value) =>
                            handleAdvancedFilterChange("wheelType", value || "")
                          }
                          data={
                            filterOptions?.wheelType.map((wheel) => ({
                              value: wheel,
                              label: wheel,
                            })) || []
                          }
                          clearable
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <Select
                          label="Fitment Type"
                          placeholder="Select fitment type"
                          value={advancedFilters.fitmentType}
                          onChange={(value) =>
                            handleAdvancedFilterChange(
                              "fitmentType",
                              value || ""
                            )
                          }
                          data={
                            filterOptions?.fitmentType.map((type) => ({
                              value: type,
                              label: type,
                            })) || []
                          }
                          clearable
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
                        />
                      </Grid.Col>

                      <Grid.Col span={6}>
                        <Select
                          label="Created By"
                          placeholder="Select creator"
                          value={advancedFilters.createdBy}
                          onChange={(value) =>
                            handleAdvancedFilterChange("createdBy", value || "")
                          }
                          data={
                            filterOptions?.createdBy.map((creator) => ({
                              value: creator,
                              label: creator,
                            })) || []
                          }
                          clearable
                          styles={{
                            label: {
                              fontWeight: 600,
                              fontSize: "13px",
                              color: "#374151",
                              marginBottom: "6px",
                            },
                            input: {
                              borderRadius: "8px",
                              border: "1px solid #d1d5db",
                              fontSize: "14px",
                              height: "40px",
                              transition: "all 0.2s ease",
                              "&:focus": {
                                borderColor: "#3b82f6",
                                boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                              },
                            },
                          }}
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

          {/* Active Column Filters Summary */}
          {Object.values(columnFilters).some(
            (value) => value !== "" && value !== null && value !== undefined
          ) && (
            <div
              style={{
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                borderRadius: "12px",
                border: "1px solid #f59e0b",
                padding: "16px 20px",
                boxShadow: "0 2px 4px rgba(245, 158, 11, 0.1)",
              }}
            >
              <Group justify="space-between" align="center">
                <Group gap="sm">
                  <div
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: "#f59e0b",
                    }}
                  />
                  <Text size="sm" fw={600} c="#92400e">
                    Column filters active
                  </Text>
                  <Group gap="xs">
                    {Object.entries(columnFilters)
                      .filter(
                        ([_, value]) =>
                          value !== "" && value !== null && value !== undefined
                      )
                      .map(([key, value]) => (
                        <Badge
                          key={key}
                          size="xs"
                          color="orange"
                          variant="light"
                          style={{ textTransform: "capitalize" }}
                        >
                          {key}: {value}
                        </Badge>
                      ))}
                  </Group>
                </Group>
                <Button
                  size="sm"
                  variant="light"
                  onClick={() => {
                    setColumnFilters({
                      partId: "",
                      itemStatus: "",
                      makeName: "",
                      modelName: "",
                      partTypeDescriptor: "",
                      position: "",
                      fitmentTitle: "",
                      quantity: null,
                      liftHeight: "",
                      wheelType: "",
                      updatedAt: "",
                    });
                  }}
                  styles={{
                    root: {
                      borderRadius: "8px",
                      fontWeight: 600,
                      fontSize: "12px",
                      height: "32px",
                      padding: "0 16px",
                      border: "1px solid #f59e0b",
                      color: "#92400e",
                      backgroundColor: "rgba(255, 255, 255, 0.7)",
                      transition: "all 0.2s ease",
                      "&:hover": {
                        backgroundColor: "rgba(255, 255, 255, 0.9)",
                        transform: "translateY(-1px)",
                      },
                    },
                  }}
                >
                  Clear Column Filters
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
                  <Table.Th>
                    <FilterableSortableHeader
                      label="Part ID"
                      field="partId"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterType="text"
                      filterValue={columnFilters.partId}
                      onFilterChange={handleColumnFilterChange}
                      onFilterClear={handleColumnFilterClear}
                      placeholder="Filter by Part ID"
                    />
                  </Table.Th>
                  <Table.Th>
                    <FilterableSortableHeader
                      label="Status"
                      field="itemStatus"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterType="select"
                      filterOptions={
                        filterOptions?.itemStatus.map((status) => ({
                          value: status,
                          label: status,
                        })) || []
                      }
                      filterValue={columnFilters.itemStatus}
                      onFilterChange={handleColumnFilterChange}
                      onFilterClear={handleColumnFilterClear}
                      placeholder="Select status"
                    />
                  </Table.Th>
                  <Table.Th>
                    <FilterableSortableHeader
                      label="Vehicle"
                      field="makeName"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterType="select"
                      filterOptions={
                        filterOptions?.makeName.map((make) => ({
                          value: make,
                          label: make,
                        })) || []
                      }
                      filterValue={columnFilters.makeName}
                      onFilterChange={handleColumnFilterChange}
                      onFilterClear={handleColumnFilterClear}
                      placeholder="Select make"
                    />
                  </Table.Th>
                  <Table.Th>
                    <FilterableSortableHeader
                      label="Part Type"
                      field="partTypeDescriptor"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterType="select"
                      filterOptions={
                        filterOptions?.partTypeDescriptor.map((part) => ({
                          value: part,
                          label: part,
                        })) || []
                      }
                      filterValue={columnFilters.partTypeDescriptor}
                      onFilterChange={handleColumnFilterChange}
                      onFilterClear={handleColumnFilterClear}
                      placeholder="Select part type"
                    />
                  </Table.Th>
                  <Table.Th>
                    <FilterableSortableHeader
                      label="Position"
                      field="position"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterType="select"
                      filterOptions={
                        filterOptions?.position.map((pos) => ({
                          value: pos,
                          label: pos,
                        })) || []
                      }
                      filterValue={columnFilters.position}
                      onFilterChange={handleColumnFilterChange}
                      onFilterClear={handleColumnFilterClear}
                      placeholder="Select position"
                    />
                  </Table.Th>
                  <Table.Th>
                    <FilterableSortableHeader
                      label="Title"
                      field="fitmentTitle"
                      currentSortBy={sortBy}
                      currentSortOrder={sortOrder}
                      onSort={handleSort}
                      filterType="text"
                      filterValue={columnFilters.fitmentTitle}
                      onFilterChange={handleColumnFilterChange}
                      onFilterClear={handleColumnFilterClear}
                      placeholder="Filter by title"
                    />
                  </Table.Th>
                  {expandedView && (
                    <>
                      <Table.Th>Description</Table.Th>
                      <Table.Th>
                        <FilterableSortableHeader
                          label="Quantity"
                          field="quantity"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                          filterType="number"
                          filterValue={columnFilters.quantity}
                          onFilterChange={handleColumnFilterChange}
                          onFilterClear={handleColumnFilterClear}
                          placeholder="Filter by quantity"
                          min={1}
                          max={100}
                        />
                      </Table.Th>
                      <Table.Th>
                        <FilterableSortableHeader
                          label="Lift Height"
                          field="liftHeight"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                          filterType="select"
                          filterOptions={
                            filterOptions?.liftHeight.map((lift) => ({
                              value: lift,
                              label: lift,
                            })) || []
                          }
                          filterValue={columnFilters.liftHeight}
                          onFilterChange={handleColumnFilterChange}
                          onFilterClear={handleColumnFilterClear}
                          placeholder="Select lift height"
                        />
                      </Table.Th>
                      <Table.Th>
                        <FilterableSortableHeader
                          label="Wheel Type"
                          field="wheelType"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                          filterType="select"
                          filterOptions={
                            filterOptions?.wheelType.map((wheel) => ({
                              value: wheel,
                              label: wheel,
                            })) || []
                          }
                          filterValue={columnFilters.wheelType}
                          onFilterChange={handleColumnFilterChange}
                          onFilterClear={handleColumnFilterClear}
                          placeholder="Select wheel type"
                        />
                      </Table.Th>
                      <Table.Th>
                        <FilterableSortableHeader
                          label="Updated"
                          field="updatedAt"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                          filterType="date"
                          filterValue={columnFilters.updatedAt}
                          onFilterChange={handleColumnFilterChange}
                          onFilterClear={handleColumnFilterClear}
                          placeholder="Filter by date"
                        />
                      </Table.Th>
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
                      <Table.Td>
                        <Text size="sm">{fitment.partTypeDescriptor}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{fitment.position}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" fw={500}>
                          {fitment.fitmentTitle}
                        </Text>
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
                          <Tooltip label="Edit fitment">
                            <ActionIcon
                              color="blue"
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
                              onClick={() => handleDeleteFitment(fitment.hash)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Tooltip>
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

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title="Confirm Bulk Deletion"
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

      {/* Single Delete Confirmation Modal */}
      <Modal
        opened={singleDeleteModalOpen}
        onClose={() => setSingleDeleteModalOpen(false)}
        title="Confirm Deletion"
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete this fitment? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => setSingleDeleteModalOpen(false)}
            >
              Cancel
            </Button>
            <Button color="red" onClick={confirmDeleteFitment}>
              Delete Fitment
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
