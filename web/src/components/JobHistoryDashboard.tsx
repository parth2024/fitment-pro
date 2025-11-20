import { useState, useEffect, useMemo } from "react";
import {
  Card,
  Title,
  Text,
  Table,
  Badge,
  Group,
  Stack,
  Button,
  ActionIcon,
  Tooltip,
  Loader,
  Center,
  Pagination,
  Select,
  TextInput,
  Modal,
  ScrollArea,
  Tabs,
  Checkbox,
  Alert,
  Collapse,
  Paper,
} from "@mantine/core";
import {
  IconHistory,
  IconCheck,
  IconX,
  IconClock,
  IconArrowRight,
  IconSearch,
  IconFileSpreadsheet,
  IconEye,
  IconInfoCircle,
  IconBrain,
  IconFileText,
  IconAlertCircle,
  IconChevronDown,
  IconChevronUp,
  IconSparkles,
} from "@tabler/icons-react";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../api/client";
import { fitmentRulesService } from "../api/services";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

const JOB_STATUS_LABELS: Record<string, string> = {
  pending: "Pending Review",
  queued: "Queued",
  processing: "Processing",
  completed: "Completed",
  failed: "Failed",
  published: "Published",
};

const JOB_STATUS_ORDER = [
  "pending",
  "queued",
  "processing",
  "completed",
  "failed",
  "published",
] as const;

interface Job {
  id: string;
  job_type: string;
  status: string;
  created_at: string;
  finished_at?: string;
  upload?: {
    id: string;
    filename: string;
    preflight_report?: {
      dataType?: string;
    };
  };
  result?: {
    createdCount?: number;
    errorCount?: number;
    totalRows?: number;
    validRows?: number;
    approvedCount?: number;
    rejectedCount?: number;
    errors?: any[];
  };
}

export default function JobHistoryDashboard() {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [reviewData, setReviewData] = useState<any>(null);
  const [loadingReviewData, setLoadingReviewData] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set());
  const [approving, setApproving] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const [removedRowIds, setRemovedRowIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const location = useLocation();
  const { showSuccess, showError } = useProfessionalToast();

  const fetchJobs = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      params.append("page", page.toString());
      if (statusFilter) params.append("status", statusFilter);
      if (typeFilter) params.append("job_type", typeFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await apiClient.get(
        `/api/workflow/jobs?${params.toString()}`
      );
      setJobs(response.data.items || []);
      setTotalPages(response.data.totalPages || 1);
    } catch (error) {
      console.error("Failed to fetch jobs:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchJobs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, statusFilter, typeFilter, searchQuery]);

  // Refresh when navigating to Analytics with scrollToJobs parameter
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    if (urlParams.get("scrollToJobs") === "true") {
      // Refresh jobs when coming from publish for review
      setTimeout(() => {
        fetchJobs();
      }, 300);
    }
  }, [location.search]);

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "published":
        return "green";
      case "failed":
      case "error":
        return "red";
      case "in_progress":
      case "processing":
      case "ai-mapping":
      case "transforming":
      case "validating":
        return "blue";
      case "queued":
        return "yellow";
      case "pending":
        return "orange";
      default:
        return "gray";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
      case "published":
        return <IconCheck size={16} />;
      case "failed":
      case "error":
        return <IconX size={16} />;
      case "in_progress":
      case "processing":
        return <Loader size={16} />;
      default:
        return <IconClock size={16} />;
    }
  };

  const getJobTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      "ai-map": "AI Mapping",
      transform: "Transform",
      "vcdb-validate": "Validation",
      publish: "Publish",
      "data-upload": "Data Upload",
      upload: "Upload",
    };
    return labels[type] || type;
  };

  const scrollToTopAfterNavigation = () => {
    requestAnimationFrame(() => {
      window.scrollTo({ top: 0, behavior: "auto" });
    });
  };

  const handleJobClick = (job: Job) => {
    const dataType = job.upload?.preflight_report?.dataType || "fitments";
    if (dataType === "fitments") {
      navigate("/fitments");
      scrollToTopAfterNavigation();
    } else if (dataType === "products") {
      navigate("/products");
      scrollToTopAfterNavigation();
    }
  };

  const handleReviewClick = async (job: Job) => {
    // Check if job has validation errors
    if (
      (job.result?.errorCount && job.result.errorCount > 0) ||
      (job.result?.errors && job.result.errors.length > 0)
    ) {
      showError(
        "Cannot review: This job has validation errors. Please fix the errors before reviewing."
      );
      return;
    }

    setSelectedJob(job);
    setReviewModalOpen(true);
    setLoadingReviewData(true);
    setSelectedRowIds(new Set());
    setRemovedRowIds(new Set());

    try {
      const response = await fitmentRulesService.getJobReviewData(job.id);
      setReviewData(response.data);
    } catch (error: any) {
      showError(error.message || "Failed to load review data");
      setReviewModalOpen(false);
    } finally {
      setLoadingReviewData(false);
    }
  };

  const handleApprove = async () => {
    if (!selectedJob || selectedRowIds.size === 0) {
      showError("Please select at least one row to approve");
      return;
    }

    setApproving(true);
    try {
      const response = await fitmentRulesService.approveJobRows(
        selectedJob.id,
        Array.from(selectedRowIds)
      );
      showSuccess(
        `Successfully approved ${response.data.approvedCount} rows. Status changed to Published.`
      );
      setReviewModalOpen(false);
      setSelectedJob(null);
      setReviewData(null);
      setSelectedRowIds(new Set());
      fetchJobs(); // Refresh job list
    } catch (error: any) {
      showError(error.message || "Failed to approve rows");
    } finally {
      setApproving(false);
    }
  };

  const toggleRowSelection = (rowId: string) => {
    const newSet = new Set(selectedRowIds);
    if (newSet.has(rowId)) {
      newSet.delete(rowId);
    } else {
      newSet.add(rowId);
    }
    setSelectedRowIds(newSet);
  };

  const toggleRowExpansion = (rowId: string) => {
    const newSet = new Set(expandedRows);
    if (newSet.has(rowId)) {
      newSet.delete(rowId);
    } else {
      newSet.add(rowId);
    }
    setExpandedRows(newSet);
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  const formatStatusLabel = (status: string) => {
    if (!status) return "Unknown";
    const normalized = status.toLowerCase();
    if (JOB_STATUS_LABELS[normalized]) {
      return JOB_STATUS_LABELS[normalized];
    }
    return status
      .replace(/_/g, " ")
      .replace(/\w+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
  };

  // Truncate AI reasoning based on confidence score (100-150 words)
  const truncateAIReasoning = (text: string, confidence: number) => {
    if (!text) return "";

    // Determine word limit based on confidence score
    // Higher confidence = more words (up to 150), lower confidence = fewer words (down to 100)
    const minWords = 100;
    const maxWords = 150;
    const wordLimit = Math.round(minWords + (maxWords - minWords) * confidence);

    const words = text.trim().split(/\s+/);

    if (words.length <= wordLimit) {
      return text;
    }

    const truncated = words.slice(0, wordLimit).join(" ");
    return truncated + "...";
  };

  const statusOptions = useMemo(() => {
    const normalizedMap = new Map<string, string>();

    jobs.forEach((job) => {
      if (job.status) {
        const normalized = job.status.toLowerCase();
        if (!normalizedMap.has(normalized)) {
          normalizedMap.set(normalized, job.status);
        }
      }
    });

    const uniqueStatuses = Array.from(normalizedMap.entries())
      .sort((a, b) => {
        const indexA = JOB_STATUS_ORDER.indexOf(
          a[0] as (typeof JOB_STATUS_ORDER)[number]
        );
        const indexB = JOB_STATUS_ORDER.indexOf(
          b[0] as (typeof JOB_STATUS_ORDER)[number]
        );

        if (indexA === -1 && indexB === -1) {
          return a[0].localeCompare(b[0]);
        }
        if (indexA === -1) return 1;
        if (indexB === -1) return -1;
        return indexA - indexB;
      })
      .map(([, original]) => original);

    let statusesToUse: string[] =
      uniqueStatuses.length > 0 ? uniqueStatuses : [...JOB_STATUS_ORDER];

    if (
      statusFilter &&
      !statusesToUse.some(
        (status) => status.toLowerCase() === statusFilter.toLowerCase()
      )
    ) {
      statusesToUse = [...statusesToUse, statusFilter];
    }

    return statusesToUse.map((status) => ({
      value: status,
      label: formatStatusLabel(status),
    }));
  }, [jobs, statusFilter]);

  return (
    <Stack gap="lg" id="job-history-section">
      <Card withBorder padding="lg" radius="md">
        <Group justify="space-between" mb="md">
          <div>
            <Title order={3} mb="xs">
              Job History
            </Title>
            <Text size="sm" c="dimmed">
              Track all data upload and processing jobs
            </Text>
          </div>
          {/* <Button
            leftSection={<IconRefresh size={16} />}
            onClick={fetchJobs}
            variant="light"
          >
            Refresh
          </Button> */}
        </Group>

        {/* Filters */}
        <Group gap="md" mb="md">
          <TextInput
            placeholder="Search by filename..."
            leftSection={<IconSearch size={16} />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ flex: 1 }}
          />
          <Select
            placeholder="Filter by status"
            data={statusOptions}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
            nothingFoundMessage="No statuses available"
            searchable={statusOptions.length > 6}
            styles={{
              input: {
                minWidth: 190,
              },
            }}
          />
          <Select
            placeholder="Filter by type"
            data={[
              { value: "data-upload", label: "Data Upload" },
              { value: "publish", label: "Publish" },
              { value: "transform", label: "Transform" },
              { value: "ai-map", label: "AI Mapping" },
              { value: "vcdb-validate", label: "Validation" },
            ]}
            value={typeFilter}
            onChange={setTypeFilter}
            clearable
          />
        </Group>

        {/* Jobs Table */}
        {loading ? (
          <Center p="xl">
            <Loader size="lg" />
          </Center>
        ) : jobs.length === 0 ? (
          <Center p="xl">
            <Stack align="center" gap="sm">
              <IconHistory size={48} color="gray" />
              <Text c="dimmed">No jobs found</Text>
            </Stack>
          </Center>
        ) : (
          <>
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Job Type</Table.Th>
                  <Table.Th>File</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Created</Table.Th>
                  <Table.Th>Approved</Table.Th>
                  <Table.Th>Rejected</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {jobs.map((job) => (
                  <Table.Tr key={job.id}>
                    <Table.Td>
                      <Badge variant="light" color="blue">
                        {getJobTypeLabel(job.job_type)}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <IconFileSpreadsheet size={16} />
                        <Text size="sm">{job.upload?.filename || "N/A"}</Text>
                      </Group>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={getStatusColor(job.status)}
                        variant="light"
                        leftSection={getStatusIcon(job.status)}
                      >
                        {job.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{formatDate(job.created_at)}</Text>
                    </Table.Td>
                    <Table.Td>
                      {job.result && job.result.approvedCount !== undefined ? (
                        <Badge size="sm" color="green" variant="light">
                          {job.result.approvedCount}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {job.result &&
                      (job.result.rejectedCount !== undefined ||
                        job.result.errorCount !== undefined) ? (
                        <Badge size="sm" color="red" variant="light">
                          {job.result.rejectedCount ??
                            job.result.errorCount ??
                            0}
                        </Badge>
                      ) : (
                        <Text size="xs" c="dimmed">
                          —
                        </Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {job.status === "pending" && (
                          <Tooltip
                            label={
                              (job.result?.errorCount &&
                                job.result.errorCount > 0) ||
                              (job.result?.errors &&
                                job.result.errors.length > 0)
                                ? "Cannot review: Please fix validation errors first"
                                : "Review job"
                            }
                          >
                            <ActionIcon
                              color="blue"
                              variant="light"
                              onClick={() => handleReviewClick(job)}
                              disabled={
                                (job.result?.errorCount &&
                                  job.result.errorCount > 0) ||
                                (job.result?.errors &&
                                  job.result.errors.length > 0)
                              }
                              style={{
                                opacity:
                                  (job.result?.errorCount &&
                                    job.result.errorCount > 0) ||
                                  (job.result?.errors &&
                                    job.result.errors.length > 0)
                                    ? 0.5
                                    : 1,
                                cursor:
                                  (job.result?.errorCount &&
                                    job.result.errorCount > 0) ||
                                  (job.result?.errors &&
                                    job.result.errors.length > 0)
                                    ? "not-allowed"
                                    : "pointer",
                              }}
                            >
                              <IconEye size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                        {job.status === "published" && (
                          <Tooltip label="View results">
                            <ActionIcon
                              color="green"
                              variant="light"
                              onClick={() => handleJobClick(job)}
                            >
                              <IconArrowRight size={16} />
                            </ActionIcon>
                          </Tooltip>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>

            {totalPages > 1 && (
              <Group justify="center" mt="md">
                <Pagination
                  value={page}
                  onChange={setPage}
                  total={totalPages}
                  size="sm"
                  withEdges
                  siblings={1}
                />
                <Text size="sm" c="dimmed" ml="md">
                  Page {page} of {totalPages} ({jobs.length} jobs shown)
                </Text>
              </Group>
            )}
          </>
        )}
      </Card>

      {/* Review Modal */}
      <Modal
        opened={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedJob(null);
          setReviewData(null);
          setSelectedRowIds(new Set());
          setExpandedRows(new Set());
          setRemovedRowIds(new Set());
        }}
        title={
          <Group gap="sm">
            <IconEye size={24} />
            <div>
              <Text fw={600} size="lg">
                Review & Approve Data
              </Text>
              <Text size="xs" c="dimmed">
                Select rows to approve and load to database
              </Text>
            </div>
          </Group>
        }
        size="90%"
        styles={{
          body: {
            padding: 0,
            display: "flex",
            flexDirection: "column",
            height: "85vh",
            maxHeight: "900px",
            minHeight: "600px",
          },
          header: { padding: "20px 24px", borderBottom: "1px solid #e9ecef" },
          content: {
            display: "flex",
            flexDirection: "column",
            overflow: "hidden",
          },
        }}
      >
        {loadingReviewData ? (
          <Center p="xl">
            <Loader size="lg" />
            <Text mt="md">Loading review data...</Text>
          </Center>
        ) : reviewData ? (
          <Stack
            gap="md"
            p="md"
            style={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              overflow: "hidden",
            }}
          >
            {/* Header Info */}
            <Card
              withBorder
              padding="md"
              radius="md"
              style={{ backgroundColor: "#f8f9fa" }}
            >
              <Group justify="space-between" align="flex-start">
                <div style={{ flex: 1 }}>
                  <Group gap="sm" mb="xs">
                    <IconFileText size={20} color="#2563eb" />
                    <Text fw={600} size="lg">
                      {selectedJob?.upload?.filename || "Unknown File"}
                    </Text>
                  </Group>
                  <Group gap="md" mt="xs">
                    <Badge color="blue" variant="light" size="sm">
                      {reviewData.dataType === "fitments"
                        ? "Fitments"
                        : "Products"}
                    </Badge>
                    <Text size="sm" c="dimmed">
                      Total Rows: <strong>{reviewData.totalRows}</strong>
                    </Text>
                    {reviewData.errorRows &&
                      reviewData.errorRows.length > 0 && (
                        <Badge color="red" variant="light" size="sm">
                          {reviewData.errorRows.length} errors
                        </Badge>
                      )}
                  </Group>
                </div>
                <Badge
                  color="blue"
                  size="lg"
                  variant="filled"
                  style={{ minWidth: 120 }}
                >
                  {selectedRowIds.size} Selected
                </Badge>
              </Group>
            </Card>

            {/* Instructions
            <Alert
              icon={<IconInfoCircle size={16} />}
              color="blue"
              variant="light"
              radius="md"
            >
              <Stack gap="xs">
                <Text fw={500} size="sm">
                  How to Review & Approve:
                </Text>
                <Text size="xs" c="dimmed">
                  1. Switch between <strong>Original Rows</strong> and{" "}
                  <strong>AI Generated Rows</strong> tabs to compare data
                </Text>
                <Text size="xs" c="dimmed">
                  2. Select rows you want to approve by checking the boxes or
                  using the approve/reject icons
                </Text>
                <Text size="xs" c="dimmed">
                  3. Click <strong>Approve</strong> to load selected rows to the
                  database
                </Text>
              </Stack>
            </Alert> */}

            <Tabs
              defaultValue="original"
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                overflow: "hidden",
              }}
            >
              <Tabs.List>
                <Tabs.Tab
                  value="original"
                  leftSection={<IconFileText size={16} />}
                >
                  Original Rows (
                  {
                    reviewData.originalRows
                      .slice(0, 100)
                      .filter((row: any, idx: number) => {
                        const rowId =
                          row._normalization_result_id || `original_${idx}`;
                        return !removedRowIds.has(rowId);
                      }).length
                  }
                  )
                </Tabs.Tab>
                <Tabs.Tab value="ai" leftSection={<IconBrain size={16} />}>
                  AI Generated Rows (
                  {
                    reviewData.aiGeneratedRows
                      .slice(0, 100)
                      .filter((row: any, idx: number) => {
                        const rowId =
                          row._normalization_result_id || `ai_${idx}`;
                        return !removedRowIds.has(rowId);
                      }).length
                  }
                  )
                </Tabs.Tab>
              </Tabs.List>

              <Tabs.Panel
                value="original"
                pt="md"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Card withBorder padding="xs" radius="md" mb="sm">
                  <Group gap="xs" p="xs">
                    <IconFileText size={16} color="#6b7280" />
                    <Text size="sm" fw={500}>
                      Original Data from Upload File
                    </Text>
                    <Text size="xs" c="dimmed" ml="auto">
                      Select rows to approve
                    </Text>
                  </Group>
                </Card>
                <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 60 }}>
                          <Checkbox
                            checked={
                              reviewData.originalRows.length > 0 &&
                              reviewData.originalRows
                                .slice(0, 100)
                                .filter((row: any, idx: number) => {
                                  const rowId =
                                    row._normalization_result_id ||
                                    `original_${idx}`;
                                  return !removedRowIds.has(rowId);
                                })
                                .every((row: any, idx: number) => {
                                  const rowId =
                                    row._normalization_result_id ||
                                    `original_${idx}`;
                                  return selectedRowIds.has(rowId);
                                })
                            }
                            onChange={(e) => {
                              if (e.currentTarget.checked) {
                                const newSet = new Set(selectedRowIds);
                                reviewData.originalRows
                                  .slice(0, 100)
                                  .filter((row: any, idx: number) => {
                                    const rowId =
                                      row._normalization_result_id ||
                                      `original_${idx}`;
                                    return !removedRowIds.has(rowId);
                                  })
                                  .forEach((row: any, idx: number) => {
                                    const rowId =
                                      row._normalization_result_id ||
                                      `original_${idx}`;
                                    newSet.add(rowId);
                                  });
                                setSelectedRowIds(newSet);
                              } else {
                                const newSet = new Set(selectedRowIds);
                                reviewData.originalRows
                                  .slice(0, 100)
                                  .forEach((row: any, idx: number) => {
                                    const rowId =
                                      row._normalization_result_id ||
                                      `original_${idx}`;
                                    newSet.delete(rowId);
                                  });
                                setSelectedRowIds(newSet);
                              }
                            }}
                          />
                        </Table.Th>
                        <Table.Th style={{ width: 80 }}>Row #</Table.Th>
                        <Table.Th style={{ width: 80 }}>Status</Table.Th>
                        {reviewData.originalRows[0] &&
                          Object.keys(reviewData.originalRows[0])
                            .filter((key) => !key.startsWith("_"))
                            .slice(0, 8)
                            .map((key) => (
                              <Table.Th key={key}>
                                <Text size="xs" fw={600}>
                                  {key}
                                </Text>
                              </Table.Th>
                            ))}
                        <Table.Th style={{ width: 100 }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {reviewData.originalRows
                        .slice(0, 100)
                        .filter((row: any, idx: number) => {
                          const rowId =
                            row._normalization_result_id || `original_${idx}`;
                          return !removedRowIds.has(rowId);
                        })
                        .map((row: any, idx: number) => {
                          const rowId =
                            row._normalization_result_id || `original_${idx}`;
                          const isSelected = selectedRowIds.has(rowId);
                          return (
                            <Table.Tr key={idx}>
                              <Table.Td>
                                <Checkbox
                                  checked={isSelected}
                                  onChange={() => toggleRowSelection(rowId)}
                                />
                              </Table.Td>
                              <Table.Td>
                                <Text size="sm" fw={500}>
                                  {row._row_index}
                                </Text>
                              </Table.Td>
                              <Table.Td>
                                {row._has_error ? (
                                  <Badge color="red" variant="light" size="sm">
                                    <Group gap={4}>
                                      <IconAlertCircle size={12} />
                                      Error
                                    </Group>
                                  </Badge>
                                ) : (
                                  <Badge
                                    color="green"
                                    variant="light"
                                    size="sm"
                                  >
                                    Valid
                                  </Badge>
                                )}
                              </Table.Td>
                              {Object.keys(row)
                                .filter((key) => !key.startsWith("_"))
                                .slice(0, 10)
                                .map((key) => (
                                  <Table.Td key={key}>
                                    <Text size="sm">
                                      {String(row[key] || "").slice(0, 50)}
                                    </Text>
                                  </Table.Td>
                                ))}
                              <Table.Td>
                                <Group gap="xs">
                                  <Tooltip label="Remove Row">
                                    <ActionIcon
                                      color="red"
                                      variant="light"
                                      size="sm"
                                      onClick={() => {
                                        const newRemovedSet = new Set(
                                          removedRowIds
                                        );
                                        newRemovedSet.add(rowId);
                                        setRemovedRowIds(newRemovedSet);
                                        // Also remove from selection if selected
                                        const newSelectedSet = new Set(
                                          selectedRowIds
                                        );
                                        newSelectedSet.delete(rowId);
                                        setSelectedRowIds(newSelectedSet);
                                      }}
                                    >
                                      <IconX size={14} />
                                    </ActionIcon>
                                  </Tooltip>
                                </Group>
                              </Table.Td>
                            </Table.Tr>
                          );
                        })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Tabs.Panel>

              <Tabs.Panel
                value="ai"
                pt="md"
                style={{
                  flex: 1,
                  display: "flex",
                  flexDirection: "column",
                  overflow: "hidden",
                }}
              >
                <Card withBorder padding="xs" radius="md" mb="sm">
                  <Group gap="xs" p="xs">
                    <IconBrain size={16} color="#8b5cf6" />
                    <Text size="sm" fw={500}>
                      AI Processed & Mapped Data
                    </Text>
                    <Text size="xs" c="dimmed" ml="auto">
                      Review AI transformations and mappings
                    </Text>
                  </Group>
                </Card>
                <ScrollArea style={{ flex: 1, minHeight: 0 }}>
                  <Table striped highlightOnHover>
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th style={{ width: 60 }}>
                          <Checkbox
                            checked={
                              reviewData.aiGeneratedRows.length > 0 &&
                              reviewData.aiGeneratedRows
                                .slice(0, 100)
                                .filter((row: any, idx: number) => {
                                  const rowId =
                                    row._normalization_result_id || `ai_${idx}`;
                                  return !removedRowIds.has(rowId);
                                })
                                .every((row: any, idx: number) => {
                                  const rowId =
                                    row._normalization_result_id || `ai_${idx}`;
                                  return selectedRowIds.has(rowId);
                                })
                            }
                            onChange={(e) => {
                              if (e.currentTarget.checked) {
                                const newSet = new Set(selectedRowIds);
                                reviewData.aiGeneratedRows
                                  .slice(0, 100)
                                  .filter((row: any, idx: number) => {
                                    const rowId =
                                      row._normalization_result_id ||
                                      `ai_${idx}`;
                                    return !removedRowIds.has(rowId);
                                  })
                                  .forEach((row: any, idx: number) => {
                                    const rowId =
                                      row._normalization_result_id ||
                                      `ai_${idx}`;
                                    newSet.add(rowId);
                                  });
                                setSelectedRowIds(newSet);
                              } else {
                                const newSet = new Set(selectedRowIds);
                                reviewData.aiGeneratedRows
                                  .slice(0, 100)
                                  .forEach((row: any, idx: number) => {
                                    const rowId =
                                      row._normalization_result_id ||
                                      `ai_${idx}`;
                                    newSet.delete(rowId);
                                  });
                                setSelectedRowIds(newSet);
                              }
                            }}
                          />
                        </Table.Th>
                        <Table.Th style={{ width: 80 }}>Row #</Table.Th>
                        <Table.Th style={{ width: 120 }}>Confidence</Table.Th>
                        <Table.Th style={{ width: 300 }}>
                          <Group gap="xs">
                            <IconBrain size={14} color="#8b5cf6" />
                            <Text size="xs" fw={600}>
                              AI Summary
                            </Text>
                          </Group>
                        </Table.Th>
                        {reviewData.aiGeneratedRows[0] &&
                          Object.keys(reviewData.aiGeneratedRows[0])
                            .filter(
                              (key) =>
                                !key.startsWith("_") &&
                                key !== "confidence" &&
                                key !== "status" &&
                                key !== "ai_reasoning" &&
                                key !== "aiReasoning" &&
                                key !== "confidence_explanation"
                            )
                            .slice(0, 5)
                            .map((key) => (
                              <Table.Th key={key}>
                                <Text size="xs" fw={600}>
                                  {key}
                                </Text>
                              </Table.Th>
                            ))}
                        <Table.Th style={{ width: 150 }}>Actions</Table.Th>
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {reviewData.aiGeneratedRows
                        .slice(0, 100)
                        .filter((row: any, idx: number) => {
                          const rowId =
                            row._normalization_result_id || `ai_${idx}`;
                          return !removedRowIds.has(rowId);
                        })
                        .map((row: any, idx: number) => {
                          const rowId =
                            row._normalization_result_id || `ai_${idx}`;
                          const isSelected = selectedRowIds.has(rowId);
                          const isExpanded = expandedRows.has(rowId);
                          const confidence =
                            row._confidence || row.confidence || 0;
                          const aiReasoning =
                            row.ai_reasoning ||
                            row.aiReasoning ||
                            row._ai_reasoning ||
                            "";
                          const confidenceExplanation =
                            row.confidence_explanation ||
                            row._confidence_explanation ||
                            "";

                          return (
                            <>
                              <Table.Tr key={idx}>
                                <Table.Td>
                                  <Checkbox
                                    checked={isSelected}
                                    onChange={() => toggleRowSelection(rowId)}
                                  />
                                </Table.Td>
                                <Table.Td>
                                  <Text size="sm" fw={500}>
                                    {row._row_index || idx + 1}
                                  </Text>
                                </Table.Td>
                                <Table.Td>
                                  <Badge
                                    color={
                                      confidence >= 0.9
                                        ? "green"
                                        : confidence >= 0.7
                                        ? "yellow"
                                        : "red"
                                    }
                                    variant="light"
                                    size="sm"
                                    style={{ minWidth: 70 }}
                                  >
                                    {Math.round(confidence * 100)}%
                                  </Badge>
                                </Table.Td>
                                <Table.Td>
                                  <Stack gap={4}>
                                    {confidenceExplanation && (
                                      <Paper
                                        p="xs"
                                        radius="sm"
                                        style={{
                                          backgroundColor: "#fff7ed",
                                          border: "1px solid #fed7aa",
                                        }}
                                      >
                                        <Group gap={4} mb={2}>
                                          <IconSparkles
                                            size={12}
                                            color="#f59e0b"
                                          />
                                          <Text size="xs" fw={600} c="dark">
                                            Why {Math.round(confidence * 100)}%?
                                          </Text>
                                        </Group>
                                        <Text
                                          size="xs"
                                          c="dimmed"
                                          style={{
                                            whiteSpace: "pre-wrap",
                                            lineHeight: 1.4,
                                          }}
                                        >
                                          {truncateAIReasoning(
                                            confidenceExplanation,
                                            confidence
                                          )}
                                        </Text>
                                      </Paper>
                                    )}
                                    {/* {aiReasoning && (
                                      <Paper
                                        p="xs"
                                        radius="sm"
                                        style={{
                                          backgroundColor: "#f5f3ff",
                                          border: "1px solid #ddd6fe",
                                        }}
                                      >
                                        <Group gap={4} mb={2}>
                                          <IconBrain
                                            size={12}
                                            color="#8b5cf6"
                                          />
                                          <Text size="xs" fw={600} c="dark">
                                            AI Reasoning:
                                          </Text>
                                        </Group>
                                        <Text
                                          size="xs"
                                          c="dimmed"
                                          style={{
                                            whiteSpace: "pre-wrap",
                                            lineHeight: 1.4,
                                          }}
                                        >
                                          {truncateAIReasoning(
                                            aiReasoning,
                                            confidence
                                          )}
                                        </Text>
                                      </Paper>
                                    )} */}
                                    {!confidenceExplanation && !aiReasoning && (
                                      <Text
                                        size="xs"
                                        c="dimmed"
                                        style={{ fontStyle: "italic" }}
                                      >
                                        No AI summary available
                                      </Text>
                                    )}
                                  </Stack>
                                </Table.Td>
                                {Object.keys(row)
                                  .filter(
                                    (key) =>
                                      !key.startsWith("_") &&
                                      key !== "confidence" &&
                                      key !== "status" &&
                                      key !== "ai_reasoning" &&
                                      key !== "aiReasoning" &&
                                      key !== "confidence_explanation"
                                  )
                                  .slice(0, 5)
                                  .map((key) => (
                                    <Table.Td key={key}>
                                      <Text size="sm">
                                        {String(row[key] || "").slice(0, 50)}
                                        {String(row[key] || "").length > 50 &&
                                          "..."}
                                      </Text>
                                    </Table.Td>
                                  ))}
                                <Table.Td>
                                  <Group gap="xs">
                                    {(aiReasoning || confidenceExplanation) && (
                                      <Tooltip
                                        label={
                                          isExpanded
                                            ? "Hide AI Details"
                                            : "View AI Reasoning"
                                        }
                                      >
                                        <ActionIcon
                                          color="blue"
                                          variant="light"
                                          size="sm"
                                          onClick={() =>
                                            toggleRowExpansion(rowId)
                                          }
                                        >
                                          {isExpanded ? (
                                            <IconChevronUp size={14} />
                                          ) : (
                                            <IconChevronDown size={14} />
                                          )}
                                        </ActionIcon>
                                      </Tooltip>
                                    )}
                                    <Tooltip
                                      label={
                                        isSelected ? "Deselect" : "Approve"
                                      }
                                    >
                                      <ActionIcon
                                        color={isSelected ? "green" : "gray"}
                                        variant={
                                          isSelected ? "filled" : "light"
                                        }
                                        size="sm"
                                        onClick={() =>
                                          toggleRowSelection(rowId)
                                        }
                                      >
                                        <IconCheck size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                    <Tooltip label="Remove Row">
                                      <ActionIcon
                                        color="red"
                                        variant="light"
                                        size="sm"
                                        onClick={() => {
                                          // Remove row from display
                                          const newRemovedSet = new Set(
                                            removedRowIds
                                          );
                                          newRemovedSet.add(rowId);
                                          setRemovedRowIds(newRemovedSet);
                                          // Also remove from selection if selected
                                          const newSelectedSet = new Set(
                                            selectedRowIds
                                          );
                                          newSelectedSet.delete(rowId);
                                          setSelectedRowIds(newSelectedSet);
                                          // Collapse if expanded
                                          const newExpandedSet = new Set(
                                            expandedRows
                                          );
                                          newExpandedSet.delete(rowId);
                                          setExpandedRows(newExpandedSet);
                                        }}
                                      >
                                        <IconX size={14} />
                                      </ActionIcon>
                                    </Tooltip>
                                  </Group>
                                </Table.Td>
                              </Table.Tr>
                              {isExpanded &&
                                (aiReasoning || confidenceExplanation) && (
                                  <Table.Tr>
                                    <Table.Td
                                      colSpan={100}
                                      style={{ padding: 0, border: 0 }}
                                    >
                                      <Collapse in={isExpanded}>
                                        <Paper
                                          p="md"
                                          m="xs"
                                          radius="md"
                                          style={{
                                            backgroundColor: "#f8f9fa",
                                            border: "1px solid #e9ecef",
                                          }}
                                        >
                                          <Stack gap="sm">
                                            <Group gap="xs" mb="xs">
                                              <IconBrain
                                                size={18}
                                                color="#8b5cf6"
                                              />
                                              <Text fw={600} size="sm" c="dark">
                                                AI Analysis & Confidence
                                                Breakdown
                                              </Text>
                                            </Group>

                                            {confidenceExplanation && (
                                              <Card
                                                withBorder
                                                padding="sm"
                                                radius="md"
                                                style={{
                                                  backgroundColor: "white",
                                                }}
                                              >
                                                <Group gap="xs" mb="xs">
                                                  <IconSparkles
                                                    size={14}
                                                    color="#f59e0b"
                                                  />
                                                  <Text
                                                    fw={600}
                                                    size="xs"
                                                    c="dark"
                                                  >
                                                    Confidence Score Breakdown
                                                  </Text>
                                                </Group>
                                                <Text
                                                  size="xs"
                                                  c="dimmed"
                                                  style={{
                                                    whiteSpace: "pre-wrap",
                                                  }}
                                                >
                                                  {confidenceExplanation}
                                                </Text>
                                              </Card>
                                            )}

                                            {aiReasoning && (
                                              <Card
                                                withBorder
                                                padding="sm"
                                                radius="md"
                                                style={{
                                                  backgroundColor: "white",
                                                }}
                                              >
                                                <Group gap="xs" mb="xs">
                                                  <IconBrain
                                                    size={14}
                                                    color="#8b5cf6"
                                                  />
                                                  <Text
                                                    fw={600}
                                                    size="xs"
                                                    c="dark"
                                                  >
                                                    AI Reasoning
                                                  </Text>
                                                </Group>
                                                <Text
                                                  size="xs"
                                                  c="dimmed"
                                                  style={{
                                                    whiteSpace: "pre-wrap",
                                                    lineHeight: 1.6,
                                                  }}
                                                >
                                                  {truncateAIReasoning(
                                                    aiReasoning,
                                                    confidence
                                                  )}
                                                </Text>
                                              </Card>
                                            )}

                                            {!confidenceExplanation &&
                                              !aiReasoning && (
                                                <Text
                                                  size="xs"
                                                  c="dimmed"
                                                  style={{
                                                    fontStyle: "italic",
                                                  }}
                                                >
                                                  No AI reasoning or confidence
                                                  breakdown available for this
                                                  row.
                                                </Text>
                                              )}
                                          </Stack>
                                        </Paper>
                                      </Collapse>
                                    </Table.Td>
                                  </Table.Tr>
                                )}
                            </>
                          );
                        })}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>
              </Tabs.Panel>
            </Tabs>

            <Card
              withBorder
              padding="md"
              radius="md"
              mt="auto"
              style={{
                backgroundColor: "#f8f9fa",
                borderTop: "2px solid #2563eb",
                flexShrink: 0,
                marginTop: "auto",
              }}
            >
              <Group justify="space-between" align="center">
                <Stack gap={4}>
                  <Group gap="xs">
                    <IconInfoCircle size={16} color="#6b7280" />
                    <Text size="sm" fw={500}>
                      Selection Summary
                    </Text>
                  </Group>
                  <Text size="sm" c="dimmed" ml={24}>
                    {selectedRowIds.size} of {reviewData.totalRows} rows
                    selected
                    {selectedRowIds.size > 0 && (
                      <span> • Ready to load to database</span>
                    )}
                  </Text>
                </Stack>
                <Group>
                  <Button
                    variant="light"
                    color="gray"
                    onClick={() => {
                      setReviewModalOpen(false);
                      setSelectedJob(null);
                      setReviewData(null);
                      setSelectedRowIds(new Set());
                    }}
                    disabled={approving}
                  >
                    Cancel
                  </Button>
                  <Button
                    leftSection={<IconCheck size={18} />}
                    onClick={handleApprove}
                    loading={approving}
                    disabled={selectedRowIds.size === 0}
                    color="green"
                    size="md"
                    style={{ minWidth: 150 }}
                  >
                    {approving
                      ? "Approving..."
                      : `Approve ${selectedRowIds.size} Row${
                          selectedRowIds.size !== 1 ? "s" : ""
                        }`}
                  </Button>
                </Group>
              </Group>
            </Card>
          </Stack>
        ) : (
          <Center p="xl">
            <Text c="dimmed">No review data available</Text>
          </Center>
        )}
      </Modal>
    </Stack>
  );
}
