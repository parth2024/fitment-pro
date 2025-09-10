import { useState, useRef, useEffect, useCallback } from "react";
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
  Center,
  Transition,
  Paper,
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
  IconFile,
  IconX,
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
  const {
    data: sessionsData,
    loading: sessionsLoading,
    refetch: refetchSessions,
  } = useApi(() => dataUploadService.getSessions(), []) as any;
  const { execute: uploadFiles } = useAsyncOperation();
  const { execute: deleteSession } = useAsyncOperation();

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

      // Upload files using the API
      const result = await uploadFiles(() =>
        dataUploadService.uploadFiles(vcdbFile, productsFile)
      );

      clearInterval(progressInterval);
      setUploadProgress(100);

      if (result) {
        showSuccess("Files uploaded and processed successfully");

        // Refresh the sessions data to get the latest uploads
        await refetchSessions();

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

  const handleRemoveFile = async (fileId: string) => {
    try {
      // Extract session ID from file ID (format: sessionId-type)
      const sessionId = fileId.split("-")[0];

      // Delete the session from the API
      await deleteSession(() => dataUploadService.deleteSession(sessionId));

      // Refresh the sessions data
      await refetchSessions();

      showSuccess("File has been removed successfully");
    } catch (error: any) {
      console.error("Delete error:", error);
      showError("Failed to remove file");
    }
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

  const validateFileType = (file: File, type: "vcdb" | "products") => {
    const validExtensions = [".csv", ".xlsx", ".xls", ".json"];
    const fileExtension = file.name
      .toLowerCase()
      .substring(file.name.lastIndexOf("."));

    if (!validExtensions.includes(fileExtension)) {
      return false;
    }

    // Additional validation based on file type
    if (type === "vcdb") {
      return (
        file.name.toLowerCase().includes("vcdb") ||
        file.name.toLowerCase().includes("vehicle") ||
        validExtensions.includes(fileExtension)
      );
    } else {
      return (
        file.name.toLowerCase().includes("product") ||
        file.name.toLowerCase().includes("part") ||
        validExtensions.includes(fileExtension)
      );
    }
  };

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
                  disabled={!vcdbFile || !productsFile}
                  radius="xl"
                  style={{
                    background:
                      !vcdbFile || !productsFile
                        ? "#e2e8f0"
                        : "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    color: !vcdbFile || !productsFile ? "#64748b" : "#ffffff",
                    fontWeight: 600,
                    fontSize: "16px",
                    height: "56px",
                    padding: "0 48px",
                    boxShadow:
                      !vcdbFile || !productsFile
                        ? "none"
                        : "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                    transition: "all 0.3s ease",
                    "&:hover": {
                      transform:
                        !vcdbFile || !productsFile
                          ? "none"
                          : "translateY(-2px)",
                      boxShadow:
                        !vcdbFile || !productsFile
                          ? "none"
                          : "0 8px 25px -5px rgba(59, 130, 246, 0.3)",
                    },
                  }}
                >
                  {uploading ? "Uploading..." : "Upload Files"}
                </Button>
              </Center>
            </Stack>
          </Card>

          {/* Uploaded Files Section */}
          {sessionsLoading ? (
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
              <Center style={{ minHeight: "200px" }}>
                <Stack align="center" gap="md">
                  <ThemeIcon size="xl" variant="light" color="gray" radius="xl">
                    <IconRefresh size={24} />
                  </ThemeIcon>
                  <Text size="sm" c="dimmed" fw={500}>
                    Loading uploaded files...
                  </Text>
                </Stack>
              </Center>
            </Card>
          ) : uploadedFiles.length > 0 || sessionsData?.sessions?.length > 0 ? (
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
                <Group justify="space-between" align="center">
                  <Group gap="md">
                    <ThemeIcon
                      size="lg"
                      variant="light"
                      color="green"
                      radius="xl"
                    >
                      <IconCheck size={20} />
                    </ThemeIcon>
                    <div>
                      <Title order={3} fw={600} c="dark">
                        Uploaded Files
                      </Title>
                      <Text size="sm" c="dimmed" mt="xs">
                        {sessionsData?.length || 0} session(s) with files
                        successfully uploaded and processed
                      </Text>
                    </div>
                  </Group>
                  <Group gap="sm">
                    <Button
                      size="sm"
                      variant="light"
                      leftSection={<IconRefresh size={16} />}
                      onClick={async () => {
                        await refetchSessions();
                        showInfo("Files list refreshed");
                      }}
                      loading={sessionsLoading}
                      radius="xl"
                      style={{
                        border: "1px solid #e2e8f0",
                        backgroundColor: "#f8fafc",
                      }}
                    >
                      Refresh
                    </Button>
                    <Button
                      size="sm"
                      variant="light"
                      color="red"
                      leftSection={<IconTrash size={16} />}
                      onClick={async () => {
                        try {
                          // Delete all sessions
                          const sessions = sessionsData?.sessions || [];
                          for (const session of sessions) {
                            await deleteSession(() =>
                              dataUploadService.deleteSession(session.id)
                            );
                          }

                          // Refresh the sessions data
                          await refetchSessions();

                          showSuccess(
                            "All files have been removed successfully"
                          );
                        } catch (error: any) {
                          console.error("Clear all error:", error);
                          showError("Failed to remove all files");
                        }
                      }}
                      loading={sessionsLoading}
                      radius="xl"
                      style={{
                        border: "1px solid #fecaca",
                        backgroundColor: "#fef2f2",
                      }}
                    >
                      Clear All
                    </Button>
                  </Group>
                </Group>

                <Stack gap="md">
                  {uploadedFiles.map((file) => {
                    const FileIcon = getFileTypeIcon(file.type);
                    const fileColor = getFileTypeColor(file.type);

                    return (
                      <Paper
                        key={file.id}
                        withBorder
                        radius="lg"
                        p="lg"
                        style={{
                          backgroundColor: "#ffffff",
                          border: "1px solid #e2e8f0",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            borderColor: "#cbd5e1",
                            boxShadow: "0 2px 4px -1px rgba(0, 0, 0, 0.1)",
                          },
                        }}
                      >
                        <Group justify="space-between" align="center">
                          <Group gap="lg">
                            <ThemeIcon
                              size="lg"
                              variant="light"
                              color={fileColor}
                              radius="xl"
                            >
                              <FileIcon size={20} />
                            </ThemeIcon>
                            <div>
                              <Text fw={600} size="md" c="dark">
                                {file.name}
                              </Text>
                              <Group gap="sm" mt="xs">
                                <Badge
                                  color={fileColor}
                                  variant="light"
                                  size="sm"
                                  radius="xl"
                                >
                                  {file.type.toUpperCase()}
                                </Badge>
                                <Badge
                                  color="green"
                                  variant="light"
                                  size="sm"
                                  radius="xl"
                                >
                                  Uploaded
                                </Badge>
                              </Group>
                            </div>
                          </Group>
                          <Group gap="md" align="center">
                            <Text size="sm" c="dimmed" fw={500}>
                              {file.uploadedAt?.toLocaleString()}
                            </Text>
                            <ActionIcon
                              size="md"
                              variant="light"
                              color="red"
                              onClick={() => handleRemoveFile(file.id)}
                              radius="xl"
                              style={{
                                border: "1px solid #fecaca",
                                backgroundColor: "#fef2f2",
                              }}
                            >
                              <IconTrash size={16} />
                            </ActionIcon>
                          </Group>
                        </Group>
                      </Paper>
                    );
                  })}
                </Stack>
              </Stack>
            </Card>
          ) : (
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
              <Center style={{ minHeight: "200px" }}>
                <Stack align="center" gap="lg">
                  <ThemeIcon size="xl" variant="light" color="gray" radius="xl">
                    <IconDatabase size={32} />
                  </ThemeIcon>
                  <div style={{ textAlign: "center" }}>
                    <Text size="lg" fw={600} c="dark">
                      No uploaded files yet
                    </Text>
                    <Text size="sm" c="dimmed" mt="xs">
                      Upload VCDB and Products files to get started
                    </Text>
                  </div>
                </Stack>
              </Center>
            </Card>
          )}

          {/* Information Section */}
          <Paper
            withBorder
            p="xl"
            style={{ borderRadius: "0px", border: "none" }}
          >
            <Stack gap="lg">
              <Group gap="md">
                <ThemeIcon size="lg" variant="light" color="blue" radius="xl">
                  <IconInfoCircle size={20} />
                </ThemeIcon>
                <div>
                  <Title order={4} fw={600} c="dark">
                    File Requirements
                  </Title>
                  <Text size="sm" c="dimmed" mt="xs">
                    Understanding the data format requirements
                  </Text>
                </div>
              </Group>

              <Stack gap="md">
                <Paper p="lg">
                  <Group gap="md">
                    <ThemeIcon
                      size="md"
                      variant="light"
                      color="blue"
                      radius="xl"
                    >
                      <IconDatabase size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm" c="dark">
                        VCDB File
                      </Text>
                      <Text size="sm" c="dimmed" mt="xs">
                        Should contain vehicle configuration data with columns
                        for year, make, model, submodel, drive type, etc.
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper radius="lg" p="lg">
                  <Group gap="md">
                    <ThemeIcon
                      size="md"
                      variant="light"
                      color="green"
                      radius="xl"
                    >
                      <IconFileText size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm" c="dark">
                        Products File
                      </Text>
                      <Text size="sm" c="dimmed" mt="xs">
                        Should contain product/parts data with part IDs,
                        descriptions, specifications, and compatibility
                        information.
                      </Text>
                    </div>
                  </Group>
                </Paper>

                <Paper p="lg">
                  <Group gap="md">
                    <ThemeIcon
                      size="md"
                      variant="light"
                      color="orange"
                      radius="xl"
                    >
                      <IconFile size={18} />
                    </ThemeIcon>
                    <div>
                      <Text fw={600} size="sm" c="dark">
                        Supported Formats
                      </Text>
                      <Text size="sm" c="dimmed" mt="xs">
                        CSV, XLSX, XLS, and JSON files are supported. Maximum
                        file size is 50MB per file.
                      </Text>
                    </div>
                  </Group>
                </Paper>
              </Stack>
            </Stack>
          </Paper>
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
