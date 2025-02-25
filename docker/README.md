# Docker Setup for CFX-Terminal

This directory contains Docker configuration files for running CFX-Terminal in containers.

## Files

- `Dockerfile.backend`: Configuration for the Python FastAPI backend
- `Dockerfile.frontend`: Configuration for the Next.js frontend
- `docker-compose.yml`: Service definitions and networking configuration
- `.dockerignore`: Files to exclude from Docker build context
- `docker-start.sh`: Helper script to start the Docker containers

## Requirements

- Docker Engine (20.10.0+)
- Docker Compose (2.0.0+)
- Valid `.env` file in the project root with API keys

## Quick Start

From the project root directory, run:

```bash
./docker/docker-start.sh
```

This will:
1. Check for required dependencies
2. Verify the `.env` file exists
3. Build and start the containers in detached mode

## Manual Setup

If you prefer to run commands manually:

1. Build the images:
   ```bash
   cd docker
   docker-compose build
   ```

2. Start the containers:
   ```bash
   docker-compose up -d
   ```

3. View logs:
   ```bash
   docker-compose logs -f
   ```

4. Stop the containers:
   ```bash
   docker-compose down
   ```

## Development with Docker

The Docker setup is configured for development with volume mounts:

- Changes to frontend code will be reflected without rebuilding
- Changes to backend code will be reflected without rebuilding
- Generated images are stored in a persistent volume

## Troubleshooting

- If you encounter network issues, try restarting Docker
- If containers fail to start, check the logs with `docker-compose logs`
- Ensure your `.env` file contains all required API keys
- For permission issues with volumes, check Docker's file permissions 