import React, { useState } from 'react';
import {
  TextField,
  Button,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
  FormControl,
  FormLabel,
  RadioGroup,
  FormControlLabel,
  Radio,
  Stepper,
  Step,
  StepLabel,
  Box,
  Typography,
  Paper,
  Container,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
  Person,
  Phone,
  ArrowBack,
  ArrowForward,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { motion } from 'framer-motion';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '../../store';
import { registerUser, clearError } from '../../store/slices/authSlice';
import { ROUTES, VALIDATION_RULES, USER_TYPES } from '../../constants';
import type { RegisterRequest } from '../../types';

// Validation schema
const registerSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`)
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .matches(/[a-z]/, 'Password must contain at least one lowercase letter')
    .matches(/[0-9]/, 'Password must contain at least one digit'),
  confirmPassword: yup
    .string()
    .required('Please confirm your password')
    .oneOf([yup.ref('password')], 'Passwords do not match'),
  first_name: yup
    .string()
    .required('First name is required')
    .min(VALIDATION_RULES.NAME_MIN_LENGTH, `First name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters`)
    .max(VALIDATION_RULES.NAME_MAX_LENGTH, `First name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  last_name: yup
    .string()
    .required('Last name is required')
    .min(VALIDATION_RULES.NAME_MIN_LENGTH, `Last name must be at least ${VALIDATION_RULES.NAME_MIN_LENGTH} characters`)
    .max(VALIDATION_RULES.NAME_MAX_LENGTH, `Last name must not exceed ${VALIDATION_RULES.NAME_MAX_LENGTH} characters`),
  phone: yup
    .string()
    .required('Phone number is required')
    .matches(VALIDATION_RULES.PHONE_REGEX, 'Please enter a valid UK phone number'),
  user_type: yup
    .string()
    .required('Please select your account type')
    .oneOf([USER_TYPES.BUYER, USER_TYPES.SELLER], 'Invalid account type'),
});

interface FormData extends RegisterRequest {
  confirmPassword: string;
}

const steps = ['Account Type', 'Personal Information', 'Account Security'];

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  
  const [activeStep, setActiveStep] = useState(0);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    trigger,
    watch,
    reset,
    getValues,
  } = useForm<FormData>({
    resolver: yupResolver(registerSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      first_name: '',
      last_name: '',
      phone: '',
      user_type: USER_TYPES.BUYER,
    },
    mode: 'onChange',
  });

  const watchedUserType = watch('user_type');

  const onSubmit = async (data: FormData) => {
    try {
      dispatch(clearError());
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { confirmPassword, ...registerData } = data;
      const result = await dispatch(registerUser(registerData));
      
      if (registerUser.fulfilled.match(result)) {
        toast.success('Registration successful! Please check your email for verification.');
        // Use secure verification token instead of exposing email in URL
        const verificationToken = result.payload?.verification_token;
        if (verificationToken) {
          const verifyUrl = `${ROUTES.VERIFY_EMAIL}?token=${verificationToken}`;
          
          // Force page navigation to ensure component unmounts and remounts
          window.location.href = verifyUrl;
        } else {
          toast.error('Verification token not received. Please try again.');
        }
      } else {
        // Show error but stay on current step - don't reset form
        const errorMessage = result.payload as string || 'Registration failed';
        toast.error(errorMessage);
        // Don't navigate away or reset form - user stays on current step to fix errors
      }
    } catch {
      toast.error('An unexpected error occurred');
      // Don't navigate away or reset form
    }
  };

  const handleNext = async () => {
    let fieldsToValidate: (keyof FormData)[] = [];
    
    switch (activeStep) {
      case 0:
        fieldsToValidate = ['user_type'];
        break;
      case 1:
        fieldsToValidate = ['first_name', 'last_name', 'phone'];
        break;
      case 2:
        fieldsToValidate = ['email', 'password', 'confirmPassword'];
        break;
    }

    const isStepValid = await trigger(fieldsToValidate);
    
    if (isStepValid) {
      if (activeStep === steps.length - 1) {
        handleSubmit(onSubmit)();
      } else {
        // Clear email and password fields when moving from step 1 to step 2
        if (activeStep === 1) {
          const currentValues = getValues();
          reset({
            ...currentValues,
            email: '',
            password: '',
            confirmPassword: '',
          });
        }
        setActiveStep((prev) => prev + 1);
      }
    }
  };

  const handleBack = () => {
    // Clear email and password fields when going back from step 2 to step 1
    if (activeStep === 2) {
      const currentValues = getValues();
      reset({
        ...currentValues,
        email: '',
        password: '',
        confirmPassword: '',
      });
    }
    setActiveStep((prev) => prev - 1);
  };

  const renderStepContent = (step: number) => {
    switch (step) {
      case 0:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <FormControl component="fieldset" fullWidth>
              <FormLabel component="legend" sx={{ mb: 2, fontWeight: 600 }}>
                What type of account would you like to create?
              </FormLabel>
              <Controller
                name="user_type"
                control={control}
                render={({ field }) => (
                  <RadioGroup {...field} sx={{ gap: 2 }}>
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: watchedUserType === USER_TYPES.BUYER ? 2 : 1,
                        borderColor: watchedUserType === USER_TYPES.BUYER ? 'primary.main' : 'divider',
                        backgroundColor: watchedUserType === USER_TYPES.BUYER ? 'primary.50' : 'transparent',
                      }}
                      onClick={() => field.onChange(USER_TYPES.BUYER)}
                    >
                      <FormControlLabel
                        value={USER_TYPES.BUYER}
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Buyer Account
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              Browse and connect with medical business sellers
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </Paper>
                    
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 2,
                        borderRadius: 2,
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        border: watchedUserType === USER_TYPES.SELLER ? 2 : 1,
                        borderColor: watchedUserType === USER_TYPES.SELLER ? 'primary.main' : 'divider',
                        backgroundColor: watchedUserType === USER_TYPES.SELLER ? 'primary.50' : 'transparent',
                      }}
                      onClick={() => field.onChange(USER_TYPES.SELLER)}
                    >
                      <FormControlLabel
                        value={USER_TYPES.SELLER}
                        control={<Radio />}
                        label={
                          <Box>
                            <Typography variant="h6" sx={{ fontWeight: 600 }}>
                              Seller Account
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              List your medical business for sale or investment
                            </Typography>
                          </Box>
                        }
                        sx={{ m: 0, width: '100%' }}
                      />
                    </Paper>
                  </RadioGroup>
                )}
              />
              {errors.user_type && (
                <Typography variant="caption" color="error" sx={{ mt: 1 }}>
                  {errors.user_type.message}
                </Typography>
              )}
            </FormControl>
          </motion.div>
        );

      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Stack spacing={3}>
              <Controller
                name="first_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="First Name"
                    error={!!errors.first_name}
                    helperText={errors.first_name?.message}
                    autoComplete="given-name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="last_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Last Name"
                    error={!!errors.last_name}
                    helperText={errors.last_name?.message}
                    autoComplete="family-name"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Person color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="phone"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Phone Number"
                    placeholder="+44 7XXX XXXXXX"
                    error={!!errors.phone}
                    helperText={errors.phone?.message || 'UK phone number required'}
                    autoComplete="tel"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Phone color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Stack>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.3 }}
          >
            <Stack spacing={3}>
              <Controller
                name="email"
                control={control}
                key="email-field"
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Email Address"
                    type="email"
                    error={!!errors.email}
                    helperText={errors.email?.message}
                    autoComplete="email"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Email color="action" />
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />

              <Controller
                name="password"
                control={control}
                key="password-field"
                render={({ field }) => (
                  <Box>
                    <TextField
                      {...field}
                      fullWidth
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      error={!!errors.password}
                      helperText={errors.password?.message}
                      autoComplete="new-password"
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">
                            <Lock color="action" />
                          </InputAdornment>
                        ),
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword(!showPassword)}
                              edge="end"
                            >
                              {showPassword ? <VisibilityOff /> : <Visibility />}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                    {!errors.password && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        Password must contain: 8+ characters, uppercase letter, lowercase letter, and digit
                      </Typography>
                    )}
                  </Box>
                )}
              />

              <Controller
                name="confirmPassword"
                control={control}
                key="confirm-password-field"
                render={({ field }) => (
                  <TextField
                    {...field}
                    fullWidth
                    label="Confirm Password"
                    type={showConfirmPassword ? 'text' : 'password'}
                    error={!!errors.confirmPassword}
                    helperText={errors.confirmPassword?.message}
                    autoComplete="new-password"
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Lock color="action" />
                        </InputAdornment>
                      ),
                      endAdornment: (
                        <InputAdornment position="end">
                          <IconButton
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                            edge="end"
                          >
                            {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                          </IconButton>
                        </InputAdornment>
                      ),
                    }}
                  />
                )}
              />
            </Stack>
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'grey.50',
        py: 4,
      }}
    >
      <Container maxWidth="md">
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Paper
            elevation={3}
            sx={{
              p: { xs: 3, sm: 4 },
              borderRadius: 3,
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.1)',
            }}
          >
            {/* Header */}
            <Box sx={{ textAlign: 'center', mb: 4 }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={() => navigate(ROUTES.HOME)}
                sx={{ mb: 2, alignSelf: 'flex-start' }}
              >
                Back to Home
              </Button>
              
              <Typography
                variant="h4"
                sx={{
                  fontWeight: 700,
                  color: 'primary.main',
                  mb: 1,
                }}
              >
                Create Your Account
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Join the UK's premier medical business marketplace
              </Typography>
            </Box>

            {/* Stepper */}
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
            <Box sx={{ mb: 4, minHeight: 300 }}>
              <form autoComplete="off" key={`step-${activeStep}`}>
                {renderStepContent(activeStep)}
              </form>
            </Box>

            {/* Navigation Buttons */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
              <Button
                onClick={handleBack}
                disabled={activeStep === 0}
                sx={{ visibility: activeStep === 0 ? 'hidden' : 'visible' }}
              >
                Back
              </Button>
              
              <Button
                variant="contained"
                onClick={handleNext}
                disabled={isLoading}
                endIcon={activeStep === steps.length - 1 ? undefined : <ArrowForward />}
                sx={{
                  px: 4,
                  py: 1.5,
                  borderRadius: 2,
                  fontWeight: 600,
                }}
              >
                {activeStep === steps.length - 1 
                  ? (isLoading ? 'Creating Account...' : 'Create Account')
                  : 'Next'
                }
              </Button>
            </Box>

            {/* Divider */}
            <Divider sx={{ my: 3 }}>
              <Typography variant="body2" color="text.secondary">
                or
              </Typography>
            </Divider>

            {/* Sign In Link */}
            <Box sx={{ textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                Already have an account?{' '}
                <Link
                  component={RouterLink}
                  to={ROUTES.LOGIN}
                  sx={{
                    fontWeight: 600,
                    textDecoration: 'none',
                    color: 'primary.main',
                  }}
                >
                  Sign in here
                </Link>
              </Typography>
            </Box>
          </Paper>
        </motion.div>
      </Container>
    </Box>
  );
};

export default RegisterPage;
