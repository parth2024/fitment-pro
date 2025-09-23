import axios from "axios";

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

export default apiClient;
