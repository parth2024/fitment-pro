import React, { useState, useEffect } from "react";
import {
  Card,
  Grid,
  Group,
  Text,
  Stack,
  Title,
  Badge,
  SimpleGrid,
  ThemeIcon,
  RingProgress,
  Paper,
  Skeleton,
  Divider,
  Button,
} from "@mantine/core";
import {
  IconChartBar,
  IconCar,
  IconTable,
  IconUpload,
  IconBulb,
  IconTrendingUp,
  IconUsers,
  IconDatabase,
  IconRobot,
  IconChevronRight,
  IconSettings,
  IconBuilding,
  IconRefresh,
  IconInfoCircle,
  IconCheck,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useEntity } from "../hooks/useEntity";
import CoverageWrapper from "./CoverageNew/CoverageWrapper";
import MultiEntitySelector from "../components/MultiEntitySelector";

interface AnalyticsData {
  totalFitments: number;
  manualFitments: number;
  aiFitments: number;
  totalParts: number;
  totalVcdbConfigs: number;
  recentActivity: number;
  activeFitments: number;
  inactiveFitments: number;
  successRate: number;
  coveragePercentage: number;
  topMakes: Array<{ makeName: string; count: number }>;
  yearlyStats: Array<{ year: number; count: number }>;
  lastUpdated: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface NavigationShortcut {
  title: string;
  description: string;
  icon: React.ElementType;
  color: string;
  value: string;
  count?: number;
}

const Analytics: React.FC = () => {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedEntities, setSelectedEntities] = useState<string[]>([]);
  const [dataFetched, setDataFetched] = useState(false);
  const navigate = useNavigate();
  const { currentEntity } = useEntity();

  const navigationShortcuts: NavigationShortcut[] = [
    {
      title: "Upload Data",
      description: "Map uploaded data to vehicles",
      icon: IconDatabase,
      color: "cyan",
      value: "/upload-data",
    },
    // {
    //   title: "Apply Fitments",
    //   description: "Upload and apply new fitments",
    //   icon: IconCar,
    //   color: "green",
    //   value: "/apply-fitments",
    // },
    {
      title: "Manage Fitments",
      description: "View and edit existing fitments",
      icon: IconTable,
      color: "teal",
      value: "/fitments",
    },
    {
      title: "Bulk Fitments Upload",
      description: "Upload multiple fitments at once",
      icon: IconUpload,
      color: "orange",
      value: "/bulk-upload",
    },

    // {
    //   title: "Mistmatches",
    //   description: "Find mistmatches between fitments and vehicles",
    //   icon: IconAlertTriangle,
    //   color: "red",
    //   value: "/mismatches",
    // },
    {
      title: "Coverage Analytics",
      description: "Vehicle coverage analysis",
      icon: IconChartBar,
      color: "cyan",
      value: "/coverage",
    },
    {
      title: "Potential Fitments",
      description: "AI-suggested fitment opportunities",
      icon: IconBulb,
      color: "yellow",
      value: "/potential-fitments",
    },

    {
      title: "Settings",
      description: "Configure field mappings and validation rules",
      icon: IconSettings,
      color: "gray",
      value: "/settings",
    },
    {
      title: "Entity Management",
      description: "Manage entities and their settings",
      icon: IconBuilding,
      color: "gray",
      value: "/entities",
    },
  ];

  const fetchAnalyticsData = async (entityIds?: string[]) => {
    try {
      setLoading(true);

      // Fetch analytics data from the new endpoint with entity filtering
      const params =
        entityIds && entityIds.length > 0
          ? { entity_ids: entityIds.join(",") }
          : {};

      const response = await api.get("/api/analytics/dashboard/", { params });
      const analyticsData = response.data;

      setData(analyticsData);
      setDataFetched(true);
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
      // Set fallback data
      setData({
        totalFitments: 0,
        manualFitments: 0,
        aiFitments: 0,
        totalParts: 0,
        totalVcdbConfigs: 0,
        recentActivity: 0,
        activeFitments: 0,
        inactiveFitments: 0,
        successRate: 0,
        coveragePercentage: 0,
        topMakes: [],
        yearlyStats: [],
        lastUpdated: new Date().toISOString(),
      });
      setDataFetched(true);
    } finally {
      setLoading(false);
    }
  };

  // Entity selection handlers
  const handleEntitySelectionChange = (entityIds: string[]) => {
    setSelectedEntities(entityIds);
  };

  const handleDataFetch = async (entityIds: string[]) => {
    await fetchAnalyticsData(entityIds);
  };

  // Initialize with current entity if available
  useEffect(() => {
    if (currentEntity && selectedEntities.length === 0) {
      setSelectedEntities([currentEntity.id]);
    }
  }, [currentEntity]);

  // Listen for entity change events from EntitySelector
  useEffect(() => {
    const handleEntityChange = () => {
      console.log("Entity changed, refreshing Analytics data...");
      if (selectedEntities.length > 0) {
        fetchAnalyticsData(selectedEntities);
      }
    };

    // Listen for custom entity change events
    window.addEventListener("entityChanged", handleEntityChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [selectedEntities]);

  const handleNavigationClick = (path: string) => {
    // Navigate to the specified route
    navigate(path);
    // Scroll to top after navigation
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  // Show entity selection if no entities selected or data not fetched
  if (!dataFetched || selectedEntities.length === 0) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Stack gap="xl">
          {/* Welcome Header */}
          <Card
            style={{
              background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              border: "none",
              color: "white",
            }}
            p="xl"
          >
            <Group justify="space-between" align="center">
              <div>
                <Title order={1} c="white" mb="sm">
                  Analytics Dashboard
                </Title>
                <Text size="lg" c="rgba(255, 255, 255, 0.9)" mb="md">
                  Get insights into your fitments and vehicle coverage across
                  multiple entities
                </Text>
                <Group gap="sm">
                  <Badge variant="white" color="blue" size="lg">
                    Multi-Entity Analytics
                  </Badge>
                  <Badge variant="white" color="green" size="lg">
                    Real-time Data
                  </Badge>
                </Group>
              </div>
              <IconChartBar size={64} color="rgba(255, 255, 255, 0.8)" />
            </Group>
          </Card>

          {/* Entity Selection */}
          <MultiEntitySelector
            selectedEntities={selectedEntities}
            onEntitySelectionChange={handleEntitySelectionChange}
            onDataFetch={handleDataFetch}
            title="Select Entities for Analytics"
            description="Choose one or more entities to view their analytics data. You can select multiple entities to compare their performance."
            showStats={true}
          />

          {/* Instructions */}
          <Card withBorder p="lg" radius="md">
            <Stack gap="md">
              <Group gap="sm">
                <IconInfoCircle size={20} color="#3b82f6" />
                <Title order={4}>How to Use Analytics</Title>
              </Group>
              <Text size="sm" c="#64748b">
                Select one or more entities above to view their analytics data.
                The dashboard will show:
              </Text>
              <SimpleGrid cols={{ base: 1, md: 2 }} spacing="md">
                <Group gap="sm">
                  <IconCheck size={16} color="#10b981" />
                  <Text size="sm">Total fitments and parts count</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="#10b981" />
                  <Text size="sm">AI vs Manual fitment breakdown</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="#10b981" />
                  <Text size="sm">Vehicle coverage analysis</Text>
                </Group>
                <Group gap="sm">
                  <IconCheck size={16} color="#10b981" />
                  <Text size="sm">Top performing makes and models</Text>
                </Group>
              </SimpleGrid>
            </Stack>
          </Card>
        </Stack>
      </div>
    );
  }

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100vh",
        }}
      >
        <Stack gap="xl">
          {/* Key Metrics Cards Skeleton */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card
                key={`skeleton-metric-${index}`}
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                }}
                p="lg"
              >
                <Group justify="space-between">
                  <div>
                    <Skeleton height={16} width={100} mb="xs" />
                    <Skeleton height={32} width={80} />
                  </div>
                  <Skeleton height={48} width={48} radius="md" />
                </Group>
              </Card>
            ))}
          </SimpleGrid>

          {/* Fitments Breakdown Skeleton */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  height: "300px",
                }}
                p="lg"
              >
                <Stack h="100%">
                  <Skeleton height={24} width={150} mb="lg" />
                  <Group
                    justify="center"
                    gap="xl"
                    style={{ flex: 1, alignItems: "center" }}
                  >
                    <Skeleton height={120} width={120} radius="50%" />
                    <Stack gap="sm">
                      <Skeleton height={16} width={120} />
                      <Skeleton height={16} width={110} />
                    </Stack>
                  </Group>
                </Stack>
              </Card>
            </Grid.Col>

            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card
                style={{
                  background: "#ffffff",
                  border: "1px solid #e2e8f0",
                  borderRadius: "12px",
                  boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                  height: "300px",
                }}
                p="lg"
              >
                <Stack h="100%">
                  <Skeleton height={24} width={120} mb="lg" />
                  <Stack gap="lg" style={{ flex: 1, justifyContent: "center" }}>
                    {Array.from({ length: 4 }).map((_, index) => (
                      <Group key={index} justify="space-between">
                        <Group gap="sm">
                          <Skeleton height={16} width={16} radius="sm" />
                          <Skeleton height={16} width={100} />
                        </Group>
                        <Skeleton height={24} width={60} radius="sm" />
                      </Group>
                    ))}
                  </Stack>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Navigation Shortcuts Skeleton */}
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            p="lg"
          >
            <Stack gap="lg">
              <Group justify="space-between">
                <Skeleton height={28} width={180} />
                <Skeleton height={32} width={100} radius="sm" />
              </Group>

              <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
                {Array.from({ length: 8 }).map((_, index) => (
                  <Paper
                    key={`skeleton-nav-${index}`}
                    p="md"
                    style={{
                      background: "#fefefe",
                      border: "1px solid #f1f5f9",
                      borderRadius: "8px",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    }}
                  >
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <Skeleton height={32} width={32} radius="md" />
                        <Skeleton height={16} width={16} />
                      </Group>
                      <div>
                        <Skeleton height={16} width="80%" mb="xs" />
                        <Skeleton height={12} width="60%" />
                      </div>
                    </Stack>
                  </Paper>
                ))}
              </SimpleGrid>
            </Stack>
          </Card>
        </Stack>
      </div>
    );
  }

  const manualPercentage = data?.totalFitments
    ? Math.round((data.manualFitments / data.totalFitments) * 100)
    : 0;
  const aiPercentage = data?.totalFitments
    ? Math.round((data.aiFitments / data.totalFitments) * 100)
    : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
      }}
    >
      <Stack gap="xl">
        {/* Entity Selection Header */}
        <Card
          style={{
            background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
            border: "none",
            color: "white",
          }}
          p="md"
        >
          <Group justify="space-between" align="center">
            <Group gap="md">
              <IconBuilding size={24} />
              <div>
                <Text size="lg" fw={600} c="white">
                  Analytics Dashboard
                </Text>
                <Text size="sm" c="rgba(255, 255, 255, 0.8)">
                  {selectedEntities.length === 1
                    ? `Data for selected entity`
                    : `Data for ${selectedEntities.length} selected entities`}
                </Text>
              </div>
            </Group>
            <Group gap="sm">
              <Badge variant="white" color="blue" size="lg">
                {data?.totalFitments || 0} fitments
              </Badge>
              <Button
                variant="white"
                color="blue"
                size="sm"
                leftSection={<IconRefresh size={16} />}
                onClick={() => handleDataFetch(selectedEntities)}
              >
                Refresh Data
              </Button>
            </Group>
          </Group>
        </Card>

        {/* Entity Selection Controls */}
        <Card withBorder p="md" radius="md">
          <Group justify="space-between" align="center">
            <div>
              <Text size="sm" fw={600} c="#1e293b">
                Selected Entities
              </Text>
              <Text size="xs" c="#64748b">
                {selectedEntities.length} entities selected
              </Text>
            </div>
            <Button
              variant="light"
              color="blue"
              size="sm"
              onClick={() => {
                setDataFetched(false);
                setData(null);
              }}
            >
              Change Selection
            </Button>
          </Group>
        </Card>

        {/* Key Metrics Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 3 }} spacing="lg">
          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            p="lg"
          >
            <Group justify="space-between">
              <div>
                <Text size="sm" c="#64748b" fw={500}>
                  Total Fitments
                </Text>
                <Title order={2} c="#1e293b" mt="xs">
                  {data?.totalFitments?.toLocaleString() || "0"}
                </Title>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="blue">
                <IconTable size={20} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            p="lg"
          >
            <Group justify="space-between">
              <div>
                <Text size="sm" c="#64748b" fw={500}>
                  Total Parts
                </Text>
                <Title order={2} c="#1e293b" mt="xs">
                  {data?.totalParts?.toLocaleString() || "0"}
                </Title>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="green">
                <IconCar size={20} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            p="lg"
          >
            <Group justify="space-between">
              <div>
                <Text size="sm" c="#64748b" fw={500}>
                  VCDB Configs
                </Text>
                <Title order={2} c="#1e293b" mt="xs">
                  {data?.totalVcdbConfigs?.toLocaleString() || "0"}
                </Title>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="orange">
                <IconDatabase size={20} />
              </ThemeIcon>
            </Group>
          </Card>

          {/* <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
            }}
            p="lg"
          >
            <Group justify="space-between">
              <div>
                <Text size="sm" c="#64748b" fw={500}>
                  Recent Activity
                </Text>
                <Title order={2} c="#1e293b" mt="xs">
                  {data?.recentActivity?.toLocaleString() || "0"}
                </Title>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="purple">
                <IconTrendingUp size={20} />
              </ThemeIcon>
            </Group>
          </Card> */}
        </SimpleGrid>

        {/* Fitments Breakdown */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                height: "300px",
              }}
              p="lg"
            >
              <Stack h="100%">
                <Text size="lg" fw={600} c="#1e293b" mb="lg">
                  Fitments by Method
                </Text>

                <Group
                  justify="center"
                  gap="xl"
                  style={{ flex: 1, alignItems: "center" }}
                >
                  <Stack align="center">
                    <RingProgress
                      size={120}
                      thickness={12}
                      sections={[
                        { value: manualPercentage, color: "#3b82f6" },
                        { value: aiPercentage, color: "#8b5cf6" },
                      ]}
                      label={
                        <Text ta="center" fw={700} size="lg" c="#1e293b">
                          {data?.totalFitments || 0}
                        </Text>
                      }
                    />
                  </Stack>

                  <Stack gap="sm">
                    <Group gap="sm">
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: "#3b82f6",
                        }}
                      />
                      <Text size="sm" c="#64748b" fw={500}>
                        Manual: {data?.manualFitments || 0} ({manualPercentage}
                        %)
                      </Text>
                    </Group>

                    <Group gap="sm">
                      <div
                        style={{
                          width: "12px",
                          height: "12px",
                          borderRadius: "50%",
                          background: "#8b5cf6",
                        }}
                      />
                      <Text size="sm" c="#64748b" fw={500}>
                        AI-Based: {data?.aiFitments || 0} ({aiPercentage}%)
                      </Text>
                    </Group>
                  </Stack>
                </Group>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                height: "300px",
              }}
              p="lg"
            >
              <Stack h="100%">
                <Text size="lg" fw={600} c="#1e293b" mb="lg">
                  Quick Stats
                </Text>

                <Stack gap="lg" style={{ flex: 1, justifyContent: "center" }}>
                  <Group justify="space-between">
                    <Group gap="sm">
                      <IconUsers size={16} color="#3b82f6" />
                      <Text size="sm" c="#64748b" fw={500}>
                        Manual Fitments
                      </Text>
                    </Group>
                    <Badge variant="light" color="blue" size="lg">
                      {data?.manualFitments || 0}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Group gap="sm">
                      <IconRobot size={16} color="#8b5cf6" />
                      <Text size="sm" c="#64748b" fw={500}>
                        AI-Generated
                      </Text>
                    </Group>
                    <Badge variant="light" color="violet" size="lg">
                      {data?.aiFitments || 0}
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Group gap="sm">
                      <IconTrendingUp size={16} color="#10b981" />
                      <Text size="sm" c="#64748b" fw={500}>
                        Success Rate
                      </Text>
                    </Group>
                    <Badge variant="light" color="green" size="lg">
                      {data?.successRate || 0}%
                    </Badge>
                  </Group>

                  <Group justify="space-between">
                    <Group gap="sm">
                      <IconChartBar size={16} color="#f59e0b" />
                      <Text size="sm" c="#64748b" fw={500}>
                        Coverage
                      </Text>
                    </Group>
                    <Badge variant="light" color="orange" size="lg">
                      {data?.coveragePercentage || 0}%
                    </Badge>
                  </Group>
                </Stack>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Top Makes and Yearly Stats */}
        <Grid>
          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                height: "300px",
              }}
              p="lg"
            >
              <Stack h="100%">
                <Text size="lg" fw={600} c="#1e293b" mb="lg">
                  Top Makes
                </Text>

                <Stack gap="md" style={{ flex: 1, justifyContent: "center" }}>
                  {data?.topMakes && data.topMakes.length > 0 ? (
                    data.topMakes.map((make, index) => (
                      <Group key={make.makeName} justify="space-between">
                        <Group gap="sm">
                          <Text size="sm" fw={600} c="#1e293b">
                            {index + 1}.
                          </Text>
                          <Text size="sm" c="#64748b" fw={500}>
                            {make.makeName}
                          </Text>
                        </Group>
                        <Badge variant="light" color="blue" size="lg">
                          {make.count}
                        </Badge>
                      </Group>
                    ))
                  ) : (
                    <Text size="sm" c="#64748b" ta="center">
                      No data available
                    </Text>
                  )}
                </Stack>
              </Stack>
            </Card>
          </Grid.Col>

          <Grid.Col span={{ base: 12, md: 6 }}>
            <Card
              style={{
                background: "#ffffff",
                border: "1px solid #e2e8f0",
                borderRadius: "12px",
                boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
                height: "300px",
              }}
              p="lg"
            >
              <Stack h="100%">
                <Text size="lg" fw={600} c="#1e293b" mb="lg">
                  Yearly Distribution
                </Text>

                <Stack gap="md" style={{ flex: 1, justifyContent: "center" }}>
                  {data?.yearlyStats && data.yearlyStats.length > 0 ? (
                    data.yearlyStats.map((year) => (
                      <Group key={year.year} justify="space-between">
                        <Group gap="sm">
                          <Text size="sm" c="#64748b" fw={500}>
                            {year.year}
                          </Text>
                        </Group>
                        <Badge variant="light" color="teal" size="lg">
                          {year.count}
                        </Badge>
                      </Group>
                    ))
                  ) : (
                    <Text size="sm" c="#64748b" ta="center">
                      No data available
                    </Text>
                  )}
                </Stack>
              </Stack>
            </Card>
          </Grid.Col>
        </Grid>

        {/* Navigation Shortcuts */}
        <Card
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          p="lg"
        >
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Text size="xl" fw={700} c="#1e293b">
                  Quick Navigation
                </Text>
                {data?.lastUpdated && (
                  <Text size="xs" c="#64748b" mt="xs">
                    Last updated: {new Date(data.lastUpdated).toLocaleString()}
                  </Text>
                )}
              </div>
              <Badge variant="light" color="blue" size="lg">
                8 Modules
              </Badge>
            </Group>

            <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="md">
              {navigationShortcuts.map((shortcut) => {
                const Icon = shortcut.icon;
                return (
                  <Paper
                    key={shortcut.value}
                    p="md"
                    style={{
                      background: "#fefefe",
                      border: "1px solid #f1f5f9",
                      borderRadius: "8px",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                      boxShadow: "0 1px 2px rgba(0, 0, 0, 0.05)",
                    }}
                    onClick={() => handleNavigationClick(shortcut.value)}
                    className="navigation-shortcut"
                  >
                    <Stack gap="sm">
                      <Group justify="space-between">
                        <ThemeIcon
                          size={32}
                          radius="md"
                          variant="light"
                          color={shortcut.color}
                        >
                          <Icon size={16} />
                        </ThemeIcon>
                        <IconChevronRight size={16} color="#94a3b8" />
                      </Group>

                      <div>
                        <Text size="sm" fw={600} c="#1e293b">
                          {shortcut.title}
                        </Text>
                        <Text size="xs" c="#64748b">
                          {shortcut.description}
                        </Text>
                      </div>
                    </Stack>
                  </Paper>
                );
              })}
            </SimpleGrid>
          </Stack>
        </Card>

        {/* Coverage Section */}
        <Card
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          p="lg"
        >
          <Stack gap="lg">
            <Group justify="space-between">
              <div>
                <Text size="xl" fw={700} c="#1e293b">
                  Coverage Analytics
                </Text>
                <Text size="sm" c="#64748b" mt="xs">
                  Vehicle coverage analysis and fitment statistics
                </Text>
              </div>
              <Badge variant="light" color="cyan" size="lg">
                Coverage
              </Badge>
            </Group>

            <Divider />

            {/* Coverage Component */}
            <CoverageWrapper selectedEntities={selectedEntities} />
          </Stack>
        </Card>
      </Stack>

      <style>{`
        .navigation-shortcut:hover {
          background: #f8fafc !important;
          transform: translateY(-1px);
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
          border-color: #e2e8f0 !important;
        }
      `}</style>
    </div>
  );
};

export default Analytics;
