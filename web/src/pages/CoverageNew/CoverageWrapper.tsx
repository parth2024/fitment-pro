import React from "react";
import { useAuth } from "../../contexts/AuthContext";
import { useEntity } from "../../hooks/useEntity";
import { useProfessionalToast } from "../../hooks/useProfessionalToast";
import Coverage from "./Coverage";
import { vcdbService } from "../../api/services";
import { useEffect, useState, useCallback } from "react";
import { Loader, Center, Stack, Text } from "@mantine/core";

// Global cache for year range to prevent duplicate API calls
let yearRangeCache: { min: number; max: number } | null = null;
let lastYearRangeFetch = 0;
const YEAR_RANGE_CACHE_DURATION = 60000; // 1 minute

const CoverageWrapper: React.FC = () => {
  const { user } = useAuth();
  const { currentEntity, loading: entityLoading } = useEntity();
  const { showError } = useProfessionalToast();
  const [yearRange, setYearRange] = useState<{
    min: number;
    max: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch year range
  const fetchYearRange = useCallback(async () => {
    if (!currentEntity) {
      return;
    }

    // Check cache first
    const now = Date.now();
    if (
      yearRangeCache &&
      now - lastYearRangeFetch < YEAR_RANGE_CACHE_DURATION
    ) {
      setYearRange(yearRangeCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(
        "Fetching year range for entity:",
        currentEntity.name,
        "ID:",
        currentEntity.id
      );

      const response = await vcdbService.getYearRange();
      yearRangeCache = response.data;
      lastYearRangeFetch = now;
      setYearRange(response.data);
      console.log(
        "Year range loaded successfully for entity:",
        currentEntity.name
      );
    } catch (error) {
      console.error("Error fetching year range:", error);
      showError("Failed to load year range data");
      // Fallback to default range
      setYearRange({ min: 2010, max: 2025 });
    } finally {
      setLoading(false);
    }
  }, [currentEntity, showError]);

  // Effect for entity changes
  useEffect(() => {
    if (!currentEntity) {
      return;
    }

    fetchYearRange();
  }, [currentEntity?.id, fetchYearRange]);

  // Effect to listen for entity changes via custom event
  useEffect(() => {
    let timeoutId: number;

    const handleEntityChange = (event: CustomEvent) => {
      console.log(
        "Entity changed event received in CoverageWrapper:",
        event.detail
      );

      // Clear any pending timeouts
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      // Clear current year range and fetch new data for the new entity
      setYearRange(null);
      setLoading(true);

      // Fetch year range for the new entity with debouncing
      timeoutId = setTimeout(() => {
        fetchYearRange();
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
  }, [fetchYearRange]);

  const handleError = (error: any) => {
    console.error("Coverage error:", error);
    showError(error.message || "An error occurred");
  };

  if (entityLoading || loading) {
    return (
      <Center p="xl">
        <Stack align="center" gap="md">
          <Loader size="lg" />
          <Text c="dimmed">
            {entityLoading
              ? "Loading entity data..."
              : "Loading coverage data..."}
          </Text>
        </Stack>
      </Center>
    );
  }

  if (!currentEntity) {
    return (
      <Center p="xl">
        <Text c="dimmed">Please select an entity to view coverage data</Text>
      </Center>
    );
  }

  if (!yearRange || !user) {
    return (
      <Center p="xl">
        <Text c="dimmed">Unable to load coverage data</Text>
      </Center>
    );
  }

  return (
    <Coverage
      user={{
        accessToken: "mock-token", // Mock token since the API doesn't require authentication
        name: user?.name,
      }}
      defaultMinYear={yearRange.min}
      defaultMaxYear={yearRange.max}
      yearOptions={{
        "year-from": yearRange.min,
        "year-to": yearRange.max,
      }}
      onError={handleError}
      tabOpened={true}
    />
  );
};

export default CoverageWrapper;
