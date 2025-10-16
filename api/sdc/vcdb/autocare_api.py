import requests
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from django.conf import settings
from django.utils import timezone
import json

logger = logging.getLogger(__name__)


class AutoCareAPIClient:
    """Client for AutoCare VCDB API integration"""
    
    def __init__(self):
        self.base_url = "https://vcdb.autocarevip.com/api/v1.0/vcdb"
        self.auth_url = "https://autocare-identity.autocare.org/connect/token"
        
        # AutoCare API credentials from environment variables
        self.client_id = getattr(settings, 'AUTOCARE_CLIENT_ID')
        self.client_secret = getattr(settings, 'AUTOCARE_CLIENT_SECRET')
        self.username = getattr(settings, 'AUTOCARE_USERNAME')
        self.password = getattr(settings, 'AUTOCARE_PASSWORD')
        self.scope = "VcdbApis CommonApis openid profile offline_access"
        
        self.access_token = None
        self.token_expires_at = None
        self.refresh_token = None
    
    def authenticate(self) -> bool:
        """Authenticate with AutoCare API and get access token"""
        try:
            auth_data = {
                'grant_type': 'password',
                'client_id': self.client_id,
                'client_secret': self.client_secret,
                'username': self.username,
                'password': self.password,
                'scope': self.scope
            }
            
            headers = {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
            
            logger.info("Authenticating with AutoCare API...")
            response = requests.post(self.auth_url, data=auth_data, headers=headers, timeout=30)
            response.raise_for_status()
            
            token_data = response.json()
            self.access_token = token_data['access_token']
            self.refresh_token = token_data.get('refresh_token')
            
            # Calculate token expiration time
            expires_in = token_data.get('expires_in', 3600)
            self.token_expires_at = timezone.now() + timedelta(seconds=expires_in - 60)  # 1 minute buffer
            
            logger.info(f"Successfully authenticated. Token expires at: {self.token_expires_at}")
            return True
            
        except requests.exceptions.RequestException as e:
            logger.error(f"Authentication failed: {str(e)}")
            return False
        except KeyError as e:
            logger.error(f"Invalid response format: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected error during authentication: {str(e)}")
            return False
    
    def is_token_valid(self) -> bool:
        """Check if current token is still valid"""
        if not self.access_token or not self.token_expires_at:
            return False
        return timezone.now() < self.token_expires_at
    
    def ensure_authenticated(self) -> bool:
        """Ensure we have a valid token, re-authenticate if needed"""
        if not self.is_token_valid():
            logger.info("Token expired or missing, re-authenticating...")
            return self.authenticate()
        return True
    
    def _make_request(self, endpoint: str, params: Optional[Dict] = None) -> Optional[List[Dict]]:
        """Make authenticated request to AutoCare API"""
        if not self.ensure_authenticated():
            logger.error("Failed to authenticate with AutoCare API")
            return None
        
        url = f"{self.base_url}/{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        try:
            logger.info(f"Making request to: {url}")
            response = requests.get(url, headers=headers, params=params, timeout=60)
            response.raise_for_status()
            
            data = response.json()
            if isinstance(data, list):
                logger.info(f"Retrieved {len(data)} records from {endpoint}")
                return data
            else:
                logger.warning(f"Unexpected response format from {endpoint}: {type(data)}")
                return []
                
        except requests.exceptions.RequestException as e:
            logger.error(f"Request failed for {endpoint}: {str(e)}")
            return None
        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON response from {endpoint}: {str(e)}")
            return None
        except Exception as e:
            logger.error(f"Unexpected error for {endpoint}: {str(e)}")
            return None
    
    def get_makes(self) -> Optional[List[Dict]]:
        """Fetch all makes from AutoCare API"""
        return self._make_request("Make")
    
    def get_models(self) -> Optional[List[Dict]]:
        """Fetch all models from AutoCare API"""
        return self._make_request("Model")
    
    def get_submodels(self) -> Optional[List[Dict]]:
        """Fetch all submodels from AutoCare API"""
        return self._make_request("SubModel")
    
    def get_base_vehicles(self) -> Optional[List[Dict]]:
        """Fetch all base vehicles from AutoCare API"""
        return self._make_request("BaseVehicle")
    
    def get_drive_types(self) -> Optional[List[Dict]]:
        """Fetch all drive types from AutoCare API"""
        return self._make_request("DriveType")
    
    def get_fuel_types(self) -> Optional[List[Dict]]:
        """Fetch all fuel types from AutoCare API"""
        return self._make_request("FuelType")
    
    def get_body_num_doors(self) -> Optional[List[Dict]]:
        """Fetch all body number of doors from AutoCare API"""
        return self._make_request("BodyNumDoors")
    
    def get_body_style_configs(self) -> Optional[List[Dict]]:
        """Fetch all body style configs from AutoCare API"""
        return self._make_request("BodyStyleConfig")
    
    def get_engine_configs(self) -> Optional[List[Dict]]:
        """Fetch all engine configs from AutoCare API"""
        return self._make_request("EngineConfig")
    
    def get_vehicles(self) -> Optional[List[Dict]]:
        """Fetch all vehicles from AutoCare API"""
        return self._make_request("Vehicle")
    
    def get_vehicle_to_drive_types(self) -> Optional[List[Dict]]:
        """Fetch all vehicle to drive type mappings from AutoCare API"""
        return self._make_request("VehicleToDriveType")
    
    def get_vehicle_to_body_style_configs(self) -> Optional[List[Dict]]:
        """Fetch all vehicle to body style config mappings from AutoCare API"""
        return self._make_request("VehicleToBodyStyleConfig")
    
    def get_vehicle_to_engine_configs(self) -> Optional[List[Dict]]:
        """Fetch all vehicle to engine config mappings from AutoCare API"""
        return self._make_request("VehicleToEngineConfig")
    
    def get_body_types(self) -> Optional[List[Dict]]:
        """Fetch all body types from AutoCare API"""
        return self._make_request("BodyType")
    
    def get_regions(self) -> Optional[List[Dict]]:
        """Fetch all regions from AutoCare API"""
        return self._make_request("Region")
    
    def get_publication_stages(self) -> Optional[List[Dict]]:
        """Fetch all publication stages from AutoCare API"""
        return self._make_request("PublicationStage")
    
    def get_years(self) -> Optional[List[Dict]]:
        """Fetch all years from AutoCare API"""
        return self._make_request("Year")
    
    def get_all_data(self) -> Dict[str, Optional[List[Dict]]]:
        """Fetch all VCDB data from AutoCare API"""
        logger.info("Starting comprehensive VCDB data fetch...")
        
        data = {
            'makes': self.get_makes(),
            'models': self.get_models(),
            'submodels': self.get_submodels(),
            'regions': self.get_regions(),
            'publication_stages': self.get_publication_stages(),
            'years': self.get_years(),
            'base_vehicles': self.get_base_vehicles(),
            'drive_types': self.get_drive_types(),
            'fuel_types': self.get_fuel_types(),
            'body_num_doors': self.get_body_num_doors(),
            'body_style_configs': self.get_body_style_configs(),
            'engine_configs': self.get_engine_configs(),
            'vehicles': self.get_vehicles(),
            'vehicle_to_drive_types': self.get_vehicle_to_drive_types(),
            'vehicle_to_body_style_configs': self.get_vehicle_to_body_style_configs(),
            'vehicle_to_engine_configs': self.get_vehicle_to_engine_configs(),
            'body_types': self.get_body_types(),
        }
        
        # Log summary
        total_records = sum(len(records) for records in data.values() if records)
        logger.info(f"VCDB data fetch completed. Total records: {total_records}")
        
        for table_name, records in data.items():
            if records:
                logger.info(f"  {table_name}: {len(records)} records")
            else:
                logger.warning(f"  {table_name}: Failed to fetch data")
        
        return data


def parse_datetime(date_string: str) -> Optional[datetime]:
    """Parse datetime string from AutoCare API"""
    if not date_string or date_string.lower() == 'null':
        return None
    
    try:
        # Handle different datetime formats
        formats = [
            '%Y-%m-%dT%H:%M:%S',
            '%Y-%m-%dT%H:%M:%S.%f',
            '%Y-%m-%dT%H:%M:%S.%fZ',
            '%Y-%m-%dT%H:%M:%SZ',
        ]
        
        for fmt in formats:
            try:
                dt = datetime.strptime(date_string.replace('Z', ''), fmt)
                # Make timezone-aware if it's naive
                from django.utils import timezone
                if timezone.is_naive(dt):
                    dt = timezone.make_aware(dt)
                return dt
            except ValueError:
                continue
        
        # If none of the formats work, try parsing with dateutil
        from dateutil import parser
        dt = parser.parse(date_string)
        from django.utils import timezone
        if timezone.is_naive(dt):
            dt = timezone.make_aware(dt)
        return dt
        
    except Exception as e:
        logger.warning(f"Failed to parse datetime '{date_string}': {str(e)}")
        return None


def convert_autocare_data_to_django(data: Dict[str, Any], table_name: str) -> Dict[str, Any]:
    """Convert AutoCare API data format to Django model format"""
    converted = {}
    
    # Map AutoCare field names to Django model field names
    field_mapping = {
        'Make': {
            'MakeID': 'make_id',
            'MakeName': 'make_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Model': {
            'ModelID': 'model_id',
            'ModelName': 'model_name',
            'VehicleTypeID': 'vehicle_type_id',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'SubModel': {
            'SubModelID': 'sub_model_id',
            'SubModelName': 'sub_model_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BaseVehicle': {
            'BaseVehicleID': 'base_vehicle_id',
            'MakeID': 'make_id',
            'ModelID': 'model_id',
            'YearID': 'year_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'DriveType': {
            'DriveTypeID': 'drive_type_id',
            'DriveTypeName': 'drive_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'FuelType': {
            'FuelTypeID': 'fuel_type_id',
            'FuelTypeName': 'fuel_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BodyNumDoors': {
            'BodyNumDoorsID': 'body_num_doors_id',
            'BodyNumDoors': 'body_num_doors',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BodyType': {
            'BodyTypeID': 'body_type_id',
            'BodyTypeName': 'body_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Region': {
            'RegionID': 'region_id',
            'RegionName': 'region_name',
            'ParentID': 'parent_id',
            'RegionAbbr': 'region_abbr',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'PublicationStage': {
            'PublicationStageID': 'publication_stage_id',
            'PublicationStageName': 'publication_stage_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Year': {
            'YearID': 'year_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BodyStyleConfig': {
            'BodyStyleConfigID': 'body_style_config_id',
            'BodyNumDoorsID': 'body_num_doors_id',
            'BodyTypeID': 'body_type_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineConfig': {
            'EngineConfigID': 'engine_config_id',
            'EngineDesignationID': 'engine_designation_id',
            'EngineVINID': 'engine_vin_id',
            'ValvesID': 'valves_id',
            'EngineBaseID': 'engine_base_id',
            'FuelDeliveryConfigID': 'fuel_delivery_config_id',
            'AspirationID': 'aspiration_id',
            'CylinderHeadTypeID': 'cylinder_head_type_id',
            'FuelTypeID': 'fuel_type_id',
            'IgnitionSystemTypeID': 'ignition_system_type_id',
            'EngineMfrID': 'engine_mfr_id',
            'EngineVersionID': 'engine_version_id',
            'PowerOutputID': 'power_output_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Vehicle': {
            'VehicleID': 'vehicle_id',
            'BaseVehicleID': 'base_vehicle_id',
            'SubModelID': 'sub_model_id',
            'RegionID': 'region_id',
            'Source': 'source',
            'PublicationStageID': 'publication_stage_id',
            'PublicationStageDate': 'publication_stage_date',
            'PublicationStageSource': 'publication_stage_source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToDriveType': {
            'VehicleToDriveTypeID': 'vehicle_to_drive_type_id',
            'VehicleID': 'vehicle_id',
            'DriveTypeID': 'drive_type_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToBodyStyleConfig': {
            'VehicleToBodyStyleConfigID': 'vehicle_to_body_style_config_id',
            'VehicleID': 'vehicle_id',
            'BodyStyleConfigID': 'body_style_config_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToEngineConfig': {
            'VehicleToEngineConfigID': 'vehicle_to_engine_config_id',
            'VehicleID': 'vehicle_id',
            'EngineConfigID': 'engine_config_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
    }
    
    mapping = field_mapping.get(table_name, {})
    
    for autocare_field, django_field in mapping.items():
        if autocare_field in data:
            value = data[autocare_field]
            
            # Handle null values first
            if value == 'null' or value is None:
                # Provide default values for required fields
                if django_field == 'source':
                    value = 'Unknown'
                else:
                    value = None
            # Handle datetime fields
            elif 'date_time' in django_field:
                value = parse_datetime(value)
            
            converted[django_field] = value
    
    return converted
