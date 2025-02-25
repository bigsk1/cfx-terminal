"""
Simple Docker-specific entry point for the FastAPI backend
This file directly imports and modifies the main app
"""
from main import app
from fastapi.middleware.cors import CORSMiddleware

# Define allowed origins for Docker environment
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://frontend:3000",
    "http://127.0.0.1:3000",
]

# Clear existing CORS middleware
app.middleware_stack.middlewares = [
    m for m in app.middleware_stack.middlewares 
    if not isinstance(getattr(m, "app", None), CORSMiddleware)
]

# Add new CORS middleware with Docker-specific settings
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

print(f"Docker backend started with CORS allowed origins: {ALLOWED_ORIGINS}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 