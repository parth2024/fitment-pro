import { useState, useEffect, useCallback, useRef } from "react";
import apiClient from "../api/client";

// Global cache to prevent duplicate API calls
let entitiesCache: Entity[] | null = null;
let currentEntityCache: Entity | null = null;
let lastFetchTime = 0;
const CACHE_DURATION = 30000; // 30 seconds

interface Entity {
  id: string;
  name: string;
  slug: string | null;
  description?: string;
  is_active: boolean;
  is_default: boolean;
  user_count: number;
  created_at: string;
  fitment_settings?: Record<string, any>;
  ai_instructions?: string;
  contact_email?: string;
  contact_phone?: string;
  company_address?: string;
}

interface UseEntityReturn {
  currentEntity: Entity | null;
  entities: Entity[];
  loading: boolean;
  error: string | null;
  switchEntity: (entityId: string) => Promise<void>;
  refreshEntities: () => Promise<void>;
  refreshCurrentEntity: () => Promise<void>;
}

const ENTITY_STORAGE_KEY = "current_entity";

export const useEntity = (): UseEntityReturn => {
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(
    currentEntityCache
  );
  const [entities, setEntities] = useState<Entity[]>(entitiesCache || []);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const isInitialized = useRef(false);

  // Load entity from localStorage on mount
  useEffect(() => {
    const storedEntity = localStorage.getItem(ENTITY_STORAGE_KEY);
    if (storedEntity) {
      try {
        const entity = JSON.parse(storedEntity);
        setCurrentEntity(entity);
        currentEntityCache = entity; // Update cache to match localStorage
        console.log("Loaded entity from localStorage:", entity.name, entity.id);
      } catch (err) {
        console.warn("Invalid entity data in localStorage");
        localStorage.removeItem(ENTITY_STORAGE_KEY);
      }
    }
  }, []);

  // Note: Entity is only saved to localStorage when explicitly switched via selector

  const fetchEntities = useCallback(async () => {
    // Check cache first
    const now = Date.now();
    if (entitiesCache && now - lastFetchTime < CACHE_DURATION) {
      setEntities(entitiesCache);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/tenants/");
      entitiesCache = response.data;
      lastFetchTime = now;
      setEntities(response.data);
    } catch (err) {
      console.error("Failed to fetch entities:", err);
      setError("Failed to load entities");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCurrentEntity = useCallback(async () => {
    // Check localStorage first (prioritize over cache)
    const storedEntity = localStorage.getItem(ENTITY_STORAGE_KEY);
    if (storedEntity) {
      try {
        const entity = JSON.parse(storedEntity);
        setCurrentEntity(entity);
        currentEntityCache = entity; // Update cache to match localStorage
        console.log(
          "fetchCurrentEntity: Using entity from localStorage:",
          entity.name,
          entity.id
        );
        return entity;
      } catch (err) {
        console.warn("Invalid entity data in localStorage");
        localStorage.removeItem(ENTITY_STORAGE_KEY);
      }
    }

    // Then check cache
    if (currentEntityCache) {
      setCurrentEntity(currentEntityCache);
      console.log(
        "fetchCurrentEntity: Using cached entity:",
        currentEntityCache.name,
        currentEntityCache.id
      );
      return currentEntityCache;
    }

    // Finally, fetch from API
    try {
      setError(null);
      const response = await apiClient.get("/api/tenants/current/");
      const entity = response.data;
      setCurrentEntity(entity);
      currentEntityCache = entity;
      console.log(
        "fetchCurrentEntity: Fetched entity from API:",
        entity.name,
        entity.id
      );
      return entity;
    } catch (err) {
      console.error("Failed to fetch current entity:", err);
      setError("Failed to load current entity");
      return null;
    }
  }, []);

  const switchEntity = useCallback(
    async (entityId: string) => {
      try {
        setError(null);
        await apiClient.post(`/api/tenants/switch/${entityId}/`);

        // Update current entity
        const entity = entities.find((e) => e.id === entityId);
        if (entity) {
          setCurrentEntity(entity);
          currentEntityCache = entity; // Update cache immediately
          // Only save to localStorage when explicitly switching via selector
          localStorage.setItem(ENTITY_STORAGE_KEY, JSON.stringify(entity));
          console.log(
            "switchEntity: Updated entity to:",
            entity.name,
            entity.id
          );
        } else {
          // Refresh entities if not found
          await refreshEntities();
        }
      } catch (err) {
        console.error("Failed to switch entity:", err);
        setError("Failed to switch entity");
        throw err;
      }
    },
    [entities]
  );

  const refreshEntities = useCallback(async () => {
    // Clear cache to force fresh fetch
    entitiesCache = null;
    lastFetchTime = 0;
    await fetchEntities();
  }, [fetchEntities]);

  const refreshCurrentEntity = useCallback(async () => {
    await fetchCurrentEntity();
  }, [fetchCurrentEntity]);

  // Initialize on mount - only once
  useEffect(() => {
    if (isInitialized.current) {
      return;
    }

    const initialize = async () => {
      isInitialized.current = true;
      await fetchEntities();

      // If no current entity, try to fetch it
      if (!currentEntity) {
        await fetchCurrentEntity();
      }
    };

    initialize();
  }, [fetchEntities, fetchCurrentEntity, currentEntity]);

  return {
    currentEntity,
    entities,
    loading,
    error,
    switchEntity,
    refreshEntities,
    refreshCurrentEntity,
  };
};

export default useEntity;
