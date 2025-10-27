import {
  AppShell,
  Container,
  Title,
  Group,
  Stack,
  NavLink,
  Text,
  Box,
} from "@mantine/core";
import {
  IconCar,
  IconTable,
  IconDashboard,
  IconBulb,
  IconBuilding,
  // IconUpload,
  IconFile,
  // IconDatabase,
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
import Products from "./pages/Products";
import ManualFitment from "./pages/ManualFitment";
import AIFitment from "./pages/AIFitment";
import SettingsWrapper from "./pages/SettingsWrapper";
import EditEntity from "./pages/EditEntity";
import NewEntitySettings from "./pages/NewEntitySettings";
import ManageEntitiesStandalone from "./pages/ManageEntitiesStandalone";
import EditEntityStandalone from "./pages/EditEntityStandalone";
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
    label: "Dashboard",
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
  // {
  //   label: "Bulk Upload",
  //   value: "bulk-upload",
  //   path: "/bulk-upload",
  //   icon: IconUpload,
  //   color: "orange",
  // },
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
    value: "settings",
    path: "/settings",
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

    // Handle new entity settings route
    if (location.pathname.startsWith("/new-entity-settings/")) {
      return "Configure New Entity";
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
    if (currentNav) return currentNav.value;

    // Handle edit entity routes - these should be considered settings
    if (location.pathname.startsWith("/edit-entity/")) {
      return "settings";
    }

    // Handle create entity route - these should be considered settings
    if (location.pathname === "/create-entity") {
      return "settings";
    }

    // Handle new entity settings route - these should be considered settings
    if (location.pathname.startsWith("/new-entity-settings/")) {
      return "settings";
    }

    // Handle manage entities route - these should be considered settings
    if (location.pathname === "/manage-entities") {
      return "settings";
    }

    // Handle edit entity standalone route - these should be considered settings
    if (location.pathname.startsWith("/edit-entity-standalone/")) {
      return "settings";
    }

    // Default to analytics for other routes
    return "analytics";
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
        <Route path="/products" element={<Products />} />
        <Route path="/settings" element={<SettingsWrapper />} />
        <Route path="/edit-entity/:id" element={<EditEntity />} />
        <Route
          path="/new-entity-settings/:id"
          element={<NewEntitySettings />}
        />
        <Route path="/vcdb-data" element={<VCDBDataWrapper />} />
        <Route path="/custom-pcdb" element={<CustomPCDB />} />
        <Route path="*" element={<Analytics />} />
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

  // Check if we're on the standalone pages (no sidebar/topbar)
  const isManageEntitiesPage = location.pathname === "/manage-entities";
  const isEditEntityStandalonePage = location.pathname.startsWith(
    "/edit-entity-standalone/"
  );

  // Render standalone pages without AppShell
  if (isManageEntitiesPage) {
    return (
      <ProtectedRoute>
        <ManageEntitiesStandalone />
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

  if (isEditEntityStandalonePage) {
    return (
      <ProtectedRoute>
        <EditEntityStandalone />
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

  return (
    <ProtectedRoute>
      <AppShell
        header={{ height: 70, offset: false }}
        navbar={{ width: 260, breakpoint: 0 }}
        padding="0"
        style={{
          background: "#f8f9fa",
        }}
      >
        {/* Header */}
        <AppShell.Header
          style={{
            background: "#ffffff",
            borderBottom: "1px solid #e9ecef",
            boxShadow: "0 1px 3px 0 rgba(0, 0, 0, 0.04)",
            left: 260,
            width: "calc(100% - 260px)",
          }}
        >
          <Container
            size="100%"
            h="100%"
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              paddingLeft: "28px",
              paddingRight: "28px",
            }}
          >
            <Title
              order={2}
              style={{
                fontWeight: 650,
                fontSize: "20px",
                color: "#1a1a1a",
                letterSpacing: "-0.02em",
              }}
            >
              {getCurrentPageName()}
            </Title>

            <Group gap="md">
              <EntitySelector compact />
              <UserRoleToggle />
            </Group>
          </Container>
        </AppShell.Header>

        {/* Sidebar */}
        <AppShell.Navbar
          style={{
            background: "#ffffff",
            borderRight: "1px solid #e9ecef",
            height: "100vh",
            top: 0,
          }}
        >
          {/* Logo */}
          <div
            style={{
              height: "70px",
              display: "flex",
              alignItems: "center",
              paddingLeft: "20px",
              paddingRight: "20px",
              borderBottom: "1px solid #e9ecef",
            }}
          >
            <Group gap="12px" align="center">
              <div
                style={{
                  background: "#2563eb",
                  borderRadius: "8px",
                  width: "32px",
                  height: "32px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow: "0 2px 8px rgba(37, 99, 235, 0.25)",
                }}
              >
                <IconCar size={18} color="white" stroke={2.2} />
              </div>
              <div>
                <Title
                  order={4}
                  style={{
                    color: "#1a1a1a",
                    fontWeight: 650,
                    fontSize: "16px",
                    letterSpacing: "-0.015em",
                    margin: 0,
                  }}
                >
                  Fitmentpro.ai
                </Title>
              </div>
            </Group>
          </div>

          {/* Navigation */}
          <Stack gap={4} style={{ padding: "16px 12px" }}>
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
                  leftSection={<Icon size={20} stroke={isActive ? 2 : 1.75} />}
                  styles={{
                    root: {
                      borderRadius: "8px",
                      padding: "10px 12px",
                      fontWeight: isActive ? 600 : 500,
                      fontSize: "14.5px",
                      color: isActive ? "#1a1a1a" : "#4b5563",
                      backgroundColor: isActive ? "#f1f5f9" : "transparent",
                      transition: "all 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
                      border: isActive
                        ? "1px solid #e2e8f0"
                        : "1px solid transparent",
                      "&:hover": {
                        backgroundColor: isActive ? "#e2e8f0" : "#f8fafc",
                        transform: "translateX(1px)",
                      },
                    },
                    label: {
                      color: isActive ? "#1a1a1a" : "#4b5563",
                      fontWeight: isActive ? 600 : 500,
                    },
                    section: {
                      color: isActive ? "#2563eb" : "#6b7280",
                      marginRight: "12px",
                    },
                  }}
                />
              );
            })}
          </Stack>
        </AppShell.Navbar>

        {/* Main Content */}
        <AppShell.Main
          style={{
            background: "#f8f9fa",
            minHeight: "calc(100vh - 70px)",
            marginTop: "70px",
          }}
        >
          <Box style={{ padding: "28px", height: "100%" }}>
            {renderContent()}
          </Box>
        </AppShell.Main>
      </AppShell>

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
