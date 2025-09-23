import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
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

interface EntityContextType {
  currentEntity: Entity | null;
  entities: Entity[];
  loading: boolean;
  error: string | null;
  switchEntity: (entityId: string) => Promise<void>;
  refreshEntities: () => Promise<void>;
  refreshCurrentEntity: () => Promise<void>;
}

const EntityContext = createContext<EntityContextType | undefined>(undefined);

interface EntityProviderProps {
  children: ReactNode;
}

export const EntityProvider: React.FC<EntityProviderProps> = ({ children }) => {
  const [currentEntity, setCurrentEntity] = useState<Entity | null>(null);
  const [entities, setEntities] = useState<Entity[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchEntities = async () => {
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
  };

  const fetchCurrentEntity = async () => {
    try {
      setError(null);
      const response = await apiClient.get("/api/tenants/current/");
      setCurrentEntity(response.data);
    } catch (err) {
      console.error("Failed to fetch current entity:", err);
      setError("Failed to load current entity");
    }
  };

  const switchEntity = async (entityId: string) => {
    try {
      setError(null);
      await apiClient.post(`/api/tenants/switch/${entityId}/`);

      // Update current entity
      const entity = entities.find((e) => e.id === entityId);
      if (entity) {
        setCurrentEntity(entity);
      } else {
        // Refresh entities if not found
        await refreshEntities();
      }
    } catch (err) {
      console.error("Failed to switch entity:", err);
      setError("Failed to switch entity");
      throw err;
    }
  };

  const refreshEntities = async () => {
    await fetchEntities();
  };

  const refreshCurrentEntity = async () => {
    await fetchCurrentEntity();
  };

  // Initialize on mount
  useEffect(() => {
    const initialize = async () => {
      await fetchEntities();
      await fetchCurrentEntity();
    };

    initialize();
  }, []);

  const value: EntityContextType = {
    currentEntity,
    entities,
    loading,
    error,
    switchEntity,
    refreshEntities,
    refreshCurrentEntity,
  };

  return (
    <EntityContext.Provider value={value}>{children}</EntityContext.Provider>
  );
};

export const useEntity = (): EntityContextType => {
  const context = useContext(EntityContext);
  if (context === undefined) {
    throw new Error("useEntity must be used within an EntityProvider");
  }
  return context;
};

export default EntityContext;
