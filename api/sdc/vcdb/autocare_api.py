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
        """Make authenticated request to AutoCare API with pagination support"""
        if not self.ensure_authenticated():
            logger.error("Failed to authenticate with AutoCare API")
            return None
        
        url = f"{self.base_url}/{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        # Set up pagination parameters
        page_size = 1000
        page_number = 1
        all_data = []
        
        while True:
            # Add pagination parameters to the request
            request_params = params.copy() if params else {}
            request_params.update({
                'PageSize': page_size,
                'PageNumber': page_number
            })
            
            try:
                logger.info(f"Making request to: {url} (Page {page_number})")
                response = requests.get(url, headers=headers, params=request_params, timeout=60)
                response.raise_for_status()
                
                data = response.json()
                if isinstance(data, list):
                    # If we get an empty array, we've reached the end
                    if not data:
                        logger.info(f"Reached end of data for {endpoint} at page {page_number}")
                        break
                    
                    all_data.extend(data)
                    logger.info(f"Retrieved {len(data)} records from {endpoint} page {page_number} (Total: {len(all_data)})")
                    
                    # If we got fewer records than the page size, we've reached the end
                    if len(data) < page_size:
                        logger.info(f"Reached end of data for {endpoint} at page {page_number} (got {len(data)} < {page_size})")
                        break
                    
                    page_number += 1
                else:
                    logger.warning(f"Unexpected response format from {endpoint}: {type(data)}")
                    break
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed for {endpoint} page {page_number}: {str(e)}")
                return None
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON response from {endpoint} page {page_number}: {str(e)}")
                return None
            except Exception as e:
                logger.error(f"Unexpected error for {endpoint} page {page_number}: {str(e)}")
                return None
        
        logger.info(f"Retrieved total {len(all_data)} records from {endpoint}")
        return all_data
    
    def _make_request_paginated(self, endpoint: str, params: Optional[Dict] = None, callback=None):
        """Make paginated requests to AutoCare API and process each page with callback"""
        if not self.ensure_authenticated():
            logger.error("Failed to authenticate with AutoCare API")
            return False
        
        url = f"{self.base_url}/{endpoint}"
        headers = {
            'Authorization': f'Bearer {self.access_token}',
            'Content-Type': 'application/json'
        }
        
        # Set up pagination parameters
        page_size = 1000
        page_number = 1
        total_processed = 0
        
        while True:
            # Add pagination parameters to the request
            request_params = params.copy() if params else {}
            request_params.update({
                'PageSize': page_size,
                'PageNumber': page_number
            })
            
            try:
                logger.info(f"Making request to: {url} (Page {page_number})")
                response = requests.get(url, headers=headers, params=request_params, timeout=60)
                response.raise_for_status()
                
                data = response.json()
                if isinstance(data, list):
                    # If we get an empty array, we've reached the end
                    if not data:
                        logger.info(f"Reached end of data for {endpoint} at page {page_number}")
                        break
                    
                    # Process this page with the callback
                    if callback:
                        try:
                            processed = callback(data, page_number)
                            total_processed += processed
                            logger.info(f"Processed {processed} records from {endpoint} page {page_number} (Total: {total_processed})")
                        except Exception as e:
                            logger.error(f"Error processing {endpoint} page {page_number}: {str(e)}")
                            return False
                    
                    # If we got fewer records than the page size, we've reached the end
                    if len(data) < page_size:
                        logger.info(f"Reached end of data for {endpoint} at page {page_number} (got {len(data)} < {page_size})")
                        break
                    
                    page_number += 1
                else:
                    logger.warning(f"Unexpected response format from {endpoint}: {type(data)}")
                    break
                    
            except requests.exceptions.RequestException as e:
                logger.error(f"Request failed for {endpoint} page {page_number}: {str(e)}")
                return False
            except json.JSONDecodeError as e:
                logger.error(f"Invalid JSON response from {endpoint} page {page_number}: {str(e)}")
                return False
            except Exception as e:
                logger.error(f"Unexpected error for {endpoint} page {page_number}: {str(e)}")
                return False
        
        logger.info(f"Completed processing {endpoint}. Total records processed: {total_processed}")
        return True
    
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
    
    # Additional API methods for extended VCDB support
    def get_abbreviations(self) -> Optional[List[Dict]]:
        """Fetch all abbreviations from AutoCare API"""
        return self._make_request("Abbreviation")
    
    def get_aspirations(self) -> Optional[List[Dict]]:
        """Fetch all aspirations from AutoCare API"""
        return self._make_request("Aspiration")
    
    def get_bed_configs(self) -> Optional[List[Dict]]:
        """Fetch all bed configs from AutoCare API"""
        return self._make_request("BedConfig")
    
    def get_bed_lengths(self) -> Optional[List[Dict]]:
        """Fetch all bed lengths from AutoCare API"""
        return self._make_request("BedLength")
    
    def get_bed_types(self) -> Optional[List[Dict]]:
        """Fetch all bed types from AutoCare API"""
        return self._make_request("BedType")
    
    def get_brake_abs(self) -> Optional[List[Dict]]:
        """Fetch all brake ABS from AutoCare API"""
        return self._make_request("BrakeABS")
    
    def get_brake_configs(self) -> Optional[List[Dict]]:
        """Fetch all brake configs from AutoCare API"""
        return self._make_request("BrakeConfig")
    
    def get_brake_systems(self) -> Optional[List[Dict]]:
        """Fetch all brake systems from AutoCare API"""
        return self._make_request("BrakeSystem")
    
    def get_brake_types(self) -> Optional[List[Dict]]:
        """Fetch all brake types from AutoCare API"""
        return self._make_request("BrakeType")
    
    def get_classes(self) -> Optional[List[Dict]]:
        """Fetch all classes from AutoCare API"""
        return self._make_request("Class")
    
    def get_cylinder_head_types(self) -> Optional[List[Dict]]:
        """Fetch all cylinder head types from AutoCare API"""
        return self._make_request("CylinderHeadType")
    
    def get_elec_controlled(self) -> Optional[List[Dict]]:
        """Fetch all electronic controlled from AutoCare API"""
        return self._make_request("ElecControlled")
    
    def get_engine_bases(self) -> Optional[List[Dict]]:
        """Fetch all engine bases from AutoCare API"""
        return self._make_request("EngineBase")
    
    # Even more endpoints
    def get_engine_blocks(self) -> Optional[List[Dict]]:
        return self._make_request("EngineBlock")
    def get_engine_bore_strokes(self) -> Optional[List[Dict]]:
        return self._make_request("EngineBoreStroke")
    def get_engine_base2(self) -> Optional[List[Dict]]:
        return self._make_request("EngineBase2")
    def get_engine_designations(self) -> Optional[List[Dict]]:
        return self._make_request("EngineDesignation")
    def get_engine_vins(self) -> Optional[List[Dict]]:
        return self._make_request("EngineVIN")
    def get_engine_versions(self) -> Optional[List[Dict]]:
        return self._make_request("EngineVersion")
    def get_fuel_delivery_types(self) -> Optional[List[Dict]]:
        return self._make_request("FuelDeliveryType")
    def get_fuel_delivery_sub_types(self) -> Optional[List[Dict]]:
        return self._make_request("FuelDeliverySubType")
    def get_fuel_system_control_types(self) -> Optional[List[Dict]]:
        return self._make_request("FuelSystemControlType")
    def get_fuel_system_designs(self) -> Optional[List[Dict]]:
        return self._make_request("FuelSystemDesign")
    def get_ignition_system_types(self) -> Optional[List[Dict]]:
        return self._make_request("IgnitionSystemType")
    def get_mfrs(self) -> Optional[List[Dict]]:
        return self._make_request("Mfr")
    def get_mfr_body_codes(self) -> Optional[List[Dict]]:
        return self._make_request("MfrBodyCode")
    def get_power_outputs(self) -> Optional[List[Dict]]:
        return self._make_request("PowerOutput")
    def get_spring_types(self) -> Optional[List[Dict]]:
        return self._make_request("SpringType")
    def get_spring_type_configs(self) -> Optional[List[Dict]]:
        return self._make_request("SpringTypeConfig")
    def get_steering_types(self) -> Optional[List[Dict]]:
        return self._make_request("SteeringType")
    def get_steering_systems(self) -> Optional[List[Dict]]:
        return self._make_request("SteeringSystem")
    def get_steering_configs(self) -> Optional[List[Dict]]:
        return self._make_request("SteeringConfig")
    def get_transmission_types(self) -> Optional[List[Dict]]:
        return self._make_request("TransmissionType")
    def get_transmission_num_speeds(self) -> Optional[List[Dict]]:
        return self._make_request("TransmissionNumSpeeds")
    def get_transmission_control_types(self) -> Optional[List[Dict]]:
        return self._make_request("TransmissionControlType")
    def get_transmission_bases(self) -> Optional[List[Dict]]:
        return self._make_request("TransmissionBase")
    def get_transmission_mfr_codes(self) -> Optional[List[Dict]]:
        return self._make_request("TransmissionMfrCode")
    def get_transmissions(self) -> Optional[List[Dict]]:
        return self._make_request("Transmission")
    def get_valves(self) -> Optional[List[Dict]]:
        return self._make_request("Valves")
    def get_vehicle_type_groups(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleTypeGroup")
    def get_vehicle_types(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleType")
    def get_wheelbases(self) -> Optional[List[Dict]]:
        return self._make_request("WheelBase")
    # Vehicle-to-* relationships
    def get_vehicle_to_bed_configs(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToBedConfig")
    def get_vehicle_to_body_configs(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToBodyConfig")
    def get_vehicle_to_brake_configs(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToBrakeConfig")
    def get_vehicle_to_classes(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToClass")
    def get_vehicle_to_mfr_body_codes(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToMfrBodyCode")
    def get_vehicle_to_spring_type_configs(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToSpringTypeConfig")
    def get_vehicle_to_steering_configs(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToSteeringConfig")
    def get_vehicle_to_transmissions(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToTransmission")
    def get_vehicle_to_wheelbases(self) -> Optional[List[Dict]]:
        return self._make_request("VehicleToWheelbase")
    
    def get_all_data(self) -> Dict[str, Optional[List[Dict]]]:
        """Fetch all VCDB data from AutoCare API"""
        logger.info("Starting comprehensive VCDB data fetch...")
        
        data = {
            # Original VCDB tables
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
            
            # Additional VCDB tables
            'abbreviations': self.get_abbreviations(),
            'aspirations': self.get_aspirations(),
            'bed_configs': self.get_bed_configs(),
            'bed_lengths': self.get_bed_lengths(),
            'bed_types': self.get_bed_types(),
            'brake_abs': self.get_brake_abs(),
            'brake_configs': self.get_brake_configs(),
            'brake_systems': self.get_brake_systems(),
            'brake_types': self.get_brake_types(),
            'classes': self.get_classes(),
            'cylinder_head_types': self.get_cylinder_head_types(),
            'elec_controlled': self.get_elec_controlled(),
            'engine_bases': self.get_engine_bases(),
            'engine_blocks': self.get_engine_blocks(),
            'engine_bore_strokes': self.get_engine_bore_strokes(),
            'engine_base2': self.get_engine_base2(),
            'engine_designations': self.get_engine_designations(),
            'engine_vins': self.get_engine_vins(),
            'engine_versions': self.get_engine_versions(),
            'fuel_delivery_types': self.get_fuel_delivery_types(),
            'fuel_delivery_sub_types': self.get_fuel_delivery_sub_types(),
            'fuel_system_control_types': self.get_fuel_system_control_types(),
            'fuel_system_designs': self.get_fuel_system_designs(),
            'ignition_system_types': self.get_ignition_system_types(),
            'mfrs': self.get_mfrs(),
            'mfr_body_codes': self.get_mfr_body_codes(),
            'power_outputs': self.get_power_outputs(),
            'spring_types': self.get_spring_types(),
            'spring_type_configs': self.get_spring_type_configs(),
            'steering_types': self.get_steering_types(),
            'steering_systems': self.get_steering_systems(),
            'steering_configs': self.get_steering_configs(),
            'transmission_types': self.get_transmission_types(),
            'transmission_num_speeds': self.get_transmission_num_speeds(),
            'transmission_control_types': self.get_transmission_control_types(),
            'transmission_bases': self.get_transmission_bases(),
            'transmission_mfr_codes': self.get_transmission_mfr_codes(),
            'transmissions': self.get_transmissions(),
            'valves': self.get_valves(),
            'vehicle_type_groups': self.get_vehicle_type_groups(),
            'vehicle_types': self.get_vehicle_types(),
            'wheelbases': self.get_wheelbases(),
            'vehicle_to_bed_configs': self.get_vehicle_to_bed_configs(),
            'vehicle_to_body_configs': self.get_vehicle_to_body_configs(),
            'vehicle_to_brake_configs': self.get_vehicle_to_brake_configs(),
            'vehicle_to_classes': self.get_vehicle_to_classes(),
            'vehicle_to_mfr_body_codes': self.get_vehicle_to_mfr_body_codes(),
            'vehicle_to_spring_type_configs': self.get_vehicle_to_spring_type_configs(),
            'vehicle_to_steering_configs': self.get_vehicle_to_steering_configs(),
            'vehicle_to_transmissions': self.get_vehicle_to_transmissions(),
            'vehicle_to_wheelbases': self.get_vehicle_to_wheelbases(),
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
        # Additional VCDB table mappings
        'Abbreviation': {
            'Abbreviation': 'abbreviation',
            'Description': 'description',
            'LongDescription': 'long_description',
        },
        'Aspiration': {
            'AspirationID': 'aspiration_id',
            'AspirationName': 'aspiration_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BedConfig': {
            'BedConfigID': 'bed_config_id',
            'BedLengthID': 'bed_length_id',
            'BedTypeID': 'bed_type_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BedLength': {
            'BedLengthID': 'bed_length_id',
            'BedLength': 'bed_length',
            'BedLengthMetric': 'bed_length_metric',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BedType': {
            'BedTypeID': 'bed_type_id',
            'BedTypeName': 'bed_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BrakeABS': {
            'BrakeABSID': 'brake_abs_id',
            'BrakeABSName': 'brake_abs_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BrakeConfig': {
            'BrakeConfigID': 'brake_config_id',
            'FrontBrakeTypeID': 'front_brake_type_id',
            'RearBrakeTypeID': 'rear_brake_type_id',
            'BrakeSystemID': 'brake_system_id',
            'BrakeABSID': 'brake_abs_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BrakeSystem': {
            'BrakeSystemID': 'brake_system_id',
            'BrakeSystemName': 'brake_system_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'BrakeType': {
            'BrakeTypeID': 'brake_type_id',
            'BrakeTypeName': 'brake_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Class': {
            'ClassID': 'class_id',
            'ClassName': 'class_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'CylinderHeadType': {
            'CylinderHeadTypeID': 'cylinder_head_type_id',
            'CylinderHeadTypeName': 'cylinder_head_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'ElecControlled': {
            'ElecControlledID': 'elec_controlled_id',
            'ElecControlled': 'elec_controlled',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineBase': {
            'EngineBaseID': 'engine_base_id',
            'Liter': 'liter',
            'CC': 'cc',
            'CID': 'cid',
            'Cylinders': 'cylinders',
            'BlockType': 'block_type',
            'EngBoreIn': 'eng_bore_in',
            'EngBoreMetric': 'eng_bore_metric',
            'EngStrokeIn': 'eng_stroke_in',
            'EngStrokeMetric': 'eng_stroke_metric',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineBlock': {
            'EngineBlockID': 'engine_block_id',
            'Liter': 'liter',
            'CC': 'cc',
            'CID': 'cid',
            'Cylinders': 'cylinders',
            'BlockType': 'block_type',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineBoreStroke': {
            'EngineBoreStrokeID': 'engine_bore_stroke_id',
            'EngBoreIn': 'eng_bore_in',
            'EngBoreMetric': 'eng_bore_metric',
            'EngStrokeIn': 'eng_stroke_in',
            'EngStrokeMetric': 'eng_stroke_metric',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineBase2': {
            'EngineBaseID': 'engine_base_id',
            'EngineBlockID': 'engine_block_id',
            'EngineBoreStrokeID': 'engine_bore_stroke_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineDesignation': {
            'EngineDesignationID': 'engine_designation_id',
            'EngineDesignationName': 'engine_designation_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineVIN': {
            'EngineVINID': 'engine_vin_id',
            'EngineVINName': 'engine_vin_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'EngineVersion': {
            'EngineVersionID': 'engine_version_id',
            'EngineVersion': 'engine_version',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'FuelDeliveryType': {
            'FuelDeliveryTypeID': 'fuel_delivery_type_id',
            'FuelDeliveryTypeName': 'fuel_delivery_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'FuelDeliverySubType': {
            'FuelDeliverySubTypeID': 'fuel_delivery_sub_type_id',
            'FuelDeliverySubTypeName': 'fuel_delivery_sub_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'FuelSystemControlType': {
            'FuelSystemControlTypeID': 'fuel_system_control_type_id',
            'FuelSystemControlTypeName': 'fuel_system_control_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'FuelSystemDesign': {
            'FuelSystemDesignID': 'fuel_system_design_id',
            'FuelSystemDesignName': 'fuel_system_design_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'IgnitionSystemType': {
            'IgnitionSystemTypeID': 'ignition_system_type_id',
            'IgnitionSystemTypeName': 'ignition_system_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Mfr': {
            'MfrID': 'mfr_id',
            'MfrName': 'mfr_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'MfrBodyCode': {
            'MfrBodyCodeID': 'mfr_body_code_id',
            'MfrBodyCodeName': 'mfr_body_code_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'PowerOutput': {
            'PowerOutputID': 'power_output_id',
            'HorsePower': 'horse_power',
            'KilowattPower': 'kilowatt_power',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'SpringType': {
            'SpringTypeID': 'spring_type_id',
            'SpringTypeName': 'spring_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'SpringTypeConfig': {
            'SpringTypeConfigID': 'spring_type_config_id',
            'FrontSpringTypeID': 'front_spring_type_id',
            'RearSpringTypeID': 'rear_spring_type_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'SteeringType': {
            'SteeringTypeID': 'steering_type_id',
            'SteeringTypeName': 'steering_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'SteeringSystem': {
            'SteeringSystemID': 'steering_system_id',
            'SteeringSystemName': 'steering_system_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'SteeringConfig': {
            'SteeringConfigID': 'steering_config_id',
            'SteeringTypeID': 'steering_type_id',
            'SteeringSystemID': 'steering_system_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'TransmissionType': {
            'TransmissionTypeID': 'transmission_type_id',
            'TransmissionTypeName': 'transmission_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'TransmissionNumSpeeds': {
            'TransmissionNumSpeedsID': 'transmission_num_speeds_id',
            'TransmissionNumSpeeds': 'transmission_num_speeds',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'TransmissionControlType': {
            'TransmissionControlTypeID': 'transmission_control_type_id',
            'TransmissionControlTypeName': 'transmission_control_type_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'TransmissionBase': {
            'TransmissionBaseID': 'transmission_base_id',
            'TransmissionTypeID': 'transmission_type_id',
            'TransmissionNumSpeedsID': 'transmission_num_speeds_id',
            'TransmissionControlTypeID': 'transmission_control_type_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'TransmissionMfrCode': {
            'TransmissionMfrCodeID': 'transmission_mfr_code_id',
            'TransmissionMfrCode': 'transmission_mfr_code',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Transmission': {
            'TransmissionID': 'transmission_id',
            'TransmissionBaseID': 'transmission_base_id',
            'TransmissionMfrCodeID': 'transmission_mfr_code_id',
            'TransmissionElecControlledID': 'transmission_elec_controlled_id',
            'TransmissionMfrID': 'transmission_mfr_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'Valves': {
            'ValvesID': 'valves_id',
            'ValvesPerEngine': 'valves_per_engine',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleTypeGroup': {
            'VehicleTypeGroupID': 'vehicle_type_group_id',
            'VehicleTypeGroupName': 'vehicle_type_group_name',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleType': {
            'VehicleTypeID': 'vehicle_type_id',
            'VehicleTypeName': 'vehicle_type_name',
            'VehicleTypeGroupID': 'vehicle_type_group_id',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'WheelBase': {
            'WheelBaseID': 'wheel_base_id',
            'WheelBase': 'wheel_base',
            'WheelBaseMetric': 'wheel_base_metric',
            'Source': 'source',
            'CultureID': 'culture_id',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToBedConfig': {
            'VehicleToBedConfigID': 'vehicle_to_bed_config_id',
            'VehicleID': 'vehicle_id',
            'BedConfigID': 'bed_config_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToBodyConfig': {
            'VehicleToBodyConfigID': 'vehicle_to_body_config_id',
            'VehicleID': 'vehicle_id',
            'BodyStyleConfigID': 'body_style_config_id',
            'BedConfigID': 'bed_config_id',
            'MfrBodyCodeID': 'mfr_body_code_id',
            'WheelBaseID': 'wheelbase_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToBrakeConfig': {
            'VehicleToBrakeConfigID': 'vehicle_to_brake_config_id',
            'VehicleID': 'vehicle_id',
            'BrakeConfigID': 'brake_config_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToClass': {
            'VehicleToClassID': 'vehicle_to_class_id',
            'VehicleID': 'vehicle_id',
            'ClassID': 'class_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToMfrBodyCode': {
            'VehicleToMfrBodyCodeID': 'vehicle_to_mfr_body_code_id',
            'VehicleID': 'vehicle_id',
            'MfrBodyCodeID': 'mfr_body_code_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToSpringTypeConfig': {
            'VehicleToSpringTypeConfigID': 'vehicle_to_spring_type_config_id',
            'VehicleID': 'vehicle_id',
            'SpringTypeConfigID': 'spring_type_config_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToSteeringConfig': {
            'VehicleToSteeringConfigID': 'vehicle_to_steering_config_id',
            'VehicleID': 'vehicle_id',
            'SteeringConfigID': 'steering_config_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToTransmission': {
            'VehicleToTransmissionID': 'vehicle_to_transmission_id',
            'VehicleID': 'vehicle_id',
            'TransmissionID': 'transmission_id',
            'Source': 'source',
            'EffectiveDateTime': 'effective_date_time',
            'EndDateTime': 'end_date_time',
        },
        'VehicleToWheelbase': {
            'VehicleToWheelbaseID': 'vehicle_to_wheelbase_id',
            'VehicleID': 'vehicle_id',
            'WheelbaseID': 'wheelbase_id',
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
