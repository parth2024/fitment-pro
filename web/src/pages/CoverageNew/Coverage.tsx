import React, { useEffect, useState, useCallback } from "react";
import { Stack, Alert, Loader, Center, Text } from "@mantine/core";
import { IconAlertTriangle } from "@tabler/icons-react";
import { fitmentsService, Coverage as CoverageType } from "../../api/services";
import { useEntity } from "../../hooks/useEntity";
import CoverageYearsRange from "./CoverageYearsRange";
import CoverageChart from "./CoverageChart";
import CoverageConfigurations from "./CoverageConfigurations";
import {
  ErrorHandlerProps,
  UserProps,
  YearOptionProps,
  YearSelectedAttributes,
  CoverageSelectedMake,
} from "./types";
import "./Coverage.css";

// Global cache for coverage data to prevent duplicate API calls
let coverageCache = new Map<
  string,
  { data: CoverageType[]; timestamp: number }
>();
const COVERAGE_CACHE_DURATION = 30000; // 30 seconds

interface CoverageProps extends UserProps, YearOptionProps, ErrorHandlerProps {
  tabOpened: boolean;
  selectedEntities?: string[];
}

const Coverage: React.FC<CoverageProps> = (props) => {
  const { currentEntity } = useEntity();
  const [yearValues, setYearValues] = useState<YearSelectedAttributes>({
    "year-from": props.defaultMinYear,
    "year-to": props.defaultMaxYear,
  });

  useEffect(() => {
    setYearValues({
      "year-from": props.defaultMinYear,
      "year-to": props.defaultMaxYear,
    });
  }, [props.defaultMinYear, props.defaultMaxYear]);

  const [coverage, setCoverage] = useState<CoverageType[]>([]);
  const [selectedMake, setSelectedMake] = useState<CoverageSelectedMake>({
    make: "",
    withFitments: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isFetching, setIsFetching] = useState(false); // Flag to prevent multiple simultaneous calls
  const [hasInitialized, setHasInitialized] = useState(false); // Flag to prevent multiple initializations

  const handlePropertyChange = useCallback((filter: string, value: number) => {
    setYearValues((oldValues) => {
      return { ...oldValues, [filter]: value };
    });
  }, []);

  // Function to fetch coverage data
  const fetchCoverage = useCallback(async () => {
    if (!props.tabOpened || isFetching) {
      return;
    }

    // Use selectedEntities if available, otherwise fall back to currentEntity
    const entitiesToUse =
      props.selectedEntities && props.selectedEntities.length > 0
        ? props.selectedEntities
        : currentEntity
        ? [currentEntity.id]
        : [];

    if (entitiesToUse.length === 0) {
      return;
    }

    // Create cache key based on entities and year range
    const cacheKey = `${entitiesToUse.join(",")}_${yearValues["year-from"]}_${
      yearValues["year-to"]
    }`;
    const now = Date.now();

    // Check cache first
    const cachedData = coverageCache.get(cacheKey);
    if (cachedData && now - cachedData.timestamp < COVERAGE_CACHE_DURATION) {
      console.log("Using cached coverage data for entities:", entitiesToUse);
      setCoverage(cachedData.data);
      setLoading(false);
      return;
    }

    setIsFetching(true);
    setLoading(true);
    setError(null);
    try {
      console.log(
        "Fetching coverage data for entities:",
        entitiesToUse,
        "Year range:",
        yearValues["year-from"],
        "-",
        yearValues["year-to"]
      );

      const response = await fitmentsService.getCoverage({
        yearFrom: yearValues["year-from"],
        yearTo: yearValues["year-to"],
        entity_ids: entitiesToUse.join(","),
      });

      // Transform the response to match our expected format
      const coverageData = response.data.items || response.data || [];

      // Calculate coverage percentage for each item
      const coverageWithPercent = coverageData.map((item: any) => ({
        ...item,
        coveragePercent:
          item.configsCount > 0
            ? Math.round((item.fittedConfigsCount / item.configsCount) * 100)
            : 0,
      }));

      // Sort by make name
      const sortedCoverage = coverageWithPercent.sort((a: any, b: any) =>
        a.make.localeCompare(b.make)
      );

      // Cache the result
      coverageCache.set(cacheKey, { data: sortedCoverage, timestamp: now });

      setCoverage(sortedCoverage);
      console.log(
        "Coverage data loaded successfully for entities:",
        entitiesToUse
      );
    } catch (error) {
      console.error("Error fetching coverage:", error);
      setError("Failed to load coverage data. Please try again.");
      props.onError(error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  }, [
    props.tabOpened,
    props.selectedEntities,
    currentEntity,
    yearValues["year-from"],
    yearValues["year-to"],
    props.onError,
    isFetching,
  ]);

  // Effect for year range changes and entity changes
  useEffect(() => {
    if (!props.tabOpened) {
      return;
    }

    // Check if we have entities to use (either selectedEntities or currentEntity)
    const entitiesToUse =
      props.selectedEntities && props.selectedEntities.length > 0
        ? props.selectedEntities
        : currentEntity
        ? [currentEntity.id]
        : [];

    if (entitiesToUse.length === 0) {
      return;
    }

    // Prevent multiple initializations when tab is first opened
    if (!hasInitialized) {
      setHasInitialized(true);
    }

    // Add a small delay to debounce rapid changes
    const timeoutId = setTimeout(() => {
      fetchCoverage();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [
    yearValues["year-from"],
    yearValues["year-to"],
    props.tabOpened,
    props.selectedEntities,
    currentEntity?.id,
    fetchCoverage,
    hasInitialized,
  ]);

  // Effect to listen for entity changes via custom event
  useEffect(() => {
    let timeoutId: number;

    const handleEntityChange = (event: CustomEvent) => {
      console.log("Entity changed event received:", event.detail);

      // Clear any pending timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Clear current data and cache for the new entity
      setCoverage([]);
      setSelectedMake({ make: "", withFitments: false });
      setError(null);
      setHasInitialized(false); // Reset initialization flag

      // Clear coverage cache when entity changes
      coverageCache.clear();

      // Fetch data for the new entity with debouncing
      timeoutId = setTimeout(() => {
        fetchCoverage();
      }, 500); // Increased delay to prevent rapid calls
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
  }, [fetchCoverage]);

  return (
    <div style={{ padding: "24px 0" }}>
      <Stack gap="lg">
        <CoverageYearsRange
          values={yearValues}
          options={props.yearOptions}
          onPropertyChange={handlePropertyChange}
        />

        {loading ? (
          <Center p="xl">
            <Stack align="center" gap="md">
              <Loader size="lg" />
              <Text c="dimmed">Loading coverage data...</Text>
            </Stack>
          </Center>
        ) : error ? (
          <Alert
            icon={<IconAlertTriangle size={16} />}
            color="red"
            variant="light"
          >
            {error}
          </Alert>
        ) : (
          <>
            <CoverageChart coverage={coverage} onMakeSelect={setSelectedMake} />
            <CoverageConfigurations
              yearRange={yearValues}
              selectedMake={selectedMake}
              user={props.user}
              onError={props.onError}
            />
          </>
        )}
      </Stack>
    </div>
  );
};

export default Coverage;
