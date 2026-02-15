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
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Skeleton,
  Paper,
  Stack,
  FormControl,
  InputLabel,
  Select,
} from '@mui/material';
import {
  Search,
  MoreVert,
  Visibility,
  CheckCircle,
  Cancel,
  Schedule,
  Business,
  LocationOn,
  AttachMoney,
  CalendarToday,
  Refresh,
} from '@mui/icons-material';
import { adminService, PendingListing, ListingDetail, ListingApprovalRequest } from '../../services/admin.service';
import { getImageUrl } from '../../constants';
import toast from 'react-hot-toast';

const AdminListingsPage: React.FC = () => {
  // State
  const [listings, setListings] = useState<PendingListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('');
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedListing, setSelectedListing] = useState<PendingListing | null>(null);
  const [reviewDialogOpen, setReviewDialogOpen] = useState(false);
  const [currentListing, setCurrentListing] = useState<ListingDetail | null>(null);
  const [approvalDialogOpen, setApprovalDialogOpen] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [adminNotes, setAdminNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Pagination
  const [page] = useState(1);
  const [totalListings, setTotalListings] = useState(0);

  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getPendingListings(
        page,
        20,
        businessTypeFilter || undefined
      );
      
      if (response.success && response.data) {
        const listings = response.data.listings || [];
        setListings(listings);
        setTotalListings(response.data.pagination?.total || 0);
      } else {
        console.error('API response failed:', response);
        toast.error('Failed to load listings');
      }
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [page, businessTypeFilter]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  const handleMenuClick = (event: React.MouseEvent<HTMLElement>, listing: PendingListing) => {
    setAnchorEl(event.currentTarget);
    setSelectedListing(listing);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedListing(null);
  };

  const handleViewListing = async (listing: PendingListing) => {
    try {
      const response = await adminService.getListingForReview(listing.id, listing.edit_id);
      
      if (response.success && response.data) {
        setCurrentListing(response.data);
        setReviewDialogOpen(true);
      } else {
        console.error('API response failed:', response);
        toast.error(`Failed to load listing details: ${response.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error loading listing details:', error);
      toast.error(`Failed to load listing details: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    handleMenuClose();
  };

  const handleApprovalAction = (action: 'approve' | 'reject') => {
    setApprovalAction(action);
    setApprovalDialogOpen(true);
    setAdminNotes('');
    setRejectionReason('');
  };

  const handleSubmitApproval = async () => {
    if (!currentListing) return;

    try {
      setProcessing(true);
      
      const approvalData: ListingApprovalRequest = {
        status: approvalAction === 'approve' ? 'approved' : 'rejected',
        admin_notes: adminNotes || undefined,
        rejection_reason: approvalAction === 'reject' ? rejectionReason : undefined,
      };

      const response = await adminService.approveOrRejectListing(
        currentListing.id,
        approvalData,
        currentListing.edit_id // Pass edit_id if this is a listing edit
      );

      if (response.success) {
        toast.success(
          approvalAction === 'approve' 
            ? 'Listing approved successfully!' 
            : 'Listing rejected successfully!'
        );
        setApprovalDialogOpen(false);
        setReviewDialogOpen(false);
        loadListings(); // Refresh the list
      } else {
        toast.error('Failed to update listing status');
      }
    } catch (error) {
      console.error('Error updating listing status:', error);
      toast.error('Failed to update listing status');
    } finally {
      setProcessing(false);
    }
  };

  const getFilteredListings = () => {
    let filtered = listings;

    // Filter by search query
    if (searchQuery) {
      filtered = filtered.filter(listing => 
        listing.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.location.toLowerCase().includes(searchQuery.toLowerCase()) ||
        listing.seller?.business_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    return filtered;
  };

  const formatCurrency = (amount: string | number) => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(numAmount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const businessTypeLabels: Record<string, string> = {
    full_sale: 'Full Sale',
    partial_sale: 'Partial Sale',
    fundraising: 'Fundraising',
  };

  const renderListingCard = (listing: PendingListing) => (
    <Card key={listing.id} sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
      <CardContent sx={{ flexGrow: 1 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box sx={{ flex: 1, mr: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, lineHeight: 1.2, mb: 1 }}>
              {listing.title}
            </Typography>
            {/* Type and Status Indicators */}
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
              {listing.type === 'listing_edit' ? (
                <Chip
                  size="small"
                  label="Edit Review"
                  color="warning"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              ) : (
                <Chip
                  size="small"
                  label="New Listing"
                  color="info"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              {listing.edit_reason && (
                <Chip
                  size="small"
                  label={listing.edit_reason}
                  color="secondary"
                  variant="filled"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
              {listing.type === 'listing_edit' && (
                <Chip
                  size="small"
                  label="🖼️ Media Check"
                  color="primary"
                  variant="outlined"
                  sx={{ fontSize: '0.75rem' }}
                />
              )}
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={(e) => handleMenuClick(e, listing)}
          >
            <MoreVert />
          </IconButton>
        </Box>

        <Stack spacing={1} sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Business sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {businessTypeLabels[listing.business_type] || listing.business_type}
            </Typography>
          </Box>
          
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <LocationOn sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {listing.location}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <AttachMoney sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              {formatCurrency(listing.asking_price)}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday sx={{ fontSize: 16, color: 'text.secondary' }} />
            <Typography variant="body2" color="text.secondary">
              Submitted {formatDate(listing.created_at)}
            </Typography>
          </Box>
        </Stack>

        <Typography 
          variant="body2" 
          color="text.secondary" 
          sx={{ 
            display: '-webkit-box',
            WebkitLineClamp: 3,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
            mb: 2
          }}
        >
          {listing.description}
        </Typography>

        {listing.seller && (
          <Box sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Seller Information
            </Typography>
            <Typography variant="body2" color="text.secondary">
              {listing.seller.business_name}
            </Typography>
            <Chip
              size="small"
              label={listing.seller.verification_status}
              color={listing.seller.verification_status === 'approved' ? 'success' : 'warning'}
              sx={{ mt: 1 }}
            />
          </Box>
        )}
      </CardContent>

      <CardActions sx={{ p: 2, pt: 0 }}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Visibility />}
          onClick={() => handleViewListing(listing)}
          fullWidth
        >
          Review Listing
        </Button>
      </CardActions>
    </Card>
  );

  const renderListingDetail = () => {
    if (!currentListing) return null;

    return (
      <Dialog
        open={reviewDialogOpen}
        onClose={() => setReviewDialogOpen(false)}
        maxWidth="lg"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Review Listing</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                color="success"
                startIcon={<CheckCircle />}
                onClick={() => handleApprovalAction('approve')}
              >
                Approve
              </Button>
              <Button
                variant="contained"
                color="error"
                startIcon={<Cancel />}
                onClick={() => handleApprovalAction('reject')}
              >
                Reject
              </Button>
            </Box>
          </Box>
        </DialogTitle>
        
        <DialogContent>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Basic Information
                </Typography>
                <Grid container spacing={2}>
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Title
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {currentListing.title}
                    </Typography>
                  </Grid>
                  
                  <Grid item xs={12}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Description
                    </Typography>
                    <Typography variant="body1" sx={{ mb: 2 }}>
                      {currentListing.description}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Business Type
                    </Typography>
                    <Typography variant="body1">
                      {businessTypeLabels[currentListing.business_type] || currentListing.business_type}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Location
                    </Typography>
                    <Typography variant="body1">
                      {currentListing.location}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Asking Price
                    </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 600, color: 'primary.main' }}>
                      {formatCurrency(currentListing.asking_price)}
                    </Typography>
                  </Grid>

                  <Grid item xs={6}>
                    <Typography variant="subtitle2" color="text.secondary">
                      Submitted
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(currentListing.created_at)}
                    </Typography>
                  </Grid>
                </Grid>
              </Paper>
            </Grid>

            {/* Financial Information */}
            {(currentListing.annual_revenue || currentListing.net_profit) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Financial Information
                  </Typography>
                  <Grid container spacing={2}>
                    {currentListing.annual_revenue && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Annual Revenue
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentListing.annual_revenue)}
                        </Typography>
                      </Grid>
                    )}
                    
                    {currentListing.net_profit && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Net Profit
                        </Typography>
                        <Typography variant="body1">
                          {formatCurrency(currentListing.net_profit)}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Practice Information */}
            {(currentListing.practice_name || currentListing.practice_type) && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Practice Information
                  </Typography>
                  <Grid container spacing={2}>
                    {currentListing.practice_name && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Practice Name
                        </Typography>
                        <Typography variant="body1">
                          {currentListing.practice_name}
                        </Typography>
                      </Grid>
                    )}
                    
                    {currentListing.practice_type && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Practice Type
                        </Typography>
                        <Typography variant="body1">
                          {currentListing.practice_type}
                        </Typography>
                      </Grid>
                    )}

                    {currentListing.staff_count && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Staff Count
                        </Typography>
                        <Typography variant="body1">
                          {currentListing.staff_count}
                        </Typography>
                      </Grid>
                    )}

                    {currentListing.patient_list_size && (
                      <Grid item xs={6}>
                        <Typography variant="subtitle2" color="text.secondary">
                          Patient List Size
                        </Typography>
                        <Typography variant="body1">
                          {currentListing.patient_list_size}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Seller Information */}
            {currentListing.seller && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Seller Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Business Name
                      </Typography>
                      <Typography variant="body1">
                        {currentListing.seller.business_name}
                      </Typography>
                    </Grid>
                    
                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Contact Person
                      </Typography>
                      <Typography variant="body1">
                        {currentListing.seller.user.name}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body1">
                        {currentListing.seller.user.email}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Phone Number
                      </Typography>
                      <Typography variant="body1">
                        {currentListing.seller.user.phone || 'Not provided'}
                      </Typography>
                    </Grid>

                    <Grid item xs={6}>
                      <Typography variant="subtitle2" color="text.secondary">
                        Verification Status
                      </Typography>
                      <Chip
                        label={currentListing.seller.verification_status}
                        color={currentListing.seller.verification_status === 'approved' ? 'success' : 'warning'}
                        size="small"
                      />
                    </Grid>
                  </Grid>
                </Paper>
              </Grid>
            )}

            {/* Media/Photos Section */}
            {currentListing.media && currentListing.media.length > 0 && (
              <Grid item xs={12}>
                <Paper sx={{ p: 3 }}>
                  <Typography variant="h6" gutterBottom>
                    Listing Photos ({currentListing.media.length})
                  </Typography>
                  <Grid container spacing={2}>
                    {currentListing.media.map((media, index) => (
                      <Grid item xs={12} sm={6} md={4} key={media.id}>
                        <Box
                          sx={{
                            position: 'relative',
                            width: '100%',
                            height: 200,
                            borderRadius: 1,
                            overflow: 'hidden',
                            border: media.is_primary ? '3px solid' : '1px solid',
                            borderColor: media.is_primary ? 'primary.main' : 'grey.300',
                          }}
                        >
                          <img
                            src={getImageUrl(media.file_url)}
                            alt={`Listing photo ${index + 1}`}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.src = '/placeholder-image.png'; // Fallback image
                            }}
                          />
                          {media.is_primary && (
                            <Chip
                              label="Primary"
                              color="primary"
                              size="small"
                              sx={{
                                position: 'absolute',
                                top: 8,
                                left: 8,
                                fontWeight: 'bold',
                              }}
                            />
                          )}
                        </Box>
                      </Grid>
                    ))}
                  </Grid>
                </Paper>
              </Grid>
            )}
          </Grid>
        </DialogContent>
        
        <DialogActions>
          <Button onClick={() => setReviewDialogOpen(false)}>
            Close
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderApprovalDialog = () => (
    <Dialog
      open={approvalDialogOpen}
      onClose={() => setApprovalDialogOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>
        {approvalAction === 'approve' ? 'Approve Listing' : 'Reject Listing'}
      </DialogTitle>
      
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          <Alert severity={approvalAction === 'approve' ? 'success' : 'error'}>
            {approvalAction === 'approve' 
              ? 'This listing will be published and visible to buyers.'
              : 'This listing will be rejected and the seller will be notified.'
            }
          </Alert>

          <TextField
            label="Admin Notes"
            multiline
            rows={3}
            value={adminNotes}
            onChange={(e) => setAdminNotes(e.target.value)}
            placeholder="Add any notes for internal records..."
            fullWidth
          />

          {approvalAction === 'reject' && (
            <TextField
              label="Rejection Reason"
              multiline
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Explain why this listing is being rejected..."
              required
              fullWidth
            />
          )}
        </Stack>
      </DialogContent>
      
      <DialogActions>
        <Button onClick={() => setApprovalDialogOpen(false)}>
          Cancel
        </Button>
        <Button
          variant="contained"
          color={approvalAction === 'approve' ? 'success' : 'error'}
          onClick={handleSubmitApproval}
          disabled={processing || (approvalAction === 'reject' && !rejectionReason.trim())}
        >
          {processing ? 'Processing...' : (approvalAction === 'approve' ? 'Approve' : 'Reject')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  if (loading && listings.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box sx={{ mb: 4 }}>
          <Skeleton variant="text" width={300} height={40} />
          <Skeleton variant="text" width={500} height={24} />
        </Box>
        <Grid container spacing={3}>
          {[...Array(6)].map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Skeleton variant="rectangular" height={300} />
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  const filteredListings = getFilteredListings();

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
          Listings Management
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Review and approve pending listings from sellers
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                    {totalListings}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    Pending Review
                  </Typography>
                </Box>
                <Schedule sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters */}
      <Paper sx={{ p: 3, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search listings, locations, or sellers..."
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
          
          <Grid item xs={12} md={3}>
            <FormControl fullWidth>
              <InputLabel>Business Type</InputLabel>
              <Select
                value={businessTypeFilter}
                label="Business Type"
                onChange={(e) => setBusinessTypeFilter(e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="full_sale">Full Sale</MenuItem>
                <MenuItem value="partial_sale">Partial Sale</MenuItem>
                <MenuItem value="fundraising">Fundraising</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={loadListings}
              fullWidth
            >
              Refresh
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Listings Grid */}
      {filteredListings.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center' }}>
          <Schedule sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No Pending Listings
          </Typography>
          <Typography variant="body2" color="text.secondary">
            All listings have been reviewed or no new submissions are available.
          </Typography>
        </Paper>
      ) : (
        <Grid container spacing={3}>
          {filteredListings.map((listing) => (
            <Grid item xs={12} sm={6} md={4} key={listing.id}>
              {renderListingCard(listing)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Action Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
      >
        <MenuItem onClick={() => selectedListing && handleViewListing(selectedListing)}>
          <Visibility sx={{ mr: 1 }} />
          Review Listing
        </MenuItem>
      </Menu>

      {/* Dialogs */}
      {renderListingDetail()}
      {renderApprovalDialog()}
    </Container>
  );
};

export default AdminListingsPage;
