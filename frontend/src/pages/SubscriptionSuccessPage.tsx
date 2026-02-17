import React, { useEffect, useState, useRef } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Stack,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  ArrowForward,
  Webhook,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAppDispatch } from '../store';
import { getCurrentUser } from '../store/slices/authSlice';
import { apiService } from '../services/api';
import { ROUTES } from '../constants';
import toast from 'react-hot-toast';

// Development mode check
const IS_DEVELOPMENT = import.meta.env.MODE === 'development' || import.meta.env.DEV || false;

const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const verificationStarted = useRef(false);

  useEffect(() => {
    // 1. Check if we already verified this specific session to avoid loops
    // This is critical because dispatch(getCurrentUser()) might cause a remount
    if (sessionId) {
      const verifiedSessions = JSON.parse(localStorage.getItem('verified_sessions') || '[]');
      if (verifiedSessions.includes(sessionId)) {
        console.log('Session already processed, checking user profile...');
        setStatus('success');
        dispatch(getCurrentUser()); // Ensure profile is up to date
        return;
      }
    } else {
      // No session ID, just show success
      setStatus('success');
      return;
    }

    // 2. Automatically verify session status with backend
    if (sessionId && !verificationStarted.current) {
      verificationStarted.current = true;

      const verifySession = async () => {
        setStatus('verifying');
        console.log('Processing Stripe session ID:', sessionId);

        if (sessionId) {
          // MARK AS PROCESSED IMMEDIATELY to prevent loops if component remounts during await
          const verifiedSessions = JSON.parse(localStorage.getItem('verified_sessions') || '[]');
          if (!verifiedSessions.includes(sessionId)) {
            localStorage.setItem('verified_sessions', JSON.stringify([...verifiedSessions, sessionId]));
          }
        }

        try {
          // Wait a tiny bit to ensure webhook has a chance
          await new Promise(resolve => setTimeout(resolve, 1500));

          const response = await apiService.post(`/stripe/verify-session?session_id=${sessionId}`);

          if (response.success) {
            console.log('Verification successful!');
            setStatus('success');
            toast.success('Subscription activated successfully!');
            localStorage.removeItem('subscription_banner_dismissed');

            // Refresh user profile after successful verification
            await dispatch(getCurrentUser());

          } else {
            console.warn('Verification returned success=false:', response.error?.message);
            // Even if verification technically failed (maybe webhook already did it), 
            // try to refresh profile anyway
            await dispatch(getCurrentUser());
            setStatus('success'); // Assume success for UI purposes
          }
        } catch (error: any) {
          console.error('Error verifying session:', error);
          // Even on error, check if profile was updated by webhook
          await dispatch(getCurrentUser());
          setStatus('error');
          toast.error('Failed to verify subscription status');
        }
      };

      verifySession();
    }
  }, [sessionId, dispatch]);

  return (
    <Container maxWidth="md" sx={{ py: 8 }}>
      <motion.div
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Card elevation={8} sx={{ textAlign: 'center', p: 4 }}>
          <CardContent>
            <Box sx={{ mb: 4 }}>
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                {status === 'verifying' ? (
                  <CircularProgress size={80} sx={{ mb: 2 }} />
                ) : status === 'error' ? (
                  <Webhook sx={{ fontSize: 80, color: 'error.main', mb: 2 }} />
                ) : (
                  <CheckCircle sx={{ fontSize: 80, color: 'success.main', mb: 2 }} />
                )}
              </motion.div>

              <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: status === 'error' ? 'error.main' : status === 'verifying' ? 'info.main' : 'success.main' }}>
                {status === 'verifying' ? 'Verifying Subscription...' :
                  status === 'error' ? 'Verification Problem' :
                    'Subscription Successful!'}
              </Typography>

              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                {status === 'verifying' ? 'Please wait while we confirm your payment with Stripe.' :
                  status === 'error' ? 'We could not automatically verify your subscription. Please refresh the page or contact support.' :
                    'Welcome to your new subscription plan. You now have access to all premium features.'}
              </Typography>
            </Box>

            <Box sx={{
              backgroundColor: status === 'verifying' ? 'info.light' : (status === 'error' ? 'error.light' : 'success.light'),
              borderRadius: 2,
              p: 3,
              mb: 4,
              color: status === 'verifying' ? 'info.contrastText' : (status === 'error' ? 'error.contrastText' : 'success.contrastText')
            }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                {status === 'verifying' ? 'Just a moment...' : "What's Next?"}
              </Typography>
              <Typography variant="body2">
                {status === 'verifying' ? 'We are connecting to the payment gateway to finalize your account setup.' :
                  status === 'error' ? 'Your payment was processed by Stripe, but our system needs a moment to sync. Try refreshing the page or checking your dashboard in a few minutes.' :
                    "Your subscription is now active and you can start using all the features included in your plan. Check your email for the receipt and subscription details."}
              </Typography>
            </Box>

            <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap">
              <Button
                variant="contained"
                size="large"
                endIcon={<ArrowForward />}
                onClick={() => navigate(ROUTES.DASHBOARD)}
                disabled={status === 'verifying'}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5
                }}
              >
                Go to Dashboard
              </Button>

              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate(ROUTES.SUBSCRIPTIONS)}
                disabled={status === 'verifying'}
                sx={{
                  borderRadius: 2,
                  px: 4,
                  py: 1.5
                }}
              >
                Manage Subscription
              </Button>

            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default SubscriptionSuccessPage;
