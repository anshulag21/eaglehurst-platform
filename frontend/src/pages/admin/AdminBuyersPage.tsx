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
  Person,
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
  ConnectWithoutContact,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';

import { adminService } from '../../services/admin.service';

interface Buyer {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  buyer_info: {
    verification_status: 'pending' | 'approved' | 'rejected';
    connections_count: number;
    active_connections?: number;
    saved_listings?: number;
    total_messages?: number;
    preferences?: {
      business_types?: string[];
      location_preferences?: string[];
      price_range?: {
        min?: number;
        max?: number;
      };
    };
  };
}

const AdminBuyersPage: React.FC = () => {
  const navigate = useNavigate();
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalBuyers, setTotalBuyers] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterVerification, setFilterVerification] = useState('all');

  // Load buyers from API
  const loadBuyers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers(
        page + 1,
        rowsPerPage,
        'buyer', // Only buyers
        undefined, // We'll filter verification status on frontend
        searchQuery || undefined
      );

      if (response.success && response.data) {
        // Filter and transform the data to match our Buyer interface
        const buyersData = response.data.users.map((user: any) => ({
          id: user.id,
          email: user.email,
          first_name: user.first_name,
          last_name: user.last_name,
          phone: user.phone,
          created_at: user.created_at,
          is_active: user.is_active,
          is_verified: user.is_verified,
          last_login: user.last_login,
          buyer_info: {
            verification_status: user.buyer_info?.verification_status || 'pending',
            connections_count: user.buyer_info?.connections_count || 0,
            active_connections: user.buyer_info?.active_connections || 0,
            saved_listings: user.buyer_info?.saved_listings || 0,
            total_messages: user.buyer_info?.total_messages || 0,
            preferences: user.buyer_info?.preferences || {},
          }
        }));

        // Apply frontend filters
        let filteredBuyers = buyersData;
        
        // Filter by email verification status
        if (filterVerification !== 'all') {
          filteredBuyers = filteredBuyers.filter(buyer => {
            if (filterVerification === 'verified') return buyer.is_verified;
            if (filterVerification === 'pending') return !buyer.is_verified;
            return true;
          });
        }
        
        // Filter by account status
        if (filterStatus !== 'all') {
          filteredBuyers = filteredBuyers.filter(buyer => {
            if (filterStatus === 'active') return buyer.is_active;
            if (filterStatus === 'inactive') return !buyer.is_active;
            return true;
          });
        }

        setBuyers(filteredBuyers);
        setTotalBuyers(filteredBuyers.length);
      }
    } catch (error) {
      console.error('Error loading buyers:', error);
      toast.error('Failed to load buyers');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, searchQuery, filterVerification, filterStatus]);

  useEffect(() => {
    loadBuyers();
  }, [loadBuyers]);

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

  const handleViewBuyer = (buyerId: string) => {
    navigate(`/admin/buyers/${buyerId}`);
  };

  const handleViewAnalytics = (buyerId: string) => {
    // Navigate to buyer analytics page or show analytics modal
    navigate(`/admin/buyers/${buyerId}?tab=analytics`);
  };

  const handleBlockUser = async (buyerId: string, isActive: boolean) => {
    try {
      const action = isActive ? 'block' : 'unblock';
      const response = await adminService.updateUserStatus(buyerId, !isActive, `User ${action}ed by admin`);
      
      if (response.success) {
        toast.success(`User ${action}ed successfully`);
        loadBuyers(); // Reload the data
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
      case 'pending': return 'default';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle fontSize="small" />;
      case 'rejected': return <Cancel fontSize="small" />;
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
            Buyers Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage all buyers, their verification status, and activity information
          </Typography>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Person sx={{ fontSize: 40, color: 'primary.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="primary">
                      {totalBuyers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Buyers
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
                      {buyers.filter(b => b.is_verified).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Email Verified
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
                  <ConnectWithoutContact sx={{ fontSize: 40, color: 'info.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {buyers.reduce((sum, b) => sum + b.buyer_info.connections_count, 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Connections
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
                  <TrendingUp sx={{ fontSize: 40, color: 'warning.main', mr: 2 }} />
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {buyers.filter(b => b.is_active).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Buyers
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
                placeholder="Search buyers..."
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
                <InputLabel>Email Status</InputLabel>
                <Select
                  value={filterVerification}
                  onChange={handleFilterVerificationChange}
                  label="Email Status"
                >
                  <MenuItem value="all">All Email Status</MenuItem>
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                </Select>
              </FormControl>

              <Button
                variant="outlined"
                startIcon={<Refresh />}
                onClick={loadBuyers}
                sx={{ minWidth: 120 }}
              >
                Refresh
              </Button>
            </Stack>
          </CardContent>
        </Card>

        {/* Buyers Table */}
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
                        <TableCell>Buyer</TableCell>
                        <TableCell>Contact</TableCell>
                        <TableCell>Connections</TableCell>
                        <TableCell>Active Connections</TableCell>
                        <TableCell>Saved Listings</TableCell>
                        <TableCell>Email Status</TableCell>
                        <TableCell>Account Status</TableCell>
                        <TableCell>Joined</TableCell>
                        <TableCell>Last Login</TableCell>
                        <TableCell>Actions</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {buyers.map((buyer) => (
                        <TableRow key={buyer.id} hover>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                              <Avatar sx={{ bgcolor: 'secondary.main' }}>
                                {buyer.first_name.charAt(0)}{buyer.last_name.charAt(0)}
                              </Avatar>
                              <Box>
                                <Typography variant="subtitle2">
                                  {buyer.first_name} {buyer.last_name}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">
                                  {buyer.email}
                                </Typography>
                              </Box>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Stack spacing={0.5}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                <Email fontSize="small" color="action" />
                                <Typography variant="caption">{buyer.email}</Typography>
                              </Box>
                              {buyer.phone && (
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                  <Phone fontSize="small" color="action" />
                                  <Typography variant="caption">{buyer.phone}</Typography>
                                </Box>
                              )}
                            </Stack>
                          </TableCell>

                          <TableCell>
                            <Typography variant="h6" color="primary">
                              {buyer.buyer_info.connections_count}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="h6" color="success.main">
                              {buyer.buyer_info.active_connections || 0}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Typography variant="h6" color="info.main">
                              {buyer.buyer_info.saved_listings || 0}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={buyer.is_verified ? 'Verified' : 'Pending'}
                              color={buyer.is_verified ? 'success' : 'warning'}
                              size="small"
                              icon={buyer.is_verified ? <CheckCircle fontSize="small" /> : <Schedule fontSize="small" />}
                            />
                          </TableCell>

                          <TableCell>
                            <Chip
                              label={buyer.is_active ? 'Active' : 'Blocked'}
                              color={buyer.is_active ? 'success' : 'error'}
                              size="small"
                            />
                          </TableCell>

                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                              <CalendarToday fontSize="small" color="action" />
                              <Typography variant="body2">
                                {formatDate(buyer.created_at)}
                              </Typography>
                            </Box>
                          </TableCell>

                          <TableCell>
                            <Typography variant="body2">
                              {formatDateTime(buyer.last_login)}
                            </Typography>
                          </TableCell>

                          <TableCell>
                            <Stack direction="row" spacing={1}>
                              <Tooltip title="View Details">
                                <IconButton
                                  size="small"
                                  onClick={() => handleViewBuyer(buyer.id)}
                                  color="primary"
                                >
                                  <Visibility fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title="View Analytics">
                                <IconButton 
                                  size="small" 
                                  color="info"
                                  onClick={() => handleViewAnalytics(buyer.id)}
                                >
                                  <Assessment fontSize="small" />
                                </IconButton>
                              </Tooltip>
                              <Tooltip title={buyer.is_active ? "Block User" : "Unblock User"}>
                                <IconButton 
                                  size="small" 
                                  color={buyer.is_active ? "error" : "success"}
                                  onClick={() => handleBlockUser(buyer.id, buyer.is_active)}
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
                  count={totalBuyers}
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

export default AdminBuyersPage;
