import { useState } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  MultiSelect,
  Switch,
  TextInput,
  NumberInput,
  Grid,
  Badge,
  ActionIcon,
  Tooltip,
  Modal,
  FileInput,
  Table,
  ScrollArea,
  Alert,
  Progress,
  Tabs,
} from "@mantine/core";
import {
  IconInfoCircle,
  IconUpload,
  IconDownload,
  IconTrash,
  IconPlus,
  IconDatabase,
  IconBrain,
  IconUsers,
  IconSettings,
  IconFileText,
  IconCheck,
  IconX,
} from "@tabler/icons-react";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

// VCDB Options
const VCDB_OPTIONS = [
  "Light Duty & Powersports, North America",
  "Medium & Heavy Duty Trucks (Classes 4–8), North America",
  "Off-Highway & Equipment, North America",
];

// Required VCDB Fields (first 8 + engine type)
const REQUIRED_VCDB_FIELDS = [
  "Year (model year)",
  "Make (manufacturer, e.g., Ford, Toyota)",
  "Model (e.g., F-150, Camry)",
  "Submodel / Trim (e.g., XLT, Limited, SE)",
  "Body Type (e.g., Sedan, SUV, Pickup)",
  "Body Number of Doors (2-door, 4-door, etc.)",
  "Drive Type (FWD, RWD, AWD, 4WD)",
  "Fuel Type (Gasoline, Diesel, Hybrid, Electric)",
  "Engine Type (engine code or family ID)",
];

// Optional VCDB Fields
const OPTIONAL_VCDB_FIELDS = [
  "Engine Liter (e.g., 2.0L, 5.7L)",
  "Engine Cylinders (e.g., I4, V6, V8)",
  "Engine VIN Code (8th digit VIN engine identifier)",
  "Engine Block Type (Inline, V-type, etc.)",
  "Transmission Type (Automatic, Manual, CVT)",
  "Transmission Speeds (e.g., 6-speed, 10-speed)",
  "Transmission Control Type (Automatic, Dual-Clutch, etc.)",
  "Bed Type (for pickups — e.g., Fleetside, Stepside)",
  "Bed Length (e.g., 5.5 ft, 6.5 ft, 8 ft)",
  "Wheelbase (measured length in inches/mm)",
  "Region (market region — U.S., Canada, Mexico, Latin America)",
];

// Product Required Fields
const PRODUCT_REQUIRED_FIELDS = [
  "Part Number",
  "Part Terminology Name",
  "PTID",
  "Parent/Child",
];

interface VCDBConfiguration {
  selectedVCDB: string[];
  requiredFields: string[];
  optionalFields: string[];
  fieldSequence: { [key: string]: number };
  defaultFitmentMode: "manual" | "ai";
}

interface ProductConfiguration {
  requiredFields: string[];
  additionalAttributes: Array<{
    name: string;
    value: string;
    uom: string;
    isEntitySpecific: boolean;
  }>;
  mappingMode: "manual" | "ai";
}

interface UploadedFile {
  id: string;
  filename: string;
  uploadDate: string;
  status: "processing" | "completed" | "error";
  size: string;
}

export default function CustomPCDB() {
  const { showSuccess } = useProfessionalToast();

  // VCDB Configuration State
  const [vcdbConfig, setVcdbConfig] = useState<VCDBConfiguration>({
    selectedVCDB: [],
    requiredFields: [],
    optionalFields: [],
    fieldSequence: {},
    defaultFitmentMode: "manual",
  });

  // Product Configuration State
  const [productConfig, setProductConfig] = useState<ProductConfiguration>({
    requiredFields: [],
    additionalAttributes: [],
    mappingMode: "manual",
  });

  // UI State
  const [activeTab, setActiveTab] = useState<string>("fitments");
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Handle VCDB field sequence changes
  const handleFieldSequenceChange = (field: string, sequence: number) => {
    setVcdbConfig((prev) => ({
      ...prev,
      fieldSequence: {
        ...prev.fieldSequence,
        [field]: sequence,
      },
    }));
  };

  // Handle additional attribute changes
  const handleAttributeChange = (
    index: number,
    field: string,
    value: string | boolean
  ) => {
    setProductConfig((prev) => ({
      ...prev,
      additionalAttributes: prev.additionalAttributes.map((attr, i) =>
        i === index ? { ...attr, [field]: value } : attr
      ),
    }));
  };

  const addAttribute = () => {
    setProductConfig((prev) => ({
      ...prev,
      additionalAttributes: [
        ...prev.additionalAttributes,
        { name: "", value: "", uom: "", isEntitySpecific: false },
      ],
    }));
  };

  const removeAttribute = (index: number) => {
    setProductConfig((prev) => ({
      ...prev,
      additionalAttributes: prev.additionalAttributes.filter(
        (_, i) => i !== index
      ),
    }));
  };

  // Handle file upload
  const handleFileUpload = async (file: File | null) => {
    if (!file) return;

    setUploading(true);
    setUploadProgress(0);

    // Simulate upload progress
    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setUploading(false);
          setUploadedFiles((prev) => [
            ...prev,
            {
              id: Date.now().toString(),
              filename: file.name,
              uploadDate: new Date().toISOString(),
              status: "completed",
              size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            },
          ]);
          showSuccess("File uploaded successfully!");
          return 100;
        }
        return prev + 10;
      });
    }, 200);
  };

  const renderFitmentsTab = () => (
    <Stack gap="lg">
      {/* VCDB Selection */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>VCDB Selection</Title>
            <Tooltip label="Select the VCDB categories you want to work with">
              <ActionIcon variant="subtle" color="blue">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <MultiSelect
            label="VCDB Categories"
            placeholder="Select VCDB categories"
            data={VCDB_OPTIONS}
            value={vcdbConfig.selectedVCDB}
            onChange={(value) =>
              setVcdbConfig((prev) => ({ ...prev, selectedVCDB: value }))
            }
            searchable
            clearable
          />
        </Stack>
      </Card>

      {/* Required VCDB Fields */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Required VCDB Fitment Fields</Title>
            <Tooltip label="These fields are mandatory and will be sequenced">
              <ActionIcon variant="subtle" color="blue">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <MultiSelect
            label="Required Fields"
            placeholder="Select required fields"
            data={REQUIRED_VCDB_FIELDS}
            value={vcdbConfig.requiredFields}
            onChange={(value) =>
              setVcdbConfig((prev) => ({ ...prev, requiredFields: value }))
            }
            searchable
            clearable
          />

          {/* Field Sequencing */}
          {vcdbConfig.requiredFields.length > 0 && (
            <Stack gap="sm">
              <Text size="sm" fw={500}>
                Field Sequence
              </Text>
              {vcdbConfig.requiredFields.map((field, index) => (
                <Group key={field} justify="space-between">
                  <Text size="sm">{field}</Text>
                  <NumberInput
                    size="sm"
                    w={80}
                    min={1}
                    max={vcdbConfig.requiredFields.length}
                    value={vcdbConfig.fieldSequence[field] || index + 1}
                    onChange={(value) =>
                      handleFieldSequenceChange(field, Number(value) || 1)
                    }
                  />
                </Group>
              ))}
            </Stack>
          )}
        </Stack>
      </Card>

      {/* Optional VCDB Fields */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Optional VCDB Fields</Title>
            <Tooltip label="These fields are optional and support alpha matching">
              <ActionIcon variant="subtle" color="blue">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <MultiSelect
            label="Optional Fields"
            placeholder="Select optional fields"
            data={OPTIONAL_VCDB_FIELDS}
            value={vcdbConfig.optionalFields}
            onChange={(value) =>
              setVcdbConfig((prev) => ({ ...prev, optionalFields: value }))
            }
            searchable
            clearable
          />
        </Stack>
      </Card>

      {/* Default Fitment Application Toggle */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Default Fitment Application</Title>
            <Tooltip label="Choose between manual or AI-powered fitment application">
              <ActionIcon variant="subtle" color="blue">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Switch
            label={
              vcdbConfig.defaultFitmentMode === "ai" ? "AI Mode" : "Manual Mode"
            }
            description={
              vcdbConfig.defaultFitmentMode === "ai"
                ? "AI will automatically apply fitments based on learned patterns"
                : "Manual application requires user intervention for each fitment"
            }
            checked={vcdbConfig.defaultFitmentMode === "ai"}
            onChange={(event) =>
              setVcdbConfig((prev) => ({
                ...prev,
                defaultFitmentMode: event.currentTarget.checked
                  ? "ai"
                  : "manual",
              }))
            }
            thumbIcon={
              vcdbConfig.defaultFitmentMode === "ai" ? (
                <IconBrain size={12} />
              ) : (
                <IconUsers size={12} />
              )
            }
          />
        </Stack>
      </Card>
    </Stack>
  );

  const renderProductsTab = () => (
    <Stack gap="lg">
      {/* Product Required Fields */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Product Required Fields</Title>
            <Tooltip label="These fields are mandatory for product identification">
              <ActionIcon variant="subtle" color="blue">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <MultiSelect
            label="Required Fields"
            placeholder="Select required product fields"
            data={PRODUCT_REQUIRED_FIELDS}
            value={productConfig.requiredFields}
            onChange={(value) =>
              setProductConfig((prev) => ({ ...prev, requiredFields: value }))
            }
            searchable
            clearable
          />
        </Stack>
      </Card>

      {/* Additional Attributes */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Group>
              <Title order={4}>Additional Attributes</Title>
              <Tooltip label="Define custom attributes for products">
                <ActionIcon variant="subtle" color="blue">
                  <IconInfoCircle size={16} />
                </ActionIcon>
              </Tooltip>
            </Group>
            <Button
              leftSection={<IconPlus size={16} />}
              onClick={addAttribute}
              size="sm"
            >
              Add Attribute
            </Button>
          </Group>

          {productConfig.additionalAttributes.map((attr, index) => (
            <Card key={index} withBorder p="md">
              <Grid>
                <Grid.Col span={3}>
                  <TextInput
                    label="Attribute Name"
                    placeholder="Enter attribute name"
                    value={attr.name}
                    onChange={(event) =>
                      handleAttributeChange(
                        index,
                        "name",
                        event.currentTarget.value
                      )
                    }
                  />
                </Grid.Col>
                <Grid.Col span={3}>
                  <TextInput
                    label="Attribute Value"
                    placeholder="Enter attribute value"
                    value={attr.value}
                    onChange={(event) =>
                      handleAttributeChange(
                        index,
                        "value",
                        event.currentTarget.value
                      )
                    }
                  />
                </Grid.Col>
                <Grid.Col span={3}>
                  <TextInput
                    label="Unit of Measure (UoM)"
                    placeholder="Enter UoM"
                    value={attr.uom}
                    onChange={(event) =>
                      handleAttributeChange(
                        index,
                        "uom",
                        event.currentTarget.value
                      )
                    }
                  />
                </Grid.Col>
                <Grid.Col span={2}>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Scope
                    </Text>
                    <Switch
                      label={
                        attr.isEntitySpecific ? "Entity Specific" : "Global"
                      }
                      checked={attr.isEntitySpecific}
                      onChange={(event) =>
                        handleAttributeChange(
                          index,
                          "isEntitySpecific",
                          event.currentTarget.checked
                        )
                      }
                    />
                  </Stack>
                </Grid.Col>
                <Grid.Col span={1}>
                  <Stack gap="xs">
                    <Text size="sm" fw={500}>
                      Actions
                    </Text>
                    <ActionIcon
                      color="red"
                      variant="subtle"
                      onClick={() => removeAttribute(index)}
                    >
                      <IconTrash size={16} />
                    </ActionIcon>
                  </Stack>
                </Grid.Col>
              </Grid>
            </Card>
          ))}
        </Stack>
      </Card>

      {/* Mapping Mode Toggle */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Field Mapping Mode</Title>
            <Tooltip label="Choose between manual mapping or AI-powered field matching">
              <ActionIcon variant="subtle" color="blue">
                <IconInfoCircle size={16} />
              </ActionIcon>
            </Tooltip>
          </Group>
          <Switch
            label={
              productConfig.mappingMode === "ai"
                ? "AI Match Fields"
                : "Manually Map"
            }
            description={
              productConfig.mappingMode === "ai"
                ? "AI will automatically match fields from uploaded data"
                : "Manual mapping requires user to specify field relationships"
            }
            checked={productConfig.mappingMode === "ai"}
            onChange={(event) =>
              setProductConfig((prev) => ({
                ...prev,
                mappingMode: event.currentTarget.checked ? "ai" : "manual",
              }))
            }
            thumbIcon={
              productConfig.mappingMode === "ai" ? (
                <IconBrain size={12} />
              ) : (
                <IconSettings size={12} />
              )
            }
          />
        </Stack>
      </Card>
    </Stack>
  );

  const renderUploadTab = () => (
    <Stack gap="lg">
      {/* File Upload */}
      <Card withBorder>
        <Stack gap="md">
          <Title order={4}>Upload File</Title>
          <FileInput
            label="Select file to upload"
            placeholder="Choose file"
            leftSection={<IconUpload size={16} />}
            onChange={handleFileUpload}
            accept=".csv,.xlsx,.xls"
          />
          {uploading && (
            <Stack gap="sm">
              <Text size="sm">Uploading file...</Text>
              <Progress value={uploadProgress} animated />
            </Stack>
          )}
        </Stack>
      </Card>

      {/* Upload History */}
      <Card withBorder>
        <Stack gap="md">
          <Group justify="space-between">
            <Title order={4}>Upload History</Title>
            <Badge color="blue" variant="light">
              {uploadedFiles.length} files
            </Badge>
          </Group>

          {uploadedFiles.length === 0 ? (
            <Alert icon={<IconFileText size={16} />} color="gray">
              No files uploaded yet
            </Alert>
          ) : (
            <ScrollArea h={300}>
              <Table>
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Filename</Table.Th>
                    <Table.Th>Upload Date</Table.Th>
                    <Table.Th>Size</Table.Th>
                    <Table.Th>Status</Table.Th>
                    <Table.Th>Actions</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {uploadedFiles.map((file) => (
                    <Table.Tr key={file.id}>
                      <Table.Td>
                        <Group gap="sm">
                          <IconFileText size={16} />
                          <Text size="sm">{file.filename}</Text>
                        </Group>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">
                          {new Date(file.uploadDate).toLocaleDateString()}
                        </Text>
                      </Table.Td>
                      <Table.Td>
                        <Text size="sm">{file.size}</Text>
                      </Table.Td>
                      <Table.Td>
                        <Badge
                          color={
                            file.status === "completed"
                              ? "green"
                              : file.status === "processing"
                              ? "yellow"
                              : "red"
                          }
                          variant="light"
                        >
                          {file.status}
                        </Badge>
                      </Table.Td>
                      <Table.Td>
                        <Group gap="xs">
                          <ActionIcon size="sm" variant="subtle" color="blue">
                            <IconDownload size={14} />
                          </ActionIcon>
                          <ActionIcon size="sm" variant="subtle" color="red">
                            <IconTrash size={14} />
                          </ActionIcon>
                        </Group>
                      </Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
            </ScrollArea>
          )}
        </Stack>
      </Card>
    </Stack>
  );

  const renderAttributesTab = () => {
    // Mock data for alphabetical attribute listing with AI recommendations
    const mockAttributes = [
      {
        name: "Bolt Size",
        currentValue: "M8x1.25",
        aiRecommendation: "M8x1.25",
        status: "approved",
      },
      {
        name: "Color",
        currentValue: "Black",
        aiRecommendation: "Matte Black",
        status: "pending",
      },
      {
        name: "Diameter",
        currentValue: "15mm",
        aiRecommendation: "15.5mm",
        status: "pending",
      },
      {
        name: "Length",
        currentValue: "100mm",
        aiRecommendation: "102mm",
        status: "approved",
      },
      {
        name: "Material",
        currentValue: "Steel",
        aiRecommendation: "Carbon Steel",
        status: "rejected",
      },
      {
        name: "Thread Pitch",
        currentValue: "1.25",
        aiRecommendation: "1.25",
        status: "approved",
      },
      {
        name: "Weight",
        currentValue: "50g",
        aiRecommendation: "52g",
        status: "pending",
      },
    ];

    return (
      <Stack gap="lg">
        <Card withBorder>
          <Stack gap="md">
            <Group justify="space-between">
              <Title order={4}>Attribute Management</Title>
              <Badge color="blue" variant="light">
                {mockAttributes.length} attributes
              </Badge>
            </Group>
            <Text size="sm" c="dimmed">
              AI analyzes your data and recommends improved attribute values.
              Review and approve recommendations to enhance data quality.
            </Text>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="md">
            <Title order={4}>Alphabetical Attribute Listing</Title>
            <Table>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Attribute Name</Table.Th>
                  <Table.Th>Current Value</Table.Th>
                  <Table.Th>AI Recommendation</Table.Th>
                  <Table.Th>Status</Table.Th>
                  <Table.Th>Actions</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {mockAttributes.map((attr, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text fw={500}>{attr.name}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{attr.currentValue}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text
                        size="sm"
                        c={attr.status === "approved" ? "green" : "blue"}
                      >
                        {attr.aiRecommendation}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge
                        color={
                          attr.status === "approved"
                            ? "green"
                            : attr.status === "pending"
                            ? "yellow"
                            : "red"
                        }
                        variant="light"
                      >
                        {attr.status}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Group gap="xs">
                        {attr.status === "pending" && (
                          <>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="green"
                              title="Approve"
                            >
                              <IconCheck size={14} />
                            </ActionIcon>
                            <ActionIcon
                              size="sm"
                              variant="subtle"
                              color="red"
                              title="Reject"
                            >
                              <IconX size={14} />
                            </ActionIcon>
                          </>
                        )}
                        {attr.status === "approved" && (
                          <ActionIcon
                            size="sm"
                            variant="subtle"
                            color="blue"
                            title="View Details"
                          >
                            <IconInfoCircle size={14} />
                          </ActionIcon>
                        )}
                      </Group>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          </Stack>
        </Card>

        <Card withBorder>
          <Stack gap="md">
            <Title order={4}>AI Recommendations Summary</Title>
            <Grid>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Stack gap="xs" align="center">
                    <Badge color="green" variant="light" size="lg">
                      {
                        mockAttributes.filter((a) => a.status === "approved")
                          .length
                      }
                    </Badge>
                    <Text size="sm" fw={500}>
                      Approved
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Stack gap="xs" align="center">
                    <Badge color="yellow" variant="light" size="lg">
                      {
                        mockAttributes.filter((a) => a.status === "pending")
                          .length
                      }
                    </Badge>
                    <Text size="sm" fw={500}>
                      Pending Review
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
              <Grid.Col span={4}>
                <Card withBorder p="md">
                  <Stack gap="xs" align="center">
                    <Badge color="red" variant="light" size="lg">
                      {
                        mockAttributes.filter((a) => a.status === "rejected")
                          .length
                      }
                    </Badge>
                    <Text size="sm" fw={500}>
                      Rejected
                    </Text>
                  </Stack>
                </Card>
              </Grid.Col>
            </Grid>
          </Stack>
        </Card>
      </Stack>
    );
  };

  return (
    <Stack gap="lg">
      <Group justify="space-between">
        <div>
          <Title order={2}>Custom PCDB Configuration</Title>
          <Text c="dimmed">
            Configure VCDB and Product fields for your organization
          </Text>
        </div>
      </Group>

      <Tabs
        value={activeTab}
        onChange={(value) => setActiveTab(value || "fitments")}
      >
        <Tabs.List>
          <Tabs.Tab value="fitments" leftSection={<IconDatabase size={16} />}>
            Fitments
          </Tabs.Tab>
          <Tabs.Tab value="products" leftSection={<IconFileText size={16} />}>
            Products
          </Tabs.Tab>
          <Tabs.Tab value="attributes" leftSection={<IconBrain size={16} />}>
            AI Attributes
          </Tabs.Tab>
          <Tabs.Tab value="upload" leftSection={<IconUpload size={16} />}>
            Upload & History
          </Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="fitments" pt="md">
          {renderFitmentsTab()}
        </Tabs.Panel>

        <Tabs.Panel value="products" pt="md">
          {renderProductsTab()}
        </Tabs.Panel>

        <Tabs.Panel value="attributes" pt="md">
          {renderAttributesTab()}
        </Tabs.Panel>

        <Tabs.Panel value="upload" pt="md">
          {renderUploadTab()}
        </Tabs.Panel>
      </Tabs>

      {/* Info Modal */}
      <Modal
        opened={showInfoModal}
        onClose={() => setShowInfoModal(false)}
        title="Field Information"
        size="md"
      >
        <Text>Field information will be displayed here.</Text>
      </Modal>
    </Stack>
  );
}
