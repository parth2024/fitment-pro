import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
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
  MultiSelect,
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
  Radio,
  Textarea,
} from "@mantine/core";
import {
  IconSearch,
  IconDownload,
  IconTrash,
  IconEdit,
  IconChevronDown,
  IconX,
  IconFileSpreadsheet,
  IconFileText,
  IconBrain,
  IconUsers,
  IconShield,
  IconCheck,
  IconTable,
  IconInfoCircle,
} from "@tabler/icons-react";
import FilterableSortableHeader from "../components/FilterableSortableHeader";
import { useApi } from "../hooks/useApi";
import { useEntity } from "../hooks/useEntity";
import {
  fitmentsService,
  fitmentUploadService,
  dataUploadService,
  type FlattenedAppliedFitment,
} from "../api/services";
import { notifications } from "@mantine/notifications";
import MultiEntitySelector from "../components/MultiEntitySelector";

// Filter mode enum for match all/any configurations
export enum FilterMode {
  MATCH_ALL = "MATCH_ALL",
  MATCH_ANY = "MATCH_ANY",
}

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
  fitmentType: string;
}

export default function Fitments() {
  const navigate = useNavigate();
  const { currentEntity, loading: entityLoading } = useEntity();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFitments, setSelectedFitments] = useState<string[]>([]);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;
  const [sortBy, setSortBy] = useState("updatedAt");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [singleDeleteModalOpen, setSingleDeleteModalOpen] = useState(false);
  const [fitmentToDelete, setFitmentToDelete] = useState<string | null>(null);

  // Filter mode and vehicle filter state
  const [filterMode, setFilterMode] = useState<FilterMode>(
    FilterMode.MATCH_ALL
  );
  const [vehicleFilter, setVehicleFilter] = useState("");
  const [selectedParts, setSelectedParts] = useState<string[]>([]);
  const [showFitments, setShowFitments] = useState(false);
  const [showFitmentsLoading, setShowFitmentsLoading] = useState(false);
  const [filtersChanged, setFiltersChanged] = useState(false);

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
    fitmentType: "",
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

    // Add entity filtering
    if (selectedEntities.length > 0) {
      params.entity_ids = selectedEntities.join(",");
    }

    // Add selected parts filtering
    if (selectedParts.length > 0) {
      params.part_ids = selectedParts.join(",");
    }

    // Add filter mode and vehicle filter
    if (filterMode) {
      params.filterMode = filterMode;
    }
    if (vehicleFilter) {
      params.vehicleFilter = vehicleFilter;
    }

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

    // Debug logging
    console.log("API Parameters being sent:", params);

    return params;
  }, [
    searchTerm,
    sortBy,
    sortOrder,
    currentPage,
    selectedEntities,
    advancedFilters,
    columnFilters,
    filterMode,
    vehicleFilter,
    selectedParts,
  ]);

  // Manual state management for fitments to prevent disappearing
  const [fitmentsData, setFitmentsData] = useState<{
    fitments: FlattenedAppliedFitment[];
    totalCount: number;
  } | null>(null);
  const [fitmentsLoading, setFitmentsLoading] = useState(false);
  const [fitmentsError, setFitmentsError] = useState<string | null>(null);

  // Custom refetch that actually fetches data
  const manualRefetch = useCallback(async () => {
    try {
      setFitmentsLoading(true);
      setFitmentsError(null);
      const response = await fitmentsService.getFitments(buildApiParams());
      setFitmentsData(response.data);
      return response.data;
    } catch (error: any) {
      const errorMessage =
        error?.response?.data?.message || error?.message || "An error occurred";
      setFitmentsError(errorMessage);
      throw error;
    } finally {
      setFitmentsLoading(false);
    }
  }, [buildApiParams]);

  // Use fitmentsData instead of data from useApi
  const data = fitmentsData;
  const loading = fitmentsLoading;
  const error = fitmentsError;

  // Entity selection handlers
  const handleEntitySelectionChange = (entityIds: string[]) => {
    setSelectedEntities(entityIds);
  };

  const handleDataFetch = async (_entityIds: string[]) => {
    setDataFetched(true);
    // Don't auto-fetch, user needs to click "Show Fitments"
  };

  // Initialize with current entity if available and fetch data automatically
  useEffect(() => {
    if (currentEntity) {
      // Always set the current entity and fetch data when component mounts or entity changes
      setSelectedEntities([currentEntity.id]);
      setDataFetched(true);
    }
  }, [currentEntity]);

  // Listen for entity change events from EntitySelector
  useEffect(() => {
    const handleEntityChange = async () => {
      console.log("Entity changed, refreshing Fitments...");
      if (currentEntity) {
        setSelectedEntities([currentEntity.id]);
        setShowFitments(false);
        setShowFitmentsLoading(false);
        setFiltersChanged(false);
        setFitmentsData(null); // Clear fitments data when entity changes
      }
    };

    // Listen for custom entity change events
    window.addEventListener("entityChanged", handleEntityChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [currentEntity]);

  // Track when filters change to show visual indicator
  useEffect(() => {
    if (showFitments) {
      setFiltersChanged(true);
    }
  }, [
    searchTerm,
    filterMode,
    vehicleFilter,
    selectedParts,
    advancedFilters,
    columnFilters,
  ]);

  // Reset filters changed flag when fitments are refreshed
  useEffect(() => {
    if (!showFitmentsLoading) {
      setFiltersChanged(false);
    }
  }, [showFitmentsLoading]);

  // Fetch AI-generated fitments from Django backend
  const { refetch: refetchAi } = useApi<{
    fitments: any[];
    total_fitments: number;
  }>(() => fitmentUploadService.getAppliedFitments(), []);

  // Fetch filter options
  const { data: filterOptionsData, refetch: refetchFilterOptions } =
    useApi<FilterOptions>(() => fitmentsService.getFilterOptions(), []);

  // Fetch products from Product Catalog for the dropdown
  const [products, setProducts] = useState<
    Array<{ value: string; label: string }>
  >([]);
  const [productsLoading, setProductsLoading] = useState(false);

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setProductsLoading(true);
        // Fetch products from the Product Catalog API
        const response = await dataUploadService.getProductData({
          limit: 1000,
        });

        // Handle the response structure: { data: [...], total_count: ..., returned_count: ... }
        if (response?.data?.data && Array.isArray(response.data.data)) {
          const productsList = response.data.data.map((product: any) => ({
            value: product.part_id || String(product.id),
            label: `${product.part_id || product.id}${
              product.description ? ` - ${product.description}` : ""
            }`,
          }));
          setProducts(productsList);
          console.log(
            `Loaded ${productsList.length} products from Product Catalog`
          );
        } else {
          console.warn("Unexpected response structure:", response);
        }
      } catch (error) {
        console.error("Failed to fetch products:", error);
        notifications.show({
          title: "Warning",
          message: "Failed to load products from Product Catalog",
          color: "orange",
        });
      } finally {
        setProductsLoading(false);
      }
    };

    fetchProducts();
  }, []);

  // Mock fitment types for demonstration
  const mockFitments = (fitments: FlattenedAppliedFitment[]) => {
    return fitments.map((fitment, index) => {
      // Ensure fitmentType is set, defaulting to manual_fitment if not present
      let fitmentType = fitment.fitmentType || "manual_fitment";
      let aiDescription: string | undefined;
      let confidenceScore: number | undefined;

      // Simulate different fitment types for demonstration
      if (!fitment.fitmentType) {
        const typeIndex = index % 4;
        if (typeIndex === 0) {
          fitmentType = "ai_fitment";
          confidenceScore = Math.random() * 0.3 + 0.7; // 70-100% confidence
          aiDescription = `AI analyzed ${fitment.partTypeDescriptor} compatibility with ${fitment.year} ${fitment.makeName} ${fitment.modelName}. Based on vehicle specifications including ${fitment.driveTypeName} drive system, ${fitment.bodyTypeName} body type, and ${fitment.fuelTypeName} fuel type, this fitment shows high compatibility. The AI model considered part positioning, dimensional constraints, and manufacturer specifications to determine optimal fitment.`;
        } else if (typeIndex === 1) {
          fitmentType = "potential_fitment";
          confidenceScore = Math.random() * 0.4 + 0.5; // 50-90% confidence
          aiDescription = `Potential fitment identified for ${fitment.partTypeDescriptor} on ${fitment.year} ${fitment.makeName} ${fitment.modelName}. This fitment shows moderate compatibility but requires manual verification due to limited data availability or conflicting specifications. The AI detected similar vehicle configurations with successful fitments, but recommends review before approval.`;
        } else {
          fitmentType = "manual_fitment";
        }
      } else {
        // Add AI data for existing AI and potential fitments
        if (fitment.fitmentType === "ai_fitment") {
          confidenceScore =
            fitment.confidenceScore || Math.random() * 0.3 + 0.7;
          aiDescription =
            fitment.aiDescription ||
            `AI-generated fitment for ${fitment.partTypeDescriptor} on ${fitment.year} ${fitment.makeName} ${fitment.modelName}. Advanced machine learning algorithms analyzed vehicle specifications, part dimensions, and compatibility matrices to generate this high-confidence fitment recommendation.`;
        }
      }

      return {
        ...fitment,
        fitmentType,
        aiDescription,
        confidenceScore,
      };
    });
  };

  const fitments = mockFitments(data?.fitments ?? []);

  // Update filter options when data is loaded
  useEffect(() => {
    if (filterOptionsData) {
      setFilterOptions(filterOptionsData);
    }
  }, [filterOptionsData]);
  useEffect(() => {
    const onFocus = () => {
      // Only refetch fitments if they're already being shown
      if (showFitments) {
        manualRefetch();
      }
      refetchAi();
      refetchFilterOptions();
    };
    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        // Only refetch fitments if they're already being shown
        if (showFitments) {
          manualRefetch();
        }
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
  }, [manualRefetch, refetchAi, refetchFilterOptions, showFitments]);

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
      fitmentType: "",
    });

    // Reset sorting to default
    setSortBy("updatedAt");
    setSortOrder("desc");

    // Reset page to first
    setCurrentPage(1);

    // Clear any selected fitments
    setSelectedFitments([]);

    // Reset show fitments state
    setShowFitments(false);
    setShowFitmentsLoading(false);
    setFiltersChanged(false);
  };

  const handleEditFitment = (fitment: FlattenedAppliedFitment) => {
    navigate(`/edit-fitment/${fitment.hash}`);
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
      manualRefetch();
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

  const handleApproveFitment = async (fitmentHash: string) => {
    try {
      await fitmentsService.approveFitments([fitmentHash]);
      notifications.show({
        title: "Success",
        message: "Fitment approved successfully",
        color: "green",
      });
      manualRefetch();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to approve fitment",
        color: "red",
      });
    }
  };

  const handleRejectFitment = async (fitmentHash: string) => {
    try {
      await fitmentsService.rejectFitments([fitmentHash]);
      notifications.show({
        title: "Success",
        message: "Fitment rejected and deleted successfully",
        color: "green",
      });
      manualRefetch();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to reject fitment",
        color: "red",
      });
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

  const handleBulkDelete = async () => {
    if (selectedFitments.length === 0) {
      notifications.show({
        title: "Error",
        message: "Please select fitments to delete",
        color: "red",
      });
      return;
    }

    try {
      await fitmentsService.bulkDeleteFitments(selectedFitments);
      notifications.show({
        title: "Success",
        message: `Successfully deleted ${selectedFitments.length} fitments`,
        color: "green",
      });
      setSelectedFitments([]);
      setDeleteModalOpen(false);
      manualRefetch();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to delete fitments",
        color: "red",
      });
    }
  };

  const handleApproveAIFitments = async () => {
    if (selectedFitments.length === 0) {
      notifications.show({
        title: "Error",
        message: "Please select AI fitments to approve",
        color: "red",
      });
      return;
    }

    try {
      // Filter selected fitments to only include AI fitments
      const aiFitmentsToApprove = fitments.filter(
        (fitment) =>
          selectedFitments.includes(fitment.hash) &&
          fitment.fitmentType === "ai_fitment"
      );

      if (aiFitmentsToApprove.length === 0) {
        notifications.show({
          title: "Warning",
          message: "No AI fitments selected for approval",
          color: "orange",
        });
        return;
      }

      // Call API to approve AI fitments using bulk operation
      await fitmentsService.approveFitments(
        aiFitmentsToApprove.map((f) => f.hash)
      );

      notifications.show({
        title: "Success",
        message: `${aiFitmentsToApprove.length} AI fitments approved`,
        color: "green",
      });

      setSelectedFitments([]);
      manualRefetch();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to approve AI fitments",
        color: "red",
      });
    }
  };

  const handleRejectAIFitments = async () => {
    if (selectedFitments.length === 0) {
      notifications.show({
        title: "Error",
        message: "Please select AI fitments to reject",
        color: "red",
      });
      return;
    }

    try {
      // Filter selected fitments to only include AI fitments
      const aiFitmentsToReject = fitments.filter(
        (fitment) =>
          selectedFitments.includes(fitment.hash) &&
          fitment.fitmentType === "ai_fitment"
      );

      if (aiFitmentsToReject.length === 0) {
        notifications.show({
          title: "Warning",
          message: "No AI fitments selected for rejection",
          color: "orange",
        });
        return;
      }

      // Call API to reject AI fitments using bulk operation
      await fitmentsService.rejectFitments(
        aiFitmentsToReject.map((f) => f.hash)
      );

      notifications.show({
        title: "Success",
        message: `${aiFitmentsToReject.length} AI fitments rejected`,
        color: "green",
      });

      setSelectedFitments([]);
      manualRefetch();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to reject AI fitments",
        color: "red",
      });
    }
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

  // Fitment type helper functions
  const getFitmentTypeIcon = (fitmentType: string) => {
    switch (fitmentType) {
      case "ai_fitment":
        return <IconBrain size={16} />;
      case "potential_fitment":
        return <IconShield size={16} />;
      case "manual_fitment":
        return <IconUsers size={16} />;
      default:
        return <IconUsers size={16} />;
    }
  };

  const getFitmentTypeColor = (fitmentType: string) => {
    switch (fitmentType) {
      case "ai_fitment":
        return "blue";
      case "potential_fitment":
        return "orange";
      case "manual_fitment":
        return "green";
      default:
        return "gray";
    }
  };

  const getFitmentTypeLabel = (fitmentType: string) => {
    switch (fitmentType) {
      case "ai_fitment":
        return "AI Fitment";
      case "potential_fitment":
        return "Potential Fitment";
      case "manual_fitment":
        return "Manual Fitment";
      default:
        return "Unknown";
    }
  };

  const getFitmentTypeDescription = (fitmentType: string) => {
    switch (fitmentType) {
      case "ai_fitment":
        return "This fitment was generated using artificial intelligence algorithms based on vehicle specifications and part compatibility analysis.";
      case "potential_fitment":
        return "This is a potential fitment that has been identified as a possible match but may require further validation or review.";
      case "manual_fitment":
        return "This fitment was created manually by a user or administrator through direct input and verification.";
      default:
        return "Unknown fitment type.";
    }
  };

  const isPotentialFitment = (fitmentType: string) => {
    return fitmentType === "potential_fitment";
  };

  // AI confidence helper functions
  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return "gray";
    if (confidence >= 0.8) return "green";
    if (confidence >= 0.6) return "yellow";
    return "red";
  };

  const getConfidenceLabel = (confidence?: number) => {
    if (!confidence) return "Unknown";
    if (confidence >= 0.9) return "Very High";
    if (confidence >= 0.8) return "High";
    if (confidence >= 0.7) return "Good";
    if (confidence >= 0.6) return "Fair";
    return "Low";
  };

  const formatConfidenceScore = (confidence?: number) => {
    if (!confidence) return "N/A";
    return `${Math.round(confidence * 100)}%`;
  };

  const getEnhancedFitmentTypeDescription = (
    fitment: FlattenedAppliedFitment
  ) => {
    const baseDescription = getFitmentTypeDescription(fitment.fitmentType);

    if (
      fitment.fitmentType === "ai_fitment" &&
      fitment.aiDescription &&
      fitment.confidenceScore
    ) {
      return `${baseDescription}\n\nConfidence Score: ${formatConfidenceScore(
        fitment.confidenceScore
      )} (${getConfidenceLabel(fitment.confidenceScore)})\n\nAI Analysis:\n${
        fitment.aiDescription
      }`;
    }

    if (
      fitment.fitmentType === "potential_fitment" &&
      fitment.aiDescription &&
      fitment.confidenceScore
    ) {
      return `${baseDescription}\n\nConfidence Score: ${formatConfidenceScore(
        fitment.confidenceScore
      )} (${getConfidenceLabel(
        fitment.confidenceScore
      )})\n\nPotential Analysis:\n${fitment.aiDescription}`;
    }

    return baseDescription;
  };

  // Show loading state while entity is being loaded
  if (entityLoading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Stack gap="xl">
          <Card withBorder p="xl" radius="md">
            <Center py="xl">
              <Stack align="center" gap="md">
                <Text size="lg" c="dimmed">
                  Loading entity data...
                </Text>
              </Stack>
            </Center>
          </Card>
        </Stack>
      </div>
    );
  }

  // Show entity selection only if no current entity and no data fetched
  if (!currentEntity || (!dataFetched && selectedEntities.length === 0)) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Stack gap="xl">
          {/* Welcome Header */}
          <Card
            style={{
              background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
              border: "none",
              color: "white",
            }}
            p="xl"
          >
            <Group justify="space-between" align="center">
              <div>
                <Title order={1} c="white" mb="sm">
                  Fitments Management
                </Title>
                <Text size="lg" c="rgba(255, 255, 255, 0.9)" mb="md">
                  View and manage fitments across multiple entities with
                  advanced filtering
                </Text>
                <Group gap="sm">
                  <Badge variant="white" color="green" size="lg">
                    Multi-Entity Management
                  </Badge>
                  <Badge variant="white" color="blue" size="lg">
                    Advanced Filtering
                  </Badge>
                </Group>
              </div>
              <IconTable size={64} color="rgba(255, 255, 255, 0.8)" />
            </Group>
          </Card>

          {/* Entity Selection */}
          <MultiEntitySelector
            selectedEntities={selectedEntities}
            onEntitySelectionChange={handleEntitySelectionChange}
            onDataFetch={handleDataFetch}
            title="Select Entities for Fitments"
            description="Choose one or more entities to view and manage their fitments. You can select multiple entities to compare their fitment data."
            showStats={true}
          />
        </Stack>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100vh",
      }}
    >
      <style>
        {`
          /* Complete checkbox reset and proper styling */
          .mantine-Checkbox-root {
            display: flex !important;
            align-items: center !important;
            gap: 8px !important;
          }
          
          .mantine-Checkbox-input {
            width: 18px !important;
            height: 18px !important;
            border: 2px solid #d1d5db !important;
            border-radius: 4px !important;
            background-color: white !important;
            appearance: none !important;
            -webkit-appearance: none !important;
            -moz-appearance: none !important;
            position: relative !important;
            margin: 0 !important;
            padding: 0 !important;
            cursor: pointer !important;
            transition: all 0.15s ease !important;
            box-sizing: border-box !important;
          }
          
          /* Remove any existing pseudo-elements */
          .mantine-Checkbox-input::before,
          .mantine-Checkbox-input::after {
            display: none !important;
          }
          
          .mantine-Checkbox-input:hover {
            border-color: #9ca3af !important;
          }
          
          .mantine-Checkbox-input:checked {
            background-color: #3b82f6 !important;
            border-color: #3b82f6 !important;
          }
          
          .mantine-Checkbox-input:checked::after {
            content: "" !important;
            display: block !important;
            position: absolute !important;
            top: 3px !important;
            left: 6px !important;
            width: 4px !important;
            height: 8px !important;
            border: solid white !important;
            border-width: 0 2px 2px 0 !important;
            transform: rotate(45deg) !important;
          }
          
          .mantine-Checkbox-input:indeterminate {
            background-color: #3b82f6 !important;
            border-color: #3b82f6 !important;
          }
          
          .mantine-Checkbox-input:indeterminate::after {
            content: "" !important;
            display: block !important;
            position: absolute !important;
            top: 7px !important;
            left: 4px !important;
            width: 8px !important;
            height: 2px !important;
            background-color: white !important;
          }
          
          .mantine-Checkbox-input:focus {
            outline: 2px solid #3b82f6 !important;
            outline-offset: 2px !important;
          }
          
          .mantine-Checkbox-label {
            margin: 0 !important;
            padding: 0 !important;
          }
          
          /* Hide Mantine's default icon */
          .mantine-Checkbox-icon {
            display: none !important;
          }
        `}
      </style>
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
                <Group justify="space-between" align="flex-end" wrap="nowrap">
                  <Group gap="xs" style={{ flex: 1 }} wrap="nowrap">
                    <TextInput
                      placeholder="Search by Part ID, Make, Model, Year, Vehicle Type, Part Type, Position, Fitment Title, Description..."
                      leftSection={<IconSearch size={16} color="#64748b" />}
                      value={searchTerm}
                      onChange={(event) =>
                        setSearchTerm(event.currentTarget.value)
                      }
                      styles={{
                        root: { flex: 1, width: "100%" },
                        input: {
                          height: "48px",
                          fontSize: "14px",
                          paddingLeft: "40px",
                          paddingRight: "16px",
                        },
                        section: {
                          left: "12px",
                          width: "20px",
                        },
                      }}
                      size="md"
                    />

                    <Button
                      leftSection={
                        <div
                          style={{
                            transform: showAdvancedFilters
                              ? "rotate(180deg)"
                              : "rotate(0deg)",
                            transition: "transform 0.3s ease",
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <IconChevronDown size={16} />
                        </div>
                      }
                      variant={showAdvancedFilters ? "filled" : "light"}
                      onClick={() =>
                        setShowAdvancedFilters(!showAdvancedFilters)
                      }
                      size="sm"
                      styles={{
                        root: {
                          background: showAdvancedFilters
                            ? "#2563eb"
                            : "#f1f5f9",
                          color: showAdvancedFilters ? "#ffffff" : "#475569",
                          border: showAdvancedFilters
                            ? "1px solid #2563eb"
                            : "1px solid #e2e8f0",
                          transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                          fontWeight: 500,
                          "&:hover": {
                            background: showAdvancedFilters
                              ? "#1d4ed8"
                              : "#e2e8f0",
                            transform: "translateY(-1px)",
                            boxShadow: showAdvancedFilters
                              ? "0 4px 12px rgba(37, 99, 235, 0.3)"
                              : "0 2px 8px rgba(0, 0, 0, 0.1)",
                          },
                        },
                      }}
                    >
                      Advanced Filters
                    </Button>
                  </Group>

                  <Group gap="sm" mb={"5"}>
                    {selectedFitments.length > 0 && (
                      <Button
                        leftSection={<IconTrash size={16} />}
                        color="red"
                        onClick={() => setDeleteModalOpen(true)}
                        size="sm"
                        style={{ background: "red" }}
                      >
                        Delete ({selectedFitments.length})
                      </Button>
                    )}

                    <Menu shadow="md" width={200}>
                      <Menu.Target>
                        <Button
                          leftSection={<IconDownload size={16} />}
                          loading={exportLoading}
                          size="sm"
                          color="blue"
                          style={{ background: "#2563eb" }}
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

              {/* Parts Selection and Filter Mode */}
              <div style={{ marginTop: "16px" }}>
                <Card withBorder radius="md" p="md">
                  <Stack gap="md">
                    {/* Parts Selection */}
                    <div>
                      <Text fw={600} size="sm" c="#374151" mb="xs">
                        Select the Parts
                      </Text>
                      <MultiSelect
                        placeholder={
                          productsLoading
                            ? "Loading products..."
                            : "(leave blank to show all)"
                        }
                        value={selectedParts}
                        onChange={setSelectedParts}
                        data={products}
                        clearable
                        searchable
                        disabled={productsLoading}
                        styles={{
                          root: { maxWidth: 600, width: "100%" },
                        }}
                        size="sm"
                      />
                    </div>

                    {/* Filter Mode and Vehicle Filter */}
                    <Grid>
                      <Grid.Col span={6}>
                        <div>
                          <Text fw={600} size="sm" c="#374151" mb="xs">
                            Filter Mode
                          </Text>
                          <Radio.Group
                            value={filterMode}
                            onChange={(value) =>
                              setFilterMode(value as FilterMode)
                            }
                          >
                            <Stack gap="xs">
                              <Radio
                                value={FilterMode.MATCH_ALL}
                                label="Return fitments that match ALL the configurations"
                                size="sm"
                              />
                              <Radio
                                value={FilterMode.MATCH_ANY}
                                label="Return fitments that match ANY configuration"
                                size="sm"
                              />
                            </Stack>
                          </Radio.Group>
                        </div>
                      </Grid.Col>
                      <Grid.Col span={6}>
                        <div>
                          <Group gap="xs" mb="xs">
                            <Text fw={600} size="sm" c="#374151">
                              Filter
                            </Text>
                            <Tooltip
                              label="Enter a year (e.g., 2026) or full format: Year | Make | Model | Submodel | DriveType | FuelType | NumDoors (e.g: 2008|Dodge|Ram 1500|*|4WD|*|*). Use * for wildcards."
                              multiline
                              w={400}
                              withArrow
                            >
                              <IconInfoCircle size={16} color="#64748b" />
                            </Tooltip>
                          </Group>
                          <Textarea
                            placeholder="Enter year (e.g., 2026) or full format: Year | Make | Model | Submodel | DriveType | FuelType | NumDoors"
                            value={vehicleFilter}
                            onChange={(event) =>
                              setVehicleFilter(event.currentTarget.value)
                            }
                            minRows={3}
                            maxRows={6}
                            styles={{
                              input: {
                                fontSize: "13px",
                                fontFamily: "monospace",
                              },
                            }}
                            size="sm"
                          />
                        </div>
                      </Grid.Col>
                    </Grid>

                    {/* Show Fitments Button */}
                    <Group justify="center">
                      <div style={{ position: "relative" }}>
                        {filtersChanged && showFitments && (
                          <div
                            style={{
                              position: "absolute",
                              top: "-8px",
                              right: "-8px",
                              width: "12px",
                              height: "12px",
                              backgroundColor: "#f59e0b",
                              borderRadius: "50%",
                              border: "2px solid white",
                              zIndex: 1,
                            }}
                          />
                        )}
                        <Button
                          styles={{
                            root: {
                              fontWeight: 500,
                              fontSize: "14px",
                              borderRadius: "8px",
                              transition: "all 0.2s ease",
                              "&:hover": {
                                background: "#f1f5f9",
                              },
                            },
                          }}
                          onClick={async () => {
                            // Set showFitments to true first so the API call will work
                            if (!showFitments) {
                              setShowFitments(true);
                              // Wait a bit for state to update
                              await new Promise((resolve) =>
                                setTimeout(resolve, 100)
                              );
                            }

                            setShowFitmentsLoading(true);

                            // Always show loading animation for 1 second
                            await new Promise((resolve) =>
                              setTimeout(resolve, 1000)
                            );

                            setShowFitmentsLoading(false);

                            // Trigger manual refetch after loading animation
                            try {
                              await manualRefetch();
                              console.log("Fitments loaded successfully");
                            } catch (error) {
                              console.error("Error loading fitments:", error);
                            }
                          }}
                          loading={showFitmentsLoading}
                          size="md"
                          style={{ minWidth: 150 }}
                        >
                          {showFitmentsLoading
                            ? "Loading..."
                            : showFitments
                            ? filtersChanged
                              ? "Apply New Filters"
                              : "Refresh Fitments"
                            : "Show Fitments"}
                        </Button>
                      </div>
                    </Group>
                  </Stack>
                </Card>
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

          {/* AI Fitment Actions */}
          {selectedFitments.length > 0 &&
            (() => {
              const selectedFitmentsData = fitments.filter((f) =>
                selectedFitments.includes(f.hash)
              );
              // Only show approve/reject buttons if ALL selected fitments are AI fitments with readyToApprove status
              const hasAIReadyToApprove =
                selectedFitmentsData.length > 0 &&
                selectedFitmentsData.every(
                  (f) =>
                    f.fitmentType === "ai_fitment" &&
                    f.itemStatus === "ReadyToApprove"
                );

              return hasAIReadyToApprove ? (
                <div
                  style={{
                    background:
                      "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                    borderRadius: "12px",
                    border: "1px solid #f59e0b",
                    padding: "16px 20px",
                    boxShadow: "0 2px 4px rgba(245, 158, 11, 0.1)",
                    marginBottom: "16px",
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
                        AI Fitments Ready for Review
                      </Text>
                      {/* <Text size="xs" c="#a16207"> */}
                      {/* {
                          selectedFitmentsData.filter(
                            (f) =>
                              f.fitmentType === "ai_fitment" &&
                              f.itemStatus === "readyToApprove"
                          ).length
                        }{" "} */}
                      {/* fitments need approval */}
                      {/* </Text> */}
                    </Group>
                    <Group gap="xs">
                      <Button
                        leftSection={<IconCheck size={14} />}
                        color="green"
                        variant="default"
                        onClick={handleApproveAIFitments}
                        size="xs"
                        styles={{
                          root: {
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "1px solid #22c55e",
                            backgroundColor: "#f0fdf4",
                            color: "#166534",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              backgroundColor: "#dcfce7",
                              borderColor: "#16a34a",
                              transform: "translateY(-1px)",
                              boxShadow: "0 2px 4px rgba(34, 197, 94, 0.2)",
                            },
                          },
                        }}
                      >
                        Approve AI Fitments
                      </Button>
                      <Button
                        leftSection={<IconX size={14} />}
                        color="red"
                        variant="default"
                        onClick={handleRejectAIFitments}
                        size="xs"
                        styles={{
                          root: {
                            fontWeight: 600,
                            borderRadius: "6px",
                            border: "1px solid #ef4444",
                            backgroundColor: "#fef2f2",
                            color: "#dc2626",
                            transition: "all 0.2s ease",
                            "&:hover": {
                              backgroundColor: "#fee2e2",
                              borderColor: "#dc2626",
                              transform: "translateY(-1px)",
                              boxShadow: "0 2px 4px rgba(239, 68, 68, 0.2)",
                            },
                          },
                        }}
                      >
                        Reject AI Fitments
                      </Button>
                    </Group>
                  </Group>
                </div>
              ) : null;
            })()}

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
                      fitmentType: "",
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

          {/* Table - Only show if showFitments is true */}
          {showFitments && (
            <>
              {error && <Text c="red">{error}</Text>}
              {expandedView && (
                <div
                  style={{
                    marginBottom: "8px",
                    padding: "8px 12px",
                    backgroundColor: "#f8fafc",
                    borderRadius: "8px",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Text size="sm" c="#64748b" fw={500}>
                    💡 Expanded view is active - scroll horizontally to see all
                    columns
                  </Text>
                </div>
              )}
              <ScrollArea
                type="scroll"
                scrollbarSize={8}
                style={{
                  width: "100%",
                  maxWidth: "100%",
                  border: "1px solid #e2e8f0",
                  borderRadius: "8px",
                }}
              >
                <Table
                  striped
                  highlightOnHover
                  style={{
                    minWidth: expandedView ? "1400px" : "800px",
                    width: "100%",
                  }}
                >
                  <Table.Thead>
                    <Table.Tr style={{ height: "48px" }}>
                      <Table.Th
                        style={{
                          width: "50px",
                          minWidth: "50px",
                          verticalAlign: "middle",
                          textAlign: "center",
                        }}
                      >
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
                      <Table.Th
                        style={{
                          width: "120px",
                          minWidth: "120px",
                          verticalAlign: "middle",
                        }}
                      >
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
                      <Table.Th
                        style={{
                          width: "100px",
                          minWidth: "100px",
                          verticalAlign: "middle",
                        }}
                      >
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
                      <Table.Th
                        style={{
                          width: "200px",
                          minWidth: "200px",
                          verticalAlign: "middle",
                        }}
                      >
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
                      <Table.Th
                        style={{
                          width: "150px",
                          minWidth: "150px",
                          verticalAlign: "middle",
                        }}
                      >
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
                      <Table.Th
                        style={{
                          width: "100px",
                          minWidth: "100px",
                          verticalAlign: "middle",
                        }}
                      >
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
                      <Table.Th
                        style={{
                          width: "200px",
                          minWidth: "200px",
                          verticalAlign: "middle",
                        }}
                      >
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
                      <Table.Th
                        style={{
                          width: "180px",
                          minWidth: "180px",
                          verticalAlign: "middle",
                        }}
                      >
                        <FilterableSortableHeader
                          label="Fitment Type"
                          field="fitmentType"
                          currentSortBy={sortBy}
                          currentSortOrder={sortOrder}
                          onSort={handleSort}
                          filterType="select"
                          filterOptions={[
                            { value: "ai_fitment", label: "AI Fitment" },
                            {
                              value: "potential_fitment",
                              label: "Potential Fitment",
                            },
                            {
                              value: "manual_fitment",
                              label: "Manual Fitment",
                            },
                          ]}
                          filterValue={columnFilters.fitmentType || ""}
                          onFilterChange={handleColumnFilterChange}
                          onFilterClear={handleColumnFilterClear}
                          placeholder="Select method"
                        />
                      </Table.Th>
                      {expandedView && (
                        <>
                          <Table.Th
                            style={{
                              width: "250px",
                              minWidth: "250px",
                              verticalAlign: "middle",
                            }}
                          >
                            Description
                          </Table.Th>
                          <Table.Th
                            style={{
                              width: "80px",
                              minWidth: "80px",
                              verticalAlign: "middle",
                            }}
                          >
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
                          <Table.Th
                            style={{
                              width: "120px",
                              minWidth: "120px",
                              verticalAlign: "middle",
                            }}
                          >
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
                          <Table.Th
                            style={{
                              width: "120px",
                              minWidth: "120px",
                              verticalAlign: "middle",
                            }}
                          >
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
                          <Table.Th
                            style={{
                              width: "120px",
                              minWidth: "120px",
                              verticalAlign: "middle",
                            }}
                          >
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
                      <Table.Th
                        style={{
                          width: "100px",
                          minWidth: "100px",
                          verticalAlign: "middle",
                          textAlign: "center",
                        }}
                      >
                        Actions
                      </Table.Th>
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
                          <Table.Td>
                            <Skeleton height={20} width={80} radius="sm" />
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
                        <Table.Td colSpan={expandedView ? 13 : 9}>
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
                            <Group gap="xs">
                              <Badge
                                variant="light"
                                color={getStatusColor(fitment.itemStatus)}
                                size="sm"
                              >
                                {fitment.itemStatus}
                              </Badge>
                            </Group>
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
                          <Table.Td>
                            {fitment.fitmentType === "manual_fitment" ? (
                              <Group gap="xs">
                                {getFitmentTypeIcon(fitment.fitmentType)}
                                <Badge
                                  variant="light"
                                  color={getFitmentTypeColor(
                                    fitment.fitmentType
                                  )}
                                  size="sm"
                                >
                                  {getFitmentTypeLabel(fitment.fitmentType)}
                                </Badge>
                              </Group>
                            ) : (
                              <Tooltip
                                label={getEnhancedFitmentTypeDescription(
                                  fitment
                                )}
                                multiline
                                w={400}
                                withArrow
                              >
                                <Group gap="xs" style={{ cursor: "help" }}>
                                  {getFitmentTypeIcon(fitment.fitmentType)}
                                  <Badge
                                    variant="light"
                                    color={getFitmentTypeColor(
                                      fitment.fitmentType
                                    )}
                                    size="sm"
                                  >
                                    {getFitmentTypeLabel(fitment.fitmentType)}
                                  </Badge>
                                  {(fitment.fitmentType === "ai_fitment" ||
                                    fitment.fitmentType ===
                                      "potential_fitment") &&
                                    fitment.confidenceScore && (
                                      <Badge
                                        variant="filled"
                                        color={getConfidenceColor(
                                          fitment.confidenceScore
                                        )}
                                        size="xs"
                                        leftSection={<IconShield size={12} />}
                                      >
                                        {formatConfidenceScore(
                                          fitment.confidenceScore
                                        )}
                                      </Badge>
                                    )}
                                  {isPotentialFitment(fitment.fitmentType) && (
                                    <Badge
                                      variant="outline"
                                      color="orange"
                                      size="xs"
                                    >
                                      Needs Review
                                    </Badge>
                                  )}
                                </Group>
                              </Tooltip>
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
                              <Table.Td>{fitment.liftHeight || "-"}</Table.Td>
                              <Table.Td>{fitment.wheelType || "-"}</Table.Td>
                              <Table.Td>
                                <Text size="xs" c="dimmed">
                                  {new Date(
                                    fitment.updatedAt
                                  ).toLocaleDateString()}
                                </Text>
                              </Table.Td>
                            </>
                          )}
                          <Table.Td>
                            <Group gap="xs">
                              {fitment.itemStatus === "readyToApprove" ? (
                                <>
                                  <Tooltip label="Approve fitment">
                                    <ActionIcon
                                      color="green"
                                      variant="light"
                                      size="sm"
                                      onClick={() =>
                                        handleApproveFitment(fitment.hash)
                                      }
                                    >
                                      <IconCheck size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                  <Tooltip label="Reject fitment">
                                    <ActionIcon
                                      color="red"
                                      variant="light"
                                      size="sm"
                                      onClick={() =>
                                        handleRejectFitment(fitment.hash)
                                      }
                                    >
                                      <IconX size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                </>
                              ) : (
                                <>
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
            </>
          )}

          {/* Show message when fitments are not loaded yet */}
          {!showFitments && (
            <Card withBorder radius="md" p="xl" style={{ textAlign: "center" }}>
              <Stack align="center" gap="md">
                <IconTable size={48} color="#64748b" />
                <Text size="lg" c="dimmed" fw={500}>
                  Ready to view fitments
                </Text>
                <Text size="sm" c="dimmed">
                  Configure your filters and click "Show Fitments" to load the
                  data
                </Text>
                {(searchTerm ||
                  vehicleFilter ||
                  selectedParts.length > 0 ||
                  Object.values(advancedFilters).some(
                    (v) => v !== "" && v !== null
                  )) && (
                  <div
                    style={{
                      marginTop: "16px",
                      padding: "12px",
                      backgroundColor: "#f0f9ff",
                      borderRadius: "8px",
                      border: "1px solid #0ea5e9",
                    }}
                  >
                    <Text size="sm" c="#0369a1" fw={500}>
                      🔍 Filters Applied
                    </Text>
                    <Text size="xs" c="#0369a1" mt="xs">
                      {searchTerm && `Search: "${searchTerm}"`}
                      {vehicleFilter &&
                        ` • Vehicle Filter: ${
                          vehicleFilter.split("\n").length
                        } configuration(s)`}
                      {selectedParts.length > 0 &&
                        ` • Parts: ${selectedParts.length} selected`}
                      {Object.values(advancedFilters).some(
                        (v) => v !== "" && v !== null
                      ) && ` • Advanced filters active`}
                    </Text>
                  </div>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      {/* Bulk Delete Confirmation Modal */}
      <Modal
        opened={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        title={
          <Text fw={600} size="lg">
            Confirm Bulk Deletion
          </Text>
        }
        centered
      >
        <Stack gap="md">
          <Text>
            Are you sure you want to delete {selectedFitments.length} fitment
            {selectedFitments.length !== 1 ? "s" : ""}? This action cannot be
            undone.
          </Text>
          <Group justify="flex-end">
            <Button
              variant="light"
              onClick={() => setDeleteModalOpen(false)}
              size="sm"
            >
              Cancel
            </Button>
            <Button bg="red" onClick={handleBulkDelete} size="sm">
              Delete Fitments
            </Button>
          </Group>
        </Stack>
      </Modal>

      {/* Single Delete Confirmation Modal */}
      <Modal
        opened={singleDeleteModalOpen}
        onClose={() => setSingleDeleteModalOpen(false)}
        title={
          <Text fw={600} size="lg">
            Confirm Deletion
          </Text>
        }
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
              size="sm"
            >
              Cancel
            </Button>
            <Button color="red" onClick={confirmDeleteFitment} size="sm">
              Delete Fitment
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
