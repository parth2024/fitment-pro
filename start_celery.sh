#!/bin/bash

# Kill any existing Celery processes
echo "🧹 Cleaning up existing Celery processes..."
pkill -f 'celery.*sdc' 2>/dev/null || true
pkill -f 'redis-server' 2>/dev/null || true
sleep 2

# Start Redis server
echo "🚀 Starting Redis server..."
redis-server --daemonize yes
sleep 2

# Test Redis connection
echo "🔍 Testing Redis connection..."
redis-cli ping > /dev/null 2>&1
if [ $? -eq 0 ]; then
    echo "✅ Redis is running"
else
    echo "❌ Redis connection failed"
    exit 1
fi

# Start Celery worker with improved settings
echo "🚀 Starting Celery worker..."
cd api/sdc
/Users/parthkanpariya/Documents/ridefox/DraftyVillainousWatchdog/my_env/bin/python -m celery -A sdc worker \
    --loglevel=info \
    --concurrency=2 \
    --prefetch-multiplier=1 \
    --max-tasks-per-child=50 \
    --without-gossip \
    --without-mingle \
    --without-heartbeat \
    --pool=prefork \
    --queues=default &

# Wait a moment for worker to start
sleep 3

# Test Celery worker
echo "🔍 Testing Celery worker..."
/Users/parthkanpariya/Documents/ridefox/DraftyVillainousWatchdog/my_env/bin/python -c "
from celery import Celery
app = Celery('sdc')
app.config_from_object('django.conf:settings', namespace='CELERY')
try:
    stats = app.control.inspect().stats()
    if stats:
        print('✅ Celery worker is running')
    else:
        print('❌ Celery worker not responding')
except Exception as e:
    print(f'❌ Celery worker test failed: {e}')
"

echo ""
echo "✅ Celery services started!"
echo "📊 Redis: localhost:6379"
echo "👷 Celery Worker: Running with improved settings"
echo ""
echo "To stop services:"
echo "  pkill -f 'celery.*sdc'"
echo "  pkill redis-server"
echo ""
echo "To check worker status:"
echo "  cd api/sdc && python -m celery -A sdc inspect stats"
