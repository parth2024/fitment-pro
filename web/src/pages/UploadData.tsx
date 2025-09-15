import { useState, useRef, useEffect, useCallback } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Progress,
  Badge,
  ThemeIcon,
  Modal,
  Center,
  Transition,
  Paper,
} from "@mantine/core";
import {
  IconUpload,
  IconFileText,
  IconDatabase,
  IconCheck,
  IconInfoCircle,
  IconCloudUpload,
  IconX,
  IconArrowRight,
  IconSettings,
} from "@tabler/icons-react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { dataUploadService } from "../api/services";
import { useApi, useAsyncOperation } from "../hooks/useApi";

interface UploadedFile {
  id: string;
  name: string;
  type: "vcdb" | "products";
  status: "uploading" | "uploaded" | "error";
  progress: number;
  error?: string;
  uploadedAt?: Date;
}

interface UploadSession {
  id: string;
  name?: string;
  created_at: string;
  vcdb_filename?: string;
  products_filename?: string;
  status: string;
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
  const [dataStatus, setDataStatus] = useState<any>(null);
  const [isReadyForFitment, setIsReadyForFitment] = useState(false);

  // Drag and drop states
  const [isDragOver, setIsDragOver] = useState(false);
  const [dragOverType, setDragOverType] = useState<"vcdb" | "products" | null>(
    null
  );
  const [dragCounter, setDragCounter] = useState(0);

  const { showSuccess, showError, showInfo } = useProfessionalToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const vcdbDropRef = useRef<HTMLDivElement>(null);
  const productsDropRef = useRef<HTMLDivElement>(null);

  // API hooks
  const { data: sessionsData, refetch: refetchSessions } = useApi(
    () => dataUploadService.getSessions(),
    []
  ) as any;

  const { data: newDataStatus, refetch: refetchDataStatus } = useApi(
    () => dataUploadService.getNewDataStatus(),
    []
  ) as any;

  const { execute: uploadFiles } = useAsyncOperation();

  // Navigation helper function
  const navigateToTab = (tabName: string) => {
    window.dispatchEvent(
      new CustomEvent("changeTab", { detail: { tab: tabName } })
    );
  };

  // Convert API sessions data to UploadedFile format
  useEffect(() => {
    if (sessionsData) {
      const files: UploadedFile[] = [];

      sessionsData.forEach((session: UploadSession) => {
        if (session.vcdb_filename) {
          files.push({
            id: `${session.id}-vcdb`,
            name: session.vcdb_filename,
            type: "vcdb",
            status: "uploaded",
            progress: 100,
            uploadedAt: new Date(session.created_at),
          });
        }

        if (session.products_filename) {
          files.push({
            id: `${session.id}-products`,
            name: session.products_filename,
            type: "products",
            status: "uploaded",
            progress: 100,
            uploadedAt: new Date(session.created_at),
          });
        }
      });

      setUploadedFiles(files);
    }
  }, [sessionsData]);

  // Update data status and fitment readiness
  useEffect(() => {
    if (newDataStatus) {
      setDataStatus(newDataStatus);
      setIsReadyForFitment(newDataStatus.ready_for_fitment || false);
    }
  }, [newDataStatus]);

  // Check for existing files from API data
  const checkExistingFiles = () => {
    const sessions = sessionsData?.sessions || [];
    const latestSession = sessions[0]; // Most recent session

    return {
      vcdb: {
        exists: !!latestSession?.vcdb_filename,
        name: latestSession?.vcdb_filename || "",
        uploadedAt: latestSession?.created_at
          ? new Date(latestSession.created_at)
          : null,
      },
      products: {
        exists: !!latestSession?.products_filename,
        name: latestSession?.products_filename || "",
        uploadedAt: latestSession?.created_at
          ? new Date(latestSession.created_at)
          : null,
      },
    };
  };

  const handleFileSelect = (file: File | null, type: "vcdb" | "products") => {
    if (!file) return;

    // Check if file type is correct
    const isVcdbFile =
      file.name.toLowerCase().includes("vcdb") ||
      file.name.toLowerCase().includes("vehicle") ||
      file.type === "text/csv" ||
      file.type === "application/json" ||
      file.type === "application/vnd.ms-excel" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");

    const isProductsFile =
      file.name.toLowerCase().includes("product") ||
      file.name.toLowerCase().includes("part") ||
      file.type === "text/csv" ||
      file.type === "application/json" ||
      file.type === "application/vnd.ms-excel" ||
      file.type ===
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" ||
      file.name.endsWith(".csv") ||
      file.name.endsWith(".json") ||
      file.name.endsWith(".xlsx") ||
      file.name.endsWith(".xls");

    if (type === "vcdb" && !isVcdbFile) {
      showError(
        "Please select a VCDB/Vehicle data file (CSV, XLSX, XLS, or JSON format)"
      );
      return;
    }

    if (type === "products" && !isProductsFile) {
      showError(
        "Please select a Products/Parts data file (CSV, XLSX, XLS, or JSON format)"
      );
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
    if (!vcdbFile && !productsFile) {
      showError(
        "Please select at least one file (VCDB or Products) before uploading"
      );
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

      // Upload files using the API
      const result = await uploadFiles(() =>
        dataUploadService.uploadFiles(
          vcdbFile || undefined,
          productsFile || undefined
        )
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        const uploadedTypes = [];
        if (vcdbFile) uploadedTypes.push("VCDB");
        if (productsFile) uploadedTypes.push("Products");
        showSuccess(
          `${uploadedTypes.join(
            " and "
          )} file(s) uploaded and processed successfully`
        );

        // Refresh the sessions data to get the latest uploads
        await refetchSessions();
        await refetchDataStatus();

        // Clear the file inputs
        setVcdbFile(null);
        setProductsFile(null);

        // Reset file inputs
        if (fileInputRef.current) {
          fileInputRef.current.value = "";
        }
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      showError(
        error.response?.data?.message ||
          error.message ||
          "Failed to upload files"
      );
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback(
    (e: React.DragEvent, type: "vcdb" | "products") => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev + 1);
      setIsDragOver(true);
      setDragOverType(type);
    },
    []
  );

  const handleDragLeave = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setDragCounter((prev) => prev - 1);
      if (dragCounter <= 1) {
        setIsDragOver(false);
        setDragOverType(null);
      }
    },
    [dragCounter]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, type: "vcdb" | "products") => {
      e.preventDefault();
      e.stopPropagation();

      setIsDragOver(false);
      setDragOverType(null);
      setDragCounter(0);

      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) {
        const file = files[0];
        handleFileSelect(file, type);
      }
    },
    []
  );

  console.log("uploadedFiles", uploadedFiles);

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
            radius="lg"
            padding="xl"
            style={{
              backgroundColor: "#ffffff",
              border: "1px solid #e2e8f0",
              boxShadow:
                "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
            }}
          >
            <Stack gap="xl">
              <Center>
                <Stack align="center" gap="sm">
                  <ThemeIcon size="xl" variant="light" color="blue" radius="xl">
                    <IconCloudUpload size={24} />
                  </ThemeIcon>
                  <div style={{ textAlign: "center" }}>
                    <Title order={3} fw={600} c="dark">
                      Upload Data Files
                    </Title>
                    <Text size="sm" c="dimmed" mt="xs">
                      Drag and drop your files or click to browse
                    </Text>
                  </div>
                </Stack>
              </Center>

              <Group gap="xl" align="stretch">
                {/* VCDB File Upload */}
                <Paper
                  ref={vcdbDropRef}
                  onDragEnter={(e) => handleDragEnter(e, "vcdb")}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "vcdb")}
                  style={{
                    flex: 1,
                    minHeight: "200px",
                    border: `2px dashed ${
                      isDragOver && dragOverType === "vcdb"
                        ? "#3b82f6"
                        : vcdbFile
                        ? "#22c55e"
                        : "#cbd5e1"
                    }`,
                    borderRadius: "16px",
                    backgroundColor:
                      isDragOver && dragOverType === "vcdb"
                        ? "#eff6ff"
                        : vcdbFile
                        ? "#f0fdf4"
                        : "#fafafa",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv,.xlsx,.xls,.json";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file, "vcdb");
                    };
                    input.click();
                  }}
                >
                  <Center style={{ height: "100%", padding: "24px" }}>
                    <Stack align="center" gap="md">
                      <Transition
                        mounted={!vcdbFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color={
                                isDragOver && dragOverType === "vcdb"
                                  ? "blue"
                                  : "blue"
                              }
                              radius="xl"
                            >
                              <IconDatabase size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Transition
                        mounted={!!vcdbFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color="green"
                              radius="xl"
                            >
                              <IconCheck size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Stack align="center" gap="xs">
                        <Text fw={600} size="lg" c="dark">
                          VCDB Data
                        </Text>
                        <Text size="sm" c="dimmed" ta="center">
                          {vcdbFile
                            ? vcdbFile.name
                            : "Vehicle configuration data. Supports CSV, XLSX, XLS, and JSON files."}
                        </Text>
                        {vcdbFile && (
                          <Badge color="green" variant="light" size="sm">
                            {formatFileSize(vcdbFile.size)}
                          </Badge>
                        )}
                      </Stack>

                      {isDragOver && dragOverType === "vcdb" && (
                        <Paper
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(59, 130, 246, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "16px",
                          }}
                        >
                          <Stack align="center" gap="sm">
                            <IconUpload size={32} color="#3b82f6" />
                            <Text fw={600} c="blue">
                              Drop file here
                            </Text>
                          </Stack>
                        </Paper>
                      )}
                    </Stack>
                  </Center>
                </Paper>

                {/* Products File Upload */}
                <Paper
                  ref={productsDropRef}
                  onDragEnter={(e) => handleDragEnter(e, "products")}
                  onDragLeave={handleDragLeave}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleDrop(e, "products")}
                  style={{
                    flex: 1,
                    minHeight: "200px",
                    border: `2px dashed ${
                      isDragOver && dragOverType === "products"
                        ? "#10b981"
                        : productsFile
                        ? "#22c55e"
                        : "#cbd5e1"
                    }`,
                    borderRadius: "16px",
                    backgroundColor:
                      isDragOver && dragOverType === "products"
                        ? "#ecfdf5"
                        : productsFile
                        ? "#f0fdf4"
                        : "#fafafa",
                    transition: "all 0.3s ease",
                    cursor: "pointer",
                    position: "relative",
                    overflow: "hidden",
                  }}
                  onClick={() => {
                    const input = document.createElement("input");
                    input.type = "file";
                    input.accept = ".csv,.xlsx,.xls,.json";
                    input.onchange = (e) => {
                      const file = (e.target as HTMLInputElement).files?.[0];
                      if (file) handleFileSelect(file, "products");
                    };
                    input.click();
                  }}
                >
                  <Center style={{ height: "100%", padding: "24px" }}>
                    <Stack align="center" gap="md">
                      <Transition
                        mounted={!productsFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color={
                                isDragOver && dragOverType === "products"
                                  ? "green"
                                  : "green"
                              }
                              radius="xl"
                            >
                              <IconFileText size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Transition
                        mounted={!!productsFile}
                        transition="fade"
                        duration={200}
                      >
                        {(styles) => (
                          <div style={styles}>
                            <ThemeIcon
                              size="xl"
                              variant="light"
                              color="green"
                              radius="xl"
                            >
                              <IconCheck size={28} />
                            </ThemeIcon>
                          </div>
                        )}
                      </Transition>

                      <Stack align="center" gap="xs">
                        <Text fw={600} size="lg" c="dark">
                          Products Data
                        </Text>
                        <Text size="sm" c="dimmed" ta="center">
                          {productsFile
                            ? productsFile.name
                            : "Parts and products data. Supports CSV, XLSX, XLS, and JSON files."}
                        </Text>
                        {productsFile && (
                          <Badge color="green" variant="light" size="sm">
                            {formatFileSize(productsFile.size)}
                          </Badge>
                        )}
                      </Stack>

                      {isDragOver && dragOverType === "products" && (
                        <Paper
                          style={{
                            position: "absolute",
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            backgroundColor: "rgba(16, 185, 129, 0.1)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: "16px",
                          }}
                        >
                          <Stack align="center" gap="sm">
                            <IconUpload size={32} color="#10b981" />
                            <Text fw={600} c="green">
                              Drop file here
                            </Text>
                          </Stack>
                        </Paper>
                      )}
                    </Stack>
                  </Center>
                </Paper>
              </Group>

              {/* Upload Progress */}
              {uploading && (
                <Paper
                  withBorder
                  radius="lg"
                  p="lg"
                  style={{
                    backgroundColor: "#f8fafc",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <Stack gap="md">
                    <Group justify="space-between" align="center">
                      <Group gap="sm">
                        <ThemeIcon size="sm" variant="light" color="blue">
                          <IconUpload size={16} />
                        </ThemeIcon>
                        <Text size="sm" fw={600} c="dark">
                          Uploading files...
                        </Text>
                      </Group>
                      <Badge color="blue" variant="light" size="sm">
                        {uploadProgress}%
                      </Badge>
                    </Group>
                    <Progress
                      value={uploadProgress}
                      size="lg"
                      radius="xl"
                      color="blue"
                      animated
                      style={{
                        backgroundColor: "#e2e8f0",
                      }}
                    />
                  </Stack>
                </Paper>
              )}

              {/* Upload Button */}
              <Center>
                <Button
                  size="xl"
                  leftSection={<IconUpload size={20} />}
                  onClick={handleUpload}
                  loading={uploading}
                  disabled={!vcdbFile && !productsFile}
                  radius="xl"
                  style={{
                    background:
                      !vcdbFile && !productsFile
                        ? "#e2e8f0"
                        : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    color: !vcdbFile && !productsFile ? "#64748b" : "#ffffff",
                    fontWeight: 600,
                    fontSize: "16px",
                    height: "56px",
                    padding: "0 48px",
                    boxShadow:
                      !vcdbFile && !productsFile
                        ? "none"
                        : "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform:
                        !vcdbFile && !productsFile
                          ? "none"
                          : "translateY(-2px)",
                      boxShadow:
                        !vcdbFile && !productsFile
                          ? "none"
                          : "0 8px 25px -5px rgba(59, 130, 246, 0.3)",
                    },
                  }}
                >
                  {uploading
                    ? "Uploading..."
                    : vcdbFile && productsFile
                    ? "Upload Both Files"
                    : vcdbFile
                    ? "Upload VCDB File"
                    : productsFile
                    ? "Upload Products File"
                    : "Upload Files"}
                </Button>
              </Center>
            </Stack>
          </Card>

          {/* Apply Fitment Navigation Card */}
          {isReadyForFitment && (
            <Card
              withBorder
              radius="lg"
              padding="xl"
              style={{
                backgroundColor: "#ffffff",
                border: `1px solid ${
                  isReadyForFitment ? "#22c55e" : "#e2e8f0"
                }`,
                boxShadow:
                  "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
              }}
            >
              <Stack gap="lg">
                <Group justify="space-between">
                  <Text size="xl" fw={700} c="#1e293b">
                    Quick Navigation
                  </Text>
                </Group>
                <Group justify="space-between" align="center">
                  <Group gap="md">
                    <ThemeIcon
                      size="xl"
                      variant="light"
                      color={isReadyForFitment ? "green" : "gray"}
                      radius="xl"
                    >
                      <IconSettings size={24} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} fw={600} c="dark">
                        Apply Fitments
                      </Title>
                      <Text size="sm" c="dimmed" mt="xs">
                        {isReadyForFitment
                          ? "Ready to process fitments with uploaded data"
                          : dataStatus?.vcdb?.exists &&
                            !dataStatus?.products?.exists
                          ? "Upload Product files to enable fitment processing"
                          : !dataStatus?.vcdb?.exists &&
                            dataStatus?.products?.exists
                          ? "Upload VCDB files to enable fitment processing"
                          : "Upload and validate both VCDB and Product files to enable fitment processing"}
                      </Text>
                    </div>
                  </Group>
                  <Button
                    size="lg"
                    rightSection={<IconArrowRight size={20} />}
                    onClick={() => navigateToTab("apply")}
                    disabled={!isReadyForFitment}
                    variant={isReadyForFitment ? "filled" : "light"}
                    color={isReadyForFitment ? "blue" : "gray"}
                    radius="xl"
                    style={{
                      background: isReadyForFitment
                        ? "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)"
                        : "#e2e8f0",
                      color: isReadyForFitment ? "#ffffff" : "#64748b",
                      fontWeight: 600,
                      fontSize: "16px",
                      height: "48px",
                      padding: "0 32px",
                      boxShadow: isReadyForFitment
                        ? "0 4px 6px -1px rgba(59, 130, 246, 0.2)"
                        : "none",
                      transition: "all 0.3s ease",
                      "&:hover": {
                        transform: isReadyForFitment
                          ? "translateY(-2px)"
                          : "none",
                        boxShadow: isReadyForFitment
                          ? "0 8px 25px -5px rgba(59, 130, 246, 0.3)"
                          : "none",
                      },
                    }}
                  >
                    {isReadyForFitment
                      ? "Apply Fitments"
                      : dataStatus?.vcdb?.exists &&
                        !dataStatus?.products?.exists
                      ? "Upload Products"
                      : !dataStatus?.vcdb?.exists &&
                        dataStatus?.products?.exists
                      ? "Upload VCDB"
                      : "Upload Required"}
                  </Button>
                </Group>

                {/* Data Status Indicators */}
                {dataStatus && (
                  <Group gap="lg" align="center">
                    <Group gap="sm">
                      <ThemeIcon
                        size="sm"
                        variant="light"
                        color={dataStatus.vcdb?.exists ? "green" : "gray"}
                        radius="xl"
                      >
                        <IconDatabase size={16} />
                      </ThemeIcon>
                      <Text
                        size="sm"
                        fw={500}
                        c={dataStatus.vcdb?.exists ? "green" : "dimmed"}
                      >
                        VCDB: {dataStatus.vcdb?.record_count || 0} records
                      </Text>
                    </Group>
                    <Group gap="sm">
                      <ThemeIcon
                        size="sm"
                        variant="light"
                        color={dataStatus.products?.exists ? "green" : "gray"}
                        radius="xl"
                      >
                        <IconFileText size={16} />
                      </ThemeIcon>
                      <Text
                        size="sm"
                        fw={500}
                        c={dataStatus.products?.exists ? "green" : "dimmed"}
                      >
                        Products: {dataStatus.products?.record_count || 0}{" "}
                        records
                      </Text>
                    </Group>
                    {isReadyForFitment && (
                      <Badge
                        color="green"
                        variant="light"
                        size="lg"
                        radius="xl"
                      >
                        Ready for Processing
                      </Badge>
                    )}
                  </Group>
                )}
              </Stack>
            </Card>
          )}
        </Stack>
      </Card>

      {/* Replace File Confirmation Modal */}
      <Modal
        opened={showReplaceModal}
        onClose={() => setShowReplaceModal(false)}
        title={
          <Group gap="sm">
            <ThemeIcon size="md" variant="light" color="orange" radius="xl">
              <IconX size={18} />
            </ThemeIcon>
            <Text fw={600} size="lg">
              Replace Existing File
            </Text>
          </Group>
        }
        centered
        size="md"
        radius="lg"
        styles={{
          content: {
            backgroundColor: "#ffffff",
            border: "1px solid #e2e8f0",
            boxShadow:
              "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
          },
        }}
      >
        <Stack gap="lg">
          <Paper
            withBorder
            radius="lg"
            p="lg"
            style={{
              backgroundColor: "#fef3c7",
              border: "1px solid #f59e0b",
            }}
          >
            <Group gap="sm">
              <ThemeIcon size="sm" variant="light" color="orange" radius="xl">
                <IconInfoCircle size={16} />
              </ThemeIcon>
              <div>
                <Text fw={600} size="sm" c="dark">
                  File Already Exists
                </Text>
                <Text size="sm" c="dimmed" mt="xs">
                  A {replaceFileType?.toUpperCase()} file already exists. Do you
                  want to replace it with the new file?
                </Text>
              </div>
            </Group>
          </Paper>

          <Text size="sm" c="dimmed">
            The previous file will be permanently removed and replaced with the
            new upload. This action cannot be undone.
          </Text>

          <Group justify="flex-end" gap="sm">
            <Button
              variant="light"
              onClick={() => setShowReplaceModal(false)}
              radius="xl"
              style={{
                border: "1px solid #e2e8f0",
                backgroundColor: "#f8fafc",
              }}
            >
              Cancel
            </Button>
            <Button
              color="orange"
              onClick={handleReplaceConfirm}
              radius="xl"
              style={{
                backgroundColor: "#f59e0b",
                "&:hover": {
                  backgroundColor: "#d97706",
                },
              }}
            >
              Replace File
            </Button>
          </Group>
        </Stack>
      </Modal>
    </div>
  );
}
