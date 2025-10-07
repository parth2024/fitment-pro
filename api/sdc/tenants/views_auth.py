from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.models import User
from django.views.decorators.csrf import csrf_exempt
from .models import UserProfile, Role
from .serializers import UserProfileSerializer
import json


@api_view(['POST'])
@permission_classes([AllowAny])
@csrf_exempt
def login_view(request):
    """Login endpoint that returns user information with roles"""
    try:
        data = json.loads(request.body)
        username = data.get('username')
        password = data.get('password')
        
        if not username or not password:
            return Response(
                {'error': 'Username and password required'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user = authenticate(request, username=username, password=password)
        
        if user is not None:
            login(request, user)
            
            # Get user profile and roles
            try:
                profile = user.profile
                roles = [role.name for role in profile.roles.all()]
                
                # Determine if user is admin (has Admin role or is superuser)
                is_admin = 'Admin' in roles or user.is_superuser
                
                user_data = {
                    'id': user.id,
                    'username': user.username,
                    'email': user.email,
                    'first_name': user.first_name,
                    'last_name': user.last_name,
                    'display_name': profile.display_name or f"{user.first_name} {user.last_name}".strip() or user.username,
                    'roles': roles,
                    'is_admin': is_admin,
                    'is_mft_user': 'MFT User' in roles,
                    'tenant': {
                        'id': str(profile.tenant.id),
                        'name': profile.tenant.name,
                        'slug': profile.tenant.slug
                    }
                }
                
                return Response({
                    'success': True,
                    'user': user_data,
                    'message': 'Login successful'
                })
                
            except UserProfile.DoesNotExist:
                return Response(
                    {'error': 'User profile not found'}, 
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            return Response(
                {'error': 'Invalid credentials'}, 
                status=status.HTTP_401_UNAUTHORIZED
            )
            
    except json.JSONDecodeError:
        return Response(
            {'error': 'Invalid JSON'}, 
            status=status.HTTP_400_BAD_REQUEST
        )
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_view(request):
    """Logout endpoint"""
    try:
        logout(request)
        return Response({'success': True, 'message': 'Logout successful'})
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_user_view(request):
    """Get current user information with roles"""
    try:
        user = request.user
        
        # Get user profile and roles
        try:
            profile = user.profile
            roles = [role.name for role in profile.roles.all()]
            
            # Determine if user is admin (has Admin role or is superuser)
            is_admin = 'Admin' in roles or user.is_superuser
            
            user_data = {
                'id': user.id,
                'username': user.username,
                'email': user.email,
                'first_name': user.first_name,
                'last_name': user.last_name,
                'display_name': profile.display_name or f"{user.first_name} {user.last_name}".strip() or user.username,
                'roles': roles,
                'is_admin': is_admin,
                'is_mft_user': 'MFT User' in roles,
                'tenant': {
                    'id': str(profile.tenant.id),
                    'name': profile.tenant.name,
                    'slug': profile.tenant.slug
                }
            }
            
            return Response({
                'success': True,
                'user': user_data
            })
            
        except UserProfile.DoesNotExist:
            return Response(
                {'error': 'User profile not found'}, 
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def user_roles_view(request):
    """Get available user roles"""
    try:
        roles = Role.objects.all().values('id', 'name', 'description')
        return Response({
            'success': True,
            'roles': list(roles)
        })
    except Exception as e:
        return Response(
            {'error': str(e)}, 
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
