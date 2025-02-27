#!/bin/bash

# Display ASCII art banner
echo "
 ██████╗███████╗██╗  ██╗   ████████╗███████╗██████╗ ███╗   ███╗██╗███╗   ██╗ █████╗ ██╗     
██╔════╝██╔════╝╚██╗██╔╝   ╚══██╔══╝██╔════╝██╔══██╗████╗ ████║██║████╗  ██║██╔══██╗██║     
██║     █████╗   ╚███╔╝       ██║   █████╗  ██████╔╝██╔████╔██║██║██╔██╗ ██║███████║██║     
██║     ██╔══╝   ██╔██╗       ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║██║██║╚██╗██║██╔══██║██║     
╚██████╗██║     ██╔╝ ██╗      ██║   ███████╗██║  ██║██║ ╚═╝ ██║██║██║ ╚████║██║  ██║███████╗
 ╚═════╝╚═╝     ╚═╝  ╚═╝      ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝╚══════╝
                                                                                             
"
echo "Starting CFX-Terminal with Docker..."
echo "AI-Powered X (X) Client"
echo "----------------------------"

# Check if .env file exists
if [ ! -f ./.env ]; then
    echo "Error: .env file not found. Please create one from .env.sample"
    exit 1
fi

# Check for required dependencies
if ! command -v docker >/dev/null 2>&1; then
    echo "Error: docker is required but not installed."
    exit 1
fi

if ! command -v docker-compose >/dev/null 2>&1; then
    echo "Error: docker-compose is required but not installed."
    exit 1
fi

# Start the containers
echo "Building and starting Docker containers..."
cd "$(dirname "$0")"
docker-compose up --build -d

echo "CFX-Terminal is running in Docker!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "To stop the containers, run: docker-compose down" 