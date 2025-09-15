import { useState, useEffect } from "react";
import {
  Card,
  Title,
  Text,
  Button,
  TextInput,
  Group,
  Stack,
  Select,
  NumberInput,
  Textarea,
  Grid,
  Divider,
  LoadingOverlay,
} from "@mantine/core";
import { IconArrowLeft, IconDeviceFloppy } from "@tabler/icons-react";
import { useApi } from "../hooks/useApi";
import { fitmentsService, type FlattenedAppliedFitment } from "../api/services";
import { notifications } from "@mantine/notifications";

interface FilterOptions {
  itemStatus: string[];
  makeName: string[];
  modelName: string[];
  driveTypeName: string[];
  fuelTypeName: string[];
  bodyTypeName: string[];
  partTypeDescriptor: string[];
  position: string[];
  liftHeight: string[];
  wheelType: string[];
  fitmentType: string[];
  createdBy: string[];
  yearRange: { min: number; max: number };
}

interface EditFitmentProps {
  fitmentHash: string;
  onBack: () => void;
}

export default function EditFitment({ fitmentHash, onBack }: EditFitmentProps) {
  const [saving, setSaving] = useState(false);

  // Fetch fitment details
  const { data: fitmentData, loading: detailLoading } =
    useApi<FlattenedAppliedFitment>(
      () => fitmentsService.getFitmentDetail(fitmentHash),
      [fitmentHash]
    );

  // Fetch filter options for dropdowns
  const { data: filterOptions } = useApi<FilterOptions>(
    () => fitmentsService.getFilterOptions(),
    []
  );

  const [formData, setFormData] = useState({
    partId: "",
    itemStatus: "",
    year: 2025,
    makeName: "",
    modelName: "",
    subModelName: "",
    driveTypeName: "",
    fuelTypeName: "",
    bodyTypeName: "",
    partTypeDescriptor: "",
    position: "",
    liftHeight: "",
    wheelType: "",
    fitmentTitle: "",
    fitmentDescription: "",
    fitmentNotes: "",
    quantity: 1,
    bodyNumDoors: 4,
    positionId: 1,
    uom: "Set",
  });

  // Update form data when fitment data is loaded
  useEffect(() => {
    if (fitmentData) {
      setFormData({
        partId: fitmentData.partId || "",
        itemStatus: fitmentData.itemStatus || "",
        year: fitmentData.year || 2025,
        makeName: fitmentData.makeName || "",
        modelName: fitmentData.modelName || "",
        subModelName: fitmentData.subModelName || "",
        driveTypeName: fitmentData.driveTypeName || "",
        fuelTypeName: fitmentData.fuelTypeName || "",
        bodyTypeName: fitmentData.bodyTypeName || "",
        partTypeDescriptor: fitmentData.partTypeDescriptor || "",
        position: fitmentData.position || "",
        liftHeight: fitmentData.liftHeight || "",
        wheelType: fitmentData.wheelType || "",
        fitmentTitle: fitmentData.fitmentTitle || "",
        fitmentDescription: fitmentData.fitmentDescription || "",
        fitmentNotes: fitmentData.fitmentNotes || "",
        quantity: fitmentData.quantity || 1,
        bodyNumDoors: fitmentData.bodyNumDoors || 4,
        positionId: fitmentData.positionId || 1,
        uom: fitmentData.uom || "Set",
      });
    }
  }, [fitmentData]);

  const handleInputChange = (field: string, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSave = async () => {
    if (!fitmentHash) return;

    setSaving(true);
    try {
      await fitmentsService.updateFitment(fitmentHash, {
        ...formData,
        updatedBy: "user",
      });

      notifications.show({
        title: "Success",
        message: "Fitment updated successfully",
        color: "green",
      });

      onBack();
    } catch (error) {
      notifications.show({
        title: "Error",
        message: "Failed to update fitment",
        color: "red",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    onBack();
  };

  if (detailLoading) {
    return (
      <div style={{ minHeight: "100vh", position: "relative" }}>
        <LoadingOverlay visible={true} />
      </div>
    );
  }

  if (!fitmentData) {
    return (
      <div style={{ minHeight: "100vh" }}>
        <Card shadow="sm" padding="lg" radius="md" withBorder>
          <Stack gap="md" align="center">
            <Text size="lg" c="red">
              Fitment not found
            </Text>
            <Button onClick={onBack}>Back to Fitments</Button>
          </Stack>
        </Card>
      </div>
    );
  }

  return (
    <div style={{ minHeight: "100vh" }}>
      <Card shadow="sm" padding="lg" radius="md" withBorder>
        <LoadingOverlay visible={saving} />
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between">
            <Group gap="md">
              <Button
                leftSection={<IconArrowLeft size={16} />}
                variant="light"
                onClick={handleCancel}
              >
                Back
              </Button>
              <div>
                <Title order={2}>Edit Fitment</Title>
                <Text c="dimmed">Part ID: {fitmentData.partId}</Text>
              </div>
            </Group>
            <Group>
              <Button
                variant="light"
                color="gray"
                onClick={handleCancel}
                styles={{
                  root: {
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "14px",
                    height: "40px",
                    padding: "0 20px",
                    border: "2px solid #e2e8f0",
                    color: "#64748b",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    "&:hover": {
                      backgroundColor: "#f8fafc",
                      borderColor: "#cbd5e1",
                      transform: "translateY(-1px)",
                    },
                  },
                }}
              >
                Cancel
              </Button>
              <Button
                leftSection={<IconDeviceFloppy size={16} />}
                onClick={handleSave}
                loading={saving}
                styles={{
                  root: {
                    borderRadius: "10px",
                    fontWeight: 600,
                    fontSize: "14px",
                    height: "40px",
                    padding: "0 24px",
                    background:
                      "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                    border: "none",
                    transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                    boxShadow:
                      "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)",
                    "&:hover": {
                      transform: "translateY(-2px)",
                      boxShadow:
                        "0 8px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              >
                Save Changes
              </Button>
            </Group>
          </Group>

          <Divider />

          {/* Form */}
          <Grid>
            {/* Basic Information */}
            <Grid.Col span={12}>
              <Text fw={600} size="lg" mb="md">
                Basic Information
              </Text>
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="Part ID"
                placeholder="Enter Part ID"
                value={formData.partId}
                onChange={(event) =>
                  handleInputChange("partId", event.currentTarget.value)
                }
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Status"
                placeholder="Select status"
                value={formData.itemStatus}
                onChange={(value) =>
                  handleInputChange("itemStatus", value || "")
                }
                data={
                  filterOptions?.itemStatus.map((status) => ({
                    value: status,
                    label: status,
                  })) || []
                }
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <NumberInput
                label="Year"
                placeholder="Enter year"
                value={formData.year}
                onChange={(value) => handleInputChange("year", value || 2025)}
                min={filterOptions?.yearRange.min || 2000}
                max={filterOptions?.yearRange.max || 2030}
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <Select
                label="Make"
                placeholder="Select make"
                value={formData.makeName}
                onChange={(value) => handleInputChange("makeName", value || "")}
                data={
                  filterOptions?.makeName.map((make) => ({
                    value: make,
                    label: make,
                  })) || []
                }
                searchable
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <Select
                label="Model"
                placeholder="Select model"
                value={formData.modelName}
                onChange={(value) =>
                  handleInputChange("modelName", value || "")
                }
                data={
                  filterOptions?.modelName.map((model) => ({
                    value: model,
                    label: model,
                  })) || []
                }
                searchable
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <TextInput
                label="Sub Model"
                placeholder="Enter sub model"
                value={formData.subModelName}
                onChange={(event) =>
                  handleInputChange("subModelName", event.currentTarget.value)
                }
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Drive Type"
                placeholder="Select drive type"
                value={formData.driveTypeName}
                onChange={(value) =>
                  handleInputChange("driveTypeName", value || "")
                }
                data={
                  filterOptions?.driveTypeName.map((drive) => ({
                    value: drive,
                    label: drive,
                  })) || []
                }
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Fuel Type"
                placeholder="Select fuel type"
                value={formData.fuelTypeName}
                onChange={(value) =>
                  handleInputChange("fuelTypeName", value || "")
                }
                data={
                  filterOptions?.fuelTypeName.map((fuel) => ({
                    value: fuel,
                    label: fuel,
                  })) || []
                }
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Body Type"
                placeholder="Select body type"
                value={formData.bodyTypeName}
                onChange={(value) =>
                  handleInputChange("bodyTypeName", value || "")
                }
                data={
                  filterOptions?.bodyTypeName.map((body) => ({
                    value: body,
                    label: body,
                  })) || []
                }
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <NumberInput
                label="Number of Doors"
                placeholder="Enter number of doors"
                value={formData.bodyNumDoors}
                onChange={(value) =>
                  handleInputChange("bodyNumDoors", value || 4)
                }
                min={2}
                max={8}
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <TextInput
                label="UOM (Unit of Measure)"
                placeholder="Enter UOM"
                value={formData.uom}
                onChange={(event) =>
                  handleInputChange("uom", event.currentTarget.value)
                }
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={4}>
              <NumberInput
                label="Quantity"
                placeholder="Enter quantity"
                value={formData.quantity}
                onChange={(value) => handleInputChange("quantity", value || 1)}
                min={1}
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            {/* Part Information */}
            <Grid.Col span={12} mt="lg">
              <Text fw={600} size="lg" mb="md">
                Part Information
              </Text>
            </Grid.Col>

            <Grid.Col span={12}>
              <Select
                label="Part Type Descriptor"
                placeholder="Select part type"
                value={formData.partTypeDescriptor}
                onChange={(value) =>
                  handleInputChange("partTypeDescriptor", value || "")
                }
                data={
                  filterOptions?.partTypeDescriptor.map((part) => ({
                    value: part,
                    label: part,
                  })) || []
                }
                searchable
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Position"
                placeholder="Select position"
                value={formData.position}
                onChange={(value) => handleInputChange("position", value || "")}
                data={
                  filterOptions?.position.map((pos) => ({
                    value: pos,
                    label: pos,
                  })) || []
                }
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <NumberInput
                label="Position ID"
                placeholder="Enter position ID"
                value={formData.positionId}
                onChange={(value) =>
                  handleInputChange("positionId", value || 1)
                }
                min={1}
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Lift Height"
                placeholder="Select lift height"
                value={formData.liftHeight}
                onChange={(value) =>
                  handleInputChange("liftHeight", value || "")
                }
                data={
                  filterOptions?.liftHeight.map((lift) => ({
                    value: lift,
                    label: lift,
                  })) || []
                }
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={6}>
              <Select
                label="Wheel Type"
                placeholder="Select wheel type"
                value={formData.wheelType}
                onChange={(value) =>
                  handleInputChange("wheelType", value || "")
                }
                data={
                  filterOptions?.wheelType.map((wheel) => ({
                    value: wheel,
                    label: wheel,
                  })) || []
                }
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            {/* Fitment Details */}
            <Grid.Col span={12} mt="lg">
              <Text fw={600} size="lg" mb="md">
                Fitment Details
              </Text>
            </Grid.Col>

            <Grid.Col span={12}>
              <TextInput
                label="Fitment Title"
                placeholder="Enter fitment title"
                value={formData.fitmentTitle}
                onChange={(event) =>
                  handleInputChange("fitmentTitle", event.currentTarget.value)
                }
                required
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    height: "40px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Fitment Description"
                placeholder="Enter fitment description"
                value={formData.fitmentDescription}
                onChange={(event) =>
                  handleInputChange(
                    "fitmentDescription",
                    event.currentTarget.value
                  )
                }
                minRows={3}
                maxRows={6}
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>

            <Grid.Col span={12}>
              <Textarea
                label="Fitment Notes"
                placeholder="Enter fitment notes"
                value={formData.fitmentNotes}
                onChange={(event) =>
                  handleInputChange("fitmentNotes", event.currentTarget.value)
                }
                minRows={2}
                maxRows={4}
                styles={{
                  label: {
                    fontWeight: 600,
                    fontSize: "13px",
                    color: "#374151",
                    marginBottom: "6px",
                  },
                  input: {
                    borderRadius: "8px",
                    border: "1px solid #d1d5db",
                    fontSize: "14px",
                    transition: "all 0.2s ease",
                    "&:focus": {
                      borderColor: "#3b82f6",
                      boxShadow: "0 0 0 3px rgba(59, 130, 246, 0.1)",
                    },
                  },
                }}
              />
            </Grid.Col>
          </Grid>

          <Divider />

          {/* Footer Actions */}
          <Group justify="flex-end">
            <Button
              variant="light"
              color="gray"
              onClick={handleCancel}
              styles={{
                root: {
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  height: "40px",
                  padding: "0 20px",
                  border: "2px solid #e2e8f0",
                  color: "#64748b",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  "&:hover": {
                    backgroundColor: "#f8fafc",
                    borderColor: "#cbd5e1",
                    transform: "translateY(-1px)",
                  },
                },
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              loading={saving}
              styles={{
                root: {
                  borderRadius: "10px",
                  fontWeight: 600,
                  fontSize: "14px",
                  height: "40px",
                  padding: "0 24px",
                  background:
                    "linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)",
                  border: "none",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                  boxShadow:
                    "0 4px 6px -1px rgba(59, 130, 246, 0.2), 0 2px 4px -1px rgba(59, 130, 246, 0.1)",
                  "&:hover": {
                    transform: "translateY(-2px)",
                    boxShadow:
                      "0 8px 25px -5px rgba(59, 130, 246, 0.3), 0 4px 6px -1px rgba(59, 130, 246, 0.1)",
                  },
                },
              }}
            >
              Save Changes
            </Button>
          </Group>
        </Stack>
      </Card>
    </div>
  );
}
