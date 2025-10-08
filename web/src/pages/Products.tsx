import { useState, useEffect } from "react";
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

  // API hooks
  const { data: productsResponse, refetch: refetchProducts } = useApi(
    () => dataUploadService.getProductData(),
    []
  ) as any;

  const { data: dataStatus, refetch: refetchDataStatus } = useApi(
    () => dataUploadService.getDataStatus(),
    []
  ) as any;

  // Extract products array
  const productsData = productsResponse?.data || [];

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

  // Filter products
  const filteredProducts = Array.isArray(productsData)
    ? productsData.filter((product: any) => {
        if (!searchQuery) return true;
        const query = searchQuery.toLowerCase();
        return (
          product.part_id?.toLowerCase().includes(query) ||
          product.description?.toLowerCase().includes(query) ||
          product.category?.toLowerCase().includes(query)
        );
      })
    : [];

  return (
    <div style={{ minHeight: "100vh" }}>
      <Stack gap="xl">
        {/* Header */}
        <div>
          <Title order={2} c="#1e293b" fw={600} mb="xs">
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

              {/* Upload Section */}
              <Card withBorder>
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
                        const file = (e.target as HTMLInputElement).files?.[0];
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

              {/* Products List */}
              {dataStatus?.products?.exists && (
                <Card withBorder>
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Text fw={600} size="lg" c="#1e293b">
                        Product Catalog ({filteredProducts.length} products)
                      </Text>
                      <TextInput
                        placeholder="Search by ID, description, or category..."
                        leftSection={<IconSearch size={16} />}
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.currentTarget.value)}
                        style={{ width: "300px" }}
                      />
                    </Group>

                    <ScrollArea h={500}>
                      <Table striped highlightOnHover>
                        <Table.Thead>
                          <Table.Tr>
                            <Table.Th>Part ID</Table.Th>
                            <Table.Th>Description</Table.Th>
                            <Table.Th>Category</Table.Th>
                            <Table.Th>Part Type</Table.Th>
                            <Table.Th>Brand</Table.Th>
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
