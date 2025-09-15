import { useEffect, useState } from "react";
import {
  Card,
  Title,
  Text,
  NumberInput,
  Button,
  Group,
  Stack,
  Table,
  Progress,
  Badge,
  Select,
  Grid,
  Alert,
  Loader,
  Center,
  Modal,
  ActionIcon,
  Tooltip as MantineTooltip,
  Paper,
} from "@mantine/core";
import {
  IconChartBar,
  IconDownload,
  IconRefresh,
  IconCar,
  IconTrendingUp,
  IconAlertTriangle,
  IconInfoCircle,
  IconEye,
} from "@tabler/icons-react";
import { useApi } from "../hooks/useApi";
import { fitmentsService } from "../api/services";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
  Area,
  AreaChart,
} from "recharts";

export default function Coverage() {
  const [yearFrom, setYearFrom] = useState(2020);
  const [yearTo, setYearTo] = useState(2025);
  const [sortBy, setSortBy] = useState("make");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [selectedMake, setSelectedMake] = useState<string | null>(null);
  const [detailedModalOpen, setDetailedModalOpen] = useState(false);
  const [trendsModalOpen, setTrendsModalOpen] = useState(false);
  const [gapsModalOpen, setGapsModalOpen] = useState(false);

  const { data, loading, error, refetch } = useApi<{
    items: any[];
    totalCount: number;
  }>(
    () => fitmentsService.getCoverage({ yearFrom, yearTo, sortBy, sortOrder }),
    [yearFrom, yearTo, sortBy, sortOrder]
  );

  const {
    data: detailedData,
    loading: detailedLoading,
    refetch: refetchDetailed,
  } = useApi<any[]>(
    () =>
      selectedMake
        ? fitmentsService.getDetailedCoverage({
            make: selectedMake,
            yearFrom,
            yearTo,
          })
        : Promise.resolve([]),
    [selectedMake, yearFrom, yearTo]
  );

  const {
    data: trendsData,
    loading: trendsLoading,
    refetch: refetchTrends,
  } = useApi<any[]>(
    () =>
      selectedMake
        ? fitmentsService.getCoverageTrends({
            make: selectedMake,
          })
        : Promise.resolve([]),
    [selectedMake]
  );

  const {
    data: gapsData,
    loading: gapsLoading,
    refetch: refetchGaps,
  } = useApi<any[]>(
    () =>
      selectedMake
        ? fitmentsService.getCoverageGaps({
            make: selectedMake,
            yearFrom,
            yearTo,
          })
        : Promise.resolve([]),
    [selectedMake, yearFrom, yearTo]
  );

  const coverageItems = data?.items ?? [];
  const totalConfigs = coverageItems.reduce(
    (sum, item) => sum + item.configsCount,
    0
  );
  const totalFitted = coverageItems.reduce(
    (sum, item) => sum + item.fittedConfigsCount,
    0
  );
  const overallCoverage = totalConfigs
    ? Math.round((totalFitted / totalConfigs) * 100)
    : 0;

  useEffect(() => {
    const onFocus = () => refetch();
    const onVisibility = () => {
      if (document.visibilityState === "visible") refetch();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    return () => {
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [refetch]);

  const handleExport = async () => {
    try {
      const params = new URLSearchParams({
        yearFrom: String(yearFrom),
        yearTo: String(yearTo),
        sortBy,
        sortOrder,
      });

      const response = await fitmentsService.exportCoverage(params);

      if (!response.data) {
        throw new Error("Export failed");
      }

      const blob = await response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `coverage-report-${yearFrom}-${yearTo}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Export failed:", error);
      alert("Export failed. Please try again.");
    }
  };

  const handleViewDetails = (make: string) => {
    setSelectedMake(make);
    setDetailedModalOpen(true);
    // Force refetch with the new make
    setTimeout(() => refetchDetailed(), 100);
  };

  const handleViewTrends = (make: string) => {
    setSelectedMake(make);
    setTrendsModalOpen(true);
    // Force refetch with the new make
    setTimeout(() => refetchTrends(), 100);
  };

  const handleViewGaps = (make: string) => {
    setSelectedMake(make);
    setGapsModalOpen(true);
    // Force refetch with the new make
    setTimeout(() => refetchGaps(), 100);
  };

  const getBarColor = (percentage: number) => {
    if (percentage >= 85) return "#12B76A"; // Green
    if (percentage >= 70) return "#F79009"; // Orange
    return "#F04438"; // Red
  };

  const getCoverageStatus = (percentage: number) => {
    if (percentage >= 85) return { label: "Excellent", color: "green" };
    if (percentage >= 70) return { label: "Good", color: "yellow" };
    return { label: "Needs Attention", color: "red" };
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <Stack gap="lg">
        {/* Header & Controls */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Group justify="space-between" mb="xl">
            <div>
              <Title order={2} c="dark" fw={700}>
                Coverage Analysis
              </Title>
              <Text c="dimmed" size="lg" mt={4}>
                Analyze fitment coverage across vehicle configurations with
                detailed insights
              </Text>
            </div>
            <Group gap="md">
              <Button
                leftSection={<IconDownload size={18} />}
                variant="gradient"
                gradient={{ from: "blue", to: "cyan" }}
                size="md"
                onClick={handleExport}
                radius="md"
              >
                Export Report
              </Button>
              <Button
                leftSection={<IconRefresh size={18} />}
                variant="outline"
                size="md"
                onClick={() => refetch()}
                radius="md"
              >
                Refresh
              </Button>
            </Group>
          </Group>

          <Paper shadow="none">
            <Title order={4} mb="md" c="dark">
              Filters & Sorting
            </Title>
            <Grid>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <NumberInput
                  label="Year From"
                  value={yearFrom}
                  onChange={(val) =>
                    setYearFrom(typeof val === "number" ? val : 2020)
                  }
                  min={2010}
                  max={2030}
                  size="md"
                  radius="md"
                  styles={{
                    label: { fontWeight: 600, marginBottom: 8 },
                    input: {
                      border: "2px solid #e9ecef",
                      "&:focus": { borderColor: "#339af0" },
                    },
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <NumberInput
                  label="Year To"
                  value={yearTo}
                  onChange={(val) =>
                    setYearTo(typeof val === "number" ? val : 2025)
                  }
                  min={2010}
                  max={2030}
                  size="md"
                  radius="md"
                  styles={{
                    label: { fontWeight: 600, marginBottom: 8 },
                    input: {
                      border: "2px solid #e9ecef",
                      "&:focus": { borderColor: "#339af0" },
                    },
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Select
                  label="Sort By"
                  value={sortBy}
                  onChange={(value) => setSortBy(value || "make")}
                  data={[
                    { value: "make", label: "Make" },
                    { value: "coveragePercent", label: "Coverage %" },
                    { value: "configsCount", label: "Total Configs" },
                    { value: "fittedConfigsCount", label: "Fitted Configs" },
                  ]}
                  size="md"
                  radius="md"
                  styles={{
                    label: { fontWeight: 600, marginBottom: 8 },
                    input: {
                      border: "2px solid #e9ecef",
                      "&:focus": { borderColor: "#339af0" },
                    },
                  }}
                />
              </Grid.Col>
              <Grid.Col span={{ base: 12, sm: 6, md: 3 }}>
                <Select
                  label="Order"
                  value={sortOrder}
                  onChange={(value) => setSortOrder(value as "asc" | "desc")}
                  data={[
                    { value: "asc", label: "Ascending" },
                    { value: "desc", label: "Descending" },
                  ]}
                  size="md"
                  radius="md"
                  styles={{
                    label: { fontWeight: 600, marginBottom: 8 },
                    input: {
                      border: "2px solid #e9ecef",
                      "&:focus": { borderColor: "#339af0" },
                    },
                  }}
                />
              </Grid.Col>
            </Grid>
          </Paper>
        </Card>

        {/* Overall Stats */}
        <Grid>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="sm">
                    Total Configurations
                  </Text>
                  <Title order={2}>{totalConfigs.toLocaleString()}</Title>
                </div>
                <IconCar size={32} color="var(--mantine-color-blue-6)" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="sm">
                    Fitted Configurations
                  </Text>
                  <Title order={2}>{totalFitted.toLocaleString()}</Title>
                </div>
                <IconChartBar size={32} color="var(--mantine-color-green-6)" />
              </Group>
            </Card>
          </Grid.Col>
          <Grid.Col span={4}>
            <Card shadow="sm" padding="lg" radius="md" withBorder>
              <Group justify="space-between">
                <div>
                  <Text c="dimmed" size="sm">
                    Overall Coverage
                  </Text>
                  <Group align="center" gap="xs">
                    <Title order={2}>{overallCoverage}%</Title>
                    <Badge {...getCoverageStatus(overallCoverage)} size="sm">
                      {getCoverageStatus(overallCoverage).label}
                    </Badge>
                  </Group>
                </div>
                <div>
                  <Progress value={overallCoverage} size="lg" radius="xl" />
                </div>
              </Group>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Coverage Chart */}
        <Card shadow="sm" padding="xl" radius="md" withBorder>
          <Group justify="space-between" mb="xl">
            <div>
              <Title order={3} c="dark" fw={700}>
                Coverage by Make
              </Title>
              <Text c="dimmed" size="sm">
                Visual representation of fitment coverage across vehicle makes
              </Text>
            </div>
            {loading && <Loader size="sm" />}
          </Group>

          <Paper p="lg" radius="md" withBorder bg="gray.0">
            <div style={{ height: 450 }}>
              {error && (
                <Alert
                  icon={<IconAlertTriangle size={16} />}
                  color="red"
                  mb="md"
                >
                  {error}
                </Alert>
              )}
              {loading ? (
                <Center h="100%">
                  <Stack align="center" gap="md">
                    <Loader size="lg" />
                    <Text c="dimmed">Loading coverage data...</Text>
                  </Stack>
                </Center>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={coverageItems}
                    margin={{ top: 30, right: 40, left: 30, bottom: 20 }}
                  >
                    <defs>
                      <linearGradient
                        id="totalGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#e2e8f0"
                          stopOpacity={0.8}
                        />
                        <stop
                          offset="95%"
                          stopColor="#cbd5e1"
                          stopOpacity={0.8}
                        />
                      </linearGradient>
                      <linearGradient
                        id="fittedGradient"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#3b82f6"
                          stopOpacity={0.9}
                        />
                        <stop
                          offset="95%"
                          stopColor="#1d4ed8"
                          stopOpacity={0.9}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis
                      dataKey="make"
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={{ stroke: "#e2e8f0" }}
                    />
                    <YAxis
                      tick={{ fontSize: 12, fill: "#64748b" }}
                      axisLine={{ stroke: "#e2e8f0" }}
                      tickLine={{ stroke: "#e2e8f0" }}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "8px",
                        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                      }}
                      formatter={(value, name) => [
                        name === "coveragePercent"
                          ? `${value}%`
                          : value.toLocaleString(),
                        name === "coveragePercent"
                          ? "Coverage"
                          : name === "fittedConfigsCount"
                          ? "Fitted"
                          : "Total",
                      ]}
                    />
                    <Bar
                      dataKey="configsCount"
                      fill="url(#totalGradient)"
                      name="Total Configurations"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      dataKey="fittedConfigsCount"
                      name="Fitted Configurations"
                      radius={[4, 4, 0, 0]}
                    >
                      {coverageItems.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={getBarColor(entry.coveragePercent)}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </Paper>
        </Card>

        {/* Enhanced Coverage Table */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Coverage Analysis by Make</Title>
            {loading && <Loader size="sm" />}
          </Group>

          {error && (
            <Alert icon={<IconAlertTriangle size={16} />} color="red" mb="md">
              {error}
            </Alert>
          )}

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Make</Table.Th>
                <Table.Th>Models</Table.Th>
                <Table.Th>Total Configurations</Table.Th>
                <Table.Th>Fitted Configurations</Table.Th>
                <Table.Th>Coverage</Table.Th>
                <Table.Th>Status</Table.Th>
                <Table.Th>Actions</Table.Th>
              </Table.Tr>
            </Table.Thead>
            <Table.Tbody>
              {coverageItems.map((row, index) => (
                <Table.Tr key={index}>
                  <Table.Td>
                    <Text fw={500}>{row.make}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text size="sm" c="dimmed">
                      {row.models.slice(0, 3).join(", ")}
                      {row.models.length > 3 && (
                        <Text component="span" c="dimmed" size="xs">
                          {" "}
                          +{row.models.length - 3} more
                        </Text>
                      )}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Text>{row.configsCount.toLocaleString()}</Text>
                  </Table.Td>
                  <Table.Td>
                    <Text fw={500}>
                      {row.fittedConfigsCount.toLocaleString()}
                    </Text>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="sm">
                      <Progress
                        value={row.coveragePercent}
                        size="md"
                        radius="xl"
                        color={getBarColor(row.coveragePercent)}
                        style={{ flex: 1, minWidth: 80 }}
                      />
                      <Text fw={500} size="sm" style={{ minWidth: 40 }}>
                        {row.coveragePercent}%
                      </Text>
                    </Group>
                  </Table.Td>
                  <Table.Td>
                    <Badge
                      color={getCoverageStatus(row.coveragePercent).color}
                      variant="light"
                      size="sm"
                    >
                      {getCoverageStatus(row.coveragePercent).label}
                    </Badge>
                  </Table.Td>
                  <Table.Td>
                    <Group gap="xs">
                      <MantineTooltip label="View detailed coverage by model">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          onClick={() => handleViewDetails(row.make)}
                        >
                          <IconEye size={14} />
                        </ActionIcon>
                      </MantineTooltip>
                      <MantineTooltip label="View coverage trends">
                        <ActionIcon
                          variant="light"
                          size="sm"
                          onClick={() => handleViewTrends(row.make)}
                        >
                          <IconTrendingUp size={14} />
                        </ActionIcon>
                      </MantineTooltip>
                      {row.coveragePercent < 70 && (
                        <MantineTooltip label="View coverage gaps">
                          <ActionIcon
                            variant="light"
                            size="sm"
                            color="red"
                            onClick={() => handleViewGaps(row.make)}
                          >
                            <IconAlertTriangle size={14} />
                          </ActionIcon>
                        </MantineTooltip>
                      )}
                    </Group>
                  </Table.Td>
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>

        {/* Detailed Coverage Modal */}
        <Modal
          opened={detailedModalOpen}
          onClose={() => setDetailedModalOpen(false)}
          title={
            <Group gap="sm">
              <IconEye size={20} />
              <Text fw={600}>Detailed Coverage - {selectedMake}</Text>
            </Group>
          }
          size="xl"
          styles={{
            header: {
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
            },
            body: { padding: "24px" },
          }}
        >
          {detailedLoading ? (
            <Center p="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Loading detailed coverage data...</Text>
              </Stack>
            </Center>
          ) : detailedData && detailedData.length > 0 ? (
            <Stack gap="md">
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
              >
                Showing coverage breakdown by model for {selectedMake}
              </Alert>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Model</Table.Th>
                    <Table.Th>Total Configurations</Table.Th>
                    <Table.Th>Fitted Configurations</Table.Th>
                    <Table.Th>Coverage</Table.Th>
                    <Table.Th>Status</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {detailedData.map((item, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text fw={600} c="dark">
                          {item.model}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>
                          {item.totalConfigurations.toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500} c="green">
                          {item.fittedConfigurations.toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="sm">
                          <Progress
                            value={item.coveragePercent}
                            size="md"
                            radius="xl"
                            color={getBarColor(item.coveragePercent)}
                            style={{ flex: 1, minWidth: 80 }}
                          />
                          <Text size="sm" fw={600} style={{ minWidth: 50 }}>
                            {item.coveragePercent}%
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={getCoverageStatus(item.coveragePercent).color}
                          variant="light"
                          size="sm"
                        >
                          {getCoverageStatus(item.coveragePercent).label}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          ) : (
            <Center p="xl">
              <Stack align="center" gap="md">
                <IconAlertTriangle
                  size={48}
                  color="var(--mantine-color-orange-6)"
                />
                <Text c="dimmed" size="lg">
                  No detailed data available for {selectedMake}
                </Text>
                <Text c="dimmed" size="sm">
                  Try selecting a different make or check your data.
                </Text>
              </Stack>
            </Center>
          )}
        </Modal>

        {/* Trends Modal */}
        <Modal
          opened={trendsModalOpen}
          onClose={() => setTrendsModalOpen(false)}
          title={
            <Group gap="sm">
              <IconTrendingUp size={20} />
              <Text fw={600}>Coverage Trends - {selectedMake}</Text>
            </Group>
          }
          size="lg"
          styles={{
            header: {
              backgroundColor: "#f8fafc",
              borderBottom: "1px solid #e2e8f0",
            },
            body: { padding: "24px" },
          }}
        >
          {trendsLoading ? (
            <Center p="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Loading trends data...</Text>
              </Stack>
            </Center>
          ) : trendsData && trendsData.length > 0 ? (
            <Stack gap="md">
              <Alert
                icon={<IconInfoCircle size={16} />}
                color="blue"
                variant="light"
              >
                Coverage trends over time for {selectedMake}
              </Alert>
              <Paper p="lg" radius="md" withBorder bg="gray.0">
                <div style={{ height: 350 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={trendsData}
                      margin={{ top: 20, right: 30, left: 20, bottom: 20 }}
                    >
                      <defs>
                        <linearGradient
                          id="trendGradient"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#3b82f6"
                            stopOpacity={0.8}
                          />
                          <stop
                            offset="95%"
                            stopColor="#1d4ed8"
                            stopOpacity={0.3}
                          />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis
                        dataKey="year"
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={{ stroke: "#e2e8f0" }}
                      />
                      <YAxis
                        tick={{ fontSize: 12, fill: "#64748b" }}
                        axisLine={{ stroke: "#e2e8f0" }}
                        tickLine={{ stroke: "#e2e8f0" }}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "white",
                          border: "1px solid #e2e8f0",
                          borderRadius: "8px",
                          boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
                        }}
                        formatter={(value, name) => [
                          name === "coveragePercent"
                            ? `${value}%`
                            : value.toLocaleString(),
                          name === "coveragePercent"
                            ? "Coverage"
                            : "Configurations",
                        ]}
                      />
                      <Area
                        type="monotone"
                        dataKey="coveragePercent"
                        stroke="#3b82f6"
                        strokeWidth={3}
                        fill="url(#trendGradient)"
                        fillOpacity={0.6}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </Paper>
            </Stack>
          ) : (
            <Center p="xl">
              <Stack align="center" gap="md">
                <IconAlertTriangle
                  size={48}
                  color="var(--mantine-color-orange-6)"
                />
                <Text c="dimmed" size="lg">
                  No trends data available for {selectedMake}
                </Text>
                <Text c="dimmed" size="sm">
                  Try selecting a different make or check your data.
                </Text>
              </Stack>
            </Center>
          )}
        </Modal>

        {/* Gaps Modal */}
        <Modal
          opened={gapsModalOpen}
          onClose={() => setGapsModalOpen(false)}
          title={
            <Group gap="sm">
              <IconAlertTriangle size={20} />
              <Text fw={600}>Coverage Gaps - {selectedMake}</Text>
            </Group>
          }
          size="lg"
          styles={{
            header: {
              backgroundColor: "#fef2f2",
              borderBottom: "1px solid #fecaca",
            },
            body: { padding: "24px" },
          }}
        >
          {gapsLoading ? (
            <Center p="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Loading gaps data...</Text>
              </Stack>
            </Center>
          ) : gapsData && gapsData.length > 0 ? (
            <Stack gap="md">
              <Alert
                icon={<IconAlertTriangle size={16} />}
                color="red"
                variant="light"
              >
                Models with low coverage that need attention for {selectedMake}
              </Alert>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Model</Table.Th>
                    <Table.Th>Total Configurations</Table.Th>
                    <Table.Th>Fitted Configurations</Table.Th>
                    <Table.Th>Coverage</Table.Th>
                    <Table.Th>Gap</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {gapsData.map((item, index) => (
                    <Table.Tr key={index}>
                      <Table.Td>
                        <Text fw={600} c="dark">
                          {item.model}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500}>
                          {item.totalConfigurations.toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text fw={500} c="green">
                          {item.fittedConfigurations.toLocaleString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="sm">
                          <Progress
                            value={item.coveragePercent}
                            size="md"
                            radius="xl"
                            color="red"
                            style={{ flex: 1, minWidth: 80 }}
                          />
                          <Text
                            size="sm"
                            fw={600}
                            c="red"
                            style={{ minWidth: 50 }}
                          >
                            {item.coveragePercent}%
                          </Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Badge color="red" variant="light" size="sm">
                          {item.gap.toLocaleString()}
                        </Badge>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </Stack>
          ) : (
            <Center p="xl">
              <Stack align="center" gap="md">
                <IconInfoCircle
                  size={48}
                  color="var(--mantine-color-green-6)"
                />
                <Text c="dimmed" size="lg">
                  No coverage gaps found for {selectedMake}
                </Text>
                <Text c="dimmed" size="sm">
                  All models have good coverage! 🎉
                </Text>
              </Stack>
            </Center>
          )}
        </Modal>
      </Stack>
    </div>
  );
}
