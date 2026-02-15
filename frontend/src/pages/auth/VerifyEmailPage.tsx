import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  TextField,
  Typography,
  Container,
  Paper,
  Alert,
  CircularProgress,
  Stack,
  Divider,
  Link,
} from '@mui/material';
import {
  Email,
  VerifiedUser,
  Refresh,
  CheckCircle,
} from '@mui/icons-material';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';

import { ROUTES } from '../../constants';
import AuthLayout from '../../components/auth/AuthLayout';
import { authService } from '../../services/auth.service';
import { apiService } from '../../services/api';

// Validation schema
const verificationSchema = yup.object({
  otp: yup
    .string()
    .required('OTP is required')
    .matches(/^\d{6}$/, 'OTP must be exactly 6 digits'),
});

interface VerificationFormData {
  otp: string;
}

interface VerificationTokenResponse {
  email: string;
  user_id: string;
  expires_at: string;
  user_type: string;
}

const VerifyEmailPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  // Get verification token from URL params
  const verificationToken = searchParams.get('token');
  
  // State for verification details
  const [email, setEmail] = useState<string>('');
  const [tokenLoading, setTokenLoading] = useState(true);
  const [tokenError, setTokenError] = useState<string>('');
  
  
  // Set page title
  useEffect(() => {
    document.title = 'Verify Email - CareAcquire';
    return () => {
      document.title = 'CareAcquire';
    };
  }, []);
  
  // Fetch verification details by token
  useEffect(() => {
    const fetchVerificationDetails = async () => {
      if (!verificationToken) {
        setTokenError('Invalid verification link. Please check your email for the correct link.');
        setTokenLoading(false);
        return;
      }
      
      try {
        setTokenLoading(true);
        const response = await apiService.get<VerificationTokenResponse>(`/auth/verify-token/${verificationToken}`);
        
        if (response.success && response.data) {
          setEmail(response.data.email);
          setTokenError('');
        } else {
          // Handle specific error cases
          if (response.error?.message?.includes('already verified')) {
            // User is already verified, redirect to login
            toast.success('Your account is already verified! Please login.');
            navigate(ROUTES.LOGIN, { replace: true });
            return;
          } else {
            setTokenError(response.error?.message || 'Invalid or expired verification link.');
          }
        }
      } catch (error: unknown) {
        // Handle axios error response
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { status?: number; data?: { error?: { message?: string } } } };
          if (axiosError.response?.status === 400 && axiosError.response?.data?.error?.message?.includes('already verified')) {
            toast.success('Your account is already verified! Please login.');
            navigate(ROUTES.LOGIN, { replace: true });
            return;
          }
        }
        setTokenError('Failed to load verification details. Please try again.');
      } finally {
        setTokenLoading(false);
      }
    };
    
    fetchVerificationDetails();
  }, [verificationToken, navigate]);
  
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSuccess, setVerificationSuccess] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  const {
    control,
    handleSubmit,
    formState: { errors, isValid },
    reset,
  } = useForm<VerificationFormData>({
    resolver: yupResolver(verificationSchema),
    defaultValues: {
      otp: '',
    },
    mode: 'onChange',
  });


  // Cooldown timer for resend OTP
  useEffect(() => {
    let timer: number;
    if (resendCooldown > 0) {
      timer = window.setTimeout(() => {
        setResendCooldown(prev => prev - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = async (data: VerificationFormData) => {
    if (!verificationToken) {
      toast.error('Verification token not found');
      return;
    }

    setIsLoading(true);
    try {
      const response = await authService.verifyEmailWithToken(verificationToken, data.otp);
      
      if (response.success) {
        setVerificationSuccess(true);
        toast.success('Email verified successfully! You can now login.');
        
        // Redirect to login page after a short delay
        setTimeout(() => {
          navigate(ROUTES.LOGIN, { 
            replace: true, 
            state: { 
              message: 'Account created successfully! Please login with your credentials.',
              email: response.data?.email || email 
            } 
          });
        }, 2000);
      } else {
        toast.error(response.error?.message || 'Verification failed');
        reset(); // Clear the OTP field
      }
    } catch {
      toast.error('An unexpected error occurred');
      reset();
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (!verificationToken || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const response = await authService.resendOTPWithToken(verificationToken);
      if (response.success) {
        toast.success('New OTP sent to your email');
        setResendCooldown(60); // 60 second cooldown
      } else {
        toast.error('Failed to resend OTP');
      }
    } catch {
      toast.error('Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  // Show loading while fetching token details or redirecting
  if (tokenLoading || isRedirecting) {
    return (
      <AuthLayout title="Loading" subtitle="Please wait">
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <CircularProgress size={40} />
            <Typography variant="body1" sx={{ mt: 2 }}>
              {isRedirecting ? 'Redirecting...' : 'Loading verification details...'}
            </Typography>
          </Paper>
        </Container>
      </AuthLayout>
    );
  }
  
  // Show error if token is invalid
  if (tokenError) {
    return (
      <AuthLayout title="Verification Error" subtitle="There was an issue with your verification link">
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              {tokenError}
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.LOGIN)}
              sx={{ mr: 2 }}
            >
              Go to Login
            </Button>
            <Button
              variant="outlined"
              onClick={() => navigate(ROUTES.REGISTER)}
            >
              Register Again
            </Button>
          </Paper>
        </Container>
      </AuthLayout>
    );
  }
  
  // Show error if no email was loaded
  if (!email) {
    return (
      <AuthLayout title="Verification Error" subtitle="Unable to load verification details">
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <Alert severity="error" sx={{ mb: 3 }}>
              Unable to load verification details. Please try again.
            </Alert>
            <Button
              variant="contained"
              onClick={() => navigate(ROUTES.REGISTER)}
            >
              Register Again
            </Button>
          </Paper>
        </Container>
      </AuthLayout>
    );
  }

  if (verificationSuccess) {
    return (
      <AuthLayout title="Email Verified" subtitle="Your account has been successfully verified">
        <Container maxWidth="sm">
          <Paper elevation={3} sx={{ p: 4, textAlign: 'center' }}>
            <CheckCircle sx={{ fontSize: 64, color: 'success.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom color="success.main">
              Email Verified!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
              Your account has been successfully verified. Redirecting to login...
            </Typography>
            <CircularProgress size={24} />
          </Paper>
        </Container>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Verify Your Email" subtitle="Enter the verification code sent to your email">
      <Container maxWidth="sm">
        <Paper elevation={3} sx={{ p: 4 }}>
          <Box textAlign="center" mb={3}>
            <Email sx={{ fontSize: 48, color: 'primary.main', mb: 2 }} />
            <Typography variant="h4" gutterBottom>
              Verify Your Email
            </Typography>
            <Typography variant="body1" color="text.secondary">
              We've sent a 6-digit verification code to
            </Typography>
            <Typography variant="body1" fontWeight="bold" color="primary.main">
              {email}
            </Typography>
          </Box>

          <Box component="form" onSubmit={handleSubmit(onSubmit)}>
            <Stack spacing={3}>
              <Controller
                name="otp"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Enter 6-digit OTP"
                    placeholder="123456"
                    fullWidth
                    error={!!errors.otp}
                    helperText={errors.otp?.message}
                    inputProps={{
                      maxLength: 6,
                      style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
                    }}
                    disabled={isLoading}
                  />
                )}
              />

              <Button
                type="submit"
                variant="contained"
                size="large"
                fullWidth
                disabled={!isValid || isLoading}
                startIcon={isLoading ? <CircularProgress size={20} /> : <VerifiedUser />}
              >
                {isLoading ? 'Verifying...' : 'Verify Email'}
              </Button>
            </Stack>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Didn't receive the code?
            </Typography>
            <Button
              variant="text"
              onClick={handleResendOTP}
              disabled={isResending || resendCooldown > 0}
              startIcon={isResending ? <CircularProgress size={16} /> : <Refresh />}
            >
              {resendCooldown > 0 
                ? `Resend in ${resendCooldown}s` 
                : isResending 
                ? 'Sending...' 
                : 'Resend OTP'
              }
            </Button>
          </Box>

          <Divider sx={{ my: 3 }} />

          <Box textAlign="center">
            <Typography variant="body2" color="text.secondary">
              Want to use a different email?{' '}
              <Link
                component="button"
                type="button"
                onClick={() => navigate(ROUTES.REGISTER)}
                sx={{ textDecoration: 'none' }}
              >
                Register again
              </Link>
            </Typography>
          </Box>
        </Paper>
      </Container>
    </AuthLayout>
  );
};

export default VerifyEmailPage;
