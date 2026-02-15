import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Grid,
  Button,
  Chip,
  Box,
  Stack,
  Paper,
  Skeleton,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Card,
  CardContent,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Tabs,
  Tab,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  ArrowBack,
  Edit,
  Delete,
  TrendingUp,
  CheckCircle,
  Pending,
  Drafts,
  Block,
  Schedule,
  Visibility,
  Message,
  Person,
  ThumbUp,
  ThumbDown,
  Chat,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { listingService } from '../../services/listing.service';
import { analyticsService } from '../../services/analytics.service';
import { connectionService } from '../../services/connection.service';
import { ROUTES } from '../../constants';
import type { Listing } from '../../types';
import { useAppSelector } from '../../store';
import toast from 'react-hot-toast';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`simple-tabpanel-${index}`}
      aria-labelledby={`simple-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box sx={{ p: 3 }}>
          {children}
        </Box>
      )}
    </div>
  );
}

const statusConfig = {
  draft: {
    label: 'Draft',
    color: 'default' as const,
    icon: <Drafts />,
    description: 'Not yet submitted for review'
  },
  pending_approval: {
    label: 'Under Review',
    color: 'warning' as const,
    icon: <Pending />,
    description: 'Being reviewed by our team'
  },
  published: {
    label: 'Active',
    color: 'success' as const,
    icon: <CheckCircle />,
    description: 'Live and visible to buyers'
  },
  rejected: {
    label: 'Rejected',
    color: 'error' as const,
    icon: <Block />,
    description: 'Needs changes before approval'
  },
  archived: {
    label: 'Archived',
    color: 'default' as const,
    icon: <Schedule />,
    description: 'Listing has been archived'
  }
};

const SellerListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tabValue, setTabValue] = useState(0);
  
  // Dialog states
  const [connectDialogOpen, setConnectDialogOpen] = useState(false);
  const [selectedBuyer, setSelectedBuyer] = useState<any>(null);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingConnection, setSendingConnection] = useState(false);
  
  // Connection management states
  const [connectionStatusDialog, setConnectionStatusDialog] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<any>(null);
  const [responseMessage, setResponseMessage] = useState('');
  const [updatingStatus, setUpdatingStatus] = useState(false);
  
  // Viewer connection states
  const [viewerConnectionStatuses, setViewerConnectionStatuses] = useState<{[key: string]: any}>({});
  const [loadingViewerStatuses, setLoadingViewerStatuses] = useState<{[key: string]: boolean}>({});
  
  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  
  // Pending changes state
  const [pendingChanges, setPendingChanges] = useState<any>(null);
  const [loadingPendingChanges, setLoadingPendingChanges] = useState(false);
  const [showPendingChanges, setShowPendingChanges] = useState(false);

  const loadListingDetails = useCallback(async () => {
    try {
      setLoading(true);
      const response = await listingService.getListing(id!);
      if (response.success && response.data) {
        setListing(response.data);
      } else {
        setError('Failed to load listing details');
      }
    } catch (error) {
      console.error('Error loading listing:', error);
      setError('Failed to load listing details');
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadPendingChanges = useCallback(async () => {
    if (!id) return;
    
    try {
      setLoadingPendingChanges(true);
      const response = await listingService.getPendingChanges(id);
      if (response.success) {
        setPendingChanges(response.data);
        setShowPendingChanges(true); // Make sure we show pending changes
      } else {
        console.error('Failed to load pending changes:', response.error);
      }
    } catch (error) {
      console.error('Error loading pending changes:', error);
    } finally {
      setLoadingPendingChanges(false);
    }
  }, [id]);

  const loadAnalytics = useCallback(async () => {
    try {
      setAnalyticsLoading(true);
      const response = await analyticsService.getListingAnalytics(id!);
      console.log('Analytics response:', response);
      if (response.success) {
        setAnalytics(response.data);
        console.log('Analytics data set:', response.data);
      } else {
        console.error('Analytics API error:', response.error);
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [id]);

  const loadViewerConnectionStatuses = useCallback(async () => {
    if (!analytics?.viewers) return;

    const statuses: {[key: string]: any} = {};
    const loading: {[key: string]: boolean} = {};

    for (const viewer of analytics.viewers) {
      // Skip viewers without valid buyer_id
      if (!viewer.buyer_id || viewer.buyer_id === 'null' || viewer.buyer_id === 'undefined') {
        console.warn('Skipping viewer with invalid buyer_id:', viewer.buyer_id);
        continue;
      }

      loading[viewer.buyer_id] = true;
      setLoadingViewerStatuses(prev => ({ ...prev, [viewer.buyer_id]: true }));

      try {
        const response = await connectionService.checkSellerBuyerConnection(viewer.buyer_id);
        if (response.success) {
          statuses[viewer.buyer_id] = response.data;
        }
      } catch (error) {
        console.error(`Error loading connection status for buyer ${viewer.buyer_id}:`, error);
      } finally {
        loading[viewer.buyer_id] = false;
      }
    }

    setViewerConnectionStatuses(prev => ({ ...prev, ...statuses }));
    setLoadingViewerStatuses(prev => ({ ...prev, ...loading }));
  }, [analytics?.viewers]);

  useEffect(() => {
    if (id) {
      loadListingDetails();
      loadAnalytics();
    }
  }, [id, loadListingDetails, loadAnalytics]);

  useEffect(() => {
    if (analytics?.viewers?.length > 0) {
      loadViewerConnectionStatuses();
    }
  }, [analytics?.viewers, loadViewerConnectionStatuses]);

  useEffect(() => {
    // Check if URL has ?view=changes parameter
    const urlParams = new URLSearchParams(window.location.search);
    const viewParam = urlParams.get('view');
    
    if (viewParam === 'changes' && listing?.has_pending_edit) {
      setShowPendingChanges(true);
      loadPendingChanges();
    }
  }, [listing?.has_pending_edit, loadPendingChanges]);

  const renderConnectionButton = (viewer: any) => {
    // Don't render button for viewers without valid buyer_id
    if (!viewer.buyer_id || viewer.buyer_id === 'null' || viewer.buyer_id === 'undefined') {
      return null;
    }

    const connectionStatus = viewerConnectionStatuses[viewer.buyer_id];
    const isLoading = loadingViewerStatuses[viewer.buyer_id];

    if (isLoading) {
      return (
        <Button
          variant="outlined"
          size="small"
          disabled
        >
          Loading...
        </Button>
      );
    }

    if (connectionStatus?.has_connection) {
      const status = connectionStatus.status;
      
      if (status === 'pending') {
        return (
          <Button
            variant="outlined"
            size="small"
            disabled
            color="warning"
          >
            Pending
          </Button>
        );
      } else if (status === 'approved') {
        return (
          <Button
            variant="outlined"
            size="small"
            startIcon={<Chat />}
            onClick={() => navigate(`/messages/${connectionStatus.connection_id}`)}
            color="success"
          >
            Message
          </Button>
        );
      } else if (status === 'rejected') {
        return (
          <Button
            variant="outlined"
            size="small"
            disabled
            color="error"
          >
            Rejected
          </Button>
        );
      }
    }

    // Default connect button
    return (
      <Button
        variant="outlined"
        size="small"
        startIcon={<Message />}
        onClick={() => handleConnectToBuyer(viewer)}
      >
        Connect
      </Button>
    );
  };

  const handleConnectToBuyer = (buyer: any) => {
    setSelectedBuyer(buyer);
    setConnectionMessage(`Hi ${buyer.buyer_name}, I noticed you viewed my listing "${listing?.title}". I'd love to discuss this opportunity with you.`);
    setConnectDialogOpen(true);
  };

  const handleSendConnection = async () => {
    if (!selectedBuyer) return;

    try {
      setSendingConnection(true);
      const response = await connectionService.sendSellerToBuyerConnection(
        selectedBuyer.buyer_id,
        connectionMessage
      );

      if (response.success) {
        toast.success('Connection request sent successfully!');
        setConnectDialogOpen(false);
        setConnectionMessage('');
        
        // Update the connection status for this viewer
        setViewerConnectionStatuses(prev => ({
          ...prev,
          [selectedBuyer.buyer_id]: {
            has_connection: true,
            status: 'pending',
            connection_id: response.data?.id,
            can_connect: false,
            reason: 'Connection request sent'
          }
        }));
        
        setSelectedBuyer(null);
        loadAnalytics(); // Refresh analytics
      } else {
        toast.error(response.error?.message || 'Failed to send connection request');
      }
    } catch (error) {
      console.error('Error sending connection:', error);
      toast.error('Failed to send connection request');
    } finally {
      setSendingConnection(false);
    }
  };

  const handleConnectionAction = (connection: any, action: 'approve' | 'reject') => {
    setSelectedConnection({ ...connection, action });
    setResponseMessage('');
    setConnectionStatusDialog(true);
  };

  const handleUpdateConnectionStatus = async () => {
    if (!selectedConnection) return;

    try {
      setUpdatingStatus(true);
      const response = await connectionService.updateConnectionStatus(
        selectedConnection.id,
        selectedConnection.action === 'approve' ? 'approved' : 'rejected',
        responseMessage
      );

      if (response.success) {
        toast.success(`Connection ${selectedConnection.action === 'approve' ? 'approved' : 'rejected'} successfully!`);
        setConnectionStatusDialog(false);
        setSelectedConnection(null);
        setResponseMessage('');
        loadAnalytics(); // Refresh analytics
      } else {
        toast.error(response.error?.message || 'Failed to update connection status');
      }
    } catch (error) {
      console.error('Error updating connection:', error);
      toast.error('Failed to update connection status');
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleEdit = () => {
    if (listing) {
      navigate(ROUTES.EDIT_LISTING.replace(':id', listing.id));
    }
  };

  const handleDelete = async () => {
    if (!listing) return;
    
    try {
      setDeleting(true);
      const response = await listingService.deleteListing(listing.id);
      if (response.success) {
        toast.success('Listing deleted successfully');
        navigate(ROUTES.MY_LISTINGS);
      } else {
        toast.error('Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setDeleting(false);
      setDeleteDialogOpen(false);
    }
  };

  const handlePublish = async () => {
    if (!listing) return;
    
    try {
      const response = await listingService.updateListing(listing.id, { is_draft: false });
      if (response.success) {
        toast.success('Listing submitted for review!');
        // Reload the listing to get updated status
        loadListingDetails();
      } else {
        toast.error('Failed to submit listing for review');
      }
    } catch (error) {
      console.error('Error publishing listing:', error);
      toast.error('Failed to submit listing for review');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Skeleton variant="rectangular" width="100%" height={400} />
        <Box sx={{ mt: 2 }}>
          <Skeleton variant="text" sx={{ fontSize: '2rem' }} />
          <Skeleton variant="text" sx={{ fontSize: '1rem' }} />
        </Box>
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          {error || 'Listing not found'}
        </Alert>
      </Container>
    );
  }

  // Check if user is the owner
  if (user?.user_type !== 'seller') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error">
          Access denied. This page is only accessible to sellers.
        </Alert>
      </Container>
    );
  }

  const status = statusConfig[listing.status as keyof typeof statusConfig];

  // Helper function to format dates safely
  const formatDate = (dateString: string | null | undefined) => {
    if (!dateString) return 'Not available';
    
    try {
      const date = new Date(dateString);
      // Check if date is valid
      if (isNaN(date.getTime())) return 'Not available';
      
      return date.toLocaleDateString('en-GB', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch (error) {
      return 'Not available';
    }
  };

  // Helper function to get full image URL
  const getImageUrl = (url: string): string => {
    if (url.startsWith('http')) return url;
    return `http://localhost:8000${url}`;
  };

  // Helper function to format values for display
  const formatValueForDisplay = (value: any): string => {
    if (value === null || value === undefined) {
      return 'Not set';
    }
    
    if (typeof value === 'object') {
      // Handle objects by showing key-value pairs
      if (Array.isArray(value)) {
        return value.length > 0 ? `[${value.length} items]` : 'Empty array';
      } else {
        const entries = Object.entries(value);
        if (entries.length === 0) return 'Empty object';
        
        return entries
          .map(([key, val]) => `${key}: ${val}`)
          .join(', ');
      }
    }
    
    if (typeof value === 'boolean') {
      return value ? 'Yes' : 'No';
    }
    
    return String(value);
  };

  // Helper function to check if a field has pending changes
  const getFieldChange = (fieldPath: string) => {
    if (!pendingChanges?.changes) return null;
    
    return pendingChanges.changes.find((change: any) => 
      change.field === fieldPath || change.field_label === fieldPath
    );
  };

  // Helper function to get nested field change (e.g., business_details.practice_name)
  const getNestedFieldChange = (parentField: string, childField: string) => {
    if (!pendingChanges?.changes) return null;
    
    return pendingChanges.changes.find((change: any) => 
      change.field === `${parentField}.${childField}`
    );
  };

  // Helper to get the display value (always show new values)
  const getDisplayValue = (fieldPath: string, currentValue: any) => {
    if (!showPendingChanges || !pendingChanges) {
      return currentValue;
    }

    const change = pendingChanges.changes?.find((c: any) => c.field === fieldPath);
    if (!change) return currentValue;


    // Always show the new value
    if (fieldPath.startsWith('financial_data.') && typeof change.new_value === 'object') {
      const nestedField = fieldPath.split('.')[1];
      return change.new_value[nestedField];
    }
    
    return change.new_value;
  };

  // Helper to check if field has changes
  const hasFieldChange = (fieldPath: string) => {
    if (!showPendingChanges || !pendingChanges) return false;
    return pendingChanges.changes?.some((c: any) => c.field === fieldPath);
  };

  // Simple component to show content with optional "Under Review" tag
  const FieldWrapper: React.FC<{
    children: React.ReactNode;
    fieldPath: string;
    sx?: any;
  }> = ({ children, fieldPath, sx = {} }) => {
    const hasChange = hasFieldChange(fieldPath);
    
    if (!hasChange) {
      return <Box sx={sx}>{children}</Box>;
    }

    // Special handling for title field
    if (fieldPath === 'title') {
      return (
        <Box sx={{ ...sx, display: 'flex', alignItems: 'center', gap: 2 }}>
          {children}
          <Chip
            size="small"
            label="Under Review"
            color="warning"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 24,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        </Box>
      );
    }

    return (
      <Box sx={{ ...sx }}>
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
          <Box sx={{ flex: 1 }}>
            {children}
          </Box>
          <Chip
            size="small"
            label="Under Review"
            color="warning"
            variant="outlined"
            sx={{
              fontSize: '0.7rem',
              height: 20,
              flexShrink: 0,
              '& .MuiChip-label': {
                px: 1,
              },
            }}
          />
        </Box>
      </Box>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.MY_LISTINGS)}
          sx={{ mb: 2 }}
        >
          Back to My Listings
        </Button>

        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Box>
            <FieldWrapper fieldPath="title">
              <Typography variant="h4" component="h1" gutterBottom>
                {getDisplayValue('title', listing.title)}
              </Typography>
            </FieldWrapper>
            <Stack direction="row" spacing={2} alignItems="center">
              <Chip
                icon={status.icon}
                label={status.label}
                color={status.color}
                variant="outlined"
              />
              <Typography variant="body2" color="text.secondary">
                {status.description}
              </Typography>
            </Stack>
          </Box>
          
          <Stack direction="row" spacing={1}>
            {listing.status === 'draft' && (
              <Button
                variant="contained"
                color="primary"
                startIcon={<CheckCircle />}
                onClick={handlePublish}
              >
                Submit for Review
              </Button>
            )}
            <Button
              variant="outlined"
              startIcon={<Edit />}
              onClick={handleEdit}
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </Stack>
        </Box>
      </Box>

      {/* Simple Pending Changes Alert */}
      {showPendingChanges && pendingChanges && (
        <Alert 
          severity="info" 
          sx={{ mb: 3 }}
          action={
            <Button
              size="small"
              variant="contained"
              onClick={() => navigate(`${ROUTES.EDIT_LISTING.replace(':id', listing!.id)}`)}
              sx={{ fontSize: '0.75rem' }}
            >
              Edit Again
            </Button>
          }
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            {pendingChanges.total_changes} change(s) under review
          </Typography>
          <Typography variant="body2">
            Your changes are being reviewed. Fields with changes show "Under Review" tags.
          </Typography>
        </Alert>
      )}

      {/* Analytics Overview Cards */}
      {analyticsLoading && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Typography variant="h6">Loading analytics...</Typography>
          </Grid>
        </Grid>
      )}
      
      {!analyticsLoading && !analytics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12}>
            <Alert severity="info">No analytics data available</Alert>
          </Grid>
        </Grid>
      )}
      
      {!analyticsLoading && analytics && (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Visibility color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Total Views</Typography>
                </Box>
                <Typography variant="h4">{analytics.analytics.total_views}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {analytics.analytics.views_this_week} this week
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <Message color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Connections</Typography>
                </Box>
                <Typography variant="h4">{analytics.analytics.connection_requests}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {analytics.analytics.pending_connections} pending
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <CheckCircle color="success" sx={{ mr: 1 }} />
                  <Typography variant="h6">Approved</Typography>
                </Box>
                <Typography variant="h4">{analytics.analytics.approved_connections}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {analytics.analytics.conversion_rate}% conversion
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                  <TrendingUp color="primary" sx={{ mr: 1 }} />
                  <Typography variant="h6">Performance</Typography>
                </Box>
                <Typography variant="h4">{analytics.analytics.conversion_rate}%</Typography>
                <Typography variant="body2" color="text.secondary">
                  View to connection rate
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {/* Tabs */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs value={tabValue} onChange={handleTabChange}>
          <Tab label="Listing Details" />
          <Tab label="Viewers" />
          <Tab label="Connections" />
          <Tab label="Analytics" />
        </Tabs>
      </Box>

      {/* Tab Panels */}
      <TabPanel value={tabValue} index={0}>
        {/* Listing Details */}
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Listing Information
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Grid container spacing={2}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Business Type
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    {listing.business_type}
                  </Typography>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Location
                  </Typography>
                  <FieldWrapper fieldPath="location">
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {getDisplayValue('location', listing.location)}
                    </Typography>
                  </FieldWrapper>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Asking Price
                  </Typography>
                  <FieldWrapper fieldPath="financial_data.asking_price">
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      £{(() => {
                        const value = getDisplayValue('financial_data.asking_price', (listing as any).financial_data?.asking_price);
                        return value ? parseFloat(value).toLocaleString() : 'Not specified';
                      })()}
                    </Typography>
                  </FieldWrapper>
                </Grid>
                
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Annual Revenue
                  </Typography>
                  <FieldWrapper>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      £{(listing as any).financial_data?.annual_revenue ? parseFloat((listing as any).financial_data.annual_revenue).toLocaleString() : 'Not specified'}
                    </Typography>
                  </FieldWrapper>
                </Grid>

                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary">
                    Net Profit
                  </Typography>
                  <FieldWrapper>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      £{(listing as any).financial_data?.net_profit ? parseFloat((listing as any).financial_data.net_profit).toLocaleString() : 'Not specified'}
                    </Typography>
                  </FieldWrapper>
                </Grid>

                {/* Business Details Section */}
                {listing.business_details && typeof listing.business_details === 'object' && (
                  <>
                    <Grid item xs={12}>
                      <Typography variant="h6" sx={{ mt: 2, mb: 1 }}>
                        Practice Details
                      </Typography>
                      <Divider sx={{ mb: 2 }} />
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Practice Name
                      </Typography>
                      <FieldWrapper>
                        <Typography variant="body1" sx={{ mb: 2 }}>
                          {listing.business_details.practice_name || 'Not specified'}
                        </Typography>
                      </FieldWrapper>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Practice Type
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {listing.business_details.practice_type || 'Not specified'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Patient List Size
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {listing.business_details.patient_list_size ? listing.business_details.patient_list_size.toLocaleString() : 'Not specified'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Number of Staff
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {listing.business_details.staff_count || 'Not specified'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Premises Type
                      </Typography>
                      <Typography variant="body1" sx={{ mb: 2 }}>
                        {listing.business_details.premises_type ? 
                          listing.business_details.premises_type.charAt(0).toUpperCase() + listing.business_details.premises_type.slice(1) 
                          : 'Not specified'}
                      </Typography>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        NHS Contract
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Chip 
                          label={listing.business_details.nhs_contract ? 'Yes' : 'No'}
                          color={listing.business_details.nhs_contract ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Grid>

                    <Grid item xs={12} sm={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        CQC Registered
                      </Typography>
                      <Box sx={{ mb: 2 }}>
                        <Chip 
                          label={listing.business_details.cqc_registered ? 'Yes' : 'No'}
                          color={listing.business_details.cqc_registered ? 'success' : 'default'}
                          size="small"
                        />
                      </Box>
                    </Grid>
                  </>
                )}
                
                <Grid item xs={12}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 2 }}>
                    Description
                  </Typography>
                  <FieldWrapper fieldPath="description">
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {getDisplayValue('description', listing.description)}
                    </Typography>
                  </FieldWrapper>
                </Grid>
              </Grid>
            </Paper>
          </Grid>

          {/* Photos Section */}
          {listing.media_files && listing.media_files.length > 0 && (
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Photos ({listing.media_files.length})
                </Typography>
                <Divider sx={{ mb: 2 }} />
                
                <Grid container spacing={2}>
                  {listing.media_files.map((media: any, index: number) => (
                    <Grid item xs={12} sm={6} md={4} key={media.id}>
                      <Box
                        sx={{
                          position: 'relative',
                          paddingTop: '75%', // 4:3 aspect ratio
                          borderRadius: 1,
                          overflow: 'hidden',
                          border: '1px solid',
                          borderColor: 'grey.300',
                        }}
                      >
                        <Box
                          component="img"
                          src={getImageUrl(media.file_url)}
                          alt={media.file_name || `Photo ${index + 1}`}
                          sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                        {media.is_primary && (
                          <Chip
                            label="Primary"
                            size="small"
                            color="primary"
                            sx={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
                              fontSize: '0.7rem',
                            }}
                          />
                        )}
                      </Box>
                      {media.caption && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                          {media.caption}
                        </Typography>
                      )}
                    </Grid>
                  ))}
                </Grid>
              </Paper>
            </Grid>
          )}
          
          <Grid item xs={12} md={4}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Quick Stats
              </Typography>
              <Divider sx={{ mb: 2 }} />
              
              <Stack spacing={2}>
                {listing.business_details && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Patients</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {listing.business_details.patient_list_size ? listing.business_details.patient_list_size.toLocaleString() : 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">Staff</Typography>
                      <Typography variant="body2" fontWeight="medium">
                        {listing.business_details.staff_count || 'N/A'}
                      </Typography>
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">NHS Contract</Typography>
                      <Chip
                        label={listing.business_details.nhs_contract ? 'Yes' : 'No'}
                        color={listing.business_details.nhs_contract ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                      <Typography variant="body2">CQC Registered</Typography>
                      <Chip
                        label={listing.business_details.cqc_registered ? 'Yes' : 'No'}
                        color={listing.business_details.cqc_registered ? 'success' : 'default'}
                        size="small"
                      />
                    </Box>
                    
                    <Divider />
                  </>
                )}
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Created</Typography>
                  <Typography variant="body2">
                    {formatDate(listing.created_at)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Last Updated</Typography>
                  <Typography variant="body2">
                    {formatDate(listing.updated_at)}
                  </Typography>
                </Box>
                
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2">Status</Typography>
                  <Chip
                    label={status.label}
                    color={status.color}
                    size="small"
                  />
                </Box>
              </Stack>
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      <TabPanel value={tabValue} index={1}>
        {/* Viewers */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Recent Viewers
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Buyers who have viewed your listing
          </Typography>
          
          {analyticsLoading ? (
            <Box>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={80} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : analytics?.viewers?.length > 0 ? (
            <List>
              {analytics.viewers.map((viewer: any, index: number) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar sx={{ 
                      bgcolor: viewer.viewer_type === 'authenticated' ? 'primary.main' : 'grey.400' 
                    }}>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body1">
                          {viewer.buyer_name}
                        </Typography>
                        {viewer.viewer_type === 'anonymous' && (
                          <Chip 
                            size="small" 
                            label="Anonymous" 
                            color="default"
                            variant="outlined"
                          />
                        )}
                      </Box>
                    }
                    secondary={
                      <Box>
                        {viewer.buyer_email && (
                          <Typography variant="body2" color="text.secondary">
                            {viewer.buyer_email}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary">
                          Viewed {new Date(viewer.viewed_at).toLocaleDateString()}
                          {viewer.verification_status && ` • Status: ${viewer.verification_status}`}
                          {viewer.location && ` • ${viewer.location}`}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {viewer.buyer_id && renderConnectionButton(viewer)}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          ) : (
            <Alert severity="info">
              No viewers yet. Share your listing to get more visibility!
            </Alert>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={2}>
        {/* Connections */}
        <Paper sx={{ p: 3 }}>
          <Typography variant="h6" gutterBottom>
            Connection Requests
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Manage your connection requests
          </Typography>
          
          {analyticsLoading ? (
            <Box>
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} variant="rectangular" height={100} sx={{ mb: 1 }} />
              ))}
            </Box>
          ) : analytics?.connections?.length > 0 ? (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Found {analytics.connections.length} connections
              </Typography>
              <List>
              {analytics.connections.map((connection: any, index: number) => (
                <ListItem key={index} divider>
                  <ListItemAvatar>
                    <Avatar>
                      <Person />
                    </Avatar>
                  </ListItemAvatar>
                  <ListItemText
                    primary={connection.buyer_name}
                    secondary={
                      <Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          "{connection.initial_message}"
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Requested {new Date(connection.requested_at).toLocaleDateString()} • 
                          Status: {connection.status}
                        </Typography>
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    <Stack direction="row" spacing={1}>
                      {connection.status === 'pending' && (
                        <>
                          <IconButton
                            color="success"
                            onClick={() => handleConnectionAction(connection, 'approve')}
                          >
                            <ThumbUp />
                          </IconButton>
                          <IconButton
                            color="error"
                            onClick={() => handleConnectionAction(connection, 'reject')}
                          >
                            <ThumbDown />
                          </IconButton>
                        </>
                      )}
                      {connection.status === 'approved' && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<Chat />}
                          onClick={() => navigate(`/messages/${connection.id}`)}
                        >
                          Message
                        </Button>
                      )}
                    </Stack>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
            </>
          ) : (
            <>
              <Typography variant="body2" sx={{ mb: 2 }}>
                Analytics data: {analytics ? 'Available' : 'Not available'}
                {analytics && ` - Connections: ${analytics.connections?.length || 0}`}
              </Typography>
              <Alert severity="info">
                No connection requests yet.
              </Alert>
            </>
          )}
        </Paper>
      </TabPanel>

      <TabPanel value={tabValue} index={3}>
        {/* Analytics */}
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                View Analytics
              </Typography>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box>
                  <Typography variant="h4" color="primary">
                    {analytics?.analytics.total_views || 0}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Total views
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">This week</Typography>
                      <Typography variant="h6">{analytics?.analytics.views_this_week || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">This month</Typography>
                      <Typography variant="h6">{analytics?.analytics.views_this_month || 0}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 3 }}>
              <Typography variant="h6" gutterBottom>
                Connection Analytics
              </Typography>
              {analyticsLoading ? (
                <Skeleton variant="rectangular" height={200} />
              ) : (
                <Box>
                  <Typography variant="h4" color="primary">
                    {analytics?.analytics.conversion_rate || 0}%
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Conversion rate
                  </Typography>
                  
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="body2">Total requests</Typography>
                      <Typography variant="h6">{analytics?.analytics.connection_requests || 0}</Typography>
                    </Grid>
                    <Grid item xs={6}>
                      <Typography variant="body2">Approved</Typography>
                      <Typography variant="h6">{analytics?.analytics.approved_connections || 0}</Typography>
                    </Grid>
                  </Grid>
                </Box>
              )}
            </Paper>
          </Grid>
        </Grid>
      </TabPanel>

      {/* Connect to Buyer Dialog */}
      <Dialog 
        open={connectDialogOpen} 
        onClose={() => setConnectDialogOpen(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          Connect with {selectedBuyer?.buyer_name}
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Send a connection request to this buyer. They will need to accept to start a conversation.
          </Typography>
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            value={connectionMessage}
            onChange={(e) => setConnectionMessage(e.target.value)}
            helperText="Introduce yourself and explain why you'd like to connect."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectDialogOpen(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleSendConnection}
            variant="contained"
            disabled={sendingConnection || !connectionMessage.trim()}
          >
            {sendingConnection ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Connection Status Dialog */}
      <Dialog 
        open={connectionStatusDialog} 
        onClose={() => setConnectionStatusDialog(false)}
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          {selectedConnection?.action === 'approve' ? 'Approve' : 'Reject'} Connection
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            {selectedConnection?.action === 'approve' 
              ? 'Approve this connection request to start a conversation.'
              : 'Reject this connection request. You can optionally provide a reason.'
            }
          </Typography>
          <TextField
            fullWidth
            label="Response Message (Optional)"
            multiline
            rows={3}
            value={responseMessage}
            onChange={(e) => setResponseMessage(e.target.value)}
            helperText="Optional message to send with your response."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConnectionStatusDialog(false)}>
            Cancel
          </Button>
          <Button 
            onClick={handleUpdateConnectionStatus}
            variant="contained"
            color={selectedConnection?.action === 'approve' ? 'success' : 'error'}
            disabled={updatingStatus}
          >
            {updatingStatus ? 'Updating...' : (selectedConnection?.action === 'approve' ? 'Approve' : 'Reject')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <Typography variant="body1">
            Are you sure you want to delete "{listing?.title}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
            This action cannot be undone. All analytics data and connections will be permanently lost.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>
            Cancel
          </Button>
          <Button
            onClick={handleDelete}
            variant="contained"
            color="error"
            disabled={deleting}
          >
            {deleting ? 'Deleting...' : 'Delete'}
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SellerListingDetailPage;
