import { useState, useEffect, useCallback } from "react";
import apiClient from "../api/client";

interface Entity {
  id: string;
  name: string;
  slug: string;
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
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load entity from localStorage on mount
  useEffect(() => {
    const storedEntity = localStorage.getItem(ENTITY_STORAGE_KEY);
    if (storedEntity) {
      try {
        const entity = JSON.parse(storedEntity);
        setCurrentEntity(entity);
      } catch (err) {
        console.warn("Invalid entity data in localStorage");
        localStorage.removeItem(ENTITY_STORAGE_KEY);
      }
    }
  }, []);

  // Note: Entity is only saved to localStorage when explicitly switched via selector

  const fetchEntities = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await apiClient.get("/api/tenants/");
      setEntities(response.data);
    } catch (err) {
      console.error("Failed to fetch entities:", err);
      setError("Failed to load entities");
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchCurrentEntity = useCallback(async () => {
    try {
      setError(null);
      const response = await apiClient.get("/api/tenants/current/");
      const entity = response.data;
      setCurrentEntity(entity);
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
          // Only save to localStorage when explicitly switching via selector
          localStorage.setItem(ENTITY_STORAGE_KEY, JSON.stringify(entity));
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
    await fetchEntities();
  }, [fetchEntities]);

  const refreshCurrentEntity = useCallback(async () => {
    await fetchCurrentEntity();
  }, [fetchCurrentEntity]);

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
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
