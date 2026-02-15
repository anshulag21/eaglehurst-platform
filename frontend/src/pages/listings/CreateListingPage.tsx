import React, { useState } from 'react';
import {
  Container,
  Typography,
  Stepper,
  Step,
  StepLabel,
  Card,
  CardContent,
  Button,
  TextField,
  Grid,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Box,
  Stack,
  Chip,
  Alert,
  InputAdornment,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  Save,
  Publish,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '../../store';
import { createListing } from '../../store/slices/listingSlice';
import { ROUTES } from '../../constants';
import type { CreateListingRequest } from '../../types';
import { userService } from '../../services/user.service';
import { listingService } from '../../services/listing.service';
import ImageUpload, { UploadedImage } from '../../components/common/ImageUpload';

const steps = ['Basic Information', 'Business Details', 'Financial Information', 'Images', 'Review & Publish'];

interface ListingFormData {
  title: string;
  description: string;
  business_type: 'full_sale' | 'partial_sale' | 'fundraising';
  location: string;
  asking_price: number;
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

const listingSchema = yup.object({
  title: yup
    .string()
    .required('Title is required')
    .min(10, 'Title must be at least 10 characters')
    .max(100, 'Title must not exceed 100 characters'),
  description: yup
    .string()
    .required('Description is required')
    .min(50, 'Description must be at least 50 characters')
    .max(1000, 'Description must not exceed 1000 characters'),
  business_type: yup
    .string()
    .required('Business type is required')
    .oneOf(['full_sale', 'partial_sale', 'fundraising'], 'Invalid business type'),
  location: yup.string().required('Location is required'),
  asking_price: yup.number().positive('Price must be positive').required('Asking price is required'),
  business_details: yup.object({
    practice_name: yup.string().required('Practice name is required'),
    practice_type: yup.string().required('Practice type is required'),
    nhs_contract: yup.boolean().required(),
    patient_list_size: yup.number().positive('Patient list size must be positive').required('Patient list size is required'),
    staff_count: yup.number().min(0, 'Staff count cannot be negative').required('Staff count is required'),
    premises_type: yup.string().oneOf(['owned', 'leased'], 'Invalid premises type').required('Premises type is required'),
    cqc_registered: yup.boolean().required(),
    annual_revenue: yup.number().positive('Annual revenue must be positive').required('Annual revenue is required'),
    net_profit: yup.number().required('Net profit is required'),
  }),
});

const CreateListingPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isCreating, error } = useAppSelector((state) => state.listings);
  
  const [activeStep, setActiveStep] = useState(0);
  const [isDraft, setIsDraft] = useState(false);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [isUploadingImages, setIsUploadingImages] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<ListingFormData>({
    resolver: yupResolver(listingSchema),
    defaultValues: {
      title: '',
      description: '',
      business_type: 'full_sale',
      location: '',
      asking_price: 0,
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
    mode: 'onChange',
  });

  const onSubmit = async (data: ListingFormData, forceDraft?: boolean) => {
    try {
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
      };
      
      // Use forceDraft parameter if provided, otherwise use isDraft state
      const shouldBeDraft = forceDraft !== undefined ? forceDraft : isDraft;
      
      const listingData: CreateListingRequest = {
        ...baseData,
        financial_data: financialData,
        business_details: businessDetailsData,
        is_draft: shouldBeDraft
      };
      
      const result = await dispatch(createListing(listingData));
      
      // If listing creation successful and we have images, upload them
      if (createListing.fulfilled.match(result) && images.length > 0) {
        const listingId = (result.payload as { listing_id: string }).listing_id;
        await uploadImages(listingId);
      }
      
      if (createListing.fulfilled.match(result)) {
        toast.success(shouldBeDraft ? 'Listing saved as draft!' : 'Listing submitted for approval!');
        navigate(ROUTES.SELLER_DASHBOARD);
      } else {
        // Check if the error is due to missing seller profile or verification
        const error = result.payload as { error?: { message?: string } };
        if (error?.error?.message === 'Seller profile not found') {
          toast.error('Creating seller profile...');
          
          try {
            // Attempt to create seller profile
            const profileResult = await userService.createSellerProfile();
            
            if (profileResult.success) {
              toast.success('Seller profile created! Please try creating the listing again.');
              // Retry listing creation
              const retryResult = await dispatch(createListing(listingData));
              if (createListing.fulfilled.match(retryResult)) {
                toast.success(shouldBeDraft ? 'Listing saved as draft!' : 'Listing submitted for approval!');
                navigate(ROUTES.SELLER_DASHBOARD);
              } else {
                toast.error('Failed to create listing after profile creation');
              }
            } else {
              toast.error('Failed to create seller profile. Please contact support.');
            }
          } catch (profileError) {
            console.error('Error creating seller profile:', profileError);
            toast.error('Failed to create seller profile. Please contact support.');
          }
        } else if (error?.error?.message === 'Seller verification required to create listings') {
          // Redirect to verification page
          toast.error('Seller verification required to create listings');
          toast('Redirecting to verification page...');
          
          setTimeout(() => {
            navigate(ROUTES.KYC_UPLOAD);
          }, 2000);
        } else {
          toast.error('Failed to create listing');
        }
      }
    } catch (err) {
      console.error('Error creating listing:', err);
      toast.error('An unexpected error occurred');
    }
  };

  const uploadImages = async (listingId: string) => {
    if (images.length === 0) return;

    setIsUploadingImages(true);
    setUploadProgress(0);

    try {
      const filesToUpload = images.filter(img => img.file).map(img => img.file!);
      
      if (filesToUpload.length > 0) {
        const response = await listingService.uploadListingMedia(
          listingId,
          filesToUpload,
          (progress) => setUploadProgress(progress)
        );

        if (response.success) {
          toast.success(`Successfully uploaded ${filesToUpload.length} image(s)`);
        } else {
          toast.error('Failed to upload some images');
        }
      }
    } catch (error) {
      console.error('Error uploading images:', error);
      toast.error('Failed to upload images');
    } finally {
      setIsUploadingImages(false);
      setUploadProgress(0);
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: string[] = [];
    
    switch (activeStep) {
      case 0:
        fieldsToValidate = ['title', 'description', 'business_type', 'location'];
        break;
      case 1:
        fieldsToValidate = [
          'business_details.practice_name',
          'business_details.practice_type',
          'business_details.nhs_contract',
          'business_details.patient_list_size',
          'business_details.staff_count',
          'business_details.premises_type',
          'business_details.cqc_registered'
        ];
        break;
      case 2:
        fieldsToValidate = [
          'asking_price',
          'business_details.annual_revenue',
          'business_details.net_profit'
        ];
        break;
      case 3:
        // Images step - no validation required, images are optional
        break;
    }

    const isStepValid = fieldsToValidate.length === 0 || await trigger(fieldsToValidate as (keyof ListingFormData)[]);
    
    if (isStepValid) {
      if (activeStep === steps.length - 1) {
        // Submit for review (not draft)
        handleSubmit((data) => onSubmit(data, false))();
      } else {
        setActiveStep((prev) => prev + 1);
      }
    } else {
      // Show validation errors to user
      console.log('Validation failed for step:', activeStep);
      console.log('Fields being validated:', fieldsToValidate);
      console.log('Current errors:', errors);
      
      // Find specific errors for the fields being validated
      const stepErrors = fieldsToValidate.filter((field: string) => {
        const fieldPath = field.split('.');
        if (fieldPath.length === 1) {
          return errors[fieldPath[0] as keyof typeof errors];
        } else if (fieldPath.length === 2) {
          const parentField = errors[fieldPath[0] as keyof typeof errors] as Record<string, any>;
          return parentField && parentField[fieldPath[1]];
        }
        return false;
      });
      
      if (stepErrors.length > 0) {
        toast.error(`Please fix the validation errors before proceeding. Fields with errors: ${stepErrors.join(', ')}`);
      } else {
        toast.error('Please fix the validation errors before proceeding');
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSaveDraft = () => {
    handleSubmit((data) => onSubmit(data, true))();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12}>
              <Controller
                name="title"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Listing Title"
                    placeholder="e.g., Established GP Practice in Central London"
                    error={!!errors.title}
                    helperText={errors.title?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Controller
                name="business_type"
                control={control}
                render={({ field }) => (
                  <FormControl fullWidth error={!!errors.business_type}>
                    <InputLabel>Business Type</InputLabel>
                    <Select {...field} label="Business Type">
                      <MenuItem value="full_sale">Full Business Sale</MenuItem>
                      <MenuItem value="partial_sale">Partial Business Sale</MenuItem>
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
                    placeholder="e.g., London, Manchester, Birmingham"
                    error={!!errors.location}
                    helperText={errors.location?.message}
                  />
                )}
              />
            </Grid>
            
            <Grid item xs={12}>
              <Controller
                name="description"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    multiline
                    rows={6}
                    label="Description"
                    placeholder="Provide a detailed description of your medical business..."
                    error={!!errors.description}
                    helperText={errors.description?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 1:
        return (
          <Grid container spacing={3}>
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
                  <FormControl fullWidth error={!!errors.business_details?.practice_type}>
                    <InputLabel>Practice Type</InputLabel>
                    <Select {...field} label="Practice Type">
                      <MenuItem value="GP Practice">GP Practice</MenuItem>
                      <MenuItem value="Dental Practice">Dental Practice</MenuItem>
                      <MenuItem value="Pharmacy">Pharmacy</MenuItem>
                      <MenuItem value="Specialist Clinic">Specialist Clinic</MenuItem>
                      <MenuItem value="Other">Other</MenuItem>
                    </Select>
                    {errors.business_details?.practice_type && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {errors.business_details.practice_type.message}
                      </Typography>
                    )}
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
                  <FormControl fullWidth error={!!errors.business_details?.premises_type}>
                    <InputLabel>Premises Type</InputLabel>
                    <Select {...field} label="Premises Type">
                      <MenuItem value="owned">Owned</MenuItem>
                      <MenuItem value="leased">Leased</MenuItem>
                    </Select>
                    {errors.business_details?.premises_type && (
                      <Typography variant="caption" color="error" sx={{ mt: 0.5, ml: 1.5 }}>
                        {errors.business_details.premises_type.message}
                      </Typography>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
            
            <Grid item xs={12} md={6}>
              <Stack spacing={2}>
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
              </Stack>
            </Grid>
          </Grid>
        );

      case 2:
        return (
          <Grid container spacing={3}>
            <Grid item xs={12} md={6}>
              <Controller
                name="asking_price"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    type="number"
                    label="Asking Price"
                    error={!!errors.asking_price}
                    helperText={errors.asking_price?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    }}
                  />
                )}
              />
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
                    label="Annual Revenue"
                    error={!!errors.business_details?.annual_revenue}
                    helperText={errors.business_details?.annual_revenue?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    }}
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
                    label="Net Profit"
                    error={!!errors.business_details?.net_profit}
                    helperText={errors.business_details?.net_profit?.message}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">£</InputAdornment>,
                    }}
                  />
                )}
              />
            </Grid>
          </Grid>
        );

      case 3:
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Upload Images
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Add high-quality images to showcase your medical practice. The first image will be used as the primary listing image.
            </Typography>
            
            <ImageUpload
              images={images}
              onImagesChange={setImages}
              maxImages={10}
              maxFileSize={10}
              disabled={isUploadingImages}
              showProgress={isUploadingImages}
              uploadProgress={uploadProgress}
            />
          </Box>
        );

      case 4: {
        const values = getValues() as ListingFormData;
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Review Your Listing
            </Typography>
            
            <Grid container spacing={3}>
              {/* Basic Information */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {values.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip label={values.business_type?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} color="primary" />
                      <Chip label={values.location} variant="outlined" />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                      {values.description}
                    </Typography>
                    <Typography variant="h5" color="success.main" sx={{ fontWeight: 700 }}>
                      £{values.asking_price?.toLocaleString()}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>

              {/* Business Details */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Business Details
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Practice Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {values.business_details?.practice_name || 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Practice Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {values.business_details?.practice_type || 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Patient List Size
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {values.business_details?.patient_list_size?.toLocaleString() || '0'} patients
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Staff Count
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {values.business_details?.staff_count || '0'} staff members
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Premises Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {values.business_details?.premises_type?.charAt(0).toUpperCase() + values.business_details?.premises_type?.slice(1) || 'Not specified'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          NHS Contract
                        </Typography>
                        <Chip 
                          label={values.business_details?.nhs_contract ? 'Yes' : 'No'} 
                          color={values.business_details?.nhs_contract ? 'success' : 'default'}
                          size="small"
                        />
                      </Grid>
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          CQC Registered
                        </Typography>
                        <Chip 
                          label={values.business_details?.cqc_registered ? 'Yes' : 'No'} 
                          color={values.business_details?.cqc_registered ? 'success' : 'default'}
                          size="small"
                        />
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>

              {/* Financial Information */}
              <Grid item xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      Financial Information
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Asking Price
                        </Typography>
                        <Typography variant="h6" color="success.main" sx={{ fontWeight: 700 }}>
                          £{values.asking_price?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Annual Revenue
                        </Typography>
                        <Typography variant="h6" color="primary.main" sx={{ fontWeight: 600 }}>
                          £{values.business_details?.annual_revenue?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          Net Profit
                        </Typography>
                        <Typography variant="h6" color="info.main" sx={{ fontWeight: 600 }}>
                          £{values.business_details?.net_profit?.toLocaleString() || '0'}
                        </Typography>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
              
              {/* Images Preview */}
              {images.length > 0 && (
                <Grid item xs={12}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="h6" sx={{ mb: 2 }}>
                        Images ({images.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {images.slice(0, 4).map((image, index) => (
                          <Grid item xs={6} sm={3} key={index}>
                            <Box
                              component="img"
                              src={image.url}
                              alt={image.name}
                              sx={{
                                width: '100%',
                                height: 120,
                                objectFit: 'cover',
                                borderRadius: 1,
                                border: image.isPrimary ? '2px solid' : '1px solid',
                                borderColor: image.isPrimary ? 'primary.main' : 'grey.300',
                              }}
                            />
                            {image.isPrimary && (
                              <Typography variant="caption" color="primary" sx={{ display: 'block', mt: 0.5 }}>
                                Primary Image
                              </Typography>
                            )}
                          </Grid>
                        ))}
                        {images.length > 4 && (
                          <Grid item xs={6} sm={3}>
                            <Box
                              sx={{
                                width: '100%',
                                height: 120,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                bgcolor: 'grey.100',
                                borderRadius: 1,
                                border: '1px solid',
                                borderColor: 'grey.300',
                              }}
                            >
                              <Typography variant="body2" color="text.secondary">
                                +{images.length - 4} more
                              </Typography>
                            </Box>
                          </Grid>
                        )}
                      </Grid>
                    </CardContent>
                  </Card>
                </Grid>
              )}
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              Your listing will be reviewed by our admin team before being published. 
              You can save it as a draft to continue editing later.
            </Alert>
          </Box>
        );
      }

      default:
        return null;
    }
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.SELLER_DASHBOARD)}
          sx={{ mb: 2 }}
        >
          Back to Dashboard
        </Button>
        
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Create New Listing
        </Typography>
        <Typography variant="body1" color="text.secondary">
          List your medical business for sale or investment
        </Typography>
      </Box>

      {/* Stepper */}
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Stepper activeStep={activeStep} sx={{ mb: 4 }}>
            {steps.map((label) => (
              <Step key={label}>
                <StepLabel>{label}</StepLabel>
              </Step>
            ))}
          </Stepper>

          {/* Error Alert */}
          {error && (
            <Alert severity="error" sx={{ mb: 3 }}>
              {error}
            </Alert>
          )}

          {/* Step Content */}
          <motion.div
            key={activeStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Box sx={{ minHeight: 400 }}>
              {renderStepContent(activeStep)}
            </Box>
          </motion.div>

          {/* Navigation */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 4 }}>
            <Button
              onClick={handleBack}
              disabled={activeStep === 0}
              sx={{ visibility: activeStep === 0 ? 'hidden' : 'visible' }}
            >
              Back
            </Button>
            
            <Stack direction="row" spacing={2}>
              {activeStep === steps.length - 1 && (
                <Button
                  variant="outlined"
                  onClick={handleSaveDraft}
                  disabled={isCreating}
                  startIcon={<Save />}
                >
                  Save as Draft
                </Button>
              )}
              
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={isCreating || isUploadingImages}
                endIcon={activeStep === steps.length - 1 ? <Publish /> : <ArrowForward />}
              >
                {activeStep === steps.length - 1 
                  ? (isCreating ? 'Publishing...' : 'Submit for Review')
                  : 'Next'
                }
              </Button>
            </Stack>
          </Box>
        </CardContent>
      </Card>
    </Container>
  );
};

export default CreateListingPage;
