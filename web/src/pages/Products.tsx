import { useState, useEffect, useMemo, useRef } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Badge,
  Table,
  ScrollArea,
  Alert,
  Progress,
  TextInput,
  Tabs,
  Paper,
  ThemeIcon,
  Center,
  Pagination,
  Select,
} from "@mantine/core";
import {
  IconUpload,
  IconCheck,
  IconX,
  IconRefresh,
  IconBrain,
  IconSettings,
  IconPackage,
  IconSearch,
  IconAlertCircle,
  IconArrowsSort,
  IconSortAscending,
  IconSortDescending,
} from "@tabler/icons-react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { dataUploadService } from "../api/services";
import { useApi } from "../hooks/useApi";
import { useNavigate } from "react-router-dom";

export default function Products() {
  const { showSuccess, showError } = useProfessionalToast();
  const navigate = useNavigate();

  // States
  const [productFile, setProductFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [validationResults, setValidationResults] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<string | number>(25);
  const [totalCount, setTotalCount] = useState(0);
  const [sortField, setSortField] = useState<string>("id");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [showUpload, setShowUpload] = useState(false);
  const uploadSectionRef = useRef<HTMLDivElement | null>(null);

  // API hooks
  const { data: productsResponse, refetch: refetchProducts } = useApi(
    () =>
      dataUploadService.getProductData({
        page,
        page_size: typeof pageSize === "string" ? parseInt(pageSize) : pageSize,
        search: searchQuery || undefined,
        ordering: sortDirection === "asc" ? sortField : `-${sortField}`,
      }),
    [page, pageSize, searchQuery, sortField, sortDirection]
  ) as any;

  const { data: dataStatus, refetch: refetchDataStatus } = useApi(
    () => dataUploadService.getDataStatus(),
    []
  ) as any;

  // Extract products array and total count from API response
  // Note: useApi already returns response.data, so productsResponse is the data object
  const productsDataRaw = productsResponse || {};
  const productsData = Array.isArray(productsDataRaw)
    ? productsDataRaw
    : productsDataRaw?.results || productsDataRaw?.data || [];

  // Get total count from API response (prioritize count, then total_count, then fallback)
  const computedTotal =
    productsDataRaw?.count ??
    productsDataRaw?.total_count ??
    (Array.isArray(productsDataRaw) ? productsDataRaw.length : 0);

  useEffect(() => {
    setTotalCount(computedTotal);
  }, [computedTotal]);

  // Listen for entity changes
  useEffect(() => {
    const handleEntityChange = async () => {
      console.log("Entity changed, refreshing Products...");
      await Promise.all([refetchProducts(), refetchDataStatus()]);
    };

    window.addEventListener("entityChanged", handleEntityChange);

    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [refetchProducts, refetchDataStatus]);

  // Handle file upload
  const handleUpload = async () => {
    if (!productFile) {
      showError("Please select a product file to upload");
      return;
    }

    setUploading(true);
    setUploadProgress(0);
    setValidationResults(null);

    try {
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const result = await dataUploadService.uploadFiles(
        undefined,
        productFile
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        showSuccess("Product file uploaded and processed successfully!");
        await Promise.all([refetchProducts(), refetchDataStatus()]);
        setProductFile(null);
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      if (error.response?.data?.error_message) {
        showError(`Validation Error: ${error.response.data.error_message}`);
      } else {
        showError("Failed to upload product file");
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Navigate to AI fitments
  const handleProceedToAiFitments = () => {
    navigate("/apply-fitments");
    // Set a flag to auto-select AI method
    sessionStorage.setItem("autoSelectAiMethod", "true");
  };

  // Navigate to product configuration in settings
  const handleConfigureProducts = () => {
    navigate("/settings?tab=entity&subtab=products");
  };

  // Display list (server-side filtering used; fallback to client filter if array-only)
  const filteredProducts = useMemo(() => {
    if (!Array.isArray(productsData)) return [];
    // If API response has pagination structure (results/count), use server-side filtering
    // Only do client-side filtering if response is a plain array (legacy)
    // Note: useApi already returns response.data, so productsResponse is the data object
    if (
      productsResponse?.results !== undefined ||
      productsResponse?.count !== undefined
    ) {
      return productsData; // Server-side pagination/filtering already applied
    }
    // Legacy: client-side filtering for plain array responses
    if (!searchQuery) return productsData;
    const query = searchQuery.toLowerCase();
    return productsData.filter((product: any) =>
      [product.part_id, product.description, product.category]
        .filter(Boolean)
        .map((v: string) => v.toLowerCase())
        .some((v: string) => v.includes(query))
    );
  }, [productsData, productsResponse, searchQuery]);

  // Sorting handlers
  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setPage(1);
  };

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <IconArrowsSort size={14} />;
    return sortDirection === "asc" ? (
      <IconSortAscending size={14} />
    ) : (
      <IconSortDescending size={14} />
    );
  };

  const handleClickUploadTop = () => {
    setShowUpload(true);
    setTimeout(() => {
      uploadSectionRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 0);
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={2} c="#1e293b" fw={600}>
            Products Management
          </Title>
          <Text size="md" c="#64748b">
            Upload, validate, and manage your product catalog for AI fitment
            generation
          </Text>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="products" variant="pills">
          <Tabs.List>
            <Tabs.Tab value="products" leftSection={<IconPackage size={16} />}>
              Products Data
            </Tabs.Tab>
            <Tabs.Tab
              value="configuration"
              leftSection={<IconSettings size={16} />}
            >
              Configuration
            </Tabs.Tab>
          </Tabs.List>

          {/* Products Data Tab */}
          <Tabs.Panel value="products" pt="xl">
            <Stack gap="xl">
              {/* Data Status Card */}
              <Card withBorder>
                <Group justify="space-between">
                  <div>
                    <Text fw={600} size="lg" c="#1e293b" mb="xs">
                      Product Data Status
                    </Text>
                    <Group gap="lg">
                      <Group gap="xs">
                        <Badge
                          color={
                            dataStatus?.products?.exists ? "green" : "gray"
                          }
                          variant="light"
                        >
                          {dataStatus?.products?.exists
                            ? "Data Available"
                            : "No Data"}
                        </Badge>
                        {dataStatus?.products?.exists && (
                          <Text size="sm" c="dimmed">
                            {dataStatus.products.record_count} products
                          </Text>
                        )}
                      </Group>
                    </Group>
                  </div>
                  <Group gap="sm">
                    <Button
                      variant="outline"
                      size="sm"
                      leftSection={<IconRefresh size={14} />}
                      onClick={() => {
                        refetchProducts();
                        refetchDataStatus();
                      }}
                    >
                      Refresh
                    </Button>
                    {dataStatus?.products?.exists && (
                      <Button
                        size="sm"
                        leftSection={<IconBrain size={14} />}
                        onClick={handleProceedToAiFitments}
                      >
                        Proceed to AI Fitments
                      </Button>
                    )}
                  </Group>
                </Group>
              </Card>

              {/* Upload Section (collapsible) */}
              {showUpload && (
                <Card withBorder ref={uploadSectionRef as any}>
                  <Stack gap="lg">
                    <div>
                      <Text fw={600} size="lg" c="#1e293b" mb="xs">
                        Upload Product Data
                      </Text>
                      <Text size="sm" c="#64748b">
                        Upload product files to enable AI fitment generation
                      </Text>
                    </div>

                    {/* File Upload Area */}
                    <Paper
                      style={{
                        minHeight: "150px",
                        border: `2px dashed ${
                          productFile ? "#22c55e" : "#cbd5e1"
                        }`,
                        borderRadius: "12px",
                        backgroundColor: productFile ? "#f0fdf4" : "#fafafa",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        if (uploading) return;
                        const input = document.createElement("input");
                        input.type = "file";
                        input.accept = ".csv,.xlsx,.xls,.json";
                        input.onchange = (e) => {
                          const file = (e.target as HTMLInputElement)
                            .files?.[0];
                          if (file) setProductFile(file);
                        };
                        input.click();
                      }}
                    >
                      <Center style={{ height: "150px", padding: "24px" }}>
                        <Stack align="center" gap="md">
                          <ThemeIcon
                            size="xl"
                            variant="light"
                            color={productFile ? "green" : "blue"}
                            radius="xl"
                          >
                            {productFile ? (
                              <IconCheck size={28} />
                            ) : (
                              <IconUpload size={28} />
                            )}
                          </ThemeIcon>

                          <Stack align="center" gap="xs">
                            <Text fw={600} size="md" c="dark">
                              {productFile
                                ? productFile.name
                                : "Click to upload product file"}
                            </Text>
                            <Text size="sm" c="dimmed" ta="center">
                              {productFile
                                ? "Click to change file"
                                : "Supports CSV, XLSX, XLS, and JSON formats"}
                            </Text>
                          </Stack>
                        </Stack>
                      </Center>
                    </Paper>

                    {/* Upload Progress */}
                    {uploading && (
                      <Paper
                        withBorder
                        p="md"
                        style={{ backgroundColor: "#f8fafc" }}
                      >
                        <Stack gap="sm">
                          <Group justify="space-between">
                            <Text size="sm" fw={600}>
                              Uploading and processing...
                            </Text>
                            <Badge color="blue" variant="light">
                              {uploadProgress}%
                            </Badge>
                          </Group>
                          <Progress value={uploadProgress} size="lg" animated />
                        </Stack>
                      </Paper>
                    )}

                    {/* Validation Results */}
                    {validationResults && (
                      <Alert
                        color={validationResults.is_valid ? "green" : "red"}
                        icon={
                          validationResults.is_valid ? (
                            <IconCheck size={16} />
                          ) : (
                            <IconX size={16} />
                          )
                        }
                      >
                        <Text size="sm" fw={600}>
                          {validationResults.is_valid
                            ? `File validated successfully! ${validationResults.total_records} products found.`
                            : "Validation failed"}
                        </Text>
                        {!validationResults.is_valid &&
                          validationResults.errors && (
                            <Text size="xs" mt="xs">
                              {validationResults.errors.slice(0, 3).join("; ")}
                            </Text>
                          )}
                      </Alert>
                    )}

                    {/* Upload Button */}
                    <Center>
                      <Button
                        size="lg"
                        leftSection={<IconUpload size={20} />}
                        onClick={handleUpload}
                        loading={uploading}
                        disabled={!productFile || uploading}
                      >
                        Upload Product Data
                      </Button>
                    </Center>
                  </Stack>
                </Card>
              )}

              {/* Products List */}
              {dataStatus?.products?.exists && (
                <Card withBorder>
                  <Stack gap="md">
                    <Stack gap="sm">
                      <Group justify="space-between" align="center">
                        <Text fw={600} size="lg" c="#1e293b">
                          Product Catalog ({totalCount} products)
                        </Text>
                      </Group>
                      <Group
                        justify="space-between"
                        align="center"
                        wrap="nowrap"
                      >
                        <TextInput
                          placeholder="Search by ID, description, or category..."
                          leftSection={<IconSearch size={16} />}
                          value={searchQuery}
                          onChange={(e) => {
                            setSearchQuery(e.currentTarget.value);
                            setPage(1);
                          }}
                          style={{ flex: 1, minWidth: 0 }}
                        />
                        <Button
                          size="sm"
                          leftSection={<IconUpload size={14} />}
                          onClick={handleClickUploadTop}
                          style={{ whiteSpace: "nowrap", flexShrink: 0 }}
                        >
                          Upload Product
                        </Button>
                      </Group>
                    </Stack>

                    <ScrollArea h={500}>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th
                              onClick={() => handleSort("id")}
                              style={{ cursor: "pointer" }}
                            >
                              <Group gap={6} wrap="nowrap">
                                <span>ID</span>
                                <SortIcon field="id" />
                              </Group>
                            </Table.Th>
                            <Table.Th
                              onClick={() => handleSort("part_id")}
                              style={{ cursor: "pointer" }}
                            >
                              <Group gap={6} wrap="nowrap">
                                <span>PTID</span>
                                <SortIcon field="part_id" />
                              </Group>
                            </Table.Th>
                            <Table.Th
                              onClick={() => handleSort("description")}
                              style={{ cursor: "pointer" }}
                            >
                              <Group gap={6} wrap="nowrap">
                                <span>Description</span>
                                <SortIcon field="description" />
                              </Group>
                            </Table.Th>
                            <Table.Th
                              onClick={() => handleSort("category")}
                              style={{ cursor: "pointer" }}
                            >
                              <Group gap={6} wrap="nowrap">
                                <span>Category</span>
                                <SortIcon field="category" />
                              </Group>
                            </Table.Th>
                            <Table.Th
                              onClick={() => handleSort("part_type")}
                              style={{ cursor: "pointer" }}
                            >
                              <Group gap={6} wrap="nowrap">
                                <span>Part Type</span>
                                <SortIcon field="part_type" />
                              </Group>
                            </Table.Th>
                            <Table.Th
                              onClick={() => handleSort("brand")}
                              style={{ cursor: "pointer" }}
                            >
                              <Group gap={6} wrap="nowrap">
                                <span>Brand</span>
                                <SortIcon field="brand" />
                              </Group>
                            </Table.Th>
                          </Table.Tr>
                        </Table.Thead>
                        <Table.Tbody>
                          {filteredProducts.length === 0 ? (
                            <Table.Tr>
                              <Table.Td colSpan={5}>
                                <Text size="sm" c="dimmed" ta="center" py="md">
                                  No products found
                                </Text>
                              </Table.Td>
                            </Table.Tr>
                          ) : (
                            filteredProducts.map((product: any) => (
                              <Table.Tr key={product.id}>
                                <Table.Td>
                                  <Text size="sm" fw={600} c="#3b82f6">
                                    {product.id}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm" fw={600} c="#3b82f6">
                                    {product.part_id}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {product.description?.substring(0, 60)}
                                    {product.description?.length > 60 && "..."}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Badge variant="light" size="sm">
                                    {product.category || "Uncategorized"}
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {product.part_type || "N/A"}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm">
                                    {product.brand || "N/A"}
                                  </Text>
                                </Table.Td>
                              </Table.Tr>
                            ))
                          )}
                        </Table.Tbody>
                      </Table>
                    </ScrollArea>

                    <Group justify="space-between" align="center">
                      <Group gap="xs">
                        <Text size="sm" c="dimmed">
                          Showing {filteredProducts.length} of {totalCount}{" "}
                          products
                          {totalCount > 0 && (
                            <>
                              {" "}
                              (Page {page} of{" "}
                              {Math.max(
                                1,
                                Math.ceil(
                                  totalCount /
                                    (typeof pageSize === "string"
                                      ? parseInt(pageSize)
                                      : pageSize)
                                )
                              )}
                              )
                            </>
                          )}
                        </Text>
                        <Select
                          data={["10", "25", "50", "100"]}
                          value={String(pageSize)}
                          onChange={(val) => {
                            setPageSize(val || "25");
                            setPage(1);
                          }}
                          size="xs"
                          allowDeselect={false}
                        />
                      </Group>
                      {totalCount > 0 && (
                        <Pagination
                          total={Math.max(
                            1,
                            Math.ceil(
                              totalCount /
                                (typeof pageSize === "string"
                                  ? parseInt(pageSize)
                                  : pageSize)
                            )
                          )}
                          value={page}
                          onChange={(p) => setPage(p)}
                          size="sm"
                          withEdges
                          siblings={1}
                        />
                      )}
                    </Group>
                  </Stack>
                </Card>
              )}

              {/* Empty State */}
              {!dataStatus?.products?.exists && (
                <Alert
                  color="blue"
                  variant="light"
                  icon={<IconAlertCircle size={16} />}
                >
                  <Text size="sm">
                    <strong>No product data found.</strong> Upload a product
                    file above to get started with AI fitment generation.
                  </Text>
                </Alert>
              )}
            </Stack>
          </Tabs.Panel>

          {/* Configuration Tab */}
          <Tabs.Panel value="configuration" pt="xl">
            <Card withBorder>
              <Stack gap="lg">
                <div>
                  <Text fw={600} size="lg" c="#1e293b" mb="xs">
                    Product Field Configuration
                  </Text>
                  <Text size="sm" c="#64748b" mb="lg">
                    Configure custom fields for your product data to enable
                    advanced fitment matching
                  </Text>
                </div>

                <Alert color="blue" variant="light">
                  <Text size="sm">
                    Product field configuration is managed in the main Settings
                    page. Click the button below to navigate there.
                  </Text>
                </Alert>

                <Center>
                  <Button
                    size="md"
                    leftSection={<IconSettings size={16} />}
                    onClick={handleConfigureProducts}
                  >
                    Go to Product Configuration
                  </Button>
                </Center>
              </Stack>
            </Card>
          </Tabs.Panel>
        </Tabs>
      </Stack>
    </div>
  );
}
