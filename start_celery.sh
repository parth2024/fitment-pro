#!/bin/bash

# Start Redis server
echo "🚀 Starting Redis server..."
redis-server --daemonize yes

# Start Celery worker
echo "🚀 Starting Celery worker..."
cd api/sdc
/Users/parthkanpariya/Documents/ridefox/DraftyVillainousWatchdog/my_env/bin/python -m celery -A sdc worker --loglevel=info --concurrency=1 &

echo "✅ Celery services started!"
echo "📊 Redis: localhost:6379"
echo "👷 Celery Worker: Running in background"
echo ""
echo "To stop services:"
echo "  pkill -f 'celery.*sdc'"
echo "  pkill redis-server"
