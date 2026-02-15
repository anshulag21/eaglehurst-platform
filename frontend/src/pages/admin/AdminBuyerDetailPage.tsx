import React, { useState, useEffect } from 'react';
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
  Person,
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
  Business,
  Bookmark,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { adminService } from '../../services/admin.service';

interface BuyerDetail {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  buyer_profile: {
    verification_status: 'pending' | 'approved' | 'rejected';
    preferences?: {
      business_types?: string[];
      location_preferences?: string[];
      price_range?: {
        min?: number;
        max?: number;
      };
    };
  };
  connections?: Array<{
    id: string;
    status: string;
    requested_at: string;
  }>;
  statistics?: {
    total_connections: number;
    active_connections: number;
    saved_listings: number;
    total_messages: number;
    listings_viewed: number;
    avg_response_time: number;
  };
  analytics_details?: {
    messages_sent: number;
    messages_received: number;
    unread_messages: number;
    recent_activity: number;
    connection_message_counts: Record<string, number>;
  };
}

const AdminBuyerDetailPage: React.FC = () => {
  const { buyerId } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();
  const [buyer, setBuyer] = useState<BuyerDetail | null>(null);
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
    if (buyerId) {
      loadBuyerDetails();
    }
  }, [buyerId]);

  const loadBuyerDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Get buyer details
      const response = await adminService.getUserDetails(buyerId!);
      
      if (response.success && response.data) {
        const buyerData = response.data;
        
        // Get real buyer analytics if available
        try {
          const analyticsResponse = await adminService.getBuyerAnalytics(buyerId!);
          if (analyticsResponse.success && analyticsResponse.data) {
            const analytics = analyticsResponse.data;
            buyerData.statistics = {
              total_connections: analytics.total_connections || 0,
              active_connections: analytics.active_connections || 0,
              saved_listings: analytics.saved_listings || 0,
              total_messages: analytics.total_messages || 0,
              listings_viewed: analytics.listings_viewed || analytics.total_searches || 0,
              avg_response_time: analytics.avg_response_time || 0,
            };
            
            // Store additional analytics data
            buyerData.analytics_details = {
              messages_sent: analytics.messages_sent || 0,
              messages_received: analytics.messages_received || 0,
              unread_messages: analytics.unread_messages || 0,
              recent_activity: analytics.recent_activity || 0,
              connection_message_counts: analytics.connection_message_counts || {}
            };
          }
        } catch (analyticsError) {
          console.warn('Could not load buyer analytics:', analyticsError);
          // Use basic statistics from user details if analytics fail
          buyerData.statistics = {
            total_connections: buyerData.connections?.length || 0,
            active_connections: buyerData.connections?.filter((c: any) => c.status === 'approved').length || 0,
            saved_listings: 0,
            total_messages: 0,
            listings_viewed: 0,
            avg_response_time: 0,
          };
          buyerData.analytics_details = {
            messages_sent: 0,
            messages_received: 0,
            unread_messages: 0,
            recent_activity: 0,
            connection_message_counts: {}
          };
        }

        setBuyer(buyerData);
      } else {
        setError('Failed to load buyer details');
      }
    } catch (error) {
      console.error('Error loading buyer details:', error);
      setError('Failed to load buyer details');
      toast.error('Failed to load buyer details');
    } finally {
      setLoading(false);
    }
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

  const calculateActivityLevel = (buyer: BuyerDetail) => {
    if (!buyer.statistics || !buyer.analytics_details) {
      return { percentage: 0, label: 'No Data', color: 'grey.500' };
    }

    const stats = buyer.statistics;
    const details = buyer.analytics_details;
    
    // Calculate activity score based on multiple factors
    let score = 0;
    let maxScore = 0;

    // Recent activity (30 days) - weight: 40%
    const recentActivity = details.recent_activity || 0;
    if (recentActivity > 0) {
      score += Math.min(recentActivity / 10, 1) * 40; // Max 40 points for 10+ recent views
    }
    maxScore += 40;

    // Message activity - weight: 30%
    const totalMessages = stats.total_messages || 0;
    if (totalMessages > 0) {
      score += Math.min(totalMessages / 20, 1) * 30; // Max 30 points for 20+ messages
    }
    maxScore += 30;

    // Connection activity - weight: 20%
    const totalConnections = stats.total_connections || 0;
    if (totalConnections > 0) {
      score += Math.min(totalConnections / 5, 1) * 20; // Max 20 points for 5+ connections
    }
    maxScore += 20;

    // Response time (lower is better) - weight: 10%
    const responseTime = stats.avg_response_time || 0;
    if (responseTime > 0) {
      // Good response time (< 2 hours) gets full points, decreases as time increases
      const responseScore = Math.max(0, 1 - (responseTime / 24)) * 10; // 24 hours = 0 points
      score += responseScore;
    }
    maxScore += 10;

    // Calculate percentage
    const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
    
    // Determine label and color based on percentage
    let label: string;
    let color: string;
    
    if (percentage >= 70) {
      label = 'High';
      color = 'success.main';
    } else if (percentage >= 40) {
      label = 'Medium';
      color = 'warning.main';
    } else if (percentage >= 10) {
      label = 'Low';
      color = 'error.main';
    } else {
      label = 'Inactive';
      color = 'grey.500';
    }

    return { percentage, label, color };
  };

  const renderAnalyticsTab = () => {
    if (!buyer) return null;

    return (
      <Grid container spacing={3}>
        {/* Performance Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Buyer Analytics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Visibility sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" color="primary">
                      {buyer.statistics?.listings_viewed || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Listings Viewed
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <ConnectWithoutContact sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" color="success.main">
                      {buyer.statistics?.total_connections || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Connection Requests
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Bookmark sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" color="info.main">
                      {buyer.statistics?.saved_listings || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Saved Listings
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Message sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {buyer.statistics?.avg_response_time || 0}h
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Avg Response Time
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Enhanced Message Analytics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Message Analytics
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Message sx={{ fontSize: 40, color: 'primary.main', mb: 1 }} />
                    <Typography variant="h4" color="primary.main">
                      {buyer.analytics_details?.messages_sent || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Messages Sent
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Message sx={{ fontSize: 40, color: 'success.main', mb: 1 }} />
                    <Typography variant="h4" color="success.main">
                      {buyer.analytics_details?.messages_received || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Messages Received
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <Schedule sx={{ fontSize: 40, color: 'warning.main', mb: 1 }} />
                    <Typography variant="h4" color="warning.main">
                      {buyer.analytics_details?.unread_messages || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Unread Messages
                    </Typography>
                  </Paper>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                  <Paper sx={{ p: 2, textAlign: 'center' }}>
                    <TrendingUp sx={{ fontSize: 40, color: 'info.main', mb: 1 }} />
                    <Typography variant="h4" color="info.main">
                      {buyer.analytics_details?.recent_activity || 0}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Recent Views (30d)
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Engagement Metrics */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Engagement Analysis
              </Typography>
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Connection Success Rate
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 100,
                          height: 10,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            width: `${buyer.statistics?.total_connections ? 
                              (buyer.statistics.active_connections / buyer.statistics.total_connections * 100) : 0}%`,
                            height: '100%',
                            bgcolor: 'success.main',
                          }}
                        />
                      </Box>
                      <Typography variant="h6" color="success.main">
                        {buyer.statistics?.total_connections ? 
                          ((buyer.statistics.active_connections / buyer.statistics.total_connections) * 100).toFixed(0) : 0}%
                      </Typography>
                    </Box>
                  </Paper>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Paper sx={{ p: 3 }}>
                    <Typography variant="subtitle1" gutterBottom>
                      Activity Level
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                      <Box
                        sx={{
                          width: 100,
                          height: 10,
                          bgcolor: 'grey.200',
                          borderRadius: 1,
                          overflow: 'hidden'
                        }}
                      >
                        <Box
                          sx={{
                            width: `${calculateActivityLevel(buyer).percentage}%`,
                            height: '100%',
                            bgcolor: calculateActivityLevel(buyer).color,
                          }}
                        />
                      </Box>
                      <Typography variant="h6" sx={{ color: calculateActivityLevel(buyer).color }}>
                        {calculateActivityLevel(buyer).label}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                      Based on recent views, messages, connections, and response time
                    </Typography>
                  </Paper>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Preferences */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Buyer Preferences
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Business Types of Interest
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {buyer.buyer_profile.preferences?.business_types?.map((type) => (
                      <Chip key={type} label={type.replace('_', ' ').toUpperCase()} size="small" />
                    )) || (
                      <Typography variant="body2" color="text.secondary">
                        No preferences set
                      </Typography>
                    )}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Location Preferences
                  </Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" gap={1}>
                    {buyer.buyer_profile.preferences?.location_preferences?.map((location) => (
                      <Chip key={location} label={location} size="small" variant="outlined" />
                    )) || (
                      <Typography variant="body2" color="text.secondary">
                        No location preferences
                      </Typography>
                    )}
                  </Stack>
                </Grid>
                <Grid item xs={12} md={4}>
                  <Typography variant="subtitle2" gutterBottom>
                    Price Range
                  </Typography>
                  {buyer.buyer_profile.preferences?.price_range ? (
                    <Typography variant="body2">
                      {formatPrice(buyer.buyer_profile.preferences.price_range.min)} - {formatPrice(buyer.buyer_profile.preferences.price_range.max)}
                    </Typography>
                  ) : (
                    <Typography variant="body2" color="text.secondary">
                      No price range set
                    </Typography>
                  )}
                </Grid>
              </Grid>
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

  if (error || !buyer) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Buyer not found'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate('/admin/buyers')}
        >
          Back to Buyers
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
            onClick={() => navigate('/admin/buyers')}
            sx={{ mb: 2 }}
          >
            Back to Buyers
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Buyer Details
          </Typography>
        </Box>

        {/* Tabs */}
        <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
          <Tabs value={activeTab} onChange={handleTabChange}>
            <Tab label="Profile & Connections" />
            <Tab label="Analytics" />
          </Tabs>
        </Box>

        {activeTab === 0 && (
          <Grid container spacing={3}>
            {/* Buyer Profile */}
            <Grid item xs={12} md={4}>
              <Card>
                <CardContent>
                  <Box sx={{ textAlign: 'center', mb: 3 }}>
                    <Avatar
                      sx={{
                        width: 80,
                        height: 80,
                        bgcolor: 'secondary.main',
                        fontSize: '2rem',
                        mx: 'auto',
                        mb: 2
                      }}
                    >
                      {buyer.first_name.charAt(0)}{buyer.last_name.charAt(0)}
                    </Avatar>
                    <Typography variant="h5" gutterBottom>
                      {buyer.first_name} {buyer.last_name}
                    </Typography>
                    <Typography variant="body1" color="text.secondary" gutterBottom>
                      Buyer
                    </Typography>
                    <Stack direction="row" spacing={1} justifyContent="center">
                      <Chip
                        label={buyer.is_active ? 'Active' : 'Inactive'}
                        color={buyer.is_active ? 'success' : 'error'}
                        size="small"
                      />
                      <Chip
                        icon={getStatusIcon(buyer.buyer_profile.verification_status)}
                        label={buyer.buyer_profile.verification_status.toUpperCase()}
                        color={getStatusColor(buyer.buyer_profile.verification_status) as any}
                        size="small"
                      />
                    </Stack>
                  </Box>

                  <Divider sx={{ my: 2 }} />

                  <Stack spacing={2}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Email color="action" />
                      <Typography variant="body2">{buyer.email}</Typography>
                    </Box>
                    {buyer.phone && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Phone color="action" />
                        <Typography variant="body2">{buyer.phone}</Typography>
                      </Box>
                    )}
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday color="action" />
                      <Typography variant="body2">
                        Joined {formatDate(buyer.created_at)}
                      </Typography>
                    </Box>
                    {buyer.last_login && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Schedule color="action" />
                        <Typography variant="body2">
                          Last login {formatDate(buyer.last_login)}
                        </Typography>
                      </Box>
                    )}
                  </Stack>
                </CardContent>
              </Card>
            </Grid>

            {/* Statistics and Connections */}
            <Grid item xs={12} md={8}>
              {/* Statistics Cards */}
              <Grid container spacing={2} sx={{ mb: 3 }}>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <ConnectWithoutContact sx={{ fontSize: 32, color: 'primary.main', mb: 1 }} />
                      <Typography variant="h4" color="primary">
                        {buyer.statistics?.total_connections || 0}
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
                      <Bookmark sx={{ fontSize: 32, color: 'info.main', mb: 1 }} />
                      <Typography variant="h4" color="info.main">
                        {buyer.statistics?.saved_listings || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Saved
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Message sx={{ fontSize: 32, color: 'success.main', mb: 1 }} />
                      <Typography variant="h4" color="success.main">
                        {buyer.statistics?.total_messages || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Messages
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Card>
                    <CardContent sx={{ textAlign: 'center' }}>
                      <Visibility sx={{ fontSize: 32, color: 'warning.main', mb: 1 }} />
                      <Typography variant="h4" color="warning.main">
                        {buyer.statistics?.listings_viewed || 0}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Viewed
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>

              {/* Connections Table */}
              <Card>
                <CardContent>
                  <Typography variant="h6" gutterBottom>
                    Connection History
                  </Typography>
                  <TableContainer>
                    <Table>
                      <TableHead>
                        <TableRow>
                          <TableCell>Connection ID</TableCell>
                          <TableCell>Status</TableCell>
                          <TableCell>Requested Date</TableCell>
                        </TableRow>
                      </TableHead>
                      <TableBody>
                        {buyer.connections?.map((connection) => (
                          <TableRow key={connection.id} hover>
                            <TableCell>
                              <Typography variant="body2" fontFamily="monospace">
                                {connection.id.slice(0, 8)}...
                              </Typography>
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
                              <Typography variant="body2">
                                {formatDate(connection.requested_at)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        ))}
                        {(!buyer.connections || buyer.connections.length === 0) && (
                          <TableRow>
                            <TableCell colSpan={3} sx={{ textAlign: 'center', py: 4 }}>
                              <Typography variant="body2" color="text.secondary">
                                No connections found
                              </Typography>
                            </TableCell>
                          </TableRow>
                        )}
                      </TableBody>
                    </Table>
                  </TableContainer>
                  {buyer.connections && buyer.connections.length > 0 && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.light', borderRadius: 1 }}>
                      <Typography variant="body2" color="info.dark">
                        💡 <strong>Note:</strong> Detailed listing information for connections is not available in this view. 
                        Connection IDs can be used to look up specific connection details if needed.
                      </Typography>
                    </Box>
                  )}
                  
                  {/* Connection Message Counts */}
                  {buyer.analytics_details?.connection_message_counts && 
                   Object.keys(buyer.analytics_details.connection_message_counts).length > 0 && (
                    <Box sx={{ mt: 3 }}>
                      <Typography variant="subtitle1" gutterBottom>
                        Message Counts per Connection
                      </Typography>
                      <Grid container spacing={2}>
                        {Object.entries(buyer.analytics_details.connection_message_counts).map(([connectionId, count]) => (
                          <Grid item xs={12} sm={6} md={4} key={connectionId}>
                            <Paper sx={{ p: 2 }}>
                              <Typography variant="body2" color="text.secondary" fontFamily="monospace">
                                {connectionId.slice(0, 8)}...
                              </Typography>
                              <Typography variant="h6" color="primary">
                                {count} messages
                              </Typography>
                            </Paper>
                          </Grid>
                        ))}
                      </Grid>
                    </Box>
                  )}
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

export default AdminBuyerDetailPage;
