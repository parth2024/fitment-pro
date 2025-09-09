from django.shortcuts import render
from rest_framework import generics, status
from rest_framework.response import Response
from .models import Tenant
from .serializers import TenantSerializer, TenantCreateSerializer


# Create your views here.

class TenantListCreateView(generics.ListCreateAPIView):
    queryset = Tenant.objects.all().order_by('-created_at')
    serializer_class = TenantSerializer

    def create(self, request, *args, **kwargs):
        serializer = TenantCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        tenant = Tenant.objects.create(**serializer.validated_data)
        return Response(TenantSerializer(tenant).data, status=status.HTTP_201_CREATED)
