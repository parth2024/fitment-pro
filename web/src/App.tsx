import { AppShell, Container, Title, Badge, Group, Stack, NavLink, Text, Avatar, Menu, Button, Flex, Box, ThemeIcon, Notification } from "@mantine/core";
import {
  IconCar,
  IconTable,
  IconUpload,
  IconChartBar,
  IconBulb,
  IconSettings,
  IconUser,
  IconLogout,
  IconBell,
  IconSearch,
  IconChevronRight,
  IconDashboard,
} from "@tabler/icons-react";
import { useState } from "react";
import ApplyFitments from "./pages/ApplyFitments";
import Fitments from "./pages/Fitments";
import BulkUpload from "./pages/BulkUpload";
import Coverage from "./pages/Coverage";
import PotentialFitments from "./pages/PotentialFitments";
import Admin from "./pages/Admin";
import UploadMap from "./pages/UploadMap";
import ReviewPublish from "./pages/ReviewPublish";

const navigationItems = [
  { label: "Apply Fitments", value: "apply", icon: IconCar, color: "blue" },
  { label: "Fitments", value: "fitments", icon: IconTable, color: "green" },
  { label: "Bulk Upload", value: "bulk", icon: IconUpload, color: "orange" },
  { label: "Upload & Map", value: "upload-map", icon: IconUpload, color: "purple" },
  { label: "Review & Publish", value: "review-publish", icon: IconTable, color: "pink" },
  { label: "Coverage Analytics", value: "coverage", icon: IconChartBar, color: "teal" },
  { label: "Potential Fitments", value: "potential", icon: IconBulb, color: "yellow" },
  { label: "Admin Panel", value: "admin", icon: IconSettings, color: "red" },
];

function App() {
  const [activeTab, setActiveTab] = useState("apply");

  const renderContent = () => {
    switch (activeTab) {
      case "apply": return <ApplyFitments />;
      case "fitments": return <Fitments />;
      case "bulk": return <BulkUpload />;
      case "upload-map": return <UploadMap />;
      case "review-publish": return <ReviewPublish />;
      case "coverage": return <Coverage />;
      case "potential": return <PotentialFitments />;
      case "admin": return <Admin />;
      default: return <ApplyFitments />;
    }
  };

  return (
    <AppShell
      header={{ height: 70 }}
      navbar={{ width: 280, breakpoint: 'sm' }}
      padding="0"
      style={{
        background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
      }}
    >
      {/* Professional Header */}
      <AppShell.Header
        style={{
          background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
          borderBottom: "1px solid #e2e8f0",
          boxShadow: "0 2px 8px rgba(0, 0, 0, 0.08)",
        }}
      >
        <Container
          size="100%"
          h="100%"
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 24px",
          }}
        >
          <Group gap="lg">
            <div
              style={{
                background: "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                borderRadius: "12px",
                padding: "8px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <IconCar size={24} color="white" />
            </div>
            <div>
              <Title
                order={3}
                style={{
                  background: "linear-gradient(135deg, #1e293b 0%, #3b82f6 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  fontWeight: 700,
                  fontSize: "22px",
                  marginBottom: "2px",
                }}
              >
                Mass Fitment Tool
              </Title>
              <Badge
                variant="gradient"
                gradient={{ from: "primary.6", to: "secondary.6", deg: 135 }}
                size="sm"
                radius="md"
                style={{ fontWeight: 600 }}
              >
                Enterprise v2.0
              </Badge>
            </div>
          </Group>

          <Group gap="md">
            <Button
              variant="subtle"
              leftSection={<IconBell size={18} />}
              style={{ fontWeight: 500 }}
            >
              Notifications
            </Button>
            
            <Menu width={200} position="bottom-end" withArrow>
              <Menu.Target>
                <Button
                  variant="subtle"
                  leftSection={
                    <Avatar
                      size={28}
                      radius="xl"
                      gradient={{ from: 'primary.6', to: 'secondary.6', deg: 135 }}
                    >
                      AD
                    </Avatar>
                  }
                  rightSection={<IconChevronRight size={14} />}
                  style={{ fontWeight: 500, padding: "8px 12px" }}
                >
                  Admin User
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item leftSection={<IconUser size={14} />}>
                  Profile Settings
                </Menu.Item>
                <Menu.Item leftSection={<IconLogout size={14} />}>
                  Sign Out
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Container>
      </AppShell.Header>

      {/* Professional Sidebar */}
      <AppShell.Navbar
        style={{
          background: "linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)",
          borderRight: "1px solid #e2e8f0",
          boxShadow: "2px 0 8px rgba(0, 0, 0, 0.06)",
        }}
      >
        <Stack gap={0} p="md">
          <Text
            size="xs"
            fw={600}
            tt="uppercase"
            c="dimmed"
            mb="sm"
            style={{ letterSpacing: "0.5px" }}
          >
            Navigation
          </Text>
          
          {navigationItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.value;
            
            return (
              <NavLink
                key={item.value}
                active={isActive}
                label={item.label}
                leftSection={
                  <ThemeIcon
                    size={32}
                    radius="lg"
                    variant={isActive ? "gradient" : "light"}
                    gradient={isActive ? { from: 'primary.6', to: 'secondary.6', deg: 135 } : undefined}
                    color={isActive ? undefined : item.color}
                  >
                    <Icon size={18} />
                  </ThemeIcon>
                }
                rightSection={
                  isActive ? (
                    <ThemeIcon size={20} radius="xl" variant="light" color="primary">
                      <IconChevronRight size={12} />
                    </ThemeIcon>
                  ) : null
                }
                onClick={() => setActiveTab(item.value)}
                style={{
                  borderRadius: "12px",
                  marginBottom: "4px",
                  padding: "12px 16px",
                  fontWeight: isActive ? 600 : 500,
                  fontSize: "14px",
                  transition: "all 0.2s ease",
                  background: isActive 
                    ? "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)"
                    : "transparent",
                  border: isActive ? "1px solid rgba(59, 130, 246, 0.2)" : "1px solid transparent",
                  "&:hover": {
                    background: isActive 
                      ? "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)"
                      : "rgba(248, 250, 252, 0.8)",
                    transform: "translateX(2px)",
                  }
                }}
              />
            );
          })}
        </Stack>

        <Box style={{ marginTop: "auto", padding: "md" }}>
          <Notification
            withCloseButton={false}
            icon={<IconDashboard size={20} />}
            title="Dashboard Ready"
            style={{
              background: "linear-gradient(135deg, rgba(34, 197, 94, 0.1) 0%, rgba(16, 185, 129, 0.1) 100%)",
              border: "1px solid rgba(34, 197, 94, 0.2)",
              borderRadius: "12px",
            }}
          >
            <Text size="xs" c="dimmed">
              All systems operational
            </Text>
          </Notification>
        </Box>
      </AppShell.Navbar>

      {/* Main Content Area */}
      <AppShell.Main
        style={{
          background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
          minHeight: "calc(100vh - 70px)",
        }}
      >
        <Box p="lg" style={{ height: "100%" }}>
          {renderContent()}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}

export default App;
