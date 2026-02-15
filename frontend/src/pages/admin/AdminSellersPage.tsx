import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  Chip,
  Button,
  Stack,
  Avatar,
  TextField,
  InputAdornment,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  CircularProgress,
  Grid,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Search,
  Visibility,
  Business,
  Refresh,
  Email,
  Phone,
  CalendarToday,
  TrendingUp,
  Assessment,
  CheckCircle,
  Schedule,
  Cancel,
  Block,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { adminService } from '../../services/admin.service';

interface Seller {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  seller_info: {
    business_name: string;
    business_description?: string;
    business_address?: string;
    verification_status: 'pending' | 'submitted_for_review' | 'approved' | 'rejected';
    listings_count: number;
    listings_under_review?: number;
    last_listing_posted?: string;
    total_connections?: number;
    active_connections?: number;
  };
}

const AdminSellersPage: React.FC = () => {
  const navigate = useNavigate();
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalSellers, setTotalSellers] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');

  // Load sellers from API
  const loadSellers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers(
        page + 1,
        rowsPerPage,
        'seller', // Only sellers
        filterVerification === 'all' ? undefined : filterVerification,
        searchQuery || undefined
      );

      if (response.success && response.data) {
        // Filter and transform the data to match our Seller interface
        const sellersData = response.data.users.map((user: any) => ({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          created_at: user.created_at,
          is_active: user.is_active,
          is_verified: user.is_verified,
          last_login: user.last_login,
          seller_info: {
            business_name: user.seller_info?.business_name || 'N/A',
            business_description: user.seller_info?.business_description,
            business_address: user.seller_info?.business_address,
            verification_status: user.seller_info?.verification_status || 'pending',
            listings_count: user.seller_info?.listings_count || 0,
            listings_under_review: user.seller_info?.listings_under_review || 0,
            last_listing_posted: user.seller_info?.last_listing_posted,
            total_connections: user.seller_info?.total_connections || 0,
            active_connections: user.seller_info?.active_connections || 0,
          }
        }));

        setSellers(sellersData);
        setTotalSellers(response.data.pagination?.total || sellersData.length);
      }
    } catch (error) {
      console.error('Error loading sellers:', error);
      toast.error('Failed to load sellers');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, filterVerification]);

  useEffect(() => {
    loadSellers();
  }, [loadSellers]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(event.target.value);
    setPage(0);
  };

  const handleFilterStatusChange = (event: any) => {
    setFilterStatus(event.target.value);
    setPage(0);
  };

  const handleFilterVerificationChange = (event: any) => {
    setFilterVerification(event.target.value);
    setPage(0);
  };

  const handleViewSeller = (sellerId: string) => {
    navigate(`/admin/sellers/${sellerId}`);
  };

  const handleViewAnalytics = (sellerId: string) => {
    // Navigate to seller analytics page or show analytics modal
    navigate(`/admin/sellers/${sellerId}?tab=analytics`);
  };

  const handleBlockUser = async (sellerId: string, isActive: boolean) => {
    try {
      const action = isActive ? 'block' : 'unblock';
      const response = await adminService.updateUserStatus(sellerId, !isActive, `User ${action}ed by admin`);
      
      if (response.success) {
        toast.success(`User ${action}ed successfully`);
        loadSellers(); // Reload the data
      } else {
        toast.error(`Failed to ${action} user`);
      }
    } catch (error) {
      console.error(`Error ${isActive ? 'blocking' : 'unblocking'} user:`, error);
      toast.error(`Failed to ${isActive ? 'block' : 'unblock'} user`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'submitted_for_review': return 'warning';
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle fontSize="small" />;
      case 'rejected': return <Cancel fontSize="small" />;
      case 'submitted_for_review': return <Schedule fontSize="small" />;
      case 'pending': return <Schedule fontSize="small" />;
      default: return <Schedule fontSize="small" />;
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  const formatDateTime = (dateString?: string) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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
            Sellers Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all sellers, their verification status, and business information
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
                      {totalSellers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Sellers
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
                  <CheckCircle sx={{ fontSize: 40, color: 'success.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {sellers.filter(s => s.seller_info.verification_status === 'approved').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Verified Sellers
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
                  <Schedule sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {sellers.filter(s => s.seller_info.verification_status === 'submitted_for_review').length}
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
                  <TrendingUp sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {sellers.reduce((sum, s) => sum + s.seller_info.listings_count, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Listings
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
                placeholder="Search sellers..."
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
              
              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Account Status</InputLabel>
                <Select
                  value={filterStatus}
                  onChange={handleFilterStatusChange}
                  label="Account Status"
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 200 }}>
                <InputLabel>Verification Status</InputLabel>
                <Select
                  value={filterVerification}
                  onChange={handleFilterVerificationChange}
                  label="Verification Status"
                >
                  <MenuItem value="all">All Verification</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="submitted_for_review">Under Review</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadSellers}
                sx={{ minWidth: 120 }}
              >
                Refresh
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Sellers Table */}
        <Card>
          <CardContent sx={{ p: 0 }}>
            {loading ? (
              <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                <CircularProgress />
              </Box>
            ) : (
              <>
                <TableContainer>
                  <Table>
                    <TableHead>
                      <TableRow>
                        <TableCell>Seller</TableCell>
                        <TableCell>Business Name</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Listings</TableCell>
                        <TableCell>Under Review</TableCell>
                        <TableCell>Verification Status</TableCell>
                        <TableCell>Account Status</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {sellers.map((seller) => (
                        <TableRow key={seller.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'primary.main' }}>
                                {seller.first_name.charAt(0)}{seller.last_name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {seller.first_name} {seller.last_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {seller.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>
                          
                          <TableCell>
                            <Typography variant="body2" fontWeight="medium">
                              {seller.seller_info.business_name}
                            </Typography>
                            {seller.seller_info.business_address && (
                              <Typography variant="caption" color="text.secondary">
                                {seller.seller_info.business_address}
                              </Typography>
                            )}
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Email fontSize="small" color="action" />
                                <Typography variant="caption">{seller.email}</Typography>
                              </Box>
                              {seller.phone && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Phone fontSize="small" color="action" />
                                  <Typography variant="caption">{seller.phone}</Typography>
                                </Box>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography variant="h6" color="primary">
                              {seller.seller_info.listings_count}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="h6" color="warning.main">
                              {seller.seller_info.listings_under_review || 0}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              icon={getStatusIcon(seller.seller_info.verification_status)}
                              label={seller.seller_info.verification_status.replace('_', ' ').toUpperCase()}
                              color={getStatusColor(seller.seller_info.verification_status) as any}
                              size="small"
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={seller.is_active ? 'Active' : 'Inactive'}
                              color={seller.is_active ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday fontSize="small" color="action" />
                              <Typography variant="body2">
                                {formatDate(seller.created_at)}
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewSeller(seller.id)}
                                  color="primary"
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Analytics">
                                <IconButton 
                                  size="small" 
                                  color="info"
                                  onClick={() => handleViewAnalytics(seller.id)}
                                >
                                  <Assessment fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={seller.is_active ? "Block User" : "Unblock User"}>
                                <IconButton 
                                  size="small" 
                                  color={seller.is_active ? "error" : "success"}
                                  onClick={() => handleBlockUser(seller.id, seller.is_active)}
                                >
                                  <Block fontSize="small" />
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
                  rowsPerPageOptions={[5, 10, 25, 50]}
                  component="div"
                  count={totalSellers}
                  rowsPerPage={rowsPerPage}
                  page={page}
                  onPageChange={handleChangePage}
                  onRowsPerPageChange={handleChangeRowsPerPage}
                />
              </>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </Container>
  );
};

export default AdminSellersPage;
