"""
File handling utilities for uploads, storage, and management
"""

import os
import uuid
import shutil
import mimetypes
import io
from typing import Dict, List, Optional, Any
from pathlib import Path
from fastapi import UploadFile, HTTPException, status
from PIL import Image
import aiofiles
import logging

logger = logging.getLogger(__name__)


class FileHandler:
    def __init__(self):
        # Base upload directory
        self.base_upload_dir = Path("uploads")
        self.base_upload_dir.mkdir(exist_ok=True)
        
        # Maximum file sizes (in bytes)
        self.max_file_sizes = {
            "image": 10 * 1024 * 1024,  # 10MB for images
            "document": 50 * 1024 * 1024,  # 50MB for documents
            "video": 100 * 1024 * 1024,  # 100MB for videos
        }
        
        # Allowed file types
        self.allowed_extensions = {
            "image": {".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"},
            "document": {".pdf", ".doc", ".docx", ".txt", ".rtf", ".odt", ".jpg", ".jpeg", ".png", ".gif", ".webp", ".bmp"},  # Temporarily allow images for KYC
            "video": {".mp4", ".avi", ".mov", ".wmv", ".flv", ".webm"},
            "archive": {".zip", ".rar", ".7z", ".tar", ".gz"}
        }
        
        # Image thumbnail sizes
        self.thumbnail_sizes = {
            "small": (150, 150),
            "medium": (300, 300),
            "large": (800, 600)
        }

    def _get_file_category(self, filename: str) -> str:
        """Determine file category based on extension"""
        extension = Path(filename).suffix.lower()
        
        for category, extensions in self.allowed_extensions.items():
            if extension in extensions:
                return category
        
        return "other"

    def _validate_file(self, file: UploadFile, category: str) -> None:
        """Validate uploaded file"""
        # Check if file has a filename
        if not file.filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="File must have a filename"
            )
        
        # Check file extension
        extension = Path(file.filename).suffix.lower()
        allowed_extensions = self.allowed_extensions.get(category, set())
        
        if category != "other" and extension not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {extension} not allowed for {category} files"
            )
        
        # Check file size
        if hasattr(file, 'size') and file.size:
            max_size = self.max_file_sizes.get(category, 10 * 1024 * 1024)  # Default 10MB
            if file.size > max_size:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"File size exceeds maximum allowed size of {max_size / (1024*1024):.1f}MB"
                )

    def _generate_unique_filename(self, original_filename: str) -> str:
        """Generate unique filename while preserving extension"""
        extension = Path(original_filename).suffix.lower()
        unique_name = f"{uuid.uuid4()}{extension}"
        return unique_name

    def _create_directory_structure(self, subdirectory: str) -> Path:
        """Create directory structure for file storage"""
        upload_path = self.base_upload_dir / subdirectory
        upload_path.mkdir(parents=True, exist_ok=True)
        return upload_path

    async def save_file(
        self, file: UploadFile, subdirectory: str = "general", 
        category: Optional[str] = None
    ) -> Dict[str, Any]:
        """Save uploaded file to storage"""
        try:
            # Determine file category if not provided
            if not category:
                category = self._get_file_category(file.filename)
            
            # Validate file
            self._validate_file(file, category)
            
            # Create directory structure
            upload_path = self._create_directory_structure(subdirectory)
            
            # Generate unique filename
            unique_filename = self._generate_unique_filename(file.filename)
            file_path = upload_path / unique_filename
            
            # Save file
            async with aiofiles.open(file_path, 'wb') as f:
                content = await file.read()
                await f.write(content)
            
            # Get file info
            file_size = len(content)
            content_type = file.content_type or mimetypes.guess_type(file.filename)[0]
            
            # Generate thumbnails for images
            thumbnails = {}
            if category == "image":
                thumbnails = await self._generate_thumbnails(file_path, upload_path)
            
            return {
                "original_filename": file.filename,
                "stored_filename": unique_filename,
                "file_path": str(file_path),
                "file_url": f"/uploads/{subdirectory}/{unique_filename}",
                "file_size": file_size,
                "content_type": content_type,
                "category": category,
                "thumbnails": thumbnails
            }
            
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error saving file: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save file"
            )

    async def save_listing_media(
        self, files: List[UploadFile], listing_id: str
    ) -> List[Dict[str, Any]]:
        """Save multiple media files for a listing"""
        try:
            saved_files = []
            subdirectory = f"listings/{listing_id}"
            
            for file in files:
                file_info = await self.save_file(file, subdirectory, "image")
                saved_files.append(file_info)
            
            return saved_files
            
        except Exception as e:
            logger.error(f"Error saving listing media: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save listing media"
            )

    async def save_kyc_document(
        self, file: UploadFile, user_id: str, document_type: str
    ) -> Dict[str, Any]:
        """Save KYC document for user verification"""
        try:
            subdirectory = f"kyc/{user_id}"
            file_info = await self.save_file(file, subdirectory, "document")
            file_info["document_type"] = document_type
            return file_info
            
        except Exception as e:
            logger.error(f"Error saving KYC document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save KYC document"
            )

    async def save_document(
        self, file: UploadFile, subdirectory: str
    ) -> Dict[str, Any]:
        """Save general document"""
        try:
            return await self.save_file(file, subdirectory, "document")
            
        except Exception as e:
            logger.error(f"Error saving document: {e}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to save document"
            )

    async def _generate_thumbnails(
        self, original_path: Path, upload_path: Path
    ) -> Dict[str, str]:
        """Generate thumbnails for image files"""
        try:
            thumbnails = {}
            
            # Create thumbnails directory
            thumb_dir = upload_path / "thumbnails"
            thumb_dir.mkdir(exist_ok=True)
            
            # Open original image
            with Image.open(original_path) as img:
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Generate different sized thumbnails
                for size_name, (width, height) in self.thumbnail_sizes.items():
                    # Calculate aspect ratio preserving dimensions
                    img_copy = img.copy()
                    img_copy.thumbnail((width, height), Image.Resampling.LANCZOS)
                    
                    # Generate thumbnail filename
                    thumb_filename = f"{original_path.stem}_{size_name}.jpg"
                    thumb_path = thumb_dir / thumb_filename
                    
                    # Save thumbnail
                    img_copy.save(thumb_path, "JPEG", quality=85, optimize=True)
                    
                    # Store thumbnail URL
                    relative_path = thumb_path.relative_to(self.base_upload_dir)
                    thumbnails[size_name] = f"/uploads/{relative_path}"
            
            return thumbnails
            
        except Exception as e:
            logger.error(f"Error generating thumbnails: {e}")
            return {}

    def delete_file(self, file_path: str) -> bool:
        """Delete a file from storage"""
        try:
            full_path = Path(file_path)
            if full_path.exists():
                full_path.unlink()
                
                # Also delete thumbnails if it's an image
                if full_path.suffix.lower() in self.allowed_extensions["image"]:
                    thumb_dir = full_path.parent / "thumbnails"
                    if thumb_dir.exists():
                        for size_name in self.thumbnail_sizes.keys():
                            thumb_file = thumb_dir / f"{full_path.stem}_{size_name}.jpg"
                            if thumb_file.exists():
                                thumb_file.unlink()
                
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting file: {e}")
            return False

    def delete_directory(self, directory_path: str) -> bool:
        """Delete entire directory and its contents"""
        try:
            full_path = Path(directory_path)
            if full_path.exists() and full_path.is_dir():
                shutil.rmtree(full_path)
                return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deleting directory: {e}")
            return False

    def get_file_info(self, file_path: str) -> Optional[Dict[str, Any]]:
        """Get information about a stored file"""
        try:
            full_path = Path(file_path)
            if not full_path.exists():
                return None
            
            stat = full_path.stat()
            content_type = mimetypes.guess_type(str(full_path))[0]
            
            return {
                "filename": full_path.name,
                "file_path": str(full_path),
                "file_size": stat.st_size,
                "content_type": content_type,
                "created_at": stat.st_ctime,
                "modified_at": stat.st_mtime
            }
            
        except Exception as e:
            logger.error(f"Error getting file info: {e}")
            return None

    def list_files(self, directory: str) -> List[Dict[str, Any]]:
        """List all files in a directory"""
        try:
            dir_path = self.base_upload_dir / directory
            if not dir_path.exists():
                return []
            
            files = []
            for file_path in dir_path.rglob("*"):
                if file_path.is_file() and not file_path.name.startswith('.'):
                    file_info = self.get_file_info(str(file_path))
                    if file_info:
                        # Add relative path
                        relative_path = file_path.relative_to(self.base_upload_dir)
                        file_info["relative_path"] = str(relative_path)
                        file_info["url"] = f"/uploads/{relative_path}"
                        files.append(file_info)
            
            return files
            
        except Exception as e:
            logger.error(f"Error listing files: {e}")
            return []

    def cleanup_old_files(self, days: int = 30) -> int:
        """Clean up files older than specified days"""
        try:
            import time
            
            cutoff_time = time.time() - (days * 24 * 60 * 60)
            deleted_count = 0
            
            for file_path in self.base_upload_dir.rglob("*"):
                if file_path.is_file():
                    if file_path.stat().st_mtime < cutoff_time:
                        try:
                            file_path.unlink()
                            deleted_count += 1
                        except Exception as e:
                            logger.error(f"Error deleting old file {file_path}: {e}")
            
            return deleted_count
            
        except Exception as e:
            logger.error(f"Error cleaning up old files: {e}")
            return 0

    def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage usage statistics"""
        try:
            total_size = 0
            file_count = 0
            
            for file_path in self.base_upload_dir.rglob("*"):
                if file_path.is_file():
                    total_size += file_path.stat().st_size
                    file_count += 1
            
            return {
                "total_files": file_count,
                "total_size_bytes": total_size,
                "total_size_mb": round(total_size / (1024 * 1024), 2),
                "total_size_gb": round(total_size / (1024 * 1024 * 1024), 2)
            }
            
        except Exception as e:
            logger.error(f"Error getting storage stats: {e}")
            return {
                "total_files": 0,
                "total_size_bytes": 0,
                "total_size_mb": 0,
                "total_size_gb": 0
            }

    async def validate_and_process_image(
        self, file: UploadFile, max_width: int = 1920, max_height: int = 1080
    ) -> Dict[str, Any]:
        """Validate and process image file with resizing if needed"""
        try:
            # Validate it's an image
            if not file.content_type or not file.content_type.startswith('image/'):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="File must be an image"
                )
            
            # Read file content
            content = await file.read()
            
            # Process with PIL
            with Image.open(io.BytesIO(content)) as img:
                # Get original dimensions
                original_width, original_height = img.size
                
                # Convert to RGB if necessary
                if img.mode in ('RGBA', 'LA', 'P'):
                    img = img.convert('RGB')
                
                # Resize if too large
                if original_width > max_width or original_height > max_height:
                    img.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                
                # Save processed image
                output = io.BytesIO()
                img.save(output, format='JPEG', quality=85, optimize=True)
                processed_content = output.getvalue()
                
                return {
                    "processed_content": processed_content,
                    "original_size": (original_width, original_height),
                    "processed_size": img.size,
                    "file_size": len(processed_content),
                    "format": "JPEG"
                }
                
        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error processing image: {e}")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid image file"
            )