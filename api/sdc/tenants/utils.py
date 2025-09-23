from django.http import Http404
from rest_framework.response import Response
from rest_framework import status
from .models import Tenant, UserProfile


def get_tenant_from_request(request):
    """
    Get the tenant from the request.
    First tries to get from X-Tenant-ID header, then falls back to user profile.
    Returns the tenant or raises Http404 if not found.
    """
    # Try to get tenant from X-Tenant-ID header first (for current setup)
    tenant_id = request.headers.get('X-Tenant-ID')
    print(f"DEBUG: get_tenant_from_request - X-Tenant-ID: {tenant_id}")
    
    if tenant_id:
        try:
            print(f"DEBUG: Looking for tenant with ID: {tenant_id}")
            tenant = Tenant.objects.get(id=str(tenant_id), is_active=True)
            print(f"DEBUG: Found tenant: {tenant.name} (ID: {tenant.id})")
            return tenant
        except Tenant.DoesNotExist:
            print(f"DEBUG: Tenant with ID {tenant_id} not found in database")
            # Let's check what tenants actually exist
            all_tenants = Tenant.objects.all()
            print(f"DEBUG: Available tenants: {[(t.id, t.name, t.is_active) for t in all_tenants]}")
            raise Http404("Tenant not found")
    
    # Fallback to user profile (for authenticated users)
    if not request.user.is_authenticated:
        raise Http404("Authentication required")
    
    try:
        profile = request.user.profile
        return profile.tenant
    except UserProfile.DoesNotExist:
        raise Http404("No tenant assigned to user")


def get_tenant_or_404(tenant_id, request):
    """
    Get a specific tenant by ID, ensuring the user has access to it.
    Returns the tenant or raises Http404 if not found or access denied.
    """
    if not request.user.is_authenticated:
        raise Http404("Authentication required")
    
    try:
        tenant = Tenant.objects.get(id=tenant_id, is_active=True)
        
        # Check if user has access to this tenant
        try:
            profile = request.user.profile
            if profile.tenant != tenant:
                raise Http404("Access denied to this tenant")
        except UserProfile.DoesNotExist:
            raise Http404("User profile not found")
        
        return tenant
    except Tenant.DoesNotExist:
        raise Http404("Tenant not found")


def filter_queryset_by_tenant(queryset, request, tenant_field='tenant'):
    """
    Filter a queryset by the tenant from the request.
    Returns empty queryset if no tenant is found.
    """
    try:
        tenant = get_tenant_from_request(request)
        # Filter by tenant ID, not the tenant object
        return queryset.filter(**{f"tenant_id": tenant.id})
    except Http404:
        # Return empty queryset if no tenant found
        return queryset.none()


def get_tenant_id_from_request(request):
    """
    Get the tenant ID from the request for use in API responses.
    Returns None if no tenant is found.
    """
    try:
        tenant = get_tenant_from_request(request)
        return str(tenant.id)
    except Http404:
        return None


def validate_tenant_access(request, tenant_id):
    """
    Validate that the user has access to the specified tenant.
    Returns True if access is granted, False otherwise.
    """
    try:
        get_tenant_or_404(tenant_id, request)
        return True
    except Http404:
        return False


def create_tenant_response(data, tenant_id=None):
    """
    Create a standardized response with tenant context.
    """
    response_data = {
        'data': data,
        'tenant_id': tenant_id,
        'success': True
    }
    return response_data
