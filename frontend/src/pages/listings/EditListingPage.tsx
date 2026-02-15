import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Alert,
  Skeleton,
  Paper,
  IconButton,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  Save,
  Preview,
  CloudUpload,
  PhotoCamera,
  Delete,
  Star,
  StarBorder,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { listingService } from '../../services/listing.service';
import { ROUTES, getImageUrl } from '../../constants';
import type { Listing } from '../../types';

import toast from 'react-hot-toast';

// Form validation schema
const listingSchema = yup.object().shape({
  title: yup.string().required('Title is required').min(10, 'Title must be at least 10 characters'),
  description: yup.string().required('Description is required').min(50, 'Description must be at least 50 characters'),
  business_type: yup.string().required('Business type is required'),
  location: yup.string().required('Location is required'),
  asking_price: yup.number().positive('Asking price must be positive').nullable(),
  business_details: yup.object().shape({
    practice_name: yup.string().required('Practice name is required'),
    practice_type: yup.string().required('Practice type is required'),
    nhs_contract: yup.boolean(),
    patient_list_size: yup.number().positive('Patient list size must be positive').required('Patient list size is required'),
    staff_count: yup.number().positive('Staff count must be positive').required('Staff count is required'),
    premises_type: yup.string().required('Premises type is required'),
    cqc_registered: yup.boolean(),
    annual_revenue: yup.number().positive('Annual revenue must be positive').required('Annual revenue is required'),
    net_profit: yup.number().required('Net profit is required'),
  }),
});

interface FormData {
  title: string;
  description: string;
  business_type: 'full_sale' | 'partial_sale' | 'fundraising';
  location: string;
  asking_price: number | null;
  business_details: {
    practice_name: string;
    practice_type: string;
    nhs_contract: boolean;
    patient_list_size: number;
    staff_count: number;
    premises_type: 'owned' | 'leased';
    cqc_registered: boolean;
    annual_revenue: number;
    net_profit: number;
  };
}


// Helper function to parse business summary
const parseBusinessSummary = (businessSummary: string) => {
  const defaults = {
    practice_type: 'GP Practice',
    nhs_contract: false,
    patient_list_size: 0,
    staff_count: 0,
    cqc_registered: false,
  };

  if (!businessSummary) return defaults;

  // Parse practice type - more comprehensive matching
  const summary = businessSummary.toLowerCase();
  if (summary.includes('gp practice') || summary.includes('general practice')) {
    defaults.practice_type = 'GP Practice';
  } else if (summary.includes('dental')) {
    defaults.practice_type = 'Dental Practice';
  } else if (summary.includes('pharmacy')) {
    defaults.practice_type = 'Pharmacy';
  } else if (summary.includes('clinic')) {
    defaults.practice_type = 'Specialist Clinic';
  }

  // Parse NHS contract
  if (summary.includes('nhs contract')) {
    defaults.nhs_contract = true;
  }

  // Parse CQC registration
  if (summary.includes('cqc registered')) {
    defaults.cqc_registered = true;
  }

  // Parse patient list size (look for patterns like "~3500 patients" or "3500 patients")
  const patientMatch = businessSummary.match(/~?(\d+)\s+patients?/i);
  if (patientMatch) {
    defaults.patient_list_size = parseInt(patientMatch[1], 10);
  }

  // Parse staff count (look for patterns like "8 staff" or "8 employees")
  const staffMatch = businessSummary.match(/(\d+)\s+(staff|employees?)/i);
  if (staffMatch) {
    defaults.staff_count = parseInt(staffMatch[1], 10);
  }

  return defaults;
};

const EditListingPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isDraft, setIsDraft] = useState(false);
  
  // Photo upload state
  const [photos, setPhotos] = useState<File[]>([]);
  const [photoPreviews, setPhotoPreviews] = useState<string[]>([]);
  const [existingMedia, setExistingMedia] = useState<any[]>([]);
  const [primaryPhotoIndex, setPrimaryPhotoIndex] = useState<number>(0);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    reset,
  } = useForm<FormData>({
    resolver: yupResolver(listingSchema) as any,
    defaultValues: {
      title: '',
      description: '',
      business_type: 'full_sale',
      location: '',
      asking_price: null,
      business_details: {
        practice_name: '',
        practice_type: '',
        nhs_contract: false,
        patient_list_size: 0,
        staff_count: 0,
        premises_type: 'leased',
        cqc_registered: false,
        annual_revenue: 0,
        net_profit: 0,
      },
    },
  });

  const loadPendingChanges = useCallback(async (listingId: string) => {
    try {
      const response = await listingService.getPendingChanges(listingId);
      if (response.success && response.data) {
        setPendingChanges(response.data);
        return response.data;
      }
    } catch (error) {
      // No pending changes or error - that's fine
      setPendingChanges(null);
    }
    return null;
  }, []);

  // Helper function to check if a field has pending changes
  const hasFieldPendingChange = useCallback((fieldPath: string) => {
    if (!pendingChanges) return false;
    return pendingChanges.changes?.some((c: any) => c.field === fieldPath);
  }, [pendingChanges]);

  // Helper function to get the value for form (pending if exists, otherwise current)
  const getFormValue = useCallback((fieldPath: string, currentValue: any) => {
    if (!pendingChanges) return currentValue;

    const change = pendingChanges.changes?.find((c: any) => c.field === fieldPath);
    if (!change) return currentValue;

    // Handle nested financial_data fields
    if (fieldPath.startsWith('financial_data.') && typeof change.new_value === 'object') {
      const nestedField = fieldPath.split('.')[1];
      return change.new_value[nestedField];
    }
    
    return change.new_value;
  }, [pendingChanges]);

  // Component to wrap form fields with pending change indicators
  const FormFieldWrapper: React.FC<{
    children: React.ReactNode;
    fieldPath: string;
    label?: string;
  }> = ({ children, fieldPath, label }) => {
    const hasPendingChange = hasFieldPendingChange(fieldPath);
    
    if (!hasPendingChange) {
      return <>{children}</>;
    }

    return (
      <Box sx={{ position: 'relative' }}>
        {children}
        <Chip
          size="small"
          label="Under Review"
          color="warning"
          variant="outlined"
          sx={{
            position: 'absolute',
            top: -8,
            right: -8,
            fontSize: '0.65rem',
            height: 20,
            '& .MuiChip-label': {
              px: 1,
            },
          }}
        />
      </Box>
    );
  };

  const loadListing = useCallback(async (listingId: string) => {
    try {
      setLoading(true);
      
      const response = await listingService.getListing(listingId);
      
      if (response.success && response.data) {
        const listingData = response.data;
        setListing(listingData);
        
        // Also load pending changes and use them to populate form
        const pendingData = await loadPendingChanges(listingId);
        
        // Helper function to get form value (pending if exists, otherwise current)
        const getFormValueLocal = (fieldPath: string, currentValue: any) => {
          if (!pendingData) return currentValue;

          const change = pendingData.changes?.find((c: any) => c.field === fieldPath);
          if (!change) return currentValue;

          console.log(`Form field ${fieldPath}: Using pending value "${change.new_value}" instead of current "${currentValue}"`);

          // Handle nested financial_data fields
          if (fieldPath.startsWith('financial_data.') && typeof change.new_value === 'object') {
            const nestedField = fieldPath.split('.')[1];
            return change.new_value[nestedField];
          }
          
          return change.new_value;
        };
        
        // Extract nested data from API response (for detailed view) or use direct fields
        const financialData = (listingData as Record<string, any>).financial_data || {};
        const businessDetails = (listingData as Record<string, any>).business_details || {};
        
        // Parse business details from business_summary as fallback
        const businessSummary = (listingData as Record<string, any>).business_summary || '';
        const parsedDetails = parseBusinessSummary(businessSummary);
        
        // Convert asking_price from string to number if needed
        // For editing, we should get the actual asking_price from financial_data if available
        const askingPrice = financialData.asking_price || 
          (listingData.asking_price ? 
            (typeof listingData.asking_price === 'string' ? parseFloat(listingData.asking_price) : listingData.asking_price) : 
            null);
        
        // Populate form with existing data (use pending values if they exist)
        const formData: FormData = {
          title: getFormValueLocal('title', listingData.title || ''),
          description: getFormValueLocal('description', listingData.description || ''),
          business_type: getFormValueLocal('business_type', (listingData.business_type as FormData['business_type']) || 'full_sale'),
          location: getFormValueLocal('location', listingData.location || ''),
          asking_price: getFormValueLocal('financial_data.asking_price', askingPrice),
          business_details: {
            practice_name: getFormValueLocal('business_details.practice_name', businessDetails.practice_name || listingData.title || ''),
            practice_type: getFormValueLocal('business_details.practice_type', businessDetails.practice_type || parsedDetails.practice_type),
            nhs_contract: getFormValueLocal('business_details.nhs_contract', businessDetails.nhs_contract !== undefined ? businessDetails.nhs_contract : parsedDetails.nhs_contract),
            patient_list_size: getFormValueLocal('business_details.patient_list_size', (listingData as Record<string, any>).patient_list_size || businessDetails.patient_list_size || parsedDetails.patient_list_size || 0),
            staff_count: getFormValueLocal('business_details.staff_count', (listingData as Record<string, any>).staff_count || businessDetails.staff_count || parsedDetails.staff_count || 0),
            premises_type: getFormValueLocal('business_details.premises_type', businessDetails.premises_type || 'leased'),
            cqc_registered: getFormValueLocal('business_details.cqc_registered', businessDetails.cqc_registered !== undefined ? businessDetails.cqc_registered : parsedDetails.cqc_registered),
            annual_revenue: getFormValueLocal('business_details.annual_revenue', financialData.annual_revenue || (listingData as Record<string, any>).annual_revenue || 0),
            net_profit: getFormValueLocal('business_details.net_profit', financialData.net_profit || (listingData as Record<string, any>).net_profit || 0),
          },
        };
        
        // Load existing media files
        const mediaFiles = (listingData as Record<string, any>).media_files || [];
        if (mediaFiles.length > 0) {
          setExistingMedia(mediaFiles);
          // Find primary photo index
          const primaryIndex = mediaFiles.findIndex((media: any) => media.is_primary);
          if (primaryIndex >= 0) {
            setPrimaryPhotoIndex(primaryIndex);
          }
        }
        
        reset(formData);
      } else {
        toast.error('Failed to load listing');
        navigate(ROUTES.MY_LISTINGS);
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      toast.error('Failed to load listing');
      navigate(ROUTES.MY_LISTINGS);
    } finally {
      setLoading(false);
    }
  }, [navigate, reset]);

  useEffect(() => {
    if (id) {
      loadListing(id);
    }
  }, [id, loadListing]);


  const onSubmit = async (data: FormData) => {
    if (!listing) return;
    
    try {
      setSaving(true);
      
      // Upload photos first if any
      let mediaUrls: string[] = [];
      if (photos.length > 0) {
        toast('Uploading photos...', { icon: '📸' });
        mediaUrls = await uploadPhotos();
      }
      
      // Restructure data to match backend schema
      const { business_details, asking_price, ...baseData } = data;
      
      // Separate financial data from business details
      const financialData = {
        asking_price: asking_price,
        annual_revenue: business_details.annual_revenue,
        net_profit: business_details.net_profit,
      };
      
      // Keep only business-specific fields in business_details
      const businessDetailsData = {
        practice_name: business_details.practice_name,
        practice_type: business_details.practice_type,
        premises_type: business_details.premises_type,
        nhs_contract: business_details.nhs_contract,
        patient_list_size: business_details.patient_list_size,
        staff_count: business_details.staff_count,
        cqc_registered: business_details.cqc_registered,
        annual_revenue: business_details.annual_revenue, // Include for backend compatibility
        net_profit: business_details.net_profit, // Include for backend compatibility
      };
      
      const updateData = {
        ...baseData,
        financial_data: financialData,
        business_details: businessDetailsData,
        is_draft: isDraft,
        media_urls: mediaUrls, // Include uploaded photo URLs
      };
      
      const response = await listingService.updateListing(listing.id, updateData);
      
      if (response.success) {
        // Clear photos after successful upload
        setPhotos([]);
        setPhotoPreviews([]);
        setUploadProgress(0);
        
        // If photos were uploaded, reload the listing to get updated media
        if (mediaUrls.length > 0) {
          await loadListing(listing.id);
        }
        
        toast.success(
          isDraft 
            ? 'Listing saved as draft!' 
            : `Listing updated successfully!${mediaUrls.length > 0 ? ` ${mediaUrls.length} photos uploaded.` : ''}`
        );
        navigate(ROUTES.MY_LISTINGS);
      } else {
        toast.error('Failed to update listing');
      }
    } catch (error) {
      console.error('Error updating listing:', error);
      toast.error('Failed to update listing');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitForm = async () => {
    const isValid = await trigger();
    
    if (isValid) {
      handleSubmit(onSubmit as any)();
    } else {
      toast.error('Please fix the validation errors before submitting');
    }
  };

  const handleSaveDraft = () => {
    setIsDraft(true);
    handleSubmit(onSubmit as any)();
  };

  // Photo upload functions
  const handleFileSelect = (files: FileList | null) => {
    if (!files) return;
    
    const validFiles: File[] = [];
    const newPreviews: string[] = [];
    
    Array.from(files).forEach((file) => {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        toast.error(`${file.name} is not a valid image file`);
        return;
      }
      
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} is too large. Maximum size is 5MB`);
        return;
      }
      
      validFiles.push(file);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        if (e.target?.result) {
          newPreviews.push(e.target.result as string);
          if (newPreviews.length === validFiles.length) {
            setPhotoPreviews(prev => [...prev, ...newPreviews]);
          }
        }
      };
      reader.readAsDataURL(file);
    });
    
    if (validFiles.length > 0) {
      setPhotos(prev => [...prev, ...validFiles]);
      toast.success(`${validFiles.length} photo(s) added successfully`);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFileSelect(e.target.files);
  };

  const removePhoto = (index: number) => {
    setPhotos(prev => prev.filter((_, i) => i !== index));
    setPhotoPreviews(prev => prev.filter((_, i) => i !== index));
    
    // Adjust primary photo index if needed
    if (primaryPhotoIndex >= index && primaryPhotoIndex > 0) {
      setPrimaryPhotoIndex(prev => prev - 1);
    }
    
    toast.success('Photo removed');
  };

  const setPrimaryPhoto = (index: number) => {
    setPrimaryPhotoIndex(index);
    toast.success('Primary photo updated');
  };

  const uploadPhotos = async () => {
    if (photos.length === 0 || !listing) return [];
    
    try {
      setUploadProgress(0);
      const response = await listingService.uploadListingMedia(
        listing.id,
        photos,
        (progress) => setUploadProgress(progress)
      );
      
      if (response.success) {
        toast.success('Photos uploaded successfully');
        return response.data?.media_urls || [];
      } else {
        toast.error('Failed to upload photos');
        return [];
      }
    } catch (error) {
      console.error('Error uploading photos:', error);
      toast.error('Failed to upload photos');
      return [];
    }
  };

  // Existing media management functions
  const setExistingMediaPrimary = async (mediaId: string) => {
    if (!listing) return;

    try {
      // Call API to update primary photo on server
      const response = await listingService.setPrimaryMedia(listing.id, mediaId);
      
      if (response.success) {
        // Update local state after successful API call
        setExistingMedia(prev => prev.map(media => ({
          ...media,
          is_primary: media.id === mediaId
        })));
        
        toast.success('Primary photo updated');
      } else {
        toast.error('Failed to update primary photo');
      }
    } catch (error) {
      console.error('Error setting primary media:', error);
      toast.error('Failed to update primary photo');
    }
  };

  const handleRemoveMedia = (mediaId: string) => {
    setMediaToDelete(mediaId);
    setDeleteConfirmOpen(true);
  };

  const confirmRemoveMedia = async () => {
    if (!listing || !mediaToDelete) return;

    try {
      // Call API to delete media from server
      const response = await listingService.deleteListingMedia(listing.id, mediaToDelete);
      
      if (response.success) {
        // Update local state after successful API call
        setExistingMedia(prev => prev.filter(media => media.id !== mediaToDelete));
        toast.success('Photo removed successfully');
      } else {
        toast.error('Failed to remove photo');
      }
    } catch (error) {
      console.error('Error removing media:', error);
      toast.error('Failed to remove photo');
    } finally {
      setDeleteConfirmOpen(false);
      setMediaToDelete(null);
    }
  };

  const cancelRemoveMedia = () => {
    setDeleteConfirmOpen(false);
    setMediaToDelete(null);
  };

  const renderAllFields = () => {
    return (
      <Grid container spacing={3}>
        {/* Basic Information Section */}
        <Grid item xs={12}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            Basic Information
          </Typography>
        </Grid>
        
        <Grid item xs={12}>
          <FormFieldWrapper fieldPath="title">
            <Controller
              name="title"
              control={control}
              render={({ field }) => (
                <TextField
                  {...field}
                  fullWidth
                label="Listing Title"
                error={!!errors.title}
                helperText={errors.title?.message}
              />
            )}
          />
          </FormFieldWrapper>
        </Grid>
        
        <Grid item xs={12}>
          <FormFieldWrapper fieldPath="description">
            <Controller
              name="description"
              control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                multiline
                rows={4}
                label="Description"
                error={!!errors.description}
                helperText={errors.description?.message}
              />
            )}
          />
          </FormFieldWrapper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Business Type</InputLabel>
                <Select {...field} label="Business Type">
                  <MenuItem value="full_sale">Full Sale</MenuItem>
                  <MenuItem value="partial_sale">Partial Sale</MenuItem>
                  <MenuItem value="fundraising">Fundraising</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="location"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Location"
                error={!!errors.location}
                helperText={errors.location?.message}
              />
            )}
          />
        </Grid>

        {/* Business Details Section */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            Business Details
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.practice_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Practice Name"
                error={!!errors.business_details?.practice_name}
                helperText={errors.business_details?.practice_name?.message}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.practice_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Practice Type</InputLabel>
                <Select {...field} label="Practice Type">
                  <MenuItem value="GP Practice">GP Practice</MenuItem>
                  <MenuItem value="Dental Practice">Dental Practice</MenuItem>
                  <MenuItem value="Pharmacy">Pharmacy</MenuItem>
                  <MenuItem value="Specialist Clinic">Specialist Clinic</MenuItem>
                  <MenuItem value="Other">Other</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.patient_list_size"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Patient List Size"
                error={!!errors.business_details?.patient_list_size}
                helperText={errors.business_details?.patient_list_size?.message}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.staff_count"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Number of Staff"
                error={!!errors.business_details?.staff_count}
                helperText={errors.business_details?.staff_count?.message}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.premises_type"
            control={control}
            render={({ field }) => (
              <FormControl fullWidth>
                <InputLabel>Premises Type</InputLabel>
                <Select {...field} label="Premises Type">
                  <MenuItem value="owned">Owned</MenuItem>
                  <MenuItem value="leased">Leased</MenuItem>
                </Select>
              </FormControl>
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.nhs_contract"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="NHS Contract"
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.cqc_registered"
            control={control}
            render={({ field }) => (
              <FormControlLabel
                control={<Switch {...field} checked={field.value} />}
                label="CQC Registered"
              />
            )}
          />
        </Grid>

        {/* Photos Section */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            Photos
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Add high-quality photos of your practice. The first photo will be used as the main image.
          </Typography>
          
          {/* Photo Tips */}
          <Alert severity="info" sx={{ mb: 2 }}>
            <Typography variant="body2">
              <strong>Photo Tips:</strong> Include exterior shots, reception area, consultation rooms, and equipment. 
              High-quality photos increase buyer interest by up to 40%.
            </Typography>
          </Alert>
        </Grid>

        {/* Photo Upload Area */}
        <Grid item xs={12}>
          <Box
            sx={{
              border: `2px dashed ${dragActive ? '#2196F3' : '#e0e0e0'}`,
              borderRadius: 2,
              p: 4,
              textAlign: 'center',
              backgroundColor: dragActive ? 'rgba(33, 150, 243, 0.04)' : 'rgba(0, 0, 0, 0.02)',
              cursor: 'pointer',
              transition: 'all 0.3s ease',
              '&:hover': {
                borderColor: '#2196F3',
                backgroundColor: 'rgba(33, 150, 243, 0.04)',
              },
            }}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileInputChange}
              style={{ display: 'none' }}
            />
            
            <CloudUpload sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {dragActive ? 'Drop photos here' : 'Upload Photos'}
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Drag and drop photos here, or click to browse
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Supported formats: JPG, PNG, WebP • Max size: 5MB per photo
            </Typography>
            
            <Box sx={{ mt: 2 }}>
              <Button
                variant="outlined"
                startIcon={<PhotoCamera />}
                onClick={(e) => {
                  e.stopPropagation();
                  fileInputRef.current?.click();
                }}
              >
                Choose Photos
              </Button>
            </Box>
          </Box>
        </Grid>

        {/* Photo Previews */}
        {(existingMedia.length > 0 || photoPreviews.length > 0) && (
          <Grid item xs={12}>
            <Typography variant="subtitle1" gutterBottom sx={{ fontWeight: 600 }}>
              Photos ({existingMedia.length + photoPreviews.length})
              {existingMedia.length > 0 && photoPreviews.length > 0 && (
                <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 1 }}>
                  ({existingMedia.length} existing, {photoPreviews.length} new)
                </Typography>
              )}
            </Typography>
            <Grid container spacing={2}>
              {/* Existing Media Files */}
              {existingMedia.map((media, index) => (
                <Grid item xs={6} sm={4} md={3} key={`existing-${media.id}`}>
                  <Box
                    sx={{
                      position: 'relative',
                      aspectRatio: '1',
                      borderRadius: 2,
                      overflow: 'hidden',
                      border: media.is_primary ? '3px solid #2196F3' : '1px solid #e0e0e0',
                      boxShadow: media.is_primary ? '0 4px 12px rgba(33, 150, 243, 0.3)' : 1,
                    }}
                  >
                    <img
                      src={getImageUrl(media.file_url)}
                      alt={media.file_name}
                      style={{
                        width: '100%',
                        height: '100%',
                        objectFit: 'cover',
                      }}
                      onError={(e) => {
                        // Fallback for broken images
                        (e.target as HTMLImageElement).src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iMjAwIiBoZWlnaHQ9IjIwMCIgZmlsbD0iI2Y1ZjVmNSIvPgogIDx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMTQiIGZpbGw9IiM5OTkiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGR5PSIuM2VtIj5JbWFnZSBub3QgZm91bmQ8L3RleHQ+Cjwvc3ZnPg==';
                      }}
                    />
                    
                    {/* Primary Photo Badge */}
                    {media.is_primary && (
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          left: 8,
                          backgroundColor: '#2196F3',
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                        }}
                      >
                        PRIMARY
                      </Box>
                    )}
                    
                    {/* Action Buttons */}
                    <Box
                      sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        display: 'flex',
                        gap: 0.5,
                      }}
                    >
                      <IconButton
                        size="small"
                        onClick={() => setExistingMediaPrimary(media.id)}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                        }}
                      >
                        {media.is_primary ? (
                          <Star sx={{ fontSize: 16, color: '#FFC107' }} />
                        ) : (
                          <StarBorder sx={{ fontSize: 16 }} />
                        )}
                      </IconButton>
                      <IconButton
                        size="small"
                        onClick={() => handleRemoveMedia(media.id)}
                        sx={{
                          backgroundColor: 'rgba(255, 255, 255, 0.9)',
                          '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                        }}
                        title="Remove photo"
                      >
                        <Delete sx={{ fontSize: 16, color: '#f44336' }} />
                      </IconButton>
                    </Box>
                    
                    {/* Photo Number */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.75rem',
                      }}
                    >
                      {index + 1}
                    </Box>
                    
                    {/* Existing Badge */}
                    <Box
                      sx={{
                        position: 'absolute',
                        bottom: 8,
                        right: 8,
                        backgroundColor: 'rgba(76, 175, 80, 0.9)',
                        color: 'white',
                        px: 1,
                        py: 0.5,
                        borderRadius: 1,
                        fontSize: '0.65rem',
                        fontWeight: 600,
                      }}
                    >
                      SAVED
                    </Box>
                  </Box>
                </Grid>
              ))}
              
              {/* New Photo Previews */}
              {photoPreviews.map((preview, index) => {
                const adjustedIndex = existingMedia.length + index;
                const isNewPrimary = primaryPhotoIndex === adjustedIndex;
                
                return (
                  <Grid item xs={6} sm={4} md={3} key={`new-${index}`}>
                    <Box
                      sx={{
                        position: 'relative',
                        aspectRatio: '1',
                        borderRadius: 2,
                        overflow: 'hidden',
                        border: isNewPrimary ? '3px solid #2196F3' : '1px solid #e0e0e0',
                        boxShadow: isNewPrimary ? '0 4px 12px rgba(33, 150, 243, 0.3)' : 1,
                      }}
                    >
                      <img
                        src={preview}
                        alt={`New Preview ${index + 1}`}
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                      />
                      
                      {/* Primary Photo Badge */}
                      {isNewPrimary && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: 8,
                            left: 8,
                            backgroundColor: '#2196F3',
                            color: 'white',
                            px: 1,
                            py: 0.5,
                            borderRadius: 1,
                            fontSize: '0.75rem',
                            fontWeight: 600,
                          }}
                        >
                          PRIMARY
                        </Box>
                      )}
                      
                      {/* Action Buttons */}
                      <Box
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          display: 'flex',
                          gap: 0.5,
                        }}
                      >
                        <IconButton
                          size="small"
                          onClick={() => setPrimaryPhoto(adjustedIndex)}
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                          }}
                        >
                          {isNewPrimary ? (
                            <Star sx={{ fontSize: 16, color: '#FFC107' }} />
                          ) : (
                            <StarBorder sx={{ fontSize: 16 }} />
                          )}
                        </IconButton>
                        <IconButton
                          size="small"
                          onClick={() => removePhoto(index)}
                          sx={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' },
                          }}
                        >
                          <Delete sx={{ fontSize: 16, color: '#f44336' }} />
                        </IconButton>
                      </Box>
                      
                      {/* Photo Number */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          left: 8,
                          backgroundColor: 'rgba(0, 0, 0, 0.7)',
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.75rem',
                        }}
                      >
                        {adjustedIndex + 1}
                      </Box>
                      
                      {/* New Badge */}
                      <Box
                        sx={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          backgroundColor: 'rgba(255, 152, 0, 0.9)',
                          color: 'white',
                          px: 1,
                          py: 0.5,
                          borderRadius: 1,
                          fontSize: '0.65rem',
                          fontWeight: 600,
                        }}
                      >
                        NEW
                      </Box>
                    </Box>
                  </Grid>
                );
              })}
            </Grid>
            
            {/* Upload Progress */}
            {uploadProgress > 0 && uploadProgress < 100 && (
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Typography variant="body2" color="primary">
                    Uploading photos...
                  </Typography>
                  <Chip 
                    label={`${uploadProgress}%`} 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                  />
                </Box>
                <LinearProgress 
                  variant="determinate" 
                  value={uploadProgress} 
                  sx={{ 
                    height: 6, 
                    borderRadius: 3,
                    backgroundColor: 'rgba(33, 150, 243, 0.1)',
                    '& .MuiLinearProgress-bar': {
                      borderRadius: 3,
                      background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                    }
                  }} 
                />
              </Box>
            )}
          </Grid>
        )}

        {/* Financial Information Section */}
        <Grid item xs={12} sx={{ mt: 3 }}>
          <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'primary.main' }}>
            Financial Information
          </Typography>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <FormFieldWrapper fieldPath="financial_data.asking_price">
            <Controller
              name="asking_price"
              control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Asking Price (£)"
                error={!!errors.asking_price}
                helperText={errors.asking_price?.message}
                onChange={(e) => field.onChange(Number(e.target.value) || null)}
              />
            )}
          />
          </FormFieldWrapper>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.annual_revenue"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Annual Revenue (£)"
                error={!!errors.business_details?.annual_revenue}
                helperText={errors.business_details?.annual_revenue?.message}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
            )}
          />
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Controller
            name="business_details.net_profit"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                type="number"
                label="Net Profit (£)"
                error={!!errors.business_details?.net_profit}
                helperText={errors.business_details?.net_profit?.message}
                onChange={(e) => field.onChange(Number(e.target.value) || 0)}
              />
            )}
          />
        </Grid>
      </Grid>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" width={100} height={40} sx={{ mb: 3 }} />
        <Skeleton variant="rectangular" width="100%" height={600} />
      </Container>
    );
  }

  if (!listing) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          Listing not found
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.MY_LISTINGS)}
        >
          Back to My Listings
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <IconButton onClick={() => navigate(ROUTES.MY_LISTINGS)} sx={{ mr: 2 }}>
            <ArrowBack />
          </IconButton>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>
            Edit Listing
          </Typography>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          {/* Only show Preview and Save Draft for draft listings (before submission) */}
          {listing.status === 'draft' && (
            <>
              <Button
                variant="outlined"
                startIcon={<Preview />}
                onClick={() => navigate(`${ROUTES.LISTING_DETAIL.replace(':id', listing.id)}`)}
              >
                Preview
              </Button>
              <Button
                variant="outlined"
                startIcon={<Save />}
                onClick={handleSaveDraft}
                disabled={saving}
              >
                Save Draft
              </Button>
            </>
          )}
          
          {/* For published listings, show View Live button */}
          {listing.status === 'published' && (
            <Button
              variant="outlined"
              startIcon={<Preview />}
              onClick={() => navigate(`${ROUTES.LISTING_DETAIL.replace(':id', listing.id)}`)}
            >
              View Live Listing
            </Button>
          )}
          
          {/* For listings under review/pending, no preview/draft options */}
          {(listing.status === 'pending' || listing.status === 'pending_approval' || listing.status === 'approved') && (
            <Typography variant="body2" color="text.secondary" sx={{ alignSelf: 'center' }}>
              Listing is under review - changes will be reviewed by admin
            </Typography>
          )}
        </Box>
      </Box>

      {/* Simple Pending Changes Info */}
      {pendingChanges && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2">
            You have {pendingChanges.total_changes} change(s) under review. Fields with pending changes show "Under Review" tags.
          </Typography>
        </Alert>
      )}

      {/* Status Alerts */}
      {listing && listing.status === 'published' && (
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Editing Active Listing
          </Typography>
          <Typography variant="body2">
            This listing is currently active and visible to buyers. Any changes you make will require admin review before being published. 
            The current version will remain visible to buyers until your changes are approved.
          </Typography>
        </Alert>
      )}

      {listing && listing.status === 'pending_approval' && (
        <Alert severity="warning" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Listing Under Review
          </Typography>
          <Typography variant="body2">
            This listing is currently being reviewed by our admin team. You can continue to make changes, 
            but they will need to be approved before the listing goes live.
          </Typography>
        </Alert>
      )}

      {listing && listing.status === 'rejected' && (
        <Alert severity="error" sx={{ mb: 3 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>
            Listing Rejected
          </Typography>
          <Typography variant="body2">
            This listing was rejected during review. Please address the feedback provided and resubmit for approval.
          </Typography>
        </Alert>
      )}

      {/* Form Content */}
      <Paper sx={{ p: 4, mb: 4 }}>
        {renderAllFields()}
      </Paper>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', justifyContent: listing.status === 'draft' ? 'space-between' : 'flex-end', gap: 2 }}>
        {/* Only show Save Draft for draft listings (before submission) */}
        {listing.status === 'draft' && (
          <Button
            variant="outlined"
            startIcon={<Save />}
            onClick={handleSaveDraft}
            disabled={saving}
          >
            Save Draft
          </Button>
        )}
        
        <Button
          variant="contained"
          onClick={handleSubmitForm}
          disabled={saving}
          sx={{
            background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
            boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
          }}
        >
          {saving ? 'Updating...' : 
           listing.status === 'draft' ? 'Submit for Review' :
           listing.status === 'published' ? 'Save Changes' : 
           'Update Listing'}
        </Button>
        </Box>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirmOpen}
          onClose={cancelRemoveMedia}
          aria-labelledby="delete-dialog-title"
          aria-describedby="delete-dialog-description"
        >
          <DialogTitle id="delete-dialog-title">
            Remove Photo
          </DialogTitle>
          <DialogContent>
            <Typography id="delete-dialog-description">
              Are you sure you want to remove this photo? This action cannot be undone.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={cancelRemoveMedia} color="primary">
              Cancel
            </Button>
            <Button onClick={confirmRemoveMedia} color="error" variant="contained">
              Remove
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  };
  
  export default EditListingPage;