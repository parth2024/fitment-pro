import React, { useState, useEffect, useCallback } from "react";
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
  Button,
  Center,
  Table,
  ScrollArea,
  // ActionIcon,
  // Tooltip,
} from "@mantine/core";
import {
  IconChartBar,
  IconCar,
  IconTable,
  IconBulb,
  IconTrendingUp,
  IconUsers,
  IconDatabase,
  IconRobot,
  IconChevronRight,
  IconBuilding,
  // IconEye,
  // IconCheck,
  // IconX,
  IconClock,
} from "@tabler/icons-react";
import { useNavigate } from "react-router-dom";
import api from "../api/client";
import { useEntity } from "../hooks/useEntity";
import CoverageWrapper from "./CoverageNew/CoverageWrapper";

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
  pendingReviewCount: number;
  topMakes: Array<{ makeName: string; count: number }>;
  yearlyStats: Array<{ year: number; count: number }>;
  lastUpdated: string;
  tenant?: {
    id: string;
    name: string;
    slug: string;
  };
}

interface PendingFitment {
  hash: string;
  partId: string;
  year: number;
  makeName: string;
  modelName: string;
  subModelName: string;
  fitmentType: string;
  createdAt: string;
  itemStatus: string; // API uses itemStatus, not status
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
  const [pendingFitments, setPendingFitments] = useState<PendingFitment[]>([]);
  const [pendingFitmentsLoading, setPendingFitmentsLoading] = useState(true);
  const [totalPendingCount, setTotalPendingCount] = useState(0);
  const [navigatingToPending, setNavigatingToPending] = useState(false);
  const navigate = useNavigate();
  const { currentEntity, loading: entityLoading } = useEntity();
  const selectedEntityIds = currentEntity ? [currentEntity.id] : [];
  const hasCheckedUrlParam = React.useRef(false);

  const navigationShortcuts: NavigationShortcut[] = [
    {
      title: "Apply Fitments",
      description: "Upload and apply new fitments",
      icon: IconCar,
      color: "green",
      value: "/bulk-upload",
    },
    {
      title: "Fitments Management",
      description: "View and manage existing fitments",
      icon: IconTable,
      color: "teal",
      value: "/fitments",
    },
    // {
    //   title: "Bulk Upload",
    //   description: "Upload and apply new fitments",
    //   icon: IconCar,
    //   color: "green",
    //   value: "/bulk-upload",
    // },
    {
      title: "Potential Fitment",
      description: "View potential fitment opportunities",
      icon: IconTrendingUp,
      color: "orange",
      value: "/potential-fitments",
    },
    {
      title: "Products",
      description: "Manage product catalog",
      icon: IconDatabase,
      color: "blue",
      value: "/products",
    },
    {
      title: "Settings",
      description: "Application settings and preferences",
      icon: IconBuilding,
      color: "gray",
      value: "/settings",
    },
  ];

  const fetchPendingFitments = useCallback(async () => {
    try {
      setPendingFitmentsLoading(true);

      const params: any = {
        fitmentType: "ai_fitment",
        itemStatus: "ReadyToApprove", // Note: API uses lowercase
        page_size: 5, // Fetch only 5 fitments for display
      };

      if (currentEntity) {
        params.entity_ids = currentEntity.id;
      }

      console.log("Fetching pending fitments with params:", params);
      const response = await api.get("/api/fitments/", { params });

      // Get total count from response
      const totalCount =
        response.data.totalCount || response.data.fitments?.length || 0;
      const fitments = response.data.fitments || [];

      console.log("Pending fitments received:", fitments);
      console.log("Total pending count:", totalCount);

      // Ensure we only display the first 5 fitments
      setPendingFitments(fitments.slice(0, 5));
      setTotalPendingCount(totalCount);
    } catch (error) {
      console.error("Failed to fetch pending fitments:", error);
      setPendingFitments([]);
      setTotalPendingCount(0);
    } finally {
      setPendingFitmentsLoading(false);
    }
  }, [currentEntity]);

  const fetchAnalyticsData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch analytics data from the new endpoint with entity filtering
      const params = currentEntity ? { entity_ids: currentEntity.id } : {};

      console.log(
        "Fetching analytics data for entity:",
        currentEntity?.name,
        currentEntity?.id
      );
      const response = await api.get("/api/analytics/dashboard/", { params });
      const analyticsData = response.data;

      console.log("Analytics data received:", analyticsData);
      setData(analyticsData);
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
        pendingReviewCount: 0,
        topMakes: [],
        yearlyStats: [],
        lastUpdated: new Date().toISOString(),
      });
    } finally {
      setLoading(false);
    }
  }, [currentEntity]);

  // Clean up URL parameter if present
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const entityIdFromUrl = urlParams.get("entity");

    if (entityIdFromUrl && !hasCheckedUrlParam.current) {
      console.log("Entity parameter found in URL:", entityIdFromUrl);
      hasCheckedUrlParam.current = true;

      // Remove the URL parameter
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete("entity");
      window.history.replaceState({}, "", newUrl.toString());
    }
  }, []);

  // Fetch analytics data whenever entity changes or is loaded
  useEffect(() => {
    if (currentEntity && !entityLoading) {
      console.log(
        "Fetching analytics for entity:",
        currentEntity.name,
        "ID:",
        currentEntity.id
      );
      fetchAnalyticsData();
      fetchPendingFitments();
    } else if (!entityLoading && !currentEntity) {
      console.log("No entity available after loading");
    } else if (entityLoading) {
      console.log("Still loading entity...");
    }
  }, [currentEntity, entityLoading, fetchAnalyticsData, fetchPendingFitments]);

  // Listen for entity change events from EntitySelector
  useEffect(() => {
    const handleEntityChange = () => {
      console.log(
        "Entity changed event received, refreshing Analytics data..."
      );
      if (currentEntity && !entityLoading) {
        fetchAnalyticsData();
        fetchPendingFitments();
      }
    };

    // Listen for custom entity change events
    window.addEventListener("entityChanged", handleEntityChange);

    // Cleanup listener on unmount
    return () => {
      window.removeEventListener("entityChanged", handleEntityChange);
    };
  }, [currentEntity, entityLoading, fetchAnalyticsData, fetchPendingFitments]);

  const handleNavigationClick = (path: string) => {
    // Navigate to the specified route
    navigate(path);
    // Scroll to top after navigation
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  };

  // Show loading state while entity is being loaded
  if (entityLoading) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Stack gap="xl">
          <Card withBorder p="xl" radius="md">
            <Center py="xl">
              <Stack align="center" gap="md">
                <Text size="lg" c="dimmed">
                  Loading entity data...
                </Text>
              </Stack>
            </Center>
          </Card>
        </Stack>
      </div>
    );
  }

  // If no entity is selected globally, show an informative placeholder
  if (!currentEntity) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Stack gap="xl">
          <Card withBorder p="xl" radius="md">
            <Center py="xl">
              <Stack align="center" gap="md">
                <Title order={3}>No entity selected</Title>
                <Text size="sm" c="#64748b">
                  Please select an entity to view analytics.
                </Text>
              </Stack>
            </Center>
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
        {/* Key Metrics Cards */}
        <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
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
                  {data?.totalFitments?.toLocaleString()}
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
                  {data?.totalParts?.toLocaleString()}
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
                  Total VCDB
                </Text>
                <Title order={2} c="#1e293b" mt="xs">
                  {data?.totalVcdbConfigs?.toLocaleString()}
                </Title>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="orange">
                <IconDatabase size={20} />
              </ThemeIcon>
            </Group>
          </Card>

          <Card
            style={{
              background: "#ffffff",
              border: "1px solid #e2e8f0",
              borderRadius: "12px",
              boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
              cursor: "pointer",
              transition: "all 0.2s ease",
            }}
            p="lg"
            onClick={() => {
              // Scroll to pending fitments section
              const section = document.getElementById(
                "pending-fitments-section"
              );
              section?.scrollIntoView({ behavior: "smooth" });
            }}
            className="pending-review-card"
          >
            <Group justify="space-between">
              <div>
                <Text size="sm" c="#64748b" fw={500}>
                  Fitments Pending for Review
                </Text>
                <Title order={2} c="#1e293b" mt="xs">
                  {totalPendingCount.toLocaleString()}
                </Title>
              </div>
              <ThemeIcon size={48} radius="md" variant="light" color="yellow">
                <IconBulb size={20} />
              </ThemeIcon>
            </Group>
          </Card>
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
          <Stack>
            <Group justify="space-between">
              <div>
                <Text size="xl" fw={700} c="#1e293b">
                  Coverage Analytics
                </Text>
                <Text size="sm" c="#64748b">
                  Vehicle coverage analysis and fitment statistics
                </Text>
              </div>
            </Group>
            {/* Coverage Component */}
            <CoverageWrapper selectedEntities={selectedEntityIds} />
          </Stack>
        </Card>

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
              </div>
              <Badge variant="light" color="blue" size="lg">
                {navigationShortcuts.length} Modules
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

        {/* Fitments Pending for Review Section */}
        <Card
          id="pending-fitments-section"
          style={{
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "12px",
            boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
          }}
          p="lg"
        >
          <Stack gap="lg">
            <Group gap="sm">
              <IconClock size={24} color="#f59e0b" />
              <div>
                <Text size="xl" fw={700} c="#1e293b">
                  Fitments Pending for Review
                </Text>
                <Text size="sm" c="#64748b">
                  Review and approve fitments waiting for validation
                </Text>
              </div>
            </Group>

            {pendingFitmentsLoading ? (
              <Stack gap="md">
                {Array.from({ length: 3 }).map((_, index) => (
                  <Group key={index} justify="space-between" p="md">
                    <div style={{ flex: 1 }}>
                      <Skeleton height={16} width="30%" mb="xs" />
                      <Skeleton height={12} width="60%" />
                    </div>
                    <Skeleton height={24} width={80} />
                  </Group>
                ))}
              </Stack>
            ) : (
              <>
                <ScrollArea mt="xs">
                  <Table
                    striped
                    highlightOnHover
                    style={{
                      minWidth: 800,
                    }}
                  >
                    <Table.Thead>
                      <Table.Tr>
                        <Table.Th>Part ID</Table.Th>
                        <Table.Th>Vehicle</Table.Th>
                        <Table.Th>Type</Table.Th>
                        <Table.Th>Created</Table.Th>
                        <Table.Th>Status</Table.Th>
                        {/* <Table.Th style={{ textAlign: "right" }}>
                          Actions
                        </Table.Th> */}
                      </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                      {pendingFitments.length > 0 ? (
                        pendingFitments.map((fitment) => (
                          <Table.Tr key={fitment.hash}>
                            <Table.Td>
                              <Text size="sm" fw={600} c="#1e293b">
                                {fitment.partId}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Text size="sm" c="#64748b">
                                {fitment.year} {fitment.makeName}{" "}
                                {fitment.modelName}
                                {fitment.subModelName &&
                                  ` ${fitment.subModelName}`}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge
                                variant="light"
                                color={
                                  fitment.fitmentType === "ai_fitment"
                                    ? "violet"
                                    : "blue"
                                }
                                size="sm"
                              >
                                {fitment.fitmentType === "ai_fitment"
                                  ? "AI"
                                  : "Manual"}
                              </Badge>
                            </Table.Td>
                            <Table.Td>
                              <Text size="xs" c="#64748b">
                                {new Date(
                                  fitment.createdAt
                                ).toLocaleDateString()}
                              </Text>
                            </Table.Td>
                            <Table.Td>
                              <Badge variant="light" color="yellow" size="sm">
                                {fitment.itemStatus}
                              </Badge>
                            </Table.Td>
                          </Table.Tr>
                        ))
                      ) : (
                        <Table.Tr>
                          <Table.Td colSpan={6}>
                            <Center py="xl">
                              <Text size="sm" c="#64748b">
                                No pending fitments for review
                              </Text>
                            </Center>
                          </Table.Td>
                        </Table.Tr>
                      )}
                    </Table.Tbody>
                  </Table>
                </ScrollArea>

                {pendingFitments.length > 0 && (
                  <Group justify="center" mt="lg">
                    <Button
                      color="blue"
                      size="md"
                      bg="#2563eb"
                      onClick={async () => {
                        try {
                          setNavigatingToPending(true);

                          // Smooth transition delay
                          await new Promise((resolve) =>
                            setTimeout(resolve, 800)
                          );

                          navigate(
                            "/fitments?fitmentType=ai_fitment&itemStatus=readyToApprove"
                          );
                        } catch (error) {
                          setNavigatingToPending(false);
                        }
                      }}
                      loading={navigatingToPending}
                      styles={{
                        root: {
                          fontWeight: 500,
                          fontSize: "14px",
                          borderRadius: "8px",
                          transition: "all 0.2s ease",
                          "&:hover": {
                            background: "#f1f5f9",
                          },
                        },
                      }}
                    >
                      View All Pending ({totalPendingCount})
                    </Button>
                  </Group>
                )}
              </>
            )}
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
        .pending-review-card:hover {
          background: #fffbeb !important;
          border-color: #fbbf24 !important;
          box-shadow: 0 4px 12px rgba(251, 191, 36, 0.15);
        }
      `}</style>
    </div>
  );
};

export default Analytics;
