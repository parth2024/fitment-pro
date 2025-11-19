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
  Card,
  Divider,
  Paper,
} from "@mantine/core";
import {
  IconChevronDown,
  IconChevronUp,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
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
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());

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
              <>
                <Table.Tr key={config.id}>
                  <Table.Td>
                    <Checkbox
                      checked={selectedConfigs.has(config.id)}
                      onChange={(event) =>
                        handleConfigSelect(
                          config.id,
                          event.currentTarget.checked
                        )
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
                    <Stack gap="xs">
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
                      {config.sourceEvidence &&
                        config.sourceEvidence.length > 0 && (
                          <Group gap="xs">
                            <Badge
                              variant="dot"
                              color="blue"
                              size="sm"
                              style={{ cursor: "pointer" }}
                              onClick={() => {
                                const newExpanded = new Set(expandedRows);
                                if (newExpanded.has(config.id)) {
                                  newExpanded.delete(config.id);
                                } else {
                                  newExpanded.add(config.id);
                                }
                                setExpandedRows(newExpanded);
                              }}
                            >
                              {config.sourceEvidence.length} source
                              {config.sourceEvidence.length !== 1 ? "s" : ""}
                            </Badge>
                            <Button
                              variant="light"
                              size="xs"
                              color="blue"
                              leftSection={
                                expandedRows.has(config.id) ? (
                                  <IconChevronUp size={14} />
                                ) : (
                                  <IconChevronDown size={14} />
                                )
                              }
                              onClick={() => {
                                const newExpanded = new Set(expandedRows);
                                if (newExpanded.has(config.id)) {
                                  newExpanded.delete(config.id);
                                } else {
                                  newExpanded.add(config.id);
                                }
                                setExpandedRows(newExpanded);
                              }}
                            >
                              {expandedRows.has(config.id) ? "Hide" : "View"}{" "}
                              Details
                            </Button>
                          </Group>
                        )}
                    </Stack>
                  </Table.Td>
                </Table.Tr>
                {expandedRows.has(config.id) &&
                  config.sourceEvidence &&
                  config.sourceEvidence.length > 0 && (
                    <Table.Tr key={`${config.id}-expanded`}>
                      <Table.Td colSpan={5}>
                        <Card
                          withBorder
                          p="md"
                          mt="xs"
                          style={{ backgroundColor: "#f8f9fa" }}
                        >
                          <Stack gap="md">
                            <Group justify="space-between" align="center">
                              <Text fw={600} size="sm">
                                Source Evidence & Confidence Breakdown
                              </Text>
                              <Badge variant="filled" color="blue" size="lg">
                                {config.relevance}% Match
                              </Badge>
                            </Group>

                            {/* Confidence Breakdown */}
                            {config.confidenceBreakdown && (
                              <Paper
                                p="sm"
                                withBorder
                                style={{ backgroundColor: "white" }}
                              >
                                <Text size="sm" fw={500} mb="sm">
                                  How this score was calculated:
                                </Text>
                                <Stack gap="xs">
                                  <Group gap="md" wrap="wrap">
                                    {config.confidenceBreakdown
                                      .baseVehicleMatch > 0 && (
                                      <Badge
                                        variant="light"
                                        color="blue"
                                        size="md"
                                      >
                                        Base Vehicle Match: +
                                        {
                                          config.confidenceBreakdown
                                            .baseVehicleMatch
                                        }
                                        %
                                      </Badge>
                                    )}
                                    {config.confidenceBreakdown.partTypeMatch >
                                      0 && (
                                      <Badge
                                        variant="light"
                                        color="green"
                                        size="md"
                                      >
                                        Part Type Match: +
                                        {
                                          config.confidenceBreakdown
                                            .partTypeMatch
                                        }
                                        %
                                      </Badge>
                                    )}
                                    {config.confidenceBreakdown.yearProximity >
                                      0 && (
                                      <Badge
                                        variant="light"
                                        color="yellow"
                                        size="md"
                                      >
                                        Year Proximity: +
                                        {
                                          config.confidenceBreakdown
                                            .yearProximity
                                        }
                                        %
                                      </Badge>
                                    )}
                                    {config.confidenceBreakdown
                                      .attributeMatches > 0 && (
                                      <Badge
                                        variant="light"
                                        color="cyan"
                                        size="md"
                                      >
                                        Attribute Matches: +
                                        {
                                          config.confidenceBreakdown
                                            .attributeMatches
                                        }
                                        %
                                      </Badge>
                                    )}
                                  </Group>
                                  <Group gap="xs" mt="xs">
                                    <Text size="sm" fw={600}>
                                      Total Score:
                                    </Text>
                                    <Badge
                                      variant="filled"
                                      color="green"
                                      size="lg"
                                    >
                                      {config.confidenceBreakdown.total}%
                                    </Badge>
                                  </Group>
                                </Stack>
                              </Paper>
                            )}

                            <Divider />

                            {/* Source Evidence */}
                            <div>
                              <Text size="sm" fw={500} mb="xs">
                                Matched Against Existing Fitments:
                              </Text>
                              <Stack gap="sm">
                                {config.sourceEvidence.map(
                                  (evidence: any, idx: number) => (
                                    <Card
                                      key={idx}
                                      withBorder
                                      p="sm"
                                      style={{ backgroundColor: "#f8f9fa" }}
                                    >
                                      <Stack gap="xs">
                                        <Group gap="xs" align="center">
                                          <Text size="sm" fw={500}>
                                            {evidence.fitment.year}{" "}
                                            {evidence.fitment.makeName}{" "}
                                            {evidence.fitment.modelName}
                                          </Text>
                                          {evidence.fitment.subModelName && (
                                            <Text size="xs" c="dimmed">
                                              ({evidence.fitment.subModelName})
                                            </Text>
                                          )}
                                          {evidence.similarity && (
                                            <Badge
                                              size="xs"
                                              variant="light"
                                              color="blue"
                                            >
                                              {Math.round(
                                                evidence.similarity * 100
                                              )}
                                              % similar
                                            </Badge>
                                          )}
                                          {evidence.relationship && (
                                            <Badge
                                              size="xs"
                                              variant="light"
                                              color="green"
                                            >
                                              {evidence.relationship.replace(
                                                "_",
                                                " "
                                              )}
                                            </Badge>
                                          )}
                                        </Group>

                                        <Group gap="xs">
                                          <Text size="xs" c="dimmed">
                                            Part: {evidence.fitment.partId}
                                          </Text>
                                          {evidence.fitment.position && (
                                            <Text size="xs" c="dimmed">
                                              • Position:{" "}
                                              {evidence.fitment.position}
                                            </Text>
                                          )}
                                        </Group>

                                        {evidence.matchedAttributes && (
                                          <div>
                                            <Group gap="xs" mb="xs">
                                              {evidence.matchedAttributes
                                                .matched.length > 0 && (
                                                <div>
                                                  <Text
                                                    size="xs"
                                                    fw={500}
                                                    c="green"
                                                    mb={2}
                                                  >
                                                    Matched Attributes (
                                                    {
                                                      evidence.matchedAttributes
                                                        .matchCount
                                                    }
                                                    /
                                                    {
                                                      evidence.matchedAttributes
                                                        .totalAttributes
                                                    }
                                                    ):
                                                  </Text>
                                                  <Group gap={4}>
                                                    {evidence.matchedAttributes.matched.map(
                                                      (attr: string) => (
                                                        <Badge
                                                          key={attr}
                                                          size="xs"
                                                          color="green"
                                                          variant="light"
                                                        >
                                                          <IconCheck
                                                            size={10}
                                                            style={{
                                                              marginRight: 2,
                                                            }}
                                                          />
                                                          {attr}
                                                        </Badge>
                                                      )
                                                    )}
                                                  </Group>
                                                </div>
                                              )}
                                            </Group>

                                            {evidence.matchedAttributes
                                              .differences.length > 0 && (
                                              <div>
                                                <Text
                                                  size="xs"
                                                  fw={500}
                                                  c="orange"
                                                  mb={2}
                                                >
                                                  Differences:
                                                </Text>
                                                <Group gap={4}>
                                                  {evidence.matchedAttributes.differences.map(
                                                    (
                                                      diff: string,
                                                      diffIdx: number
                                                    ) => (
                                                      <Badge
                                                        key={diffIdx}
                                                        size="xs"
                                                        color="orange"
                                                        variant="light"
                                                      >
                                                        <IconX
                                                          size={10}
                                                          style={{
                                                            marginRight: 2,
                                                          }}
                                                        />
                                                        {diff}
                                                      </Badge>
                                                    )
                                                  )}
                                                </Group>
                                              </div>
                                            )}
                                          </div>
                                        )}
                                      </Stack>
                                    </Card>
                                  )
                                )}
                              </Stack>
                            </div>

                            {/* Explanation */}
                            {config.explanation && (
                              <>
                                <Divider />
                                <div>
                                  <Text size="sm" fw={500} mb="xs">
                                    AI Explanation:
                                  </Text>
                                  <Text size="xs" c="dimmed">
                                    {config.explanation}
                                  </Text>
                                </div>
                              </>
                            )}
                          </Stack>
                        </Card>
                      </Table.Td>
                    </Table.Tr>
                  )}
              </>
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
