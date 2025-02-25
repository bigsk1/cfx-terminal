"""
Docker-specific entry point for the FastAPI backend
"""
import os
import sys

# Add the current directory to the path so we can import the CORS config
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

# Import the CORS config
from cors_config import get_cors_config

# Import the original app
from main import app

# Update the CORS middleware with Docker-specific settings
from fastapi.middleware.cors import CORSMiddleware

# Remove existing CORS middleware if any
app.middleware_stack.middlewares = [
    m for m in app.middleware_stack.middlewares 
    if not isinstance(m, CORSMiddleware.__class__)
]

# Add new CORS middleware with Docker-specific settings
app.add_middleware(
    CORSMiddleware,
    **get_cors_config()
)

# Print the allowed origins for debugging
print(f"CORS allowed origins: {get_cors_config()['allow_origins']}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main_docker:app", host="0.0.0.0", port=8000, reload=True) 