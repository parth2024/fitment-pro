import apiClient from "./client";

// Types
export interface VehicleConfiguration {
  id: string;
  vehicleId: string;
  baseVehicleId: string;
  year: number;
  make: string;
  model: string;
  submodel: string;
  driveType: string;
  fuelType: string;
  numDoors: number;
  bodyType: string;
}

export interface Part {
  id: string;
  hash: string;
  description: string;
  unitOfMeasure: string;
  itemStatus: number;
}

export interface PartType {
  id: string;
  description: string;
  partPositionIds: number[];
}

export interface FlattenedAppliedFitment {
  hash: string;
  partId: string;
  itemStatus: string;
  itemStatusCode: number;
  baseVehicleId: string;
  year: number;
  makeName: string;
  modelName: string;
  subModelName: string;
  driveTypeName: string;
  fuelTypeName: string;
  bodyNumDoors: number;
  bodyTypeName: string;
  ptid: string;
  partTypeDescriptor: string;
  uom: string;
  quantity: number;
  fitmentTitle: string;
  fitmentDescription: string;
  fitmentNotes: string;
  position: string;
  positionId: number;
  liftHeight: string;
  wheelType: string;
  tireDiameter1?: string;
  tireDiameter2?: string;
  tireDiameter3?: string;
  wheelDiameter1?: string;
  wheelDiameter2?: string;
  wheelDiameter3?: string;
  backSpacing1?: string;
  backSpacing2?: string;
  backSpacing3?: string;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
}

export interface Coverage {
  make: string;
  configsCount: number;
  fittedConfigsCount: number;
}

export interface PotentialVehicleConfiguration extends VehicleConfiguration {
  relevance: number;
  reason: string;
}

// API Services
export const diagnosticsService = {
  ping: () => apiClient.get("/ping"),
  healthy: () => apiClient.get("/healthy"),
  metrics: () => apiClient.get("/metrics"),
  version: () => apiClient.get("/api/version"),
};

export const vcdbService = {
  getVersion: () => apiClient.get("/api/vcdb/version"),
  getYearRange: () => apiClient.get("/api/vcdb/year-range"),
  getProperty: (property: string, params?: any) =>
    apiClient.get(`/api/vcdb/property/${property}`, { params }),
  getConfigurations: (params?: any) =>
    apiClient.get("/api/vcdb/configurations", { params }),
};

export const partsService = {
  getParts: (params?: any) => apiClient.get("/api/parts", { params }),
  getPartTypes: () => apiClient.get("/api/parts/types"),
};

export const fitmentsService = {
  getFitments: (params?: any) => apiClient.get("/api/fitments", { params }),
  createFitment: (data: any) => apiClient.post("/api/fitments", data),
  deleteFitments: (params?: any) =>
    apiClient.delete("/api/fitments", { params }),
  getCoverage: (params?: any) =>
    apiClient.get("/api/fitments/coverage", { params }),
  getProperty: (property: string, params?: any) =>
    apiClient.get(`/api/fitments/property/${property}`, { params }),
  validateCSV: (file: File) => {
    const formData = new FormData();
    formData.append("fitments", file);
    return apiClient.post("/api/fitments/validate", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  submitValidated: () => apiClient.post("/api/fitments/submit"),
};

export const potentialService = {
  getPotentialFitments: (partId: string, params?: any) =>
    apiClient.get(`/api/potential-fitments/${partId}`, { params }),
};

export const adminService = {
  importData: (dataKind: string) =>
    apiClient.get(`/api/azure/import/${dataKind}`),
  exportFitments: (params?: any) =>
    apiClient.get("/api/azure/export/fitments", { params }),
};

export const uploadsService = {
  create: (
    file: File,
    { tenantId, presetId }: { tenantId?: string; presetId?: string } = {}
  ) => {
    const fd = new FormData();
    fd.append("file", file);
    if (tenantId) fd.append("tenantId", tenantId);
    if (presetId) fd.append("presetId", presetId);
    return apiClient.post("/api/uploads", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  list: (params?: any) => apiClient.get("/api/uploads", { params }),
  aiMap: (uploadId: string) =>
    apiClient.post(`/api/uploads/${uploadId}/ai-map`),
  vcdbValidate: (uploadId: string) =>
    apiClient.post(`/api/uploads/${uploadId}/vcdb-validate`),
  publish: (uploadId: string) =>
    apiClient.post(`/api/uploads/${uploadId}/publish`),
};

export const reviewService = {
  list: (params?: any) => apiClient.get("/api/review-queue", { params }),
  actions: (action: "approve" | "reject", ids: string[]) =>
    apiClient.post("/api/review-queue/actions", { action, ids }),
};

export const presetsService = {
  list: (params?: any) => apiClient.get("/api/presets", { params }),
  create: (body: {
    tenantId: string;
    name: string;
    attributePriorities: any;
  }) => apiClient.post("/api/presets", body),
  update: (
    id: string,
    body: Partial<{ name: string; attributePriorities: any }>
  ) => apiClient.patch(`/api/presets/${id}`, body),
};

// New fitment upload services (Django endpoints)
export const fitmentUploadService = {
  uploadFiles: (vcdbFile: File, productsFile: File) => {
    const formData = new FormData();
    formData.append("vcdb_file", vcdbFile);
    formData.append("products_file", productsFile);
    return apiClient.post("/api/upload-fitment-files/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  processAiFitment: (sessionId: string) =>
    apiClient.post(
      "/api/ai-fitment/",
      { session_id: sessionId },
      { timeout: 180000 }
    ), // 3 minutes for AI processing

  processDataUploadsAiFitment: (sessionId: string) =>
    apiClient.post(
      "/api/data-uploads/ai-fitment/",
      { session_id: sessionId },
      { timeout: 180000 }
    ),
  applyAiFitments: (sessionId: string, fitmentIds: string[]) =>
    apiClient.post("/api/apply-ai-fitments/", {
      session_id: sessionId,
      fitment_ids: fitmentIds,
    }),
  applyDataUploadsAiFitments: (sessionId: string, fitmentIds: string[]) =>
    apiClient.post("/api/data-uploads/apply-ai-fitments/", {
      session_id: sessionId,
      fitment_ids: fitmentIds,
    }),
  getSessionStatus: (sessionId: string) =>
    apiClient.get(`/api/session/${sessionId}/status/`),
  getAiFitments: (sessionId: string) =>
    apiClient.get(`/api/ai-fitments/?session_id=${sessionId}`),
  getAppliedFitments: (sessionId?: string) => {
    const params = sessionId ? `?session_id=${sessionId}` : "";
    return apiClient.get(`/api/applied-fitments${params}`);
  },
  exportFitments: (
    format: "csv" | "xlsx" | "json",
    sessionId?: string,
    exportType: "ai_fitments" | "applied_fitments" = "ai_fitments",
    fitmentIds?: string[]
  ) => {
    const params = new URLSearchParams();
    params.append("format", format);
    params.append("type", exportType);
    if (sessionId) {
      params.append("session_id", sessionId);
    }
    if (fitmentIds && fitmentIds.length > 0) {
      params.append("fitment_ids", fitmentIds.join(","));
    }
    return apiClient.get(`/api/export/?${params.toString()}`, {
      responseType: "blob",
    });
  },
  exportAiFitments: (
    format: "csv" | "xlsx" | "json",
    sessionId: string,
    fitmentIds?: string[]
  ) => {
    const params = new URLSearchParams();
    params.append("export_format", format);
    params.append("session_id", sessionId);
    if (fitmentIds && fitmentIds.length > 0) {
      params.append("fitment_ids", fitmentIds.join(","));
    }
    return apiClient.get(`/api/export-ai-fitments/?${params.toString()}`, {
      responseType: "blob",
    });
  },
  getUploadedProducts: (sessionId: string) =>
    apiClient.get(`/api/uploaded-products/?session_id=${sessionId}`),
  getSessionDropdownData: (sessionId: string) =>
    apiClient.get(`/api/session/${sessionId}/dropdown-data/`),
  getFilteredVehicles: (sessionId: string, filters: any) =>
    apiClient.post("/api/filtered-vehicles/", {
      session_id: sessionId,
      filters: filters,
    }),
  applyManualFitment: (fitmentData: {
    sessionId: string;
    vehicleIds: string[];
    partId: string;
    position: string;
    quantity: number;
    title: string;
    description: string;
    notes: string;
  }) =>
    apiClient.post("/api/apply-manual-fitment/", {
      session_id: fitmentData.sessionId,
      vehicle_ids: fitmentData.vehicleIds,
      part_id: fitmentData.partId,
      position: fitmentData.position,
      quantity: fitmentData.quantity,
      title: fitmentData.title,
      description: fitmentData.description,
      notes: fitmentData.notes,
    }),
};

// Enhanced fitments service with export
export const enhancedFitmentsService = {
  ...fitmentsService,
  exportFitments: (format: "csv" | "xlsx" | "json", params?: any) =>
    apiClient.get(`/api/export/?format=${format}`, {
      params,
      responseType: "blob",
    }),
};

// Django backend fitments service
export const djangoFitmentsService = {
  getAppliedFitments: (params?: any) =>
    apiClient.get("/api/export/", { params: { ...params, format: "json" } }),
  exportFitments: (format: "csv" | "xlsx" | "json", sessionId?: string) => {
    const params = new URLSearchParams();
    params.append("format", format);
    if (sessionId) {
      params.append("session_id", sessionId);
    }
    return apiClient.get(`/api/export/?${params.toString()}`, {
      responseType: "blob",
    });
  },
};

// Data upload services
export const dataUploadService = {
  // Upload files
  uploadFiles: (vcdbFile?: File, productsFile?: File) => {
    const formData = new FormData();
    if (vcdbFile) formData.append("vcdb_file", vcdbFile);
    if (productsFile) formData.append("products_file", productsFile);
    return apiClient.post("/api/data-uploads/sessions/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Get all sessions
  getSessions: () => apiClient.get("/api/data-uploads/sessions/"),

  // Get session details
  getSession: (sessionId: string) =>
    apiClient.get(`/api/data-uploads/sessions/${sessionId}/`),

  // Delete session
  deleteSession: (sessionId: string) =>
    apiClient.delete(`/api/data-uploads/sessions/${sessionId}/`),

  // Get current data status
  getDataStatus: () => apiClient.get("/api/data-uploads/status/"),

  // Replace file
  replaceFile: (fileType: "vcdb" | "products", file: File) => {
    const formData = new FormData();
    formData.append("file_type", fileType);
    formData.append("file", file);
    return apiClient.post("/api/data-uploads/replace-file/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  // Get file data
  getFileData: (sessionId: string, fileType: "vcdb" | "products") =>
    apiClient.get(`/api/data-uploads/sessions/${sessionId}/data/${fileType}/`),
};
