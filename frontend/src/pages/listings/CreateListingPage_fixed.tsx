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
import { ROUTES, BUSINESS_TYPES, VALIDATION_RULES } from '../../constants';
import type { CreateListingRequest } from '../../types';

const steps = ['Basic Information', 'Business Details', 'Financial Information', 'Review & Publish'];

interface FormData {
  title: string;
  description: string;
  business_type: string;
  location: string;
  asking_price: number;
  business_details: {
    practice_name: string;
    practice_type: string;
    nhs_contract: boolean;
    patient_list_size: number;
    staff_count: number;
    premises_type: string;
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
  const [isDraft, setIsDraft] = useState(true);

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    getValues,
  } = useForm<FormData>({
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

  const onSubmit = async (data: FormData) => {
    try {
      const listingData: CreateListingRequest = { ...data, is_draft: isDraft };
      const result = await dispatch(createListing(listingData));
      
      if (createListing.fulfilled.match(result)) {
        toast.success(isDraft ? 'Listing saved as draft!' : 'Listing submitted for approval!');
        navigate(ROUTES.SELLER_DASHBOARD);
      } else {
        toast.error('Failed to create listing');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    
    switch (activeStep) {
      case 0:
        fieldsToValidate = ['title', 'description', 'business_type', 'location'];
        break;
      case 1:
        fieldsToValidate = ['business_details'];
        break;
      case 2:
        fieldsToValidate = ['asking_price'];
        break;
    }

    const isStepValid = await trigger(fieldsToValidate as any);
    
    if (isStepValid) {
      if (activeStep === steps.length - 1) {
        handleSubmit(onSubmit)();
      } else {
        setActiveStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    setActiveStep((prev) => prev - 1);
  };

  const handleSaveDraft = () => {
    setIsDraft(true);
    handleSubmit(onSubmit)();
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <Grid container spacing={3}>
            <Grid xs={12}>
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
            
            <Grid xs={12} md={6}>
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
            
            <Grid xs={12} md={6}>
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
            
            <Grid xs={12}>
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
            <Grid xs={12} md={6}>
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
            
            <Grid xs={12} md={6}>
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
            
            <Grid xs={12} md={6}>
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
                  />
                )}
              />
            </Grid>
            
            <Grid xs={12} md={6}>
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
                  />
                )}
              />
            </Grid>
            
            <Grid xs={12} md={6}>
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
            
            <Grid xs={12} md={6}>
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
            <Grid xs={12} md={6}>
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
            
            <Grid xs={12} md={6}>
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
            
            <Grid xs={12} md={6}>
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
        const values = getValues();
        return (
          <Box>
            <Typography variant="h6" sx={{ mb: 3 }}>
              Review Your Listing
            </Typography>
            
            <Grid container spacing={3}>
              <Grid xs={12}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6" sx={{ mb: 2 }}>
                      {values.title}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
                      <Chip label={values.business_type} color="primary" />
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
            </Grid>
            
            <Alert severity="info" sx={{ mt: 3 }}>
              Your listing will be reviewed by our admin team before being published. 
              You can save it as a draft to continue editing later.
            </Alert>
          </Box>
        );

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
                disabled={isCreating}
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
