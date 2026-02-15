import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Box,
  Grid,
  Card,
  CardContent,
  Button,
  Chip,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Paper,
  Stack,
  IconButton,
  Tooltip,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Search,
  Visibility,
  Assessment,
  Business,
  LocationOn,
  AttachMoney,
  CalendarToday,
  Refresh,
  Sort,
  FilterList,
  TrendingUp,
  Message,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { adminService } from '../../services/admin.service';
import { ROUTES } from '../../constants';

interface AdminListing {
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
    user?: {
      name: string;
      email: string;
    };
  } | null;
}

interface PaginationData {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

const AdminAllListingsPage: React.FC = () => {
  const navigate = useNavigate();
  
  // State
  const [listings, setListings] = useState<AdminListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState<PaginationData>({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
  });
  
  // Filters and search
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all');
  const [sortBy, setSortBy] = useState('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Load listings
  const loadListings = useCallback(async () => {
    try {
      setLoading(true);
      
      const response = await adminService.getAllListings(
        pagination.page,
        pagination.limit,
        statusFilter === 'all' ? undefined : statusFilter,
        businessTypeFilter === 'all' ? undefined : businessTypeFilter,
        searchQuery || undefined,
        sortBy,
        sortOrder
      );
      
      if (response.success && response.data) {
        setListings(response.data.listings || []);
        setPagination(response.data.pagination || pagination);
      } else {
        toast.error('Failed to load listings');
      }
    } catch (error) {
      console.error('Error loading listings:', error);
      toast.error('Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit, statusFilter, businessTypeFilter, searchQuery, sortBy, sortOrder]);

  useEffect(() => {
    loadListings();
  }, [loadListings]);

  // Handlers
  const handlePageChange = (_event: unknown, newPage: number) => {
    setPagination(prev => ({ ...prev, page: newPage + 1 }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const newLimit = parseInt(event.target.value, 10);
    setPagination(prev => ({ ...prev, limit: newLimit, page: 1 }));
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleStatusFilterChange = (event: any) => {
    setStatusFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleBusinessTypeFilterChange = (event: any) => {
    setBusinessTypeFilter(event.target.value);
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleSortChange = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handleViewListing = (listingId: string) => {
    navigate(ROUTES.ADMIN_LISTING_DETAIL.replace(':listingId', listingId));
  };

  const handleViewAnalytics = (listingId: string) => {
    navigate(ROUTES.ADMIN_LISTING_ANALYTICS.replace(':listingId', listingId));
  };

  const handleViewConversations = (listingId: string) => {
    navigate(ROUTES.ADMIN_LISTING_CONVERSATIONS.replace(':listingId', listingId));
  };

  // Utility functions
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

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            All Listings Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            View and manage all listings across the platform with comprehensive filtering and sorting options
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Business sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {pagination.total}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Listings
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <TrendingUp sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {listings.filter(l => l.status === 'published').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Published
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Assessment sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {listings.filter(l => l.status === 'pending_approval').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Review
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Message sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {listings.filter(l => l.status === 'draft').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Drafts
                    </Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField
                placeholder="Search listings..."
                value={searchQuery}
                onChange={handleSearchChange}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search />
                    </InputAdornment>
                  ),
                }}
                sx={{ minWidth: 300 }}
              />
              
              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Status</InputLabel>
                <Select
                  value={statusFilter}
                  onChange={handleStatusFilterChange}
                  label="Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="published">Published</MenuItem>
                  <MenuItem value="pending_approval">Pending</MenuItem>
                  <MenuItem value="draft">Draft</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Business Type</InputLabel>
                <Select
                  value={businessTypeFilter}
                  onChange={handleBusinessTypeFilterChange}
                  label="Business Type"
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="full_sale">Full Sale</MenuItem>
                  <MenuItem value="partial_sale">Partial Sale</MenuItem>
                  <MenuItem value="fundraising">Fundraising</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadListings}
                sx={{ minWidth: 120 }}
              >
                Refresh
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Listings Table */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : listings.length === 0 ? (
              <Box sx={{ p: 4, textAlign: 'center' }}>
                <Alert severity="info">
                  No listings found matching your criteria.
                </Alert>
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>
                          <Button
                            variant="text"
                            onClick={() => handleSortChange('title')}
                            endIcon={sortBy === 'title' ? <Sort /> : null}
                            sx={{ fontWeight: 'bold' }}
                          >
                            Listing
                          </Button>
                        </TableCell>
                        <TableCell>Business Type</TableCell>
                        <TableCell>Seller</TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            onClick={() => handleSortChange('asking_price')}
                            endIcon={sortBy === 'asking_price' ? <Sort /> : null}
                            sx={{ fontWeight: 'bold' }}
                          >
                            Price
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            onClick={() => handleSortChange('status')}
                            endIcon={sortBy === 'status' ? <Sort /> : null}
                            sx={{ fontWeight: 'bold' }}
                          >
                            Status
                          </Button>
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="text"
                            onClick={() => handleSortChange('created_at')}
                            endIcon={sortBy === 'created_at' ? <Sort /> : null}
                            sx={{ fontWeight: 'bold' }}
                          >
                            Created
                          </Button>
                        </TableCell>
                        <TableCell align="center">Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {listings.map((listing) => (
                        <TableRow key={listing.id} hover>
                          <TableCell>
                            <Box>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {listing.title}
                              </Typography>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                                <LocationOn fontSize="small" color="action" />
                                <Typography variant="body2" color="text.secondary">
                                  {listing.location}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Chip
                              label={getBusinessTypeLabel(listing.business_type)}
                              size="small"
                              variant="outlined"
                            />
                          </TableCell>
                          
                          <TableCell>
                            {listing.seller ? (
                              <Box>
                                <Typography variant="body2" sx={{ fontWeight: 500 }}>
                                  {listing.seller.business_name || 'Unknown Business'}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  {listing.seller.user?.name || 'Unknown Contact'}
                                </Typography>
                              </Box>
                            ) : (
                              <Typography variant="body2" color="text.secondary">
                                No seller
                              </Typography>
                            )}
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <AttachMoney fontSize="small" color="action" />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatPrice(listing.asking_price)}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Chip
                              label={listing.status.replace('_', ' ').toUpperCase()}
                              color={getStatusColor(listing.status) as any}
                              size="small"
                            />
                          </TableCell>
                          
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday fontSize="small" color="action" />
                              <Typography variant="body2">
                                {formatDate(listing.created_at)}
                              </Typography>
                            </Box>
                          </TableCell>
                          
                          <TableCell align="center">
                            <Stack direction="row" spacing={1} justifyContent="center">
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewListing(listing.id)}
                                  color="primary"
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Analytics">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewAnalytics(listing.id)}
                                  color="info"
                                >
                                  <Assessment fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Conversations">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewConversations(listing.id)}
                                  color="secondary"
                                >
                                  <Message fontSize="small" />
                                </IconButton>
                              </Tooltip>
                            </Stack>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>

                <TablePagination
                  rowsPerPageOptions={[10, 20, 50, 100]}
                  component="div"
                  count={pagination.total}
                  rowsPerPage={pagination.limit}
                  page={pagination.page - 1}
                  onPageChange={handlePageChange}
                  onRowsPerPageChange={handleRowsPerPageChange}
                />
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default AdminAllListingsPage;
