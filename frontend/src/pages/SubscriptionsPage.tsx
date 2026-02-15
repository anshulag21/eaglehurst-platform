import React, { useState } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Box,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  IconButton,
} from '@mui/material';
import {
  Check,
  Star,
  Diamond,
  Work,
  Cancel,
  CreditCard,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { useAppSelector } from '../store';
import { stripeService } from '../services/stripe.service';

interface SubscriptionPlan {
  id: string;
  name: string;
  price: number;
  yearlyPrice?: number;
  billing_cycle: 'monthly' | 'yearly';
  userType?: 'buyer' | 'seller';
  stripeProductId?: string;
  stripePriceIds?: {
    monthly: string;
    yearly: string;
  };
  features: {
    connection_limit: number;
    listing_limit: number;
    priority_support: boolean;
    advanced_analytics: boolean;
    featured_listings: boolean;
    api_access: boolean;
  };
  popular?: boolean;
  description: string;
}

// Role-specific subscription plans
const buyerPlans: SubscriptionPlan[] = [
  {
    id: 'buyer_basic',
    name: 'Buyer Basic',
    price: 39,
    yearlyPrice: 390,
    billing_cycle: 'monthly',
    description: 'Connect with medical practice sellers',
    userType: 'buyer',
    stripeProductId: 'prod_TNxwiNOulQvZC4',
    stripePriceIds: {
      monthly: 'price_1SRC0xFzSZuyQKLYPpB66aaX',
      yearly: 'price_1SRC20FzSZuyQKLYbvngEl27'
    },
    features: {
      connection_limit: 10,
      listing_limit: 0, // Buyers don't create listings
      priority_support: false,
      advanced_analytics: false,
      featured_listings: false,
      api_access: false,
    },
  },
  {
    id: 'buyer_premium',
    name: 'Buyer Premium',
    price: 79,
    yearlyPrice: 790,
    billing_cycle: 'monthly',
    popular: true,
    description: 'Premium access to connect with sellers',
    userType: 'buyer',
    stripeProductId: 'prod_TNxyhzNnBuDK0s',
    stripePriceIds: {
      monthly: 'price_1SRC2KFzSZuyQKLYYvYGk1Kc',
      yearly: 'price_1SRC2aFzSZuyQKLYDie8mDJs'
    },
    features: {
      connection_limit: -1, // Unlimited
      listing_limit: 0,
      priority_support: true,
      advanced_analytics: true,
      featured_listings: false,
      api_access: false,
    },
  },
];

const sellerPlans: SubscriptionPlan[] = [
  {
    id: 'seller_basic',
    name: 'Seller Basic',
    price: 99,
    yearlyPrice: 990,
    billing_cycle: 'monthly',
    description: 'List your medical practice for sale',
    userType: 'seller',
    stripeProductId: 'prod_TNxy0RKPUeJEFX',
    stripePriceIds: {
      monthly: 'price_1SRC2tFzSZuyQKLYJVnrNC9h',
      yearly: 'price_1SRC3CFzSZuyQKLYoVEvv5qC'
    },
    features: {
      connection_limit: 2, // Sellers can initiate 2 connections per month
      listing_limit: 2,
      priority_support: false,
      advanced_analytics: false,
      featured_listings: false,
      api_access: false,
    },
  },
  {
    id: 'seller_premium',
    name: 'Seller Premium',
    price: 199,
    yearlyPrice: 1990,
    billing_cycle: 'monthly',
    popular: true,
    description: 'Premium listing features for your practice',
    userType: 'seller',
    stripeProductId: 'prod_TNxzafdPtwrz0p',
    stripePriceIds: {
      monthly: 'price_1SRC3UFzSZuyQKLYKM5Q3ZfX',
      yearly: 'price_1SRC3kFzSZuyQKLYOXgqtULe'
    },
    features: {
      connection_limit: -1, // Unlimited connections
      listing_limit: -1, // Unlimited
      priority_support: true,
      advanced_analytics: true,
      featured_listings: true,
      api_access: false,
    },
  },
];

// Role-specific feature comparison data
const buyerFeatureComparison = [
  {
    category: 'Core Features',
    features: [
      { name: 'Secure Messaging', basic: true, premium: true },
      { name: 'Verified Listings Access', basic: true, premium: true },
      { name: 'Mobile App Access', basic: true, premium: true },
      { name: 'Profile Creation', basic: true, premium: true },
    ]
  },
  {
    category: 'Connection Limits',
    features: [
      { name: 'Monthly Connections', basic: '10', premium: 'Unlimited' },
      { name: 'Connection History', basic: true, premium: true },
      { name: 'Connection Analytics', basic: false, premium: true },
      { name: 'Market Insights', basic: false, premium: true },
    ]
  },
  {
    category: 'Support & Features',
    features: [
      { name: 'Email Support', basic: true, premium: true },
      { name: 'Priority Support', basic: false, premium: true },
      { name: 'Advanced Search Filters', basic: false, premium: true },
      { name: 'Saved Searches', basic: '3', premium: 'Unlimited' },
    ]
  }
];

const sellerFeatureComparison = [
  {
    category: 'Core Features',
    features: [
      { name: 'Secure Messaging', basic: true, premium: true },
      { name: 'Professional Profile', basic: true, premium: true },
      { name: 'Mobile App Access', basic: true, premium: true },
      { name: 'Buyer Inquiries', basic: true, premium: true },
    ]
  },
  {
    category: 'Listing Features',
    features: [
      { name: 'Active Listings', basic: '2', premium: 'Unlimited' },
      { name: 'Listing Photos', basic: '10 per listing', premium: 'Unlimited' },
      { name: 'Featured Listings', basic: false, premium: true },
      { name: 'Priority Placement', basic: false, premium: true },
    ]
  },
  {
    category: 'Analytics & Support',
    features: [
      { name: 'Email Support', basic: true, premium: true },
      { name: 'Priority Support', basic: false, premium: true },
      { name: 'Advanced Analytics', basic: false, premium: true },
      { name: 'Lead Management', basic: false, premium: true },
    ]
  }
];

const SubscriptionsPage: React.FC = () => {
  const { user, profile } = useAppSelector((state) => state.auth);
  
  const [isYearly, setIsYearly] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [compareDialogOpen, setCompareDialogOpen] = useState(false);

  // Get plans based on user type
  const getPlansForUser = () => {
    if (!user) return buyerPlans; // Default to buyer plans if no user
    return user.user_type === 'seller' ? sellerPlans : buyerPlans;
  };

  const currentPlans = getPlansForUser();
  
  // Get feature comparison based on user type
  const getCurrentFeatureComparison = () => {
    if (!user) return buyerFeatureComparison;
    return user.user_type === 'seller' ? sellerFeatureComparison : buyerFeatureComparison;
  };

  const currentFeatureComparison = getCurrentFeatureComparison();

  // Get current subscription information
  const getCurrentSubscription = () => {
    if (!user || !profile) return null;
    
    if (user.user_type === 'buyer') {
      return profile.buyer_profile?.subscription;
    } else if (user.user_type === 'seller') {
      return profile.seller_profile?.subscription;
    }
    
    return null;
  };

  const currentSubscription = getCurrentSubscription();

  // Check if a plan is the user's current plan
  const isCurrentPlan = (plan: SubscriptionPlan) => {
    if (!currentSubscription || currentSubscription.status !== 'active') {
      return false;
    }
    
    // Match by plan type/tier (e.g., 'buyer_basic', 'seller_premium')
    return currentSubscription.type === plan.id;
  };

  const handleSubscribe = async (plan: SubscriptionPlan) => {
    if (!user) {
      toast.error('Please log in to subscribe');
      return;
    }

    // Prevent subscribing to current plan
    if (isCurrentPlan(plan)) {
      toast.error('You are already subscribed to this plan');
      return;
    }

    setSelectedPlan(plan);
    setIsProcessing(true);

    try {
      // Get the appropriate price ID based on billing cycle
      const billingCycle = isYearly ? 'yearly' : 'monthly';
      
      // Create checkout session
      const response = await stripeService.createCheckoutSession({
        plan_id: plan.id,
        billing_cycle: billingCycle,
      });

      if (response.success && response.data) {
        // Redirect to Stripe Checkout
        stripeService.redirectToCheckout(response.data.checkout_url);
      } else {
        toast.error(response.error?.message || 'Failed to create checkout session');
      }
    } catch (error) {
      console.error('Error creating checkout session:', error);
      toast.error('Failed to start checkout process');
    } finally {
      setIsProcessing(false);
    }
  };


  const getPlanIcon = (planName: string) => {
    switch (planName.toLowerCase()) {
      case 'silver': return <Work sx={{ fontSize: 40 }} />;
      case 'gold': return <Star sx={{ fontSize: 40 }} />;
      case 'platinum': return <Diamond sx={{ fontSize: 40 }} />;
      default: return <Work sx={{ fontSize: 40 }} />;
    }
  };


  const formatPrice = (plan: SubscriptionPlan) => {
    if (isYearly && plan.yearlyPrice) {
      const monthlySavings = (plan.price * 12) - plan.yearlyPrice;
      return {
        amount: plan.yearlyPrice,
        monthlyEquivalent: Math.round(plan.yearlyPrice / 12),
        period: 'year',
        savings: monthlySavings,
        discount: Math.round((monthlySavings / (plan.price * 12)) * 100),
      };
    }
    return {
      amount: plan.price,
      monthlyEquivalent: plan.price,
      period: 'month',
      savings: 0,
      discount: 0,
    };
  };

  const renderPlanCard = (plan: SubscriptionPlan, index: number) => {
    const pricing = formatPrice(plan);
    const isCurrent = isCurrentPlan(plan);
    
    return (
      <Grid item xs={12} md={6} key={plan.id}>
        <motion.div
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: index * 0.2 }}
        >
          <Card
            sx={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              position: 'relative',
              backgroundColor: isCurrent ? 'grey.50' : 'background.paper',
              border: isCurrent ? '2px solid' : plan.popular ? '2px solid' : '1px solid',
              borderColor: isCurrent ? 'grey.400' : plan.popular ? 'primary.main' : 'divider',
              borderRadius: 4,
              boxShadow: isCurrent ? 4 : plan.popular ? 8 : 2,
              opacity: isCurrent ? 1 : 1,
              transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
              transition: 'all 0.3s ease',
              '&:hover': {
                transform: plan.popular ? 'scale(1.08)' : 'scale(1.03)',
                boxShadow: plan.popular ? 12 : 6,
              },
            }}
          >
            {/* Current Plan Badge */}
            {isCurrent && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 16,
                  backgroundColor: 'grey.700',
                  color: 'white',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  boxShadow: 1,
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                }}
              >
                ✓ CURRENT
              </Box>
            )}
            
            {/* Popular Badge */}
            {plan.popular && !isCurrent && (
              <Box
                sx={{
                  position: 'absolute',
                  top: 8,
                  right: 16,
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  px: 2,
                  py: 0.5,
                  borderRadius: 2,
                  fontWeight: 600,
                  fontSize: '0.75rem',
                  boxShadow: 2,
                  whiteSpace: 'nowrap',
                  zIndex: 1,
                }}
              >
                ⭐ POPULAR
              </Box>
            )}

            <CardContent sx={{ flexGrow: 1, textAlign: 'center', pt: 3, px: 3, pb: 3 }}>
              {/* Plan Icon */}
              <Box 
                sx={{ 
                  mb: 2,
                  p: 1.5,
                  borderRadius: '50%',
                  backgroundColor: plan.popular ? 'primary.light' : 'grey.100',
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Box sx={{ color: plan.popular ? 'primary.main' : 'text.secondary', fontSize: '2rem' }}>
                  {getPlanIcon(plan.name)}
                </Box>
              </Box>

              {/* Plan Name */}
              <Typography 
                variant="h4" 
                sx={{ 
                  fontWeight: 700, 
                  mb: 1.5,
                  color: plan.popular ? 'primary.main' : 'text.primary',
                  fontSize: '1.5rem'
                }}
              >
                {plan.name}
              </Typography>

              {/* Plan Description */}
              <Typography 
                variant="body2" 
                sx={{ 
                  mb: 3,
                  color: 'text.secondary',
                  fontSize: '0.95rem',
                  lineHeight: 1.4
                }}
              >
                {plan.description}
              </Typography>

              {/* Pricing */}
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'baseline', justifyContent: 'center', mb: 1 }}>
                  <Typography 
                    variant="h3" 
                    sx={{ 
                      fontWeight: 700, 
                      color: plan.popular ? 'primary.main' : 'text.primary',
                      fontSize: '2.2rem'
                    }}
                  >
                    £{pricing.amount}
                  </Typography>
                  <Typography 
                    variant="body1" 
                    sx={{ 
                      color: 'text.secondary',
                      ml: 1,
                      fontWeight: 500
                    }}
                  >
                    /{pricing.period}
                  </Typography>
                </Box>
                
                {isYearly && pricing.monthlyEquivalent && (
                  <Typography variant="body2" sx={{ color: 'text.secondary', mb: 1 }}>
                    £{pricing.monthlyEquivalent} per month, billed annually
                  </Typography>
                )}
                
                {pricing.savings > 0 && (
                  <Box
                    sx={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      backgroundColor: 'success.main',
                      color: 'success.contrastText',
                      px: 2,
                      py: 0.5,
                      borderRadius: 2,
                      fontSize: '0.875rem',
                      fontWeight: 600,
                    }}
                  >
                    💰 Save £{pricing.savings} ({pricing.discount}% off)
                  </Box>
                )}
              </Box>

              {/* Features List */}
              <Box sx={{ mb: 3 }}>
                <Stack spacing={1.5}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box
                      sx={{
                        width: 24,
                        height: 24,
                        borderRadius: '50%',
                        backgroundColor: 'success.main',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0,
                      }}
                    >
                      <Check sx={{ fontSize: 16, color: 'success.contrastText' }} />
                    </Box>
                    <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                      {plan.features.connection_limit === -1
                        ? '∞ Unlimited connections'
                        : `${plan.features.connection_limit} connections per month`
                      }
                    </Typography>
                  </Box>

                  {plan.features.listing_limit > 0 && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check sx={{ fontSize: 16, color: 'success.contrastText' }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        📋 {plan.features.listing_limit} active listings
                      </Typography>
                    </Box>
                  )}

                  {plan.features.priority_support && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check sx={{ fontSize: 16, color: 'success.contrastText' }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        🎧 Priority customer support
                      </Typography>
                    </Box>
                  )}

                  {plan.features.advanced_analytics && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check sx={{ fontSize: 16, color: 'success.contrastText' }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        📊 Advanced analytics dashboard
                      </Typography>
                    </Box>
                  )}

                  {plan.features.featured_listings && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          backgroundColor: 'success.main',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <Check sx={{ fontSize: 16, color: 'success.contrastText' }} />
                      </Box>
                      <Typography variant="body2" sx={{ fontWeight: 500, color: 'text.primary' }}>
                        ⭐ Featured listing placement
                      </Typography>
                    </Box>
                  )}
                </Stack>
              </Box>
            </CardContent>

            <CardActions sx={{ p: 3, pt: 0 }}>
              {isCurrent ? (
                <Button
                  fullWidth
                  variant="outlined"
                  size="medium"
                  disabled
                  startIcon={<Check />}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: 2,
                    borderColor: 'grey.400',
                    color: 'text.secondary',
                    backgroundColor: 'transparent',
                    '&.Mui-disabled': {
                      borderColor: 'grey.400',
                      color: 'text.secondary',
                      opacity: 0.8,
                    },
                  }}
                >
                  Current Plan
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="contained"
                  size="medium"
                  onClick={() => handleSubscribe(plan)}
                  disabled={isProcessing && selectedPlan?.id === plan.id}
                  startIcon={isProcessing && selectedPlan?.id === plan.id ? <CircularProgress size={18} /> : <CreditCard />}
                  sx={{
                    py: 1.5,
                    fontWeight: 600,
                    fontSize: '1rem',
                    borderRadius: 2,
                    backgroundColor: 'primary.main',
                    boxShadow: plan.popular ? 4 : 2,
                    '&:hover': {
                      transform: 'translateY(-1px)',
                      boxShadow: plan.popular ? 6 : 3,
                    },
                    transition: 'all 0.3s ease',
                  }}
                >
                  {isProcessing && selectedPlan?.id === plan.id ? 'Processing...' : `Choose ${plan.name}`}
                </Button>
              )}
            </CardActions>
          </Card>
        </motion.div>
      </Grid>
    );
  };

  return (
    <Box sx={{ 
      minHeight: '100vh',
      backgroundColor: 'background.default',
      py: 4
    }}>
      <Container maxWidth="lg">
        {/* Header */}
        <Box sx={{ textAlign: 'center', mb: 6 }}>
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Typography 
              variant="h2" 
              sx={{ 
                fontWeight: 700, 
                mb: 2,
                color: 'primary.main',
                fontSize: { xs: '2rem', md: '2.5rem' }
              }}
            >
              {user?.user_type === 'seller' ? 'Seller' : 'Buyer'} Plans
            </Typography>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 4, 
                maxWidth: 700, 
                mx: 'auto',
                color: 'text.secondary',
                fontWeight: 400,
                lineHeight: 1.4
              }}
            >
              {user?.user_type === 'seller' 
                ? 'List your medical practice and reach qualified buyers with our professional seller plans.'
                : 'Connect with medical practice sellers and discover opportunities with our buyer plans.'
              }
            </Typography>

            {/* Billing Toggle */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                backgroundColor: 'background.paper',
                borderRadius: 6,
                p: 1,
                border: '1px solid',
                borderColor: 'divider',
                boxShadow: 1,
              }}
            >
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: !isYearly ? 'primary.main' : 'transparent',
                  borderRadius: 5,
                  px: 3,
                  py: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  color: !isYearly ? 'primary.contrastText' : 'text.secondary',
                  fontWeight: 600,
                }}
                onClick={() => setIsYearly(false)}
              >
                Monthly
              </Box>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  backgroundColor: isYearly ? 'primary.main' : 'transparent',
                  borderRadius: 5,
                  px: 3,
                  py: 1.5,
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  color: isYearly ? 'primary.contrastText' : 'text.secondary',
                  fontWeight: 600,
                  position: 'relative',
                }}
                onClick={() => setIsYearly(true)}
              >
                Yearly
                <Chip 
                  label="Save 20%" 
                  size="small" 
                  sx={{ 
                    ml: 1,
                    backgroundColor: 'success.main',
                    color: 'success.contrastText',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                  }} 
                />
              </Box>
            </Box>
          </motion.div>
        </Box>

        {/* Current Plan Alert */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Box
            sx={{
              backgroundColor: currentSubscription && currentSubscription.status === 'active' ? 'grey.50' : 'primary.light',
              borderRadius: 3,
              p: 2,
              mb: 4,
              textAlign: 'center',
              border: '1px solid',
              borderColor: currentSubscription && currentSubscription.status === 'active' ? 'grey.300' : 'primary.main',
            }}
          >
            <Typography 
              variant="h6" 
              sx={{ 
                color: currentSubscription && currentSubscription.status === 'active' ? 'text.primary' : 'primary.contrastText', 
                fontWeight: 600,
                mb: 1 
              }}
            >
              {currentSubscription && currentSubscription.status === 'active' ? (
                currentSubscription.is_cancelled ? (
                  <>⚠️ Your <strong>{currentSubscription.name}</strong> plan is cancelled but active until {new Date(currentSubscription.expires_at).toLocaleDateString()}</>
                ) : (
                  <>✓ You're currently on the <strong>{currentSubscription.name}</strong> plan</>
                )
              ) : (
                <>🎯 You're currently on the <strong>Free Trial</strong></>
              )}
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                color: currentSubscription && currentSubscription.status === 'active' ? 'text.secondary' : 'primary.contrastText',
                opacity: 0.9,
              }}
            >
              {currentSubscription && currentSubscription.status === 'active' ? (
                currentSubscription.is_cancelled ? (
                  'Your subscription will end on the date shown above. You can reactivate or change your plan below.'
                ) : (
                  'You can upgrade or change your plan below'
                )
              ) : (
                'Upgrade to unlock premium features and connect with more businesses'
              )}
            </Typography>
          </Box>
        </motion.div>

        {/* Plans Grid */}
        <Grid container spacing={3} sx={{ mb: 6 }}>
          {currentPlans.map((plan, index) => renderPlanCard(plan, index))}
        </Grid>

        {/* Features Comparison */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <Box sx={{ textAlign: 'center', mb: 4 }}>
            <Typography 
              variant="h5" 
              sx={{ 
                fontWeight: 600, 
                mb: 2,
                color: 'text.primary'
              }}
            >
              Need help choosing?
            </Typography>
            <Typography 
              variant="body1" 
              sx={{ 
                mb: 3,
                color: 'text.secondary',
                maxWidth: 600,
                mx: 'auto'
              }}
            >
              All plans include secure messaging, verified listings, and mobile access.
            </Typography>
            <Button 
              variant="contained"
              size="medium"
              onClick={() => setCompareDialogOpen(true)}
              sx={{
                backgroundColor: 'primary.main',
                color: 'primary.contrastText',
                fontWeight: 600,
                px: 3,
                py: 1,
                borderRadius: 2,
                fontSize: '1rem',
                '&:hover': {
                  transform: 'translateY(-1px)',
                  boxShadow: 4,
                },
                transition: 'all 0.3s ease',
              }}
            >
              Compare All Features
            </Button>
          </Box>
        </motion.div>
      </Container>
      
      {/* Feature Comparison Dialog */}
      <Dialog
        open={compareDialogOpen}
        onClose={() => setCompareDialogOpen(false)}
        maxWidth="xl"
        fullWidth
        PaperProps={{
          sx: { 
            minHeight: '90vh',
            borderRadius: 3,
            backgroundColor: 'background.paper'
          }
        }}
      >
        <DialogTitle sx={{ pb: 2, pt: 3, px: 4 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h4" sx={{ fontWeight: 700, mb: 1, color: 'primary.main' }}>
                Compare All Features
              </Typography>
              <Typography variant="body1" color="text.secondary">
                Find the perfect plan for your medical practice needs
              </Typography>
            </Box>
            <IconButton 
              onClick={() => setCompareDialogOpen(false)}
              sx={{ 
                backgroundColor: 'rgba(0,0,0,0.1)', 
                '&:hover': { backgroundColor: 'rgba(0,0,0,0.2)' } 
              }}
            >
              <Cancel />
            </IconButton>
          </Box>
        </DialogTitle>
        
        <DialogContent sx={{ px: 4, pb: 2 }}>
          {/* Plan Headers */}
          <Grid container spacing={3} sx={{ mb: 4 }}>
            <Grid item xs={12} md={3}>
              {/* Empty space for feature names */}
            </Grid>
            {currentPlans.map((plan, index) => (
              <Grid item xs={12} md={3} key={plan.id}>
                <Card 
                  elevation={index === 1 ? 8 : 4}
                  sx={{ 
                    textAlign: 'center', 
                    p: 3,
                    backgroundColor: index === 1 ? 'primary.main' : 'background.paper',
                    color: index === 1 ? 'primary.contrastText' : 'text.primary',
                    border: index === 1 ? '3px solid' : '2px solid',
                    borderColor: index === 1 ? 'warning.main' : 'divider',
                    position: 'relative',
                    transition: 'all 0.3s ease'
                  }}
                >
                  {index === 1 && (
                    <Chip 
                      label="POPULAR" 
                      size="small" 
                      sx={{ 
                        position: 'absolute', 
                        top: 8, 
                        right: 16,
                        backgroundColor: 'warning.main',
                        color: 'warning.contrastText',
                        fontWeight: 600,
                        fontSize: '0.65rem',
                        height: 20,
                        zIndex: 1,
                        '& .MuiChip-label': {
                          px: 1,
                        }
                      }} 
                    />
                  )}
                  <Box sx={{ mb: 2 }}>
                    {getPlanIcon(plan.name)}
                  </Box>
                  <Typography variant="h5" sx={{ fontWeight: 700, mb: 1 }}>
                    {plan.name}
                  </Typography>
                  <Typography variant="h3" sx={{ fontWeight: 800, mb: 1 }}>
                    £{formatPrice(plan).amount}
                  </Typography>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>
                    per {formatPrice(plan).period}
                  </Typography>
                </Card>
              </Grid>
            ))}
          </Grid>

          {/* Feature Comparison */}
          <Box sx={{ backgroundColor: 'white', borderRadius: 3, overflow: 'hidden', boxShadow: 3 }}>
            {currentFeatureComparison.map((category, categoryIndex) => (
              <Box key={categoryIndex}>
                {/* Category Header */}
                <Box sx={{ 
                  backgroundColor: 'primary.main',
                  color: 'primary.contrastText',
                  p: 2,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 2
                }}>
                  <Typography variant="h6" sx={{ fontWeight: 600 }}>
                    {category.category}
                  </Typography>
                </Box>

                {/* Features */}
                {category.features.map((feature, featureIndex) => (
                  <Grid 
                    container 
                    key={featureIndex} 
                    sx={{ 
                      borderBottom: '1px solid #f0f0f0',
                      '&:hover': { backgroundColor: '#f8f9fa' },
                      transition: 'background-color 0.2s ease'
                    }}
                  >
                    <Grid item xs={12} md={3} sx={{ p: 2, display: 'flex', alignItems: 'center' }}>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {feature.name}
                      </Typography>
                    </Grid>
                    
                    {/* Basic Plan */}
                    <Grid item xs={12} md={3} sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {typeof feature.basic === 'boolean' ? (
                        feature.basic ? (
                          <Box sx={{ 
                            backgroundColor: 'success.main', 
                            borderRadius: '50%', 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check sx={{ color: 'white', fontSize: 20 }} />
                          </Box>
                        ) : (
                          <Box sx={{ 
                            backgroundColor: 'grey.300', 
                            borderRadius: '50%', 
                            width: 32, 
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          </Box>
                        )
                      ) : (
                        <Chip 
                          label={feature.basic} 
                          size="small" 
                          sx={{ 
                            backgroundColor: 'primary.light', 
                            color: 'primary.contrastText',
                            fontWeight: 600
                          }} 
                        />
                      )}
                    </Grid>

                    {/* Premium Plan */}
                    <Grid item xs={12} md={3} sx={{ p: 2, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
                      {typeof feature.premium === 'boolean' ? (
                        feature.premium ? (
                          <Box sx={{ 
                            backgroundColor: 'success.main', 
                            borderRadius: '50%', 
                            p: 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Check sx={{ color: 'white', fontSize: 20 }} />
                          </Box>
                        ) : (
                          <Box sx={{ 
                            backgroundColor: 'grey.300', 
                            borderRadius: '50%', 
                            width: 32, 
                            height: 32,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <Typography variant="body2" color="text.disabled">—</Typography>
                          </Box>
                        )
                      ) : (
                        <Chip 
                          label={feature.premium} 
                          size="small" 
                          sx={{ 
                            backgroundColor: 'warning.main', 
                            color: 'warning.contrastText',
                            fontWeight: 600
                          }} 
                        />
                      )}
                    </Grid>
                  </Grid>
                ))}
              </Box>
            ))}
          </Box>
        </DialogContent>

        <DialogActions sx={{ p: 4, pt: 3, backgroundColor: 'background.default' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>
              ✨ All plans include 14-day free trial • Cancel anytime • No setup fees
            </Typography>
            <Stack direction="row" spacing={2}>
              <Button 
                onClick={() => setCompareDialogOpen(false)}
                sx={{ borderRadius: 2, px: 3 }}
              >
                Close
              </Button>
              <Button 
                variant="contained" 
                size="large"
                onClick={() => {
                  setCompareDialogOpen(false);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                sx={{ 
                  borderRadius: 2, 
                  px: 4,
                  backgroundColor: 'primary.main',
                  '&:hover': {
                    backgroundColor: 'primary.dark',
                  }
                }}
              >
                Choose Your Plan
              </Button>
            </Stack>
          </Box>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default SubscriptionsPage;