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
    # TODO: Implement actual configuration filtering
    return {"configurations": [], "totalCount": 0}