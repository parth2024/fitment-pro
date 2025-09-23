import { useState, useRef } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Alert,
  Progress,
  Table,
  Badge,
  Divider,
  Center,
  rem,
  Stepper,
  Grid,
} from "@mantine/core";
import {
  IconUpload,
  IconCheck,
  IconX,
  IconAlertTriangle,
  IconCloudUpload,
  IconFileSpreadsheet,
  IconDownload,
  IconArrowRight,
  IconRefresh,
} from "@tabler/icons-react";
import { fitmentsService } from "../api/services";
import { notifications } from "@mantine/notifications";

interface ValidationResult {
  session_id: string;
  repairedRows: Record<string, Record<string, string>>;
  invalidRows: Record<string, Record<string, string>>;
  ignoredColumns: string[];
  totalRows: number;
  validRows: number;
  invalidRowsCount: number;
}

interface SubmissionResult {
  success: boolean;
  created_count: number;
  skipped_count: number;
  total_rows: number;
  errors: string[];
  message: string;
}

export default function BulkUpload() {
  const [currentStep, setCurrentStep] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [validating, setValidating] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [submissionResult, setSubmissionResult] =
    useState<SubmissionResult | null>(null);
  const [sessionId, setSessionId] = useState<string>("");
  const [uploadProgress, setUploadProgress] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const steps = [
    { label: "Upload CSV", description: "Select and upload your fitment data" },
    { label: "Validate Data", description: "Process and validate your data" },
    {
      label: "Review & Submit",
      description: "Review results and import fitments",
    },
    { label: "Complete", description: "Upload finished successfully" },
  ];

  const handleFileSelect = (selectedFile: File) => {
    if (!selectedFile) return;

    // Check file size (10MB = 10 * 1024 * 1024 bytes)
    const maxSize = 10 * 1024 * 1024;
    if (selectedFile.size > maxSize) {
      notifications.show({
        title: "File Too Large",
        message:
          "File size must be 10MB or less. Your file is " +
          (selectedFile.size > 1024 * 1024
            ? `${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
            : `${(selectedFile.size / 1024).toFixed(2)} KB`),
        color: "red",
      });
      return;
    }

    const name = selectedFile.name.toLowerCase();
    const ok =
      name.endsWith(".csv") || name.endsWith(".tsv") || name.endsWith(".xlsx");
    if (!ok) {
      notifications.show({
        title: "Invalid File Type",
        message: "Please select a .csv, .tsv, or .xlsx file",
        color: "red",
      });
      return;
    }
    setFile(selectedFile);
    setValidation(null);
    setSubmissionResult(null);
    // Don't automatically move to next step - let user click "Next Step"
  };

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault();
    const droppedFile = event.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault();
  };

  const validateFile = async () => {
    if (!file) return;

    try {
      setValidating(true);
      setUploadProgress(0);

      // Simulate progress
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await fitmentsService.validateFitmentsCSV(file);
      const result = response.data;

      clearInterval(progressInterval);
      setUploadProgress(100);

      setValidation(result);
      setSessionId(result.session_id);
      setCurrentStep(2);

      notifications.show({
        title: "Validation Complete",
        message: `Found ${result.validRows} valid rows and ${result.invalidRowsCount} invalid rows`,
        color: result.invalidRowsCount === 0 ? "green" : "yellow",
      });
    } catch (error: any) {
      notifications.show({
        title: "Validation Failed",
        message:
          error.response?.data?.error || error.message || "Validation failed",
        color: "red",
      });
    } finally {
      setValidating(false);
      setUploadProgress(0);
    }
  };

  const submitFitments = async () => {
    if (!sessionId) return;

    try {
      setSubmitting(true);
      const response = await fitmentsService.submitValidatedFitments(sessionId);
      const result = response.data;

      setSubmissionResult(result);
      setCurrentStep(3);

      notifications.show({
        title: "Upload Complete",
        message: result.message,
        color: "green",
      });
    } catch (error: any) {
      notifications.show({
        title: "Submission Failed",
        message:
          error.response?.data?.error || error.message || "Submission failed",
        color: "red",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const downloadTemplate = () => {
    const headers = [
      "PartID",
      "YearID",
      "MakeName",
      "ModelName",
      "SubModelName",
      "DriveTypeName",
      "FuelTypeName",
      "BodyNumDoors",
      "BodyTypeName",
      "PTID",
      "Quantity",
      "FitmentTitle",
      "FitmentDescription",
      "FitmentNotes",
      "Position",
      "LiftHeight",
      "UOM",
      "WheelType",
      "TireDiameter1",
      "WheelDiameter1",
      "BackSpacing1",
      "TireDiameter2",
      "WheelDiameter2",
      "BackSpacing2",
      "TireDiameter3",
      "WheelDiameter3",
      "BackSpacing3",
    ];

    const sampleRow = [
      "12345",
      "2020",
      "Ford",
      "F-150",
      "XLT",
      "4WD",
      "Gas",
      "4",
      "Pickup",
      "PT001",
      "1",
      "Heavy Duty Brake Pads",
      "For towing applications",
      "Professional grade",
      "Front",
      "2 inch",
      "EA",
      "Alloy",
      "33",
      "17",
      "4.5",
      "",
      "",
      "",
      "",
      "",
      "",
    ];

    const csvContent = [headers.join(","), sampleRow.join(",")].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "fitments_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const resetUpload = () => {
    setCurrentStep(0);
    setFile(null);
    setValidation(null);
    setSubmissionResult(null);
    setSessionId("");
    setUploadProgress(0);
    setValidating(false);
    setSubmitting(false);
  };

  return (
    <div style={{ minHeight: "100vh" }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <div>
              <Title order={2}>Bulk Fitments Upload</Title>
              <Text c="dimmed">
                Upload CSV files to import fitments in bulk with validation
              </Text>
            </div>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={downloadTemplate}
              styles={{
                root: {
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  height: "40px",
                  padding: "0 20px",
                  border: "2px solid #e2e8f0",
                  color: "#64748b",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    backgroundColor: "#f8fafc",
                    borderColor: "#cbd5e1",
                    transform: "translateY(-1px)",
                  },
                },
              }}
            >
              Download Template
            </Button>
          </Group>

          <Alert
            icon={<IconAlertTriangle size={16} />}
            title="Important Requirements"
            color="yellow"
            styles={{
              root: {
                borderRadius: "10px",
                border: "1px solid #fbbf24",
              },
            }}
          >
            <Stack gap="xs">
              <Text size="sm" fw={500}>
                File Requirements:
              </Text>
              <Text size="sm">
                • Maximum file size: <strong>10MB</strong>
              </Text>
              <Text size="sm">• Supported formats: CSV, TSV, XLSX</Text>
              <Text size="sm">
                • Required columns:{" "}
                <strong>PartID, YearID, MakeName, ModelName, PTID</strong>
              </Text>
              <Text size="sm">
                • Duplicate fitments will be automatically skipped
              </Text>
            </Stack>
          </Alert>

          {/* Stepper */}
          <Stepper
            active={submissionResult ? steps.length : currentStep}
            onStepClick={setCurrentStep}
            styles={{
              stepIcon: {
                "&[data-progress]": {
                  borderColor: "#3b82f6",
                },
              },
              // Removed invalid 'stepCompleted' style property
            }}
          >
            {steps.map((step, index) => (
              <Stepper.Step
                key={index}
                label={step.label}
                description={step.description}
                allowStepSelect={index <= currentStep}
              >
                {/* Step Content */}
                {index === 0 && (
                  <Stack gap="lg" mt="lg">
                    <Title order={3}>1. Upload CSV File</Title>

                    <div
                      onDrop={handleDrop}
                      onDragOver={handleDragOver}
                      style={{
                        border: "2px dashed #d1d5db",
                        borderRadius: rem(12),
                        padding: rem(40),
                        textAlign: "center",
                        cursor: "pointer",
                        backgroundColor: file ? "#f0f9ff" : "#f9fafb",
                        borderColor: file ? "#3b82f6" : "#d1d5db",
                        transition: "all 0.3s ease",
                      }}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".csv,.tsv,.xlsx"
                        onChange={(e) =>
                          e.target.files?.[0] &&
                          handleFileSelect(e.target.files[0])
                        }
                        style={{ display: "none" }}
                      />

                      <Center>
                        <Stack align="center" gap="sm">
                          {file ? (
                            <>
                              <IconFileSpreadsheet size={48} color="#3b82f6" />
                              <Text fw={500} c="#1e40af">
                                {file.name}
                              </Text>
                              <Text size="sm" c="dimmed">
                                {file.size > 1024 * 1024
                                  ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                                  : `${(file.size / 1024).toFixed(2)} KB`}
                              </Text>
                              <Badge color="green" variant="light" size="sm">
                                ✓ File Ready
                              </Badge>
                            </>
                          ) : (
                            <>
                              <IconCloudUpload size={48} color="#6b7280" />
                              <Text fw={500} c="#374151">
                                Drop your CSV/TSV/XLSX file here or click to
                                browse
                              </Text>
                              <Text size="sm" c="dimmed">
                                Maximum file size: 10MB
                              </Text>
                            </>
                          )}
                        </Stack>
                      </Center>
                    </div>

                    {file && (
                      <Stack gap="md">
                        <Alert icon={<IconCheck size={16} />} color="green">
                          <Text fw={500}>File uploaded successfully!</Text>
                          <Text size="sm">
                            Your file is ready for validation. Click "Next Step"
                            to proceed.
                          </Text>
                        </Alert>

                        <Group justify="center">
                          <Button
                            leftSection={<IconArrowRight size={16} />}
                            onClick={() => setCurrentStep(1)}
                            size="lg"
                            styles={{
                              root: {
                                borderRadius: "10px",
                                fontWeight: 600,
                                fontSize: "16px",
                                height: "48px",
                                padding: "0 32px",
                                background:
                                  "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                                border: "none",
                                transition:
                                  "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                                "&:hover": {
                                  transform: "translateY(-2px)",
                                  boxShadow:
                                    "0 8px 25px -5px rgba(16, 185, 129, 0.3)",
                                },
                              },
                            }}
                          >
                            Next Step
                          </Button>
                        </Group>
                      </Stack>
                    )}
                  </Stack>
                )}

                {index === 1 && file && (
                  <Stack gap="lg" mt="lg">
                    <Title order={3}>2. Validate Data</Title>

                    <Alert icon={<IconAlertTriangle size={16} />} color="blue">
                      <Text fw={500}>Ready to Validate</Text>
                      <Text size="sm">
                        Click the button below to validate your uploaded file:{" "}
                        <strong>{file.name}</strong>
                      </Text>
                    </Alert>

                    <Group justify="center">
                      <Button
                        leftSection={<IconUpload size={16} />}
                        onClick={validateFile}
                        loading={validating}
                        disabled={!file}
                        size="lg"
                        styles={{
                          root: {
                            borderRadius: "10px",
                            fontWeight: 600,
                            fontSize: "16px",
                            height: "48px",
                            padding: "0 32px",
                            background:
                              "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                            border: "none",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            boxShadow: "0 4px 6px -1px rgba(59, 130, 246, 0.2)",
                            "&:hover": {
                              transform: "translateY(-2px)",
                              boxShadow:
                                "0 8px 25px -5px rgba(59, 130, 246, 0.3)",
                            },
                          },
                        }}
                      >
                        {validating ? "Validating..." : "Start Validation"}
                      </Button>
                    </Group>

                    {validating && (
                      <Stack gap="sm">
                        <Text size="sm" fw={500} ta="center">
                          Processing your file...
                        </Text>
                        <Progress
                          value={uploadProgress}
                          animated
                          size="lg"
                          radius="xl"
                        />
                      </Stack>
                    )}
                  </Stack>
                )}

                {index === 2 && validation && !submissionResult && (
                  <Stack gap="lg" mt="lg">
                    <Title order={3}>3. Review Results</Title>

                    {/* Summary Stats */}
                    <Group>
                      <Badge
                        leftSection={<IconCheck size={12} />}
                        color="green"
                        size="lg"
                        styles={{
                          root: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 600,
                          },
                        }}
                      >
                        {validation.validRows} Valid Rows
                      </Badge>
                      <Badge
                        leftSection={<IconX size={12} />}
                        color="red"
                        size="lg"
                        styles={{
                          root: {
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: 600,
                          },
                        }}
                      >
                        {validation.invalidRowsCount} Invalid Rows
                      </Badge>
                      {Object.keys(validation.repairedRows).length > 0 && (
                        <Badge
                          leftSection={<IconAlertTriangle size={12} />}
                          color="yellow"
                          size="lg"
                          styles={{
                            root: {
                              borderRadius: "8px",
                              fontSize: "14px",
                              fontWeight: 600,
                            },
                          }}
                        >
                          {Object.keys(validation.repairedRows).length}{" "}
                          Auto-repaired
                        </Badge>
                      )}
                    </Group>

                    <Divider />

                    {/* Repaired Rows */}
                    {Object.keys(validation.repairedRows).length > 0 && (
                      <div>
                        <Title order={4} c="orange" mb="sm">
                          Auto-repaired Rows
                        </Title>
                        <Table striped>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Row</Table.Th>
                              <Table.Th>Column</Table.Th>
                              <Table.Th>Original Value</Table.Th>
                              <Table.Th>Corrected Value</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {Object.entries(validation.repairedRows).map(
                              ([rowIndex, fixes]: [string, any]) =>
                                Object.entries(fixes).map(([column, value]) => (
                                  <Table.Tr key={`${rowIndex}-${column}`}>
                                    <Table.Td>{rowIndex}</Table.Td>
                                    <Table.Td>{column}</Table.Td>
                                    <Table.Td>
                                      <Text size="sm" c="dimmed">
                                        {validation.invalidRows[rowIndex]?.[
                                          column
                                        ] || "N/A"}
                                      </Text>
                                    </Table.Td>
                                    <Table.Td>
                                      <Badge variant="light" color="green">
                                        {value as string}
                                      </Badge>
                                    </Table.Td>
                                  </Table.Tr>
                                ))
                            )}
                          </Table.Tbody>
                        </Table>
                      </div>
                    )}

                    {/* Invalid Rows */}
                    {Object.keys(validation.invalidRows).length > 0 && (
                      <div>
                        <Title order={4} c="red" mb="sm">
                          Invalid Rows (Require Attention)
                        </Title>
                        <Table striped>
                          <Table.Thead>
                            <Table.Tr>
                              <Table.Th>Row</Table.Th>
                              <Table.Th>Column</Table.Th>
                              <Table.Th>Error</Table.Th>
                            </Table.Tr>
                          </Table.Thead>
                          <Table.Tbody>
                            {Object.entries(validation.invalidRows).map(
                              ([rowIndex, errors]: [string, any]) =>
                                Object.entries(errors).map(
                                  ([column, error]) => (
                                    <Table.Tr key={`${rowIndex}-${column}`}>
                                      <Table.Td>{rowIndex}</Table.Td>
                                      <Table.Td>{column}</Table.Td>
                                      <Table.Td>
                                        <Text c="red" size="sm">
                                          {error as string}
                                        </Text>
                                      </Table.Td>
                                    </Table.Tr>
                                  )
                                )
                            )}
                          </Table.Tbody>
                        </Table>
                      </div>
                    )}

                    {/* Ignored Columns */}
                    {validation.ignoredColumns &&
                      validation.ignoredColumns.length > 0 && (
                        <Alert
                          icon={<IconAlertTriangle size={16} />}
                          color="yellow"
                        >
                          <Text fw={500}>Ignored Columns:</Text>
                          <Text size="sm">
                            {validation.ignoredColumns.join(", ")}
                          </Text>
                        </Alert>
                      )}

                    <Group justify="center" mt="lg">
                      <Button
                        leftSection={<IconCheck size={16} />}
                        onClick={submitFitments}
                        loading={submitting}
                        disabled={validation.validRows === 0}
                        size="lg"
                        styles={{
                          root: {
                            borderRadius: "10px",
                            fontWeight: 600,
                            fontSize: "16px",
                            height: "48px",
                            padding: "0 32px",
                            background:
                              validation.validRows > 0
                                ? "linear-gradient(135deg, #10b981 0%, #059669 100%)"
                                : "#9ca3af",
                            border: "none",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              transform:
                                validation.validRows > 0
                                  ? "translateY(-2px)"
                                  : "none",
                            },
                          },
                        }}
                      >
                        Import {validation.validRows} Fitments
                      </Button>
                    </Group>
                  </Stack>
                )}

                {index === 3 && submissionResult && (
                  <Stack gap="lg" mt="lg">
                    <Title order={3}>4. Upload Complete!</Title>

                    <Alert icon={<IconCheck size={16} />} color="green">
                      <Text fw={500} size="lg">
                        ✅ Success!
                      </Text>
                      <Text size="sm">{submissionResult.message}</Text>
                    </Alert>

                    <Grid>
                      <Grid.Col span={4}>
                        <Card withBorder p="md" radius="md">
                          <Text fw={600} size="lg" c="green">
                            {submissionResult.created_count}
                          </Text>
                          <Text size="sm" c="dimmed">
                            Fitments Created
                          </Text>
                        </Card>
                      </Grid.Col>
                      {submissionResult.skipped_count > 0 && (
                        <Grid.Col span={4}>
                          <Card withBorder p="md" radius="md">
                            <Text fw={600} size="lg" c="orange">
                              {submissionResult.skipped_count}
                            </Text>
                            <Text size="sm" c="dimmed">
                              Duplicates Skipped
                            </Text>
                          </Card>
                        </Grid.Col>
                      )}
                      <Grid.Col
                        span={submissionResult.skipped_count > 0 ? 4 : 8}
                      >
                        <Card withBorder p="md" radius="md">
                          <Text fw={600} size="lg">
                            {submissionResult.total_rows}
                          </Text>
                          <Text size="sm" c="dimmed">
                            Total Processed
                          </Text>
                        </Card>
                      </Grid.Col>
                    </Grid>

                    {submissionResult.errors &&
                      submissionResult.errors.length > 0 && (
                        <Alert
                          icon={<IconAlertTriangle size={16} />}
                          color="yellow"
                        >
                          <Text fw={500}>Some rows had errors:</Text>
                          <ul>
                            {submissionResult.errors.map((error, index) => (
                              <li key={index}>{error}</li>
                            ))}
                          </ul>
                        </Alert>
                      )}

                    <Group justify="center">
                      <Button
                        leftSection={<IconRefresh size={16} />}
                        onClick={resetUpload}
                        variant="light"
                        styles={{
                          root: {
                            borderRadius: "10px",
                            fontWeight: 600,
                            fontSize: "16px",
                            height: "48px",
                            padding: "0 32px",
                            border: "2px solid #e2e8f0",
                            color: "#64748b",
                            transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                            "&:hover": {
                              backgroundColor: "#f8fafc",
                              borderColor: "#cbd5e1",
                              transform: "translateY(-1px)",
                            },
                          },
                        }}
                      >
                        Upload Another File
                      </Button>
                    </Group>
                  </Stack>
                )}
              </Stepper.Step>
            ))}
          </Stepper>
        </Stack>
      </Card>
    </div>
  );
}
