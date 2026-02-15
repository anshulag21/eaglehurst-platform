import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Chip,
  Divider,
  Stack,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  ArrowBack,
  Business,
  LocationOn,
  AttachMoney,
  CalendarToday,
  Person,
  Assessment,
  Message,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { adminService } from '../../services/admin.service';
import { ROUTES } from '../../constants';

interface ListingDetail {
  id: string;
  title: string;
  description: string;
  business_type: string;
  location: string;
  asking_price: number;
  status: string;
  created_at: string;
  updated_at: string;
  seller: {
    id: string;
    business_name: string;
    verification_status: string;
    user: {
      name: string;
      email: string;
    };
  } | null;
}

const AdminListingDetailPage: React.FC = () => {
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  
  const [listing, setListing] = useState<ListingDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (listingId) {
      loadListingDetails();
    }
  }, [listingId]);

  const loadListingDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await adminService.getListingForReview(listingId!);
      
      if (response.success && response.data) {
        setListing(response.data);
      } else {
        setError('Failed to load listing details');
      }
    } catch (error) {
      console.error('Error loading listing details:', error);
      setError('Failed to load listing details');
      toast.error('Failed to load listing details');
    } finally {
      setLoading(false);
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
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'published': return 'success';
      case 'pending_approval': return 'warning';
      case 'draft': return 'default';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getBusinessTypeLabel = (type: string) => {
    switch (type) {
      case 'full_sale': return 'Full Sale';
      case 'partial_sale': return 'Partial Sale';
      case 'fundraising': return 'Fundraising';
      default: return type;
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

  if (error || !listing) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || 'Listing not found'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.ADMIN_ALL_LISTINGS)}
        >
          Back to All Listings
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
            onClick={() => navigate(ROUTES.ADMIN_ALL_LISTINGS)}
            sx={{ mb: 2 }}
          >
            Back to All Listings
          </Button>
          <Typography variant="h4" component="h1" gutterBottom>
            Listing Details
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive view of listing information and seller details
          </Typography>
        </Box>

        {/* Action Buttons */}
        <Box sx={{ mb: 4 }}>
          <Stack direction="row" spacing={2}>
            <Button
              variant="outlined"
              startIcon={<Assessment />}
              onClick={() => navigate(ROUTES.ADMIN_LISTING_ANALYTICS.replace(':listingId', listing.id))}
            >
              View Analytics
            </Button>
            <Button
              variant="outlined"
              startIcon={<Message />}
              onClick={() => navigate(ROUTES.ADMIN_LISTING_CONVERSATIONS.replace(':listingId', listing.id))}
            >
              View Conversations
            </Button>
          </Stack>
        </Box>

        <Grid container spacing={3}>
          {/* Listing Information */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardContent>
                <Typography variant="h5" gutterBottom>
                  {listing.title}
                </Typography>
                
                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                  <Chip
                    label={listing.status.replace('_', ' ').toUpperCase()}
                    color={getStatusColor(listing.status) as any}
                    size="small"
                  />
                  <Chip
                    label={getBusinessTypeLabel(listing.business_type)}
                    variant="outlined"
                    size="small"
                  />
                </Stack>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <LocationOn color="action" />
                  <Typography variant="body1">
                    {listing.location}
                  </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                  <AttachMoney color="action" />
                  <Typography variant="h6" color="primary">
                    {formatPrice(listing.asking_price)}
                  </Typography>
                </Box>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                  Description
                </Typography>
                <Typography variant="body1" paragraph>
                  {listing.description}
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Grid container spacing={2}>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Created
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(listing.created_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                  <Grid item xs={6}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <CalendarToday color="action" />
                      <Box>
                        <Typography variant="caption" color="text.secondary">
                          Updated
                        </Typography>
                        <Typography variant="body2">
                          {formatDate(listing.updated_at)}
                        </Typography>
                      </Box>
                    </Box>
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Seller Information */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Seller Information
                </Typography>
                
                {listing.seller ? (
                  <>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Business color="action" />
                      <Box>
                        <Typography variant="subtitle2">
                          {listing.seller.business_name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Business Name
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                      <Person color="action" />
                      <Box>
                        <Typography variant="subtitle2">
                          {listing.seller.user.name}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          Contact Person
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Email
                      </Typography>
                      <Typography variant="body2">
                        {listing.seller.user.email}
                      </Typography>
                    </Box>

                    <Box sx={{ mb: 2 }}>
                      <Typography variant="caption" color="text.secondary">
                        Verification Status
                      </Typography>
                      <Box sx={{ mt: 0.5 }}>
                        <Chip
                          label={listing.seller.verification_status.toUpperCase()}
                          color={listing.seller.verification_status === 'approved' ? 'success' : 'warning'}
                          size="small"
                        />
                      </Box>
                    </Box>

                    <Divider sx={{ my: 2 }} />

                    <Button
                      variant="outlined"
                      fullWidth
                      startIcon={<Person />}
                      onClick={() => navigate(ROUTES.ADMIN_SELLER_DETAIL.replace(':sellerId', listing.seller!.user_id || listing.seller!.user?.id || listing.seller!.id))}
                    >
                      View Seller Profile
                    </Button>
                  </>
                ) : (
                  <Alert severity="warning">
                    No seller information available
                  </Alert>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </motion.div>
    </Container>
  );
};

export default AdminListingDetailPage;
