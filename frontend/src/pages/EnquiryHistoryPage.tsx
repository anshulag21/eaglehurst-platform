import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Paper,
  Box,
  Grid,
  Card,
  CardContent,
  Chip,
  Button,
  TextField,
  MenuItem,
  InputAdornment,
  Avatar,
  Divider,
  IconButton,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Skeleton,
  Alert,
  Badge
} from '@mui/material';
import {
  Search,
  FilterList,
  Message,
  Business,
  Schedule,
  CheckCircle,
  Cancel,
  Pending,
  Visibility,
  Reply,
  MoreVert,
  LocationOn,
  AttachMoney,
  CalendarToday,
  Person
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

import { useAppSelector } from '../store';
import { ROUTES, getImageUrl } from '../constants';
import { connectionService } from '../services/connection.service';

// Types
interface Connection {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  status: 'pending' | 'approved' | 'rejected';
  initial_message: string;
  response_message?: string;
  seller_initiated: boolean;
  requested_at: string;
  responded_at?: string;
  last_activity: string;
  listing?: {
    id: string;
    title: string;
    location: string;
    asking_price?: number;
    price_range?: string;
    business_type: string;
    media_files?: Array<{
      file_url: string;
      is_primary: boolean;
    }>;
  };
  other_party?: {
    id: string;
    name: string;
    email: string;
    user_type: string;
    business_name?: string;
  };
  unread_messages: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
}

interface EnquiryStats {
  total_connections: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

const EnquiryHistoryPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  
  // State
  const [connections, setConnections] = useState<Connection[]>([]);
  const [stats, setStats] = useState<EnquiryStats>({
    total_connections: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0
  });
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('recent');
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  useEffect(() => {
    loadConnections();
  }, [statusFilter, sortBy]);

  const loadConnections = async (pageNum: number = 1, append: boolean = false) => {
    try {
      if (!append) setLoading(true);
      
      const response = await connectionService.getUserConnections({
        page: pageNum,
        limit: 20,
        status_filter: statusFilter === 'all' ? undefined : statusFilter,
        sort_by: sortBy
      });

      if (response.success && response.data) {
        const newConnections = response.data.connections || [];
        
        if (append) {
          setConnections(prev => [...prev, ...newConnections]);
        } else {
          setConnections(newConnections);
        }
        
        // Update stats
        setStats({
          total_connections: response.data.total_count || 0,
          pending_count: response.data.pending_count || 0,
          approved_count: response.data.approved_count || 0,
          rejected_count: response.data.rejected_count || 0
        });
        
        setHasMore(newConnections.length === 20);
        setPage(pageNum);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
      toast.error('Failed to load enquiry history');
    } finally {
      setLoading(false);
    }
  };

  const loadMore = () => {
    if (hasMore && !loading) {
      loadConnections(page + 1, true);
    }
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
      case 'approved': return <CheckCircle />;
      case 'rejected': return <Cancel />;
      case 'pending': return <Pending />;
      default: return <Schedule />;
    }
  };

  const formatPrice = (listing: Connection['listing']) => {
    if (!listing) return 'N/A';
    
    if (listing.asking_price) {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(listing.asking_price);
    }
    
    return listing.price_range || 'Price on request';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const handleConnectionClick = (connection: Connection) => {
    setSelectedConnection(connection);
    setDetailsDialogOpen(true);
  };

  const handleMessageClick = (connectionId: string) => {
    navigate(`${ROUTES.MESSAGES}/${connectionId}`);
  };

  const handleListingClick = (listingId: string) => {
    navigate(`${ROUTES.LISTINGS}/${listingId}`);
  };

  const filteredConnections = connections.filter(connection => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      connection.listing?.title.toLowerCase().includes(searchLower) ||
      connection.other_party?.name.toLowerCase().includes(searchLower) ||
      connection.listing?.location.toLowerCase().includes(searchLower) ||
      connection.initial_message.toLowerCase().includes(searchLower)
    );
  });

  const renderStatsCards = () => (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="primary" gutterBottom>
              {stats.total_connections}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total Enquiries
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="warning.main" gutterBottom>
              {stats.pending_count}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Pending
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="success.main" gutterBottom>
              {stats.approved_count}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Approved
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent sx={{ textAlign: 'center' }}>
            <Typography variant="h4" color="error.main" gutterBottom>
              {stats.rejected_count}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Rejected
            </Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderFilters = () => (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Grid container spacing={3} alignItems="center">
        <Grid item xs={12} md={4}>
          <TextField
            fullWidth
            placeholder="Search enquiries..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            select
            label="Status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <MenuItem value="all">All Status</MenuItem>
            <MenuItem value="pending">Pending</MenuItem>
            <MenuItem value="approved">Approved</MenuItem>
            <MenuItem value="rejected">Rejected</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={3}>
          <TextField
            fullWidth
            select
            label="Sort By"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="recent">Most Recent</MenuItem>
            <MenuItem value="oldest">Oldest First</MenuItem>
            <MenuItem value="status">By Status</MenuItem>
            <MenuItem value="listing">By Listing</MenuItem>
          </TextField>
        </Grid>
        <Grid item xs={12} md={2}>
          <Button
            fullWidth
            variant="outlined"
            startIcon={<FilterList />}
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setSortBy('recent');
            }}
          >
            Clear
          </Button>
        </Grid>
      </Grid>
    </Paper>
  );

  const renderConnectionCard = (connection: Connection) => (
    <motion.div
      key={connection.id}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <Card sx={{ mb: 2, '&:hover': { boxShadow: 4 } }}>
        <CardContent>
          <Grid container spacing={2}>
            {/* Listing Image */}
            <Grid item xs={12} sm={3} md={2}>
              <Box
                sx={{
                  width: '100%',
                  height: 120,
                  borderRadius: 1,
                  overflow: 'hidden',
                  backgroundColor: 'grey.200',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
                onClick={() => connection.listing && handleListingClick(connection.listing.id)}
              >
                {connection.listing?.media_files?.length ? (
                  <img
                    src={getImageUrl(connection.listing.media_files[0].file_url)}
                    alt={connection.listing.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover'
                    }}
                  />
                ) : (
                  <Business sx={{ fontSize: 40, color: 'grey.400' }} />
                )}
              </Box>
            </Grid>

            {/* Connection Details */}
            <Grid item xs={12} sm={9} md={10}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                <Box>
                  <Typography variant="h6" gutterBottom>
                    {connection.listing?.title || 'Listing Unavailable'}
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                    <Chip
                      icon={getStatusIcon(connection.status)}
                      label={connection.status.charAt(0).toUpperCase() + connection.status.slice(1)}
                      color={getStatusColor(connection.status) as any}
                      size="small"
                    />
                    {connection.seller_initiated && (
                      <Chip
                        label="Seller Initiated"
                        color="info"
                        size="small"
                        variant="outlined"
                      />
                    )}
                    {connection.unread_messages > 0 && (
                      <Badge badgeContent={connection.unread_messages} color="error">
                        <Message fontSize="small" />
                      </Badge>
                    )}
                  </Box>
                </Box>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Tooltip title="View Details">
                    <IconButton onClick={() => handleConnectionClick(connection)}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  {connection.status === 'approved' && (
                    <Tooltip title="Send Message">
                      <IconButton onClick={() => handleMessageClick(connection.id)}>
                        <Message />
                      </IconButton>
                    </Tooltip>
                  )}
                </Box>
              </Box>

              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <Person sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {user?.user_type === 'buyer' ? 'Seller' : 'Buyer'}: {connection.other_party?.name || 'N/A'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {connection.listing?.location || 'Location not specified'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', alignItems: 'center' }}>
                    <AttachMoney sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      {formatPrice(connection.listing)}
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={12} md={6}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                    <CalendarToday sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                    <Typography variant="body2" color="text.secondary">
                      Requested: {formatDate(connection.requested_at)}
                    </Typography>
                  </Box>
                  {connection.responded_at && (
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Reply sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        Responded: {formatDate(connection.responded_at)}
                      </Typography>
                    </Box>
                  )}
                  {connection.last_message && (
                    <Box>
                      <Typography variant="caption" color="text.secondary">
                        Last message: {connection.last_message.content.substring(0, 50)}...
                      </Typography>
                    </Box>
                  )}
                </Grid>
              </Grid>

              {connection.initial_message && (
                <Box sx={{ mt: 2, p: 2, backgroundColor: 'grey.50', borderRadius: 1 }}>
                  <Typography variant="caption" color="text.secondary" gutterBottom>
                    Initial Message:
                  </Typography>
                  <Typography variant="body2">
                    {connection.initial_message}
                  </Typography>
                </Box>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>
    </motion.div>
  );

  const renderDetailsDialog = () => (
    <Dialog
      open={detailsDialogOpen}
      onClose={() => setDetailsDialogOpen(false)}
      maxWidth="md"
      fullWidth
    >
      {selectedConnection && (
        <>
          <DialogTitle>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="h6">
                Enquiry Details
              </Typography>
              <Chip
                icon={getStatusIcon(selectedConnection.status)}
                label={selectedConnection.status.charAt(0).toUpperCase() + selectedConnection.status.slice(1)}
                color={getStatusColor(selectedConnection.status) as any}
              />
            </Box>
          </DialogTitle>
          <DialogContent>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  Listing Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedConnection.listing?.title}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedConnection.listing?.location}
                  </Typography>
                  <Typography variant="body2" color="success.main">
                    {formatPrice(selectedConnection.listing)}
                  </Typography>
                </Box>
              </Grid>
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle2" gutterBottom>
                  {user?.user_type === 'buyer' ? 'Seller' : 'Buyer'} Information
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body1" fontWeight="bold">
                    {selectedConnection.other_party?.name}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedConnection.other_party?.email}
                  </Typography>
                  {selectedConnection.other_party?.business_name && (
                    <Typography variant="body2" color="text.secondary">
                      {selectedConnection.other_party.business_name}
                    </Typography>
                  )}
                </Box>
              </Grid>
              <Grid item xs={12}>
                <Typography variant="subtitle2" gutterBottom>
                  Timeline
                </Typography>
                <Box sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Requested:</strong> {formatDate(selectedConnection.requested_at)}
                  </Typography>
                  {selectedConnection.responded_at && (
                    <Typography variant="body2">
                      <strong>Responded:</strong> {formatDate(selectedConnection.responded_at)}
                    </Typography>
                  )}
                  <Typography variant="body2">
                    <strong>Last Activity:</strong> {formatDate(selectedConnection.last_activity)}
                  </Typography>
                </Box>
              </Grid>
              {selectedConnection.initial_message && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Initial Message
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                    <Typography variant="body2">
                      {selectedConnection.initial_message}
                    </Typography>
                  </Paper>
                </Grid>
              )}
              {selectedConnection.response_message && (
                <Grid item xs={12}>
                  <Typography variant="subtitle2" gutterBottom>
                    Response Message
                  </Typography>
                  <Paper sx={{ p: 2, backgroundColor: 'primary.50' }}>
                    <Typography variant="body2">
                      {selectedConnection.response_message}
                    </Typography>
                  </Paper>
                </Grid>
              )}
            </Grid>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDetailsDialogOpen(false)}>
              Close
            </Button>
            {selectedConnection.listing && (
              <Button
                variant="outlined"
                onClick={() => {
                  handleListingClick(selectedConnection.listing!.id);
                  setDetailsDialogOpen(false);
                }}
              >
                View Listing
              </Button>
            )}
            {selectedConnection.status === 'approved' && (
              <Button
                variant="contained"
                onClick={() => {
                  handleMessageClick(selectedConnection.id);
                  setDetailsDialogOpen(false);
                }}
              >
                Send Message
              </Button>
            )}
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  if (loading && connections.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Typography variant="h4" gutterBottom>
          Enquiry History
        </Typography>
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" height={40} />
                  <Skeleton variant="text" height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
        {[1, 2, 3].map((i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardContent>
              <Skeleton variant="rectangular" height={120} />
              <Skeleton variant="text" height={30} sx={{ mt: 1 }} />
              <Skeleton variant="text" height={20} />
            </CardContent>
          </Card>
        ))}
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
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          Enquiry History
        </Typography>

        {renderStatsCards()}
        {renderFilters()}

        {filteredConnections.length === 0 ? (
          <Paper sx={{ p: 6, textAlign: 'center' }}>
            <Business sx={{ fontSize: 80, color: 'grey.400', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No enquiries found
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search or filters'
                : user?.user_type === 'buyer' 
                  ? 'Start connecting with sellers to see your enquiry history here'
                  : 'Connection requests from buyers will appear here'
              }
            </Typography>
            {(!searchTerm && statusFilter === 'all') && (
              <Button
                variant="contained"
                onClick={() => navigate(ROUTES.LISTINGS)}
                startIcon={<Search />}
              >
                Browse Listings
              </Button>
            )}
          </Paper>
        ) : (
          <>
            <AnimatePresence>
              {filteredConnections.map(renderConnectionCard)}
            </AnimatePresence>

            {hasMore && (
              <Box sx={{ textAlign: 'center', mt: 4 }}>
                <Button
                  variant="outlined"
                  onClick={loadMore}
                  disabled={loading}
                  size="large"
                >
                  {loading ? 'Loading...' : 'Load More'}
                </Button>
              </Box>
            )}
          </>
        )}

        {renderDetailsDialog()}
      </motion.div>
    </Container>
  );
};

export default EnquiryHistoryPage;
