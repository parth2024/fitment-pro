import { useState, useRef } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  FileInput,
  Progress,
  Alert,
  Badge,
  Box,
  ThemeIcon,
  ActionIcon,
  Modal,
} from "@mantine/core";
import {
  IconUpload,
  IconFileText,
  IconDatabase,
  IconCheck,
  IconTrash,
  IconRefresh,
  IconInfoCircle,
  IconCloudUpload,
} from "@tabler/icons-react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { dataUploadService } from "../api/services";

interface UploadedFile {
  id: string;
  name: string;
  size: number;
  type: "vcdb" | "products";
  status: "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
  uploadedAt?: Date;
}

export default function UploadData() {
  const [vcdbFile, setVcdbFile] = useState<File | null>(null);
  const [productsFile, setProductsFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [showReplaceModal, setShowReplaceModal] = useState(false);
  const [replaceFileType, setReplaceFileType] = useState<
    "vcdb" | "products" | null
  >(null);

  const { showSuccess, showError, showInfo } = useProfessionalToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simulate checking for existing files (you'll replace this with actual API call)
  const checkExistingFiles = () => {
    // This would be an API call to check what files are currently uploaded
    return {
      vcdb: { exists: false, name: "", uploadedAt: null },
      products: { exists: false, name: "", uploadedAt: null },
    };
  };

  const handleFileSelect = (file: File | null, type: "vcdb" | "products") => {
    if (!file) return;

    // Check if file type is correct
    const isVcdbFile =
      file.name.toLowerCase().includes("vcdb") ||
      file.name.toLowerCase().includes("vehicle") ||
      file.type === "text/csv" ||
      file.name.endsWith(".csv");

    const isProductsFile =
      file.name.toLowerCase().includes("product") ||
      file.name.toLowerCase().includes("part") ||
      file.type === "text/csv" ||
      file.name.endsWith(".csv");

    if (type === "vcdb" && !isVcdbFile) {
      showError("Please select a VCDB/Vehicle data file (CSV format)");
      return;
    }

    if (type === "products" && !isProductsFile) {
      showError("Please select a Products/Parts data file (CSV format)");
      return;
    }

    // Check if file already exists
    const existingFiles = checkExistingFiles();
    if (
      (type === "vcdb" && existingFiles.vcdb.exists) ||
      (type === "products" && existingFiles.products.exists)
    ) {
      setReplaceFileType(type);
      setShowReplaceModal(true);
      return;
    }

    // Set the file
    if (type === "vcdb") {
      setVcdbFile(file);
    } else {
      setProductsFile(file);
    }
  };

  const handleReplaceConfirm = () => {
    setShowReplaceModal(false);
    setReplaceFileType(null);

    showInfo("Previous file will be replaced with the new upload");
  };

  const handleUpload = async () => {
    if (!vcdbFile || !productsFile) {
      showError("Please select both VCDB and Products files before uploading");
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
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

      await dataUploadService.uploadFiles(vcdbFile, productsFile);

      clearInterval(progressInterval);
      setUploadProgress(100);

      // Add uploaded files to the list
      const newUploadedFiles: UploadedFile[] = [
        {
          id: `vcdb-${Date.now()}`,
          name: vcdbFile.name,
          size: vcdbFile.size,
          type: "vcdb",
          status: "uploaded",
          progress: 100,
          uploadedAt: new Date(),
        },
        {
          id: `products-${Date.now()}`,
          name: productsFile.name,
          size: productsFile.size,
          type: "products",
          status: "uploaded",
          progress: 100,
          uploadedAt: new Date(),
        },
      ];

      setUploadedFiles((prev) => [...prev, ...newUploadedFiles]);

      showSuccess("Files uploaded and processed successfully");

      // Clear the file inputs
      setVcdbFile(null);
      setProductsFile(null);

      // Reset file inputs
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (error: any) {
      showError(error.response?.data?.message || "Failed to upload files");
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handleRemoveFile = (fileId: string) => {
    setUploadedFiles((prev) => prev.filter((file) => file.id !== fileId));
    showInfo("File has been removed from the list");
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileTypeIcon = (type: "vcdb" | "products") => {
    return type === "vcdb" ? IconDatabase : IconFileText;
  };

  const getFileTypeColor = (type: "vcdb" | "products") => {
    return type === "vcdb" ? "blue" : "green";
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="xl">
          {/* Header */}
          <div>
            <Title order={2} style={{ marginBottom: "8px" }}>
              Upload Data Files
            </Title>
            <Text c="dimmed" size="sm">
              Upload VCDB and Products data files for fitment processing
            </Text>
          </div>

          {/* File Upload Section */}
          <Card
            withBorder
            radius="md"
            padding="lg"
            style={{ backgroundColor: "#f8fafc" }}
          >
            <Stack gap="lg">
              <Group align="center" gap="sm">
                <ThemeIcon size="lg" variant="light" color="blue">
                  <IconCloudUpload size={20} />
                </ThemeIcon>
                <div>
                  <Title order={4}>Upload Files</Title>
                  <Text size="sm" c="dimmed">
                    Select VCDB and Products files to upload
                  </Text>
                </div>
              </Group>

              <Group gap="lg" align="flex-start">
                {/* VCDB File Upload */}
                <Box style={{ flex: 1 }}>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon size="sm" variant="light" color="blue">
                        <IconDatabase size={16} />
                      </ThemeIcon>
                      <Text fw={500} size="sm">
                        VCDB File
                      </Text>
                    </Group>
                    <FileInput
                      placeholder="Select VCDB/Vehicle data file"
                      accept=".csv,.xlsx,.xls"
                      value={vcdbFile}
                      onChange={(file) => handleFileSelect(file, "vcdb")}
                      styles={{
                        input: {
                          borderRadius: "10px",
                          border: "2px dashed #cbd5e1",
                          backgroundColor: "#ffffff",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            borderColor: "#3b82f6",
                            backgroundColor: "#f8fafc",
                          },
                        },
                      }}
                    />
                    {vcdbFile && (
                      <Group gap="sm" style={{ marginTop: "8px" }}>
                        <Badge color="blue" variant="light" size="sm">
                          {formatFileSize(vcdbFile.size)}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {vcdbFile.name}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                </Box>

                {/* Products File Upload */}
                <Box style={{ flex: 1 }}>
                  <Stack gap="sm">
                    <Group gap="sm">
                      <ThemeIcon size="sm" variant="light" color="green">
                        <IconFileText size={16} />
                      </ThemeIcon>
                      <Text fw={500} size="sm">
                        Products File
                      </Text>
                    </Group>
                    <FileInput
                      placeholder="Select Products/Parts data file"
                      accept=".csv,.xlsx,.xls"
                      value={productsFile}
                      onChange={(file) => handleFileSelect(file, "products")}
                      styles={{
                        input: {
                          borderRadius: "10px",
                          border: "2px dashed #cbd5e1",
                          backgroundColor: "#ffffff",
                          transition: "all 0.3s ease",
                          "&:hover": {
                            borderColor: "#10b981",
                            backgroundColor: "#f8fafc",
                          },
                        },
                      }}
                    />
                    {productsFile && (
                      <Group gap="sm" style={{ marginTop: "8px" }}>
                        <Badge color="green" variant="light" size="sm">
                          {formatFileSize(productsFile.size)}
                        </Badge>
                        <Text size="xs" c="dimmed">
                          {productsFile.name}
                        </Text>
                      </Group>
                    )}
                  </Stack>
                </Box>
              </Group>

              {/* Upload Progress */}
              {uploading && (
                <Box>
                  <Group justify="space-between" mb="xs">
                    <Text size="sm" fw={500}>
                      Uploading files...
                    </Text>
                    <Text size="sm" c="dimmed">
                      {uploadProgress}%
                    </Text>
                  </Group>
                  <Progress
                    value={uploadProgress}
                    size="lg"
                    radius="md"
                    color="blue"
                    animated
                  />
                </Box>
              )}

              {/* Upload Button */}
              <Group justify="center">
                <Button
                  size="lg"
                  leftSection={<IconUpload size={20} />}
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!vcdbFile || !productsFile}
                  style={{
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    borderRadius: "12px",
                    fontWeight: 600,
                    fontSize: "16px",
                    height: "48px",
                    padding: "0 32px",
                    boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow: "0 8px 25px -5px rgba(59, 130, 246, 0.3)",
                    },
                  }}
                >
                  Upload Files
                </Button>
              </Group>
            </Stack>
          </Card>

          {/* Uploaded Files Section */}
          {uploadedFiles.length > 0 && (
            <Card withBorder radius="md" padding="lg">
              <Stack gap="lg">
                <Group justify="space-between" align="center">
                  <Group gap="sm">
                    <ThemeIcon size="lg" variant="light" color="green">
                      <IconCheck size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={4}>Uploaded Files</Title>
                      <Text size="sm" c="dimmed">
                        Files successfully uploaded and processed
                      </Text>
                    </div>
                  </Group>
                  <Button
                    size="sm"
                    variant="light"
                    leftSection={<IconRefresh size={16} />}
                    onClick={() => setUploadedFiles([])}
                  >
                    Clear All
                  </Button>
                </Group>

                <Stack gap="sm">
                  {uploadedFiles.map((file) => {
                    const FileIcon = getFileTypeIcon(file.type);
                    const fileColor = getFileTypeColor(file.type);

                    return (
                      <Card
                        key={file.id}
                        withBorder
                        radius="md"
                        padding="md"
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Group gap="md">
                            <ThemeIcon
                              size="md"
                              variant="light"
                              color={fileColor}
                            >
                              <FileIcon size={18} />
                            </ThemeIcon>
                            <div>
                              <Text fw={500} size="sm">
                                {file.name}
                              </Text>
                              <Group gap="sm" mt="xs">
                                <Badge
                                  color={fileColor}
                                  variant="light"
                                  size="xs"
                                >
                                  {file.type.toUpperCase()}
                                </Badge>
                                <Badge color="gray" variant="light" size="xs">
                                  {formatFileSize(file.size)}
                                </Badge>
                                <Badge color="green" variant="light" size="xs">
                                  Uploaded
                                </Badge>
                              </Group>
                            </div>
                          </Group>
                          <Group gap="sm">
                            <Text size="xs" c="dimmed">
                              {file.uploadedAt?.toLocaleString()}
                            </Text>
                            <ActionIcon
                              size="sm"
                              variant="light"
                              color="red"
                              onClick={() => handleRemoveFile(file.id)}
                            >
                              <IconTrash size={14} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Card>
                    );
                  })}
                </Stack>
              </Stack>
            </Card>
          )}

          {/* Information Section */}
          <Alert
            icon={<IconInfoCircle size={16} />}
            title="File Requirements"
            color="blue"
            variant="light"
            radius="md"
          >
            <Stack gap="xs">
              <Text size="sm">
                <strong>VCDB File:</strong> Should contain vehicle configuration
                data with columns for year, make, model, etc.
              </Text>
              <Text size="sm">
                <strong>Products File:</strong> Should contain product/parts
                data with part IDs, descriptions, and specifications.
              </Text>
              <Text size="sm">
                <strong>Supported Formats:</strong> CSV, XLSX, XLS files are
                supported.
              </Text>
            </Stack>
          </Alert>
        </Stack>
      </Card>

      {/* Replace File Confirmation Modal */}
      <Modal
        opened={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        title="Replace Existing File"
        centered
        size="md"
      >
        <Stack gap="md">
          <Text>
            A {replaceFileType?.toUpperCase()} file already exists. Do you want
            to replace it with the new file?
          </Text>
          <Text size="sm" c="dimmed">
            The previous file will be permanently removed and replaced with the
            new upload.
          </Text>
          <Group justify="flex-end" gap="sm">
            <Button variant="light" onClick={() => setShowReplaceModal(false)}>
              Cancel
            </Button>
            <Button color="orange" onClick={handleReplaceConfirm}>
              Replace File
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
