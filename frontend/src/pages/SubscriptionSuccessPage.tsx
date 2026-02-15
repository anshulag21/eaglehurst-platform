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
  const [isProcessingWebhook, setIsProcessingWebhook] = useState(false);

  useEffect(() => {
    // Refresh user profile to get updated subscription status
    if (sessionId) {
      const processedKey = `processed_session_${sessionId}`;
      
      // Check if we've already processed this session
      if (localStorage.getItem(processedKey)) {
        console.log('Session already processed, skipping refresh');
        return;
      }
      
      console.log('Processing Stripe session ID:', sessionId);
      
      // Mark this session as processed immediately
      localStorage.setItem(processedKey, 'true');
      
      // Clear the subscription banner dismissal so it can re-evaluate
      localStorage.removeItem('subscription_banner_dismissed');
      
      // Add a small delay to allow webhook processing, then refresh user profile
      const refreshProfile = async () => {
        // Wait a bit for webhook to process
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Refresh user profile data to get updated subscription status
        dispatch(getCurrentUser());
      };
      
      refreshProfile();
    }
  }, [sessionId]);

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
              
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 2, color: 'success.main' }}>
                Subscription Successful!
              </Typography>
              
              <Typography variant="h6" color="text.secondary" sx={{ mb: 4 }}>
                Welcome to your new subscription plan. You now have access to all premium features.
              </Typography>
            </Box>

            <Box sx={{ 
              backgroundColor: 'success.light', 
              borderRadius: 2, 
              p: 3, 
              mb: 4,
              color: 'success.contrastText'
            }}>
              <Typography variant="body1" sx={{ fontWeight: 600, mb: 1 }}>
                What's Next?
              </Typography>
              <Typography variant="body2">
                Your subscription is now active and you can start using all the features included in your plan.
                {IS_DEVELOPMENT 
                  ? " Check your email for the receipt and subscription details. Use the 'Activate Subscription' button if needed."
                  : " Check your email for the receipt and subscription details."
                }
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
              
              {/* Only show manual activation button in development */}
              {IS_DEVELOPMENT && (
                <Button
                  variant="contained"
                  size="large"
                  startIcon={isProcessingWebhook ? <CircularProgress size={20} /> : <Webhook />}
                  onClick={handleManualWebhookTrigger}
                  disabled={isProcessingWebhook || !sessionId}
                  sx={{
                    px: 3,
                    py: 1.5,
                    borderRadius: 2,
                    fontWeight: 600,
                    backgroundColor: 'success.main',
                    '&:hover': {
                      backgroundColor: 'success.dark',
                    },
                  }}
                >
                  {isProcessingWebhook ? 'Processing...' : 'Activate Subscription'}
                </Button>
              )}
            </Stack>
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default SubscriptionSuccessPage;
