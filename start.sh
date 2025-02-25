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
echo "Starting CFX-Terminal..."
echo "AI-Powered X (Twitter) Client"
echo "----------------------------"

# Check if .env file exists
if [ ! -f .env ]; then
    echo "Error: .env file not found. Please create one from .env.sample"
    exit 1
fi

# Function to check if a command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check for required dependencies
if ! command_exists python3; then
    echo "Error: python3 is required but not installed."
    exit 1
fi

if ! command_exists npm; then
    echo "Error: npm is required but not installed."
    exit 1
fi

# Start backend server
echo "Starting backend server..."
cd backend
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing backend dependencies..."
pip install -r requirements.txt

# Start backend server directly from the virtual environment
echo "Starting FastAPI server..."
# Use the Python from the virtual environment to avoid mixing with Anaconda
./venv/bin/python -m uvicorn main:app --reload --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Deactivate virtual environment to avoid conflicts
deactivate

# Go back to root directory
cd ..

# Start frontend server
echo "Starting frontend server..."
cd frontend
echo "Installing frontend dependencies..."
npm install

echo "Starting Next.js server..."
npm run dev &
FRONTEND_PID=$!

# Go back to root directory
cd ..

# Function to handle script termination
cleanup() {
    echo "Shutting down servers..."
    kill $BACKEND_PID
    kill $FRONTEND_PID
    exit 0
}

# Register the cleanup function for when script receives SIGINT
trap cleanup SIGINT

echo "CFX-Terminal is running!"
echo "Backend: http://localhost:8000"
echo "Frontend: http://localhost:3000"
echo "Press Ctrl+C to stop all servers."

# Wait for user to press Ctrl+C
wait 