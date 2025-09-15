import {
  AppShell,
  Container,
  Title,
  Group,
  Stack,
  NavLink,
  Text,
  Avatar,
  Menu,
  Button,
  Box,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCar,
  IconTable,
  IconUser,
  IconLogout,
  IconChevronRight,
  IconDashboard,
  IconDatabase,
  IconChartBar,
  IconBulb,
  IconAlertTriangle,
  IconUpload,
} from "@tabler/icons-react";
import { useState, useEffect } from "react";
import Analytics from "./pages/Analytics";
import ApplyFitments from "./pages/ApplyFitments";
import Fitments from "./pages/Fitments";
import EditFitment from "./pages/EditFitment";
import BulkUpload from "./pages/BulkUpload";
import Coverage from "./pages/Coverage";
import PotentialFitments from "./pages/PotentialFitments";
import Mismatches from "./pages/Mismatches";
import Admin from "./pages/Admin";
import UploadMap from "./pages/UploadMap";
import ReviewPublish from "./pages/ReviewPublish";
import UploadData from "./pages/UploadData";
import ManualFitment from "./pages/ManualFitment";
import AIFitment from "./pages/AIFitment";
import ProtectedRoute from "./components/ProtectedRoute";
import { useAuth } from "./contexts/AuthContext";
import { useProfessionalToast } from "./hooks/useProfessionalToast";

const navigationItems = [
  {
    label: "Analytics",
    value: "analytics",
    icon: IconDashboard,
    color: "blue",
  },

  {
    label: "Upload Data",
    value: "upload-data",
    icon: IconDatabase,
    color: "cyan",
  },
  { label: "Apply Fitments", value: "apply", icon: IconCar, color: "green" },
  { label: "Fitments", value: "fitments", icon: IconTable, color: "teal" },
  { label: "Bulk Upload", value: "bulk", icon: IconUpload, color: "orange" },
  // {
  //   label: "Upload & Map",
  //   value: "upload-map",
  //   icon: IconUpload,
  //   color: "purple",
  // },
  // {
  //   label: "Manual Fitment",
  //   value: "manual-fitment",
  //   icon: IconFileText,
  //   color: "indigo",
  // },
  // {
  //   label: "AI Fitment",
  //   value: "ai-fitment",
  //   icon: IconBrain,
  //   color: "violet",
  // },
  // {
  //   label: "Review & Publish",
  //   value: "review-publish",
  //   icon: IconTable,
  //   color: "pink",
  // },
  {
    label: "Mismatches(Beta)",
    value: "mismatches",
    icon: IconAlertTriangle,
    color: "red",
  },
  {
    label: "Coverage",
    value: "coverage",
    icon: IconChartBar,
    color: "cyan",
  },
  {
    label: "Potential Fitments",
    value: "potential",
    icon: IconBulb,
    color: "yellow",
  },
  // { label: "Admin Panel", value: "admin", icon: IconSettings, color: "red" },
];

function App() {
  const [activeTab, setActiveTab] = useState("analytics");
  const [editFitmentHash, setEditFitmentHash] = useState<string | null>(null);
  const { user, logout } = useAuth();
  const { showSuccess } = useProfessionalToast();

  // Get current page name for header
  const getCurrentPageName = () => {
    const currentNav = navigationItems.find((item) => item.value === activeTab);
    return currentNav ? currentNav.label : "Dashboard";
  };

  // Add event listener for navigation changes from components
  useEffect(() => {
    const handleTabChange = (event: CustomEvent) => {
      setActiveTab(event.detail.tab);
    };

    const handleEditFitment = (event: CustomEvent) => {
      setEditFitmentHash(event.detail.fitmentHash);
      setActiveTab("edit-fitment");
    };

    window.addEventListener("changeTab", handleTabChange as EventListener);
    window.addEventListener("editFitment", handleEditFitment as EventListener);

    return () => {
      window.removeEventListener("changeTab", handleTabChange as EventListener);
      window.removeEventListener(
        "editFitment",
        handleEditFitment as EventListener
      );
    };
  }, []);

  // Handle sign out
  const handleSignOut = () => {
    logout();
    showSuccess("You have been signed out successfully.");
  };

  const renderContent = () => {
    switch (activeTab) {
      case "analytics":
        return <Analytics />;
      case "apply":
        return <ApplyFitments />;
      case "fitments":
        return <Fitments />;
      case "edit-fitment":
        return editFitmentHash ? (
          <EditFitment
            fitmentHash={editFitmentHash}
            onBack={() => setActiveTab("fitments")}
          />
        ) : (
          <Fitments />
        );
      case "bulk":
        return <BulkUpload />;
      case "upload-map":
        return <UploadMap />;
      case "upload-data":
        return <UploadData />;
      case "manual-fitment":
        return <ManualFitment />;
      case "ai-fitment":
        return <AIFitment />;
      case "review-publish":
        return <ReviewPublish />;
      case "coverage":
        return <Coverage />;
      case "potential":
        return <PotentialFitments />;
      case "admin":
        return <Admin />;
      case "mismatches":
        return <Mismatches />;
      default:
        return <Analytics />;
    }
  };

  return (
    <ProtectedRoute>
      <AppShell
        header={{ height: 90, offset: false }}
        navbar={{ width: 280, breakpoint: 0 }}
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
            left: 280,
            width: "calc(100% - 280px)",
          }}
        >
          <Container
            size="100%"
            h="100%"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: "32px",
              paddingRight: "32px",
            }}
          >
            <div>
              <Title
                order={2}
                style={{
                  fontWeight: 700,
                  fontSize: "24px",
                  lineHeight: 1.2,
                  color: "#475569",
                }}
              >
                {getCurrentPageName()}
              </Title>
            </div>

            <Group gap="md">
              <Menu width={200} position="bottom-end" withArrow>
                <Menu.Target>
                  <Button
                    variant="subtle"
                    size="sm"
                    leftSection={
                      <Avatar
                        size={24}
                        radius="xl"
                        gradient={{
                          from: "primary.6",
                          to: "secondary.6",
                          deg: 135,
                        }}
                      >
                        AD
                      </Avatar>
                    }
                    rightSection={<IconChevronRight size={16} />}
                    style={{ fontWeight: 500 }}
                  >
                    {user?.name || "Admin User"}
                  </Button>
                </Menu.Target>
                <Menu.Dropdown>
                  <Menu.Item leftSection={<IconUser size={16} />}>
                    Profile Settings
                  </Menu.Item>
                  <Menu.Item
                    leftSection={<IconLogout size={16} />}
                    onClick={handleSignOut}
                  >
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
            height: "100vh",
            top: 0,
          }}
        >
          {/* Logo Section */}
          <div
            style={{
              height: "90px",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-start",
              borderBottom: "1px solid #e2e8f0",
              background: "linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)",
              paddingLeft: "38px",
              paddingRight: "16px",
            }}
          >
            <Group gap="sm" align="center">
              <div
                style={{
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)",
                  borderRadius: "6px",
                  padding: "4px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  width: "30px",
                  height: "30px",
                }}
              >
                <IconCar size={18} color="white" />
              </div>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "center",
                  gap: "2px",
                }}
              >
                <Title
                  order={4}
                  style={{
                    color: "#475569",
                    fontWeight: 700,
                    fontSize: "16px",
                    lineHeight: 1.2,
                    margin: 0,
                  }}
                >
                  Fitmentpro.ai
                </Title>
                <Text
                  size="xs"
                  c="dimmed"
                  style={{
                    fontWeight: 500,
                    fontSize: "11px",
                    lineHeight: 1,
                    margin: 0,
                  }}
                >
                  v2.0
                </Text>
              </div>
            </Group>
          </div>

          {/* Navigation Section */}
          <Stack gap={0} style={{ padding: "16px" }}>
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
                      size={28}
                      radius="md"
                      variant={isActive ? "gradient" : "light"}
                      gradient={
                        isActive
                          ? { from: "primary.6", to: "secondary.6", deg: 135 }
                          : undefined
                      }
                      color={isActive ? undefined : item.color}
                    >
                      <Icon size={16} />
                    </ThemeIcon>
                  }
                  rightSection={
                    isActive ? (
                      <ThemeIcon
                        size={20}
                        radius="xl"
                        variant="light"
                        color="primary"
                      >
                        <IconChevronRight size={14} />
                      </ThemeIcon>
                    ) : null
                  }
                  onClick={() => setActiveTab(item.value)}
                  style={{
                    borderRadius: "12px",
                    marginBottom: "4px",
                    paddingTop: "12px",
                    paddingBottom: "12px",
                    paddingLeft: "16px",
                    paddingRight: "16px",
                    fontWeight: isActive ? 600 : 500,
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    background: isActive
                      ? "linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, rgba(139, 92, 246, 0.1) 100%)"
                      : "transparent",
                    border: isActive
                      ? "1px solid rgba(59, 130, 246, 0.2)"
                      : "1px solid transparent",
                    "&:hover": {
                      background: isActive
                        ? "linear-gradient(135deg, rgba(59, 130, 246, 0.15) 0%, rgba(139, 92, 246, 0.15) 100%)"
                        : "rgba(248, 250, 252, 0.8)",
                      transform: "translateX(2px)",
                    },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Navbar>

        {/* Main Content Area */}
        <AppShell.Main
          style={{
            background: "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
            minHeight: "calc(100vh - 90px)",
            marginTop: "90px",
          }}
        >
          <Box style={{ padding: "32px", height: "100%" }}>
            {renderContent()}
          </Box>
        </AppShell.Main>
      </AppShell>
    </ProtectedRoute>
  );
}

export default App;
