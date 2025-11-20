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

// Potential Fitments Types (MFT V1)
export interface PotentialFitmentsMethod {
  method: "similarity" | "base-vehicle";
}

export interface SourceEvidence {
  fitment: {
    partId: string;
    year: number;
    makeName: string;
    modelName: string;
    subModelName: string;
    driveTypeName: string;
    fuelTypeName: string;
    position?: string;
    fitmentTitle?: string;
  };
  similarity?: number;
  relationship?: string;
  matchedAttributes: {
    matched: string[];
    differences: string[];
    matchCount: number;
    totalAttributes: number;
  };
}

export interface ConfidenceBreakdown {
  baseVehicleMatch: number;
  partTypeMatch: number;
  yearProximity: number;
  attributeMatches: number;
  total: number;
}

export interface PotentiallyMissingConfiguration {
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
  relevance: number;
  method?: string;
  explanation?: string;
  sourceEvidence?: SourceEvidence[];
  confidenceBreakdown?: ConfidenceBreakdown;
}

export interface PartWithFitments {
  id: string;
  description: string;
  unitOfMeasure: string;
  itemStatus: string;
  fitmentCount: number;
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
  dynamicFields?: Record<string, any>;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
  fitmentType: "manual_fitment" | "potential_fitment" | "ai_fitment";
  aiDescription?: string;
  confidenceScore?: number;
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

  // New VCDB API endpoints for manual fitments
  getVehicleDropdownData: () =>
    apiClient.get("/api/vcdb/vehicle-dropdown-data"),
  searchVehicles: (params?: any) =>
    apiClient.get("/api/vcdb/vehicle-search", { params }),
  getVehicleTypeGroups: () => apiClient.get("/api/vcdb/vehicle-type-groups/"),
  getVehicleDropdownOptions: (field: string, params?: any) =>
    apiClient.get("/api/vcdb/vehicle-dropdown-options", {
      params: { field, ...(params || {}) },
    }),
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
  getDetailedCoverage: (params?: any) =>
    apiClient.get("/api/fitments/coverage/detailed", { params }),
  getCoverageTrends: (params?: any) =>
    apiClient.get("/api/fitments/coverage/trends", { params }),
  getCoverageGaps: (params?: any) =>
    apiClient.get("/api/fitments/coverage/gaps", { params }),
  exportCoverage: (params?: any) =>
    apiClient.get("/api/fitments/coverage/export", {
      params,
      responseType: "blob",
    }),
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

  // New bulk upload endpoints for MFT V1
  validateFitmentsCSV: (file: File) => {
    const formData = new FormData();
    formData.append("fitments", file);
    return apiClient.post("/api/fitments/validate/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  submitValidatedFitments: (sessionId: string) =>
    apiClient.post(`/api/fitments/submit/${sessionId}/`),
  getValidationResults: (sessionId: string) =>
    apiClient.get(`/api/fitments/validation/${sessionId}/`),

  // Enhanced fitments service with new endpoints
  getFitmentDetail: (fitmentHash: string) =>
    apiClient.get(`/api/fitments/${fitmentHash}`),
  updateFitment: (fitmentHash: string, data: any) =>
    apiClient.put(`/api/fitments/${fitmentHash}/update/`, data),
  deleteFitment: (fitmentHash: string) =>
    apiClient.delete(`/api/fitments/${fitmentHash}/delete/`),
  getFilterOptions: () => apiClient.get("/api/fitments/filter-options/"),
  bulkUpdateStatus: (fitmentHashes: string[], status: string) =>
    apiClient.post("/api/fitments/bulk-update-status/", {
      fitment_hashes: fitmentHashes,
      status: status,
    }),
  exportFitments: (format: "csv" | "xlsx") =>
    apiClient.get(`/api/fitments/export-advanced-${format}/`, {
      responseType: "blob",
    }),
  approveFitments: (fitmentHashes: string[]) =>
    apiClient.post("/api/fitments/approve/", {
      fitment_hashes: fitmentHashes,
    }),
  rejectFitments: (fitmentHashes: string[]) =>
    apiClient.post("/api/fitments/reject/", {
      fitment_hashes: fitmentHashes,
    }),
  bulkDeleteFitments: (fitmentHashes: string[]) =>
    apiClient.post("/api/fitments/bulk-delete/", {
      fitment_hashes: fitmentHashes,
    }),
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

// Fitment Rules Upload Service (local storage only)
export const fitmentRulesService = {
  uploadFile: (file: File, dataType: "fitments" | "products") => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("dataType", dataType);
    return apiClient.post("/api/fitment-rules/upload", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  aiMap: (
    uploadId: string,
    dataType?: "fitments" | "products",
    entityConfig?: {
      requiredVcdbFields?: string[];
      optionalVcdbFields?: string[];
      requiredProductFields?: string[];
      partNumberSkuDescription?: string;
      ptidMatch?: boolean;
      seekParentChild?: boolean;
      parentChildExample?: string;
      additionalAttributes?: any[];
    }
  ) => {
    return apiClient.post(`/api/uploads/${uploadId}/ai-map`, {
      dataType: dataType,
      entityConfig: entityConfig || {},
    });
  },
  transform: (uploadId: string) =>
    apiClient.post(`/api/uploads/${uploadId}/transform`),
  validate: (uploadId: string) =>
    apiClient.post(`/api/uploads/${uploadId}/vcdb-validate`),
  publish: (uploadId: string) =>
    apiClient.post(`/api/uploads/${uploadId}/publish`),
  publishForReview: (uploadId: string) =>
    apiClient.post(`/api/uploads/${uploadId}/publish-for-review`),
  download: (uploadId: string) =>
    apiClient.get(`/api/uploads/${uploadId}/download`, {
      responseType: "blob",
    }),
  exportInvalidRows: (uploadId: string) =>
    apiClient.get(`/api/uploads/${uploadId}/export-invalid-rows`, {
      responseType: "blob",
    }),
  getJobReviewData: (jobId: string) =>
    apiClient.get(`/api/workflow/jobs/${jobId}/review-data`),
  approveJobRows: (jobId: string, approvedRowIds: string[]) =>
    apiClient.post(`/api/workflow/jobs/${jobId}/approve`, {
      approvedRowIds,
    }),
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

// Field Configuration Types
export interface FieldConfiguration {
  id: number;
  name: string;
  display_name: string;
  description: string;
  field_type: string;
  reference_type: "vcdb" | "product" | "both";
  requirement_level: "required" | "optional" | "disabled";
  is_enabled: boolean;
  is_unique: boolean;
  min_length?: number;
  max_length?: number;
  min_value?: number;
  max_value?: number;
  enum_options: string[];
  default_value: string;
  display_order: number;
  show_in_filters: boolean;
  show_in_forms: boolean;
  validation_rules: any;
  created_at: string;
  updated_at: string;
  created_by?: string;
  updated_by?: string;
}

export interface ValidationResult {
  is_valid: boolean;
  errors: Record<string, string[]>;
}

// Field Configuration Service
export const fieldConfigService = {
  // Get all field configurations with optional filtering
  getFields: (params?: {
    reference_type?: "vcdb" | "product" | "both";
    requirement_level?: "required" | "optional" | "disabled";
    is_enabled?: boolean;
    field_type?: string;
    search?: string;
    ordering?: string;
  }) => apiClient.get("/api/field-config/fields/", { params }),

  // Get specific field configuration
  getField: (id: number) => apiClient.get(`/api/field-config/fields/${id}/`),

  // Create new field configuration
  createField: (fieldData: any) =>
    apiClient.post("/api/field-config/fields/", fieldData),

  // Update field configuration
  updateField: (id: number, fieldData: any) =>
    apiClient.put(`/api/field-config/fields/${id}/`, fieldData),

  // Delete field configuration
  deleteField: (id: number) =>
    apiClient.delete(`/api/field-config/fields/${id}/`),

  // Toggle field enabled status
  toggleField: (id: number) =>
    apiClient.post(`/api/field-config/fields/${id}/toggle_enabled/`),

  // Get form fields for specific reference type
  getFormFields: async (
    referenceType: "vcdb" | "product"
  ): Promise<FieldConfiguration[]> => {
    const response = await apiClient.get(
      `/api/field-config/fields/form_fields/?reference_type=${referenceType}`
    );
    return response.data;
  },

  // Get filter fields for specific reference type
  getFilterFields: async (
    referenceType: "vcdb" | "product"
  ): Promise<FieldConfiguration[]> => {
    const response = await apiClient.get(
      `/api/field-config/fields/filter_fields/?reference_type=${referenceType}`
    );
    return response.data;
  },

  // Validate field data
  validateFieldData: async (
    referenceType: "vcdb" | "product",
    data: Record<string, any>
  ): Promise<ValidationResult> => {
    const response = await apiClient.post(
      "/api/field-config/fields/validate_data/",
      {
        reference_type: referenceType,
        data,
      }
    );
    return response.data;
  },

  // Get validation rules
  getValidationRules: async (
    referenceType: "vcdb" | "product"
  ): Promise<Record<string, any>> => {
    const response = await apiClient.get(
      `/api/field-config/fields/validation_rules/?reference_type=${referenceType}`
    );
    return response.data;
  },

  // Get field configuration history
  getFieldHistory: (fieldConfigId?: number) => {
    const params = fieldConfigId ? { field_config_id: fieldConfigId } : {};
    return apiClient.get("/api/field-config/history/", { params });
  },
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

  // New direct AI fitment processing (no session required)
  processDirectAiFitment: () =>
    apiClient.post("/api/data-uploads/ai-fitment/", {}, { timeout: 180000 }),
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

  // New direct AI fitment application (no session required)
  applyDirectAiFitments: (fitmentsData: any[]) =>
    apiClient.post("/api/data-uploads/apply-ai-fitments-direct/", {
      fitments: fitmentsData,
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
  getFilteredVehicles: (_sessionId: string, filters: any) =>
    apiClient.post("/api/data-uploads/filtered-vehicles/", {
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
    selectedColumns?: string[];
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
      selectedColumns: fitmentData.selectedColumns,
    }),
};

// Enhanced fitments service with export
export const enhancedFitmentsService = {
  ...fitmentsService,
  exportFitments: (format: "csv" | "xlsx" | "json") =>
    apiClient.get(`/api/export/?format=${format}`, {
      responseType: "blob",
    }),
};

// Django backend fitments service
export const djangoFitmentsService = {
  getAppliedFitments: (params?: any) =>
    apiClient.get("/api/export/", { params: { ...params, format: "json" } }),
  exportFitments: (format: "csv" | "xlsx" | "json", sessionId?: string) => {
    const urlParams = new URLSearchParams();
    urlParams.append("format", format);
    if (sessionId) {
      urlParams.append("session_id", sessionId);
    }
    return apiClient.get(`/api/export/?${urlParams.toString()}`, {
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
  getDataStatus: () => apiClient.get("/api/data-uploads/data-status/"),

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

  // Get VCDB data from database
  getVCDBData: (params?: any) =>
    apiClient.get("/api/data-uploads/vcdb/", { params }),

  // Get Product data from database
  getProductData: (params?: any) =>
    apiClient.get("/api/data-uploads/products/", { params }),

  // Export products
  exportProducts: (format: "csv" | "xlsx") =>
    apiClient.get(`/api/data-uploads/products/export-${format}/`, {
      responseType: "blob",
    }),

  // Get new data status (with database counts)
  getNewDataStatus: () => apiClient.get("/api/data-uploads/data-status/"),

  // Get dropdown data from VCDBData and ProductData tables
  getNewDataDropdownData: () =>
    apiClient.get("/api/data-uploads/dropdown-data/"),

  // Lookup data for fitment filters
  getLookupData: () => apiClient.get("/api/data-uploads/lookup-data/"),

  // Field configuration and validation
  getFieldConfiguration: (referenceType?: string) =>
    apiClient.get(`/api/data-uploads/field-configuration/`, {
      params: referenceType ? { reference_type: referenceType } : {},
    }),

  validateFileWithDynamicFields: (fileType: string, fileData: any[]) =>
    apiClient.post("/api/data-uploads/validate-dynamic-fields/", {
      file_type: fileType === "vcdb" ? "vcdb" : "product",
      file_data: fileData,
    }),

  // Fitment management
  createFitment: (fitmentData: any) =>
    apiClient.post("/api/apply/apply-fitments", { fitments: fitmentData }),

  // =============================================================================
  // POTENTIAL FITMENTS API (MFT V1)
  // =============================================================================

  // Get potential fitments for a part using AI recommendations
  getPotentialFitments: (
    partId: string,
    method: "similarity" | "base-vehicle" = "similarity"
  ) => apiClient.get(`/api/fitments/potential/${partId}/?method=${method}`),

  // Get parts that have existing fitments
  getPartsWithFitments: () =>
    apiClient.get("/api/fitments/parts-with-fitments/"),

  // Apply potential fitments (create new fitments from recommendations)
  applyPotentialFitments: (data: {
    partId: string;
    configurationIds: string[];
    title?: string;
    description?: string;
    quantity?: number;
  }) => apiClient.post("/api/fitments/apply-potential-fitments/", data),

  // Job management
  getJobHistory: (tenantId?: string) =>
    apiClient.get("/api/data-uploads/job-history/", {
      params: tenantId ? { tenant_id: tenantId } : {},
    }),
  getJobStatus: (jobId: string) =>
    apiClient.get(`/api/data-uploads/job-status/${jobId}/`),

  // AI Fitment Jobs Management
  getAiFitmentJobs: (params?: { status?: string; tenant_id?: string }) =>
    apiClient.get("/api/data-uploads/ai-fitment-jobs/", { params }),

  getAiFitmentJob: (jobId: string) =>
    apiClient.get(`/api/data-uploads/ai-fitment-jobs/${jobId}/`),

  getAiFitmentJobStatus: (jobId: string) =>
    apiClient.get(`/api/data-uploads/ai-fitment-jobs/${jobId}/status/`),

  createAiFitmentJob: (data: {
    product_file?: File;
    product_ids?: string[];
    job_type: "upload" | "selection";
  }) => {
    const formData = new FormData();
    if (data.product_file) {
      formData.append("product_file", data.product_file);
    }
    if (data.product_ids) {
      formData.append("product_ids", JSON.stringify(data.product_ids));
    }
    formData.append("job_type", data.job_type);
    return apiClient.post("/api/data-uploads/ai-fitment-jobs/", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 180000, // 3 minutes for AI processing
    });
  },

  reviewAiFitmentJob: (
    jobId: string,
    params?: {
      page?: number;
      page_size?: number;
    }
  ) =>
    apiClient.get(`/api/data-uploads/ai-fitment-jobs/${jobId}/fitments/`, {
      params,
    }),

  approveAiFitments: (jobId: string, fitmentIds?: string[]) =>
    apiClient.post(`/api/data-uploads/ai-fitment-jobs/${jobId}/approve/`, {
      fitment_ids: fitmentIds, // If not provided, approves all
    }),

  rejectAiFitments: (jobId: string, fitmentIds: string[]) =>
    apiClient.post(`/api/data-uploads/ai-fitment-jobs/${jobId}/reject/`, {
      fitment_ids: fitmentIds,
    }),

  updateAiFitment: (jobId: string, fitmentId: string, data: any) =>
    apiClient.put(
      `/api/data-uploads/ai-fitment-jobs/${jobId}/fitments/${fitmentId}/`,
      data
    ),
};

// Export all services as a single object
export const services = {
  diagnostics: diagnosticsService,
  vcdb: vcdbService,
  parts: partsService,
  fitment: fitmentsService,
  potential: potentialService,
  admin: adminService,
  uploads: uploadsService,
  review: reviewService,
  presets: presetsService,
  fieldConfig: fieldConfigService,
  fitmentUpload: fitmentUploadService,
  enhancedFitments: enhancedFitmentsService,
  djangoFitments: djangoFitmentsService,
  dataUpload: dataUploadService,
};
