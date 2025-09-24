import axios from "axios";

// Global request deduplication to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>();

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: (import.meta as any).env.VITE_BACKEND_URL,
  timeout: 120000, // 2 minutes for AI processing
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add authentication token if available
    const token = localStorage.getItem("auth_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    // Add tenant context if available
    const currentEntity = localStorage.getItem("current_entity");
    if (currentEntity) {
      try {
        const entity = JSON.parse(currentEntity);
        config.headers["X-Tenant-ID"] = entity.id;
        console.log(
          "DEBUG: Adding X-Tenant-ID header:",
          entity.id,
          "for entity:",
          entity.name
        );
      } catch (err) {
        console.warn("Invalid entity data in localStorage");
      }
    } else {
      console.log("DEBUG: No current_entity found in localStorage");
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
apiClient.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response) {
      // Server responded with error status
      console.error("API Error:", error.response.data);
    } else if (error.request) {
      // Request made but no response
      console.error("Network Error:", error.message);
    } else {
      // Something else happened
      console.error("Error:", error.message);
    }
    return Promise.reject(error);
  }
);

// Wrapper function to prevent duplicate API calls
const deduplicatedApiClient = {
  get: (url: string, config?: any) => {
    const requestKey = `GET_${url}_${JSON.stringify(config?.params || {})}`;

    if (pendingRequests.has(requestKey)) {
      console.log("DEBUG: Deduplicating GET request:", url);
      return pendingRequests.get(requestKey)!;
    }

    const promise = apiClient.get(url, config).finally(() => {
      pendingRequests.delete(requestKey);
    });

    pendingRequests.set(requestKey, promise);
    return promise;
  },

  post: (url: string, data?: any, config?: any) => {
    const requestKey = `POST_${url}_${JSON.stringify(data || {})}`;

    if (pendingRequests.has(requestKey)) {
      console.log("DEBUG: Deduplicating POST request:", url);
      return pendingRequests.get(requestKey)!;
    }

    const promise = apiClient.post(url, data, config).finally(() => {
      pendingRequests.delete(requestKey);
    });

    pendingRequests.set(requestKey, promise);
    return promise;
  },

  put: (url: string, data?: any, config?: any) => {
    const requestKey = `PUT_${url}_${JSON.stringify(data || {})}`;

    if (pendingRequests.has(requestKey)) {
      console.log("DEBUG: Deduplicating PUT request:", url);
      return pendingRequests.get(requestKey)!;
    }

    const promise = apiClient.put(url, data, config).finally(() => {
      pendingRequests.delete(requestKey);
    });

    pendingRequests.set(requestKey, promise);
    return promise;
  },

  delete: (url: string, config?: any) => {
    const requestKey = `DELETE_${url}_${JSON.stringify(config?.params || {})}`;

    if (pendingRequests.has(requestKey)) {
      console.log("DEBUG: Deduplicating DELETE request:", url);
      return pendingRequests.get(requestKey)!;
    }

    const promise = apiClient.delete(url, config).finally(() => {
      pendingRequests.delete(requestKey);
    });

    pendingRequests.set(requestKey, promise);
    return promise;
  },

  patch: (url: string, data?: any, config?: any) => {
    const requestKey = `PATCH_${url}_${JSON.stringify(data || {})}`;

    if (pendingRequests.has(requestKey)) {
      console.log("DEBUG: Deduplicating PATCH request:", url);
      return pendingRequests.get(requestKey)!;
    }

    const promise = apiClient.patch(url, data, config).finally(() => {
      pendingRequests.delete(requestKey);
    });

    pendingRequests.set(requestKey, promise);
    return promise;
  },
};

export default deduplicatedApiClient;
