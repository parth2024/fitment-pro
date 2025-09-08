import apiClient from './client'

// Types
export interface VehicleConfiguration {
  id: string
  vehicleId: string
  baseVehicleId: string
  year: number
  make: string
  model: string
  submodel: string
  driveType: string
  fuelType: string
  numDoors: number
  bodyType: string
}

export interface Part {
  id: string
  hash: string
  description: string
  unitOfMeasure: string
  itemStatus: number
}

export interface PartType {
  id: string
  description: string
  partPositionIds: number[]
}

export interface FlattenedAppliedFitment {
  hash: string
  partId: string
  itemStatus: string
  itemStatusCode: number
  baseVehicleId: string
  year: number
  makeName: string
  modelName: string
  subModelName: string
  driveTypeName: string
  fuelTypeName: string
  bodyNumDoors: number
  bodyTypeName: string
  ptid: string
  partTypeDescriptor: string
  uom: string
  quantity: number
  fitmentTitle: string
  fitmentDescription: string
  fitmentNotes: string
  position: string
  positionId: number
  liftHeight: string
  wheelType: string
  tireDiameter1?: string
  tireDiameter2?: string
  tireDiameter3?: string
  wheelDiameter1?: string
  wheelDiameter2?: string
  wheelDiameter3?: string
  backSpacing1?: string
  backSpacing2?: string
  backSpacing3?: string
  createdAt: string
  createdBy: string
  updatedAt: string
  updatedBy: string
}

export interface Coverage {
  make: string
  configsCount: number
  fittedConfigsCount: number
}

export interface PotentialVehicleConfiguration extends VehicleConfiguration {
  relevance: number
  reason: string
}

// API Services
export const diagnosticsService = {
  ping: () => apiClient.get('/ping'),
  healthy: () => apiClient.get('/healthy'),
  metrics: () => apiClient.get('/metrics'),
  version: () => apiClient.get('/api/version'),
}

export const vcdbService = {
  getVersion: () => apiClient.get('/api/vcdb/version'),
  getYearRange: () => apiClient.get('/api/vcdb/year-range'),
  getProperty: (property: string, params?: any) => 
    apiClient.get(`/api/vcdb/property/${property}`, { params }),
  getConfigurations: (params?: any) => 
    apiClient.get('/api/vcdb/configurations', { params }),
}

export const partsService = {
  getParts: (params?: any) => apiClient.get('/api/parts', { params }),
  getPartTypes: () => apiClient.get('/api/parts/types'),
}

export const fitmentsService = {
  getFitments: (params?: any) => apiClient.get('/api/fitments', { params }),
  createFitment: (data: any) => apiClient.post('/api/fitments', data),
  deleteFitments: (params?: any) => apiClient.delete('/api/fitments', { params }),
  getCoverage: (params?: any) => apiClient.get('/api/fitments/coverage', { params }),
  getProperty: (property: string, params?: any) => 
    apiClient.get(`/api/fitments/property/${property}`, { params }),
  validateCSV: (file: File) => {
    const formData = new FormData()
    formData.append('fitments', file)
    return apiClient.post('/api/fitments/validate', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  submitValidated: () => apiClient.post('/api/fitments/submit'),
}

export const potentialService = {
  getPotentialFitments: (partId: string, params?: any) => 
    apiClient.get(`/api/potential-fitments/${partId}`, { params }),
}

export const adminService = {
  importData: (dataKind: string) => apiClient.get(`/api/azure/import/${dataKind}`),
  exportFitments: (params?: any) => apiClient.get('/api/azure/export/fitments', { params }),
}