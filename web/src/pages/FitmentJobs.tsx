import { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Table,
  Checkbox,
  Group,
  Stack,
  Badge,
  ScrollArea,
  Alert,
  Modal,
  Tooltip,
} from "@mantine/core";
import {
  IconCheck,
  IconX,
  IconClock,
  IconAlertCircle,
  IconRefresh,
  //   IconArrowRight,
} from "@tabler/icons-react";
import { dataUploadService } from "../api/services";
import { useApi } from "../hooks/useApi";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import { useEntity } from "../hooks/useEntity";

// AI Fitment Job interface
interface AiFitmentJob {
  id: string;
  created_at: string;
  created_by: string;
  product_file_name?: string;
  product_count: number;
  status: "in_progress" | "completed" | "failed" | "review_required";
  fitments_count: number;
  approved_count: number;
  rejected_count: number;
  job_type: "upload" | "selection";
}

export default function FitmentJobs() {
  const { showSuccess, showError } = useProfessionalToast();
  const { currentEntity } = useEntity();

  // State for jobs
  const { data: aiFitmentJobsResponse, refetch: refetchJobs } = useApi(
    () => dataUploadService.getAiFitmentJobs({ tenant_id: currentEntity?.id }),
    []
  ) as any;

  // State for job review
  const [selectedJobForReview, setSelectedJobForReview] = useState<
    string | null
  >(null);
  const [jobFitments, setJobFitments] = useState<any[]>([]);
  const [selectedJobFitments, setSelectedJobFitments] = useState<string[]>([]);
  const [loadingJobFitments, setLoadingJobFitments] = useState(false);
  const [approvingFitments, setApprovingFitments] = useState(false);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  // Extract jobs array from API response
  const aiFitmentJobs = Array.isArray(aiFitmentJobsResponse?.data)
    ? aiFitmentJobsResponse.data
    : Array.isArray(aiFitmentJobsResponse)
    ? aiFitmentJobsResponse
    : [];

  // Listen for entity change events
  useEffect(() => {
    const handleEntityChange = async () => {
      await refetchJobs();
    };

    window.addEventListener("entityChanged", handleEntityChange);

    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [refetchJobs]);

  // Handle review job
  const handleReviewJob = async (jobId: string) => {
    setSelectedJobForReview(jobId);
    setLoadingJobFitments(true);
    setReviewModalOpen(true);

    try {
      const result: any = await dataUploadService.reviewAiFitmentJob(jobId);

      if (result && result.data) {
        const fitments = result.data.fitments || result.data || [];
        setJobFitments(fitments);
        setSelectedJobFitments(fitments.map((f: any) => f.id));
        showSuccess(`Loaded ${fitments.length} fitments for review`);
      }
    } catch (error: any) {
      console.error("Failed to load job fitments:", error);
      showError("Failed to load job fitments for review");
    } finally {
      setLoadingJobFitments(false);
    }
  };

  // Approve AI Fitments
  const handleApproveJobFitments = async () => {
    if (!selectedJobForReview) return;

    if (selectedJobFitments.length === 0) {
      showError("Please select fitments to approve");
      return;
    }

    setApprovingFitments(true);

    try {
      await dataUploadService.approveAiFitments(
        selectedJobForReview,
        selectedJobFitments
      );

      showSuccess(
        `Successfully approved ${selectedJobFitments.length} fitments! They are now active in Fitment Management.`,
        5000
      );

      await refetchJobs();

      // Close review modal and reset
      setSelectedJobForReview(null);
      setJobFitments([]);
      setSelectedJobFitments([]);
      setReviewModalOpen(false);
    } catch (error: any) {
      console.error("Failed to approve fitments:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to approve fitments";
      showError(errorMsg);
    } finally {
      setApprovingFitments(false);
    }
  };

  // Reject AI Fitments
  const handleRejectJobFitments = async () => {
    if (!selectedJobForReview) return;

    if (selectedJobFitments.length === 0) {
      showError("Please select fitments to reject");
      return;
    }

    const confirmReject = window.confirm(
      `Are you sure you want to reject ${selectedJobFitments.length} fitments? This will delete them permanently.`
    );

    if (!confirmReject) return;

    setApprovingFitments(true);

    try {
      await dataUploadService.rejectAiFitments(
        selectedJobForReview,
        selectedJobFitments
      );

      showSuccess(
        `Successfully rejected ${selectedJobFitments.length} fitments. They have been removed.`,
        5000
      );

      // Remove rejected fitments from local state
      setJobFitments((prev) =>
        prev.filter((f) => !selectedJobFitments.includes(f.id))
      );
      setSelectedJobFitments([]);

      await refetchJobs();
    } catch (error: any) {
      console.error("Failed to reject fitments:", error);
      const errorMsg =
        error.response?.data?.error ||
        error.response?.data?.message ||
        "Failed to reject fitments";
      showError(errorMsg);
    } finally {
      setApprovingFitments(false);
    }
  };

  // Render status badge
  const renderStatusBadge = (status: string) => {
    const statusConfig: Record<
      string,
      { color: string; label: string; icon: any }
    > = {
      in_progress: {
        color: "blue",
        label: "In Progress",
        icon: <IconClock size={14} />,
      },
      completed: {
        color: "green",
        label: "Completed",
        icon: <IconCheck size={14} />,
      },
      failed: {
        color: "red",
        label: "Failed",
        icon: <IconX size={14} />,
      },
      review_required: {
        color: "orange",
        label: "Review Required",
        icon: <IconAlertCircle size={14} />,
      },
    };

    const config = statusConfig[status] || statusConfig.in_progress;

    return (
      <Badge
        style={{ cursor: "pointer" }}
        color={config.color}
        variant="light"
        leftSection={config.icon}
      >
        {config.label}
      </Badge>
    );
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2} c="#1e293b" fw={600}>
            AI Fitment Jobs & Progress
          </Title>
          <Text size="sm" c="#64748b">
            Track and review your AI fitment generation jobs
          </Text>
        </div>
        <Button
          variant="subtle"
          size="sm"
          leftSection={<IconRefresh size={16} />}
          onClick={() => refetchJobs()}
        >
          Refresh
        </Button>
      </Group>

      {/* Jobs Summary */}
      {aiFitmentJobs && aiFitmentJobs.length > 0 && (
        <Group gap="md">
          <Badge size="lg" variant="light" color="blue">
            Total: {aiFitmentJobs.length}
          </Badge>
          <Badge
            size="lg"
            variant="light"
            color="orange"
            leftSection={<IconAlertCircle size={14} />}
          >
            Review Required:{" "}
            {
              aiFitmentJobs.filter((j: any) => j.status === "review_required")
                .length
            }
          </Badge>
          <Badge
            size="lg"
            variant="light"
            color="green"
            leftSection={<IconCheck size={14} />}
          >
            Completed:{" "}
            {aiFitmentJobs.filter((j: any) => j.status === "completed").length}
          </Badge>
          <Badge
            size="lg"
            variant="light"
            color="blue"
            leftSection={<IconClock size={14} />}
          >
            In Progress:{" "}
            {
              aiFitmentJobs.filter((j: any) => j.status === "in_progress")
                .length
            }
          </Badge>
          <Badge
            size="lg"
            variant="light"
            color="red"
            leftSection={<IconX size={14} />}
          >
            Failed:{" "}
            {aiFitmentJobs.filter((j: any) => j.status === "failed").length}
          </Badge>
        </Group>
      )}

      {/* Jobs Table */}
      {!aiFitmentJobs || aiFitmentJobs.length === 0 ? (
        <Alert color="blue" variant="light">
          <Text size="sm">
            No AI fitment jobs yet. Upload products or select products to
            generate AI fitments.
          </Text>
        </Alert>
      ) : (
        <Card withBorder>
          <ScrollArea h={600}>
            <Table striped highlightOnHover>
              <Table.Thead
                style={{
                  position: "sticky",
                  top: 0,
                  backgroundColor: "white",
                  zIndex: 1,
                }}
              >
                <Table.Tr>
                  <Table.Th>Date</Table.Th>
                  <Table.Th>Created By</Table.Th>
                  <Table.Th>Source</Table.Th>
                  <Table.Th>Products</Table.Th>
                  <Table.Th>Fitments</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {aiFitmentJobs.map((job: AiFitmentJob) => (
                  <Table.Tr key={job.id}>
                    <Table.Td>
                      <Text size="sm">
                        {new Date(job.created_at).toLocaleDateString()}
                      </Text>
                      <Text size="xs" c="dimmed">
                        {new Date(job.created_at).toLocaleTimeString()}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{job.created_by || "System"}</Text>
                    </Table.Td>
                    <Table.Td>
                      {job.job_type === "upload" ? (
                        <Tooltip label={job.product_file_name}>
                          <Text size="sm">File Upload</Text>
                        </Tooltip>
                      ) : (
                        <Text size="sm">Manual Update</Text>
                      )}
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" fw={600}>
                        {job.product_count}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        <Text size="sm" fw={600}>
                          {job.fitments_count}
                        </Text>
                        {job.status === "review_required" && (
                          <Text size="xs" c="dimmed">
                            ({job.approved_count} approved, {job.rejected_count}{" "}
                            rejected)
                          </Text>
                        )}
                      </Group>
                    </Table.Td>
                    <Table.Td>{renderStatusBadge(job.status)}</Table.Td>
                    <Table.Td>
                      {job.status === "review_required" && (
                        <Button
                          variant="default"
                          size="xs"
                          onClick={() => handleReviewJob(job.id)}
                        >
                          Review
                        </Button>
                      )}
                      {job.status === "completed" && (
                        <Badge color="green" variant="dot" size="sm">
                          Done
                        </Badge>
                      )}
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </ScrollArea>
        </Card>
      )}

      {/* Review Modal */}
      <Modal
        opened={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedJobForReview(null);
          setJobFitments([]);
          setSelectedJobFitments([]);
        }}
        title="Review AI Fitments"
        size="xl"
      >
        <Stack gap="md">
          {loadingJobFitments ? (
            <Alert color="blue">Loading fitments...</Alert>
          ) : jobFitments.length === 0 ? (
            <Alert color="yellow">No fitments to review</Alert>
          ) : (
            <>
              <Group justify="space-between">
                <Text size="sm">
                  Select fitments to approve or reject. Selected:{" "}
                  {selectedJobFitments.length} / {jobFitments.length}
                </Text>
                <Group gap="xs">
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() =>
                      setSelectedJobFitments(jobFitments.map((f: any) => f.id))
                    }
                  >
                    Select All
                  </Button>
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => setSelectedJobFitments([])}
                  >
                    Deselect All
                  </Button>
                </Group>
              </Group>

              <ScrollArea h={400}>
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th style={{ width: 40 }}>
                        <Checkbox
                          checked={
                            selectedJobFitments.length === jobFitments.length &&
                            jobFitments.length > 0
                          }
                          indeterminate={
                            selectedJobFitments.length > 0 &&
                            selectedJobFitments.length < jobFitments.length
                          }
                          onChange={(e) =>
                            e.currentTarget.checked
                              ? setSelectedJobFitments(
                                  jobFitments.map((f: any) => f.id)
                                )
                              : setSelectedJobFitments([])
                          }
                        />
                      </Table.Th>
                      <Table.Th>Part ID</Table.Th>
                      <Table.Th>Vehicle</Table.Th>
                      <Table.Th>Position</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {jobFitments.map((fitment: any) => (
                      <Table.Tr key={fitment.id}>
                        <Table.Td>
                          <Checkbox
                            checked={selectedJobFitments.includes(fitment.id)}
                            onChange={(e) =>
                              e.currentTarget.checked
                                ? setSelectedJobFitments([
                                    ...selectedJobFitments,
                                    fitment.id,
                                  ])
                                : setSelectedJobFitments(
                                    selectedJobFitments.filter(
                                      (id) => id !== fitment.id
                                    )
                                  )
                            }
                          />
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {fitment.part_id ||
                              fitment.id ||
                              fitment.sku ||
                              "N/A"}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">
                            {fitment.year} {fitment.make} {fitment.model}
                          </Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{fitment.position || "N/A"}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              </ScrollArea>

              <Group justify="flex-end" mt="md">
                <Button
                  variant="outline"
                  color="red"
                  leftSection={<IconX size={16} />}
                  onClick={handleRejectJobFitments}
                  loading={approvingFitments}
                  disabled={selectedJobFitments.length === 0}
                >
                  Reject Selected
                </Button>
                <Button
                  leftSection={<IconCheck size={16} />}
                  onClick={handleApproveJobFitments}
                  loading={approvingFitments}
                  disabled={selectedJobFitments.length === 0}
                >
                  Approve Selected
                </Button>
              </Group>
            </>
          )}
        </Stack>
      </Modal>
    </Stack>
  );
}
