import {
  AppShell,
  Container,
  Title,
  Group,
  Stack,
  NavLink,
  Text,
  Box,
  ThemeIcon,
} from "@mantine/core";
import {
  IconCar,
  IconTable,
  IconChevronRight,
  IconDashboard,
  IconBulb,
  IconBuilding,
  IconUpload,
  IconFile,
} from "@tabler/icons-react";
import {
  Routes,
  Route,
  useLocation,
  useNavigate,
  useParams,
  Link,
} from "react-router-dom";
import Analytics from "./pages/Analytics";
import ApplyFitments from "./pages/ApplyFitments";
import Fitments from "./pages/Fitments";
import EditFitment from "./pages/EditFitment";
import BulkUpload from "./pages/BulkUpload";
import CoverageNew from "./pages/CoverageNew/CoverageWrapper";
import PotentialFitmentsBootstrap from "./pages/PotentialFitmentsBootstrap";
import Mismatches from "./pages/Mismatches";
import Admin from "./pages/Admin";
import UploadMap from "./pages/UploadMap";
import ReviewPublish from "./pages/ReviewPublish";
import UploadData from "./pages/UploadData";
import ManualFitment from "./pages/ManualFitment";
import AIFitment from "./pages/AIFitment";
import Settings from "./pages/Settings";
import EntityManagement from "./pages/EntityManagement";
import EditEntity from "./pages/EditEntity";
import CreateEntity from "./pages/CreateEntity";
import CustomPCDB from "./pages/CustomPCDB";
import VCDBData from "./pages/VCDBData";
import ProtectedRoute from "./components/ProtectedRoute";
import EntitySelector from "./components/EntitySelector";
import UserRoleToggle from "./components/UserRoleToggle";
import { useAuth } from "./contexts/AuthContext";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

// Base navigation items that are always available
const baseNavigationItems = [
  {
    label: "Analytics",
    value: "analytics",
    path: "/analytics",
    icon: IconDashboard,
    color: "blue",
  },
  {
    label: "Apply Fitments",
    value: "apply-fitments",
    path: "/apply-fitments",
    icon: IconCar,
    color: "green",
  },
  {
    label: "Fitments",
    value: "fitments",
    path: "/fitments",
    icon: IconTable,
    color: "teal",
  },
  {
    label: "Bulk Upload",
    value: "bulk-upload",
    path: "/bulk-upload",
    icon: IconUpload,
    color: "orange",
  },
  {
    label: "Potential Fitments",
    value: "potential",
    path: "/potential-fitments",
    icon: IconBulb,
    color: "yellow",
  },
  {
    label: "Products",
    value: "products",
    path: "/products",
    icon: IconFile,
    color: "purple",
  },

  {
    label: "Settings",
    value: "entities",
    path: "/entities",
    icon: IconBuilding,
    color: "violet",
  },
];

// Admin-only navigation items
const adminNavigationItems: any = [
  // {
  //   label: "VCDB Data",
  //   value: "vcdb-data",
  //   path: "/vcdb-data",
  //   icon: IconDatabase,
  //   color: "cyan",
  // },
];

// Function to get navigation items based on user role
const getNavigationItems = (isAdmin: boolean) => {
  if (isAdmin) {
    return [...baseNavigationItems, ...adminNavigationItems];
  }
  return baseNavigationItems;
};

function App() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Get navigation items based on user role
  const navigationItems = user
    ? getNavigationItems(user.is_admin)
    : baseNavigationItems;

  // Get current page name for header based on current route
  const getCurrentPageName = () => {
    const currentNav = navigationItems.find(
      (item) => item.path === location.pathname
    );
    if (currentNav) return currentNav.label;

    // Handle edit fitment route
    if (location.pathname.startsWith("/edit-fitment/")) {
      return "Edit Fitment";
    }

    // Handle edit entity route
    if (location.pathname.startsWith("/edit-entity/")) {
      return "Edit Entity";
    }

    // Handle create entity route
    if (location.pathname === "/create-entity") {
      return "Create Entity";
    }

    // Handle VCDB Data route
    if (location.pathname === "/vcdb-data") {
      return "VCDB Data";
    }

    return "Dashboard";
  };

  // Get current active tab based on route
  const getCurrentActiveTab = () => {
    const currentNav = navigationItems.find(
      (item) => item.path === location.pathname
    );
    return currentNav ? currentNav.value : "entities";
  };

  const renderContent = () => {
    return (
      <Routes>
        <Route path="/" element={<Analytics />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/upload-data" element={<UploadData />} />
        <Route path="/apply-fitments" element={<ApplyFitments />} />
        <Route path="/fitments" element={<Fitments />} />
        <Route
          path="/edit-fitment/:fitmentHash"
          element={<EditFitmentWrapper />}
        />
        <Route path="/bulk-upload" element={<BulkUpload />} />
        <Route path="/upload-map" element={<UploadMap />} />
        <Route path="/manual-fitment" element={<ManualFitment />} />
        <Route path="/ai-fitment" element={<AIFitment />} />
        <Route path="/review-publish" element={<ReviewPublish />} />
        <Route path="/coverage" element={<CoverageNew />} />
        <Route
          path="/potential-fitments"
          element={<PotentialFitmentsBootstrap />}
        />
        <Route path="/admin" element={<Admin />} />
        <Route path="/mismatches" element={<Mismatches />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/entities" element={<EntityManagement />} />
        <Route path="/create-entity" element={<CreateEntity />} />
        <Route path="/edit-entity/:id" element={<EditEntity />} />
        <Route path="/vcdb-data" element={<VCDBDataWrapper />} />
        <Route path="/custom-pcdb" element={<CustomPCDB />} />
        <Route path="*" element={<EntityManagement />} />
      </Routes>
    );
  };

  // Wrapper component for EditFitment to handle navigation
  const EditFitmentWrapper = () => {
    const { fitmentHash } = useParams<{ fitmentHash: string }>();
    return (
      <EditFitment
        fitmentHash={fitmentHash || ""}
        onBack={() => navigate("/fitments")}
      />
    );
  };

  // Wrapper component for VCDBData to check admin access
  const VCDBDataWrapper = () => {
    if (!user?.is_admin) {
      return (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            height: "400px",
            textAlign: "center",
          }}
        >
          <div>
            <Title order={3} mb="md">
              Access Denied
            </Title>
            <Text c="dimmed">VCDB Data is only accessible to Admin users.</Text>
          </div>
        </div>
      );
    }
    return <VCDBData />;
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
              <EntitySelector compact />
              <UserRoleToggle />
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
              const isActive = getCurrentActiveTab() === item.value;

              return (
                <NavLink
                  key={item.value}
                  component={Link}
                  to={item.path}
                  active={isActive}
                  label={item.label}
                  onClick={() =>
                    window.scrollTo({ top: 0, left: 0, behavior: "smooth" })
                  }
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

      {/* Toast Container */}
      <ToastContainer
        position="top-right"
        autoClose={5000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </ProtectedRoute>
  );
}

export default App;
