"""
Main FastAPI application for CareAcquire platform
"""

from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from fastapi.staticfiles import StaticFiles
from starlette.exceptions import HTTPException as StarletteHTTPException
from pydantic import ValidationError
from pydantic_core import ValidationError as PydanticCoreValidationError
import time
import logging
import os
from pathlib import Path

from .core.config import settings
from .core.database import create_tables
from .api.v1.api import api_router
from .schemas.common_schemas import ErrorResponse

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Create FastAPI application
app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description="Medical Business Marketplace Platform API",
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    openapi_url="/openapi.json" if settings.DEBUG else None,
)

# Add CORS middleware - Configure based on environment
if settings.DEBUG:
    # Development: Allow all origins for easier testing
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # Allow all origins in development
        allow_credentials=False,  # Must be False when allow_origins is ["*"]
        allow_methods=["*"],  # Allow all methods
        allow_headers=["*"],  # Allow all headers
        expose_headers=["*"],  # Expose all headers
    )
    logger.info("🌐 CORS: Allowing all origins (Development mode)")
else:
    # Production: Use specific allowed origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.get_allowed_origins(),
        allow_credentials=True,
        allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
        allow_headers=["*"],
    )
    logger.info(f"🌐 CORS: Allowing specific origins (Production mode): {settings.get_allowed_origins()}")

# Add trusted host middleware for security
if not settings.DEBUG:
    app.add_middleware(
        TrustedHostMiddleware,
        allowed_hosts=["*"]  # Configure properly in production
    )


# Request timing middleware
@app.middleware("http")
async def add_process_time_header(request: Request, call_next):
    """Add processing time header to responses"""
    start_time = time.time()
    response = await call_next(request)
    process_time = time.time() - start_time
    response.headers["X-Process-Time"] = str(process_time)
    return response


# Exception handlers
@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    """Handle HTTP exceptions"""
    return JSONResponse(
        status_code=exc.status_code,
        content=ErrorResponse(
            success=False,
            message="HTTP error occurred",
            error={
                "code": f"HTTP_{exc.status_code}",
                "message": exc.detail,
                "status_code": exc.status_code
            }
        ).dict()
    )


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle request validation errors"""
    # Extract user-friendly error messages
    error_messages = []
    for error in exc.errors():
        field = error.get('loc', ['unknown'])[-1]  # Get the field name
        message = error.get('msg', 'Invalid value')
        
        # Handle specific validation messages
        if 'Password must contain at least one uppercase letter' in message:
            error_messages.append("Password must contain at least one uppercase letter (A-Z)")
        elif 'Password must contain at least one lowercase letter' in message:
            error_messages.append("Password must contain at least one lowercase letter (a-z)")
        elif 'Password must contain at least one digit' in message:
            error_messages.append("Password must contain at least one digit (0-9)")
        elif 'Password must be at least 8 characters long' in message:
            error_messages.append("Password must be at least 8 characters long")
        else:
            error_messages.append(f"{field}: {message}")
    
    user_message = "; ".join(error_messages) if error_messages else "Invalid input data"
    
    # Convert errors to JSON-serializable format
    serializable_errors = []
    for error in exc.errors():
        serializable_error = {
            "type": error.get("type"),
            "loc": error.get("loc", []),
            "msg": error.get("msg"),
            "input": str(error.get("input", "")) if error.get("input") is not None else None
        }
        serializable_errors.append(serializable_error)
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            success=False,
            message="Validation failed",
            error={
                "code": "VALIDATION_ERROR",
                "message": user_message,
                "details": serializable_errors
            }
        ).dict()
    )


@app.exception_handler(ValidationError)
async def pydantic_validation_exception_handler(request: Request, exc: ValidationError):
    """Handle Pydantic validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            success=False,
            message="Validation error",
            error={
                "code": "VALIDATION_ERROR",
                "message": "Invalid input data",
                "details": exc.errors()
            }
        ).dict()
    )


@app.exception_handler(PydanticCoreValidationError)
async def pydantic_core_validation_exception_handler(request: Request, exc: PydanticCoreValidationError):
    """Handle Pydantic Core validation errors"""
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content=ErrorResponse(
            success=False,
            message="Validation error",
            error={
                "code": "VALIDATION_ERROR",
                "message": "Invalid input data",
                "details": exc.errors()
            }
        ).dict()
    )


@app.exception_handler(Exception)
async def general_exception_handler(request: Request, exc: Exception):
    """Handle general exceptions"""
    logger.error(f"Unhandled exception: {exc}", exc_info=True)
    logger.error(f"Exception type: {type(exc)}")
    logger.error(f"Exception module: {type(exc).__module__}")
    logger.error(f"Exception class: {type(exc).__name__}")
    
    # Check if this is a ValidationError that we missed
    if "ValidationError" in str(type(exc)) or hasattr(exc, 'errors'):
        logger.error("This appears to be a ValidationError that wasn't caught by our handler")
        if hasattr(exc, 'errors'):
            logger.error(f"Validation errors: {exc.errors()}")
            
            # Try to handle it as a validation error
            error_messages = []
            try:
                for error in exc.errors():
                    field = error.get('loc', ['unknown'])[-1]
                    message = error.get('msg', 'Invalid value')
                    
                    if 'Password must contain at least one uppercase letter' in message:
                        error_messages.append("Password must contain at least one uppercase letter (A-Z)")
                    elif 'Password must contain at least one lowercase letter' in message:
                        error_messages.append("Password must contain at least one lowercase letter (a-z)")
                    elif 'Password must contain at least one digit' in message:
                        error_messages.append("Password must contain at least one digit (0-9)")
                    elif 'Password must be at least 8 characters long' in message:
                        error_messages.append("Password must be at least 8 characters long")
                    else:
                        error_messages.append(f"{field}: {message}")
                
                user_message = "; ".join(error_messages) if error_messages else "Invalid input data"
                
                return JSONResponse(
                    status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                    content=ErrorResponse(
                        success=False,
                        message="Validation failed",
                        error={
                            "code": "VALIDATION_ERROR",
                            "message": user_message,
                            "details": exc.errors()
                        }
                    ).dict()
                )
            except Exception as e:
                logger.error(f"Failed to process validation error: {e}")
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content=ErrorResponse(
            success=False,
            message="Internal server error",
            error={
                "code": "INTERNAL_ERROR",
                "message": "An unexpected error occurred"
            }
        ).dict()
    )


# Startup and shutdown events
@app.on_event("startup")
async def startup_event():
    """Application startup tasks"""
    logger.info("Starting CareAcquire API...")
    
    # Create database tables
    create_tables()
    logger.info("Database tables created/verified")
    
    # Additional startup tasks can be added here
    # - Initialize Redis connection
    # - Setup background tasks
    # - Warm up caches
    
    logger.info("CareAcquire API started successfully")


@app.on_event("shutdown")
async def shutdown_event():
    """Application shutdown tasks"""
    logger.info("Shutting down CareAcquire API...")
    
    # Cleanup tasks can be added here
    # - Close database connections
    # - Close Redis connections
    # - Cancel background tasks
    
    logger.info("CareAcquire API shut down successfully")


# Health check endpoint
@app.get("/health", tags=["Health"])
async def health_check():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "timestamp": time.time(),
        "version": settings.APP_VERSION,
        "service": settings.APP_NAME
    }


# CORS is handled by CORSMiddleware above
# No need for explicit OPTIONS handler


# Create uploads directory if it doesn't exist
uploads_dir = Path("uploads")
uploads_dir.mkdir(exist_ok=True)

# Mount static files for media uploads
app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

# Include API router
app.include_router(api_router, prefix="/api/v1")


# Root endpoint
@app.get("/", tags=["Root"])
async def root():
    """Root endpoint"""
    return {
        "message": "Welcome to CareAcquire API",
        "version": settings.APP_VERSION,
        "docs": "/docs" if settings.DEBUG else "Documentation not available in production",
        "health": "/health"
    }


# CORS test endpoint
@app.get("/cors-test", tags=["Test"])
async def cors_test():
    """Test endpoint to verify CORS is working"""
    return {
        "message": "CORS is working!",
        "timestamp": time.time(),
        "cors_enabled": True
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )
