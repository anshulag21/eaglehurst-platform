import React, { useState, useCallback } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardMedia,
  Grid,
  IconButton,
  Typography,
  LinearProgress,
  Alert,
  Stack,
  Chip,
} from '@mui/material';
import {
  CloudUpload,
  Delete,
  Star,
  StarBorder,
  Image as ImageIcon,
} from '@mui/icons-material';
import { useDropzone } from 'react-dropzone';
import toast from 'react-hot-toast';

export interface UploadedImage {
  id?: string;
  file?: File;
  url: string;
  name: string;
  size?: number;
  isPrimary?: boolean;
}

interface ImageUploadProps {
  images: UploadedImage[];
  onImagesChange: (images: UploadedImage[]) => void;
  maxImages?: number;
  maxFileSize?: number; // in MB
  disabled?: boolean;
  showProgress?: boolean;
  uploadProgress?: number;
}

const ImageUpload: React.FC<ImageUploadProps> = ({
  images,
  onImagesChange,
  maxImages = 10,
  maxFileSize = 10,
  disabled = false,
  showProgress = false,
  uploadProgress = 0,
}) => {
  const [dragActive, setDragActive] = useState(false);

  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const maxSizeBytes = maxFileSize * 1024 * 1024;
      const validFiles: File[] = [];
      const errors: string[] = [];

      acceptedFiles.forEach((file) => {
        // Check file size
        if (file.size > maxSizeBytes) {
          errors.push(`${file.name} is too large (max ${maxFileSize}MB)`);
          return;
        }

        // Check file type
        if (!file.type.startsWith('image/')) {
          errors.push(`${file.name} is not an image file`);
          return;
        }

        validFiles.push(file);
      });

      // Show errors
      if (errors.length > 0) {
        errors.forEach((error) => toast.error(error));
      }

      // Check total image limit
      const totalImages = images.length + validFiles.length;
      if (totalImages > maxImages) {
        toast.error(`Maximum ${maxImages} images allowed`);
        return;
      }

      // Create new image objects
      const newImages: UploadedImage[] = validFiles.map((file, index) => ({
        file,
        url: URL.createObjectURL(file),
        name: file.name,
        size: file.size,
        isPrimary: images.length === 0 && index === 0, // First image is primary if no existing images
      }));

      onImagesChange([...images, ...newImages]);
    },
    [images, maxImages, maxFileSize, onImagesChange]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    disabled,
    multiple: true,
  });

  const removeImage = (index: number) => {
    const newImages = [...images];
    const removedImage = newImages[index];
    
    // Clean up object URL if it's a local file
    if (removedImage.file && removedImage.url.startsWith('blob:')) {
      URL.revokeObjectURL(removedImage.url);
    }
    
    newImages.splice(index, 1);
    
    // If removed image was primary, make first image primary
    if (removedImage.isPrimary && newImages.length > 0) {
      newImages[0].isPrimary = true;
    }
    
    onImagesChange(newImages);
  };

  const setPrimaryImage = (index: number) => {
    const newImages = images.map((img, i) => ({
      ...img,
      isPrimary: i === index,
    }));
    onImagesChange(newImages);
  };

  const canAddMore = images.length < maxImages;

  return (
    <Box>
      {/* Upload Area */}
      {canAddMore && (
        <Card
          sx={{
            mb: 3,
            border: '2px dashed',
            borderColor: isDragActive ? 'primary.main' : 'grey.300',
            bgcolor: isDragActive ? 'primary.50' : 'transparent',
            cursor: disabled ? 'not-allowed' : 'pointer',
            opacity: disabled ? 0.6 : 1,
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              borderColor: disabled ? 'grey.300' : 'primary.main',
              bgcolor: disabled ? 'transparent' : 'primary.50',
            },
          }}
        >
          <CardContent>
            <Box
              {...getRootProps()}
              sx={{
                textAlign: 'center',
                py: 4,
              }}
            >
              <input {...getInputProps()} />
              <CloudUpload
                sx={{
                  fontSize: 48,
                  color: 'primary.main',
                  mb: 2,
                }}
              />
              <Typography variant="h6" sx={{ mb: 1 }}>
                {isDragActive
                  ? 'Drop images here...'
                  : 'Drag & drop images here, or click to select'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Supports: JPEG, PNG, WebP, GIF (max {maxFileSize}MB each)
              </Typography>
              <Button
                variant="contained"
                startIcon={<CloudUpload />}
                disabled={disabled}
              >
                Select Images
              </Button>
              <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                {images.length} of {maxImages} images uploaded
              </Typography>
            </Box>
          </CardContent>
        </Card>
      )}

      {/* Upload Progress */}
      {showProgress && uploadProgress > 0 && (
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ mb: 1 }}>
            Uploading images... {Math.round(uploadProgress)}%
          </Typography>
          <LinearProgress variant="determinate" value={uploadProgress} />
        </Box>
      )}

      {/* Image Grid */}
      {images.length > 0 && (
        <Box>
          <Typography variant="h6" sx={{ mb: 2 }}>
            Uploaded Images ({images.length})
          </Typography>
          <Grid container spacing={2}>
            {images.map((image, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card
                  sx={{
                    position: 'relative',
                    '&:hover .image-actions': {
                      opacity: 1,
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={image.url}
                    alt={image.name}
                    sx={{
                      objectFit: 'cover',
                    }}
                  />
                  
                  {/* Primary Badge */}
                  {image.isPrimary && (
                    <Chip
                      label="Primary"
                      color="primary"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        zIndex: 2,
                      }}
                    />
                  )}

                  {/* Image Actions */}
                  <Box
                    className="image-actions"
                    sx={{
                      position: 'absolute',
                      top: 8,
                      right: 8,
                      opacity: 0,
                      transition: 'opacity 0.2s',
                      zIndex: 2,
                    }}
                  >
                    <Stack direction="row" spacing={1}>
                      <IconButton
                        size="small"
                        onClick={() => setPrimaryImage(index)}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 1)',
                          },
                        }}
                        title={image.isPrimary ? 'Primary image' : 'Set as primary'}
                      >
                        {image.isPrimary ? (
                          <Star sx={{ color: 'primary.main' }} />
                        ) : (
                          <StarBorder />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => removeImage(index)}
                        sx={{
                          bgcolor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': {
                            bgcolor: 'rgba(255, 255, 255, 1)',
                          },
                        }}
                        title="Remove image"
                      >
                        <Delete sx={{ color: 'error.main' }} />
                      </IconButton>
                    </Stack>
                  </Box>

                  {/* Image Info */}
                  <CardContent sx={{ pt: 1, pb: '8px !important' }}>
                    <Typography
                      variant="body2"
                      noWrap
                      title={image.name}
                      sx={{ fontSize: '0.75rem' }}
                    >
                      {image.name}
                    </Typography>
                    {image.size && (
                      <Typography
                        variant="caption"
                        color="text.secondary"
                        sx={{ fontSize: '0.7rem' }}
                      >
                        {(image.size / 1024 / 1024).toFixed(1)} MB
                      </Typography>
                    )}
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Instructions */}
          <Alert severity="info" sx={{ mt: 2 }}>
            <Typography variant="body2">
              • The first image will be used as the primary listing image
              • Click the star icon to set a different primary image
              • Images will be displayed in listing grids and detail pages
              • Recommended size: 1200x800px or larger for best quality
            </Typography>
          </Alert>
        </Box>
      )}

      {/* No Images State */}
      {images.length === 0 && !canAddMore && (
        <Box
          sx={{
            textAlign: 'center',
            py: 4,
            border: '1px dashed',
            borderColor: 'grey.300',
            borderRadius: 1,
          }}
        >
          <ImageIcon sx={{ fontSize: 48, color: 'grey.400', mb: 2 }} />
          <Typography variant="body1" color="text.secondary">
            No images uploaded yet
          </Typography>
        </Box>
      )}
    </Box>
  );
};

export default ImageUpload;
