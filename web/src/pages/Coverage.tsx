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
} from "@mantine/core";
import {
  IconChartBar,
  IconDownload,
  IconRefresh,
  IconCar,
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
} from "recharts";

export default function Coverage() {
  const [yearFrom, setYearFrom] = useState(2020);
  const [yearTo, setYearTo] = useState(2025);
  const [sortBy, setSortBy] = useState("make");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const { data, loading, error, refetch } = useApi<{
    items: any[];
    totalCount: number;
  }>(
    () => fitmentsService.getCoverage({ yearFrom, yearTo, sortBy, sortOrder }),
    [yearFrom, yearTo, sortBy, sortOrder]
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

  const handleExport = () => {
    const params = new URLSearchParams({
      yearFrom: String(yearFrom),
      yearTo: String(yearTo),
      sortBy,
      sortOrder,
    });
    window.location.href = `http://localhost:8000/api/fitments/coverage/export?${params.toString()}`;
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
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={2}>Coverage Analysis</Title>
              <Text c="dimmed">
                Analyze fitment coverage across vehicle configurations
              </Text>
            </div>
            <Button
              leftSection={<IconDownload size={16} />}
              variant="light"
              onClick={handleExport}
            >
              Export Report
            </Button>
          </Group>

          <Group>
            <NumberInput
              label="Year From"
              value={yearFrom}
              onChange={(val) =>
                setYearFrom(typeof val === "number" ? val : 2020)
              }
              min={2010}
              max={2030}
              w={120}
            />
            <NumberInput
              label="Year To"
              value={yearTo}
              onChange={(val) =>
                setYearTo(typeof val === "number" ? val : 2025)
              }
              min={2010}
              max={2030}
              w={120}
            />
            <Button
              leftSection={<IconRefresh size={16} />}
              mt={25}
              onClick={() => refetch()}
            >
              Update Analysis
            </Button>
          </Group>
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
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Coverage by Make
          </Title>
          <div style={{ height: 400 }}>
            {error && <Text c="red">{error}</Text>}
            {loading && <Text>Loading...</Text>}
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={coverageItems}
                margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="make" />
                <YAxis />
                <Tooltip
                  formatter={(value, name) => [
                    name === "coveragePercent" ? `${value}%` : value,
                    name === "coveragePercent"
                      ? "Coverage"
                      : name === "fittedConfigsCount"
                      ? "Fitted"
                      : "Total",
                  ]}
                />
                <Bar
                  dataKey="configsCount"
                  fill="#E5E7EB"
                  name="Total Configurations"
                />
                <Bar dataKey="fittedConfigsCount" name="Fitted Configurations">
                  {coverageItems.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={getBarColor(entry.coveragePercent)}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Detailed Table */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <Title order={3}>Detailed Coverage Report</Title>
            <Group>
              <Select
                placeholder="Sort by"
                value={sortBy}
                onChange={(value) => setSortBy(value || "make")}
                data={[
                  { value: "make", label: "Make" },
                  { value: "coveragePercent", label: "Coverage %" },
                  { value: "configsCount", label: "Total Configs" },
                  { value: "fittedConfigsCount", label: "Fitted Configs" },
                ]}
                w={150}
              />
              <Select
                value={sortOrder}
                onChange={(value) => setSortOrder(value as "asc" | "desc")}
                data={[
                  { value: "asc", label: "Ascending" },
                  { value: "desc", label: "Descending" },
                ]}
                w={120}
              />
            </Group>
          </Group>

          <Table striped highlightOnHover>
            <Table.Thead>
              <Table.Tr>
                <Table.Th>Make</Table.Th>
                <Table.Th>Models</Table.Th>
                <Table.Th>Total Configurations</Table.Th>
                <Table.Th>Fitted Configurations</Table.Th>
                <Table.Th>Coverage</Table.Th>
                <Table.Th>Status</Table.Th>
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
                      {row.models.join(", ")}
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
                </Table.Tr>
              ))}
            </Table.Tbody>
          </Table>
        </Card>
      </Stack>
    </div>
  );
}
