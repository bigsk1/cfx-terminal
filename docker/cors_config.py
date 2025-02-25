"""
CORS configuration for Docker environment
"""

# List of allowed origins for CORS
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # Local development
    "http://frontend:3000",   # Docker service name
    "http://127.0.0.1:3000",  # Alternative local address
]

def get_cors_config():
    """
    Returns the CORS configuration for the FastAPI app
    """
    return {
        "allow_origins": ALLOWED_ORIGINS,
        "allow_credentials": True,
        "allow_methods": ["*"],
        "allow_headers": ["*"],
    } 