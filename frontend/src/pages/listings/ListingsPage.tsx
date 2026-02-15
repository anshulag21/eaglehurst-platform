import React, { useState, useEffect, useCallback, useRef } from 'react';
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
  Skeleton,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Drawer,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Slider,
  FormControlLabel,
  Checkbox,
  RadioGroup,
  Radio,
  IconButton,
  Badge} from '@mui/material';
import {
  Search,
  FilterList,
  LocationOn,
  Business,
  AttachMoney,
  Visibility,
  TrendingUp,
  Message,
  Schedule,
  Cancel,
  Chat,
  ExpandMore,
  Clear,
  Tune,
  Close,
  People,
  LocalHospital,
  Business as BusinessIcon,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

import { useAppDispatch, useAppSelector } from '../../store';
import { fetchListings, setFilters } from '../../store/slices/listingSlice';
import { connectionService } from '../../services/connection.service';
import { ROUTES, BUSINESS_TYPE_LABELS, getImageUrl } from '../../constants';
import type { Listing, ListingFilters } from '../../types';
import toast from 'react-hot-toast';

// Filter data constants
const UK_REGIONS = [
  'London', 'South East', 'South West', 'East of England', 'East Midlands', 
  'West Midlands', 'Yorkshire and Humber', 'North West', 'North East', 
  'Scotland', 'Wales', 'Northern Ireland'
];

const UK_CITIES = [
  'London', 'Birmingham', 'Manchester', 'Leeds', 'Liverpool', 'Sheffield', 
  'Bristol', 'Glasgow', 'Leicester', 'Edinburgh', 'Coventry', 'Bradford', 
  'Cardiff', 'Belfast', 'Nottingham', 'Kingston upon Hull', 'Newcastle', 
  'Stoke-on-Trent', 'Southampton', 'Derby', 'Portsmouth', 'Brighton', 
  'Plymouth', 'Northampton', 'Reading', 'Luton', 'Wolverhampton'
];

const PRACTICE_TYPES = [
  'GP Practice', 'Dental Practice', 'Veterinary Practice', 'Pharmacy', 
  'Optometry Practice', 'Physiotherapy Clinic', 'Mental Health Clinic', 
  'Dermatology Clinic', 'Cardiology Clinic', 'Orthopedic Clinic',
  'Pediatric Practice', 'Gynecology Clinic', 'Urgent Care Center'
];

const PREMISES_TYPES = ['Owned', 'Leased', 'Mixed'];

const ListingsPage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { listings, pagination, filters, isLoading } = useAppSelector((state) => state.listings);
  const { user } = useAppSelector((state) => state.auth);

  // Redirect sellers - they shouldn't browse other sellers' listings
  useEffect(() => {
    if (user?.user_type === 'seller') {
      navigate(ROUTES.MY_LISTINGS);
      return;
    }
  }, [user, navigate]);

  // Search and basic filters
  const [searchQuery, setSearchQuery] = useState('');
  const [businessType, setBusinessType] = useState<string>('');
  const [sortBy, setSortBy] = useState('created_at');
  
  // Advanced filters
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 2000000]);
  const [revenueRange, setRevenueRange] = useState<[number, number]>([0, 1000000]);
  const [patientListRange, setPatientListRange] = useState<[number, number]>([0, 10000]);
  const [staffCountRange, setStaffCountRange] = useState<[number, number]>([1, 50]);
  
  // Location filters
  const [selectedRegions, setSelectedRegions] = useState<string[]>([]);
  const [selectedCities, setSelectedCities] = useState<string[]>([]);
  
  // Practice type filters
  const [selectedPracticeTypes, setSelectedPracticeTypes] = useState<string[]>([]);
  const [nhsContract, setNhsContract] = useState<string>(''); // 'yes', 'no', ''
  const [cqcRegistered, setCqcRegistered] = useState<string>(''); // 'yes', 'no', ''
  const [premisesType, setPremisesType] = useState<string[]>([]);
  
  // Business details filters
  const [listingAge, setListingAge] = useState<string>(''); // 'week', 'month', '3months', '6months', ''
  const [hasImages, setHasImages] = useState(false);
  const [verifiedSeller, setVerifiedSeller] = useState(false);
  
  // Active filters count
  const [activeFiltersCount, setActiveFiltersCount] = useState(0);
  
  // Connection dialog state
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingConnection, setSendingConnection] = useState(false);
  const [selectedListing, setSelectedListing] = useState<{ id: string; title: string } | null>(null);
  
  // Connection status tracking
  const [connectionStatuses, setConnectionStatuses] = useState<Record<string, unknown>>({});
  const [loadingStatuses, setLoadingStatuses] = useState<Record<string, boolean>>({});
  const loadedStatusesRef = useRef<Set<string>>(new Set());

  useEffect(() => {
    dispatch(fetchListings({ page: 1, limit: 12 }));
  }, [dispatch]);

  const loadConnectionStatuses = useCallback(async () => {
    if (!user || user.user_type !== 'buyer') return;

    const statusPromises = listings.map(async (listing) => {
      // Skip if already loaded or currently loading
      if (loadedStatusesRef.current.has(listing.id)) return;
      
      loadedStatusesRef.current.add(listing.id);
      setLoadingStatuses(prev => ({ ...prev, [listing.id]: true }));
      
      try {
        const response = await connectionService.getConnectionStatus(listing.id);
        if (response.success && response.data) {
          setConnectionStatuses(prev => ({ 
            ...prev, 
          [listing.id]: response.data as Record<string, unknown>
          }));
        }
      } catch (error) {
        console.error(`Error loading connection status for listing ${listing.id}:`, error);
      } finally {
        setLoadingStatuses(prev => ({ ...prev, [listing.id]: false }));
      }
    });

    await Promise.all(statusPromises);
  }, [user, listings]);

  // Load connection statuses for buyer users
  useEffect(() => {
    if (user?.user_type === 'buyer' && listings.length > 0) {
      // Clear loaded statuses when listings change
      loadedStatusesRef.current.clear();
      loadConnectionStatuses();
    }
  }, [user, listings, loadConnectionStatuses]);

  // Calculate active filters count
  useEffect(() => {
    let count = 0;
    if (searchQuery) count++;
    if (businessType) count++;
    if (priceRange[0] > 0 || priceRange[1] < 2000000) count++;
    if (revenueRange[0] > 0 || revenueRange[1] < 1000000) count++;
    if (patientListRange[0] > 0 || patientListRange[1] < 10000) count++;
    if (staffCountRange[0] > 1 || staffCountRange[1] < 50) count++;
    if (selectedRegions.length > 0) count++;
    if (selectedCities.length > 0) count++;
    if (selectedPracticeTypes.length > 0) count++;
    if (nhsContract) count++;
    if (cqcRegistered) count++;
    if (premisesType.length > 0) count++;
    if (listingAge) count++;
    if (hasImages) count++;
    if (verifiedSeller) count++;
    setActiveFiltersCount(count);
  }, [
    searchQuery, businessType, priceRange, revenueRange, patientListRange, 
    staffCountRange, selectedRegions, selectedCities, selectedPracticeTypes, 
    nhsContract, cqcRegistered, premisesType, listingAge, hasImages, verifiedSeller
  ]);

  // Helper functions
  const formatPrice = (value: number) => {
    if (value >= 1000000) return `£${(value / 1000000).toFixed(1)}M`;
    if (value >= 1000) return `£${(value / 1000).toFixed(0)}K`;
    return `£${value.toLocaleString()}`;
  };

  const clearAllFilters = () => {
    setSearchQuery('');
    setBusinessType('');
    setPriceRange([0, 2000000]);
    setRevenueRange([0, 1000000]);
    setPatientListRange([0, 10000]);
    setStaffCountRange([1, 50]);
    setSelectedRegions([]);
    setSelectedCities([]);
    setSelectedPracticeTypes([]);
    setNhsContract('');
    setCqcRegistered('');
    setPremisesType([]);
    setListingAge('');
    setHasImages(false);
    setVerifiedSeller(false);
    setSortBy('created_at');
  };

  const handleCheckboxChange = (value: string, selectedValues: string[], setSelectedValues: (values: string[]) => void) => {
    if (selectedValues.includes(value)) {
      setSelectedValues(selectedValues.filter(v => v !== value));
    } else {
      setSelectedValues([...selectedValues, value]);
    }
  };

  const renderConnectionButton = (listing: Listing) => {
    if (!user || user.user_type !== 'buyer') {
      return null;
    }

    const connectionStatus = connectionStatuses[listing.id];
    const isLoading = loadingStatuses[listing.id];

    if (isLoading) {
      return (
        <Button
          variant="outlined"
          disabled
          sx={{ flex: 1 }}
        >
          Loading...
        </Button>
      );
    }

    if (!connectionStatus) {
      // Default connect button if status not loaded yet
      return (
        <Button
          variant="outlined"
          startIcon={<Message />}
          onClick={(e) => {
            e.stopPropagation();
            handleQuickConnect(listing.id, listing.title);
          }}
          sx={{ flex: 1 }}
        >
          Connect
        </Button>
      );
    }

    const status = connectionStatus as { has_connection?: boolean; status?: string; connection_id?: string };
    if (status.has_connection) {
      switch (status.status) {
        case 'pending':
          return (
            <Button
              variant="outlined"
              startIcon={<Schedule />}
              disabled
              sx={{ 
                flex: 1,
                color: 'warning.main',
                borderColor: 'warning.main'
              }}
            >
              Request Sent
            </Button>
          );
        
        case 'approved':
          return (
            <Button
              variant="contained"
              startIcon={<Chat />}
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/messages/${status.connection_id}`);
              }}
              sx={{ 
                flex: 1,
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' }
              }}
            >
              Message
            </Button>
          );
        
        case 'rejected':
          return (
            <Button
              variant="outlined"
              startIcon={<Cancel />}
              disabled
              sx={{ 
                flex: 1,
                color: 'error.main',
                borderColor: 'error.main'
              }}
            >
              Rejected
            </Button>
          );
        
        default:
          return null;
      }
    }

    // No connection exists
    if ((connectionStatus as { can_connect?: boolean }).can_connect) {
      return (
        <Button
          variant="outlined"
          startIcon={<Message />}
          onClick={(e) => {
            e.stopPropagation();
            handleQuickConnect(listing.id, listing.title);
          }}
          sx={{ flex: 1 }}
        >
          Connect
        </Button>
      );
    } else {
      // Can't connect - show reason
      return (
        <Button
          variant="outlined"
          disabled
          sx={{ flex: 1 }}
          title={(connectionStatus as { reason?: string }).reason || 'Cannot connect'}
        >
          {(connectionStatus as { reason?: string }).reason === 'Connection limit reached' ? 'Limit Reached' : 'Cannot Connect'}
        </Button>
      );
    }
  };

  const handleSearch = () => {
    const newFilters: ListingFilters & Record<string, unknown> = {
      business_type: businessType ? (businessType as 'full_sale' | 'partial_sale' | 'fundraising') : undefined,
      location: selectedCities.length > 0 ? selectedCities.join(',') : undefined,
      min_price: priceRange[0] > 0 ? priceRange[0] : undefined,
      max_price: priceRange[1] < 2000000 ? priceRange[1] : undefined,
      sort_by: sortBy as 'price' | 'created_at' | 'updated_at',
      page: 1,
      limit: 12,
      // Additional filters (these would need backend support)
      search: searchQuery || undefined,
      regions: selectedRegions.length > 0 ? selectedRegions.join(',') : undefined,
      practice_types: selectedPracticeTypes.length > 0 ? selectedPracticeTypes.join(',') : undefined,
      nhs_contract: nhsContract || undefined,
      cqc_registered: cqcRegistered || undefined,
      premises_type: premisesType.length > 0 ? premisesType.join(',') : undefined,
      min_revenue: revenueRange[0] > 0 ? revenueRange[0] : undefined,
      max_revenue: revenueRange[1] < 1000000 ? revenueRange[1] : undefined,
      min_patients: patientListRange[0] > 0 ? patientListRange[0] : undefined,
      max_patients: patientListRange[1] < 10000 ? patientListRange[1] : undefined,
      min_staff: staffCountRange[0] > 1 ? staffCountRange[0] : undefined,
      max_staff: staffCountRange[1] < 50 ? staffCountRange[1] : undefined,
      listing_age: listingAge || undefined,
      has_images: hasImages || undefined,
      verified_seller: verifiedSeller || undefined,
    };
    dispatch(setFilters(newFilters));
    dispatch(fetchListings(newFilters));
  };

  const handlePageChange = (_: React.ChangeEvent<unknown>, value: number) => {
    const newFilters = { ...filters, page: value, limit: 12 };
    dispatch(fetchListings(newFilters));
  };

  const handleQuickConnect = (listingId: string, listingTitle: string) => {
    if (!user) {
      toast.error('Please log in to send connection requests');
      return;
    }

    if (user.user_type !== 'buyer') {
      toast.error('Only buyers can send connection requests');
      return;
    }

    // Set selected listing and prefill message
    setSelectedListing({ id: listingId, title: listingTitle });
    setConnectionMessage(`Hi, I'm interested in your listing "${listingTitle}". I'd like to learn more about this opportunity.`);
    setConnectionDialogOpen(true);
  };

  const handleConnectionRequest = async () => {
    if (!selectedListing || !user) return;

    try {
      setSendingConnection(true);
      
      const response = await connectionService.createConnectionRequest({
        listing_id: selectedListing.id,
        initial_message: connectionMessage.trim() || '',
      });

      if (response.success) {
        toast.success('Connection request sent successfully!');
        setConnectionDialogOpen(false);
        setConnectionMessage('');
        
        // Immediately update connection status to pending
        if (selectedListing) {
          setConnectionStatuses(prev => ({ 
            ...prev, 
            [selectedListing.id]: {
              has_connection: true,
              status: 'pending',
              connection_id: response.data?.id || null,
              can_connect: false,
              reason: 'Connection request pending',
              requested_at: new Date().toISOString(),
              responded_at: undefined,
              initial_message: connectionMessage,
              response_message: undefined
            }
          }));
          
          // Also refresh from server to ensure consistency (but don't wait for it)
          connectionService.getConnectionStatus(selectedListing.id).then(statusResponse => {
            if (statusResponse.success && statusResponse.data) {
              setConnectionStatuses(prev => ({ 
                ...prev, 
            [selectedListing.id]: statusResponse.data as Record<string, unknown>
              }));
            }
          }).catch(error => {
            console.error('Error refreshing connection status:', error);
          });
        }
        
        setSelectedListing(null);
      } else {
        toast.error(response.error?.message || 'Failed to send connection request');
      }
    } catch (error: unknown) {
      console.error('Error sending connection request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send connection request';
      toast.error(errorMessage);
    } finally {
      setSendingConnection(false);
    }
  };


  const displayListings = listings || [];

  const renderListingCard = (listing: Listing, index: number) => (
    <Grid item xs={12} sm={6} md={4} key={listing.id}>
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
              backgroundColor: 'grey.200',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {listing.primary_image || (listing.media_files && listing.media_files.length > 0) ? (
              <Box
                component="img"
                src={getImageUrl(listing.primary_image || listing.media_files[0].file_url)}
                alt={listing.title}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : listing.images && listing.images.length > 0 ? (
              <Box
                component="img"
                src={getImageUrl(listing.images[0])}
                alt={listing.title}
                sx={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
              />
            ) : (
              <Box
                sx={{
                  width: '100%',
                  height: '100%',
                  background: 'linear-gradient(45deg, #2196F3 30%, #21CBF3 90%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Business sx={{ fontSize: 60, color: 'white', opacity: 0.8 }} />
              </Box>
            )}
            
            {/* Image count badge */}
            {((listing.media_files && listing.media_files.length > 1) || (listing.images && listing.images.length > 1)) && (
              <Chip
                label={`${listing.media_files?.length || listing.images?.length || 0} photos`}
                size="small"
                sx={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  fontSize: '0.75rem',
                }}
              />
            )}
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
                {listing.business_details?.practice_type}
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <TrendingUp sx={{ fontSize: 16, mr: 0.5 }} />
                {listing.business_details?.patient_list_size} patients
              </Box>
            </Stack>
          </CardContent>
          
          <CardActions sx={{ p: 2, pt: 0 }}>
            <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
              <Button
                variant="outlined"
                startIcon={<Visibility />}
                onClick={(e) => {
                  e.stopPropagation();
                  navigate(`${ROUTES.LISTINGS}/${listing.id}`);
                }}
                sx={{ flex: 1 }}
              >
                View Details
              </Button>
              {renderConnectionButton(listing)}
            </Stack>
          </CardActions>
        </Card>
      </motion.div>
    </Grid>
  );

  const renderSkeletonCard = (index: number) => (
    <Grid item xs={12} sm={6} md={4} key={`skeleton-${index}`}>
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

  // Render filter sidebar
  const renderFilterSidebar = () => (
    <Box sx={{ 
      width: 320, 
      p: 3, 
      height: 'fit-content', 
      maxHeight: 'calc(100vh - 48px)',
      overflowY: 'auto',
      position: 'sticky', 
      top: 24 
    }}>
      {/* Filter Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Tune sx={{ mr: 1, color: 'primary.main' }} />
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filters
        </Typography>
          {activeFiltersCount > 0 && (
            <Badge badgeContent={activeFiltersCount} color="primary" sx={{ ml: 1 }}>
              <Box />
            </Badge>
          )}
        </Box>
        {activeFiltersCount > 0 && (
          <Button
            size="small"
            startIcon={<Clear />}
            onClick={clearAllFilters}
            sx={{ minWidth: 'auto' }}
          >
            Clear All
          </Button>
        )}
      </Box>

          {/* Search */}
      <Box sx={{ mb: 3 }}>
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
      </Box>

      {/* Business Type */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <BusinessIcon sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Business Type
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <RadioGroup
                value={businessType}
                onChange={(e) => setBusinessType(e.target.value)}
              >
            <FormControlLabel value="" control={<Radio />} label="All Types" />
            <FormControlLabel value="full_sale" control={<Radio />} label="Full Business Sale" />
            <FormControlLabel value="partial_sale" control={<Radio />} label="Partial Business Sale" />
            <FormControlLabel value="fundraising" control={<Radio />} label="Fundraising" />
          </RadioGroup>
        </AccordionDetails>
      </Accordion>

      {/* Price Range */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <AttachMoney sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Price Range
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {formatPrice(priceRange[0])} - {formatPrice(priceRange[1])}
            </Typography>
            <Slider
              value={priceRange}
              onChange={(_, newValue) => setPriceRange(newValue as [number, number])}
              valueLabelDisplay="auto"
              valueLabelFormat={formatPrice}
              min={0}
              max={2000000}
              step={50000}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Revenue Range */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <TrendingUp sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Annual Revenue
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {formatPrice(revenueRange[0])} - {formatPrice(revenueRange[1])}
            </Typography>
            <Slider
              value={revenueRange}
              onChange={(_, newValue) => setRevenueRange(newValue as [number, number])}
              valueLabelDisplay="auto"
              valueLabelFormat={formatPrice}
              min={0}
              max={1000000}
              step={25000}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Location Filters */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocationOn sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Location
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Regions</Typography>
          <Box sx={{ maxHeight: 150, overflowY: 'auto', mb: 2 }}>
            {UK_REGIONS.map((region) => (
              <FormControlLabel
                key={region}
                control={
                  <Checkbox
                    checked={selectedRegions.includes(region)}
                    onChange={() => handleCheckboxChange(region, selectedRegions, setSelectedRegions)}
                    size="small"
                  />
                }
                label={region}
                sx={{ display: 'block', '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            ))}
          </Box>
          
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Cities</Typography>
          <Box sx={{ maxHeight: 150, overflowY: 'auto' }}>
            {UK_CITIES.map((city) => (
              <FormControlLabel
                key={city}
                control={
                  <Checkbox
                    checked={selectedCities.includes(city)}
                    onChange={() => handleCheckboxChange(city, selectedCities, setSelectedCities)}
                    size="small"
                  />
                }
                label={city}
                sx={{ display: 'block', '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            ))}
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Practice Details */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <LocalHospital sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Practice Details
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Practice Type</Typography>
          <Box sx={{ maxHeight: 120, overflowY: 'auto', mb: 2 }}>
            {PRACTICE_TYPES.map((type) => (
              <FormControlLabel
                key={type}
                control={
                  <Checkbox
                    checked={selectedPracticeTypes.includes(type)}
                    onChange={() => handleCheckboxChange(type, selectedPracticeTypes, setSelectedPracticeTypes)}
                    size="small"
                  />
                }
                label={type}
                sx={{ display: 'block', '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
              />
            ))}
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>NHS Contract</Typography>
          <RadioGroup
            value={nhsContract}
            onChange={(e) => setNhsContract(e.target.value)}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="" control={<Radio size="small" />} label="Any" />
            <FormControlLabel value="yes" control={<Radio size="small" />} label="Has NHS Contract" />
            <FormControlLabel value="no" control={<Radio size="small" />} label="Private Only" />
          </RadioGroup>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>CQC Registered</Typography>
          <RadioGroup
            value={cqcRegistered}
            onChange={(e) => setCqcRegistered(e.target.value)}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="" control={<Radio size="small" />} label="Any" />
            <FormControlLabel value="yes" control={<Radio size="small" />} label="CQC Registered" />
            <FormControlLabel value="no" control={<Radio size="small" />} label="Not Required" />
          </RadioGroup>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Premises</Typography>
          {PREMISES_TYPES.map((type) => (
            <FormControlLabel
              key={type}
              control={
                <Checkbox
                  checked={premisesType.includes(type)}
                  onChange={() => handleCheckboxChange(type, premisesType, setPremisesType)}
                  size="small"
                />
              }
              label={type}
              sx={{ display: 'block', '& .MuiFormControlLabel-label': { fontSize: '0.875rem' } }}
            />
          ))}
        </AccordionDetails>
      </Accordion>

      {/* Size Metrics */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <People sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Practice Size
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Patient List Size</Typography>
          <Box sx={{ px: 1, mb: 3 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {patientListRange[0].toLocaleString()} - {patientListRange[1].toLocaleString()} patients
            </Typography>
            <Slider
              value={patientListRange}
              onChange={(_, newValue) => setPatientListRange(newValue as [number, number])}
              valueLabelDisplay="auto"
              min={0}
              max={10000}
              step={500}
            />
          </Box>

          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Staff Count</Typography>
          <Box sx={{ px: 1 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {staffCountRange[0]} - {staffCountRange[1]} staff members
            </Typography>
            <Slider
              value={staffCountRange}
              onChange={(_, newValue) => setStaffCountRange(newValue as [number, number])}
              valueLabelDisplay="auto"
              min={1}
              max={50}
              step={1}
            />
          </Box>
        </AccordionDetails>
      </Accordion>

      {/* Additional Filters */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMore />}>
          <Box sx={{ display: 'flex', alignItems: 'center' }}>
            <FilterList sx={{ mr: 1, fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
              Additional Filters
            </Typography>
          </Box>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ fontWeight: 600, mb: 1 }}>Listing Age</Typography>
          <RadioGroup
            value={listingAge}
            onChange={(e) => setListingAge(e.target.value)}
            sx={{ mb: 2 }}
          >
            <FormControlLabel value="" control={<Radio size="small" />} label="Any time" />
            <FormControlLabel value="week" control={<Radio size="small" />} label="Past week" />
            <FormControlLabel value="month" control={<Radio size="small" />} label="Past month" />
            <FormControlLabel value="3months" control={<Radio size="small" />} label="Past 3 months" />
            <FormControlLabel value="6months" control={<Radio size="small" />} label="Past 6 months" />
          </RadioGroup>

          <FormControlLabel
            control={
              <Checkbox
                checked={hasImages}
                onChange={(e) => setHasImages(e.target.checked)}
              />
            }
            label="Has Images"
            sx={{ display: 'block', mb: 1 }}
          />

          <FormControlLabel
            control={
              <Checkbox
                checked={verifiedSeller}
                onChange={(e) => setVerifiedSeller(e.target.checked)}
              />
            }
            label="Verified Seller"
            sx={{ display: 'block' }}
          />
        </AccordionDetails>
      </Accordion>

      {/* Sort By */}
      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={sortBy}
                label="Sort By"
                onChange={(e) => {
              setSortBy(e.target.value);
              // Auto-apply sorting when changed
              setTimeout(() => handleSearch(), 100);
            }}
            MenuProps={{
              PaperProps: {
                style: {
                  maxHeight: 200,
                  width: 280,
                },
              },
            }}
              >
                <MenuItem value="created_at">Newest First</MenuItem>
                <MenuItem value="asking_price">Price: Low to High</MenuItem>
                <MenuItem value="-asking_price">Price: High to Low</MenuItem>
                <MenuItem value="location">Location</MenuItem>
            <MenuItem value="patient_list_size">Patient List Size</MenuItem>
            <MenuItem value="annual_revenue">Revenue</MenuItem>
              </Select>
            </FormControl>
      </Box>
          
      {/* Apply Filters Button */}
      <Box sx={{ mt: 3, mb: 2 }}>
            <Button
              variant="contained"
          fullWidth
              size="large"
          startIcon={<Search />}
              onClick={handleSearch}
            >
              Apply Filters
            </Button>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {/* Desktop Filter Sidebar */}
      <Box sx={{ display: { xs: 'none', lg: 'block' }, flexShrink: 0 }}>
        <Paper sx={{ height: '100vh', borderRadius: 0, borderRight: 1, borderColor: 'divider' }}>
          {renderFilterSidebar()}
      </Paper>
      </Box>

      {/* Mobile Filter Drawer */}
      <Drawer
        anchor="left"
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        sx={{ 
          display: { xs: 'block', lg: 'none' },
          '& .MuiDrawer-paper': {
            width: 320,
            maxWidth: '90vw'
          }
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Typography variant="h6" sx={{ fontWeight: 600 }}>
            Filters
          </Typography>
          <IconButton onClick={() => setMobileFiltersOpen(false)}>
            <Close />
          </IconButton>
        </Box>
        <Box sx={{ height: 'calc(100vh - 64px)', overflowY: 'auto' }}>
          {renderFilterSidebar()}
        </Box>
      </Drawer>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'hidden' }}>
        <Container maxWidth="xl" sx={{ py: 4 }}>
          {/* Header */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
            <Box>
              <Typography variant="h3" sx={{ fontWeight: 700, mb: 1 }}>
                Medical Business Listings
              </Typography>
              <Typography variant="h6" color="text.secondary">
                Discover and connect with medical practices for sale or investment
              </Typography>
            </Box>
            
            {/* Mobile Filter Button */}
            <Button
              variant="outlined"
              startIcon={<Tune />}
              onClick={() => setMobileFiltersOpen(true)}
              sx={{ display: { xs: 'flex', lg: 'none' } }}
            >
              Filters
              {activeFiltersCount > 0 && (
                <Badge badgeContent={activeFiltersCount} color="primary" sx={{ ml: 1 }}>
                  <Box />
                </Badge>
              )}
            </Button>
          </Box>

          {/* Active Filters Display */}
          {activeFiltersCount > 0 && (
            <Paper sx={{ p: 2, mb: 3, bgcolor: 'primary.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>
                  {activeFiltersCount} filter{activeFiltersCount > 1 ? 's' : ''} applied
                </Typography>
                <Button
                  size="small"
                  startIcon={<Clear />}
                  onClick={clearAllFilters}
                >
                  Clear All
                </Button>
              </Box>
      </Paper>
          )}

      {/* Results Summary */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>
          {isLoading ? 'Loading...' : `${displayListings?.length || 0} listings found`}
        </Typography>
      </Box>

      {/* Listings Grid */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {isLoading
          ? Array.from({ length: 6 }).map((_, index) => renderSkeletonCard(index))
          : (displayListings || []).map((listing, index) => renderListingCard(listing, index))
        }
      </Grid>

      {/* No Results */}
      {!isLoading && (!displayListings || displayListings.length === 0) && (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Business sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
          <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
            No listings found
          </Typography>
          <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
            Try adjusting your search criteria or check back later for new listings.
          </Typography>
              <Button variant="contained" onClick={clearAllFilters}>
                Clear All Filters
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {!isLoading && displayListings && displayListings.length > 0 && (
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
      </Box>

      {/* Connection Request Dialog */}
      <Dialog 
        open={connectionDialogOpen} 
        onClose={() => {
          setConnectionDialogOpen(false);
          setConnectionMessage('');
          setSelectedListing(null);
        }} 
        maxWidth="sm" 
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Message color="primary" />
            Connect with Seller
          </Box>
        </DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Send a connection request to the seller of "{selectedListing?.title}". 
            You can edit the message below before sending.
          </Typography>
          <TextField
            fullWidth
            label="Message"
            multiline
            rows={4}
            placeholder="Hi, I'm interested in your listing and would like to learn more about the business..."
            value={connectionMessage}
            onChange={(e) => setConnectionMessage(e.target.value)}
            helperText="This message will be sent to the seller along with your connection request."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => {
              setConnectionDialogOpen(false);
              setConnectionMessage('');
              setSelectedListing(null);
            }}
            disabled={sendingConnection}
          >
            Cancel
          </Button>
          <Button 
            onClick={handleConnectionRequest} 
            variant="contained"
            disabled={sendingConnection}
            startIcon={sendingConnection ? undefined : <Message />}
          >
            {sendingConnection ? 'Sending...' : 'Send Request'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ListingsPage;
