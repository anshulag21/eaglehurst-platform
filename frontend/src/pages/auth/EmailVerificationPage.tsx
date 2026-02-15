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
import { useNavigate, useLocation } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAppDispatch, useAppSelector } from '../../store';
import { verifyEmail, getCurrentUser, logoutUser } from '../../store/slices/authSlice';
import { ROUTES } from '../../constants';
import AuthLayout from '../../components/auth/AuthLayout';
import { authService } from '../../services/auth.service';

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

const EmailVerificationPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const { user, isLoading, error } = useAppSelector((state) => state.auth);
  
  const [isResending, setIsResending] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [verificationSuccess, setVerificationSuccess] = useState(false);

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

  // Redirect if user is already verified or not authenticated
  useEffect(() => {
    if (!user) {
      navigate(ROUTES.LOGIN, { replace: true });
      return;
    }
    
    if (user.is_verified) {
      // Redirect to appropriate dashboard
      const dashboardRoute = getDashboardRoute(user.user_type);
      navigate(dashboardRoute, { replace: true });
      return;
    }
  }, [user, navigate]);

  // Cooldown timer for resend OTP
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (resendCooldown > 0) {
      timer = setTimeout(() => {
        setResendCooldown(resendCooldown - 1);
      }, 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const onSubmit = async (data: VerificationFormData) => {
    if (!user?.email) {
      toast.error('User email not found');
      return;
    }

    try {
      const result = await dispatch(verifyEmail({
        email: user.email,
        otp: data.otp,
      }));

      if (verifyEmail.fulfilled.match(result)) {
        setVerificationSuccess(true);
        toast.success('Email verified successfully!');
        
        // Refresh user data to get updated verification status
        await dispatch(getCurrentUser());
        
        // Redirect to dashboard after a short delay
        setTimeout(() => {
          const dashboardRoute = getDashboardRoute(user.user_type);
          navigate(dashboardRoute, { replace: true });
        }, 2000);
      } else {
        toast.error(result.payload as string || 'Verification failed');
        reset(); // Clear the OTP field
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
      reset();
    }
  };

  const handleResendOTP = async () => {
    if (!user?.email || resendCooldown > 0) return;

    setIsResending(true);
    try {
      const response = await authService.resendOTP(user.email);
      if (response.success) {
        toast.success('New OTP sent to your email');
        setResendCooldown(60); // 60 second cooldown
      } else {
        toast.error('Failed to resend OTP');
      }
    } catch (error) {
      toast.error('Failed to resend OTP');
    } finally {
      setIsResending(false);
    }
  };

  const handleLogout = async () => {
    await dispatch(logoutUser());
    navigate(ROUTES.LOGIN, { replace: true });
  };

  // Helper function to get dashboard route
  const getDashboardRoute = (userType: string): string => {
    switch (userType) {
      case 'admin':
        return ROUTES.ADMIN_DASHBOARD;
      case 'seller':
        return ROUTES.SELLER_DASHBOARD;
      case 'buyer':
        return ROUTES.BUYER_DASHBOARD;
      default:
        return ROUTES.DASHBOARD;
    }
  };

  if (!user) {
    return null; // Will redirect in useEffect
  }

  if (verificationSuccess) {
    return (
      <AuthLayout
        title="Email Verified!"
        subtitle="Your email has been successfully verified"
      >
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
          <Typography variant="h5" gutterBottom color="success.main">
            Verification Successful!
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Redirecting you to your dashboard...
          </Typography>
          <CircularProgress size={24} />
        </Box>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      title="Verify Your Email"
      subtitle="Enter the 6-digit code sent to your email"
    >
      <Box component="form" onSubmit={handleSubmit(onSubmit)} sx={{ mt: 2 }}>
        {/* User Email Display */}
        <Paper sx={{ p: 2, mb: 3, bgcolor: 'grey.50' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Email color="primary" />
            <Typography variant="body2" color="text.secondary">
              Code sent to:
            </Typography>
            <Typography variant="body2" fontWeight="medium">
              {user.email}
            </Typography>
          </Stack>
        </Paper>

        {/* Error Alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {/* OTP Input */}
        <Controller
          name="otp"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              fullWidth
              label="Enter 6-digit OTP"
              placeholder="123456"
              error={!!errors.otp}
              helperText={errors.otp?.message}
              inputProps={{
                maxLength: 6,
                style: { textAlign: 'center', fontSize: '1.5rem', letterSpacing: '0.5rem' }
              }}
              sx={{ mb: 3 }}
              autoFocus
            />
          )}
        />

        {/* Verify Button */}
        <Button
          type="submit"
          fullWidth
          variant="contained"
          size="large"
          disabled={!isValid || isLoading}
          startIcon={isLoading ? <CircularProgress size={20} /> : <VerifiedUser />}
          sx={{ mb: 2 }}
        >
          {isLoading ? 'Verifying...' : 'Verify Email'}
        </Button>

        <Divider sx={{ my: 2 }} />

        {/* Resend OTP */}
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary" textAlign="center">
            Didn't receive the code?
          </Typography>
          
          <Button
            variant="outlined"
            fullWidth
            onClick={handleResendOTP}
            disabled={isResending || resendCooldown > 0}
            startIcon={isResending ? <CircularProgress size={16} /> : <Refresh />}
          >
            {isResending
              ? 'Sending...'
              : resendCooldown > 0
              ? `Resend in ${resendCooldown}s`
              : 'Resend OTP'
            }
          </Button>

          {/* Logout Option */}
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Link
              component="button"
              type="button"
              variant="body2"
              onClick={handleLogout}
              sx={{ textDecoration: 'none' }}
            >
              Sign in with a different account
            </Link>
          </Box>
        </Stack>

        {/* Help Text */}
        <Box sx={{ mt: 3, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
          <Typography variant="caption" color="info.contrastText">
            💡 <strong>Tip:</strong> Check your spam folder if you don't see the email. 
            The OTP is valid for 10 minutes.
          </Typography>
        </Box>
      </Box>
    </AuthLayout>
  );
};

export default EmailVerificationPage;
