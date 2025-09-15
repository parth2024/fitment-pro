import { useState, useEffect } from "react";
import {
  Table,
  Badge,
  Button,
  Select,
  Checkbox,
  Text,
  Group,
  Flex,
  Progress,
  Stack,
  Alert,
  Loader,
  Center,
} from "@mantine/core";
import {
  dataUploadService,
  PotentiallyMissingConfiguration,
} from "../api/services";

interface PotentialConfigsTableProps {
  partId: string;
  method: "similarity" | "base-vehicle";
  onError: (error: any) => void;
  onSuccess: (message: string) => void;
  triggerAnalysis?: boolean;
  onMethodChange?: (method: "similarity" | "base-vehicle") => void;
}

export function PotentialConfigsTable({
  partId,
  method,
  onError,
  onSuccess,
  triggerAnalysis = false,
  onMethodChange,
}: PotentialConfigsTableProps) {
  const [configurations, setConfigurations] = useState<
    PotentiallyMissingConfiguration[]
  >([]);
  const [loading, setLoading] = useState(false);
  const [selectedConfigs, setSelectedConfigs] = useState<Set<string>>(
    new Set()
  );
  const [applying, setApplying] = useState(false);
  const [localTriggerAnalysis, setLocalTriggerAnalysis] =
    useState(triggerAnalysis);

  // Update local trigger when prop changes
  useEffect(() => {
    setLocalTriggerAnalysis(triggerAnalysis);
  }, [triggerAnalysis]);

  // Fetch recommendations only when triggerAnalysis is true
  useEffect(() => {
    if (!partId || !localTriggerAnalysis) return;

    const fetchRecommendations = async () => {
      setLoading(true);
      try {
        const data = await dataUploadService.getPotentialFitments(
          partId,
          method
        );
        if (data.data.length === 0 && method === "similarity") {
          // Fallback to base-vehicle method if similarity returns no results
          const fallbackData = await dataUploadService.getPotentialFitments(
            partId,
            "base-vehicle"
          );
          setConfigurations(
            fallbackData.data.sort(
              (
                a: PotentiallyMissingConfiguration,
                b: PotentiallyMissingConfiguration
              ) => b.relevance - a.relevance
            )
          );
        } else {
          setConfigurations(
            data.data.sort(
              (
                a: PotentiallyMissingConfiguration,
                b: PotentiallyMissingConfiguration
              ) => b.relevance - a.relevance
            )
          );
        }
        setSelectedConfigs(new Set()); // Clear selections
      } catch (error) {
        onError(error);
      } finally {
        setLoading(false);
      }
    };

    fetchRecommendations();
  }, [partId, method, localTriggerAnalysis, onError]);

  // Reset triggerAnalysis after it's been used
  useEffect(() => {
    if (localTriggerAnalysis) {
      setLocalTriggerAnalysis(false);
    }
  }, [localTriggerAnalysis]);

  const handleConfigSelect = (configId: string, selected: boolean) => {
    const newSelected = new Set(selectedConfigs);
    if (selected) {
      newSelected.add(configId);
    } else {
      newSelected.delete(configId);
    }
    setSelectedConfigs(newSelected);
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedConfigs(new Set(configurations.map((c) => c.id)));
    } else {
      setSelectedConfigs(new Set());
    }
  };

  const handleApplySelected = async () => {
    if (selectedConfigs.size === 0) return;

    // const selectedConfigurations = configurations.filter((c) =>
    //   selectedConfigs.has(c.id)
    // );

    try {
      setApplying(true);

      // Apply fitment to all selected configurations
      const response = await dataUploadService.applyPotentialFitments({
        partId,
        configurationIds: Array.from(selectedConfigs),
        title: `AI Recommended Fitment`,
        description: `Recommended based on ${method} method`,
        quantity: 1,
      });

      onSuccess(
        `Successfully applied fitments to ${response.data.created} configurations!`
      );
      setSelectedConfigs(new Set());

      // Refresh recommendations
      setLoading(true);
      try {
        const data = await dataUploadService.getPotentialFitments(
          partId,
          method
        );
        setConfigurations(
          data.data.sort(
            (
              a: PotentiallyMissingConfiguration,
              b: PotentiallyMissingConfiguration
            ) => b.relevance - a.relevance
          )
        );
      } catch (error) {
        onError(error);
      } finally {
        setLoading(false);
      }
    } catch (error) {
      onError(error);
    } finally {
      setApplying(false);
    }
  };

  // const getRelevanceBadge = (relevance: number) => {
  //   if (relevance >= 80)
  //     return (
  //       <Badge color="green" variant="light">
  //         {relevance}%
  //       </Badge>
  //     );
  //   if (relevance >= 60)
  //     return (
  //       <Badge color="yellow" variant="light">
  //         {relevance}%
  //       </Badge>
  //     );
  //   return (
  //     <Badge color="orange" variant="light">
  //       {relevance}%
  //     </Badge>
  //   );
  // };

  const getRelevanceLabel = (relevance: number) => {
    if (relevance >= 80) return "Excellent Match";
    if (relevance >= 60) return "Good Match";
    if (relevance >= 40) return "Fair Match";
    return "Poor Match";
  };

  if (loading) {
    return (
      <Center p="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text>Loading AI recommendations...</Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap="md">
      <Flex justify="space-between" align="center">
        <div>
          <Select
            label="Analysis Method"
            value={method}
            onChange={(value) =>
              onMethodChange?.(value as "similarity" | "base-vehicle")
            }
            data={[
              { value: "similarity", label: "Similarity Analysis" },
              { value: "base-vehicle", label: "Base Vehicle Analysis" },
            ]}
            w={200}
          />
        </div>

        {selectedConfigs.size > 0 && (
          <Button
            onClick={handleApplySelected}
            disabled={applying}
            loading={applying}
          >
            Apply Selected ({selectedConfigs.size})
          </Button>
        )}
      </Flex>

      {configurations.length === 0 ? (
        <Alert color="blue">
          No potential fitments found for this part using the {method} method.
        </Alert>
      ) : (
        <Table striped highlightOnHover>
          <Table.Thead>
            <Table.Tr>
              <Table.Th>
                <Checkbox
                  checked={
                    selectedConfigs.size === configurations.length &&
                    configurations.length > 0
                  }
                  indeterminate={
                    selectedConfigs.size > 0 &&
                    selectedConfigs.size < configurations.length
                  }
                  onChange={(event) =>
                    handleSelectAll(event.currentTarget.checked)
                  }
                />
              </Table.Th>
              <Table.Th>Vehicle</Table.Th>
              <Table.Th>Specifications</Table.Th>
              <Table.Th>Relevance</Table.Th>
              <Table.Th>Match Quality</Table.Th>
            </Table.Tr>
          </Table.Thead>
          <Table.Tbody>
            {configurations.map((config) => (
              <Table.Tr key={config.id}>
                <Table.Td>
                  <Checkbox
                    checked={selectedConfigs.has(config.id)}
                    onChange={(event) =>
                      handleConfigSelect(config.id, event.currentTarget.checked)
                    }
                  />
                </Table.Td>
                <Table.Td>
                  <div>
                    <Text fw={500}>
                      {config.year} {config.make} {config.model}
                    </Text>
                    <Text size="xs" c="dimmed">
                      {config.submodel}
                    </Text>
                  </div>
                </Table.Td>
                <Table.Td>
                  <Stack gap={2}>
                    <Group gap="xs">
                      <Badge variant="light" size="xs">
                        {config.driveType}
                      </Badge>
                      <Badge variant="light" size="xs">
                        {config.fuelType}
                      </Badge>
                    </Group>
                    <Text size="xs" c="dimmed">
                      {config.numDoors} doors • {config.bodyType}
                    </Text>
                  </Stack>
                </Table.Td>
                <Table.Td>
                  <Group gap="xs" align="center">
                    <Text fw={500} size="lg">
                      {config.relevance}%
                    </Text>
                    <div style={{ width: 60 }}>
                      <Progress
                        value={config.relevance}
                        size="sm"
                        color={
                          config.relevance >= 80
                            ? "green"
                            : config.relevance >= 60
                            ? "yellow"
                            : "orange"
                        }
                      />
                    </div>
                  </Group>
                </Table.Td>
                <Table.Td>
                  <Badge
                    color={
                      config.relevance >= 80
                        ? "green"
                        : config.relevance >= 60
                        ? "yellow"
                        : "orange"
                    }
                    variant="light"
                    size="sm"
                  >
                    {getRelevanceLabel(config.relevance)}
                  </Badge>
                </Table.Td>
              </Table.Tr>
            ))}
          </Table.Tbody>
        </Table>
      )}

      {configurations.length > 0 && (
        <Text size="sm" c="dimmed">
          Showing {configurations.length} potential configurations using{" "}
          {method} method
        </Text>
      )}
    </Stack>
  );
}
