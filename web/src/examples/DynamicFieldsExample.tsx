import React, { useState } from "react";
import {
  Container,
  Title,
  Text,
  Stack,
  Card,
  Group,
  Button,
  Alert,
} from "@mantine/core";
import { IconInfoCircle } from "@tabler/icons-react";
import VehicleSearchCriteria from "../components/VehicleSearchCriteria";
import FitmentDetails from "../components/FitmentDetails";
import { useDynamicFields } from "../hooks/useDynamicFields";

export const DynamicFieldsExample: React.FC = () => {
  const { loading, error, refreshFieldConfigurations } = useDynamicFields();

  // Mock data for demonstration
  const [vehicleFilters, setVehicleFilters] = useState({
    yearFrom: "",
    yearTo: "",
    make: "",
    model: "",
    submodel: "",
    fuelType: "",
    numDoors: "",
    driveType: "",
    bodyType: "",
  });

  const [fitmentDetails, setFitmentDetails] = useState({
    partId: "",
    position: "",
    quantity: 1,
    title: "",
    description: "",
    notes: "",
    liftHeight: "",
    wheelType: "",
  });

  const [loadingDropdownData] = useState(false);

  // Mock dropdown data
  const dropdownData = {
    years: ["2020", "2021", "2022", "2023", "2024"],
    makes: ["Toyota", "Honda", "Ford", "Chevrolet", "BMW"],
    models: ["Camry", "Accord", "F-150", "Silverado", "X3"],
    submodels: ["LE", "EX", "XLT", "LT", "xDrive30i"],
    fuel_types: ["Gasoline", "Hybrid", "Electric", "Diesel"],
    num_doors: ["2", "4", "5"],
    drive_types: ["FWD", "RWD", "AWD", "4WD"],
    body_types: ["Sedan", "SUV", "Truck", "Coupe", "Hatchback"],
    parts: ["Part A", "Part B", "Part C"],
    positions: ["Front", "Rear", "Left", "Right"],
  };

  const lookupData = {
    lift_heights: [
      { value: "2 inch" },
      { value: "3 inch" },
      { value: "4 inch" },
      { value: "6 inch" },
    ],
    wheel_types: [
      { value: "Alloy" },
      { value: "Steel" },
      { value: "Carbon Fiber" },
    ],
  };

  const handleClearFilters = () => {
    setVehicleFilters({
      yearFrom: "",
      yearTo: "",
      make: "",
      model: "",
      submodel: "",
      fuelType: "",
      numDoors: "",
      driveType: "",
      bodyType: "",
    });
  };

  const handleClearFitmentDetails = () => {
    setFitmentDetails({
      partId: "",
      position: "",
      quantity: 1,
      title: "",
      description: "",
      notes: "",
      liftHeight: "",
      wheelType: "",
    });
  };

  if (loading) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconInfoCircle size={16} />} color="blue">
          Loading field configurations...
        </Alert>
      </Container>
    );
  }

  if (error) {
    return (
      <Container size="xl" py="xl">
        <Alert icon={<IconInfoCircle size={16} />} color="red">
          Error loading field configurations: {error}
        </Alert>
      </Container>
    );
  }

  return (
    <Container size="xl" py="xl">
      <Stack gap="xl">
        <div>
          <Title order={1} mb="xs" style={{ color: "#2c3e50" }}>
            Dynamic Field Configuration Demo
          </Title>
          <Text c="dimmed" size="lg">
            This example demonstrates how field visibility and requirements are
            dynamically controlled based on the field configuration settings.
          </Text>
        </div>

        <Alert icon={<IconInfoCircle size={16} />} color="blue" variant="light">
          <Text size="sm">
            <strong>How it works:</strong>
            <br />• Fields are shown/hidden based on the <code>
              is_enabled
            </code>{" "}
            and <code>show_in_forms</code> settings
            <br />• Fields are marked as required/optional based on the{" "}
            <code>requirement_level</code> setting
            <br />
            • Field types, validation rules, and display options are all
            configurable
            <br />• Configure these settings in the Settings page to see changes
            here
          </Text>
        </Alert>

        <Group>
          <Button
            variant="outline"
            onClick={refreshFieldConfigurations}
            size="sm"
          >
            Refresh Field Configurations
          </Button>
        </Group>

        <Card withBorder padding="lg" radius="md">
          <Title order={2} mb="md">
            Vehicle Search Criteria
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            These fields are controlled by VCDB field configurations. Fields
            that are disabled or set to not show in forms will be hidden.
          </Text>
          <VehicleSearchCriteria
            vehicleFilters={vehicleFilters}
            setVehicleFilters={setVehicleFilters}
            dropdownData={dropdownData}
            loadingDropdownData={loadingDropdownData}
            onClearFilters={handleClearFilters}
          />
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Title order={2} mb="md">
            Fitment Details
          </Title>
          <Text size="sm" c="dimmed" mb="md">
            These fields are controlled by Product field configurations. Fields
            that are disabled or set to not show in forms will be hidden.
          </Text>
          <FitmentDetails
            fitmentDetails={fitmentDetails}
            setFitmentDetails={setFitmentDetails}
            dropdownData={dropdownData}
            lookupData={lookupData}
            loadingDropdownData={loadingDropdownData}
            onClearFitmentDetails={handleClearFitmentDetails}
          />
        </Card>

        <Card withBorder padding="lg" radius="md">
          <Title order={3} mb="md">
            Current Field Values
          </Title>
          <Stack gap="sm">
            <div>
              <Text fw={500} size="sm">
                Vehicle Filters:
              </Text>
              <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                {JSON.stringify(vehicleFilters, null, 2)}
              </Text>
            </div>
            <div>
              <Text fw={500} size="sm">
                Fitment Details:
              </Text>
              <Text size="xs" c="dimmed" style={{ fontFamily: "monospace" }}>
                {JSON.stringify(fitmentDetails, null, 2)}
              </Text>
            </div>
          </Stack>
        </Card>
      </Stack>
    </Container>
  );
};

export default DynamicFieldsExample;
