import pandas as pd
import json
import logging
from typing import List, Dict, Any, Tuple
from django.core.exceptions import ValidationError

logger = logging.getLogger(__name__)


class FileParser:
    """Utility class for parsing different file formats"""
    
    @staticmethod
    def parse_file(file_path: str, filename: str) -> pd.DataFrame:
        """
        Parse a file based on its extension and return a DataFrame
        
        Args:
            file_path: Path to the file
            filename: Name of the file (used to determine format)
            
        Returns:
            pandas.DataFrame: Parsed data
            
        Raises:
            ValidationError: If file cannot be parsed
        """
        try:
            file_ext = filename.lower().split('.')[-1]
            
            if file_ext == 'csv':
                return FileParser._parse_csv(file_path)
            elif file_ext in ['xlsx', 'xls']:
                return FileParser._parse_excel(file_path, file_ext)
            elif file_ext == 'json':
                return FileParser._parse_json(file_path)
            else:
                raise ValidationError(f"Unsupported file format: {file_ext}")
                
        except Exception as e:
            logger.error(f"Error parsing file {filename}: {str(e)}")
            raise ValidationError(f"Failed to parse file: {str(e)}")
    
    @staticmethod
    def _parse_csv(file_path: str) -> pd.DataFrame:
        """Parse CSV file with multiple fallback strategies"""
        try:
            # Try different CSV reading approaches
            try:
                return pd.read_csv(file_path)
            except pd.errors.ParserError:
                try:
                    return pd.read_csv(file_path, sep=';')
                except pd.errors.ParserError:
                    try:
                        return pd.read_csv(file_path, sep='\t')
                    except pd.errors.ParserError:
                        try:
                            return pd.read_csv(file_path, error_bad_lines=False, warn_bad_lines=True)
                        except:
                            return pd.read_csv(file_path, low_memory=False)
        except Exception as e:
            raise ValidationError(f"CSV parsing failed: {str(e)}")
    
    @staticmethod
    def _parse_excel(file_path: str, file_ext: str) -> pd.DataFrame:
        """Parse Excel file"""
        try:
            if file_ext == 'xlsx':
                return pd.read_excel(file_path, engine='openpyxl')
            elif file_ext == 'xls':
                return pd.read_excel(file_path, engine='xlrd')
            else:
                raise ValidationError(f"Unsupported Excel format: {file_ext}")
        except Exception as e:
            raise ValidationError(f"Excel parsing failed: {str(e)}")
    
    @staticmethod
    def _parse_json(file_path: str) -> pd.DataFrame:
        """Parse JSON file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            if isinstance(data, list):
                return pd.DataFrame(data)
            elif isinstance(data, dict):
                return pd.DataFrame([data])
            else:
                raise ValidationError("JSON must be an array of objects or a single object")
        except Exception as e:
            raise ValidationError(f"JSON parsing failed: {str(e)}")


class VCDBValidator:
    """Validator for VCDB data"""
    
    REQUIRED_FIELDS = ['year', 'make', 'model']
    OPTIONAL_FIELDS = ['submodel', 'driveType', 'fuelType', 'numDoors', 'bodyType']
    
    @classmethod
    def validate_data(cls, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Validate VCDB data structure
        
        Args:
            df: DataFrame containing VCDB data
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        
        # Check if DataFrame is empty
        if df.empty:
            errors.append("VCDB data is empty")
            return False, errors
        
        # Check required columns (case-insensitive)
        df_columns_lower = [col.lower() for col in df.columns]
        missing_required = []
        
        for field in cls.REQUIRED_FIELDS:
            if field.lower() not in df_columns_lower:
                missing_required.append(field)
        
        if missing_required:
            errors.append(f"Missing required columns: {', '.join(missing_required)}")
        
        # Validate data types and values
        for _, row in df.iterrows():
            # Check year
            if 'year' in df.columns:
                try:
                    year_val = row['year']
                    if pd.isna(year_val) or not isinstance(year_val, (int, float)) or year_val < 1900 or year_val > 2030:
                        errors.append(f"Invalid year value: {year_val}")
                except:
                    errors.append(f"Invalid year value: {row.get('year')}")
            
            # Check make and model
            for field in ['make', 'model']:
                if field in df.columns:
                    val = row.get(field)
                    if pd.isna(val) or not isinstance(val, str) or len(str(val).strip()) == 0:
                        errors.append(f"Invalid {field} value: {val}")
        
        return len(errors) == 0, errors
    
    @classmethod
    def normalize_dataframe(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize VCDB DataFrame column names and data
        
        Args:
            df: Raw DataFrame
            
        Returns:
            Normalized DataFrame
        """
        # Create a copy to avoid modifying original
        normalized_df = df.copy()
        
        # Normalize column names (case-insensitive mapping)
        column_mapping = {}
        df_columns_lower = [col.lower() for col in normalized_df.columns]
        
        # Map common variations to standard names
        mappings = {
            'year': ['year', 'yr', 'model_year'],
            'make': ['make', 'manufacturer', 'brand'],
            'model': ['model', 'model_name', 'vehicle_model'],
            'submodel': ['submodel', 'sub_model', 'trim', 'trim_level'],
            'drivetype': ['drive_type', 'drivetype', 'drivetrain', 'drive'],
            'fueltype': ['fuel_type', 'fueltype', 'fuel'],
            'numdoors': ['num_doors', 'numdoors', 'doors', 'door_count'],
            'bodytype': ['body_type', 'bodytype', 'body']
        }
        
        for standard_name, variations in mappings.items():
            for variation in variations:
                if variation.lower() in df_columns_lower:
                    original_col = normalized_df.columns[df_columns_lower.index(variation.lower())]
                    column_mapping[original_col] = standard_name
                    break
        
        # Apply column mapping
        if column_mapping:
            normalized_df = normalized_df.rename(columns=column_mapping)
        
        # Clean and normalize data
        for col in normalized_df.columns:
            if col in ['make', 'model', 'submodel', 'bodytype']:
                # Clean string fields
                normalized_df[col] = normalized_df[col].astype(str).str.strip()
            elif col == 'year':
                # Ensure year is integer
                normalized_df[col] = pd.to_numeric(normalized_df[col], errors='coerce').astype('Int64')
            elif col == 'numdoors':
                # Ensure num_doors is integer
                normalized_df[col] = pd.to_numeric(normalized_df[col], errors='coerce').astype('Int64')
        
        return normalized_df


class ProductValidator:
    """Validator for Product data"""
    
    REQUIRED_FIELDS = ['id', 'description']
    OPTIONAL_FIELDS = ['category', 'partType', 'compatibility', 'specifications']
    
    @classmethod
    def validate_data(cls, df: pd.DataFrame) -> Tuple[bool, List[str]]:
        """
        Validate Product data structure
        
        Args:
            df: DataFrame containing Product data
            
        Returns:
            Tuple of (is_valid, error_messages)
        """
        errors = []
        
        # Check if DataFrame is empty
        if df.empty:
            errors.append("Product data is empty")
            return False, errors
        
        # Check required columns (case-insensitive)
        df_columns_lower = [col.lower() for col in df.columns]
        missing_required = []
        
        for field in cls.REQUIRED_FIELDS:
            if field.lower() not in df_columns_lower:
                missing_required.append(field)
        
        if missing_required:
            errors.append(f"Missing required columns: {', '.join(missing_required)}")
        
        # Validate data types and values
        for _, row in df.iterrows():
            # Check id
            if 'id' in df.columns:
                val = row.get('id')
                if pd.isna(val) or not isinstance(val, str) or len(str(val).strip()) == 0:
                    errors.append(f"Invalid id value: {val}")
            
            # Check description
            if 'description' in df.columns:
                val = row.get('description')
                if pd.isna(val) or not isinstance(val, str) or len(str(val).strip()) == 0:
                    errors.append(f"Invalid description value: {val}")
        
        return len(errors) == 0, errors
    
    @classmethod
    def normalize_dataframe(cls, df: pd.DataFrame) -> pd.DataFrame:
        """
        Normalize Product DataFrame column names and data
        
        Args:
            df: Raw DataFrame
            
        Returns:
            Normalized DataFrame
        """
        # Create a copy to avoid modifying original
        normalized_df = df.copy()
        
        # Normalize column names (case-insensitive mapping)
        column_mapping = {}
        df_columns_lower = [col.lower() for col in normalized_df.columns]
        
        # Map common variations to standard names
        mappings = {
            'id': ['id', 'part_id', 'partid', 'sku', 'part_number'],
            'description': ['description', 'desc', 'name', 'part_name'],
            'category': ['category', 'cat', 'part_category'],
            'parttype': ['part_type', 'parttype', 'type', 'part_type'],
            'compatibility': ['compatibility', 'comp', 'fitment'],
            'specifications': ['specifications', 'specs', 'spec', 'details']
        }
        
        for standard_name, variations in mappings.items():
            for variation in variations:
                if variation.lower() in df_columns_lower:
                    original_col = normalized_df.columns[df_columns_lower.index(variation.lower())]
                    column_mapping[original_col] = standard_name
                    break
        
        # Apply column mapping
        if column_mapping:
            normalized_df = normalized_df.rename(columns=column_mapping)
        
        # Clean and normalize data
        for col in normalized_df.columns:
            if col in ['id', 'description', 'category', 'parttype', 'compatibility']:
                # Clean string fields
                normalized_df[col] = normalized_df[col].astype(str).str.strip()
            elif col == 'specifications':
                # Handle specifications - could be JSON string or dict
                normalized_df[col] = normalized_df[col].apply(cls._normalize_specifications)
        
        return normalized_df
    
    @staticmethod
    def _normalize_specifications(value):
        """Normalize specifications field"""
        if pd.isna(value):
            return {}
        
        if isinstance(value, dict):
            return value
        elif isinstance(value, str):
            try:
                # Try to parse as JSON
                return json.loads(value)
            except:
                # If not JSON, return as string
                return value
        else:
            return str(value)


class DataProcessor:
    """Process and store parsed data into database models"""
    
    @staticmethod
    def process_vcdb_data(df: pd.DataFrame, session_id: str) -> Tuple[int, List[str]]:
        """
        Process VCDB data and store in database
        
        Args:
            df: Normalized VCDB DataFrame
            session_id: Session ID for tracking
            
        Returns:
            Tuple of (records_created, error_messages)
        """
        from .models import VCDBData
        
        errors = []
        created_count = 0
        
        try:
            # Clear existing data for this session (if any)
            # Note: In a real implementation, you might want to track which data belongs to which session
            
            for _, row in df.iterrows():
                try:
                    # Create or update VCDB record
                    vcdb_record, created = VCDBData.objects.update_or_create(
                        year=row.get('year'),
                        make=row.get('make'),
                        model=row.get('model'),
                        submodel=row.get('submodel', ''),
                        drive_type=row.get('drivetype', ''),
                        defaults={
                            'fuel_type': row.get('fueltype', ''),
                            'num_doors': row.get('numdoors'),
                            'body_type': row.get('bodytype', ''),
                            'engine_type': row.get('engine_type', ''),
                            'transmission': row.get('transmission', ''),
                            'trim_level': row.get('trim_level', ''),
                        }
                    )
                    
                    if created:
                        created_count += 1
                        
                except Exception as e:
                    error_msg = f"Error creating VCDB record for row {row.get('make', '')} {row.get('model', '')}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            logger.info(f"Processed {created_count} VCDB records")
            
        except Exception as e:
            error_msg = f"Error processing VCDB data: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        return created_count, errors
    
    @staticmethod
    def process_product_data(df: pd.DataFrame, session_id: str) -> Tuple[int, List[str]]:
        """
        Process Product data and store in database
        
        Args:
            df: Normalized Product DataFrame
            session_id: Session ID for tracking
            
        Returns:
            Tuple of (records_created, error_messages)
        """
        from .models import ProductData
        
        errors = []
        created_count = 0
        
        try:
            # Clear existing data for this session (if any)
            # Note: In a real implementation, you might want to track which data belongs to which session
            
            for _, row in df.iterrows():
                try:
                    # Create or update Product record
                    product_record, created = ProductData.objects.update_or_create(
                        part_id=row.get('id'),
                        defaults={
                            'description': row.get('description'),
                            'category': row.get('category', ''),
                            'part_type': row.get('parttype', ''),
                            'compatibility': row.get('compatibility', ''),
                            'specifications': row.get('specifications', {}),
                            'brand': row.get('brand', ''),
                            'sku': row.get('sku', ''),
                            'price': row.get('price'),
                            'weight': row.get('weight'),
                            'dimensions': row.get('dimensions', ''),
                        }
                    )
                    
                    if created:
                        created_count += 1
                        
                except Exception as e:
                    error_msg = f"Error creating Product record for {row.get('id', '')}: {str(e)}"
                    errors.append(error_msg)
                    logger.error(error_msg)
            
            logger.info(f"Processed {created_count} Product records")
            
        except Exception as e:
            error_msg = f"Error processing Product data: {str(e)}"
            errors.append(error_msg)
            logger.error(error_msg)
        
        return created_count, errors
