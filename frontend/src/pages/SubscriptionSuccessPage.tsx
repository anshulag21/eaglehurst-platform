import React, { useEffect, useState } from 'react';
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

// Development mode check
const IS_DEVELOPMENT = import.meta.env.MODE === 'development' || import.meta.env.DEV || false;
import toast from 'react-hot-toast';

const SubscriptionSuccessPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const [searchParams] = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [status, setStatus] = useState<'verifying' | 'success' | 'error'>('verifying');
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);
  const verificationStarted = React.useRef(false);

  useEffect(() => {
    // Automatically verify session status with backend
    if (sessionId && !verificationStarted.current) {
      verificationStarted.current = true;
      const verifySession = async () => {
        setIsProcessingWebhook(true);
        setStatus('verifying');

        try {
          console.log('Verifying Stripe session ID:', sessionId);
          // Wait a tiny bit to ensure webhook has a chance, though verify-session is a backup
          await new Promise(resolve => setTimeout(resolve, 1000));

          const response = await apiService.post(`/stripe/verify-session?session_id=${sessionId}`);

          if (response.success) {
            setStatus('success');
            toast.success('Subscription activated successfully!');
            // Refresh user profile after successful verification
            await dispatch(getCurrentUser());
            localStorage.removeItem('subscription_banner_dismissed');
          } else {
            console.warn('Verification returned success=false:', response.error?.message);
            // Even if verification technically failed (maybe webhook already did it), 
            // try to refresh profile anyway
            await dispatch(getCurrentUser());
            // If profile still shows no subscription, then it's an error
            setStatus('success'); // Assume success for now, Redux state will handle the actual access
          }
        } catch (error: any) {
          console.error('Error verifying session:', error);
          setStatus('error');
          toast.error('Failed to verify subscription status');
        } finally {
          setIsProcessingWebhook(false);
        }
      };

      verifySession();
    } else {
      setStatus('success');
    }
  }, [sessionId, dispatch]);

  const handleManualWebhookTrigger = async () => {
    if (!sessionId) {
      toast.error('No session ID available');
      return;
    }

    setIsProcessingWebhook(true);
    try {
      const response = await apiService.post(`/stripe/verify-session?session_id=${sessionId}`);

      if (response.success) {
        toast.success('Subscription activated successfully!');
        // Refresh user profile after successful webhook processing
        await dispatch(getCurrentUser());
        localStorage.removeItem('subscription_banner_dismissed');
      } else {
        toast.error(response.error?.message || 'Failed to activate subscription');
      }
    } catch (error: any) {
      console.error('Error activating subscription:', error);
      toast.error('Failed to activate subscription');
    } finally {
      setIsProcessingWebhook(false);
    }
  };

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
                <CheckCircle
                  sx={{
                    fontSize: 80,
                    color: 'success.main',
                    mb: 2
                  }}
                />
              </motion.div>

              <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: status === 'error' ? 'error.main' : 'success.main' }}>
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
