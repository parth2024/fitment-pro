import { useState, useEffect } from "react";
import {
  Container,
  Title,
  Text,
  Button,
  Stack,
  Group,
  Badge,
  Card,
  Alert,
  LoadingOverlay,
} from "@mantine/core";
import { IconDatabase, IconCar, IconAlertCircle } from "@tabler/icons-react";
import { services } from "../api/services";
import { useProfessionalToast } from "../hooks/useProfessionalToast";

/**
 * Example showing how to use the centralized API services
 * This demonstrates the proper way to make API calls using the services
 */
export default function ServiceUsageExample() {
  const [loading, setLoading] = useState(false);
  const [fieldStats, setFieldStats] = useState({
    vcdb: { total: 0, enabled: 0, required: 0 },
    product: { total: 0, enabled: 0, required: 0 },
  });
  const [fitmentStats, setFitmentStats] = useState({
    total: 0,
    recent: 0,
  });

  const { showSuccess, showError } = useProfessionalToast();

  // Load field configuration statistics
  const loadFieldStats = async () => {
    try {
      setLoading(true);

      // Use the centralized service to get field configurations
      const [vcdbFields, productFields] = await Promise.all([
        services.fieldConfig.getFields({ reference_type: "vcdb" }),
        services.fieldConfig.getFields({ reference_type: "product" }),
      ]);

      const vcdbData = vcdbFields.data.results || vcdbFields;
      const productData = productFields.data.results || productFields;

      setFieldStats({
        vcdb: {
          total: vcdbData.length,
          enabled: vcdbData.filter((f: any) => f.is_enabled).length,
          required: vcdbData.filter(
            (f: any) => f.requirement_level === "required"
          ).length,
        },
        product: {
          total: productData.length,
          enabled: productData.filter((f: any) => f.is_enabled).length,
          required: productData.filter(
            (f: any) => f.requirement_level === "required"
          ).length,
        },
      });

      showSuccess("Field statistics loaded successfully");
    } catch (error) {
      console.error("Error loading field stats:", error);
      showError("Failed to load field statistics");
    } finally {
      setLoading(false);
    }
  };

  // Load fitment statistics
  const loadFitmentStats = async () => {
    try {
      setLoading(true);

      // Use the centralized service to get fitments
      const fitments = await services.fitment.getFitments({
        page_size: 100, // Get recent fitments
      });

      const fitmentData = fitments.data.results || fitments;
      const recentFitments = fitmentData.filter((f: any) => {
        const createdAt = new Date(f.created_at || f.applied_at);
        const oneWeekAgo = new Date();
        oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
        return createdAt > oneWeekAgo;
      });

      setFitmentStats({
        total: fitmentData.length,
        recent: recentFitments.length,
      });

      showSuccess("Fitment statistics loaded successfully");
    } catch (error) {
      console.error("Error loading fitment stats:", error);
      showError("Failed to load fitment statistics");
    } finally {
      setLoading(false);
    }
  };

  // Load all statistics
  const loadAllStats = async () => {
    await Promise.all([loadFieldStats(), loadFitmentStats()]);
  };

  // Example of creating a new field configuration
  const createExampleField = async () => {
    try {
      setLoading(true);

      const newField = {
        name: "example_field",
        display_name: "Example Field",
        description: "This is an example field created via the service",
        field_type: "string",
        reference_type: "vcdb",
        requirement_level: "optional",
        is_enabled: true,
        is_unique: false,
        enum_options: [],
        default_value: "",
        display_order: 0,
        show_in_filters: true,
        show_in_forms: true,
        created_by: "system",
      };

      await services.fieldConfig.createField(newField);
      showSuccess("Example field created successfully");

      // Reload stats to show the new field
      await loadFieldStats();
    } catch (error) {
      console.error("Error creating example field:", error);
      showError("Failed to create example field");
    } finally {
      setLoading(false);
    }
  };

  // Example of validating data
  const validateExampleData = async () => {
    try {
      setLoading(true);

      const testData = {
        year: 2023,
        make: "Toyota",
        model: "RAV4",
        example_field: "test value",
      };

      const result = await services.fieldConfig.validateFieldData(
        "vcdb",
        testData
      );

      if (result.is_valid) {
        showSuccess("Data validation passed");
      } else {
        showError(`Data validation failed: ${JSON.stringify(result.errors)}`);
      }
    } catch (error) {
      console.error("Error validating data:", error);
      showError("Failed to validate data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllStats();
  }, []);

  return (
    <Container size="md" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs">
            API Services Usage Example
          </Title>
          <Text c="dimmed">
            This example demonstrates how to use the centralized API services
            for making API calls throughout the application.
          </Text>
        </div>

        <Alert
          icon={<IconAlertCircle size={16} />}
          color="blue"
          variant="light"
        >
          <Text size="sm">
            <strong>Centralized Services:</strong> All API calls are now
            centralized in <code>src/api/services.ts</code>. This provides
            better error handling, consistent API patterns, and easier
            maintenance.
          </Text>
        </Alert>

        <div style={{ position: "relative" }}>
          <LoadingOverlay visible={loading} />

          <Stack gap="md">
            {/* Field Configuration Statistics */}
            <Card withBorder padding="lg">
              <Group justify="space-between" mb="md">
                <Title order={3}>Field Configuration Statistics</Title>
                <Button size="xs" onClick={loadFieldStats}>
                  Refresh
                </Button>
              </Group>

              <Stack gap="sm">
                <Group justify="space-between">
                  <Group gap="sm">
                    <IconDatabase size={20} color="#3b82f6" />
                    <Text fw={500}>VCDB Fields</Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="blue" variant="light">
                      {fieldStats.vcdb.total} total
                    </Badge>
                    <Badge color="green" variant="light">
                      {fieldStats.vcdb.enabled} enabled
                    </Badge>
                    <Badge color="red" variant="light">
                      {fieldStats.vcdb.required} required
                    </Badge>
                  </Group>
                </Group>

                <Group justify="space-between">
                  <Group gap="sm">
                    <IconCar size={20} color="#10b981" />
                    <Text fw={500}>Product Fields</Text>
                  </Group>
                  <Group gap="xs">
                    <Badge color="blue" variant="light">
                      {fieldStats.product.total} total
                    </Badge>
                    <Badge color="green" variant="light">
                      {fieldStats.product.enabled} enabled
                    </Badge>
                    <Badge color="red" variant="light">
                      {fieldStats.product.required} required
                    </Badge>
                  </Group>
                </Group>
              </Stack>
            </Card>

            {/* Fitment Statistics */}
            <Card withBorder padding="lg">
              <Group justify="space-between" mb="md">
                <Title order={3}>Fitment Statistics</Title>
                <Button size="xs" onClick={loadFitmentStats}>
                  Refresh
                </Button>
              </Group>

              <Group justify="space-between">
                <Text>Total Fitments</Text>
                <Badge color="blue" variant="light">
                  {fitmentStats.total}
                </Badge>
              </Group>

              <Group justify="space-between">
                <Text>Recent Fitments (Last 7 days)</Text>
                <Badge color="green" variant="light">
                  {fitmentStats.recent}
                </Badge>
              </Group>
            </Card>

            {/* Service Examples */}
            <Card withBorder padding="lg">
              <Title order={3} mb="md">
                Service Examples
              </Title>

              <Stack gap="sm">
                <Text size="sm" c="dimmed">
                  Try these examples to see the services in action:
                </Text>

                <Group gap="sm">
                  <Button
                    size="sm"
                    onClick={createExampleField}
                    disabled={loading}
                  >
                    Create Example Field
                  </Button>

                  <Button
                    size="sm"
                    variant="light"
                    onClick={validateExampleData}
                    disabled={loading}
                  >
                    Validate Example Data
                  </Button>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={loadAllStats}
                    disabled={loading}
                  >
                    Refresh All Stats
                  </Button>
                </Group>
              </Stack>
            </Card>

            {/* Usage Instructions */}
            <Card withBorder padding="lg">
              <Title order={3} mb="md">
                How to Use Services
              </Title>

              <Stack gap="sm">
                <Text size="sm">
                  <strong>1. Import the services:</strong>
                </Text>
                <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                  import {`{ services }`} from "../api/services";
                </Text>

                <Text size="sm" mt="md">
                  <strong>2. Use specific service:</strong>
                </Text>
                <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                  const fields = await services.fieldConfig.getFields();
                  <br />
                  const fitments = await services.fitment.getFitments();
                  <br />
                  const uploads = await services.dataUpload.getUploadSessions();
                </Text>

                <Text size="sm" mt="md">
                  <strong>3. Handle errors:</strong>
                </Text>
                <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                  try {`{`}
                  <br />
                  &nbsp;&nbsp;const data = await
                  services.fieldConfig.getFields();
                  <br />
                  {`}`} catch (error) {`{`}
                  <br />
                  &nbsp;&nbsp;console.error("API Error:", error);
                  <br />
                  {`}`}
                </Text>
              </Stack>
            </Card>
          </Stack>
        </div>
      </Stack>
    </Container>
  );
}
