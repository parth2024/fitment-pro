import { useState, useEffect } from "react";
import {
  Card,
  Text,
  Button,
  Group,
  Stack,
  TextInput,
  Grid,
  Badge,
  ActionIcon,
  Modal,
  Table,
  ScrollArea,
  Alert,
  Paper,
  Divider,
  Select,
  Container,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconDatabase,
  IconBrain,
  IconCheck,
  IconX,
  IconRefresh,
  IconSearch,
  IconSortAscending,
  IconSortDescending,
  IconBuilding,
  IconGlobe,
} from "@tabler/icons-react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";
import EntitySelectionWrapper from "../components/EntitySelectionWrapper";

// Attribute Management Types
interface Attribute {
  id: string;
  name: string;
  currentValue: string;
  uom: string;
  isGlobal: boolean;
  entityId?: string;
  entityName?: string;
  usageCount: number;
  lastUpdated: Date;
  aiRecommendations: AIRecommendation[];
}

interface AIRecommendation {
  id: string;
  suggestedValue: string;
  confidence: number;
  reasoning: string;
  status: "pending" | "approved" | "rejected";
  createdAt: Date;
}

interface AttributeStats {
  totalAttributes: number;
  globalAttributes: number;
  entitySpecificAttributes: number;
  pendingRecommendations: number;
  approvedRecommendations: number;
}

// Mock data for demonstration
const mockAttributes: Attribute[] = [
  {
    id: "1",
    name: "Material",
    currentValue: "Steel",
    uom: "type",
    isGlobal: true,
    usageCount: 45,
    lastUpdated: new Date("2024-01-15"),
    aiRecommendations: [
      {
        id: "rec1",
        suggestedValue: "Aluminum",
        confidence: 0.85,
        reasoning:
          "Based on similar parts in the database, aluminum might be more appropriate for weight reduction.",
        status: "pending",
        createdAt: new Date("2024-01-20"),
      },
    ],
  },
  {
    id: "2",
    name: "Weight",
    currentValue: "2.5",
    uom: "lbs",
    isGlobal: false,
    entityId: "entity1",
    entityName: "AutoParts Inc",
    usageCount: 12,
    lastUpdated: new Date("2024-01-10"),
    aiRecommendations: [],
  },
  {
    id: "3",
    name: "Color",
    currentValue: "Black",
    uom: "color",
    isGlobal: true,
    usageCount: 78,
    lastUpdated: new Date("2024-01-18"),
    aiRecommendations: [
      {
        id: "rec2",
        suggestedValue: "Matte Black",
        confidence: 0.92,
        reasoning:
          "Matte finish is trending in automotive accessories and provides better durability.",
        status: "pending",
        createdAt: new Date("2024-01-22"),
      },
    ],
  },
  {
    id: "4",
    name: "Diameter",
    currentValue: "15",
    uom: "inches",
    isGlobal: true,
    usageCount: 34,
    lastUpdated: new Date("2024-01-12"),
    aiRecommendations: [],
  },
  {
    id: "5",
    name: "Temperature Rating",
    currentValue: "-40 to 200",
    uom: "°F",
    isGlobal: false,
    entityId: "entity2",
    entityName: "TechCorp",
    usageCount: 8,
    lastUpdated: new Date("2024-01-08"),
    aiRecommendations: [
      {
        id: "rec3",
        suggestedValue: "-50 to 250",
        confidence: 0.78,
        reasoning:
          "Extended temperature range would improve product versatility and market appeal.",
        status: "approved",
        createdAt: new Date("2024-01-19"),
      },
    ],
  },
];

const CustomPCDB: React.FC = () => {
  const { showSuccess } = useProfessionalToast();

  // State management
  const [attributes, setAttributes] = useState<Attribute[]>(mockAttributes);
  const [filteredAttributes, setFilteredAttributes] =
    useState<Attribute[]>(mockAttributes);
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"name" | "usage" | "lastUpdated">(
    "name"
  );
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [filterGlobal, setFilterGlobal] = useState<boolean | null>(null);
  const [selectedAttribute, setSelectedAttribute] = useState<Attribute | null>(
    null
  );
  const [showRecommendationModal, setShowRecommendationModal] = useState(false);
  const [loading, setLoading] = useState(false);

  // Calculate stats
  const stats: AttributeStats = {
    totalAttributes: attributes.length,
    globalAttributes: attributes.filter((attr) => attr.isGlobal).length,
    entitySpecificAttributes: attributes.filter((attr) => !attr.isGlobal)
      .length,
    pendingRecommendations: attributes.reduce(
      (sum, attr) =>
        sum +
        attr.aiRecommendations.filter((rec) => rec.status === "pending").length,
      0
    ),
    approvedRecommendations: attributes.reduce(
      (sum, attr) =>
        sum +
        attr.aiRecommendations.filter((rec) => rec.status === "approved")
          .length,
      0
    ),
  };

  // Filter and sort attributes
  useEffect(() => {
    let filtered = attributes;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(
        (attr) =>
          attr.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          attr.currentValue.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Global/Entity filter
    if (filterGlobal !== null) {
      filtered = filtered.filter((attr) => attr.isGlobal === filterGlobal);
    }

    // Sort
    filtered.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "name":
          comparison = a.name.localeCompare(b.name);
          break;
        case "usage":
          comparison = a.usageCount - b.usageCount;
          break;
        case "lastUpdated":
          comparison = a.lastUpdated.getTime() - b.lastUpdated.getTime();
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    setFilteredAttributes(filtered);
  }, [attributes, searchTerm, sortBy, sortOrder, filterGlobal]);

  // Handle AI recommendation approval/rejection
  const handleRecommendationAction = (
    attributeId: string,
    recommendationId: string,
    action: "approve" | "reject"
  ) => {
    setAttributes((prev) =>
      prev.map((attr) => {
        if (attr.id === attributeId) {
          return {
            ...attr,
            aiRecommendations: attr.aiRecommendations.map((rec) =>
              rec.id === recommendationId
                ? {
                    ...rec,
                    status: action === "approve" ? "approved" : "rejected",
                  }
                : rec
            ),
            currentValue:
              action === "approve"
                ? attr.aiRecommendations.find(
                    (rec) => rec.id === recommendationId
                  )?.suggestedValue || attr.currentValue
                : attr.currentValue,
            lastUpdated: new Date(),
          };
        }
        return attr;
      })
    );

    showSuccess(
      `Recommendation ${
        action === "approve" ? "approved" : "rejected"
      } successfully`
    );
  };

  // Toggle global/entity specific
  const toggleGlobal = (attributeId: string) => {
    setAttributes((prev) =>
      prev.map((attr) =>
        attr.id === attributeId
          ? { ...attr, isGlobal: !attr.isGlobal, lastUpdated: new Date() }
          : attr
      )
    );
  };

  // Refresh AI recommendations
  const refreshRecommendations = async () => {
    setLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);
    showSuccess("AI recommendations refreshed");
  };

  return (
    <EntitySelectionWrapper
      title="Custom PCDB Management"
      description="Manage global attribute dictionary with AI recommendations"
      allowMultiple={true}
    >
      <Container size="xl" py="xl">
        <Stack gap="xl">
          {/* Stats Cards */}
          <Grid>
            <Grid.Col span={6}>
              <Card shadow="sm" p="md" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      Total Attributes
                    </Text>
                    <Text size="xl" fw={700}>
                      {stats.totalAttributes}
                    </Text>
                  </div>
                  <IconDatabase size={24} color="var(--mantine-color-blue-6)" />
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={6}>
              <Card shadow="sm" p="md" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      Global Attributes
                    </Text>
                    <Text size="xl" fw={700}>
                      {stats.globalAttributes}
                    </Text>
                  </div>
                  <IconGlobe size={24} color="var(--mantine-color-green-6)" />
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={6}>
              <Card shadow="sm" p="md" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      Pending AI Recs
                    </Text>
                    <Text size="xl" fw={700}>
                      {stats.pendingRecommendations}
                    </Text>
                  </div>
                  <IconBrain size={24} color="var(--mantine-color-orange-6)" />
                </Group>
              </Card>
            </Grid.Col>
            <Grid.Col span={6}>
              <Card shadow="sm" p="md" radius="md" withBorder>
                <Group justify="space-between">
                  <div>
                    <Text size="sm" c="dimmed">
                      Approved Recs
                    </Text>
                    <Text size="xl" fw={700}>
                      {stats.approvedRecommendations}
                    </Text>
                  </div>
                  <IconCheck size={24} color="var(--mantine-color-teal-6)" />
                </Group>
              </Card>
            </Grid.Col>
          </Grid>

          {/* Controls */}
          <Card shadow="sm" p="md" radius="md" withBorder>
            <Grid>
              <Grid.Col span={12}>
                <TextInput
                  placeholder="Search attributes..."
                  leftSection={<IconSearch size={16} />}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  placeholder="Sort by"
                  data={[
                    { value: "name", label: "Name" },
                    { value: "usage", label: "Usage Count" },
                    { value: "lastUpdated", label: "Last Updated" },
                  ]}
                  value={sortBy}
                  onChange={(value) => setSortBy(value as any)}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Button
                  variant="outline"
                  leftSection={
                    sortOrder === "asc" ? (
                      <IconSortAscending size={16} />
                    ) : (
                      <IconSortDescending size={16} />
                    )
                  }
                  onClick={() =>
                    setSortOrder(sortOrder === "asc" ? "desc" : "asc")
                  }
                >
                  {sortOrder === "asc" ? "Asc" : "Desc"}
                </Button>
              </Grid.Col>
              <Grid.Col span={6}>
                <Select
                  placeholder="Filter"
                  data={[
                    { value: "all", label: "All" },
                    { value: "global", label: "Global" },
                    { value: "entity", label: "Entity Specific" },
                  ]}
                  value={
                    filterGlobal === null
                      ? "all"
                      : filterGlobal
                      ? "global"
                      : "entity"
                  }
                  onChange={(value) => {
                    if (value === "all") setFilterGlobal(null);
                    else setFilterGlobal(value === "global");
                  }}
                />
              </Grid.Col>
              <Grid.Col span={6}>
                <Button
                  leftSection={<IconRefresh size={16} />}
                  onClick={refreshRecommendations}
                  loading={loading}
                >
                  Refresh AI
                </Button>
              </Grid.Col>
            </Grid>
          </Card>

          {/* Attributes Table */}
          <Card shadow="sm" p="md" radius="md" withBorder>
            <ScrollArea>
              <Table striped highlightOnHover>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Attribute Name</Table.Th>
                    <Table.Th>Current Value</Table.Th>
                    <Table.Th>UoM</Table.Th>
                    <Table.Th>Scope</Table.Th>
                    <Table.Th>Usage Count</Table.Th>
                    <Table.Th>Last Updated</Table.Th>
                    <Table.Th>AI Recommendations</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {filteredAttributes.map((attribute) => (
                    <Table.Tr key={attribute.id}>
                      <Table.Td>
                        <Text fw={500}>{attribute.name}</Text>
                        {attribute.entityName && (
                          <Text size="xs" c="dimmed">
                            {attribute.entityName}
                          </Text>
                        )}
                      </Table.Td>
                      <Table.Td>
                        <Text>{attribute.currentValue}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge variant="light" size="sm">
                          {attribute.uom}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {attribute.isGlobal ? (
                            <Badge
                              color="green"
                              size="sm"
                              leftSection={<IconGlobe size={12} />}
                            >
                              Global
                            </Badge>
                          ) : (
                            <Badge
                              color="blue"
                              size="sm"
                              leftSection={<IconBuilding size={12} />}
                            >
                              Entity
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text>{attribute.usageCount}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm" c="dimmed">
                          {attribute.lastUpdated.toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          {attribute.aiRecommendations.filter(
                            (rec) => rec.status === "pending"
                          ).length > 0 && (
                            <Badge color="orange" size="sm">
                              {
                                attribute.aiRecommendations.filter(
                                  (rec) => rec.status === "pending"
                                ).length
                              }{" "}
                              Pending
                            </Badge>
                          )}
                          {attribute.aiRecommendations.filter(
                            (rec) => rec.status === "approved"
                          ).length > 0 && (
                            <Badge color="green" size="sm">
                              {
                                attribute.aiRecommendations.filter(
                                  (rec) => rec.status === "approved"
                                ).length
                              }{" "}
                              Approved
                            </Badge>
                          )}
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon
                            variant="subtle"
                            color="blue"
                            onClick={() => {
                              setSelectedAttribute(attribute);
                              setShowRecommendationModal(true);
                            }}
                          >
                            <IconBrain size={16} />
                          </ActionIcon>
                          <ActionIcon
                            variant="subtle"
                            color={attribute.isGlobal ? "orange" : "green"}
                            onClick={() => toggleGlobal(attribute.id)}
                          >
                            {attribute.isGlobal ? (
                              <IconBuilding size={16} />
                            ) : (
                              <IconGlobe size={16} />
                            )}
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          </Card>

          {/* AI Recommendations Modal */}
          <Modal
            opened={showRecommendationModal}
            onClose={() => setShowRecommendationModal(false)}
            title={`AI Recommendations for ${selectedAttribute?.name}`}
            size="lg"
          >
            {selectedAttribute && (
              <Stack gap="md">
                <Paper p="md" withBorder>
                  <Group justify="space-between">
                    <div>
                      <Text fw={500}>Current Value</Text>
                      <Text size="lg">
                        {selectedAttribute.currentValue} {selectedAttribute.uom}
                      </Text>
                    </div>
                    <Badge
                      color={selectedAttribute.isGlobal ? "green" : "blue"}
                    >
                      {selectedAttribute.isGlobal
                        ? "Global"
                        : "Entity Specific"}
                    </Badge>
                  </Group>
                </Paper>

                <Divider />

                <Text fw={500}>AI Recommendations</Text>
                {selectedAttribute.aiRecommendations.length === 0 ? (
                  <Alert icon={<IconInfoCircle size={16} />} color="blue">
                    No AI recommendations available for this attribute.
                  </Alert>
                ) : (
                  <Stack gap="md">
                    {selectedAttribute.aiRecommendations.map((rec) => (
                      <Paper key={rec.id} p="md" withBorder>
                        <Group justify="space-between" mb="sm">
                          <div>
                            <Text fw={500}>
                              Suggested: {rec.suggestedValue}{" "}
                              {selectedAttribute.uom}
                            </Text>
                            <Text size="sm" c="dimmed">
                              Confidence: {Math.round(rec.confidence * 100)}%
                            </Text>
                          </div>
                          <Badge
                            color={
                              rec.status === "pending"
                                ? "orange"
                                : rec.status === "approved"
                                ? "green"
                                : "red"
                            }
                          >
                            {rec.status}
                          </Badge>
                        </Group>
                        <Text size="sm" mb="md">
                          {rec.reasoning}
                        </Text>
                        {rec.status === "pending" && (
                          <Group gap="xs">
                            <Button
                              size="xs"
                              color="green"
                              leftSection={<IconCheck size={14} />}
                              onClick={() =>
                                handleRecommendationAction(
                                  selectedAttribute.id,
                                  rec.id,
                                  "approve"
                                )
                              }
                            >
                              Approve
                            </Button>
                            <Button
                              size="xs"
                              color="red"
                              leftSection={<IconX size={14} />}
                              onClick={() =>
                                handleRecommendationAction(
                                  selectedAttribute.id,
                                  rec.id,
                                  "reject"
                                )
                              }
                            >
                              Reject
                            </Button>
                          </Group>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                )}
              </Stack>
            )}
          </Modal>
        </Stack>
      </Container>
    </EntitySelectionWrapper>
  );
};

export default CustomPCDB;
