import { useState, useEffect } from "react";
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
} from "@mantine/core";
import {
  IconHistory,
  IconCheck,
  IconX,
  IconClock,
  IconRefresh,
  IconArrowRight,
  IconSearch,
  IconFileSpreadsheet,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import apiClient from "../api/client";

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
  const navigate = useNavigate();

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

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
        return "green";
      case "failed":
      case "error":
        return "red";
      case "in_progress":
      case "processing":
        return "blue";
      case "queued":
        return "yellow";
      default:
        return "gray";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case "completed":
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
      upload: "Upload",
    };
    return labels[type] || type;
  };

  const handleJobClick = (job: Job) => {
    const dataType = job.upload?.preflight_report?.dataType || "fitments";
    if (dataType === "fitments") {
      navigate("/fitments");
    } else if (dataType === "products") {
      navigate("/products");
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleString();
  };

  return (
    <Stack gap="lg">
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
          <Button
            leftSection={<IconRefresh size={16} />}
            onClick={fetchJobs}
            variant="light"
          >
            Refresh
          </Button>
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
            data={[
              { value: "completed", label: "Completed" },
              { value: "in_progress", label: "In Progress" },
              { value: "failed", label: "Failed" },
              { value: "queued", label: "Queued" },
            ]}
            value={statusFilter}
            onChange={setStatusFilter}
            clearable
          />
          <Select
            placeholder="Filter by type"
            data={[
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
                  <Table.Th>Finished</Table.Th>
                  <Table.Th>Results</Table.Th>
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
                      <Text size="sm">{formatDate(job.finished_at)}</Text>
                    </Table.Td>
                    <Table.Td>
                      {job.result && (
                        <Group gap="xs">
                          {job.result.createdCount !== undefined && (
                            <Badge size="sm" color="green" variant="light">
                              {job.result.createdCount} created
                            </Badge>
                          )}
                          {job.result.errorCount !== undefined &&
                            job.result.errorCount > 0 && (
                              <Badge size="sm" color="red" variant="light">
                                {job.result.errorCount} errors
                              </Badge>
                            )}
                        </Group>
                      )}
                    </Table.Td>
                    <Table.Td>
                      {job.status === "completed" && (
                        <Tooltip label="View results">
                          <ActionIcon
                            color="blue"
                            variant="light"
                            onClick={() => handleJobClick(job)}
                          >
                            <IconArrowRight size={16} />
                          </ActionIcon>
                        </Tooltip>
                      )}
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
    </Stack>
  );
}
