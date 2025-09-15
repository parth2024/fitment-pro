import pandas as pd
from django.core.exceptions import ValidationError


def validate_fitment_row(row, row_number):
    """Validate a single fitment row"""
    errors = {}
    repairs = {}
    is_valid = True
    can_repair = True
    
    # Required field validation
    required_fields = ['PartID', 'YearID', 'MakeName', 'ModelName', 'PTID']
    for field in required_fields:
        if pd.isna(row.get(field)) or str(row.get(field)).strip() == '':
            errors[field] = f'{field} is required'
            is_valid = False
            can_repair = False
    
    # Data type validation
    try:
        year = int(row.get('YearID', 0))
        if year < 1900 or year > 2030:
            errors['YearID'] = 'Year must be between 1900 and 2030'
            is_valid = False
    except (ValueError, TypeError):
        errors['YearID'] = 'Year must be a valid integer'
        is_valid = False
    
    try:
        quantity = int(row.get('Quantity', 1))
        if quantity <= 0:
            errors['Quantity'] = 'Quantity must be greater than 0'
            is_valid = False
    except (ValueError, TypeError):
        if not pd.isna(row.get('Quantity')):
            errors['Quantity'] = 'Quantity must be a valid integer'
            is_valid = False
    
    try:
        body_doors = int(row.get('BodyNumDoors', 4))
        if body_doors < 2 or body_doors > 8:
            errors['BodyNumDoors'] = 'Number of doors must be between 2 and 8'
            is_valid = False
    except (ValueError, TypeError):
        if not pd.isna(row.get('BodyNumDoors')):
            errors['BodyNumDoors'] = 'Number of doors must be a valid integer'
            is_valid = False
    
    try:
        position_id = int(row.get('PositionId', 1))
        if position_id < 1:
            errors['PositionId'] = 'Position ID must be greater than 0'
            is_valid = False
    except (ValueError, TypeError):
        if not pd.isna(row.get('PositionId')):
            errors['PositionId'] = 'Position ID must be a valid integer'
            is_valid = False
    
    # Auto-repair common issues
    if 'MakeName' in row and not errors.get('MakeName'):
        make = str(row.get('MakeName', '')).strip()
        # Auto-correct common misspellings
        make_corrections = {
            'ford': 'Ford',
            'chevrolet': 'Chevrolet', 
            'toyota': 'Toyota',
            'honda': 'Honda',
            'nissan': 'Nissan',
            'bmw': 'BMW',
            'mercedes': 'Mercedes-Benz',
            'audi': 'Audi',
            'volkswagen': 'Volkswagen',
            'hyundai': 'Hyundai',
            'kia': 'Kia',
            'mazda': 'Mazda',
            'subaru': 'Subaru',
            'lexus': 'Lexus',
            'infiniti': 'Infiniti',
            'acura': 'Acura',
            'cadillac': 'Cadillac',
            'lincoln': 'Lincoln',
            'jeep': 'Jeep',
            'dodge': 'Dodge',
            'chrysler': 'Chrysler',
            'ram': 'RAM',
            'gmc': 'GMC',
            'buick': 'Buick',
            'volvo': 'Volvo',
            'jaguar': 'Jaguar',
            'land rover': 'Land Rover',
            'porsche': 'Porsche',
            'tesla': 'Tesla',
            'genesis': 'Genesis',
            'alfa romeo': 'Alfa Romeo',
            'fiat': 'Fiat',
            'mini': 'MINI',
            'smart': 'Smart',
            'mitsubishi': 'Mitsubishi',
            'suzuki': 'Suzuki',
            'isuzu': 'Isuzu'
        }
        if make.lower() in make_corrections:
            repairs['MakeName'] = make_corrections[make.lower()]
    
    # Auto-repair common model issues
    if 'ModelName' in row and not errors.get('ModelName'):
        model = str(row.get('ModelName', '')).strip()
        # Remove extra spaces and fix common formatting
        if model != model.strip():
            repairs['ModelName'] = model.strip()
    
    # Auto-repair common position issues
    if 'Position' in row and not errors.get('Position'):
        position = str(row.get('Position', '')).strip()
        position_corrections = {
            'front': 'Front',
            'rear': 'Rear',
            'left': 'Left',
            'right': 'Right',
            'front left': 'Front Left',
            'front right': 'Front Right',
            'rear left': 'Rear Left',
            'rear right': 'Rear Right',
            'all': 'All'
        }
        if position.lower() in position_corrections:
            repairs['Position'] = position_corrections[position.lower()]
    
    # Auto-repair common wheel type issues
    if 'WheelType' in row and not errors.get('WheelType'):
        wheel_type = str(row.get('WheelType', '')).strip()
        wheel_type_corrections = {
            'alloy': 'Alloy',
            'steel': 'Steel',
            'chrome': 'Chrome',
            'black': 'Black',
            'oem': 'OEM'
        }
        if wheel_type.lower() in wheel_type_corrections:
            repairs['WheelType'] = wheel_type_corrections[wheel_type.lower()]
    
    # Auto-repair common fuel type issues
    if 'FuelTypeName' in row and not errors.get('FuelTypeName'):
        fuel_type = str(row.get('FuelTypeName', '')).strip()
        fuel_type_corrections = {
            'gas': 'Gas',
            'gasoline': 'Gas',
            'diesel': 'Diesel',
            'electric': 'Electric',
            'hybrid': 'Hybrid',
            'plug-in hybrid': 'Plug-in Hybrid',
            'flex fuel': 'Flex Fuel',
            'e85': 'E85'
        }
        if fuel_type.lower() in fuel_type_corrections:
            repairs['FuelTypeName'] = fuel_type_corrections[fuel_type.lower()]
    
    # Auto-repair common drive type issues
    if 'DriveTypeName' in row and not errors.get('DriveTypeName'):
        drive_type = str(row.get('DriveTypeName', '')).strip()
        drive_type_corrections = {
            'fwd': 'FWD',
            'rwd': 'RWD',
            'awd': 'AWD',
            '4wd': '4WD',
            '4x4': '4WD',
            'front wheel drive': 'FWD',
            'rear wheel drive': 'RWD',
            'all wheel drive': 'AWD',
            'four wheel drive': '4WD'
        }
        if drive_type.lower() in drive_type_corrections:
            repairs['DriveTypeName'] = drive_type_corrections[drive_type.lower()]
    
    return {
        'is_valid': is_valid and not errors,
        'can_repair': can_repair and not errors,
        'errors': errors,
        'repairs': repairs
    }
