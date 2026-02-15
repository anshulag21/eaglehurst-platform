import React, { useEffect, useState } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  IconButton,
  Pagination,
  Container,
  Alert,
  Skeleton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  BookmarkBorder as BookmarkBorderIcon,
  LocationOn as LocationIcon,
  Business as BusinessIcon,
  AttachMoney as MoneyIcon,
  Visibility as ViewIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { useAppDispatch, useAppSelector } from '../../store';
import { fetchSavedListings, unsaveListing } from '../../store/slices/listingSlice';
import { ROUTES, BUSINESS_TYPE_LABELS, getImageUrl } from '../../constants';
import { Listing } from '../../types';
import toast from 'react-hot-toast';

const SavedListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  
  const { savedListings, savedListingsPagination, isLoading, error } = useAppSelector((state) => state.listings);
  const { user } = useAppSelector((state) => state.auth);
  
  const [page, setPage] = useState(1);
  const [unsaveDialog, setUnsaveDialog] = useState<{
    open: boolean;
    listing: Listing | null;
  }>({ open: false, listing: null });
  const itemsPerPage = 12;

  useEffect(() => {
    if (user?.user_type === 'buyer') {
      const skip = (page - 1) * itemsPerPage;
      dispatch(fetchSavedListings({ skip, limit: itemsPerPage }));
    }
  }, [dispatch, user, page]);

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleViewListing = (listingId: string) => {
    navigate(ROUTES.LISTING_DETAIL.replace(':id', listingId));
  };

  const handleUnsaveListing = async (listing: Listing) => {
    try {
      await dispatch(unsaveListing(listing.id)).unwrap();
      toast.success('Listing removed from saved');
      setUnsaveDialog({ open: false, listing: null });
      // Refresh saved listings with current pagination
      const skip = (page - 1) * itemsPerPage;
      dispatch(fetchSavedListings({ skip, limit: itemsPerPage }));
    } catch (error) {
      console.error('Error removing listing from saved:', error);
      toast.error('Failed to remove listing from saved');
    }
  };

  const formatPrice = (price: number | null): string => {
    if (!price) return 'Price on request';
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const getPrimaryImage = (listing: Listing): string => {
    const primaryMedia = listing.media_files?.find(media => media.is_primary);
    if (primaryMedia) {
      return getImageUrl(primaryMedia.file_url);
    }
    
    const firstImage = listing.media_files?.find(media => media.file_type === 'image');
    if (firstImage) {
      return getImageUrl(firstImage.file_url);
    }
    
    return '/placeholder-business.jpg';
  };

  // Redirect if not a buyer
  if (user?.user_type !== 'buyer') {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">
          Only buyers can access saved listings.
        </Alert>
      </Container>
    );
  }

  // Calculate pagination from server data
  const totalPages = savedListingsPagination ? Math.ceil(savedListingsPagination.total / savedListingsPagination.limit) : 1;
  const paginatedListings = savedListings; // Already paginated by server

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" component="h1" gutterBottom>
          <BookmarkIcon sx={{ mr: 2, verticalAlign: 'middle' }} />
          Saved Listings
        </Typography>
        <Typography variant="body1" color="text.secondary">
          Your bookmarked listings for easy access
        </Typography>
      </Box>

      {/* Error State */}
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}

      {/* Loading State */}
      {isLoading && (
        <Grid container spacing={3}>
          {Array.from({ length: 6 }).map((_, index) => (
            <Grid item xs={12} sm={6} md={4} key={index}>
              <Card>
                <Skeleton variant="rectangular" height={200} />
                <CardContent>
                  <Skeleton variant="text" height={32} />
                  <Skeleton variant="text" height={20} />
                  <Skeleton variant="text" height={20} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {/* Empty State */}
      {!isLoading && savedListings.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
            px: 2,
          }}
        >
          <BookmarkBorderIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h5" gutterBottom>
            No Saved Listings
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            You haven't saved any listings yet. Browse listings and save the ones you're interested in.
          </Typography>
          <Button
            variant="contained"
            onClick={() => navigate(ROUTES.LISTINGS)}
            size="large"
          >
            Browse Listings
          </Button>
        </Box>
      )}

      {/* Listings Grid */}
      {!isLoading && savedListings.length > 0 && (
        <>
          <Grid container spacing={3}>
            {paginatedListings.map((savedItem) => {
              const listing = savedItem.listing;
              return (
              <Grid item xs={12} sm={6} md={4} key={savedItem.id}>
                <Card
                  sx={{
                    height: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    transition: 'transform 0.2s, box-shadow 0.2s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: (theme) => theme.shadows[8],
                    },
                  }}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={getPrimaryImage(listing)}
                    alt={listing.title}
                    sx={{
                      objectFit: 'cover',
                      cursor: 'pointer',
                    }}
                    onClick={() => handleViewListing(listing.id)}
                  />
                  
                  <CardContent sx={{ flexGrow: 1 }}>
                    <Typography
                      variant="h6"
                      component="h2"
                      gutterBottom
                      sx={{
                        cursor: 'pointer',
                        '&:hover': { color: 'primary.main' },
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                      onClick={() => handleViewListing(listing.id)}
                    >
                      {listing.title}
                    </Typography>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <LocationIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        {listing.location}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <BusinessIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                      <Chip
                        label={BUSINESS_TYPE_LABELS[listing.business_type as keyof typeof BUSINESS_TYPE_LABELS]}
                        size="small"
                        variant="outlined"
                      />
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                      <MoneyIcon sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
                      <Typography variant="body2" color="text.secondary">
                        {formatPrice(listing.asking_price)}
                      </Typography>
                    </Box>

                    <Typography
                      variant="body2"
                      color="text.secondary"
                      sx={{
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden',
                      }}
                    >
                      {listing.description}
                    </Typography>
                  </CardContent>

                  <CardActions sx={{ justifyContent: 'space-between', px: 2, pb: 2 }}>
                    <Button
                      startIcon={<ViewIcon />}
                      onClick={() => handleViewListing(listing.id)}
                      size="small"
                    >
                      View Details
                    </Button>
                    
                    <IconButton
                      onClick={() => setUnsaveDialog({ open: true, listing })}
                      color="primary"
                      title="Remove from saved"
                    >
                      <BookmarkIcon />
                    </IconButton>
                  </CardActions>
                </Card>
              </Grid>
              );
            })}
          </Grid>

          {/* Pagination */}
          {totalPages > 1 && (
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
              <Pagination
                count={totalPages}
                page={page}
                onChange={handlePageChange}
                color="primary"
                size="large"
              />
            </Box>
          )}
        </>
      )}

      {/* Unsave Confirmation Dialog */}
      <Dialog
        open={unsaveDialog.open}
        onClose={() => setUnsaveDialog({ open: false, listing: null })}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Remove from Saved Listings</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to remove "{unsaveDialog.listing?.title}" from your saved listings?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => setUnsaveDialog({ open: false, listing: null })}
          >
            Cancel
          </Button>
          <Button
            onClick={() => unsaveDialog.listing && handleUnsaveListing(unsaveDialog.listing)}
            color="error"
            variant="contained"
          >
            Remove
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default SavedListingsPage;
