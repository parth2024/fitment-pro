from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os
from pathlib import Path

from .routers import diagnostics, vcdb, parts, fitments, potential, admin
from .config import settings

app = FastAPI(
    title="Mass Fitment Tool API",
    description="API for managing automotive parts fitments",
    version=settings.APP_VERSION,
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, specify exact origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# API routes
app.include_router(diagnostics.router)
app.include_router(vcdb.router, prefix="/api/vcdb", tags=["VCDB"])
app.include_router(parts.router, prefix="/api/parts", tags=["Parts"])
app.include_router(fitments.router, prefix="/api/fitments", tags=["Fitments"])
app.include_router(potential.router, prefix="/api/potential-fitments", tags=["Potential"])
app.include_router(admin.router, prefix="/api/azure", tags=["Admin"])

# Serve frontend static files
if os.path.exists("web/dist"):
    app.mount("/static", StaticFiles(directory="web/dist/assets"), name="static")
    
    @app.get("/{full_path:path}")
    async def serve_spa(full_path: str):
        """Serve the React SPA"""
        if full_path.startswith("api/"):
            raise HTTPException(status_code=404, detail="API route not found")
        
        static_file = Path("web/dist") / full_path
        if static_file.exists() and static_file.is_file():
            return FileResponse(static_file)
        
        # Fallback to index.html for SPA routing
        return FileResponse("web/dist/index.html")

@app.get("/")
async def root():
    """Root endpoint - serve frontend or API info"""
    if os.path.exists("web/dist/index.html"):
        return FileResponse("web/dist/index.html")
    return {"message": "Mass Fitment Tool API", "version": settings.APP_VERSION}