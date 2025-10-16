import React, { useState, useEffect } from "react";
import {
  Container,
  Title,
  Card,
  Button,
  Group,
  Text,
  Badge,
  Stack,
  Alert,
  Loader,
  Paper,
  Modal,
  TextInput,
  Select,
  Table,
  Grid,
  NumberInput,
  Tabs,
} from "@mantine/core";
import {
  IconRefresh,
  IconInfoCircle,
  IconDatabase,
  IconSearch,
  IconSettings,
} from "@tabler/icons-react";
import apiClient from "../api/client";
import { notifications } from "@mantine/notifications";

interface VCDBSyncLog {
  id: string;
  status: "running" | "completed" | "failed" | "partial";
  total_records_processed: number;
  records_created: number;
  records_updated: number;
  records_skipped: number;
  errors_count: number;
  started_at: string;
  completed_at?: string;
  duration_formatted?: string;
  error_message?: string;
}

interface VehicleSearchResult {
  vehicle_id: number;
  make: string;
  model: string;
  year: number;
  sub_model: string;
  drive_types: string[];
  fuel_types: string[];
  body_types: string[];
  num_doors: string[];
}

interface VCDBStats {
  last_sync?: string;
  last_sync_status?: string;
  data_counts: {
    makes: number;
    models: number;
    vehicles: number;
  };
}

const VCDBDataNew: React.FC = () => {
  const [syncLogs, setSyncLogs] = useState<VCDBSyncLog[]>([]);
  const [searchResults, setSearchResults] = useState<VehicleSearchResult[]>([]);
  const [vcdbStats, setVcdbStats] = useState<VCDBStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searching, setSearching] = useState(false);
  const [syncing, setSyncing] = useState(false);

  // Search form state
  const [searchForm, setSearchForm] = useState({
    make: "",
    model: "",
    year: null as number | null,
    sub_model: "",
    drive_type: "",
    fuel_type: "",
    body_type: "",
    num_doors: null as number | null,
  });

  // Available options for dropdowns
  const [availableMakes, setAvailableMakes] = useState<string[]>([]);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [availableDriveTypes, setAvailableDriveTypes] = useState<string[]>([]);
  const [availableFuelTypes, setAvailableFuelTypes] = useState<string[]>([]);
  const [availableBodyTypes, setAvailableBodyTypes] = useState<string[]>([]);

  const fetchSyncLogs = async () => {
    try {
      const response = await apiClient.get("/api/vcdb-data/sync-logs/");
      setSyncLogs(response.data.results || response.data);
    } catch (error) {
      console.error("Failed to fetch sync logs:", error);
    }
  };

  const fetchVCDBStats = async () => {
    try {
      const response = await apiClient.get("/api/vcdb-data/sync-logs/status/");
      setVcdbStats(response.data);
    } catch (error) {
      console.error("Failed to fetch VCDB stats:", error);
    }
  };

  const fetchAvailableOptions = async () => {
    try {
      const [makesRes, modelsRes, driveTypesRes, fuelTypesRes, bodyTypesRes] =
        await Promise.all([
          apiClient.get("/api/vcdb-data/makes/"),
          apiClient.get("/api/vcdb-data/models/"),
          apiClient.get("/api/vcdb-data/drive-types/"),
          apiClient.get("/api/vcdb-data/fuel-types/"),
          apiClient.get("/api/vcdb-data/body-types/"),
        ]);

      setAvailableMakes(
        makesRes.data.results?.map((m: any) => m.make_name) ||
          makesRes.data.map((m: any) => m.make_name) ||
          []
      );
      setAvailableModels(
        modelsRes.data.results?.map((m: any) => m.model_name) ||
          modelsRes.data.map((m: any) => m.model_name) ||
          []
      );
      setAvailableDriveTypes(
        driveTypesRes.data.results?.map((d: any) => d.drive_type_name) ||
          driveTypesRes.data.map((d: any) => d.drive_type_name) ||
          []
      );
      setAvailableFuelTypes(
        fuelTypesRes.data.results?.map((f: any) => f.fuel_type_name) ||
          fuelTypesRes.data.map((f: any) => f.fuel_type_name) ||
          []
      );
      setAvailableBodyTypes(
        bodyTypesRes.data.results?.map((b: any) => b.body_type_name) ||
          bodyTypesRes.data.map((b: any) => b.body_type_name) ||
          []
      );
    } catch (error) {
      console.error("Failed to fetch available options:", error);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchSyncLogs(),
          fetchVCDBStats(),
          fetchAvailableOptions(),
        ]);
      } catch (error) {
        setError("Failed to load VCDB data");
        notifications.show({
          title: "Error",
          message: "Failed to load VCDB data",
          color: "red",
        });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const handleTriggerSync = async () => {
    setSyncing(true);
    try {
      await apiClient.post("/api/vcdb-data/sync-logs/trigger_sync/");
      notifications.show({
        title: "Success",
        message: "VCDB sync started successfully",
        color: "green",
      });

      // Refresh data after a short delay
      setTimeout(() => {
        fetchSyncLogs();
        fetchVCDBStats();
      }, 2000);
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Failed to start VCDB sync",
        color: "red",
      });
    } finally {
      setSyncing(false);
    }
  };

  const handleSearch = async () => {
    setSearching(true);
    try {
      const response = await apiClient.post(
        "/api/vcdb-data/vehicles/search/",
        searchForm
      );
      setSearchResults(response.data);
      setShowSearchModal(false);
    } catch (error: any) {
      notifications.show({
        title: "Error",
        message: error.response?.data?.message || "Search failed",
        color: "red",
      });
    } finally {
      setSearching(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "green";
      case "failed":
        return "red";
      case "running":
        return "blue";
      case "partial":
        return "yellow";
      default:
        return "gray";
    }
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Group justify="center">
          <Loader size="lg" />
          <Text>Loading VCDB data...</Text>
        </Group>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconInfoCircle size={16} />} title="Error" color="red">
          {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <Button
              leftSection={<IconRefresh size={16} />}
              variant="outline"
              onClick={() => {
                fetchSyncLogs();
                fetchVCDBStats();
              }}
            >
              Refresh
            </Button>
            <Button
              leftSection={<IconSettings size={16} />}
              onClick={handleTriggerSync}
              loading={syncing}
              color="blue"
            >
              Trigger Sync
            </Button>
            <Button
              leftSection={<IconSearch size={16} />}
              onClick={() => setShowSearchModal(true)}
              color="green"
            >
              Search Vehicles
            </Button>
          </Group>
        </Group>

        {/* VCDB Stats */}
        {vcdbStats && (
          <Card shadow="sm" padding="md" radius="md" withBorder>
            <Title order={3} mb="md">
              VCDB Data Statistics
            </Title>
            <Grid>
              <Grid.Col span={3}>
                <Paper p="md" withBorder>
                  <Text size="sm" c="dimmed">
                    Total Makes
                  </Text>
                  <Text size="xl" fw={700}>
                    {vcdbStats.data_counts.makes}
                  </Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={3}>
                <Paper p="md" withBorder>
                  <Text size="sm" c="dimmed">
                    Total Models
                  </Text>
                  <Text size="xl" fw={700}>
                    {vcdbStats.data_counts.models}
                  </Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={3}>
                <Paper p="md" withBorder>
                  <Text size="sm" c="dimmed">
                    Total Vehicles
                  </Text>
                  <Text size="xl" fw={700}>
                    {vcdbStats.data_counts.vehicles}
                  </Text>
                </Paper>
              </Grid.Col>
              <Grid.Col span={3}>
                <Paper p="md" withBorder>
                  <Text size="sm" c="dimmed">
                    Last Sync
                  </Text>
                  <Text size="sm" fw={500}>
                    {vcdbStats.last_sync
                      ? formatDate(vcdbStats.last_sync)
                      : "Never"}
                  </Text>
                  {vcdbStats.last_sync_status && (
                    <Badge
                      color={getStatusColor(vcdbStats.last_sync_status)}
                      size="sm"
                      mt="xs"
                    >
                      {vcdbStats.last_sync_status}
                    </Badge>
                  )}
                </Paper>
              </Grid.Col>
            </Grid>
          </Card>
        )}

        <Tabs defaultValue="sync-logs">
          <Tabs.List>
            <Tabs.Tab value="sync-logs">Sync Logs</Tabs.Tab>
            <Tabs.Tab value="search-results">Search Results</Tabs.Tab>
          </Tabs.List>

          <Tabs.Panel value="sync-logs" pt="md">
            {/* Sync Logs */}
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Title order={3} mb="md">
                VCDB Sync Logs
              </Title>
              {syncLogs.length === 0 ? (
                <Paper p="xl" style={{ textAlign: "center" }}>
                  <IconDatabase
                    size={48}
                    color="#ccc"
                    style={{ margin: "0 auto 16px" }}
                  />
                  <Text c="dimmed">No sync logs found</Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Trigger a sync to see logs
                  </Text>
                </Paper>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Status</Table.Th>
                      <Table.Th>Started</Table.Th>
                      <Table.Th>Duration</Table.Th>
                      <Table.Th>Records</Table.Th>
                      <Table.Th>Created</Table.Th>
                      <Table.Th>Updated</Table.Th>
                      <Table.Th>Errors</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {syncLogs.map((log) => (
                      <Table.Tr key={log.id}>
                        <Table.Td>
                          <Badge color={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{formatDate(log.started_at)}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text size="sm">{log.duration_formatted || "-"}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text fw={500}>{log.total_records_processed}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="green">{log.records_created}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="blue">{log.records_updated}</Text>
                        </Table.Td>
                        <Table.Td>
                          <Text c="red">{log.errors_count}</Text>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </Tabs.Panel>

          <Tabs.Panel value="search-results" pt="md">
            {/* Search Results */}
            <Card shadow="sm" padding="md" radius="md" withBorder>
              <Title order={3} mb="md">
                Vehicle Search Results
              </Title>
              {searchResults.length === 0 ? (
                <Paper p="xl" style={{ textAlign: "center" }}>
                  <IconSearch
                    size={48}
                    color="#ccc"
                    style={{ margin: "0 auto 16px" }}
                  />
                  <Text c="dimmed">No search results</Text>
                  <Text size="sm" c="dimmed" mt="xs">
                    Use the search button to find vehicles
                  </Text>
                </Paper>
              ) : (
                <Table striped highlightOnHover>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Vehicle</Table.Th>
                      <Table.Th>Drive Types</Table.Th>
                      <Table.Th>Fuel Types</Table.Th>
                      <Table.Th>Body Types</Table.Th>
                      <Table.Th>Doors</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {searchResults.map((vehicle) => (
                      <Table.Tr key={vehicle.vehicle_id}>
                        <Table.Td>
                          <Stack gap={2}>
                            <Text fw={500}>
                              {vehicle.year} {vehicle.make} {vehicle.model}
                            </Text>
                            <Text size="sm" c="dimmed">
                              {vehicle.sub_model}
                            </Text>
                          </Stack>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {vehicle.drive_types.map((type, idx) => (
                              <Badge key={idx} size="sm" variant="light">
                                {type}
                              </Badge>
                            ))}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {vehicle.fuel_types.map((type, idx) => (
                              <Badge
                                key={idx}
                                size="sm"
                                variant="light"
                                color="green"
                              >
                                {type}
                              </Badge>
                            ))}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {vehicle.body_types.map((type, idx) => (
                              <Badge
                                key={idx}
                                size="sm"
                                variant="light"
                                color="blue"
                              >
                                {type}
                              </Badge>
                            ))}
                          </Group>
                        </Table.Td>
                        <Table.Td>
                          <Group gap="xs">
                            {vehicle.num_doors.map((doors, idx) => (
                              <Badge
                                key={idx}
                                size="sm"
                                variant="light"
                                color="orange"
                              >
                                {doors} doors
                              </Badge>
                            ))}
                          </Group>
                        </Table.Td>
                      </Table.Tr>
                    ))}
                  </Table.Tbody>
                </Table>
              )}
            </Card>
          </Tabs.Panel>
        </Tabs>

        {/* Search Modal */}
        <Modal
          opened={showSearchModal}
          onClose={() => setShowSearchModal(false)}
          title="Search Vehicles"
          size="lg"
        >
          <Stack gap="md">
            <Grid>
              <Grid.Col span={6}>
                <Select
                  label="Make"
                  placeholder="Select make"
                  data={availableMakes}
                  value={searchForm.make}
                  onChange={(value) =>
                    setSearchForm({ ...searchForm, make: value || "" })
                  }
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Model"
                  placeholder="Select model"
                  data={availableModels}
                  value={searchForm.model}
                  onChange={(value) =>
                    setSearchForm({ ...searchForm, model: value || "" })
                  }
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Year"
                  placeholder="Enter year"
                  value={searchForm.year || undefined}
                  onChange={(value) =>
                    setSearchForm({
                      ...searchForm,
                      year: typeof value === "number" ? value : null,
                    })
                  }
                  min={1900}
                  max={2030}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <TextInput
                  label="Sub Model"
                  placeholder="Enter sub model"
                  value={searchForm.sub_model}
                  onChange={(e) =>
                    setSearchForm({ ...searchForm, sub_model: e.target.value })
                  }
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Drive Type"
                  placeholder="Select drive type"
                  data={availableDriveTypes}
                  value={searchForm.drive_type}
                  onChange={(value) =>
                    setSearchForm({ ...searchForm, drive_type: value || "" })
                  }
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Fuel Type"
                  placeholder="Select fuel type"
                  data={availableFuelTypes}
                  value={searchForm.fuel_type}
                  onChange={(value) =>
                    setSearchForm({ ...searchForm, fuel_type: value || "" })
                  }
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  label="Body Type"
                  placeholder="Select body type"
                  data={availableBodyTypes}
                  value={searchForm.body_type}
                  onChange={(value) =>
                    setSearchForm({ ...searchForm, body_type: value || "" })
                  }
                  searchable
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <NumberInput
                  label="Number of Doors"
                  placeholder="Enter number of doors"
                  value={searchForm.num_doors || undefined}
                  onChange={(value) =>
                    setSearchForm({
                      ...searchForm,
                      num_doors: typeof value === "number" ? value : null,
                    })
                  }
                  min={0}
                  max={10}
                />
              </Grid.Col>
            </Grid>

            <Group justify="flex-end" gap="sm">
              <Button
                variant="outline"
                onClick={() => setShowSearchModal(false)}
                disabled={searching}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSearch}
                loading={searching}
                leftSection={<IconSearch size={16} />}
              >
                Search
              </Button>
            </Group>
          </Stack>
        </Modal>
      </Stack>
    </Container>
  );
};

export default VCDBDataNew;
