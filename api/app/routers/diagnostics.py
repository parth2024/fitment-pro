from fastapi import APIRouter, HTTPException
from ..config import settings
import datetime

router = APIRouter()

@router.get("/ping")
async def ping():
    """Health check endpoint"""
    return "pong"

@router.get("/healthy")
async def healthy():
    """Database connectivity check"""
    # TODO: Add actual database connectivity check
    return {"status": "ok", "timestamp": datetime.datetime.now().isoformat()}

@router.get("/metrics")
async def metrics():
    """System metrics"""
    # TODO: Add actual metrics from database
    return {
        "parts": 0,
        "fitments": 0,
        "covered": 0,
        "uncovered": 0
    }

@router.get("/api/version")
async def version():
    """API version information"""
    return {
        "version": settings.APP_VERSION,
        "buildDate": datetime.datetime.now().isoformat()
    }