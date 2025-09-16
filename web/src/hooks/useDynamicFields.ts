import { useState, useEffect, useCallback } from "react";
import { fieldConfigService } from "../api/services";
import { FieldConfiguration } from "../api/services";

interface DynamicFieldConfig {
  vcdbFields: FieldConfiguration[];
  productFields: FieldConfiguration[];
  loading: boolean;
  error: string | null;
}

interface FieldVisibilityConfig {
  [fieldName: string]: {
    isVisible: boolean;
    isRequired: boolean;
    fieldConfig: FieldConfiguration | null;
  };
}

export const useDynamicFields = () => {
  const [config, setConfig] = useState<DynamicFieldConfig>({
    vcdbFields: [],
    productFields: [],
    loading: false,
    error: null,
  });

  const [vcdbFieldVisibility, setVcdbFieldVisibility] =
    useState<FieldVisibilityConfig>({});
  const [productFieldVisibility, setProductFieldVisibility] =
    useState<FieldVisibilityConfig>({});

  // Load field configurations
  const loadFieldConfigurations = useCallback(async () => {
    try {
      setConfig((prev) => ({ ...prev, loading: true, error: null }));

      const [vcdbResponse, productResponse] = await Promise.all([
        fieldConfigService.getFields({ reference_type: "vcdb" }),
        fieldConfigService.getFields({ reference_type: "product" }),
      ]);

      // Process VCDB fields
      let vcdbFields: FieldConfiguration[] = [];
      const vcdbData = vcdbResponse.data || vcdbResponse;
      if (Array.isArray(vcdbData)) {
        vcdbFields = vcdbData;
      } else if (vcdbData && Array.isArray(vcdbData.results)) {
        vcdbFields = vcdbData.results;
      } else if (vcdbData && Array.isArray(vcdbData.data)) {
        vcdbFields = vcdbData.data;
      }

      // Process Product fields
      let productFields: FieldConfiguration[] = [];
      const productData = productResponse.data || productResponse;
      if (Array.isArray(productData)) {
        productFields = productData;
      } else if (productData && Array.isArray(productData.results)) {
        productFields = productData.results;
      } else if (productData && Array.isArray(productData.data)) {
        productFields = productData.data;
      }

      setConfig({
        vcdbFields,
        productFields,
        loading: false,
        error: null,
      });

      // Generate visibility configurations
      generateFieldVisibilityConfigs(vcdbFields, productFields);
    } catch (error) {
      console.error("Error loading field configurations:", error);
      setConfig((prev) => ({
        ...prev,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Failed to load field configurations",
      }));
    }
  }, []);

  // Generate field visibility configurations
  const generateFieldVisibilityConfigs = useCallback(
    (vcdbFields: FieldConfiguration[], productFields: FieldConfiguration[]) => {
      // VCDB field visibility mapping
      const vcdbMapping: FieldVisibilityConfig = {};
      vcdbFields.forEach((field) => {
        vcdbMapping[field.name] = {
          isVisible: field.is_enabled && field.show_in_forms,
          isRequired:
            field.requirement_level === "required" && field.is_enabled,
          fieldConfig: field,
        };
      });

      // Product field visibility mapping
      const productMapping: FieldVisibilityConfig = {};
      productFields.forEach((field) => {
        productMapping[field.name] = {
          isVisible: field.is_enabled && field.show_in_forms,
          isRequired:
            field.requirement_level === "required" && field.is_enabled,
          fieldConfig: field,
        };
      });

      setVcdbFieldVisibility(vcdbMapping);
      setProductFieldVisibility(productMapping);
    },
    []
  );

  // Check if a VCDB field should be visible
  const isVcdbFieldVisible = useCallback(
    (fieldName: string): boolean => {
      return vcdbFieldVisibility[fieldName]?.isVisible ?? true; // Default to visible if not configured
    },
    [vcdbFieldVisibility]
  );

  // Check if a VCDB field is required
  const isVcdbFieldRequired = useCallback(
    (fieldName: string): boolean => {
      return vcdbFieldVisibility[fieldName]?.isRequired ?? false; // Default to optional if not configured
    },
    [vcdbFieldVisibility]
  );

  // Check if a Product field should be visible
  const isProductFieldVisible = useCallback(
    (fieldName: string): boolean => {
      return productFieldVisibility[fieldName]?.isVisible ?? true; // Default to visible if not configured
    },
    [productFieldVisibility]
  );

  // Check if a Product field is required
  const isProductFieldRequired = useCallback(
    (fieldName: string): boolean => {
      return productFieldVisibility[fieldName]?.isRequired ?? false; // Default to optional if not configured
    },
    [productFieldVisibility]
  );

  // Get field configuration for a specific field
  const getVcdbFieldConfig = useCallback(
    (fieldName: string): FieldConfiguration | null => {
      return vcdbFieldVisibility[fieldName]?.fieldConfig ?? null;
    },
    [vcdbFieldVisibility]
  );

  const getProductFieldConfig = useCallback(
    (fieldName: string): FieldConfiguration | null => {
      return productFieldVisibility[fieldName]?.fieldConfig ?? null;
    },
    [productFieldVisibility]
  );

  // Get all visible VCDB fields
  const getVisibleVcdbFields = useCallback((): FieldConfiguration[] => {
    return config.vcdbFields.filter(
      (field) => field.is_enabled && field.show_in_forms
    );
  }, [config.vcdbFields]);

  // Get all visible Product fields
  const getVisibleProductFields = useCallback((): FieldConfiguration[] => {
    return config.productFields.filter(
      (field) => field.is_enabled && field.show_in_forms
    );
  }, [config.productFields]);

  // Get all required VCDB fields
  const getRequiredVcdbFields = useCallback((): FieldConfiguration[] => {
    return config.vcdbFields.filter(
      (field) => field.requirement_level === "required" && field.is_enabled
    );
  }, [config.vcdbFields]);

  // Get all required Product fields
  const getRequiredProductFields = useCallback((): FieldConfiguration[] => {
    return config.productFields.filter(
      (field) => field.requirement_level === "required" && field.is_enabled
    );
  }, [config.productFields]);

  // Refresh field configurations
  const refreshFieldConfigurations = useCallback(async () => {
    await loadFieldConfigurations();
  }, [loadFieldConfigurations]);

  // Load configurations on mount
  useEffect(() => {
    loadFieldConfigurations();
  }, [loadFieldConfigurations]);

  return {
    // Configuration state
    vcdbFields: config.vcdbFields,
    productFields: config.productFields,
    loading: config.loading,
    error: config.error,

    // Visibility checks
    isVcdbFieldVisible,
    isVcdbFieldRequired,
    isProductFieldVisible,
    isProductFieldRequired,

    // Field configurations
    getVcdbFieldConfig,
    getProductFieldConfig,

    // Field collections
    getVisibleVcdbFields,
    getVisibleProductFields,
    getRequiredVcdbFields,
    getRequiredProductFields,

    // Actions
    refreshFieldConfigurations,
  };
};

// Hook specifically for ApplyFitments component
export const useApplyFitmentsFields = () => {
  const dynamicFields = useDynamicFields();

  // Map common field names to their configurations
  const vcdbFieldMappings = {
    yearFrom: "year_from",
    yearTo: "year_to",
    make: "make",
    model: "model",
    submodel: "submodel",
    fuelType: "fuel_type",
    numDoors: "num_doors",
    driveType: "drive_type",
    bodyType: "body_type",
  };

  const productFieldMappings = {
    partId: "part_id",
    position: "position",
    quantity: "quantity",
    title: "title",
    description: "description",
    notes: "notes",
    liftHeight: "lift_height",
    wheelType: "wheel_type",
  };

  // Check visibility for VCDB fields in ApplyFitments
  const isVcdbFieldVisibleInApplyFitments = useCallback(
    (fieldName: keyof typeof vcdbFieldMappings): boolean => {
      const mappedName = vcdbFieldMappings[fieldName];
      return dynamicFields.isVcdbFieldVisible(mappedName);
    },
    [dynamicFields]
  );

  // Check requirements for VCDB fields in ApplyFitments
  const isVcdbFieldRequiredInApplyFitments = useCallback(
    (fieldName: keyof typeof vcdbFieldMappings): boolean => {
      const mappedName = vcdbFieldMappings[fieldName];
      return dynamicFields.isVcdbFieldRequired(mappedName);
    },
    [dynamicFields]
  );

  // Check visibility for Product fields in ApplyFitments
  const isProductFieldVisibleInApplyFitments = useCallback(
    (fieldName: keyof typeof productFieldMappings): boolean => {
      const mappedName = productFieldMappings[fieldName];
      return dynamicFields.isProductFieldVisible(mappedName);
    },
    [dynamicFields]
  );

  // Check requirements for Product fields in ApplyFitments
  const isProductFieldRequiredInApplyFitments = useCallback(
    (fieldName: keyof typeof productFieldMappings): boolean => {
      const mappedName = productFieldMappings[fieldName];
      return dynamicFields.isProductFieldRequired(mappedName);
    },
    [dynamicFields]
  );

  return {
    ...dynamicFields,
    isVcdbFieldVisibleInApplyFitments,
    isVcdbFieldRequiredInApplyFitments,
    isProductFieldVisibleInApplyFitments,
    isProductFieldRequiredInApplyFitments,
  };
};
