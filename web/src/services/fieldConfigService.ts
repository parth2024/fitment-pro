import {
  fieldConfigService as apiService,
  FieldConfiguration,
  ValidationResult,
} from "../api/services";

class FieldConfigService {
  private cache: Map<string, FieldConfiguration[]> = new Map();
  private cacheExpiry: Map<string, number> = new Map();
  private readonly CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

  /**
   * Get field configurations for form rendering
   */
  async getFormFields(
    referenceType: "vcdb" | "product"
  ): Promise<FieldConfiguration[]> {
    const cacheKey = `form_${referenceType}`;

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      const fields = await apiService.getFormFields(referenceType);

      // Cache the result
      this.cache.set(cacheKey, fields);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return fields;
    } catch (error) {
      console.error("Error fetching form fields:", error);
      return [];
    }
  }

  /**
   * Get field configurations for filter rendering
   */
  async getFilterFields(
    referenceType: "vcdb" | "product"
  ): Promise<FieldConfiguration[]> {
    const cacheKey = `filter_${referenceType}`;

    // Check cache first
    if (this.isCacheValid(cacheKey)) {
      return this.cache.get(cacheKey) || [];
    }

    try {
      const fields = await apiService.getFilterFields(referenceType);

      // Cache the result
      this.cache.set(cacheKey, fields);
      this.cacheExpiry.set(cacheKey, Date.now() + this.CACHE_DURATION);

      return fields;
    } catch (error) {
      console.error("Error fetching filter fields:", error);
      return [];
    }
  }

  /**
   * Validate field data against configuration
   */
  async validateFieldData(
    referenceType: "vcdb" | "product",
    data: Record<string, any>
  ): Promise<ValidationResult> {
    try {
      return await apiService.validateFieldData(referenceType, data);
    } catch (error) {
      console.error("Error validating field data:", error);
      return {
        is_valid: false,
        errors: { general: ["Validation service unavailable"] },
      };
    }
  }

  /**
   * Get validation rules for all enabled fields
   */
  async getValidationRules(
    referenceType: "vcdb" | "product"
  ): Promise<Record<string, any>> {
    try {
      return await apiService.getValidationRules(referenceType);
    } catch (error) {
      console.error("Error fetching validation rules:", error);
      return {};
    }
  }

  /**
   * Clear cache for a specific reference type
   */
  clearCache(referenceType?: "vcdb" | "product"): void {
    if (referenceType) {
      this.cache.delete(`form_${referenceType}`);
      this.cache.delete(`filter_${referenceType}`);
      this.cacheExpiry.delete(`form_${referenceType}`);
      this.cacheExpiry.delete(`filter_${referenceType}`);
    } else {
      this.cache.clear();
      this.cacheExpiry.clear();
    }
  }

  /**
   * Check if cache is still valid
   */
  private isCacheValid(cacheKey: string): boolean {
    const expiry = this.cacheExpiry.get(cacheKey);
    return expiry ? Date.now() < expiry : false;
  }

  /**
   * Get field type display information
   */
  getFieldTypeInfo(fieldType: string): {
    label: string;
    color: string;
    icon: string;
  } {
    const typeInfo: Record<
      string,
      { label: string; color: string; icon: string }
    > = {
      string: { label: "Text", color: "blue", icon: "text" },
      number: { label: "Number", color: "green", icon: "number" },
      boolean: { label: "Boolean", color: "purple", icon: "toggle" },
      enum: { label: "Dropdown", color: "orange", icon: "select" },
      date: { label: "Date", color: "cyan", icon: "calendar" },
      text: { label: "Long Text", color: "indigo", icon: "textarea" },
      decimal: { label: "Decimal", color: "teal", icon: "number" },
      integer: { label: "Integer", color: "lime", icon: "number" },
    };

    return (
      typeInfo[fieldType] || { label: fieldType, color: "gray", icon: "text" }
    );
  }

  /**
   * Get requirement level display information
   */
  getRequirementLevelInfo(level: string): { label: string; color: string } {
    const levelInfo: Record<string, { label: string; color: string }> = {
      required: { label: "Required", color: "red" },
      optional: { label: "Optional", color: "blue" },
      disabled: { label: "Disabled", color: "gray" },
    };

    return levelInfo[level] || { label: level, color: "gray" };
  }

  /**
   * Check if field should be shown in forms
   */
  shouldShowInForms(field: FieldConfiguration): boolean {
    return field.is_enabled && field.show_in_forms;
  }

  /**
   * Check if field should be shown in filters
   */
  shouldShowInFilters(field: FieldConfiguration): boolean {
    return field.is_enabled && field.show_in_filters;
  }

  /**
   * Check if field is required
   */
  isFieldRequired(field: FieldConfiguration): boolean {
    return field.is_enabled && field.requirement_level === "required";
  }

  /**
   * Check if field is optional
   */
  isFieldOptional(field: FieldConfiguration): boolean {
    return field.is_enabled && field.requirement_level === "optional";
  }

  /**
   * Sort fields by display order
   */
  sortFieldsByDisplayOrder(fields: FieldConfiguration[]): FieldConfiguration[] {
    return [...fields].sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return a.display_name.localeCompare(b.display_name);
    });
  }

  /**
   * Get default value for a field
   */
  getDefaultValue(field: FieldConfiguration): any {
    if (field.default_value) {
      // Try to parse based on field type
      switch (field.field_type) {
        case "boolean":
          return field.default_value.toLowerCase() === "true";
        case "number":
        case "decimal":
        case "integer":
          return parseFloat(field.default_value);
        case "date":
          return new Date(field.default_value);
        default:
          return field.default_value;
      }
    }

    // Return appropriate default based on field type
    switch (field.field_type) {
      case "boolean":
        return false;
      case "number":
      case "decimal":
      case "integer":
        return field.field_type === "integer" ? 0 : 0.0;
      case "enum":
        return field.enum_options.length > 0 ? field.enum_options[0] : "";
      default:
        return "";
    }
  }
}

// Export singleton instance
export const fieldConfigService = new FieldConfigService();
export type { FieldConfiguration, ValidationResult };
