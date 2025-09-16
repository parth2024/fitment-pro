from typing import Dict, List, Any, Tuple, Optional
from django.core.exceptions import ValidationError
from django.db import models
from .models import FieldConfiguration


class FieldValidationError(ValidationError):
    """Custom validation error for field validation"""
    pass


class FieldValidator:
    """Utility class for validating field data based on configuration"""
    
    def __init__(self, reference_type: str):
        self.reference_type = reference_type
        self.field_configs = self._load_field_configs()
    
    def _load_field_configs(self) -> Dict[str, FieldConfiguration]:
        """Load field configurations for the reference type"""
        configs = {}
        fields = FieldConfiguration.objects.filter(
            models.Q(reference_type=self.reference_type) | 
            models.Q(reference_type='both'),
            is_enabled=True
        )
        
        for field in fields:
            configs[field.name] = field
        
        return configs
    
    def validate_data(self, data: Dict[str, Any]) -> Tuple[bool, Dict[str, List[str]]]:
        """
        Validate data against field configurations
        
        Returns:
            Tuple of (is_valid, errors_dict)
        """
        errors = {}
        
        for field_name, field_config in self.field_configs.items():
            field_errors = []
            value = data.get(field_name)
            
            # Check if required field is missing
            if field_config.is_required and (value is None or value == ""):
                field_errors.append(f"Field '{field_config.display_name}' is required")
                continue
            
            # Skip validation for empty optional fields
            if not field_config.is_required and (value is None or value == ""):
                continue
            
            # Validate field value
            try:
                self._validate_field_value(field_config, value)
            except FieldValidationError as e:
                field_errors.extend(e.messages)
            
            if field_errors:
                errors[field_name] = field_errors
        
        return len(errors) == 0, errors
    
    def _validate_field_value(self, field_config: FieldConfiguration, value: Any) -> None:
        """Validate a single field value"""
        field_type = field_config.field_type
        
        # Type-specific validation
        if field_type == 'string':
            self._validate_string_field(field_config, value)
        elif field_type == 'text':
            self._validate_text_field(field_config, value)
        elif field_type in ['number', 'decimal', 'integer']:
            self._validate_numeric_field(field_config, value)
        elif field_type == 'boolean':
            self._validate_boolean_field(field_config, value)
        elif field_type == 'enum':
            self._validate_enum_field(field_config, value)
        elif field_type == 'date':
            self._validate_date_field(field_config, value)
    
    def _validate_string_field(self, field_config: FieldConfiguration, value: Any) -> None:
        """Validate string field"""
        if not isinstance(value, str):
            raise FieldValidationError(f"Field '{field_config.display_name}' must be a string")
        
        value_len = len(value)
        
        if field_config.min_length is not None and value_len < field_config.min_length:
            raise FieldValidationError(
                f"Field '{field_config.display_name}' must be at least {field_config.min_length} characters"
            )
        
        if field_config.max_length is not None and value_len > field_config.max_length:
            raise FieldValidationError(
                f"Field '{field_config.display_name}' must be at most {field_config.max_length} characters"
            )
    
    def _validate_text_field(self, field_config: FieldConfiguration, value: Any) -> None:
        """Validate text field (same as string but typically longer)"""
        self._validate_string_field(field_config, value)
    
    def _validate_numeric_field(self, field_config: FieldConfiguration, value: Any) -> None:
        """Validate numeric field"""
        try:
            if field_config.field_type == 'integer':
                num_value = int(value)
            else:
                num_value = float(value)
        except (ValueError, TypeError):
            raise FieldValidationError(f"Field '{field_config.display_name}' must be a valid number")
        
        if field_config.min_value is not None and num_value < field_config.min_value:
            raise FieldValidationError(
                f"Field '{field_config.display_name}' must be at least {field_config.min_value}"
            )
        
        if field_config.max_value is not None and num_value > field_config.max_value:
            raise FieldValidationError(
                f"Field '{field_config.display_name}' must be at most {field_config.max_value}"
            )
    
    def _validate_boolean_field(self, field_config: FieldConfiguration, value: Any) -> None:
        """Validate boolean field"""
        if isinstance(value, bool):
            return
        
        if isinstance(value, str):
            if value.lower() in ['true', '1', 'yes', 'on']:
                return
            elif value.lower() in ['false', '0', 'no', 'off']:
                return
        
        raise FieldValidationError(f"Field '{field_config.display_name}' must be a boolean value")
    
    def _validate_enum_field(self, field_config: FieldConfiguration, value: Any) -> None:
        """Validate enum field"""
        if value not in field_config.enum_options:
            options_str = ', '.join(field_config.enum_options)
            raise FieldValidationError(
                f"Field '{field_config.display_name}' must be one of: {options_str}"
            )
    
    def _validate_date_field(self, field_config: FieldConfiguration, value: Any) -> None:
        """Validate date field"""
        from datetime import datetime
        
        if isinstance(value, datetime):
            return
        
        if isinstance(value, str):
            try:
                # Try common date formats
                for fmt in ['%Y-%m-%d', '%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d %H:%M:%S']:
                    try:
                        datetime.strptime(value, fmt)
                        return
                    except ValueError:
                        continue
            except:
                pass
        
        raise FieldValidationError(f"Field '{field_config.display_name}' must be a valid date")
    
    def get_required_fields(self) -> List[str]:
        """Get list of required field names"""
        return [
            field.name for field in self.field_configs.values()
            if field.is_required
        ]
    
    def get_optional_fields(self) -> List[str]:
        """Get list of optional field names"""
        return [
            field.name for field in self.field_configs.values()
            if field.requirement_level == 'optional'
        ]
    
    def get_form_fields(self) -> List[FieldConfiguration]:
        """Get field configurations for form rendering"""
        return [
            field for field in self.field_configs.values()
            if field.show_in_forms
        ]
    
    def get_filter_fields(self) -> List[FieldConfiguration]:
        """Get field configurations for filter rendering"""
        return [
            field for field in self.field_configs.values()
            if field.show_in_filters
        ]
    
    def apply_default_values(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Apply default values for missing optional fields"""
        result = data.copy()
        
        for field_name, field_config in self.field_configs.items():
            if field_name not in result and field_config.default_value:
                result[field_name] = field_config.default_value
        
        return result


def validate_vcdb_data(data: Dict[str, Any]) -> Tuple[bool, Dict[str, List[str]]]:
    """Convenience function to validate VCDB data"""
    validator = FieldValidator('vcdb')
    return validator.validate_data(data)


def validate_product_data(data: Dict[str, Any]) -> Tuple[bool, Dict[str, List[str]]]:
    """Convenience function to validate Product data"""
    validator = FieldValidator('product')
    return validator.validate_data(data)


def get_vcdb_form_fields() -> List[FieldConfiguration]:
    """Get VCDB field configurations for forms"""
    validator = FieldValidator('vcdb')
    return validator.get_form_fields()


def get_product_form_fields() -> List[FieldConfiguration]:
    """Get Product field configurations for forms"""
    validator = FieldValidator('product')
    return validator.get_form_fields()


def get_vcdb_filter_fields() -> List[FieldConfiguration]:
    """Get VCDB field configurations for filters"""
    validator = FieldValidator('vcdb')
    return validator.get_filter_fields()


def get_product_filter_fields() -> List[FieldConfiguration]:
    """Get Product field configurations for filters"""
    validator = FieldValidator('product')
    return validator.get_filter_fields()
