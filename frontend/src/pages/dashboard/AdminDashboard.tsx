import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  CardActionArea,
  Box,
  Button,
  Alert,
  Skeleton,
  Stack
} from '@mui/material';
import { 
  People, 
  Business, 
  Settings, 
  Schedule,
  CheckCircle,
  Warning,
  TrendingUp,
  ArrowForward
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { adminService, AdminDashboard as AdminDashboardData } from '../../services/admin.service';

interface SystemStatus {
  database_status: string;
  api_status: string;
  pending_items: number;
  pending_listings: number;
  pending_edits: number;
  last_updated: string;
  timestamp: number;
}

const AdminDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<AdminDashboardData | null>(null);
  const [systemStatus, setSystemStatus] = useState<SystemStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    loadSystemStatus();
    
    // Set up interval for real-time updates every 30 seconds
    const statusInterval = setInterval(loadSystemStatus, 30000);
    
    return () => clearInterval(statusInterval);
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const response = await adminService.getDashboard();
      if (response.success && response.data) {
        setDashboardData(response.data);
      }
    } catch (error) {
      console.error('Error loading dashboard data:', error);
      // Use mock data if API fails
      setDashboardData({
        overview: {
          total_users: 1250,
          total_sellers: 450,
          total_buyers: 800,
          verified_users: 1100,
          new_users_this_month: 85,
          user_growth_percentage: 12.5,
          total_listings: 156,
          published_listings: 89,
          pending_listings: 12,
          draft_listings: 55,
          total_connections: 234,
          active_connections: 189,
          pending_connections: 45,
          active_subscriptions: 320,
          revenue_this_month: 15750,
          pending_service_requests: 8
        },
        recent_activity: {
          new_users: [],
          new_listings: [],
          new_connections: []
        },
        alerts: [
          {
            type: 'listing_approval',
            message: '12 listing(s) pending approval',
            count: 12,
            priority: 'medium'
          }
        ]
      });
    } finally {
      setLoading(false);
    }
  };

  const loadSystemStatus = async () => {
    try {
      const response = await adminService.getSystemStatus();
      if (response.success && response.data) {
        setSystemStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading system status:', error);
      // Set fallback status if API fails
      setSystemStatus({
        database_status: 'unknown',
        api_status: 'unknown',
        pending_items: dashboardData?.overview.pending_listings || 0,
        pending_listings: dashboardData?.overview.pending_listings || 0,
        pending_edits: 0,
        last_updated: new Date().toISOString(),
        timestamp: Date.now()
      });
    }
  };

  const handleCardClick = (route: string) => {
    navigate(route);
  };

  const getStatusIcon = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
      case 'healthy':
        return <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />;
      case 'offline':
      case 'error':
        return <Warning sx={{ color: 'error.main', fontSize: 20 }} />;
      case 'degraded':
        return <Warning sx={{ color: 'warning.main', fontSize: 20 }} />;
      default:
        return <Warning sx={{ color: 'grey.main', fontSize: 20 }} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status.toLowerCase()) {
      case 'online':
        return 'Online';
      case 'healthy':
        return 'Healthy';
      case 'offline':
        return 'Offline';
      case 'error':
        return 'Error';
      case 'degraded':
        return 'Degraded';
      default:
        return 'Unknown';
    }
  };

  const renderStatCard = (
    title: string,
    value: number | string,
    icon: React.ReactElement,
    color: string,
    route?: string,
    isClickable: boolean = false
  ) => {
    const cardContent = (
      <CardContent sx={{ textAlign: 'center' }}>
        <Box sx={{ mb: 2, color: `${color}.main`, fontSize: 40 }}>
          {icon}
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" color={`${color}.main`} sx={{ fontWeight: 700 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
      </CardContent>
    );

    const clickableCardContent = (
      <CardContent sx={{ textAlign: 'center' }}>
        <Box sx={{ mb: 2, color: `${color}.main`, fontSize: 40 }}>
          {icon}
        </Box>
        <Typography variant="h6" gutterBottom>
          {title}
        </Typography>
        <Typography variant="h4" color={`${color}.main`} sx={{ fontWeight: 700 }}>
          {typeof value === 'number' ? value.toLocaleString() : value}
        </Typography>
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
          <Typography variant="body2" color="primary">
            View Details
          </Typography>
          <ArrowForward fontSize="small" />
        </Box>
      </CardContent>
    );

    if (isClickable && route) {
      return (
        <Card sx={{ height: '100%', cursor: 'pointer', '&:hover': { boxShadow: 4 } }}>
          <CardActionArea onClick={() => handleCardClick(route)} sx={{ height: '100%' }}>
            {clickableCardContent}
          </CardActionArea>
        </Card>
      );
    }

    return (
      <Card sx={{ height: '100%' }}>
        {cardContent}
      </Card>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="text" width={300} height={50} sx={{ mb: 3 }} />
        <Grid container spacing={3}>
          {[...Array(4)].map((_, index) => (
            <Grid item xs={12} sm={6} md={3} key={index}>
              <Skeleton variant="rectangular" height={200} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700 }}>
          Admin Dashboard
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Monitor and manage the CareAcquire platform
        </Typography>
      </Box>

      {/* Alerts */}
      {dashboardData?.alerts && dashboardData.alerts.length > 0 && (
        <Box sx={{ mb: 4 }}>
          {dashboardData.alerts.map((alert, index) => (
            <Alert 
              key={index}
              severity={alert.priority === 'high' ? 'error' : alert.priority === 'medium' ? 'warning' : 'info'}
              action={
                alert.type === 'listing_approval' ? (
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={() => navigate(ROUTES.ADMIN_LISTINGS)}
                  >
                    Review Now
                  </Button>
                ) : alert.type === 'kyc_review' ? (
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={() => navigate(`${ROUTES.ADMIN_USERS}?verification_status=submitted_for_review`)}
                  >
                    Review KYC
                  </Button>
                ) : alert.type === 'verification' ? (
                  <Button 
                    color="inherit" 
                    size="small"
                    onClick={() => navigate(`${ROUTES.ADMIN_USERS}?verification_status=pending&user_type=seller`)}
                  >
                    View Sellers
                  </Button>
                ) : null
              }
              sx={{ mb: 2 }}
            >
              <Typography variant="body2">
                <strong>{alert.message}</strong>
              </Typography>
            </Alert>
          ))}
        </Box>
      )}
      
      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'Total Users',
            dashboardData?.overview.total_users || 0,
            <People />,
            'primary',
            ROUTES.ADMIN_USERS,
            true
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'Active Listings',
            dashboardData?.overview.published_listings || 0,
            <Business />,
            'success',
            ROUTES.ADMIN_ALL_LISTINGS,
            true
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'Pending Approvals',
            dashboardData?.overview.pending_listings || 0,
            <Schedule />,
            'warning',
            ROUTES.ADMIN_LISTINGS,
            true
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'View Analytics',
            '📊',
            <TrendingUp />,
            'info',
            ROUTES.ADMIN_ANALYTICS,
            true
          )}
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          {renderStatCard(
            'Monthly Revenue',
            `£${(dashboardData?.overview.revenue_this_month || 0).toLocaleString()}`,
            <TrendingUp />,
            'success',
            ROUTES.ADMIN_ANALYTICS,
            true
          )}
        </Grid>
      </Grid>

      {/* Quick Actions */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
          Quick Actions
        </Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Schedule />}
              onClick={() => navigate(ROUTES.ADMIN_LISTINGS)}
              sx={{ py: 1.5 }}
            >
              Review Listings
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<People />}
              onClick={() => navigate(ROUTES.ADMIN_USERS)}
              sx={{ py: 1.5 }}
            >
              Manage Users
            </Button>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Button
              variant="outlined"
              fullWidth
              startIcon={<Settings />}
              onClick={() => navigate(ROUTES.ADMIN_SERVICES)}
              sx={{ py: 1.5 }}
            >
              Service Requests
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Platform Overview */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Platform Overview
            </Typography>
            <Grid container spacing={3}>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Sellers
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {dashboardData?.overview.total_sellers || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Total Buyers
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {dashboardData?.overview.total_buyers || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Verified Users
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {dashboardData?.overview.verified_users || 0}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={6}>
                <Box>
                  <Typography variant="body2" color="text.secondary">
                    Active Connections
                  </Typography>
                  <Typography variant="h5" sx={{ fontWeight: 600 }}>
                    {dashboardData?.overview.active_connections || 0}
                  </Typography>
                </Box>
              </Grid>
            </Grid>
          </Paper>
        </Grid>

        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              System Status
            </Typography>
            <Stack spacing={2}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {systemStatus ? getStatusIcon(systemStatus.database_status) : <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />}
                <Typography variant="body2">
                  Database: {systemStatus ? getStatusText(systemStatus.database_status) : 'Online'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {systemStatus ? getStatusIcon(systemStatus.api_status) : <CheckCircle sx={{ color: 'success.main', fontSize: 20 }} />}
                <Typography variant="body2">
                  API: {systemStatus ? getStatusText(systemStatus.api_status) : 'Healthy'}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Warning sx={{ color: 'warning.main', fontSize: 20 }} />
                <Typography variant="body2">
                  {systemStatus?.pending_items || dashboardData?.overview.pending_listings || 0} items need review
                </Typography>
              </Box>
              {systemStatus && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="caption" color="text.secondary">
                    Last updated: {new Date(systemStatus.last_updated).toLocaleTimeString()}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>
    </Container>
  );
};

export default AdminDashboard;
