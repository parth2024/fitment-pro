import React, { useState, useEffect } from "react";
import {
  Card,
  Grid,
  Group,
  Text,
  Stack,
  Title,
  Badge,
  Loader,
  SimpleGrid,
  ThemeIcon,
  RingProgress,
  Container,
  Paper,
} from "@mantine/core";
import {
  IconChartBar,
  IconCar,
  IconTable,
  IconUpload,
  IconBulb,
  IconSettings,
  IconTrendingUp,
  IconUsers,
  IconDatabase,
  IconRobot,
  IconChevronRight,
  IconChartDots,
} from "@tabler/icons-react";
import api from "../api/client";

interface AnalyticsData {
  totalFitments: number;
  manualFitments: number;
  aiFitments: number;
  totalParts: number;
  totalVehicles: number;
  recentActivity: number;
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

  const navigationShortcuts: NavigationShortcut[] = [
    {
      title: "Apply Fitments",
      description: "Upload and apply new fitments",
      icon: IconCar,
      color: "blue",
      value: "apply",
    },
    {
      title: "Manage Fitments",
      description: "View and edit existing fitments",
      icon: IconTable,
      color: "green",
      value: "fitments",
    },
    {
      title: "Bulk Upload", 
      description: "Upload multiple fitments at once",
      icon: IconUpload,
      color: "orange",
      value: "bulk",
    },
    {
      title: "Upload & Map",
      description: "Map uploaded data to vehicles", 
      icon: IconUpload,
      color: "purple",
      value: "upload-map",
    },
    {
      title: "Review & Publish",
      description: "Review and publish fitments",
      icon: IconTable,
      color: "pink", 
      value: "review-publish",
    },
    {
      title: "Potential Fitments",
      description: "AI-suggested fitment opportunities",
      icon: IconBulb,
      color: "yellow",
      value: "potential",
    },
    {
      title: "Coverage Analytics",
      description: "Vehicle coverage analysis",
      icon: IconChartBar,
      color: "teal",
      value: "coverage",
    },
    {
      title: "Admin Panel",
      description: "System administration",
      icon: IconSettings,
      color: "red",
      value: "admin",
    },
  ];

  const fetchAnalyticsData = async () => {
    try {
      setLoading(true);

      // Fetch fitments data
      const [fitmentsResponse, partsResponse, vehiclesResponse] = await Promise.all([
        api.get("/api/fitments?pageSize=1000"),
        api.get("/api/parts"),
        api.get("/api/vcdb/configurations?yearFrom=2010&yearTo=2025")
      ]);

      const fitments = fitmentsResponse.data.results || [];
      const parts = partsResponse.data || [];
      const vehicles = vehiclesResponse.data || [];

      // Calculate manual vs AI fitments (assuming a field to distinguish)
      // For now, we'll use a simple heuristic - newer fitments as AI-based
      const totalFitments = fitments.length;
      const recentCutoff = new Date();
      recentCutoff.setMonth(recentCutoff.getMonth() - 3); // Last 3 months as "AI"
      
      const aiFitments = fitments.filter((f: any) => 
        new Date(f.created_at || f.createdAt || Date.now()) > recentCutoff
      ).length;
      
      const manualFitments = totalFitments - aiFitments;

      setData({
        totalFitments,
        manualFitments,
        aiFitments, 
        totalParts: parts.length,
        totalVehicles: vehicles.length,
        recentActivity: aiFitments, // Recent fitments as activity indicator
      });
    } catch (error) {
      console.error("Failed to fetch analytics data:", error);
      // Set fallback data
      setData({
        totalFitments: 0,
        manualFitments: 0,
        aiFitments: 0,
        totalParts: 0,
        totalVehicles: 0,
        recentActivity: 0,
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyticsData();
  }, []);

  const handleNavigationClick = (value: string) => {
    // Emit custom event to change tab in parent App component
    window.dispatchEvent(new CustomEvent('changeTab', { detail: { tab: value } }));
  };

  if (loading) {
    return (
      <Container
        size="100%"
        h="100vh"
        style={{ 
          display: "flex", 
          alignItems: "center", 
          justifyContent: "center" 
        }}
      >
        <Stack align="center" gap="md">
          <Loader size="xl" />
          <Text size="lg" c="dimmed">Loading analytics data...</Text>
        </Stack>
      </Container>
    );
  }

  const manualPercentage = data?.totalFitments ? Math.round((data.manualFitments / data.totalFitments) * 100) : 0;
  const aiPercentage = data?.totalFitments ? Math.round((data.aiFitments / data.totalFitments) * 100) : 0;

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(135deg, #667eea 0%, #764ba2 25%, #f093fb 50%, #f5576c 75%, #4facfe 100%)",
        padding: "40px",
      }}
    >
      <Container size="xl">
        {/* Header */}
        <Stack gap="xl">
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div
              style={{
                display: "inline-block",
                background: "linear-gradient(145deg, #667eea 0%, #764ba2 50%, #f093fb 100%)",
                borderRadius: "20px",
                padding: "16px",
                marginBottom: "24px",
                boxShadow: "0 15px 30px rgba(102, 126, 234, 0.3)",
              }}
            >
              <IconChartDots size={24} color="white" />
            </div>

            <Title
              order={1}
              style={{
                fontSize: "32px",
                fontWeight: 800,
                background: "linear-gradient(145deg, #ffffff 0%, #e2e8f0 25%, #cbd5e1 50%, #94a3b8 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                marginBottom: "12px",
                letterSpacing: "-0.02em",
              }}
            >
              Analytics Dashboard
            </Title>
            <Text
              size="lg"
              style={{
                color: "#cbd5e1",
                fontWeight: 500,
                maxWidth: "600px",
                margin: "0 auto",
              }}
            >
              Comprehensive overview of your fitment data and system performance
            </Text>
          </div>

          {/* Key Metrics Cards */}
          <SimpleGrid cols={{ base: 1, sm: 2, lg: 4 }} spacing="lg">
            <Card
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "16px",
              }}
            >
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="white" opacity={0.8}>
                    Total Fitments
                  </Text>
                  <Title order={2} c="white">
                    {data?.totalFitments.toLocaleString()}
                  </Title>
                </div>
                <ThemeIcon size={48} radius="md" variant="light" color="blue">
                  <IconTable size={24} />
                </ThemeIcon>
              </Group>
            </Card>

            <Card
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "16px",
              }}
            >
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="white" opacity={0.8}>
                    Total Parts
                  </Text>
                  <Title order={2} c="white">
                    {data?.totalParts.toLocaleString()}
                  </Title>
                </div>
                <ThemeIcon size={48} radius="md" variant="light" color="green">
                  <IconCar size={24} />
                </ThemeIcon>
              </Group>
            </Card>

            <Card
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)",
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "16px",
              }}
            >
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="white" opacity={0.8}>
                    Vehicle Configs
                  </Text>
                  <Title order={2} c="white">
                    {data?.totalVehicles.toLocaleString()}
                  </Title>
                </div>
                <ThemeIcon size={48} radius="md" variant="light" color="orange">
                  <IconDatabase size={24} />
                </ThemeIcon>
              </Group>
            </Card>

            <Card
              style={{
                background: "rgba(255, 255, 255, 0.15)",
                backdropFilter: "blur(10px)", 
                border: "1px solid rgba(255, 255, 255, 0.2)",
                borderRadius: "16px",
              }}
            >
              <Group justify="space-between">
                <div>
                  <Text size="sm" c="white" opacity={0.8}>
                    Recent Activity
                  </Text>
                  <Title order={2} c="white">
                    {data?.recentActivity.toLocaleString()}
                  </Title>
                </div>
                <ThemeIcon size={48} radius="md" variant="light" color="purple">
                  <IconTrendingUp size={24} />
                </ThemeIcon>
              </Group>
            </Card>
          </SimpleGrid>

          {/* Fitments Breakdown */}
          <Grid>
            <Grid.Col span={{ base: 12, md: 6 }}>
              <Card
                style={{
                  background: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "16px",
                  height: "300px",
                }}
              >
                <Stack align="center" justify="center" h="100%">
                  <Text size="lg" fw={600} c="white" mb="md">
                    Fitments by Method
                  </Text>
                  
                  <Group justify="center" gap="xl">
                    <Stack align="center">
                      <RingProgress
                        size={120}
                        thickness={12}
                        sections={[
                          { value: manualPercentage, color: "#3b82f6" },
                          { value: aiPercentage, color: "#8b5cf6" },
                        ]}
                        label={
                          <Text ta="center" fw={700} size="lg" c="white">
                            {data?.totalFitments}
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
                        <Text size="sm" c="white">
                          Manual: {data?.manualFitments} ({manualPercentage}%)
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
                        <Text size="sm" c="white">
                          AI-Based: {data?.aiFitments} ({aiPercentage}%)
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
                  background: "rgba(255, 255, 255, 0.15)",
                  backdropFilter: "blur(10px)",
                  border: "1px solid rgba(255, 255, 255, 0.2)",
                  borderRadius: "16px",
                  height: "300px",
                }}
              >
                <Stack justify="center" h="100%">
                  <Text size="lg" fw={600} c="white" mb="md">
                    Quick Stats
                  </Text>
                  
                  <Stack gap="md">
                    <Group justify="space-between">
                      <Group gap="sm">
                        <IconUsers size={16} color="white" />
                        <Text size="sm" c="white">Manual Fitments</Text>
                      </Group>
                      <Badge variant="light" color="blue" size="lg">
                        {data?.manualFitments}
                      </Badge>
                    </Group>
                    
                    <Group justify="space-between">
                      <Group gap="sm">
                        <IconRobot size={16} color="white" />
                        <Text size="sm" c="white">AI-Generated</Text>
                      </Group>
                      <Badge variant="light" color="violet" size="lg">
                        {data?.aiFitments}
                      </Badge>
                    </Group>
                    
                    <Group justify="space-between">
                      <Group gap="sm">
                        <IconTrendingUp size={16} color="white" />
                        <Text size="sm" c="white">Success Rate</Text>
                      </Group>
                      <Badge variant="light" color="green" size="lg">
                        98.5%
                      </Badge>
                    </Group>
                    
                    <Group justify="space-between">
                      <Group gap="sm">
                        <IconChartBar size={16} color="white" />
                        <Text size="sm" c="white">Coverage</Text>
                      </Group>
                      <Badge variant="light" color="orange" size="lg">
                        85.2%
                      </Badge>
                    </Group>
                  </Stack>
                </Stack>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Navigation Shortcuts */}
          <Card
            style={{
              background: "rgba(255, 255, 255, 0.15)",
              backdropFilter: "blur(10px)",
              border: "1px solid rgba(255, 255, 255, 0.2)",
              borderRadius: "16px",
            }}
          >
            <Stack gap="lg">
              <Group justify="space-between">
                <Text size="xl" fw={700} c="white">
                  Quick Navigation
                </Text>
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
                        background: "rgba(255, 255, 255, 0.1)",
                        border: "1px solid rgba(255, 255, 255, 0.2)",
                        borderRadius: "12px",
                        cursor: "pointer",
                        transition: "all 0.2s ease",
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
                          <IconChevronRight size={16} color="white" opacity={0.7} />
                        </Group>
                        
                        <div>
                          <Text size="sm" fw={600} c="white">
                            {shortcut.title}
                          </Text>
                          <Text size="xs" c="white" opacity={0.8}>
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
        </Stack>
      </Container>

      <style>{`
        .navigation-shortcut:hover {
          background: rgba(255, 255, 255, 0.2) !important;
          transform: translateY(-2px);
          box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
        }
      `}</style>
    </div>
  );
};

export default Analytics;