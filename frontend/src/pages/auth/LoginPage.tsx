import React, { useState, useEffect } from 'react';
import {
  TextField,
  Button,
  Link,
  Alert,
  InputAdornment,
  IconButton,
  Divider,
  Stack,
  CircularProgress,
  Fade,
  Box,
  Typography,
  Chip,
  Paper,
} from '@mui/material';
import {
  Visibility,
  VisibilityOff,
  Email,
  Lock,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, Link as RouterLink, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '../../store';
import { loginUser, clearError, getCurrentUser } from '../../store/slices/authSlice';
import { ROUTES, VALIDATION_RULES } from '../../constants';
import type { LoginRequest } from '../../types';
import AuthLayout from '../../components/auth/AuthLayout';

// Validation schema
const loginSchema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .matches(VALIDATION_RULES.EMAIL_REGEX, 'Please enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(VALIDATION_RULES.PASSWORD_MIN_LENGTH, `Password must be at least ${VALIDATION_RULES.PASSWORD_MIN_LENGTH} characters`),
});


const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { isLoading, error } = useAppSelector((state) => state.auth);
  
  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors },
    watch,
    setValue,
  } = useForm<LoginRequest>({
    resolver: yupResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
    mode: 'onChange',
  });

  // Clear errors when component mounts
  useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  // Show success message if redirected from email verification
  useEffect(() => {
    const message = location.state?.message;
    const email = location.state?.email;
    
    if (message) {
      toast.success(message);
      
      // Pre-fill email if provided
      if (email) {
        setValue('email', email);
      }
      
      // Clear the state to prevent showing message on refresh
      navigate(ROUTES.LOGIN, { replace: true, state: {} });
    }
  }, [location.state, setValue, navigate]);


  const onSubmit = async (data: LoginRequest) => {
    try {
      dispatch(clearError());
      const result = await dispatch(loginUser(data));
      
      if (loginUser.fulfilled.match(result)) {
        toast.success('Welcome back! Login successful.');
        // Fetch user profile data after successful login
        dispatch(getCurrentUser());
        // Navigation will be handled by the ProtectedRoute component
      } else {
        toast.error(result.payload as string || 'Login failed');
      }
    } catch {
      toast.error('An unexpected error occurred');
    }
  };

  const handleTogglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  // Quick login function for development
  const quickLogin = (email: string, password: string) => {
    setValue('email', email);
    setValue('password', password);
    handleSubmit(onSubmit)();
  };

  // Watch form values for better UX
  const watchedValues = watch();
  const hasValues = watchedValues.email && watchedValues.password;

  return (
    <AuthLayout
      title="Welcome Back"
      subtitle="Sign in to your CareAcquire account"
    >
      {/* Error Alert */}
      <Fade in={!!error}>
        <div>
          {error && (
            <Alert 
              severity="error" 
              sx={{ mb: 3 }}
              onClose={() => dispatch(clearError())}
            >
              {error}
            </Alert>
          )}
        </div>
      </Fade>

      {/* Login Form */}
      <form onSubmit={handleSubmit(onSubmit)}>
        <Stack spacing={3}>
          {/* Email Field */}
          <Controller
            name="email"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Email Address"
                type="email"
                autoComplete="email"
                error={!!errors.email}
                helperText={errors.email?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Email color="action" />
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            )}
          />

          {/* Password Field */}
          <Controller
            name="password"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                fullWidth
                label="Password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                error={!!errors.password}
                helperText={errors.password?.message}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Lock color="action" />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        onClick={handleTogglePasswordVisibility}
                        edge="end"
                        aria-label="toggle password visibility"
                      >
                        {showPassword ? <VisibilityOff /> : <Visibility />}
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 2,
                  },
                }}
              />
            )}
          />

          {/* Forgot Password Link */}
          <Stack direction="row" justifyContent="flex-end">
            <Link
              component={RouterLink}
              to={ROUTES.FORGOT_PASSWORD}
              variant="body2"
              sx={{ 
                textDecoration: 'none',
                '&:hover': {
                  textDecoration: 'underline',
                },
              }}
            >
              Forgot your password?
            </Link>
          </Stack>

          {/* Submit Button */}
          <Button
            type="submit"
            fullWidth
            variant="contained"
            size="large"
            disabled={isLoading || !hasValues}
            sx={{
              py: 1.5,
              borderRadius: 2,
              fontSize: '1rem',
              fontWeight: 600,
              textTransform: 'none',
              position: 'relative',
            }}
          >
            {isLoading ? (
              <>
                <CircularProgress size={20} sx={{ mr: 1 }} />
                Signing In...
              </>
            ) : (
              'Sign In'
            )}
          </Button>
        </Stack>
      </form>

      {/* ===== DEV ONLY - Quick Login ===== */}
      {import.meta.env.DEV && (
        <Paper 
          elevation={0} 
          sx={{ 
            mt: 3, 
            p: 2, 
            bgcolor: '#fff3e0',
            border: '2px dashed #ff9800',
            borderRadius: 2 
          }}
        >
          <Typography variant="caption" sx={{ display: 'block', mb: 1, fontWeight: 600, color: '#e65100' }}>
            🔧 DEV ONLY - Quick Login
          </Typography>
          
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block', mb: 0.5 }}>
              👑 Admin
            </Typography>
            <Chip 
              label="admin@eaglehursttestdev.co.in"
              size="small"
              onClick={() => quickLogin('admin@eaglehursttestdev.co.in', 'admin123')}
              sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
            />
          </Box>

          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block', mb: 0.5 }}>
              🏥 Sellers
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              <Chip 
                label="Dr. Smith (GP)"
                size="small"
                onClick={() => quickLogin('dr.smith@eaglehursttestdev.co.in', 'seller123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
              <Chip 
                label="Dr. Jones (Dental)"
                size="small"
                onClick={() => quickLogin('dr.jones@eaglehursttestdev.co.in', 'seller123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
              <Chip 
                label="Dr. Wilson (Physio)"
                size="small"
                onClick={() => quickLogin('dr.wilson@eaglehursttestdev.co.in', 'seller123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
              <Chip 
                label="Dr. Brown (Clinic)"
                size="small"
                onClick={() => quickLogin('dr.brown@eaglehursttestdev.co.in', 'seller123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
            </Stack>
          </Box>

          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, color: '#666', display: 'block', mb: 0.5 }}>
              💼 Buyers
            </Typography>
            <Stack direction="row" spacing={0.5} flexWrap="wrap" gap={0.5}>
              <Chip 
                label="James (Investor)"
                size="small"
                onClick={() => quickLogin('james.investor@eaglehursttestdev.co.in', 'buyer123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
              <Chip 
                label="Sarah (Investment)"
                size="small"
                onClick={() => quickLogin('sarah.acquisition@eaglehursttestdev.co.in', 'buyer123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
              <Chip 
                label="Michael (Acquisition)"
                size="small"
                onClick={() => quickLogin('michael.buyer@eaglehursttestdev.co.in', 'buyer123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
              <Chip 
                label="Emma (NHS)"
                size="small"
                onClick={() => quickLogin('emma.healthcare@eaglehursttestdev.co.in', 'buyer123')}
                sx={{ cursor: 'pointer', fontSize: '0.7rem' }}
              />
            </Stack>
          </Box>
        </Paper>
      )}
      {/* ===== END DEV ONLY ===== */}

      {/* Divider */}
      <Divider sx={{ my: 4 }}>
        <span style={{ color: '#666', fontSize: '0.875rem' }}>or</span>
      </Divider>

      {/* Sign Up Link */}
      <Stack direction="row" justifyContent="center" spacing={1}>
        <span style={{ color: '#666' }}>Don't have an account?</span>
        <Link
          component={RouterLink}
          to={ROUTES.REGISTER}
          sx={{
            fontWeight: 600,
            textDecoration: 'none',
            color: 'primary.main',
            '&:hover': {
              textDecoration: 'underline',
            },
          }}
        >
          Create one here
        </Link>
      </Stack>

      {/* Version Info */}
      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Typography variant="caption" sx={{ color: '#999', fontSize: '0.75rem' }}>
          v1.0.2 • Build {new Date().toISOString().split('T')[0].replace(/-/g, '')} • {import.meta.env.MODE}
        </Typography>
      </Box>
    </AuthLayout>
  );
};

export default LoginPage;
