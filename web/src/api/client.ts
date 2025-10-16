import axios from "axios";

// Global request deduplication to prevent duplicate API calls
const pendingRequests = new Map<string, Promise<any>>();

// Create axios instance with base configuration
const apiClient = axios.create({
  baseURL: (import.meta as any).env.VITE_BACKEND_URL || "http://localhost:8001",
  timeout: 120000, // 2 minutes for AI processing
  headers: {
    "Content-Type": "application/json",
  },
  // withCredentials: true, // Disabled for JWT authentication
});

// Request interceptor
apiClient.interceptors.request.use(
  (config) => {
    // Add JWT authentication token if available
    const accessToken = localStorage.getItem("access_token");
    if (accessToken) {
      config.headers.Authorization = `Bearer ${accessToken}`;
    }

    // Add tenant context if available (but only if not already set by the request)
    if (!config.headers["X-Tenant-ID"]) {
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
    } else {
      console.log("DEBUG: X-Tenant-ID header already set, not overriding");
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
  async (error) => {
    const originalRequest = error.config;

    // Handle 401 errors (token expired)
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refresh_token");
        if (refreshToken) {
          const response = await axios.post(
            `${
              (import.meta as any).env.VITE_BACKEND_URL ||
              "http://localhost:8001"
            }/api/auth/refresh/`,
            { refresh_token: refreshToken }
          );

          if (response.data.success) {
            localStorage.setItem("access_token", response.data.access_token);
            originalRequest.headers.Authorization = `Bearer ${response.data.access_token}`;
            return apiClient(originalRequest);
          }
        }
      } catch (refreshError) {
        // Refresh failed, redirect to login
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

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
    // Include headers in the request key to prevent deduplication of requests with different tenant IDs
    const requestKey = `GET_${url}_${JSON.stringify(
      config?.params || {}
    )}_${JSON.stringify(config?.headers || {})}`;

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
