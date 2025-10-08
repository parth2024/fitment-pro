import React, { useEffect, useState, useCallback } from "react";
import {
  Table,
  Text,
  Badge,
  Stack,
  Alert,
  Loader,
  Center,
  Card,
  Title,
} from "@mantine/core";
import { IconAlertTriangle, IconInfoCircle } from "@tabler/icons-react";
import { vcdbService, VehicleConfiguration } from "../../api/services";
import { useEntity } from "../../hooks/useEntity";
import {
  ConfigurationSelectedAttributes,
  CoverageSelectedMake,
  defaultConfigurationSelectedAttributes,
  ErrorHandlerProps,
  UserProps,
  YearSelectedAttributes,
} from "./types";
import "./Coverage.css";

interface CoverageConfigurationsProps extends UserProps, ErrorHandlerProps {
  yearRange: YearSelectedAttributes;
  selectedMake: CoverageSelectedMake;
}

const CoverageConfigurations: React.FC<CoverageConfigurationsProps> = (
  props
) => {
  const { currentEntity } = useEntity();
  const [filter, setFilter] = useState<ConfigurationSelectedAttributes>({
    ...defaultConfigurationSelectedAttributes,
    "year-from": 1896,
    "year-to": 2023,
  });
  const [configurations, setConfigurations] = useState<VehicleConfiguration[]>(
    []
  );
  const [loading, setLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false); // Flag to prevent multiple simultaneous calls

  useEffect(() => {
    setFilter((oldFilter) => {
      return {
        ...oldFilter,
        makes: [props.selectedMake.make],
        "with-fitments": props.selectedMake.withFitments,
        "year-from": props.yearRange["year-from"],
        "year-to": props.yearRange["year-to"],
      };
    });
  }, [
    props.selectedMake.make,
    props.selectedMake.withFitments,
    props.yearRange["year-from"],
    props.yearRange["year-to"],
  ]);

  // Function to fetch configurations
  const fetchConfigurations = useCallback(async () => {
    if (
      filter.makes.length === 0 ||
      filter.makes[0] === "" ||
      !currentEntity ||
      isFetching
    ) {
      setConfigurations([]);
      return;
    }

    setIsFetching(true);
    setLoading(true);
    try {
      console.log(
        "Fetching configurations for entity:",
        currentEntity.name,
        "ID:",
        currentEntity.id
      );

      const params = {
        make: filter.makes[0],
        year_from: filter["year-from"],
        year_to: filter["year-to"],
        limit: 100, // Limit results for performance
      };

      const response = await vcdbService.getConfigurations(params);
      setConfigurations(response.data.results || response.data || []);
      console.log(
        "Configurations loaded successfully for entity:",
        currentEntity.name
      );
    } catch (error) {
      props.onError(error);
      setConfigurations([]);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [filter, props.onError, currentEntity, isFetching]);

  // Effect for filter changes
  useEffect(() => {
    if (filter.makes.length === 0 || filter.makes[0] === "" || !currentEntity) {
      setConfigurations([]);
      return;
    }

    // Add a small delay to debounce rapid changes
    const timeoutId = setTimeout(() => {
      fetchConfigurations();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [filter, currentEntity?.id, fetchConfigurations]);

  // Effect to listen for entity changes via custom event
  useEffect(() => {
    let timeoutId: number;

    const handleEntityChange = (event: CustomEvent) => {
      console.log(
        "Entity changed event received in CoverageConfigurations:",
        event.detail
      );

      // Clear any pending timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Clear current data and reset selected make
      setConfigurations([]);
      setLoading(false);

      // Fetch data for the new entity if we have a selected make
      if (filter.makes.length > 0 && filter.makes[0] !== "") {
        timeoutId = setTimeout(() => {
          fetchConfigurations();
        }, 500); // Increased delay to prevent rapid calls
      }
    };

    // Listen for entity change events
    window.addEventListener(
      "entityChanged",
      handleEntityChange as EventListener
    );

    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener(
        "entityChanged",
        handleEntityChange as EventListener
      );
    };
  }, [fetchConfigurations, filter.makes]);

  if (filter.makes.length === 0 || filter.makes[0] === "") {
    return null;
  }

  return (
    <div className="CoverageConfigurations">
      <Card shadow="sm" padding="lg" radius="md">
        <Stack gap="md">
          <Title order={3}>
            Vehicle Configurations - {props.selectedMake.make}
          </Title>

          <Alert
            icon={<IconInfoCircle size={16} />}
            color="blue"
            variant="light"
          >
            Showing configurations for {props.selectedMake.make} from{" "}
            {filter["year-from"]} to {filter["year-to"]}
            {props.selectedMake.withFitments
              ? " (with fitments)"
              : " (all configurations)"}
          </Alert>

          {loading ? (
            <Center p="xl">
              <Stack align="center" gap="md">
                <Loader size="lg" />
                <Text c="dimmed">Loading configurations...</Text>
              </Stack>
            </Center>
          ) : configurations.length > 0 ? (
            <Table striped highlightOnHover>
              <Table.Thead>
                <Table.Tr>
                  <Table.Th>Year</Table.Th>
                  <Table.Th>Make</Table.Th>
                  <Table.Th>Model</Table.Th>
                  <Table.Th>Submodel</Table.Th>
                  <Table.Th>Drive Type</Table.Th>
                  <Table.Th>Fuel Type</Table.Th>
                  <Table.Th>Body Type</Table.Th>
                  <Table.Th>Doors</Table.Th>
                </Table.Tr>
              </Table.Thead>
              <Table.Tbody>
                {configurations.map((config, index) => (
                  <Table.Tr key={index}>
                    <Table.Td>
                      <Text fw={500}>{config.year}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Badge color="blue" variant="light">
                        {config.make}
                      </Badge>
                    </Table.Td>
                    <Table.Td>
                      <Text>{config.model}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm" c="dimmed">
                        {config.submodel || "N/A"}
                      </Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{config.driveType}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{config.fuelType}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{config.bodyType}</Text>
                    </Table.Td>
                    <Table.Td>
                      <Text size="sm">{config.numDoors}</Text>
                    </Table.Td>
                  </Table.Tr>
                ))}
              </Table.Tbody>
            </Table>
          ) : (
            <Center p="xl">
              <Stack align="center" gap="md">
                <IconAlertTriangle
                  size={48}
                  color="var(--mantine-color-orange-6)"
                />
                <Text c="dimmed" size="lg">
                  No configurations found
                </Text>
                <Text c="dimmed" size="sm">
                  Try adjusting the year range or selecting a different make.
                </Text>
              </Stack>
            </Center>
          )}
        </Stack>
      </Card>
    </div>
  );
};

export default CoverageConfigurations;
