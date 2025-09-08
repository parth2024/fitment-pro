from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_parts():
    """Get parts list"""
    # Sample parts for demo
    sample_parts = [
        {
            "id": "P-12345",
            "hash": "HASH-P-12345",
            "description": "Premium Brake Pad Set",
            "unitOfMeasure": "SET",
            "itemStatus": 0
        },
        {
            "id": "P-67890", 
            "hash": "HASH-P-67890",
            "description": "Performance Air Filter",
            "unitOfMeasure": "EA",
            "itemStatus": 0
        },
        {
            "id": "P-11111",
            "hash": "HASH-P-11111", 
            "description": "Oil Filter Assembly",
            "unitOfMeasure": "EA",
            "itemStatus": 1
        },
        {
            "id": "P-22222",
            "hash": "HASH-P-22222",
            "description": "Wheel Spacer Kit 20mm",
            "unitOfMeasure": "KIT", 
            "itemStatus": 0
        },
        {
            "id": "P-33333",
            "hash": "HASH-P-33333",
            "description": "Cold Air Intake System",
            "unitOfMeasure": "SYS",
            "itemStatus": 0
        }
    ]
    
    return sample_parts

@router.get("/types")
async def get_part_types():
    """Get part types"""
    # Sample part types for demo
    sample_part_types = [
        {
            "id": "PT-22",
            "description": "Brake Pads",
            "partPositionIds": [1, 2]
        },
        {
            "id": "PT-33", 
            "description": "Air Filters",
            "partPositionIds": [5]
        },
        {
            "id": "PT-44",
            "description": "Oil Filters", 
            "partPositionIds": [6]
        },
        {
            "id": "PT-55",
            "description": "Wheel Spacers",
            "partPositionIds": [3, 4, 7, 8]
        },
        {
            "id": "PT-66",
            "description": "Intake Systems",
            "partPositionIds": [5]
        }
    ]
    
    return sample_part_types