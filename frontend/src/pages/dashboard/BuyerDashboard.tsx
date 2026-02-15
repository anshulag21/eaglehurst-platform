import React, { useState, useEffect } from 'react';
import { 
  Typography, 
  Container, 
  Paper, 
  Grid, 
  Card, 
  CardContent, 
  Button, 
  CircularProgress,
  Box,
  Skeleton,
  CardMedia,
  Chip,
  Divider
} from '@mui/material';
import { 
  Search, 
  Favorite, 
  Message, 
  Business,
  TrendingUp,
  Visibility,
  LocationOn,
  AttachMoney,
  ArrowForward,
  History
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { motion } from 'framer-motion';

import { ROUTES, getImageUrl } from '../../constants';
import { analyticsService, BuyerAnalytics } from '../../services/analytics.service';
import { listingService } from '../../services/listing.service';
import { Listing } from '../../types';

const BuyerDashboard: React.FC = () => {
  const navigate = useNavigate();
  const [analytics, setAnalytics] = useState<BuyerAnalytics | null>(null);
  const [featuredListings, setFeaturedListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [listingsLoading, setListingsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
    loadFeaturedListings();
  }, []);

  const loadAnalytics = async () => {
    try {
      setLoading(true);
      // Try to get buyer analytics from API
      const response = await analyticsService.getBuyerAnalytics();
      if (response.success && response.data) {
        setAnalytics(response.data);
      } else {
        // Fallback to reasonable default values
        setAnalytics({
          total_searches: 0,
          saved_listings: 0,
          active_connections: 0,
          unread_messages: 0,
          recent_activity: 0,
          profile_views: 0
        });
      }
    } catch (error) {
      console.error('Error loading buyer analytics:', error);
      // Fallback data
      setAnalytics({
        total_searches: 0,
        saved_listings: 0,
        active_connections: 0,
        unread_messages: 0,
        recent_activity: 0,
        profile_views: 0
      });
    } finally {
      setLoading(false);
    }
  };

  const loadFeaturedListings = async () => {
    try {
      setListingsLoading(true);
      // Get recent listings (limit to 4 for dashboard)
      const response = await listingService.getListings({ 
        page: 1, 
        limit: 4,
        sort_by: 'created_at',
        sort_order: 'desc'
      });
      
      if (response.success && response.data) {
        setFeaturedListings(response.data.listings || []);
      }
    } catch (error) {
      console.error('Error loading featured listings:', error);
      // Don't show error toast for this, just fail silently
    } finally {
      setListingsLoading(false);
    }
  };

  const handleTileClick = (route: string) => {
    navigate(route);
  };

  const renderStatCard = (
    title: string,
    value: number,
    icon: React.ReactNode,
    color: string,
    route: string
  ) => (
    <Grid item xs={12} sm={6} md={3}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card 
          sx={{ 
            cursor: 'pointer',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-2px)'
            }
          }}
          onClick={() => handleTileClick(route)}
        >
          <CardContent sx={{ textAlign: 'center', py: 3 }}>
            {loading ? (
              <>
                <Skeleton variant="circular" width={40} height={40} sx={{ mx: 'auto', mb: 1 }} />
                <Skeleton variant="text" width="60%" sx={{ mx: 'auto' }} />
                <Skeleton variant="text" width="40%" sx={{ mx: 'auto' }} />
              </>
            ) : (
              <>
                <Box sx={{ color, fontSize: 40, mb: 1 }}>
                  {icon}
                </Box>
                <Typography variant="h6" sx={{ mb: 1 }}>
                  {title}
                </Typography>
                <Typography variant="h4" sx={{ color, fontWeight: 'bold' }}>
                  {value}
                </Typography>
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );

  const formatPrice = (listing: Listing): string => {
    if (listing.asking_price) {
      return new Intl.NumberFormat('en-GB', {
        style: 'currency',
        currency: 'GBP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(listing.asking_price);
    }
    
    // Check if listing has price_range property
    const priceRange = (listing as any).price_range;
    if (priceRange) {
      return priceRange;
    }
    
    return 'Price on request';
  };

  const renderListingCard = (listing: Listing) => (
    <Grid item xs={12} sm={6} md={3} key={listing.id}>
      <motion.div
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
      >
        <Card 
          sx={{ 
            cursor: 'pointer',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            transition: 'all 0.2s ease-in-out',
            '&:hover': {
              boxShadow: 4,
              transform: 'translateY(-2px)'
            }
          }}
          onClick={() => navigate(`${ROUTES.LISTINGS}/${listing.id}`)}
        >
          <CardMedia
            component="div"
            sx={{
              height: 200,
              backgroundColor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative'
            }}
          >
            {listing.media_files && listing.media_files.length > 0 ? (
              <img
                src={getImageUrl(listing.media_files[0].file_url)}
                alt={listing.title}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover'
                }}
              />
            ) : (
              <Business sx={{ fontSize: 60, color: 'grey.400' }} />
            )}
            <Chip
              label={listing.business_type?.replace('_', ' ').toUpperCase() || 'BUSINESS'}
              size="small"
              sx={{
                position: 'absolute',
                top: 8,
                right: 8,
                backgroundColor: 'primary.main',
                color: 'white',
                fontWeight: 'bold'
              }}
            />
          </CardMedia>
          <CardContent sx={{ flexGrow: 1, p: 2 }}>
            <Typography variant="h6" gutterBottom sx={{ 
              fontWeight: 600,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {listing.title}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <LocationOn sx={{ fontSize: 16, color: 'text.secondary', mr: 0.5 }} />
              <Typography variant="body2" color="text.secondary">
                {listing.location || 'Location not specified'}
              </Typography>
            </Box>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <AttachMoney sx={{ fontSize: 16, color: 'success.main', mr: 0.5 }} />
              <Typography variant="body2" color="success.main" fontWeight="bold">
                {formatPrice(listing)}
              </Typography>
            </Box>
            
            <Typography variant="body2" color="text.secondary" sx={{
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              display: '-webkit-box',
              WebkitLineClamp: 2,
              WebkitBoxOrient: 'vertical'
            }}>
              {listing.description}
            </Typography>
          </CardContent>
        </Card>
      </motion.div>
    </Grid>
  );

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        <Typography variant="h4" gutterBottom sx={{ fontWeight: 700, mb: 4 }}>
          Welcome Back
        </Typography>
        
        {/* Quick Stats - Only the most important ones */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {renderStatCard(
            'Saved Listings',
            analytics?.saved_listings || 0,
            <Favorite />,
            'error.main',
            ROUTES.SAVED_LISTINGS
          )}
          
          {renderStatCard(
            'Active Connections',
            analytics?.active_connections || 0,
            <Business />,
            'success.main',
            ROUTES.MESSAGES
          )}
          
          {renderStatCard(
            'New Messages',
            analytics?.unread_messages || 0,
            <Message />,
            'info.main',
            ROUTES.MESSAGES
          )}
        </Grid>

        {/* Welcome Section */}
        <Paper sx={{ p: 4, textAlign: 'center', mb: 4 }}>
          <Typography variant="h5" gutterBottom sx={{ fontWeight: 600 }}>
            Discover Premium Medical Practices
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3, maxWidth: 600, mx: 'auto' }}>
            Find verified medical business opportunities across the UK. Connect with sellers and grow your healthcare portfolio.
          </Typography>
          <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center', flexWrap: 'wrap' }}>
            <Button 
              variant="contained" 
              size="large"
              onClick={() => navigate(ROUTES.LISTINGS)}
              startIcon={<Search />}
            >
              Browse All Listings
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate(ROUTES.SAVED_LISTINGS)}
              startIcon={<Favorite />}
            >
              View Saved
            </Button>
            <Button 
              variant="outlined" 
              size="large"
              onClick={() => navigate(ROUTES.ENQUIRY_HISTORY)}
              startIcon={<History />}
            >
              Enquiry History
            </Button>
          </Box>
        </Paper>

        {/* Featured Listings Section */}
        <Box sx={{ mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
            <Typography variant="h5" sx={{ fontWeight: 600 }}>
              Recent Listings
            </Typography>
            <Button 
              variant="text" 
              endIcon={<ArrowForward />}
              onClick={() => navigate(ROUTES.LISTINGS)}
              sx={{ fontWeight: 600 }}
            >
              View All
            </Button>
          </Box>
          
          {listingsLoading ? (
            <Grid container spacing={3}>
              {[1, 2, 3, 4].map((i) => (
                <Grid item xs={12} sm={6} md={3} key={i}>
                  <Card>
                    <Skeleton variant="rectangular" height={200} />
                    <CardContent>
                      <Skeleton variant="text" height={32} />
                      <Skeleton variant="text" height={20} />
                      <Skeleton variant="text" height={20} />
                      <Skeleton variant="text" height={40} />
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          ) : featuredListings.length > 0 ? (
            <Grid container spacing={3}>
              {featuredListings.map(renderListingCard)}
            </Grid>
          ) : (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Business sx={{ fontSize: 60, color: 'grey.400', mb: 2 }} />
              <Typography variant="h6" color="text.secondary" gutterBottom>
                No listings available at the moment
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
                Check back later for new medical practice opportunities.
              </Typography>
              <Button 
                variant="contained"
                onClick={() => navigate(ROUTES.LISTINGS)}
                startIcon={<Search />}
              >
                Browse Listings
              </Button>
            </Paper>
          )}
        </Box>
      </motion.div>
    </Container>
  );
};

export default BuyerDashboard;
