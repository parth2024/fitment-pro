#!/bin/bash

# Start Celery Beat Scheduler for VCDB quarterly sync
# This script should be run as a separate process from the main Celery worker

echo "Starting Celery Beat Scheduler for VCDB quarterly sync..."

# Change to the Django project directory
cd /Users/parthkanpariya/Documents/ridefox/DraftyVillainousWatchdog/api/sdc

# Activate virtual environment if it exists
if [ -d "../my_env" ]; then
    source ../my_env/bin/activate
    echo "Virtual environment activated"
fi

# Start Celery Beat
celery -A sdc beat --loglevel=info

echo "Celery Beat Scheduler started"
