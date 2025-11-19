import {
  AppShell,
  Container,
  Title,
  Group,
  Stack,
  NavLink,
  Text,
  Box,
  ActionIcon,
} from "@mantine/core";
import {
  // IconCar,
  IconTable,
  IconDashboard,
  // IconBulb,
  IconBuilding,
  // IconUpload,
  IconFile,
  // IconDatabase,
  IconChevronDown,
  IconChevronRight,
  IconTag,
  IconFileExport,
  IconChartBar,
  // IconUpload,
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
import FitmentJobs from "./pages/FitmentJobs";
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
import { useState, useEffect } from "react";

// Navigation item types
interface NavigationChild {
  label: string;
  value: string;
  path: string;
  icon: any;
  color: string;
}

interface NavigationItem {
  label: string;
  value: string;
  path: string;
  icon: any;
  color: string;
  children?: NavigationChild[];
}

// Base navigation items that are always available
const baseNavigationItems: NavigationItem[] = [
  {
    label: "Dashboard",
    value: "analytics",
    path: "/analytics",
    icon: IconDashboard,
    color: "blue",
  },
  // {
  //   label: "Apply Fitments",
  //   value: "apply-fitments",
  //   path: "/apply-fitments",
  //   icon: IconCar,
  //   color: "green",
  // },
  {
    label: "Fitments",
    value: "fitments",
    path: "/fitments",
    icon: IconTable,
    color: "teal",
    children: [
      // {
      //   label: "History",
      //   value: "fitments-jobs",
      //   path: "/fitments/jobs",
      //   icon: IconHistory,
      //   color: "teal",
      // },
    ],
  },
  {
    label: "Products",
    value: "products",
    path: "/products",
    icon: IconFile,
    color: "purple",
  },
  {
    label: "Attributes",
    value: "attributes",
    path: "attributes",
    icon: IconTag,
    color: "purple",
  },
  // {
  // label: "Bulk Upl oad",
  // value: "bulk-upload",
  // path: "/bulk-upload",
  // icon: IconUpload,
  // color: "orange",
  // },
  // {
  //   label: "Potential Fitments",
  //   value: "potential",
  //   path: "/potential-fitments",
  //   icon: IconBulb,
  //   color: "yellow",
  // },
  {
    label: "Exports",
    value: "exports",
    path: "/exports",
    icon: IconFileExport,
    color: "yellow",
  },

  {
    label: "Insights",
    value: "insights",
    path: "/insights",
    icon: IconChartBar,
    color: "yellow",
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
  const [expandedItems, setExpandedItems] = useState<string[]>(() => {
    // Auto-expand Fitments if on fitments page or sub-page
    if (location.pathname.startsWith("/fitments")) {
      return ["fitments"];
    }
    return [];
  });

  // Auto-expand when navigating to fitments routes
  useEffect(() => {
    if (location.pathname.startsWith("/fitments")) {
      setExpandedItems((prev) =>
        prev.includes("fitments") ? prev : [...prev, "fitments"]
      );
    }
  }, [location.pathname]);

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

    // Handle Fitment Jobs route
    if (location.pathname === "/fitments/jobs") {
      return "Fitment Jobs & History";
    }

    return "Dashboard";
  };

  // Get current active tab based on route
  const getCurrentActiveTab = () => {
    const currentNav = navigationItems.find(
      (item) => item.path === location.pathname
    );
    if (currentNav) return currentNav.value;

    // Check children for nested navigation
    for (const item of navigationItems) {
      if (item.children) {
        const childNav = item.children.find(
          (child: NavigationChild) => child.path === location.pathname
        );
        if (childNav) return childNav.value;
        // If on a child route, make parent active too
        if (location.pathname.startsWith(item.path) && item.path !== "/") {
          return item.value;
        }
      }
    }

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
        <Route path="/fitments/jobs" element={<FitmentJobs />} />
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
          // path="/potential-fitments"
          path="/insights"
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
              {/* <div
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
              </div> */}
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
              const hasChildren = item.children && item.children.length > 0;
              const isExpanded = expandedItems.includes(item.value);
              const isChildActive =
                hasChildren &&
                item.children?.some(
                  (child: NavigationChild) => child.path === location.pathname
                );

              return (
                <div key={item.value}>
                  <div style={{ position: "relative" }}>
                    <NavLink
                      disabled={
                        item.label === "Exports" || item.label === "Attributes"
                      }
                      component={Link}
                      to={item.path}
                      active={isActive || isChildActive}
                      label={item.label}
                      onClick={() => {
                        // Auto-expand if has children when navigating
                        if (hasChildren) {
                          setExpandedItems((prev) =>
                            prev.includes(item.value)
                              ? prev
                              : [...prev, item.value]
                          );
                        }
                        window.scrollTo({
                          top: 0,
                          left: 0,
                          behavior: "smooth",
                        });
                      }}
                      leftSection={
                        <Icon
                          size={20}
                          stroke={isActive || isChildActive ? 2 : 1.75}
                        />
                      }
                      styles={{
                        root: {
                          borderRadius: "8px",
                          padding: "10px 12px",
                          paddingRight: hasChildren ? "36px" : "12px",
                          fontWeight: isActive || isChildActive ? 600 : 500,
                          fontSize: "14.5px",
                          color:
                            isActive || isChildActive ? "#1a1a1a" : "#4b5563",
                          backgroundColor:
                            isActive || isChildActive
                              ? "#f1f5f9"
                              : "transparent",
                          transition: "all 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
                          border:
                            isActive || isChildActive
                              ? "1px solid #e2e8f0"
                              : "1px solid transparent",
                          "&:hover": {
                            backgroundColor:
                              isActive || isChildActive ? "#e2e8f0" : "#f8fafc",
                            transform: "translateX(1px)",
                          },
                        },
                        label: {
                          color:
                            isActive || isChildActive ? "#1a1a1a" : "#4b5563",
                          fontWeight: isActive || isChildActive ? 600 : 500,
                        },
                        section: {
                          color:
                            isActive || isChildActive ? "#2563eb" : "#6b7280",
                          marginRight: "12px",
                        },
                      }}
                    />
                    {hasChildren && (
                      <ActionIcon
                        variant="subtle"
                        size="sm"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setExpandedItems((prev) =>
                            prev.includes(item.value)
                              ? prev.filter((v) => v !== item.value)
                              : [...prev, item.value]
                          );
                        }}
                        style={{
                          position: "absolute",
                          right: "8px",
                          top: "50%",
                          transform: "translateY(-50%)",
                          zIndex: 1,
                          color:
                            isActive || isChildActive ? "#2563eb" : "#6b7280",
                        }}
                      >
                        {isExpanded ? (
                          <IconChevronDown size={16} />
                        ) : (
                          <IconChevronRight size={16} />
                        )}
                      </ActionIcon>
                    )}
                  </div>
                  {hasChildren && isExpanded && (
                    <Stack
                      gap={2}
                      style={{ marginLeft: "20px", marginTop: "4px" }}
                    >
                      {item.children?.map((child: NavigationChild) => {
                        const ChildIcon = child.icon;
                        const isChildActive = child.path === location.pathname;
                        return (
                          <NavLink
                            key={child.value}
                            component={Link}
                            to={child.path}
                            active={isChildActive}
                            label={child.label}
                            onClick={() =>
                              window.scrollTo({
                                top: 0,
                                left: 0,
                                behavior: "smooth",
                              })
                            }
                            leftSection={
                              <ChildIcon
                                size={18}
                                stroke={isChildActive ? 2 : 1.5}
                              />
                            }
                            styles={{
                              root: {
                                borderRadius: "6px",
                                padding: "8px 10px",
                                fontWeight: isChildActive ? 600 : 500,
                                fontSize: "13.5px",
                                color: isChildActive ? "#1a1a1a" : "#64748b",
                                backgroundColor: isChildActive
                                  ? "#e2e8f0"
                                  : "transparent",
                                transition:
                                  "all 0.12s cubic-bezier(0.4, 0, 0.2, 1)",
                                border: isChildActive
                                  ? "1px solid #cbd5e1"
                                  : "1px solid transparent",
                                "&:hover": {
                                  backgroundColor: isChildActive
                                    ? "#cbd5e1"
                                    : "#f1f5f9",
                                  transform: "translateX(1px)",
                                },
                              },
                              label: {
                                color: isChildActive ? "#1a1a1a" : "#64748b",
                                fontWeight: isChildActive ? 600 : 500,
                              },
                              section: {
                                color: isChildActive ? "#2563eb" : "#94a3b8",
                                marginRight: "10px",
                              },
                            }}
                          />
                        );
                      })}
                    </Stack>
                  )}
                </div>
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
