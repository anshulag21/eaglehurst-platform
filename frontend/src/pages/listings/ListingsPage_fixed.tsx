import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardMedia,
  CardActions,
  Button,
  Chip,
  Box,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  Stack,
  IconButton,
  Skeleton,
  Paper,
} from '@mui/material';
import {
  Search,
  FilterList,
  LocationOn,
  Business,
  AttachMoney,
  Visibility,
  TrendingUp,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store';
import { fetchListings, setFilters } from '../../store/slices/listingSlice';
import { ROUTES, BUSINESS_TYPE_LABELS } from '../../constants';
import type { Listing, ListingFilters } from '../../types';

const ListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { listings, pagination, filters, isLoading } = useAppSelector((state) => state.listings);

  const [searchQuery, setSearchQuery] = useState('');
  const [businessType, setBusinessType] = useState<string>('full_sale');
  const [location, setLocation] = useState('');
  const [priceRange, setPriceRange] = useState('');
  const [sortBy, setSortBy] = useState('created_at');

  useEffect(() => {
    dispatch(fetchListings({ page: 1, limit: 12 }));
  }, [dispatch]);

  const handleSearch = () => {
    const newFilters: ListingFilters = {
      search: searchQuery,
      business_type: businessType as any,
      location,
      price_min: priceRange === 'low' ? 0 : priceRange === 'medium' ? 100000 : 500000,
      price_max: priceRange === 'low' ? 100000 : priceRange === 'medium' ? 500000 : undefined,
      sort_by: sortBy as any,
    };
    dispatch(setFilters(newFilters));
    dispatch(fetchListings({ page: 1, limit: 12, filters: newFilters }));
  };

  const handlePageChange = (event: React.ChangeEvent<unknown>, value: number) => {
    dispatch(fetchListings({ page: value, limit: 12, filters }));
  };

  const mockListings: Listing[] = [
    {
      id: '123e4567-e89b-12d3-a456-426614174001',
      title: 'Established GP Practice - Central London',
      description: 'Well-established GP practice in prime Central London location with excellent patient list and modern facilities.',
      business_type: 'full_sale',
      location: 'Central London',
      asking_price: 750000,
      business_details: {
        practice_name: 'Central Health Practice',
        practice_type: 'GP Practice',
        nhs_contract: true,
        patient_list_size: 3500,
        staff_count: 8,
        premises_type: 'leased',
        cqc_registered: true,
        annual_revenue: 450000,
        net_profit: 180000,
      },
      seller_id: 'seller1',
      status: 'active',
      created_at: '2024-01-15T10:30:00Z',
      updated_at: '2024-01-15T10:30:00Z',
    },
    {
      id: '123e4567-e89b-12d3-a456-426614174002',
      title: 'Modern Dental Practice - Manchester',
      description: 'State-of-the-art dental practice with the latest equipment and growing patient base.',
      business_type: 'full_sale',
      location: 'Manchester',
      asking_price: 450000,
      business_details: {
        practice_name: 'Smile Dental Care',
        practice_type: 'Dental Practice',
        nhs_contract: false,
        patient_list_size: 2800,
        staff_count: 6,
        premises_type: 'owned',
        cqc_registered: true,
        annual_revenue: 320000,
        net_profit: 125000,
      },
      seller_id: 'seller2',
      status: 'active',
      created_at: '2024-01-10T14:20:00Z',
      updated_at: '2024-01-10T14:20:00Z',
    },
  ];

  const displayListings = listings.length > 0 ? listings : mockListings;

  const renderListingCard = (listing: Listing, index: number) => (
    <Grid xs={12} sm={6} md={4} key={listing.id}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: index * 0.1 }}
      >
        <Card 
          sx={{ 
            height: '100%', 
            display: 'flex', 
            flexDirection: 'column',
            cursor: 'pointer',
            '&:hover': {
              transform: 'translateY(-4px)',
              boxShadow: 4,
            },
            transition: 'all 0.3s ease-in-out',
          }}
          onClick={() => navigate(`${ROUTES.LISTINGS}/${listing.id}`)}
        >
          <CardMedia
            component="div"
            sx={{
              height: 200,
              background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Business sx={{ fontSize: 60, color: 'white', opacity: 0.8 }} />
          </CardMedia>
          
          <CardContent sx={{ flexGrow: 1 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, mb: 1 }}>
              {listing.title}
            </Typography>
            
            <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
              <Chip
                label={BUSINESS_TYPE_LABELS[listing.business_type]}
                color="primary"
                size="small"
              />
              <Chip
                icon={<LocationOn sx={{ fontSize: 16 }} />}
                label={listing.location}
                variant="outlined"
                size="small"
              />
            </Stack>
            
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: '-webkit-box',
                WebkitLineClamp: 3,
                WebkitBoxOrient: 'vertical',
                mb: 2,
              }}
            >
              {listing.description}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <AttachMoney sx={{ fontSize: 20, color: 'success.main', mr: 0.5 }} />
              <Typography variant="h6" sx={{ fontWeight: 700, color: 'success.main' }}>
                {listing.asking_price 
                  ? `£${listing.asking_price.toLocaleString()}` 
                  : (listing.price_range || 'Price on request')
                }
              </Typography>
            </Box>
            
            <Stack direction="row" spacing={2} sx={{ fontSize: '0.875rem', color: 'text.secondary' }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Business sx={{ fontSize: 16, mr: 0.5 }} />
                {listing.business_details.practice_type}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                {listing.business_details.patient_list_size} patients
              </Box>
            </Stack>
          </CardContent>
          
          <CardActions sx={{ p: 2, pt: 0 }}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<Visibility />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`${ROUTES.LISTINGS}/${listing.id}`);
              }}
            >
              View Details
            </Button>
          </CardActions>
        </Card>
      </motion.div>
    </Grid>
  );

  const renderSkeletonCard = (index: number) => (
    <Grid xs={12} sm={6} md={4} key={`skeleton-${index}`}>
      <Card sx={{ height: '100%' }}>
        <Skeleton variant="rectangular" height={200} />
        <CardContent>
          <Skeleton variant="text" height={32} sx={{ mb: 1 }} />
          <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
            <Skeleton variant="rectangular" width={80} height={24} sx={{ borderRadius: 12 }} />
            <Skeleton variant="rectangular" width={100} height={24} sx={{ borderRadius: 12 }} />
          </Stack>
          <Skeleton variant="text" height={20} />
          <Skeleton variant="text" height={20} />
          <Skeleton variant="text" height={20} sx={{ mb: 2 }} />
          <Skeleton variant="text" height={28} width={120} sx={{ mb: 1 }} />
          <Stack direction="row" spacing={2}>
            <Skeleton variant="text" width={80} height={20} />
            <Skeleton variant="text" width={100} height={20} />
          </Stack>
        </CardContent>
        <CardActions sx={{ p: 2, pt: 0 }}>
          <Skeleton variant="rectangular" width="100%" height={36} />
        </CardActions>
      </Card>
    </Grid>
  );

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" sx={{ fontWeight: 700, mb: 2 }}>
          Medical Business Listings
        </Typography>
        <Typography variant="h6" color="text.secondary">
          Discover and connect with medical practices for sale or investment
        </Typography>
      </Box>

      {/* Search and Filters */}
      <Paper sx={{ p: 3, mb: 4 }}>
        <Grid container spacing={3} alignItems="center">
          {/* Search */}
          <Grid xs={12} md={4}>
            <TextField
              fullWidth
              placeholder="Search listings..."
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
          
          {/* Business Type Filter */}
          <Grid xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Business Type</InputLabel>
              <Select
                value={businessType}
                label="Business Type"
                onChange={(e) => setBusinessType(e.target.value)}
              >
                <MenuItem value="full_sale">Full Sale</MenuItem>
                <MenuItem value="partial_sale">Partial Sale</MenuItem>
                <MenuItem value="fundraising">Fundraising</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Location Filter */}
          <Grid xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Location</InputLabel>
              <Select
                value={location}
                label="Location"
                onChange={(e) => setLocation(e.target.value)}
              >
                <MenuItem value="">All Locations</MenuItem>
                <MenuItem value="London">London</MenuItem>
                <MenuItem value="Manchester">Manchester</MenuItem>
                <MenuItem value="Birmingham">Birmingham</MenuItem>
                <MenuItem value="Leeds">Leeds</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Price Range Filter */}
          <Grid xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Price Range</InputLabel>
              <Select
                value={priceRange}
                label="Price Range"
                onChange={(e) => setPriceRange(e.target.value)}
              >
                <MenuItem value="">All Prices</MenuItem>
                <MenuItem value="low">Under £100k</MenuItem>
                <MenuItem value="medium">£100k - £500k</MenuItem>
                <MenuItem value="high">£500k+</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Sort Filter */}
          <Grid xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => setSortBy(e.target.value)}
              >
                <MenuItem value="created_at">Newest First</MenuItem>
                <MenuItem value="asking_price">Price: Low to High</MenuItem>
                <MenuItem value="-asking_price">Price: High to Low</MenuItem>
                <MenuItem value="location">Location</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          
          {/* Search Button */}
          <Grid xs={12} md={12}>
            <Button
              variant="contained"
              size="large"
              startIcon={<FilterList />}
              onClick={handleSearch}
              sx={{ minWidth: 140 }}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Results Summary */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isLoading ? 'Loading...' : `${displayListings.length} listings found`}
        </Typography>
      </Box>

      {/* Listings Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => renderSkeletonCard(index))
          : displayListings.map((listing, index) => renderListingCard(listing, index))
        }
      </Grid>

      {/* No Results */}
      {!isLoading && displayListings.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Business sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            No listings found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Try adjusting your search criteria or check back later for new listings.
          </Typography>
          <Button variant="contained" onClick={() => window.location.reload()}>
            Reset Filters
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {!isLoading && displayListings.length > 0 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={pagination?.total_pages || 1}
            page={pagination?.current_page || 1}
            onChange={handlePageChange}
            color="primary"
            size="large"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Container>
  );
};

export default ListingsPage;
