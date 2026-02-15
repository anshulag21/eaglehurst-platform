import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Stack,
  Chip,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  CircularProgress,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  CreditCard,
  Cancel,
  CheckCircle,
  Warning,
  Receipt,
  Download,
  Close,
  Refresh,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import { useAppSelector, useAppDispatch } from '../store';
import { getCurrentUser } from '../store/slices/authSlice';
import { apiService } from '../services/api';
import { ROUTES } from '../constants';

interface SubscriptionDetails {
  id: string;
  plan_name: string;
  plan_type: string;
  status: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  actual_status?: 'active' | 'cancelled' | 'past_due' | 'incomplete';
  billing_cycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  current_period_start: string;
  current_period_end: string;
  cancelled_at?: string;
  is_cancelled?: boolean;
  cancel_at_period_end: boolean;
  stripe_subscription_id?: string;
  features: {
    connections_limit: number;
    listings_limit: number;
    priority_support: boolean;
    advanced_analytics: boolean;
    featured_listings: boolean;
  };
  usage: {
    connections_used: number;
    listings_used: number;
  };
}

interface PaymentHistory {
  id: string;
  amount: number;
  currency: string;
  status: 'succeeded' | 'failed' | 'pending';
  payment_date: string;
  invoice_url?: string;
  description: string;
}

const ProfileSubscriptionPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, profile } = useAppSelector((state) => state.auth);
  
  const [subscription, setSubscription] = useState<SubscriptionDetails | null>(null);
  const [paymentHistory, setPaymentHistory] = useState<PaymentHistory[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);

  useEffect(() => {
    fetchSubscriptionData();
  }, []);

  const fetchSubscriptionData = async () => {
    setIsLoading(true);
    try {
      // Fetch current subscription
      const subResponse = await apiService.get('/subscriptions/current');
      if (subResponse.success && subResponse.data) {
        setSubscription(subResponse.data);
      }

      // Fetch payment history
      const paymentResponse = await apiService.get('/subscriptions/history');
      if (paymentResponse.success && paymentResponse.data) {
        setPaymentHistory(paymentResponse.data.payments || []);
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
      toast.error('Failed to load subscription data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      await fetchSubscriptionData();
      await dispatch(getCurrentUser());
    } catch (error) {
      toast.error('Failed to refresh data');
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancelling(true);
    try {
      const response = await apiService.post('/stripe/cancel-subscription');
      if (response.success) {
        toast.success('Subscription cancelled successfully');
        setCancelDialogOpen(false);
        await fetchSubscriptionData();
        await dispatch(getCurrentUser());
      } else {
        toast.error(response.error?.message || 'Failed to cancel subscription');
      }
    } catch (error) {
      console.error('Error cancelling subscription:', error);
      toast.error('Failed to cancel subscription');
    } finally {
      setIsCancelling(false);
    }
  };

  const getStatusColor = (subscription: SubscriptionDetails | null) => {
    if (!subscription) return 'default';
    
    // If cancelled but still active (not expired), show as warning
    if (subscription.is_cancelled && subscription.status === 'active') {
      return 'warning';
    }
    
    switch (subscription.status) {
      case 'active': return 'success';
      case 'cancelled': return 'error';
      case 'past_due': return 'warning';
      case 'incomplete': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (subscription: SubscriptionDetails | null) => {
    if (!subscription) return <CheckCircle />;
    
    // If cancelled but still active (not expired), show warning icon
    if (subscription.is_cancelled && subscription.status === 'active') {
      return <Warning />;
    }
    
    switch (subscription.status) {
      case 'active': return <CheckCircle />;
      case 'cancelled': return <Cancel />;
      case 'past_due': return <Warning />;
      case 'incomplete': return <Warning />;
      default: return <CheckCircle />;
    }
  };

  const getStatusLabel = (subscription: SubscriptionDetails | null) => {
    if (!subscription) return 'UNKNOWN';
    
    // If cancelled but still active (not expired), show special label
    if (subscription.is_cancelled && subscription.status === 'active') {
      return 'CANCELLED (ACTIVE UNTIL ' + new Date(subscription.current_period_end).toLocaleDateString().toUpperCase() + ')';
    }
    
    return subscription.status.toUpperCase();
  };

  const formatCurrency = (amount: number, currency: string = 'GBP') => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount);
  };

  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <CircularProgress />
        <Typography sx={{ mt: 2 }}>Loading subscription details...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(ROUTES.PROFILE)}
            sx={{ mb: 2 }}
          >
            Back to Profile
          </Button>
          
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Typography variant="h4" component="h1" gutterBottom>
              Subscription Management
            </Typography>
            
            <Button
              startIcon={isRefreshing ? <CircularProgress size={20} /> : <Refresh />}
              onClick={handleRefresh}
              disabled={isRefreshing}
              variant="outlined"
            >
              {isRefreshing ? 'Refreshing...' : 'Refresh'}
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={4}>
          {/* Current Subscription */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CreditCard />
                  Current Subscription
                </Typography>
                
                {subscription ? (
                  <>
                    <Grid container spacing={3} sx={{ mt: 2 }}>
                      <Grid item xs={12} md={6}>
                        <Box>
                          <Typography variant="h6" color="primary" gutterBottom>
                            {subscription.plan_name}
                          </Typography>
                          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
                            <Chip
                              icon={getStatusIcon(subscription)}
                              label={getStatusLabel(subscription)}
                              color={getStatusColor(subscription) as any}
                              size="small"
                            />
                            <Chip
                              label={subscription.billing_cycle.toUpperCase()}
                              variant="outlined"
                              size="small"
                            />
                          </Stack>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Amount:</strong> {formatCurrency(subscription.amount, subscription.currency)} per {subscription.billing_cycle}
                          </Typography>
                          
                          <Typography variant="body2" color="text.secondary" gutterBottom>
                            <strong>Current Period:</strong> {format(new Date(subscription.current_period_start), 'MMM dd, yyyy')} - {format(new Date(subscription.current_period_end), 'MMM dd, yyyy')}
                          </Typography>
                          
                          {subscription.cancelled_at && (
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                              <strong>Cancelled On:</strong> {format(new Date(subscription.cancelled_at), 'MMM dd, yyyy')}
                            </Typography>
                          )}
                          
                          {(subscription.cancel_at_period_end || subscription.is_cancelled) && (
                            <Alert severity="warning" sx={{ mt: 2 }}>
                              {subscription.is_cancelled 
                                ? `Your subscription was cancelled and will remain active until ${format(new Date(subscription.current_period_end), 'MMM dd, yyyy')}.`
                                : 'Your subscription will be cancelled at the end of the current billing period.'
                              }
                            </Alert>
                          )}
                        </Box>
                      </Grid>
                      
                      <Grid item xs={12} md={6}>
                        <Typography variant="subtitle2" gutterBottom>
                          Plan Features
                        </Typography>
                        <Stack spacing={1}>
                          <Typography variant="body2">
                            • {subscription.features.connections_limit === -1 ? 'Unlimited' : subscription.features.connections_limit} connections per month
                          </Typography>
                          {subscription.features.listings_limit > 0 && (
                            <Typography variant="body2">
                              • {subscription.features.listings_limit === -1 ? 'Unlimited' : subscription.features.listings_limit} active listings
                            </Typography>
                          )}
                          {subscription.features.priority_support && (
                            <Typography variant="body2">• Priority customer support</Typography>
                          )}
                          {subscription.features.advanced_analytics && (
                            <Typography variant="body2">• Advanced analytics</Typography>
                          )}
                          {subscription.features.featured_listings && (
                            <Typography variant="body2">• Featured listing placement</Typography>
                          )}
                        </Stack>
                      </Grid>
                    </Grid>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    {/* Usage Statistics */}
                    <Typography variant="subtitle2" gutterBottom>
                      Current Usage
                    </Typography>
                    <Grid container spacing={2}>
                      <Grid item xs={12} md={6}>
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Connections Used
                          </Typography>
                          <Typography variant="h6">
                            {subscription.usage.connections_used} / {subscription.features.connections_limit === -1 ? '∞' : subscription.features.connections_limit}
                          </Typography>
                        </Box>
                      </Grid>
                      {subscription.features.listings_limit > 0 && (
                        <Grid item xs={12} md={6}>
                          <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
                            <Typography variant="body2" color="text.secondary">
                              Active Listings
                            </Typography>
                            <Typography variant="h6">
                              {subscription.usage.listings_used} / {subscription.features.listings_limit === -1 ? '∞' : subscription.features.listings_limit}
                            </Typography>
                          </Box>
                        </Grid>
                      )}
                    </Grid>
                    
                    <Divider sx={{ my: 3 }} />
                    
                    {/* Actions */}
                    <Stack direction="row" spacing={2}>
                      <Button
                        variant="outlined"
                        onClick={() => navigate(ROUTES.SUBSCRIPTIONS)}
                      >
                        Change Plan
                      </Button>
                      
                      {subscription.status === 'active' && !subscription.cancel_at_period_end && (
                        <Button
                          variant="outlined"
                          color="error"
                          onClick={() => setCancelDialogOpen(true)}
                        >
                          Cancel Subscription
                        </Button>
                      )}
                    </Stack>
                  </>
                ) : (
                  <Box sx={{ textAlign: 'center', py: 4 }}>
                    <Typography variant="h6" color="text.secondary" gutterBottom>
                      No Active Subscription
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                      You don't have an active subscription. Choose a plan to get started.
                    </Typography>
                    <Button
                      variant="contained"
                      onClick={() => navigate(ROUTES.SUBSCRIPTIONS)}
                    >
                      View Plans
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </Grid>
          
          {/* Quick Actions */}
          <Grid item xs={12} lg={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Quick Actions
                </Typography>
                <Stack spacing={2}>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<CreditCard />}
                    onClick={() => navigate(ROUTES.SUBSCRIPTIONS)}
                  >
                    View All Plans
                  </Button>
                  <Button
                    fullWidth
                    variant="outlined"
                    startIcon={<Receipt />}
                    onClick={() => {
                      const element = document.getElementById('payment-history');
                      element?.scrollIntoView({ behavior: 'smooth' });
                    }}
                  >
                    View Payment History
                  </Button>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
        
        {/* Payment History */}
        <Card sx={{ mt: 4 }} id="payment-history">
          <CardContent sx={{ p: 4 }}>
            <Typography variant="h5" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Receipt />
              Payment History
            </Typography>
            
            {paymentHistory.length > 0 ? (
              <TableContainer component={Paper} sx={{ mt: 2 }}>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Date</TableCell>
                      <TableCell>Description</TableCell>
                      <TableCell>Amount</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Actions</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {paymentHistory.map((payment) => (
                      <TableRow key={payment.id}>
                        <TableCell>
                          {format(new Date(payment.payment_date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{payment.description}</TableCell>
                        <TableCell>
                          {formatCurrency(payment.amount, payment.currency)}
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={payment.status.toUpperCase()}
                            color={payment.status === 'succeeded' ? 'success' : payment.status === 'failed' ? 'error' : 'warning'}
                            size="small"
                          />
                        </TableCell>
                        <TableCell>
                          {payment.invoice_url && (
                            <Tooltip title="Download Invoice">
                              <IconButton
                                size="small"
                                onClick={() => window.open(payment.invoice_url, '_blank')}
                              >
                                <Download />
                              </IconButton>
                            </Tooltip>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            ) : (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography variant="body1" color="text.secondary">
                  No payment history available
                </Typography>
              </Box>
            )}
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Cancel Subscription Dialog */}
      <Dialog
        open={cancelDialogOpen}
        onClose={() => setCancelDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Cancel Subscription
          <IconButton onClick={() => setCancelDialogOpen(false)}>
            <Close />
          </IconButton>
        </DialogTitle>
        
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 3 }}>
            <Typography variant="body2">
              <strong>Are you sure you want to cancel your subscription?</strong>
            </Typography>
          </Alert>
          
          <Typography variant="body2" sx={{ mb: 2 }}>
            If you cancel your subscription:
          </Typography>
          
          <Box component="ul" sx={{ pl: 2, mb: 2 }}>
            <Typography component="li" variant="body2">
              You'll continue to have access until the end of your current billing period
            </Typography>
            <Typography component="li" variant="body2">
              You won't be charged for the next billing cycle
            </Typography>
            <Typography component="li" variant="body2">
              You can reactivate your subscription at any time
            </Typography>
            <Typography component="li" variant="body2">
              Your data and settings will be preserved
            </Typography>
          </Box>
          
          {subscription && (
            <Alert severity="info">
              Your subscription will remain active until{' '}
              <strong>{format(new Date(subscription.current_period_end), 'MMMM dd, yyyy')}</strong>
            </Alert>
          )}
        </DialogContent>
        
        <DialogActions sx={{ p: 3 }}>
          <Button
            onClick={() => setCancelDialogOpen(false)}
            disabled={isCancelling}
          >
            Keep Subscription
          </Button>
          <Button
            onClick={handleCancelSubscription}
            color="error"
            variant="contained"
            disabled={isCancelling}
            startIcon={isCancelling ? <CircularProgress size={20} /> : <Cancel />}
          >
            {isCancelling ? 'Cancelling...' : 'Cancel Subscription'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default ProfileSubscriptionPage;
