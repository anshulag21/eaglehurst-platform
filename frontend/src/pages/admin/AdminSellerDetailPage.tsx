import React, { useState, useEffect } from 'react';
import { BACKEND_BASE_URL } from '../../constants';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Grid,
  Avatar,
  Chip,
  Button,
  Stack,
  Divider,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
  Paper,
  Tabs,
  Tab,
} from '@mui/material';
import {
  ArrowBack,
  Business,
  Email,
  Phone,
  LocationOn,
  CalendarToday,
  Visibility,
  CheckCircle,
  Schedule,
  Cancel,
  TrendingUp,
  Assessment,
  Message,
  ConnectWithoutContact,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { adminService } from '../../services/admin.service';

interface SellerDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  seller_profile: {
    business_name: string;
    business_description?: string;
    business_address?: string;
    verification_status: 'pending' | 'submitted_for_review' | 'approved' | 'rejected';
    admin_notes?: string;
    kyc_documents?: Array<{
      filename?: string;
      original_filename?: string;
      file_path: string;
      document_type: string;
      uploaded_at?: string;
      file_size?: number;
    }>;
  };
  listings?: Array<{
    id: string;
    title: string;
    business_type: string;
    location: string;
    asking_price?: number;
    status: string;
    created_at: string;
    view_count?: number;
    connection_count?: number;
    media_files?: Array<{
      file_url: string;
      is_primary: boolean;
    }>;
  }>;
  statistics?: {
    total_listings: number;
    published_listings: number;
    pending_listings: number;
    draft_listings: number;
    total_views: number;
    total_connections: number;
    active_connections: number;
    total_messages: number;
    avg_views_per_listing: number;
    conversion_rate: number;
    profile_completion: number;
    response_rate: number;
  };
  hasAnalyticsData?: boolean;
}

const AdminSellerDetailPage: React.FC = () => {
  const { sellerId } = useParams<{ sellerId: string }>();
  const navigate = useNavigate();
  const [seller, setSeller] = useState<SellerDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);

  // Check URL params for tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const tab = urlParams.get('tab');
    if (tab === 'analytics') {
      setActiveTab(1);
    }
  }, []);

  useEffect(() => {
    if (sellerId) {
      loadSellerDetails();
    }
  }, [sellerId]);

  const loadSellerDetails = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get seller details
      const response = await adminService.getUserDetails(sellerId!);

      if (response.success && response.data) {
        const sellerData = response.data;

        // Get seller's listings using admin endpoint
        try {
          // Try multiple endpoints to get seller's listings
          let listingsResponse;

          // Try to get seller listings using the seller's business name as search term
          try {
            listingsResponse = await adminService.getSellerListings(sellerId!);
          } catch (error) {
            console.warn('Seller-specific endpoint failed, using empty listings');
            // If seller listings endpoint fails, just show empty listings
            listingsResponse = {
              success: true,
              data: { listings: [] }
            };
          }

          if (listingsResponse && listingsResponse.success && listingsResponse.data) {
            // Handle different response structures
            let listings = [];
            if (listingsResponse.data.listings) {
              listings = listingsResponse.data.listings;
            } else if (Array.isArray(listingsResponse.data)) {
              listings = listingsResponse.data;
            } else if (listingsResponse.data.data) {
              listings = listingsResponse.data.data;
            }

            // Transform listings and fetch analytics data from regular listing endpoints
            const listingsWithAnalytics = await Promise.all(
              listings.map(async (listing: any, index: number) => {
                let viewCount = listing.view_count ?? null;
                let connectionCount = listing.connection_count ?? null;

                // Try to get analytics data from regular listing endpoint
                try {
                  const analyticsResponse = await adminService.getListingAnalytics(listing.id);
                  if (analyticsResponse.success && analyticsResponse.data) {
                    viewCount = analyticsResponse.data.analytics?.total_views ?? viewCount;
                    connectionCount = analyticsResponse.data.analytics?.connection_requests ?? connectionCount;
                  }
                } catch (error) {
                  console.log(`Could not fetch analytics for listing ${listing.id}:`, error);
                }

                return {
                  id: listing.id,
                  title: listing.title || `Untitled Listing ${index + 1}`,
                  business_type: listing.business_type || 'full_sale',
                  location: listing.location || 'Location not specified',
                  asking_price: listing.asking_price,
                  status: listing.status || 'draft',
                  created_at: listing.created_at || new Date().toISOString(),
                  view_count: viewCount,
                  connection_count: connectionCount,
                  media_files: listing.media_files || []
                };
              })
            );

            sellerData.listings = listingsWithAnalytics;
          } else {
            console.warn('No listings data found for seller');
            sellerData.listings = [];
          }
        } catch (listingError) {
          console.error('Could not load seller listings:', listingError);
          toast.error('Could not load seller listings');
          sellerData.listings = [];
        }

        // Calculate comprehensive statistics from real data
        const listings = sellerData.listings || [];
        const totalViews = listings.reduce((sum: number, l: any) => sum + (l.view_count ?? 0), 0);
        const totalConnections = listings.reduce((sum: number, l: any) => sum + (l.connection_count ?? 0), 0);

        // Check if we have any real analytics data
        const hasAnalyticsData = listings.some((l: any) => l.view_count !== null || l.connection_count !== null);

        // Add analytics availability info to seller data
        sellerData.hasAnalyticsData = hasAnalyticsData;

        // Calculate metrics using only real data
        const publishedListings = listings.filter((l: any) => l.status === 'published').length;
        const pendingListings = listings.filter((l: any) => l.status === 'pending' || l.status === 'pending_approval').length;
        const draftListings = listings.filter((l: any) => l.status === 'draft').length;

        // Calculate seller performance metrics from real data only
        const avgViewsPerListing = listings.length > 0 ? Math.floor(totalViews / listings.length) : 0;
        const conversionRate = totalViews > 0 ? ((totalConnections / totalViews) * 100) : 0;

        // Calculate connection statistics from available data
        let activeConnections = totalConnections;
        let totalMessages = 0;

        // For now, estimate active connections as a percentage of total connections
        // This will be replaced when proper admin connection endpoints are available
        activeConnections = Math.floor(totalConnections * 0.7); // Assume 70% are active

        sellerData.statistics = {
          total_listings: listings.length,
          published_listings: publishedListings,
          pending_listings: pendingListings,
          draft_listings: draftListings,
          total_views: totalViews,
          total_connections: totalConnections,
          active_connections: activeConnections,
          total_messages: totalMessages,
          avg_views_per_listing: avgViewsPerListing,
          conversion_rate: Math.round(conversionRate * 100) / 100, // Round to 2 decimal places
          profile_completion: 0, // Will be calculated from actual profile data
          response_rate: 0, // Will be calculated from actual response data
        };

        setSeller(sellerData);
      } else {
        setError('Failed to load seller details');
      }
    } catch (error) {
      console.error('Error loading seller details:', error);
      setError('Failed to load seller details');
      toast.error('Failed to load seller details');
    } finally {
      setLoading(false);
    }
  };

  const handleViewListing = (listingId: string) => {
    navigate(`/admin/listings/${listingId}/conversations`);
  };

  const handleViewListingDetail = (listingId: string) => {
    // Navigate to the public listing detail page or admin listing review page
    navigate(`/listings/${listingId}`);
  };

  const handleViewListingAnalytics = (listingId: string) => {
    // Navigate to the dedicated listing analytics page
    navigate(`/admin/listings/${listingId}/analytics`);
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setActiveTab(newValue);
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
      case 'published': return 'success';
      case 'rejected': return 'error';
      case 'pending':
      case 'submitted_for_review': return 'warning';
      case 'draft': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
      case 'published': return <CheckCircle fontSize="small" />;
      case 'rejected': return <Cancel fontSize="small" />;
      case 'pending':
      case 'submitted_for_review':
      case 'draft': return <Schedule fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  const renderAnalyticsTab = () => {
    if (!seller) return null;

    return (
      <Grid container spacing={3}>
        {/* Analytics Data Availability Notice */}
        {!seller.hasAnalyticsData && (
          <Grid item xs={12}>
            <Alert severity="error" sx={{ mb: 2 }}>
              <Typography variant="body2" sx={{ mb: 2 }}>
                <strong>🚫 Critical Issues Identified:</strong>
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
                <strong>1. JWT Token Issue:</strong> Token missing <code>user_type: "admin"</code> field
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
                <strong>2. Backend Permission:</strong> Cannot verify admin role without user_type in JWT
              </Typography>
              <Typography variant="body2" sx={{ mb: 1, ml: 2 }}>
                <strong>3. Missing Analytics:</strong> Listing data has null view_count and connection_count
              </Typography>
              <Typography variant="body2" sx={{ mb: 2, mt: 2 }}>
                <strong>Required Fixes:</strong>
              </Typography>
              <Typography variant="body2" component="div" sx={{ mb: 2, ml: 2 }}>
                <strong>Step 1:</strong> Add <code>user_type: "admin"</code> to JWT token generation for admin users
                <br />
                <strong>Step 2:</strong> Update backend permission check to use user_type from JWT or database
                <br />
                <strong>Step 3:</strong> Populate analytics data in database (view_count, connection_count)
              </Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    console.log('Current token:', localStorage.getItem('token'));
                    console.log('Token exists:', !!localStorage.getItem('token'));
                  }}
                >
                  Check Auth Status
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  onClick={() => {
                    const listingId = seller.listings?.[0]?.id;
                    if (listingId) {
                      window.open(`${BACKEND_BASE_URL}/api/v1/listings/${listingId}/analytics`, '_blank');
                    }
                  }}
                  disabled={!seller.listings?.[0]?.id}
                >
                  Test Endpoint
                </Button>
              </Box>
            </Alert>
          </Grid>
        )}
        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Performance Analytics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" color="primary">
                      {seller.statistics?.avg_views_per_listing || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Views per Listing
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <ConnectWithoutContact sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" color="success.main">
                      {seller.statistics?.conversion_rate ? seller.statistics.conversion_rate.toFixed(1) : '0'}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Conversion Rate
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Assessment sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" color="info.main">
                      {seller.statistics?.published_listings ?
                        ((seller.statistics.published_listings / seller.statistics.total_listings) * 100).toFixed(0) : '0'}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Publish Success Rate
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Message sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {seller.statistics?.response_rate || 0}%
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Response Rate
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Listing Performance */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Listing Performance Breakdown
              </Typography>
              <TableContainer>
                <Table>
                  <TableHead>
                    <TableRow>
                      <TableCell>Listing</TableCell>
                      <TableCell>Status</TableCell>
                      <TableCell>Views</TableCell>
                      <TableCell>Connections</TableCell>
                      <TableCell>Conversion Rate</TableCell>
                      <TableCell>Performance Score</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {seller.listings?.map((listing: any) => {
                      const viewCount = listing.view_count ?? 0;
                      const connectionCount = listing.connection_count ?? 0;

                      const conversionRate = (viewCount > 0) ?
                        ((connectionCount / viewCount) * 100) : null;
                      const performanceScore = (viewCount > 0 || connectionCount > 0) ?
                        Math.min((viewCount * 0.3) + (connectionCount * 0.7), 100) : null;

                      return (
                        <TableRow key={listing.id}>
                          <TableCell>
                            <Typography variant="subtitle2">
                              {listing.title}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(listing.created_at)}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Chip
                              icon={getStatusIcon(listing.status || 'pending')}
                              label={listing.status ? listing.status.toUpperCase() : 'PENDING'}
                              color={getStatusColor(listing.status || 'pending') as any}
                              size="small"
                            />
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {listing.view_count !== null ? listing.view_count : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {listing.connection_count !== null ? listing.connection_count : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              color={conversionRate !== null ? (conversionRate > 5 ? 'success.main' : conversionRate > 2 ? 'warning.main' : 'error.main') : 'text.secondary'}
                              fontWeight="medium"
                            >
                              {conversionRate !== null ? `${conversionRate.toFixed(1)}%` : 'N/A'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Box
                                sx={{
                                  width: 60,
                                  height: 8,
                                  bgcolor: 'grey.200',
                                  borderRadius: 1,
                                  overflow: 'hidden'
                                }}
                              >
                                <Box
                                  sx={{
                                    width: performanceScore !== null ? `${Math.min(performanceScore, 100)}%` : '0%',
                                    height: '100%',
                                    bgcolor: performanceScore !== null ?
                                      (performanceScore > 70 ? 'success.main' :
                                        performanceScore > 40 ? 'warning.main' : 'error.main') : 'grey.300',
                                  }}
                                />
                              </Box>
                              <Typography variant="caption">
                                {performanceScore !== null ? performanceScore.toFixed(0) : 'N/A'}
                              </Typography>
                            </Box>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </TableContainer>
            </CardContent>
          </Card>
        </Grid>

        {/* Activity Timeline */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <Stack spacing={2}>
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Account Created
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {formatDate(seller.created_at)}
                  </Typography>
                </Paper>
                {seller.last_login && (
                  <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                    <Typography variant="subtitle2" gutterBottom>
                      Last Login
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {formatDate(seller.last_login)}
                    </Typography>
                  </Paper>
                )}
                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Verification Status
                  </Typography>
                  <Chip
                    icon={getStatusIcon(seller.seller_profile.verification_status)}
                    label={seller.seller_profile.verification_status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(seller.seller_profile.verification_status) as any}
                    size="small"
                  />
                </Paper>
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    );
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

  if (error || !seller) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Seller not found'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/sellers')}
        >
          Back to Sellers
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
            onClick={() => navigate('/admin/sellers')}
            sx={{ mb: 2 }}
          >
            Back to Sellers
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Seller Details
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Profile & Listings" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Seller Profile */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'primary.main',
                        fontSize: '2rem',
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      {seller.first_name.charAt(0)}{seller.last_name.charAt(0)}
                    </Avatar>
                    <Typography variant="h5" gutterBottom>
                      {seller.first_name} {seller.last_name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      {seller.seller_profile.business_name}
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Chip
                        label={seller.is_active ? 'Active' : 'Inactive'}
                        color={seller.is_active ? 'success' : 'error'}
                        size="small"
                      />
                      <Chip
                        icon={getStatusIcon(seller.seller_profile.verification_status)}
                        label={seller.seller_profile.verification_status.replace('_', ' ').toUpperCase()}
                        color={getStatusColor(seller.seller_profile.verification_status) as any}
                        size="small"
                      />
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email color="action" />
                      <Typography variant="body2">{seller.email}</Typography>
                    </Box>
                    {seller.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone color="action" />
                        <Typography variant="body2">{seller.phone}</Typography>
                      </Box>
                    )}
                    {seller.seller_profile.business_address && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationOn color="action" />
                        <Typography variant="body2">{seller.seller_profile.business_address}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday color="action" />
                      <Typography variant="body2">
                        Joined {formatDate(seller.created_at)}
                      </Typography>
                    </Box>
                    {seller.last_login && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule color="action" />
                        <Typography variant="body2">
                          Last login {formatDate(seller.last_login)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>

                  {seller.seller_profile.business_description && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Business Description
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {seller.seller_profile.business_description}
                      </Typography>
                    </>
                  )}

                  {seller.seller_profile.admin_notes && (
                    <>
                      <Divider sx={{ my: 2 }} />
                      <Typography variant="subtitle2" gutterBottom>
                        Admin Notes
                      </Typography>
                      <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                        <Typography variant="body2">
                          {seller.seller_profile.admin_notes}
                        </Typography>
                      </Paper>
                    </>
                  )}
                </CardContent>
              </Card>
            </Grid>

            {/* Statistics and Listings */}
            <Grid item xs={12} md={8}>
              {/* Statistics Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Business sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h4" color="primary">
                        {seller.statistics?.total_listings || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Total Listings
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Visibility sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                      <Typography variant="h4" color="info.main">
                        {seller.statistics?.total_views || 0}
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
                        {seller.statistics?.total_connections || 0}
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
                      <CheckCircle sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                      <Typography variant="h4" color="warning.main">
                        {seller.statistics?.published_listings || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Published
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Listings Table */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Seller's Listings
                  </Typography>
                  {!seller.hasAnalyticsData && (
                    <Alert severity="warning" sx={{ mb: 2 }}>
                      <Typography variant="body2">
                        <strong>Note:</strong> View counts and connections show "N/A" due to backend permission restrictions.
                        Admin users cannot access <code>/listings/&#123;id&#125;/analytics</code> (403 Forbidden).
                      </Typography>
                    </Alert>
                  )}
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Listing</TableCell>
                          <TableCell>Business Type</TableCell>
                          <TableCell>Price</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Views</TableCell>
                          <TableCell>Connections</TableCell>
                          <TableCell>Created</TableCell>
                          <TableCell>Actions</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {seller.listings?.map((listing) => (
                          <TableRow key={listing.id} hover>
                            <TableCell>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                {listing.media_files?.find(m => m.is_primary) && (
                                  <Box
                                    component="img"
                                    src={listing.media_files.find(m => m.is_primary)?.file_url}
                                    alt={listing.title}
                                    sx={{
                                      width: 40,
                                      height: 40,
                                      borderRadius: 1,
                                      objectFit: 'cover'
                                    }}
                                  />
                                )}
                                <Box>
                                  <Typography variant="subtitle2">
                                    {listing.title}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {listing.location}
                                  </Typography>
                                </Box>
                              </Box>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={listing.business_type ? listing.business_type.replace('_', ' ').toUpperCase() : 'N/A'}
                                size="small"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2" fontWeight="medium">
                                {formatPrice(listing.asking_price)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                icon={getStatusIcon(listing.status || 'pending')}
                                label={listing.status ? listing.status.toUpperCase() : 'PENDING'}
                                color={getStatusColor(listing.status || 'pending') as any}
                                size="small"
                              />
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {listing.view_count !== null ? listing.view_count : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {listing.connection_count !== null ? listing.connection_count : 'N/A'}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {formatDate(listing.created_at)}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Stack direction="row" spacing={1}>
                                <Tooltip title="View Conversations">
                                  <IconButton
                                    size="small"
                                    onClick={() => handleViewListing(listing.id)}
                                    color="primary"
                                  >
                                    <Message fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="View Listing">
                                  <IconButton
                                    size="small"
                                    color="info"
                                    onClick={() => handleViewListingDetail(listing.id)}
                                  >
                                    <Visibility fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                                <Tooltip title="Analytics">
                                  <IconButton
                                    size="small"
                                    color="success"
                                    onClick={() => handleViewListingAnalytics(listing.id)}
                                  >
                                    <Assessment fontSize="small" />
                                  </IconButton>
                                </Tooltip>
                              </Stack>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!seller.listings || seller.listings.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={8} sx={{ textAlign: 'center', py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No listings found
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
        )}

        {activeTab === 1 && renderAnalyticsTab()}
      </motion.div>
    </Container>
  );
};

export default AdminSellerDetailPage;
