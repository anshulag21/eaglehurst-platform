import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  IconButton,
  Collapse,
  Stack,
  Typography,
  Container,
  Paper,
} from '@mui/material';
import { 
  Close, 
  CreditCard, 
  Star,
  TrendingUp,
  Warning,
  Refresh,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppSelector, useAppDispatch } from '../../store';
import { getCurrentUser } from '../../store/slices/authSlice';
import { ROUTES } from '../../constants';

interface SubscriptionBannerProps {
  className?: string;
}

const SubscriptionBanner: React.FC<SubscriptionBannerProps> = ({ className }) => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, profile } = useAppSelector((state) => state.auth);
  const [isVisible, setIsVisible] = useState(true);

  // Refresh user profile when component mounts to get latest subscription status
  useEffect(() => {
    if (user && profile) {
      // Check if we need to refresh profile data
      const lastRefresh = localStorage.getItem('profile_last_refresh');
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000; // 5 minutes in milliseconds
      
      if (!lastRefresh || (now - parseInt(lastRefresh)) > fiveMinutes) {
        dispatch(getCurrentUser());
        localStorage.setItem('profile_last_refresh', now.toString());
      }
    }
  }, [user, profile, dispatch]);

  // Clear banner dismissal if subscription status changes
  useEffect(() => {
    if (user && profile) {
      const currentSubscriptionStatus = user.user_type === 'buyer' 
        ? profile.buyer_profile?.subscription?.status 
        : profile.seller_profile?.subscription?.status;
      
      const lastKnownStatus = localStorage.getItem('last_subscription_status');
      
      if (lastKnownStatus && lastKnownStatus !== currentSubscriptionStatus) {
        // Subscription status changed, clear banner dismissal
        localStorage.removeItem('subscription_banner_dismissed');
      }
      
      if (currentSubscriptionStatus) {
        localStorage.setItem('last_subscription_status', currentSubscriptionStatus);
      }
    }
  }, [user, profile]);

  const handleClose = () => {
    setIsVisible(false);
    // Store dismissal in localStorage to remember user's choice
    localStorage.setItem('subscription_banner_dismissed', 'true');
  };

  const handleSubscribeClick = () => {
    navigate(ROUTES.SUBSCRIPTIONS);
  };

  const handleRefreshProfile = async () => {
    // Force refresh profile data
    await dispatch(getCurrentUser());
    // Clear the cache to force immediate refresh
    localStorage.removeItem('profile_last_refresh');
    localStorage.removeItem('subscription_banner_dismissed');
    localStorage.removeItem('last_subscription_status');
  };

  // Don't show banner if:
  // 1. User is not authenticated
  // 2. User is admin (admins don't need subscriptions)
  // 3. User has dismissed the banner
  // 4. User has an active subscription (for buyers)
  if (!user || !profile) {
    return null;
  }

  if (user.user_type === 'admin') {
    return null;
  }

  // Check if banner was dismissed
  const wasDismissed = localStorage.getItem('subscription_banner_dismissed') === 'true';
  if (wasDismissed) {
    return null;
  }

  // Check if user has an active subscription based on their type
  let hasActiveSubscription = false;
  
  if (user.user_type === 'buyer') {
    hasActiveSubscription = profile.buyer_profile?.subscription?.status === 'active';
  } else if (user.user_type === 'seller') {
    hasActiveSubscription = profile.seller_profile?.subscription?.status === 'active';
  }


  const shouldShowBanner = !hasActiveSubscription;

  if (!shouldShowBanner) {
    return null;
  }

  const getBannerContent = () => {
    if (user.user_type === 'buyer') {
      return {
        title: 'Subscription Required',
        message: 'Connect with sellers and access medical practice listings',
        icon: <Star sx={{ color: '#fff' }} />,
        buttonText: 'Subscribe Now',
      };
    } else if (user.user_type === 'seller') {
      return {
        title: 'Subscription Required',
        message: 'List your medical practice for sale and reach qualified buyers',
        icon: <TrendingUp sx={{ color: '#fff' }} />,
        buttonText: 'Subscribe Now',
      };
    }
    
    return {
      title: 'Subscription Required',
      message: 'Choose a plan that fits your needs to access all platform features',
      icon: <Warning sx={{ color: '#fff' }} />,
      buttonText: 'Subscribe Now',
    };
  };

  const bannerContent = getBannerContent();

  return (
    <Collapse in={isVisible}>
      <Box 
        className={className} 
        sx={{ 
          background: 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
          borderBottom: '1px solid rgba(0,0,0,0.1)',
          py: 1.5,
        }}
      >
        <Container maxWidth="xl">
          <Stack 
            direction="row" 
            alignItems="center" 
            justifyContent="space-between"
            spacing={2}
          >
            <Stack direction="row" alignItems="center" spacing={2} sx={{ flex: 1 }}>
              <Box
                sx={{
                  backgroundColor: 'rgba(255,255,255,0.2)',
                  borderRadius: '50%',
                  p: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                {bannerContent.icon}
              </Box>
              
              <Box sx={{ flex: 1 }}>
                <Typography 
                  variant="subtitle1" 
                  sx={{ 
                    color: '#fff', 
                    fontWeight: 600,
                    mb: 0.5,
                  }}
                >
                  {bannerContent.title}
                </Typography>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: 'rgba(255,255,255,0.9)',
                    fontSize: '0.875rem',
                  }}
                >
                  {bannerContent.message}
                </Typography>
              </Box>
            </Stack>

            <Stack direction="row" alignItems="center" spacing={1}>
              <Button
                variant="contained"
                size="medium"
                startIcon={<CreditCard />}
                onClick={handleSubscribeClick}
                sx={{
                  backgroundColor: '#fff',
                  color: '#ff6b35',
                  fontWeight: 600,
                  px: 3,
                  py: 1,
                  borderRadius: 2,
                  boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                  '&:hover': {
                    backgroundColor: '#f5f5f5',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  },
                }}
              >
                {bannerContent.buttonText}
              </Button>
              
              <IconButton
                onClick={handleRefreshProfile}
                size="small"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  },
                }}
                title="Refresh subscription status"
              >
                <Refresh fontSize="small" />
              </IconButton>
              
              <IconButton
                onClick={handleClose}
                size="small"
                sx={{
                  color: 'rgba(255,255,255,0.8)',
                  '&:hover': {
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    color: '#fff',
                  },
                }}
              >
                <Close fontSize="small" />
              </IconButton>
            </Stack>
          </Stack>
        </Container>
      </Box>
    </Collapse>
  );
};

export default SubscriptionBanner;
