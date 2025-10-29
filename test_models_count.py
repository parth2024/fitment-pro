#!/usr/bin/env python3
"""
Test to see how many models we should have vs what we have
"""

import os
import sys
import django
from pathlib import Path

# Add the Django project to the Python path
project_root = Path(__file__).parent / "api" / "sdc"
sys.path.insert(0, str(project_root))

# Set up Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'sdc.settings')
django.setup()

from vcdb.autocare_api import AutoCareAPIClient
from vcdb.models import Model
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def test_models_count():
    """Test how many models we should have vs what we have"""
    client = AutoCareAPIClient()
    
    # Get models from API
    logger.info("Fetching models from AutoCare API...")
    api_models = client.get_models()
    
    if api_models:
        logger.info(f"API returned {len(api_models)} models")
        
        # Get models from database
        db_models = Model.objects.count()
        logger.info(f"Database has {db_models} models")
        
        if len(api_models) > db_models:
            logger.info(f"✅ API has more models ({len(api_models)}) than database ({db_models})")
            logger.info("The streaming sync should add more models")
        else:
            logger.info(f"⚠️  API and database have similar counts")
    else:
        logger.error("Failed to fetch models from API")

if __name__ == "__main__":
    test_models_count()
