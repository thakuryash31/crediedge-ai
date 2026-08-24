# backend/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import uvicorn

# Import our modular routers
# Ensure you have created backend/api/upload.py as discussed
from api.upload import router as upload_router

# 1. Initialize the FastAPI Application
app = FastAPI(
    title="CrediEdge AI Underwriting API",
    description="Local, Zero-Data-Leakage Cash Flow Parsing and Risk Engine",
    version="1.0.0",
    docs_url="/docs",     # Swagger UI endpoint
    redoc_url="/redoc"    # ReDoc UI endpoint
)

# 2. Configure Cross-Origin Resource Sharing (CORS)
# This is critical. It allows your Next.js frontend (running on port 3000)
# to securely make requests to this Python backend (running on port 8000).
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",          # Next.js local development
        "http://127.0.0.1:3000",
        # "https://your-vercel-domain.com" # Uncomment and add when deploying to production
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"], # Allows all headers (Authorization, Content-Type, etc.)
)

# 3. Mount Routers
# We prefix the upload router with /api/v1 for clean versioning.
app.include_router(upload_router, prefix="/api/v1", tags=["Ingestion"])

# 4. Core System Routes
@app.get("/", tags=["System"])
async def root_status():
    """Root endpoint to verify the API is reachable."""
    return {"message": "Welcome to the CrediEdge AI API. Visit /docs for documentation."}

@app.get("/health", tags=["System"])
async def health_check():
    """Health check for container orchestration (e.g., Docker, Kubernetes)."""
    return {
        "status": "operational", 
        "system": "CrediEdge AI Core",
        "version": "1.0.0"
    }

# 5. Local Execution Entry Point
if __name__ == "__main__":
    # Runs the server on localhost:8000 with auto-reload enabled for development
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)