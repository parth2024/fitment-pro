from django.shortcuts import render, get_object_or_404
from rest_framework import generics, status
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.contrib.auth.models import User
from .models import Tenant, UserProfile
from .serializers import TenantSerializer, TenantCreateSerializer, TenantUpdateSerializer, UserProfileSerializer


# Create your views here.

class TenantListCreateView(generics.ListCreateAPIView):
    queryset = Tenant.objects.all().order_by('-created_at')
    serializer_class = TenantSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return TenantCreateSerializer
        return TenantSerializer

    def create(self, request, *args, **kwargs):
        serializer = TenantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = Tenant.objects.create(**serializer.validated_data)
        return Response(TenantSerializer(tenant).data, status=status.HTTP_201_CREATED)


class TenantDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Tenant.objects.all()
    serializer_class = TenantSerializer
    permission_classes = [AllowAny]  # Temporarily allow any access for testing
    lookup_field = 'id'

    def get_serializer_class(self):
        if self.request.method in ['PUT', 'PATCH']:
            return TenantUpdateSerializer
        return TenantSerializer


@api_view(['GET'])
def get_current_tenant(request):
    """Get the current user's tenant"""
    # Temporarily return the default tenant for testing
    try:
        default_tenant = Tenant.objects.filter(is_default=True).first()
        if default_tenant:
            return Response(TenantSerializer(default_tenant).data)
        else:
            # If no default tenant, return the first available tenant
            first_tenant = Tenant.objects.first()
            if first_tenant:
                return Response(TenantSerializer(first_tenant).data)
            else:
                return Response({'error': 'No tenants available'}, status=status.HTTP_404_NOT_FOUND)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
def switch_tenant(request, tenant_id):
    """Switch user's current tenant (if they have access to multiple tenants)"""
    # Temporarily allow tenant switching without authentication for testing
    try:
        tenant = get_object_or_404(Tenant, id=tenant_id, is_active=True)
        return Response(TenantSerializer(tenant).data)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
def tenant_stats(request, tenant_id):
    """Get statistics for a specific tenant"""
    # Temporarily allow access without authentication for testing
    try:
        tenant = get_object_or_404(Tenant, id=tenant_id, is_active=True)
        
        # Get tenant statistics
        stats = {
            'tenant': TenantSerializer(tenant).data,
            'user_count': tenant.users.count(),
            'fitment_count': tenant.fitments.count(),
            'upload_count': tenant.data_upload_sessions.count(),  # Fixed field name
            'preset_count': 0,  # Placeholder for now
        }
        
        return Response(stats)
    except Exception as e:
        return Response({'error': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)