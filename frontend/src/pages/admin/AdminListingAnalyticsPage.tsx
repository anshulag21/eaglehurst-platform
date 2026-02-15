import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Grid,
  Button,
  Stack,
  Divider,
  CircularProgress,
  Alert,
  Paper,
  Chip,
  Avatar,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  Business,
  Visibility,
  TrendingUp,
  Assessment,
  ConnectWithoutContact,
  Message,
  Schedule,
  CheckCircle,
  Cancel,
  Person,
  LocationOn,
  CalendarToday,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { adminService } from '../../services/admin.service';

interface ListingAnalytics {
  listing: {
    id: string;
    title: string;
    description: string;
    business_type: string;
    location: string;
    asking_price?: number;
    status: string;
    created_at: string;
    seller: {
      id: string;
      business_name: string;
      user: {
        name: string;
        email: string;
      };
    };
  };
  analytics: {
    total_views: number;
    unique_views: number;
    views_this_week: number;
    views_this_month: number;
    connection_requests: number;
    approved_connections: number;
    pending_connections: number;
    conversion_rate: number;
    avg_time_on_page: number;
    bounce_rate: number;
  };
  viewers: Array<{
    buyer_id: string;
    buyer_name: string;
    buyer_email: string;
    verification_status: string;
    viewed_at: string;
    location?: string;
    view_count: number;
  }>;
  connections: Array<{
    id: string;
    buyer_name: string;
    buyer_email: string;
    status: string;
    initial_message: string;
    requested_at: string;
    responded_at?: string;
  }>;
}

const AdminListingAnalyticsPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<ListingAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listingId) {
      loadListingAnalytics();
    }
  }, [listingId]);

  const loadListingAnalytics = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Use the new consistent analytics service
      const analyticsResponse = await adminService.getListingAnalytics(listingId!);
      
      if (analyticsResponse.success && analyticsResponse.data) {
        // Get listing details to populate the listing info
        const listingResponse = await adminService.getListingDetailsForAdmin(listingId!);
        
        let finalAnalytics: ListingAnalytics;
        
        if (listingResponse.success && listingResponse.data) {
          // Merge listing details with analytics
          finalAnalytics = {
            listing: {
              id: listingId!,
              title: listingResponse.data.title || 'Untitled Listing',
              description: listingResponse.data.description || '',
              business_type: (listingResponse.data.business_type || 'full_sale').toUpperCase().replace('_', ' '),
              location: listingResponse.data.location || 'Location not specified',
              asking_price: listingResponse.data.asking_price,
              status: (listingResponse.data.status || 'draft').toUpperCase().replace('_', ' '),
              created_at: listingResponse.data.created_at || new Date().toISOString(),
              seller: listingResponse.data.seller || {
                id: 'unknown',
                business_name: listingResponse.data.practice_name || 'Unknown Business',
                user: {
                  name: 'Practice Owner',
                  email: 'owner@example.com'
                }
              }
            },
            analytics: analyticsResponse.data.analytics,
            viewers: analyticsResponse.data.viewers,
            connections: analyticsResponse.data.connections
          };
        } else {
          // Use analytics data with fallback listing info
          finalAnalytics = {
            listing: {
              id: listingId!,
              title: 'Practice Listing',
              description: 'Medical practice for sale',
              business_type: 'FULL SALE',
              location: 'UK',
              status: 'PUBLISHED',
              created_at: new Date().toISOString(),
              seller: {
                id: 'seller-1',
                business_name: 'Medical Practice',
                user: {
                  name: 'Practice Owner',
                  email: 'owner@example.com'
                }
              }
            },
            analytics: analyticsResponse.data.analytics,
            viewers: analyticsResponse.data.viewers,
            connections: analyticsResponse.data.connections
          };
        }
        
        setAnalytics(finalAnalytics);
      } else {
        setError('Failed to load listing analytics');
      }
    } catch (error) {
      console.error('Error loading listing analytics:', error);
      setError('Failed to load listing analytics');
      toast.error('Failed to load listing analytics');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const formatPrice = (price?: number) => {
    if (!price) return 'N/A';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDuration = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}m ${remainingSeconds}s`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'pending': return 'warning';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle fontSize="small" />;
      case 'rejected': return <Cancel fontSize="small" />;
      case 'pending': return <Schedule fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  if (error || !analytics) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Analytics not found'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
        >
          Back
        </Button>
      </Container>
    );
  }

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Button
            startIcon={<ArrowBack />}
            onClick={() => navigate(-1)}
            sx={{ mb: 2 }}
          >
            Back
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Listing Analytics
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Detailed performance metrics for "{analytics.listing.title}"
          </Typography>
        </Box>

        <Grid container spacing={3}>
          {/* Listing Overview */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Listing Overview
                </Typography>
                
                <Stack spacing={2}>
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Title
                    </Typography>
                    <Typography variant="body1">
                      {analytics.listing.title}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Business Type
                    </Typography>
                    <Chip
                      label={analytics.listing.business_type.replace('_', ' ').toUpperCase()}
                      size="small"
                      variant="outlined"
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Location
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOn fontSize="small" color="action" />
                      <Typography variant="body2">{analytics.listing.location}</Typography>
                    </Box>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Asking Price
                    </Typography>
                    <Typography variant="body1" fontWeight="medium">
                      {formatPrice(analytics.listing.asking_price)}
                    </Typography>
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Status
                    </Typography>
                    <Chip
                      icon={getStatusIcon(analytics.listing.status)}
                      label={analytics.listing.status.toUpperCase()}
                      color={getStatusColor(analytics.listing.status) as any}
                      size="small"
                    />
                  </Box>
                  
                  <Box>
                    <Typography variant="subtitle2" color="text.secondary">
                      Created
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <CalendarToday fontSize="small" color="action" />
                      <Typography variant="body2">
                        {formatDate(analytics.listing.created_at)}
                      </Typography>
                    </Box>
                  </Box>
                </Stack>

                <Divider sx={{ my: 2 }} />

                <Typography variant="subtitle2" gutterBottom>
                  Seller Information
                </Typography>
                <Stack spacing={1}>
                  <Typography variant="body2" fontWeight="medium">
                    {analytics.listing.seller.business_name}
                  </Typography>
                  <Typography variant="body2">
                    {analytics.listing.seller.user.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {analytics.listing.seller.user.email}
                  </Typography>
                </Stack>
              </CardContent>
            </Card>
          </Grid>

          {/* Analytics Metrics */}
          <Grid item xs={12} md={8}>
            {/* Key Metrics */}
            <Grid container spacing={2} sx={{ mb: 3 }}>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Visibility sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" color="primary">
                      {analytics.analytics.total_views}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Views
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <ConnectWithoutContact sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" color="success.main">
                      {analytics.analytics.connection_requests}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Connections
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" color="info.main">
                      {analytics.analytics.conversion_rate.toFixed(1)}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conversion Rate
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
              <Grid item xs={6} sm={3}>
                <Card>
                  <CardContent sx={{ textAlign: 'center' }}>
                    <Schedule sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {formatDuration(analytics.analytics.avg_time_on_page)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Time
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            </Grid>

            {/* Detailed Analytics */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Performance Metrics
                </Typography>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        View Statistics
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Unique Views:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {analytics.analytics.unique_views}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">This Week:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {analytics.analytics.views_this_week}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">This Month:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {analytics.analytics.views_this_month}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Bounce Rate:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {analytics.analytics.bounce_rate.toFixed(1)}%
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                  <Grid item xs={12} md={6}>
                    <Paper sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        Connection Statistics
                      </Typography>
                      <Stack spacing={1}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Total Requests:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {analytics.analytics.connection_requests}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Approved:</Typography>
                          <Typography variant="body2" fontWeight="medium" color="success.main">
                            {analytics.analytics.approved_connections}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Pending:</Typography>
                          <Typography variant="body2" fontWeight="medium" color="warning.main">
                            {analytics.analytics.pending_connections}
                          </Typography>
                        </Box>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                          <Typography variant="body2">Success Rate:</Typography>
                          <Typography variant="body2" fontWeight="medium">
                            {analytics.analytics.connection_requests > 0 ? 
                              ((analytics.analytics.approved_connections / analytics.analytics.connection_requests) * 100).toFixed(1) : 0}%
                          </Typography>
                        </Box>
                      </Stack>
                    </Paper>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>

            {/* Recent Viewers */}
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Recent Viewers
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Buyer</TableCell>
                        <TableCell>Speciality</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Location</TableCell>
                        <TableCell>Views</TableCell>
                        <TableCell>Last Viewed</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.viewers.map((viewer) => (
                        <TableRow key={viewer.buyer_id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                <Person />
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {viewer.buyer_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {viewer.buyer_email}
                                </Typography>
                                {(viewer as any).experience_level && (
                                  <Typography variant="caption" color="text.secondary">
                                    {(viewer as any).experience_level} Level
                                  </Typography>
                                )}
                              </Box>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ fontWeight: 500 }}>
                              {(viewer as any).speciality || 'General Practice'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(viewer.verification_status)}
                              label={viewer.verification_status.toUpperCase()}
                              color={getStatusColor(viewer.verification_status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {viewer.location || 'Unknown'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Typography variant="body2" fontWeight="medium">
                                {viewer.view_count}
                              </Typography>
                              {viewer.view_count >= 5 && (
                                <Chip 
                                  label="High Interest" 
                                  size="small" 
                                  color="success" 
                                  variant="outlined"
                                />
                              )}
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(viewer.viewed_at)}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>

            {/* Connection Requests */}
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Connection Requests
                </Typography>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Buyer</TableCell>
                        <TableCell>Status</TableCell>
                        <TableCell>Message</TableCell>
                        <TableCell>Requested</TableCell>
                        <TableCell>Responded</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {analytics.connections.map((connection) => (
                        <TableRow key={connection.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2">
                                {connection.buyer_name}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                {connection.buyer_email}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(connection.status)}
                              label={connection.status.toUpperCase()}
                              color={getStatusColor(connection.status) as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" sx={{ maxWidth: 200 }}>
                              {connection.initial_message.substring(0, 50)}
                              {connection.initial_message.length > 50 ? '...' : ''}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {formatDate(connection.requested_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">
                              {connection.responded_at ? formatDate(connection.responded_at) : 'Not responded'}
                            </Typography>
                          </TableCell>
                        </TableRow>
                      ))}
                      {analytics.connections.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={5} sx={{ textAlign: 'center', py: 4 }}>
                            <Typography variant="body2" color="text.secondary">
                              No connection requests yet
                            </Typography>
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </TableContainer>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default AdminListingAnalyticsPage;
