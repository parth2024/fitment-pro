"""
Dynamic Field Validator for VCDB and Product data validation
based on field configuration from settings
"""

import pandas as pd
import re
from typing import Dict, List, Tuple, Any, Optional
from django.core.exceptions import ValidationError
from field_config.models import FieldConfiguration


class DynamicFieldValidator:
    """Validator for dynamic fields based on field configuration"""
    
    def __init__(self, reference_type: str):
        """
        Initialize validator for specific reference type
        
        Args:
            reference_type: 'vcdb', 'product', or 'both'
        """
        self.reference_type = reference_type
        self.field_configs = self._load_field_configurations()
    
    def _load_field_configurations(self) -> Dict[str, FieldConfiguration]:
        """Load field configurations for the reference type"""
        configs = {}
        
        # Get configurations for this reference type only
        field_configs = FieldConfiguration.objects.filter(
            is_enabled=True,
            reference_type=self.reference_type
        ).order_by('display_order')
        
        for config in field_configs:
            configs[config.name] = config
            
        return configs
    
    def validate_dataframe(self, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Validate entire dataframe against dynamic field configurations
        
        Args:
            df: DataFrame to validate
            
        Returns:
            Tuple of (is_valid, list_of_errors)
        """
        errors = []
        
        # Check required fields
        required_errors = self._validate_required_fields(df)
        errors.extend(required_errors)
        
        # Check field types and constraints
        for field_name, config in self.field_configs.items():
            if field_name in df.columns:
                field_errors = self._validate_field(df[field_name], config)
                errors.extend(field_errors)
        
        # Check for disabled fields (should not be present)
        disabled_errors = self._validate_disabled_fields(df)
        errors.extend(disabled_errors)
        
        return len(errors) == 0, errors
    
    def _validate_required_fields(self, df: pd.DataFrame) -> List[str]:
        """Validate that all required fields are present"""
        errors = []
        
        for field_name, config in self.field_configs.items():
            if config.requirement_level == 'required':
                if field_name not in df.columns:
                    errors.append(
                        f"Required field '{config.display_name}' ({field_name}) is missing"
                    )
                elif df[field_name].isna().all():
                    errors.append(
                        f"Required field '{config.display_name}' ({field_name}) has no data"
                    )
        
        return errors
    
    def _validate_disabled_fields(self, df: pd.DataFrame) -> List[str]:
        """Validate that disabled fields are not present"""
        errors = []
        
        for field_name, config in self.field_configs.items():
            if config.requirement_level == 'disabled' and field_name in df.columns:
                errors.append(
                    f"Disabled field '{config.display_name}' ({field_name}) should not be present"
                )
        
        return errors
    
    def _validate_field(self, series: pd.Series, config: FieldConfiguration) -> List[str]:
        """Validate a single field series against its configuration"""
        errors = []
        
        # Skip validation for completely empty series
        if series.isna().all():
            return errors
        
        # Validate field type
        type_errors = self._validate_field_type(series, config)
        errors.extend(type_errors)
        
        # Validate constraints
        constraint_errors = self._validate_field_constraints(series, config)
        errors.extend(constraint_errors)
        
        # Validate unique constraint
        if config.is_unique:
            unique_errors = self._validate_unique_constraint(series, config)
            errors.extend(unique_errors)
        
        return errors
    
    def _validate_field_type(self, series: pd.Series, config: FieldConfiguration) -> List[str]:
        """Validate field type"""
        errors = []
        
        # Remove null values for type checking
        non_null_series = series.dropna()
        
        if len(non_null_series) == 0:
            return errors
        
        field_name = config.display_name or config.name
        
        if config.field_type == 'string':
            # String fields should be convertible to string
            try:
                non_null_series.astype(str)
            except Exception:
                errors.append(f"Field '{field_name}' contains non-string values")
        
        elif config.field_type == 'number':
            # Number fields should be numeric
            try:
                pd.to_numeric(non_null_series, errors='coerce')
                if non_null_series.astype(str).str.contains('[^0-9.-]', regex=True).any():
                    errors.append(f"Field '{field_name}' contains non-numeric values")
            except Exception:
                errors.append(f"Field '{field_name}' contains non-numeric values")
        
        elif config.field_type == 'integer':
            # Integer fields should be whole numbers
            try:
                numeric_series = pd.to_numeric(non_null_series, errors='coerce')
                if not numeric_series.dropna().apply(lambda x: x.is_integer()).all():
                    errors.append(f"Field '{field_name}' contains non-integer values")
            except Exception:
                errors.append(f"Field '{field_name}' contains non-integer values")
        
        elif config.field_type == 'decimal':
            # Decimal fields should be numeric
            try:
                pd.to_numeric(non_null_series, errors='coerce')
            except Exception:
                errors.append(f"Field '{field_name}' contains non-decimal values")
        
        elif config.field_type == 'boolean':
            # Boolean fields should be boolean-like
            try:
                # Convert to string and check for boolean-like values
                str_series = non_null_series.astype(str).str.lower()
                valid_bools = str_series.isin(['true', 'false', '1', '0', 'yes', 'no', 'y', 'n'])
                if not valid_bools.all():
                    errors.append(f"Field '{field_name}' contains non-boolean values")
            except Exception:
                errors.append(f"Field '{field_name}' contains non-boolean values")
        
        elif config.field_type == 'enum':
            # Enum fields should only contain allowed values
            if config.enum_options:
                str_series = non_null_series.astype(str)
                invalid_values = str_series[~str_series.isin(config.enum_options)]
                if len(invalid_values) > 0:
                    unique_invalid = invalid_values.unique()[:5]  # Show first 5 invalid values
                    errors.append(
                        f"Field '{field_name}' contains invalid values: {', '.join(unique_invalid)}. "
                        f"Allowed values: {', '.join(config.enum_options)}"
                    )
        
        elif config.field_type == 'date':
            # Date fields should be parseable as dates
            try:
                pd.to_datetime(non_null_series, errors='coerce')
                if pd.to_datetime(non_null_series, errors='coerce').isna().any():
                    errors.append(f"Field '{field_name}' contains invalid date values")
            except Exception:
                errors.append(f"Field '{field_name}' contains invalid date values")
        
        return errors
    
    def _validate_field_constraints(self, series: pd.Series, config: FieldConfiguration) -> List[str]:
        """Validate field constraints (length, min/max values)"""
        errors = []
        
        field_name = config.display_name or config.name
        non_null_series = series.dropna()
        
        if len(non_null_series) == 0:
            return errors
        
        # Validate string length constraints
        if config.field_type in ['string', 'text']:
            str_series = non_null_series.astype(str)
            
            if config.min_length is not None:
                short_values = str_series[str_series.str.len() < config.min_length]
                if len(short_values) > 0:
                    errors.append(
                        f"Field '{field_name}' has values shorter than minimum length {config.min_length}"
                    )
            
            if config.max_length is not None:
                long_values = str_series[str_series.str.len() > config.max_length]
                if len(long_values) > 0:
                    errors.append(
                        f"Field '{field_name}' has values longer than maximum length {config.max_length}"
                    )
        
        # Validate numeric constraints
        elif config.field_type in ['number', 'integer', 'decimal']:
            try:
                numeric_series = pd.to_numeric(non_null_series, errors='coerce')
                
                if config.min_value is not None:
                    small_values = numeric_series[numeric_series < config.min_value]
                    if len(small_values) > 0:
                        errors.append(
                            f"Field '{field_name}' has values smaller than minimum {config.min_value}"
                        )
                
                if config.max_value is not None:
                    large_values = numeric_series[numeric_series > config.max_value]
                    if len(large_values) > 0:
                        errors.append(
                            f"Field '{field_name}' has values larger than maximum {config.max_value}"
                        )
            except Exception:
                # Type validation errors are handled elsewhere
                pass
        
        return errors
    
    def _validate_unique_constraint(self, series: pd.Series, config: FieldConfiguration) -> List[str]:
        """Validate unique constraint"""
        errors = []
        
        field_name = config.display_name or config.name
        non_null_series = series.dropna()
        
        if len(non_null_series) == 0:
            return errors
        
        # Check for duplicates
        duplicates = non_null_series[non_null_series.duplicated()]
        if len(duplicates) > 0:
            unique_duplicates = duplicates.unique()[:5]  # Show first 5 duplicate values
            errors.append(
                f"Field '{field_name}' has duplicate values: {', '.join(map(str, unique_duplicates))}"
            )
        
        return errors
    
    def get_validation_summary(self, df: pd.DataFrame) -> Dict[str, Any]:
        """Get a summary of validation results"""
        is_valid, errors = self.validate_dataframe(df)
        
        # Count fields by status
        field_status = {
            'required_present': 0,
            'required_missing': 0,
            'optional_present': 0,
            'disabled_present': 0,
            'total_configured': len(self.field_configs)
        }
        
        for field_name, config in self.field_configs.items():
            if config.requirement_level == 'required':
                if field_name in df.columns and not df[field_name].isna().all():
                    field_status['required_present'] += 1
                else:
                    field_status['required_missing'] += 1
            elif config.requirement_level == 'optional':
                if field_name in df.columns:
                    field_status['optional_present'] += 1
            elif config.requirement_level == 'disabled':
                if field_name in df.columns:
                    field_status['disabled_present'] += 1
        
        return {
            'is_valid': is_valid,
            'errors': errors,
            'field_status': field_status,
            'total_records': len(df),
            'configured_fields': list(self.field_configs.keys())
        }


# Import models at the end to avoid circular imports
from django.db import models
