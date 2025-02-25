#!/bin/bash

echo "Checking backend status..."

# Navigate to the docker directory
cd "$(dirname "$0")"

# Check if backend container is running
echo "Backend container status:"
docker-compose ps backend

# Check backend logs
echo "Backend logs:"
docker-compose logs --tail=50 backend

# Try to access the backend directly
echo "Trying to access backend directly:"
curl -v http://localhost:8000/docs

# Check if the backend is listening on port 8000
echo "Checking if backend is listening on port 8000:"
docker-compose exec backend netstat -tulpn | grep 8000 || echo "Backend not listening on port 8000"

# Check the Python modules in the backend container
echo "Checking Python modules in backend container:"
docker-compose exec backend python -c "import sys; print(sys.path)"
docker-compose exec backend ls -la /app

# Try to import the main module
echo "Trying to import the main module:"
docker-compose exec backend python -c "import docker_app; print('Import successful')" || echo "Import failed"

echo "Backend check complete." 