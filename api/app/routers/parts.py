from fastapi import APIRouter

router = APIRouter()

@router.get("/")
async def get_parts():
    """Get parts list"""
    # TODO: Implement actual parts fetching
    return []

@router.get("/types")
async def get_part_types():
    """Get part types"""
    # TODO: Implement actual part types fetching
    return []