import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Tabs,
  Tab,
  TextField,
  InputAdornment,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Divider,
  Paper,
  Badge,
  CircularProgress,
} from '@mui/material';
import {
  Add,
  Search,
  FilterList,
  MoreVert,
  Edit,
  Delete,
  Visibility,
  TrendingUp,
  Schedule,
  CheckCircle,
  Pending,
  Drafts,
  Block,
  Business,
  LocationOn,
  AttachMoney,
  CalendarToday,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { ROUTES } from '../../constants';
import { listingService } from '../../services/listing.service';
import type { Listing } from '../../types';

import toast from 'react-hot-toast';

// Types
interface ListingStats {
  views: number;
  inquiries: number;
  favorites: number;
  lastViewed: string;
}

interface MyListing extends Listing {
  stats: ListingStats;
  expires_at?: string;
  business_summary?: string;
  view_count?: number;
  connection_count?: number;
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
  published_with_pending_edit: {
    label: 'Changes Under Review',
    color: 'warning' as const,
    icon: <Pending />,
    description: 'Your changes are being reviewed'
  },
  archived: {
    label: 'Archived',
    color: 'default' as const,
    icon: <Schedule />,
    description: 'Listing has been archived'
  }
};

const MyListingsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [listings, setListings] = useState<MyListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedListing, setSelectedListing] = useState<string | null>(null);
  const [selectedListingObject, setSelectedListingObject] = useState<MyListing | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [listingToDelete, setListingToDelete] = useState<string | null>(null);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      
      // For now, load all listings and filter on frontend
      const response = await listingService.getSellerListings({
        page: 1,
        limit: 50,
      });

      if (response.success && response.data) {
        // Transform API data with real analytics
        const apiListings = (response.data as { listings?: Listing[] }).listings || response.data.items || [];
        const transformedListings: MyListing[] = apiListings.map((listing: Listing) => ({
          ...listing,
          asking_price: listing.asking_price || 0, // Handle null asking_price
          expires_at: ['published', 'approved'].includes(listing.status) ? new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString() : undefined,
          stats: {
            views: listing.view_count || 0,
            inquiries: listing.connection_count || 0,
            favorites: listing.saved_count || 0,
            lastViewed: listing.last_viewed_at || ''
          }
        }));
        
        setListings(transformedListings);
      } else {
        toast.error('Failed to load listings');
        setListings([]);
      }
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('Failed to load listings');
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const tabs = [
    { label: 'All Listings', count: listings.length },
    { label: 'Active', count: listings.filter(l => l.status === 'published').length },
    { label: 'Under Review', count: listings.filter(l => l.status === 'pending_approval').length },
    { label: 'Drafts', count: listings.filter(l => l.status === 'draft').length },
    { label: 'Rejected', count: listings.filter(l => l.status === 'rejected').length },
  ];

  const getFilteredListings = () => {
    let filtered = listings;

    // Filter by tab
    switch (activeTab) {
      case 1: // Active
        filtered = filtered.filter(l => l.status === 'published');
        break;
      case 2: // Under Review
        filtered = filtered.filter(l => l.status === 'pending_approval');
        break;
      case 3: // Drafts
        filtered = filtered.filter(l => l.status === 'draft');
        break;
      case 4: // Rejected
        filtered = filtered.filter(l => l.status === 'rejected');
        break;
    }

    // Filter by search
    if (searchQuery) {
      filtered = filtered.filter(l => 
        l.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        l.location.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, listingId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedListing(listingId);
    const listing = listings.find(l => l.id === listingId);
    setSelectedListingObject(listing || null);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedListing(null);
    setSelectedListingObject(null);
  };

  const handleEdit = (listingId: string) => {
    navigate(`${ROUTES.EDIT_LISTING.replace(':id', listingId)}`);
    handleMenuClose();
  };

  const handleView = (listingId: string) => {
    navigate(`${ROUTES.SELLER_LISTING_DETAIL.replace(':id', listingId)}`);
    handleMenuClose();
  };

  const handleDelete = (listingId: string) => {
    setListingToDelete(listingId);
    setDeleteDialogOpen(true);
    handleMenuClose();
  };

  const handlePublish = async (listingId: string) => {
    try {
      const response = await listingService.updateListing(listingId, { is_draft: false });
      if (response.success) {
        toast.success('Listing submitted for review!');
        loadListings(); // Refresh the listings
      } else {
        toast.error('Failed to submit listing for review');
      }
    } catch (error) {
      console.error('Error publishing listing:', error);
      toast.error('Failed to submit listing for review');
    }
    handleMenuClose();
  };

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

  const handleViewPendingChanges = (listingId: string) => {
    // Navigate to the listing detail page with a query parameter to show pending changes
    navigate(`${ROUTES.SELLER_LISTING_DETAIL.replace(':id', listingId)}?view=changes`);
  };

  const confirmDelete = async () => {
    if (listingToDelete) {
      try {
        const response = await listingService.deleteListing(listingToDelete);
        if (response.success) {
          setListings(prev => prev.filter(l => l.id !== listingToDelete));
          toast.success('Listing deleted successfully');
        } else {
          toast.error('Failed to delete listing');
        }
      } catch (error) {
        console.error('Error deleting listing:', error);
        toast.error('Failed to delete listing');
      } finally {
        setDeleteDialogOpen(false);
        setListingToDelete(null);
      }
    }
  };


  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTimeSince = (dateString: string) => {
    const now = new Date();
    const date = new Date(dateString);
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));
    
    if (diffInHours < 1) return 'Just now';
    if (diffInHours < 24) return `${diffInHours}h ago`;
    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 7) return `${diffInDays}d ago`;
    return formatDate(dateString);
  };

  const renderListingCard = (listing: MyListing) => {
    // Determine the display status based on listing status and pending edits
    let displayStatus = listing.status;
    if (listing.status === 'published' && listing.has_pending_edit) {
      displayStatus = 'published_with_pending_edit';
    }
    
    const config = statusConfig[displayStatus as keyof typeof statusConfig] || statusConfig.draft;
    
    return (
      <Card 
        key={listing.id}
        sx={{ 
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          transition: 'all 0.3s ease',
          '&:hover': {
            transform: 'translateY(-4px)',
            boxShadow: 4,
          }
        }}
      >

        <Box sx={{ position: 'absolute', top: 12, right: 12, zIndex: 1 }}>
          <IconButton
            size="small"
            onClick={(e) => handleMenuClick(e, listing.id)}
            sx={{ 
              backgroundColor: 'rgba(255, 255, 255, 0.9)',
              '&:hover': { backgroundColor: 'rgba(255, 255, 255, 1)' }
            }}
          >
            <MoreVert />
          </IconButton>
        </Box>

        <CardContent sx={{ flexGrow: 1, pt: 2 }}>
          {!listing.has_pending_edit && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Chip
                icon={config.icon}
                label={config.label}
                color={config.color}
                size="small"
                sx={{ mr: 1 }}
              />
              <Typography variant="caption" color="text.secondary">
                {config.description}
              </Typography>
            </Box>
          )}

          {/* Show pending edit info */}
          {listing.has_pending_edit && (
            <Box sx={{ 
              mb: 2, 
              p: 2, 
              bgcolor: 'rgba(255, 152, 0, 0.08)', 
              borderRadius: 2, 
              border: '1px solid', 
              borderColor: 'warning.main',
              position: 'relative'
            }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Pending sx={{ fontSize: 16, mr: 1, color: 'warning.main' }} />
                  <Typography variant="body2" sx={{ fontWeight: 600, color: 'warning.dark' }}>
                    Changes Under Review
                  </Typography>
                </Box>
                <Typography variant="caption" color="text.secondary">
                  {listing.pending_edit_created_at ? getTimeSince(listing.pending_edit_created_at) : ''}
                </Typography>
              </Box>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Your updates are being reviewed by our team
              </Typography>
              <Button
                size="small"
                variant="outlined"
                color="warning"
                sx={{ fontSize: '0.75rem', py: 0.5, px: 1 }}
                onClick={() => handleViewPendingChanges(listing.id)}
              >
                View Changes
              </Button>
            </Box>
          )}

          <Typography variant="h6" component="h3" gutterBottom sx={{ fontWeight: 600 }}>
            {listing.title}
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <Business sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {listing.business_summary || listing.business_type}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
            <LocationOn sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {listing.location}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
            <AttachMoney sx={{ fontSize: 16, mr: 1, color: 'text.secondary' }} />
            <Typography variant="h6" color="primary" sx={{ fontWeight: 600 }}>
              {listing.asking_price && listing.asking_price > 0 ? formatPrice(listing.asking_price) : 'Price on request'}
            </Typography>
          </Box>

          <Typography 
            variant="body2" 
            color="text.secondary" 
            sx={{ 
              mb: 2,
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {listing.description}
          </Typography>

          {['published', 'approved'].includes(listing.status) && (
            <Paper sx={{ p: 2, backgroundColor: 'grey.50', mb: 2 }}>
              <Typography variant="subtitle2" gutterBottom sx={{ fontWeight: 600 }}>
                Performance
              </Typography>
              <Grid container spacing={2}>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="primary">
                      {listing.stats.views}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Views
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="success.main">
                      {listing.stats.inquiries}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Inquiries
                    </Typography>
                  </Box>
                </Grid>
                <Grid item xs={4}>
                  <Box sx={{ textAlign: 'center' }}>
                    <Typography variant="h6" color="warning.main">
                      {listing.stats.favorites}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Saved
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </Paper>
          )}

          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Box sx={{ display: 'flex', alignItems: 'center' }}>
              <CalendarToday sx={{ fontSize: 14, mr: 0.5, color: 'text.secondary' }} />
              <Typography variant="caption" color="text.secondary">
                Created {getTimeSince(listing.created_at)}
              </Typography>
            </Box>
            {listing.stats.lastViewed && (
              <Typography variant="caption" color="text.secondary">
                Last viewed {getTimeSince(listing.stats.lastViewed)}
              </Typography>
            )}
          </Box>
        </CardContent>

        <CardActions sx={{ p: 2, pt: 0 }}>
          <Button
            size="small"
            startIcon={<Visibility />}
            onClick={() => handleView(listing.id)}
          >
            View
          </Button>
          {listing.status === 'draft' && (
            <>
              <Button
                size="small"
                startIcon={<Edit />}
                onClick={() => handleEdit(listing.id)}
              >
                Edit
              </Button>
              <Button
                size="small"
                variant="contained"
                color="primary"
                startIcon={<CheckCircle />}
                onClick={() => handlePublish(listing.id)}
              >
                Submit for Review
              </Button>
            </>
          )}
        </CardActions>
      </Card>
    );
  };

  const renderSkeletonCard = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent>
        <Skeleton variant="rectangular" width="100%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="80%" height={32} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="60%" height={20} sx={{ mb: 1 }} />
        <Skeleton variant="text" width="70%" height={20} sx={{ mb: 2 }} />
        <Skeleton variant="text" width="100%" height={40} sx={{ mb: 2 }} />
        <Skeleton variant="rectangular" width="100%" height={60} />
      </CardContent>
    </Card>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 700 }}>
            My Listings
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => navigate(ROUTES.CREATE_LISTING)}
            sx={{
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              boxShadow: '0 3px 5px 2px rgba(33, 203, 243, .3)',
            }}
          >
            Create New Listing
          </Button>
        </Box>
        <Typography variant="body1" color="text.secondary">
          Manage and track the performance of your medical business listings
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={8}>
            <TextField
              fullWidth
              placeholder="Search your listings..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={12} md={4}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              sx={{ height: 56 }}
            >
              More Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Tabs */}
      <Paper sx={{ mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          {tabs.map((tab, index) => (
            <Tab
              key={index}
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <span>{tab.label}</span>
                  <Badge 
                    badgeContent={tab.count} 
                    color="primary"
                    sx={{
                      '& .MuiBadge-badge': {
                        right: -8,
                        top: -8,
                        fontSize: '0.75rem',
                        minWidth: '18px',
                        height: '18px'
                      }
                    }}
                  />
                </Box>
              }
            />
          ))}
        </Tabs>
      </Paper>

      {/* Listings Grid */}
      {loading ? (
        <Grid container spacing={3}>
          {[1, 2, 3, 4, 5, 6].map((item) => (
            <Grid item xs={12} md={6} lg={4} key={item}>
              {renderSkeletonCard()}
            </Grid>
          ))}
        </Grid>
      ) : (
        <>
          {getFilteredListings().length === 0 ? (
            <Paper sx={{ p: 6, textAlign: 'center' }}>
              <Business sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                {searchQuery ? 'No listings found' : 'No listings yet'}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                {searchQuery 
                  ? 'Try adjusting your search terms or filters'
                  : 'Create your first listing to get started selling your medical business'
                }
              </Typography>
              {!searchQuery && (
                <Button
                  variant="contained"
                  startIcon={<Add />}
                  onClick={() => navigate(ROUTES.CREATE_LISTING)}
                >
                  Create Your First Listing
                </Button>
              )}
            </Paper>
          ) : (
            <Grid container spacing={3}>
              {getFilteredListings().map((listing) => (
                <Grid item xs={12} md={6} lg={4} key={listing.id}>
                  {renderListingCard(listing)}
                </Grid>
              ))}
            </Grid>
          )}
        </>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedListing && handleView(selectedListing)}>
          <Visibility sx={{ mr: 1 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={() => selectedListing && handleEdit(selectedListing)}>
          <Edit sx={{ mr: 1 }} />
          Edit Listing
        </MenuItem>
        {selectedListingObject?.status === 'draft' && (
          <MenuItem onClick={() => selectedListing && handlePublish(selectedListing)}>
            <CheckCircle sx={{ mr: 1 }} />
            Submit for Review
          </MenuItem>
        )}
        <Divider />
        <MenuItem 
          onClick={() => selectedListing && handleDelete(selectedListing)}
          sx={{ color: 'error.main' }}
        >
          <Delete sx={{ mr: 1 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete this listing? All associated data and inquiries will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={confirmDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      {/* Floating Action Button for Mobile */}
      <Fab
        color="primary"
        sx={{
          position: 'fixed',
          bottom: 16,
          right: 16,
          display: { xs: 'flex', md: 'none' },
          background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
        }}
        onClick={() => navigate(ROUTES.CREATE_LISTING)}
      >
        <Add />
      </Fab>
    </Container>
  );
};

export default MyListingsPage;