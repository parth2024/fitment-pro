import django_filters
from .models import FieldConfiguration


class FieldConfigurationFilter(django_filters.FilterSet):
    """Filter for FieldConfiguration"""
    
    name = django_filters.CharFilter(lookup_expr='icontains')
    display_name = django_filters.CharFilter(lookup_expr='icontains')
    field_type = django_filters.ChoiceFilter(choices=FieldConfiguration.FIELD_TYPES)
    reference_type = django_filters.ChoiceFilter(choices=FieldConfiguration.REFERENCE_TYPES)
    requirement_level = django_filters.ChoiceFilter(choices=FieldConfiguration.FIELD_REQUIREMENTS)
    is_enabled = django_filters.BooleanFilter()
    is_unique = django_filters.BooleanFilter()
    show_in_filters = django_filters.BooleanFilter()
    show_in_forms = django_filters.BooleanFilter()
    
    # Date range filters
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    updated_after = django_filters.DateTimeFilter(field_name='updated_at', lookup_expr='gte')
    updated_before = django_filters.DateTimeFilter(field_name='updated_at', lookup_expr='lte')
    
    # Numeric range filters
    min_length_gte = django_filters.NumberFilter(field_name='min_length', lookup_expr='gte')
    min_length_lte = django_filters.NumberFilter(field_name='min_length', lookup_expr='lte')
    max_length_gte = django_filters.NumberFilter(field_name='max_length', lookup_expr='gte')
    max_length_lte = django_filters.NumberFilter(field_name='max_length', lookup_expr='lte')
    
    class Meta:
        model = FieldConfiguration
        fields = {
            'name': ['exact', 'icontains'],
            'display_name': ['exact', 'icontains'],
            'description': ['icontains'],
            'field_type': ['exact'],
            'reference_type': ['exact'],
            'requirement_level': ['exact'],
            'is_enabled': ['exact'],
            'is_unique': ['exact'],
            'show_in_filters': ['exact'],
            'show_in_forms': ['exact'],
            'display_order': ['exact', 'gte', 'lte'],
            'created_by': ['exact', 'icontains'],
            'updated_by': ['exact', 'icontains'],
        }
