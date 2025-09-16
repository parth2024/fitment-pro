import { useState, useEffect, useCallback } from "react";
import { FieldConfiguration, ValidationResult } from "../api/services";
import { fieldConfigService } from "../services/fieldConfigService";

interface UseFieldConfigurationOptions {
  referenceType: "vcdb" | "product";
  autoLoad?: boolean;
  validateOnChange?: boolean;
}

interface UseFieldConfigurationReturn {
  fields: FieldConfiguration[];
  formFields: FieldConfiguration[];
  filterFields: FieldConfiguration[];
  loading: boolean;
  error: string | null;
  validationErrors: Record<string, string[]>;
  validateData: (data: Record<string, any>) => Promise<ValidationResult>;
  refreshFields: () => Promise<void>;
  clearValidationErrors: () => void;
}

export const useFieldConfiguration = ({
  referenceType,
  autoLoad = true,
  validateOnChange = false,
}: UseFieldConfigurationOptions): UseFieldConfigurationReturn => {
  const [fields, setFields] = useState<FieldConfiguration[]>([]);
  const [formFields, setFormFields] = useState<FieldConfiguration[]>([]);
  const [filterFields, setFilterFields] = useState<FieldConfiguration[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<
    Record<string, string[]>
  >({});

  // Load field configurations
  const loadFields = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const [formFieldsData, filterFieldsData] = await Promise.all([
        fieldConfigService.getFormFields(referenceType),
        fieldConfigService.getFilterFields(referenceType),
      ]);

      const sortedFormFields =
        fieldConfigService.sortFieldsByDisplayOrder(formFieldsData);
      const sortedFilterFields =
        fieldConfigService.sortFieldsByDisplayOrder(filterFieldsData);

      setFormFields(sortedFormFields);
      setFilterFields(sortedFilterFields);
      setFields([...sortedFormFields, ...sortedFilterFields]);
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Failed to load field configurations";
      setError(errorMessage);
      console.error("Error loading field configurations:", err);
    } finally {
      setLoading(false);
    }
  }, [referenceType]);

  // Validate data against field configurations
  const validateData = useCallback(
    async (data: Record<string, any>): Promise<ValidationResult> => {
      try {
        const result = await fieldConfigService.validateFieldData(
          referenceType,
          data
        );

        if (validateOnChange) {
          setValidationErrors(result.errors);
        }

        return result;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Validation failed";
        console.error("Error validating data:", err);
        return {
          is_valid: false,
          errors: { general: [errorMessage] },
        };
      }
    },
    [referenceType, validateOnChange]
  );

  // Refresh field configurations
  const refreshFields = useCallback(async () => {
    fieldConfigService.clearCache(referenceType);
    await loadFields();
  }, [loadFields, referenceType]);

  // Clear validation errors
  const clearValidationErrors = useCallback(() => {
    setValidationErrors({});
  }, []);

  // Auto-load fields on mount
  useEffect(() => {
    if (autoLoad) {
      loadFields();
    }
  }, [autoLoad, loadFields]);

  return {
    fields,
    formFields,
    filterFields,
    loading,
    error,
    validationErrors,
    validateData,
    refreshFields,
    clearValidationErrors,
  };
};

// Hook for managing form data with field configuration validation
export const useFormWithFieldValidation = (
  referenceType: "vcdb" | "product",
  initialValues: Record<string, any> = {}
) => {
  const {
    formFields,
    loading: fieldsLoading,
    error: fieldsError,
    validateData,
    validationErrors,
    clearValidationErrors,
  } = useFieldConfiguration({ referenceType, autoLoad: true });

  const [formData, setFormData] = useState<Record<string, any>>(initialValues);
  const [isValidating, setIsValidating] = useState(false);

  // Update form data
  const updateFormData = useCallback(
    (newData: Record<string, any>) => {
      setFormData((prev) => ({ ...prev, ...newData }));
      clearValidationErrors();
    },
    [clearValidationErrors]
  );

  // Reset form data
  const resetFormData = useCallback(() => {
    setFormData(initialValues);
    clearValidationErrors();
  }, [initialValues, clearValidationErrors]);

  // Validate current form data
  const validateFormData = useCallback(async (): Promise<boolean> => {
    setIsValidating(true);
    try {
      const result = await validateData(formData);
      return result.is_valid;
    } finally {
      setIsValidating(false);
    }
  }, [formData, validateData]);

  // Get default values for all form fields
  const getDefaultValues = useCallback(() => {
    const defaults: Record<string, any> = {};
    formFields.forEach((field) => {
      defaults[field.name] = fieldConfigService.getDefaultValue(field);
    });
    return { ...defaults, ...initialValues };
  }, [formFields, initialValues]);

  // Get field configuration by name
  const getFieldConfig = useCallback(
    (fieldName: string): FieldConfiguration | undefined => {
      return formFields.find((field) => field.name === fieldName);
    },
    [formFields]
  );

  // Check if field is required
  const isFieldRequired = useCallback(
    (fieldName: string): boolean => {
      const field = getFieldConfig(fieldName);
      return field ? fieldConfigService.isFieldRequired(field) : false;
    },
    [getFieldConfig]
  );

  // Get validation rules for a specific field
  const getFieldValidationRules = useCallback(
    (fieldName: string) => {
      const field = getFieldConfig(fieldName);
      return field ? field.validation_rules : {};
    },
    [getFieldConfig]
  );

  return {
    formData,
    formFields,
    loading: fieldsLoading,
    error: fieldsError,
    validationErrors,
    isValidating,
    updateFormData,
    resetFormData,
    validateFormData,
    validateData,
    getDefaultValues,
    getFieldConfig,
    isFieldRequired,
    getFieldValidationRules,
    clearValidationErrors,
  };
};

// Hook for managing filter state with field configuration
export const useFilterWithFieldConfiguration = (
  referenceType: "vcdb" | "product",
  onFilterChange?: (filters: Record<string, any>) => void
) => {
  const {
    filterFields,
    loading: fieldsLoading,
    error: fieldsError,
  } = useFieldConfiguration({ referenceType, autoLoad: true });

  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({});
  const [hasActiveFilters, setHasActiveFilters] = useState(false);

  // Update filters
  const updateFilters = useCallback(
    (newFilters: Record<string, any>) => {
      setActiveFilters(newFilters);
      setHasActiveFilters(Object.keys(newFilters).length > 0);
      onFilterChange?.(newFilters);
    },
    [onFilterChange]
  );

  // Clear filters
  const clearFilters = useCallback(() => {
    setActiveFilters({});
    setHasActiveFilters(false);
    onFilterChange?.({});
  }, [onFilterChange]);

  // Set filter value
  const setFilterValue = useCallback(
    (fieldName: string, value: any) => {
      const newFilters = { ...activeFilters };
      if (
        value === null ||
        value === undefined ||
        value === "" ||
        value === false
      ) {
        delete newFilters[fieldName];
      } else {
        newFilters[fieldName] = value;
      }
      updateFilters(newFilters);
    },
    [activeFilters, updateFilters]
  );

  // Get filter value
  const getFilterValue = useCallback(
    (fieldName: string) => {
      return activeFilters[fieldName];
    },
    [activeFilters]
  );

  // Get default filter values
  const getDefaultFilterValues = useCallback(() => {
    const defaults: Record<string, any> = {};
    filterFields.forEach((field) => {
      defaults[field.name] = fieldConfigService.getDefaultValue(field);
    });
    return defaults;
  }, [filterFields]);

  return {
    activeFilters,
    filterFields,
    hasActiveFilters,
    loading: fieldsLoading,
    error: fieldsError,
    updateFilters,
    clearFilters,
    setFilterValue,
    getFilterValue,
    getDefaultFilterValues,
  };
};
