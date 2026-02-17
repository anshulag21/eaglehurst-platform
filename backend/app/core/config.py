"""
Configuration settings for CareAcquire platform
"""

from typing import Optional, List
from pydantic_settings import BaseSettings
from pydantic import field_validator, validator, ValidationError
import os
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    # Application
    APP_NAME: str = "CareAcquire API"
    APP_VERSION: str = "1.0.0"
    DEBUG: bool = True  # Set to True for development
    
    # Environment (development, staging, production)
    ENVIRONMENT: str = "development"  # Set to "production" in production
    
    # Security - Required in production
    SECRET_KEY: str = "dev-secret-key-change-in-production"
    JWT_SECRET_KEY: str = "dev-jwt-secret-change-in-production"
    ENCRYPTION_KEY: str = "dev-encryption-key-change-in-production"
    
    # Database - Required
    DATABASE_URL: str
    DATABASE_TEST_URL: Optional[str] = None
    
    # Redis - Optional for development
    REDIS_URL: str = "redis://localhost:6379"  # Override in production .env
    
    # Frontend URL for email links and redirects
    # In production, FRONTEND_URL must be set via environment variable
    # In development, defaults to localhost:5173
    def get_frontend_url_default(self) -> str:
        return "http://localhost:5173" if self.ENVIRONMENT == "development" else ""
    
    def get_api_url_default(self) -> str:
        return "http://localhost:8000" if self.ENVIRONMENT == "development" else ""
    
    FRONTEND_URL: str = ""  # Will be set via field_validator
    API_URL: str = ""  # Will be set via field_validator
    
    # Email - SMTP Configuration
    SMTP_HOST: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = "eaglehurst.testuser@gmail.com"
    SMTP_PASSWORD: str = "pujo wbzq xwls htsr"
    FROM_EMAIL: str = "eaglehurst.testuser@gmail.com"
    FROM_NAME: str = "CareAcquire Platform"
    
    # SendGrid Configuration (Alternative to SMTP)
    SENDGRID_API_KEY: str = "dev-sendgrid-key"
    
    # Stripe - Optional for development
    STRIPE_SECRET_KEY: str = "sk_test_dev_key"
    STRIPE_PUBLISHABLE_KEY: str = "pk_test_dev_key"
    STRIPE_WEBHOOK_SECRET: str = "whsec_dev_secret"
    STRIPE_SUCCESS_URL: Optional[str] = None
    STRIPE_CANCEL_URL: Optional[str] = None
    
    # AWS S3 - Optional for development
    AWS_ACCESS_KEY_ID: str = "dev-aws-key"
    AWS_SECRET_ACCESS_KEY: str = "dev-aws-secret"
    AWS_REGION: str = "us-east-1"
    S3_BUCKET_NAME: str = "eaglehurst-dev-files"
    
    # CORS
    ALLOWED_ORIGINS: str = "http://localhost:3000,http://localhost:3001,http://localhost:8080,http://localhost:5173,http://127.0.0.1:5173,http://37.220.31.46:5173,http://37.220.31.46:8000,http://37.220.31.46,https://eaglehurst.com,https://www.eaglehurst.com,https://api.eaglehurst.com"
    
    # Rate Limiting
    RATE_LIMIT_ENABLED: bool = True
    
    # File Upload
    MAX_FILE_SIZE: int = 10 * 1024 * 1024  # 10MB
    
    # Monitoring
    SENTRY_DSN: Optional[str] = None
    
    @field_validator("DATABASE_URL")
    @classmethod
    def validate_database_url(cls, v: str) -> str:
        """Validate database URL format"""
        if not v:
            raise ValueError("DATABASE_URL is required")
        
        # Check if it's a valid database URL format
        valid_prefixes = ["mysql+pymysql://", "postgresql://", "postgresql+psycopg2://", "sqlite:///"]
        if not any(v.startswith(prefix) for prefix in valid_prefixes):
            raise ValueError("DATABASE_URL must start with a valid database prefix")
        
        logger.info(f"Database URL validated: {v.split('@')[0]}@***")
        return v
    
    @field_validator("SECRET_KEY", "JWT_SECRET_KEY", "ENCRYPTION_KEY")
    @classmethod
    def validate_secrets(cls, v: str, info) -> str:
        """Validate secret keys in production"""
        field_name = info.field_name
        
        # Check if secrets are using development defaults
        if v.startswith("dev-"):
            logger.warning(f"⚠️  {field_name} is using development default. Change in production!")
        
        if len(v) < 32:
            logger.warning(f"⚠️  {field_name} should be at least 32 characters long")
        
        return v
    
    @field_validator("FRONTEND_URL", "API_URL")
    @classmethod
    def validate_urls(cls, v: str, info) -> str:
        """Validate URLs and set environment-aware defaults"""
        field_name = info.field_name
        
        # Get ENVIRONMENT from values if available
        # Note: This validator runs after ENVIRONMENT is set
        values = info.data if hasattr(info, 'data') else {}
        environment = values.get('ENVIRONMENT', os.getenv('ENVIRONMENT', 'development'))
        
        # If value is empty or not set, use environment-appropriate default
        if not v or v == "":
            if field_name == "FRONTEND_URL":
                v = "http://localhost:5173" if environment == "development" else ""
            elif field_name == "API_URL":
                v = "http://localhost:8000" if environment == "development" else ""
        
        # In production, ensure URLs are set and don't contain localhost
        if environment == "production":
            if not v:
                raise ValueError(f"{field_name} must be set in production environment")
            if "localhost" in v or "127.0.0.1" in v:
                raise ValueError(f"{field_name} cannot use localhost in production environment. Got: {v}")
        
        logger.info(f"✅ {field_name} validated: {v}")
        return v
    
    def get_allowed_origins(self) -> List[str]:
        """Convert ALLOWED_ORIGINS string to list"""
        if isinstance(self.ALLOWED_ORIGINS, str):
            origins = [i.strip() for i in self.ALLOWED_ORIGINS.split(",")]
            logger.info(f"CORS origins configured: {origins}")
            return origins
        return self.ALLOWED_ORIGINS
    
    def is_development(self) -> bool:
        """Check if running in development mode"""
        return self.DEBUG
    
    def is_production(self) -> bool:
        """Check if running in production mode"""
        return not self.DEBUG
    
    def validate_production_config(self) -> List[str]:
        """Validate production configuration and return warnings"""
        warnings = []
        
        if self.is_production():
            # Check critical production settings
            if self.SECRET_KEY.startswith("dev-"):
                warnings.append("SECRET_KEY is using development default")
            
            if self.JWT_SECRET_KEY.startswith("dev-"):
                warnings.append("JWT_SECRET_KEY is using development default")
            
            if self.SENDGRID_API_KEY.startswith("dev-") or self.SENDGRID_API_KEY == "your-sendgrid-api-key":
                warnings.append("SENDGRID_API_KEY is not configured for production")
            
            if self.STRIPE_SECRET_KEY.startswith("sk_test_") or self.STRIPE_SECRET_KEY.startswith("dev-"):
                warnings.append("STRIPE_SECRET_KEY appears to be test/dev key in production")
            
            if self.AWS_ACCESS_KEY_ID.startswith("dev-"):
                warnings.append("AWS credentials are not configured for production")
        
        return warnings
    
    def get_database_info(self) -> dict:
        """Get database connection information (without credentials)"""
        try:
            # Parse database URL to extract info
            url_parts = self.DATABASE_URL.split("://")[1]  # Remove protocol
            if "@" in url_parts:
                credentials, host_db = url_parts.split("@", 1)
                username = credentials.split(":")[0]
                if "/" in host_db:
                    host_port, database = host_db.rsplit("/", 1)
                else:
                    host_port, database = host_db, "default"
                
                if ":" in host_port:
                    host, port = host_port.rsplit(":", 1)
                else:
                    host, port = host_port, "default"
                
                return {
                    "type": self.DATABASE_URL.split("://")[0],
                    "host": host,
                    "port": port,
                    "database": database,
                    "username": username
                }
        except Exception as e:
            logger.error(f"Error parsing database URL: {e}")
        
        return {"type": "unknown", "host": "unknown", "port": "unknown", "database": "unknown"}
    
    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"  # Ignore extra fields


def create_settings() -> Settings:
    """Create and validate settings instance"""
    try:
        settings = Settings()
        
        # Log configuration status
        db_info = settings.get_database_info()
        logger.info(f"🚀 CareAcquire API v{settings.APP_VERSION}")
        logger.info(f"🔧 Environment: {'Development' if settings.is_development() else 'Production'}")
        logger.info(f"🗄️  Database: {db_info['type']} at {db_info['host']}:{db_info['port']}/{db_info['database']}")
        
        # Validate production config
        if settings.is_production():
            warnings = settings.validate_production_config()
            if warnings:
                logger.warning("⚠️  Production configuration warnings:")
                for warning in warnings:
                    logger.warning(f"   - {warning}")
        
        return settings
        
    except ValidationError as e:
        logger.error("❌ Configuration validation failed:")
        for error in e.errors():
            logger.error(f"   - {error['loc'][0]}: {error['msg']}")
        raise
    except Exception as e:
        logger.error(f"❌ Failed to load configuration: {e}")
        raise


# Create settings instance
settings = create_settings()
