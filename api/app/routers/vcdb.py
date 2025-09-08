from fastapi import APIRouter

router = APIRouter()

@router.get("/version")
async def get_version():
    """Get VCDB dataset version"""
    return "2024.1"

@router.get("/year-range")
async def get_year_range():
    """Get min/max years available"""
    return {"minYear": 2010, "maxYear": 2025}

@router.get("/property/{property_name}")
async def get_property(property_name: str):
    """Get VCDB property values"""
    # TODO: Implement actual property filtering
    return []

@router.get("/configurations")
async def get_configurations():
    """Get vehicle configurations"""
    # Sample configurations for demo
    sample_configs = [
        {
            "id": "cfg-1001",
            "vehicleId": "VH-2025-ACURA-ADX",
            "baseVehicleId": "BV-2025-ACURA-ADX",
            "year": 2025,
            "make": "Acura", 
            "model": "ADX",
            "submodel": "Advance",
            "driveType": "AWD",
            "fuelType": "Gas",
            "numDoors": 4,
            "bodyType": "Crossover"
        },
        {
            "id": "cfg-1002", 
            "vehicleId": "VH-2024-ACURA-ADX",
            "baseVehicleId": "BV-2024-ACURA-ADX",
            "year": 2024,
            "make": "Acura",
            "model": "ADX", 
            "submodel": "Advance",
            "driveType": "AWD",
            "fuelType": "Gas",
            "numDoors": 4,
            "bodyType": "Crossover"
        },
        {
            "id": "cfg-1003",
            "vehicleId": "VH-2024-TOYOTA-RAV4",
            "baseVehicleId": "BV-2024-TOYOTA-RAV4",
            "year": 2024,
            "make": "Toyota",
            "model": "RAV4",
            "submodel": "XLE", 
            "driveType": "AWD",
            "fuelType": "Gas",
            "numDoors": 4,
            "bodyType": "Crossover"
        },
        {
            "id": "cfg-1004",
            "vehicleId": "VH-2023-FORD-F150",
            "baseVehicleId": "BV-2023-FORD-F150",
            "year": 2023,
            "make": "Ford",
            "model": "F-150",
            "submodel": "XLT",
            "driveType": "4WD", 
            "fuelType": "Gas",
            "numDoors": 4,
            "bodyType": "Truck"
        },
        {
            "id": "cfg-1005",
            "vehicleId": "VH-2023-HONDA-CIVIC",
            "baseVehicleId": "BV-2023-HONDA-CIVIC", 
            "year": 2023,
            "make": "Honda",
            "model": "Civic",
            "submodel": "Si",
            "driveType": "FWD",
            "fuelType": "Gas", 
            "numDoors": 4,
            "bodyType": "Sedan"
        }
    ]
    
    return {
        "configurations": sample_configs,
        "totalCount": len(sample_configs)
    }