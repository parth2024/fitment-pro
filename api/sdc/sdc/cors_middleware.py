"""
Custom CORS middleware to fix duplicate Access-Control-Allow-Credentials headers
"""
from django.utils.deprecation import MiddlewareMixin


class FixCorsCredentialsMiddleware(MiddlewareMixin):
    """
    Middleware to fix duplicate Access-Control-Allow-Credentials headers
    that can occur when running behind a proxy or load balancer
    """
    
    def process_response(self, request, response):
        # List of CORS headers that should not be duplicated
        cors_headers_to_fix = [
            'Access-Control-Allow-Credentials',
            'Access-Control-Allow-Origin',
            'Access-Control-Allow-Methods',
            'Access-Control-Allow-Headers',
            'Access-Control-Expose-Headers',
        ]
        
        for header_name in cors_headers_to_fix:
            if header_name in response:
                current_value = response[header_name]
                
                # If it contains multiple values (comma-separated), clean it up
                if ',' in str(current_value):
                    # Split by comma and clean up each value
                    values = [v.strip() for v in str(current_value).split(',')]
                    
                    # For Access-Control-Allow-Credentials, only keep the first 'true' or 'false'
                    if header_name == 'Access-Control-Allow-Credentials':
                        for value in values:
                            if value.lower() in ['true', 'false']:
                                response[header_name] = value.lower()
                                break
                    else:
                        # For other headers, remove duplicates and join
                        unique_values = list(dict.fromkeys(values))  # Remove duplicates while preserving order
                        response[header_name] = ', '.join(unique_values)
                
                # Ensure Access-Control-Allow-Credentials is properly formatted
                elif header_name == 'Access-Control-Allow-Credentials':
                    if str(current_value).lower() in ['true', 'false']:
                        response[header_name] = str(current_value).lower()
        
        return response
