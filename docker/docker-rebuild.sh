#!/bin/bash

echo "Rebuilding and restarting CFX-Terminal Docker containers..."

# Navigate to the docker directory
cd "$(dirname "$0")"

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Rebuild the images
echo "Rebuilding images..."
docker-compose build --no-cache

# Start the containers
echo "Starting containers..."
docker-compose up -d

echo "CFX-Terminal has been rebuilt and restarted!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"

# Wait a bit for services to start
echo "Waiting for services to start..."
sleep 10

# Check if services are running
echo "Checking if services are running..."
docker-compose ps

# Check backend logs
echo "Backend logs:"
docker-compose logs --tail=50 backend

# Check frontend logs
echo "Frontend logs:"
docker-compose logs --tail=20 frontend

# Check network connectivity
echo "Checking network connectivity between containers..."
docker-compose exec backend curl -v http://frontend:3000 || echo "Frontend not reachable from backend"
docker-compose exec frontend curl -v http://backend:8000 || echo "Backend not reachable from frontend"

echo "To view all logs: docker-compose logs -f" 