import { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  Group,
  Stack,
  Radio,
  Divider,
  Alert,
  Loader,
  Center,
} from "@mantine/core";
import {
  IconBulb,
  IconChartDots,
  IconRefresh,
  IconX,
} from "@tabler/icons-react";
import { PartSelector } from "../components/PartSelector";
import { PotentialConfigsTable } from "../components/PotentialConfigsTable";
import { dataUploadService, PartWithFitments } from "../api/services";

export default function PotentialFitments() {
  const [parts, setParts] = useState<PartWithFitments[]>([]);
  const [selectedPart, setSelectedPart] = useState<PartWithFitments | null>(
    null
  );
  const [method, setMethod] = useState<"similarity" | "base-vehicle">(
    "similarity"
  );
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [triggerAnalysis, setTriggerAnalysis] = useState(false);

  // Load parts on component mount
  useEffect(() => {
    const loadParts = async () => {
      setLoading(true);
      try {
        const data = await dataUploadService.getPartsWithFitments();
        setParts(data.data);
      } catch (error) {
        setError("Failed to load parts. Please try again.");
        console.error("Error loading parts:", error);
      } finally {
        setLoading(false);
      }
    };

    loadParts();
  }, []);

  const handlePartSelect = (part: PartWithFitments | null) => {
    setSelectedPart(part);
    setError(null);
    setSuccess(null);
  };

  const handleError = (error: any) => {
    setError(
      error?.response?.data?.error || error?.message || "An error occurred"
    );
    console.error("Error:", error);
  };

  const handleSuccess = (message: string) => {
    setSuccess(message);
    // Clear success message after 5 seconds
    setTimeout(() => setSuccess(null), 5000);
  };

  const handleAnalyzeClick = () => {
    if (selectedPart) {
      setTriggerAnalysis(true);
      setError(null);
      setSuccess(null);
    }
  };

  const resetForm = () => {
    setSelectedPart(null);
    setError(null);
    setSuccess(null);
    setTriggerAnalysis(false);
    setMethod("similarity"); // Reset to default method
  };

  const handleMethodChange = (newMethod: "similarity" | "base-vehicle") => {
    setMethod(newMethod);
    setTriggerAnalysis(false); // Reset analysis when method changes
  };

  return (
    <div style={{ padding: "24px 0" }}>
      <Stack gap="lg">
        {/* Header */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Group justify="space-between" mb="md">
            <div>
              <Title order={2}>Potential Fitments</Title>
              <Text c="dimmed">
                Discover potential fitments using AI-powered similarity
                algorithms
              </Text>
            </div>
            <IconBulb size={28} color="var(--mantine-color-yellow-6)" />
          </Group>

          <Alert icon={<IconBulb size={16} />} color="blue" mb="lg">
            Our algorithms analyze existing fitments to suggest new vehicle
            configurations that could be compatible with your selected part.
          </Alert>
        </Card>
        {/* Configuration */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={3} mb="md">
            Configuration
          </Title>

          <Stack gap="md">
            {loading ? (
              <Center p="xl">
                <Stack align="center" gap="md">
                  <Loader size="lg" />
                  <Text>Loading parts...</Text>
                </Stack>
              </Center>
            ) : (
              <PartSelector
                key={`part-selector-${selectedPart?.id || "none"}`}
                parts={parts}
                selectedPart={selectedPart}
                onPartSelect={handlePartSelect}
                loading={loading}
              />
            )}

            <div>
              <Text fw={500} size="sm" mb="xs">
                Analysis Method
              </Text>
              <Radio.Group
                key={`method-selector-${method}`}
                value={method}
                onChange={(value) =>
                  setMethod(value as "similarity" | "base-vehicle")
                }
              >
                <Stack gap="xs">
                  <Radio
                    value="similarity"
                    label={
                      <div>
                        <Text fw={500}>Similarity Analysis</Text>
                        <Text size="xs" c="dimmed">
                          Find vehicles with similar make, model, and year
                          patterns
                        </Text>
                      </div>
                    }
                  />
                  <Radio
                    value="base-vehicle"
                    label={
                      <div>
                        <Text fw={500}>Base Vehicle Analysis</Text>
                        <Text size="xs" c="dimmed">
                          Find other configurations of the same base vehicle
                          platform
                        </Text>
                      </div>
                    }
                  />
                </Stack>
              </Radio.Group>
            </div>

            <Group>
              <Button
                leftSection={<IconChartDots size={16} />}
                disabled={!selectedPart}
                onClick={handleAnalyzeClick}
              >
                Analyze Potential Fitments
              </Button>
              <Button
                leftSection={<IconRefresh size={16} />}
                variant="light"
                onClick={resetForm}
              >
                Reset
              </Button>
            </Group>
          </Stack>
        </Card>
        {/* Error Display */}
        {error && (
          <Alert
            icon={<IconX size={16} />}
            color="red"
            withCloseButton
            onClose={() => setError(null)}
          >
            {error}
          </Alert>
        )}
        {/* Success Display */}
        {success && (
          <Alert
            icon={<IconBulb size={16} />}
            color="green"
            withCloseButton
            onClose={() => setSuccess(null)}
          >
            {success}
          </Alert>
        )}
        {selectedPart && (
          <Card shadow="sm" padding="lg" radius="md" withBorder>
            <PotentialConfigsTable
              key={`configs-table-${selectedPart.id}-${method}-${triggerAnalysis}`}
              partId={selectedPart.id}
              method={method}
              onError={handleError}
              onSuccess={handleSuccess}
              triggerAnalysis={triggerAnalysis}
              onMethodChange={handleMethodChange}
            />
          </Card>
        )}
        {/* Method Info */}
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Title order={4} mb="md">
            Analysis Methods
          </Title>
          <Stack gap="md">
            <div>
              <Text fw={500} mb="xs">
                Similarity Analysis
              </Text>
              <Text size="sm" c="dimmed">
                Analyzes patterns in existing fitments to find vehicles with
                similar characteristics (make, model, year range, drivetrain).
                Uses machine learning to score compatibility based on historical
                fitting success.
              </Text>
            </div>
            <Divider />
            <div>
              <Text fw={500} mb="xs">
                Base Vehicle Analysis
              </Text>
              <Text size="sm" c="dimmed">
                Identifies vehicles that share the same platform or base vehicle
                ID. These typically have identical mounting points and
                mechanical compatibility, making them excellent candidates for
                new fitments.
              </Text>
            </div>
          </Stack>
        </Card>
      </Stack>
    </div>
  );
}
