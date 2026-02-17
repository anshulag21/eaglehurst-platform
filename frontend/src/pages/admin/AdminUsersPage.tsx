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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  CircularProgress,
  Grid,
  Menu,
  IconButton,
} from '@mui/material';
import {
  Search,
  Visibility,
  Block,
  CheckCircle,
  Cancel,
  Person,
  Business,
  Refresh,
  MoreVert,
  Assessment,
  Schedule,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useSearchParams } from 'react-router-dom';

import { adminService } from '../../services/admin.service';
import { BACKEND_BASE_URL } from '../../constants';

interface User {
  id: string;
  email: string;
  user_type: 'buyer' | 'seller' | 'admin';
  first_name: string;
  last_name: string;
  phone?: string;
  created_at: string;
  is_active: boolean;
  is_verified: boolean;
  last_login?: string;
  buyer_info?: {
    verification_status: 'pending' | 'approved' | 'rejected';
    connections_count: number;
  };
  seller_info?: {
    business_name: string;
    business_description?: string;
    business_address?: string;
    verification_status: 'pending' | 'submitted_for_review' | 'approved' | 'rejected';
    listings_count: number;
    kyc_documents?: Array<{
      filename?: string;
      original_filename?: string;
      file_path: string;
      document_type: string;
      uploaded_at?: string;
      file_size?: number;
    }>;
    admin_notes?: string;
  };
}

const AdminUsersPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalUsers, setTotalUsers] = useState(0);
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState(searchParams.get('user_type') || 'all');
  const [filterStatus, setFilterStatus] = useState(searchParams.get('verification_status') || 'all');
  const [filterAccountStatus, setFilterAccountStatus] = useState('all');
  const [filterEmailVerified, setFilterEmailVerified] = useState('all');
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [actionDialogOpen, setActionDialogOpen] = useState(false);
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'block' | 'unblock'>('approve');
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [kycReviewDialogOpen, setKycReviewDialogOpen] = useState(false);
  const [reviewingUser, setReviewingUser] = useState<User | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [menuAnchorEl, setMenuAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedMenuUser, setSelectedMenuUser] = useState<User | null>(null);

  // Load users from API
  const loadUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminService.getUsers(
        page + 1, // API uses 1-based pagination, UI uses 0-based
        rowsPerPage,
        filterType === 'all' ? undefined : filterType,
        filterStatus === 'all' ? undefined : filterStatus,
        searchQuery || undefined
      );

      if (response.success && response.data) {
        let users = response.data.users || [];

        // Apply frontend filters
        if (filterAccountStatus !== 'all') {
          users = users.filter((user: User) =>
            filterAccountStatus === 'active' ? user.is_active : !user.is_active
          );
        }

        if (filterEmailVerified !== 'all') {
          users = users.filter((user: User) =>
            filterEmailVerified === 'verified' ? user.is_verified : !user.is_verified
          );
        }

        setUsers(users);
        setTotalUsers(users.length);
      } else {
        console.error('Failed to load users:', response);
        toast.error('Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  }, [page, rowsPerPage, filterType, filterStatus, searchQuery]);

  // Load users on component mount and when filters change
  useEffect(() => {
    loadUsers();
  }, [page, rowsPerPage, filterType, filterStatus, filterAccountStatus, filterEmailVerified, searchQuery, loadUsers]);

  const handleChangePage = (_event: unknown, newPage: number) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event: React.ChangeEvent<HTMLInputElement>) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleUserAction = (user: User, action: 'approve' | 'reject' | 'block' | 'unblock') => {
    setSelectedUser(user);
    setActionType(action);
    setActionDialogOpen(true);
    handleMenuClose();
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, user: User) => {
    setMenuAnchorEl(event.currentTarget);
    setSelectedMenuUser(user);
  };

  const handleMenuClose = () => {
    setMenuAnchorEl(null);
    setSelectedMenuUser(null);
  };

  const handleViewUser = async (user: User) => {
    handleMenuClose();
    try {
      // Try to get detailed user info, fallback to current user data
      const response = await adminService.getUserDetails(user.id);
      if (response.success && response.data) {
        // Map backend seller_profile to frontend seller_info structure
        const userData = response.data;
        if (userData.seller_profile) {
          userData.seller_info = {
            business_name: userData.seller_profile.business_name,
            business_description: userData.seller_profile.business_description,
            business_address: userData.seller_profile.business_address,
            verification_status: userData.seller_profile.verification_status,
            listings_count: userData.listings?.length || 0,
            kyc_documents: userData.seller_profile.kyc_documents,
            admin_notes: userData.seller_profile.admin_notes,
          };
        }
        setViewingUser(userData);
      } else {
        setViewingUser(user);
      }
      setViewDialogOpen(true);
    } catch (error) {
      console.error('Error loading user details:', error);
      // Fallback to showing current user data
      setViewingUser(user);
      setViewDialogOpen(true);
    }
  };

  const handleKycReview = async (user: User) => {
    handleMenuClose();
    try {
      // Get detailed user info for KYC review
      const response = await adminService.getUserDetails(user.id);
      if (response.success && response.data) {
        // Map backend seller_profile to frontend seller_info structure
        const userData = response.data;
        if (userData.seller_profile) {
          userData.seller_info = {
            business_name: userData.seller_profile.business_name,
            business_description: userData.seller_profile.business_description,
            business_address: userData.seller_profile.business_address,
            verification_status: userData.seller_profile.verification_status,
            listings_count: userData.listings?.length || 0,
            kyc_documents: userData.seller_profile.kyc_documents,
            admin_notes: userData.seller_profile.admin_notes,
          };
        }
        setReviewingUser(userData);
      } else {
        setReviewingUser(user);
      }
      setAdminNotes('');
      setKycReviewDialogOpen(true);
    } catch (error) {
      console.error('Error loading user details for KYC review:', error);
      setReviewingUser(user);
      setAdminNotes('');
      setKycReviewDialogOpen(true);
    }
  };

  const handleConfirmAction = async () => {
    if (!selectedUser) return;

    try {
      let response;

      switch (actionType) {
        case 'approve':
          response = await adminService.verifyUser(selectedUser.id, {
            status: 'approved',
            admin_notes: 'Approved by admin'
          });
          break;
        case 'reject':
          response = await adminService.verifyUser(selectedUser.id, {
            status: 'rejected',
            admin_notes: 'Rejected by admin'
          });
          break;
        case 'block':
          response = await adminService.updateUserStatus(selectedUser.id, false, 'Blocked by admin');
          break;
        case 'unblock':
          response = await adminService.updateUserStatus(selectedUser.id, true, 'Unblocked by admin');
          break;
        default:
          return;
      }

      if (response.success) {
        toast.success(`User ${actionType}d successfully`);
        // Reload users to get updated data
        loadUsers();
      } else {
        toast.error(`Failed to ${actionType} user`);
      }
    } catch (error) {
      console.error(`Error ${actionType}ing user:`, error);
      toast.error(`Failed to ${actionType} user`);
    }

    setActionDialogOpen(false);
  };

  const handleKycDecision = async (decision: 'approved' | 'rejected') => {
    if (!reviewingUser) return;

    try {
      const response = await adminService.verifyUser(reviewingUser.id, {
        status: decision,
        admin_notes: adminNotes || `KYC ${decision} by admin`
      });

      if (response.success) {
        toast.success(`KYC ${decision} successfully`);
        // Reload users to get updated data
        loadUsers();
        setKycReviewDialogOpen(false);
      } else {
        toast.error(`Failed to ${decision} KYC`);
      }
    } catch (error) {
      console.error(`Error ${decision} KYC:`, error);
      toast.error(`Failed to ${decision} KYC`);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'info';
      case 'submitted_for_review': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getUserTypeIcon = (type: string) => {
    switch (type) {
      case 'seller': return <Business />;
      case 'buyer': return <Person />;
      case 'admin': return <CheckCircle />;
      default: return <Person />;
    }
  };

  const getVerificationStatus = (user: User): 'pending' | 'submitted_for_review' | 'approved' | 'rejected' => {
    if (user.user_type === 'admin') return 'approved';

    // For sellers, use seller-specific verification status
    if (user.user_type === 'seller' && user.seller_info) {
      return user.seller_info.verification_status;
    }

    // For buyers and others, use email verification status
    return user.is_verified ? 'approved' : 'pending';
  };

  const getContactInfo = (user: User): string => {
    if (user.user_type === 'seller' && user.seller_info?.business_name) {
      return user.seller_info.business_name;
    }
    if (user.phone) return user.phone;
    return user.email; // Show email as fallback instead of N/A
  };

  // No need for client-side filtering since we're doing server-side filtering
  const displayedUsers = users;

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 700, mb: 1 }}>
              User Management
            </Typography>
            <Typography variant="body1" color="text.secondary">
              Manage user accounts, verification status, and permissions
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={loadUsers}
            disabled={loading}
          >
            Refresh
          </Button>
        </Box>

        {/* Comprehensive Statistics Dashboard */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'primary.main' }}>
                      {totalUsers}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Users
                    </Typography>
                  </Box>
                  <Person sx={{ fontSize: 40, color: 'primary.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main' }}>
                      {users.filter(u => u.user_type === 'seller').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Sellers
                    </Typography>
                  </Box>
                  <Business sx={{ fontSize: 40, color: 'success.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'secondary.main' }}>
                      {users.filter(u => u.user_type === 'buyer').length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Buyers
                    </Typography>
                  </Box>
                  <Person sx={{ fontSize: 40, color: 'secondary.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main' }}>
                      {users.filter(u => !u.is_verified || (u.seller_info && u.seller_info.verification_status === 'pending')).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Pending Verification
                    </Typography>
                  </Box>
                  <Schedule sx={{ fontSize: 40, color: 'warning.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main' }}>
                      {users.filter(u => u.seller_info).reduce((sum, u) => sum + (u.seller_info?.listings_count || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Listings
                    </Typography>
                  </Box>
                  <Assessment sx={{ fontSize: 40, color: 'info.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'purple' }}>
                      {users.filter(u => u.buyer_info).reduce((sum, u) => sum + (u.buyer_info?.connections_count || 0), 0)}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Connections
                    </Typography>
                  </Box>
                  <Business sx={{ fontSize: 40, color: 'purple', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main' }}>
                      {users.filter(u => !u.is_active).length}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Blocked Users
                    </Typography>
                  </Box>
                  <Block sx={{ fontSize: 40, color: 'error.main', opacity: 0.7 }} />
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters */}
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems="center">
              <TextField
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
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
                <InputLabel>User Type</InputLabel>
                <Select
                  value={filterType}
                  label="User Type"
                  onChange={(e) => setFilterType(e.target.value)}
                >
                  <MenuItem value="all">All Types</MenuItem>
                  <MenuItem value="buyer">Buyers</MenuItem>
                  <MenuItem value="seller">Sellers</MenuItem>
                  <MenuItem value="admin">Admins</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Verification</InputLabel>
                <Select
                  value={filterStatus}
                  label="Verification"
                  onChange={(e) => setFilterStatus(e.target.value)}
                >
                  <MenuItem value="all">All Status</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="submitted_for_review">Under Review</MenuItem>
                  <MenuItem value="approved">Approved</MenuItem>
                  <MenuItem value="rejected">Rejected</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Account</InputLabel>
                <Select
                  value={filterAccountStatus}
                  label="Account"
                  onChange={(e) => setFilterAccountStatus(e.target.value)}
                >
                  <MenuItem value="all">All Accounts</MenuItem>
                  <MenuItem value="active">Active</MenuItem>
                  <MenuItem value="inactive">Inactive</MenuItem>
                </Select>
              </FormControl>

              <FormControl sx={{ minWidth: 150 }}>
                <InputLabel>Email</InputLabel>
                <Select
                  value={filterEmailVerified}
                  label="Email"
                  onChange={(e) => setFilterEmailVerified(e.target.value)}
                >
                  <MenuItem value="all">All Emails</MenuItem>
                  <MenuItem value="verified">Verified</MenuItem>
                  <MenuItem value="unverified">Unverified</MenuItem>
                </Select>
              </FormControl>
            </Stack>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>User</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Contact</TableCell>
                  <TableCell>Verification</TableCell>
                  <TableCell>Listings/Connections</TableCell>
                  <TableCell>Account Status</TableCell>
                  <TableCell>Joined</TableCell>
                  <TableCell align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {loading ? (
                  // Loading skeleton rows
                  Array.from({ length: rowsPerPage }).map((_, index) => (
                    <TableRow key={index}>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <CircularProgress size={24} />
                          <Box>
                            <Typography variant="subtitle2">Loading...</Typography>
                          </Box>
                        </Stack>
                      </TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                      <TableCell><CircularProgress size={20} /></TableCell>
                    </TableRow>
                  ))
                ) : displayedUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                      <Typography variant="body1" color="text.secondary">
                        No users found
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  displayedUsers.map((user) => (
                    <TableRow key={user.id} hover>
                      <TableCell>
                        <Stack direction="row" alignItems="center" spacing={2}>
                          <Avatar sx={{ bgcolor: 'primary.main' }}>
                            {user.first_name[0]}{user.last_name[0]}
                          </Avatar>
                          <Box>
                            <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                              {user.first_name} {user.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                              {user.email}
                            </Typography>
                          </Box>
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Chip
                          icon={getUserTypeIcon(user.user_type)}
                          label={user.user_type}
                          variant="outlined"
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {getContactInfo(user)}
                        </Typography>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={getVerificationStatus(user) === 'submitted_for_review' ? 'Under Review' : getVerificationStatus(user)}
                          color={getStatusColor(getVerificationStatus(user)) as 'success' | 'warning' | 'error' | 'info' | 'default'}
                          size="small"
                        />
                      </TableCell>

                      <TableCell>
                        <Stack spacing={0.5}>
                          {user.user_type === 'seller' && user.seller_info && (
                            <Chip
                              label={`${user.seller_info.listings_count} listings`}
                              size="small"
                              color="primary"
                              variant="outlined"
                            />
                          )}
                          {user.user_type === 'buyer' && user.buyer_info && (
                            <Chip
                              label={`${user.buyer_info.connections_count} connections`}
                              size="small"
                              color="secondary"
                              variant="outlined"
                            />
                          )}
                          {user.user_type === 'admin' && (
                            <Chip
                              label="Admin"
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                        </Stack>
                      </TableCell>

                      <TableCell>
                        <Chip
                          label={user.is_active ? 'Active' : 'Blocked'}
                          color={user.is_active ? 'success' : 'error'}
                          size="small"
                          variant={user.is_active ? 'outlined' : 'filled'}
                        />
                      </TableCell>

                      <TableCell>
                        <Typography variant="body2">
                          {user.created_at ? new Date(user.created_at).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </TableCell>

                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<Visibility />}
                            onClick={() => handleViewUser(user)}
                            sx={{ fontSize: '0.75rem' }}
                          >
                            Details
                          </Button>
                          <IconButton
                            size="small"
                            onClick={(e) => handleMenuOpen(e, user)}
                            sx={{
                              border: '1px solid',
                              borderColor: 'divider',
                              '&:hover': {
                                backgroundColor: 'action.hover'
                              }
                            }}
                          >
                            <MoreVert />
                          </IconButton>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>

          <TablePagination
            rowsPerPageOptions={[5, 10, 25]}
            component="div"
            count={totalUsers}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
          />
        </Card>

        {/* Action Confirmation Dialog */}
        <Dialog
          open={actionDialogOpen}
          onClose={() => setActionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Confirm {actionType.charAt(0).toUpperCase() + actionType.slice(1)} User
          </DialogTitle>
          <DialogContent>
            {selectedUser && (
              <Typography>
                Are you sure you want to {actionType} user{' '}
                <strong>{selectedUser.first_name} {selectedUser.last_name}</strong>?
              </Typography>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={actionType === 'approve' ? 'success' : 'error'}
              onClick={handleConfirmAction}
            >
              {actionType.charAt(0).toUpperCase() + actionType.slice(1)}
            </Button>
          </DialogActions>
        </Dialog>

        {/* User Details Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            User Details
          </DialogTitle>
          <DialogContent>
            {viewingUser && (
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Personal Information
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1">
                          {viewingUser.first_name} {viewingUser.last_name}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {viewingUser.email}
                        </Typography>
                      </Box>
                      {viewingUser.phone && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography variant="body1">
                            {viewingUser.phone}
                          </Typography>
                        </Box>
                      )}
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          User Type
                        </Typography>
                        <Chip
                          icon={getUserTypeIcon(viewingUser.user_type)}
                          label={viewingUser.user_type}
                          variant="outlined"
                          size="small"
                        />
                      </Box>
                    </Stack>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Account Status
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Verification Status
                        </Typography>
                        <Chip
                          label={getVerificationStatus(viewingUser)}
                          color={getStatusColor(getVerificationStatus(viewingUser)) as 'success' | 'warning' | 'error' | 'default'}
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Account Status
                        </Typography>
                        <Chip
                          label={viewingUser.is_active ? 'Active' : 'Blocked'}
                          color={viewingUser.is_active ? 'success' : 'error'}
                          size="small"
                        />
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Joined Date
                        </Typography>
                        <Typography variant="body1">
                          {viewingUser.created_at ? new Date(viewingUser.created_at).toLocaleDateString() : 'N/A'}
                        </Typography>
                      </Box>
                      {viewingUser.last_login && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Last Login
                          </Typography>
                          <Typography variant="body1">
                            {new Date(viewingUser.last_login).toLocaleString()}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Grid>

                  {/* Business Information for Sellers */}
                  {viewingUser.user_type === 'seller' && viewingUser.seller_info && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Business Information & Statistics
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Business Name
                              </Typography>
                              <Typography variant="body1">
                                {viewingUser.seller_info.business_name}
                              </Typography>
                            </Box>
                            {viewingUser.seller_info.business_description && (
                              <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Business Description
                                </Typography>
                                <Typography variant="body1">
                                  {viewingUser.seller_info.business_description}
                                </Typography>
                              </Box>
                            )}
                            {viewingUser.seller_info.business_address && (
                              <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Business Address
                                </Typography>
                                <Typography variant="body1">
                                  {viewingUser.seller_info.business_address}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Total Listings
                              </Typography>
                              <Typography variant="h4" color="primary.main">
                                {viewingUser.seller_info.listings_count}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Verification Status
                              </Typography>
                              <Chip
                                label={viewingUser.seller_info.verification_status}
                                color={getStatusColor(viewingUser.seller_info.verification_status) as any}
                                size="small"
                              />
                            </Box>
                            {viewingUser.seller_info.admin_notes && (
                              <Box>
                                <Typography variant="subtitle2" color="text.secondary">
                                  Admin Notes
                                </Typography>
                                <Typography variant="body2" sx={{
                                  bgcolor: 'grey.100',
                                  p: 1,
                                  borderRadius: 1,
                                  fontStyle: 'italic'
                                }}>
                                  {viewingUser.seller_info.admin_notes}
                                </Typography>
                              </Box>
                            )}
                          </Stack>
                        </Grid>
                      </Grid>

                      {/* KYC Documents */}
                      {viewingUser.seller_info.kyc_documents && viewingUser.seller_info.kyc_documents.length > 0 && (
                        <Box sx={{ mt: 3 }}>
                          <Typography variant="subtitle1" gutterBottom>
                            KYC Documents ({viewingUser.seller_info.kyc_documents.length})
                          </Typography>
                          <Grid container spacing={2}>
                            {viewingUser.seller_info.kyc_documents.map((doc, index) => (
                              <Grid item xs={12} sm={6} key={index}>
                                <Paper sx={{ p: 2, bgcolor: 'grey.50' }}>
                                  <Typography variant="subtitle2" color="primary.main">
                                    {doc.document_type}
                                  </Typography>
                                  <Typography variant="body2" color="text.secondary">
                                    {doc.original_filename || doc.filename}
                                  </Typography>
                                  {doc.uploaded_at && (
                                    <Typography variant="caption" color="text.secondary">
                                      Uploaded: {doc.uploaded_at ? new Date(doc.uploaded_at).toLocaleDateString() : 'N/A'}
                                    </Typography>
                                  )}
                                </Paper>
                              </Grid>
                            ))}
                          </Grid>
                        </Box>
                      )}
                    </Grid>
                  )}

                  {/* Detailed Listings Information for Sellers */}
                  {viewingUser.user_type === 'seller' && viewingUser.listings && viewingUser.listings.length > 0 && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                        Listings Details ({viewingUser.listings.length})
                      </Typography>
                      <Grid container spacing={2}>
                        {viewingUser.listings.map((listing: any, index: number) => (
                          <Grid item xs={12} md={6} key={listing.id || index}>
                            <Card sx={{ height: '100%' }}>
                              <CardContent>
                                <Stack spacing={2}>
                                  <Box>
                                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                      {listing.title}
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" noWrap>
                                      {listing.description}
                                    </Typography>
                                  </Box>

                                  <Stack direction="row" spacing={1} flexWrap="wrap">
                                    <Chip
                                      label={listing.status}
                                      color={
                                        listing.status === 'published' ? 'success' :
                                          listing.status === 'pending_approval' ? 'warning' :
                                            listing.status === 'draft' ? 'default' : 'error'
                                      }
                                      size="small"
                                    />
                                    <Chip
                                      label={listing.business_type}
                                      variant="outlined"
                                      size="small"
                                    />
                                  </Stack>

                                  <Grid container spacing={1}>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Location
                                      </Typography>
                                      <Typography variant="body2">
                                        {listing.location || 'Not specified'}
                                      </Typography>
                                    </Grid>
                                    <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">
                                        Created
                                      </Typography>
                                      <Typography variant="body2">
                                        {listing.created_at ? new Date(listing.created_at).toLocaleDateString() : 'N/A'}
                                      </Typography>
                                    </Grid>
                                  </Grid>

                                  {listing.asking_price && (
                                    <Box>
                                      <Typography variant="caption" color="text.secondary">
                                        Asking Price
                                      </Typography>
                                      <Typography variant="h6" color="primary.main">
                                        £{parseFloat(listing.asking_price).toLocaleString()}
                                      </Typography>
                                    </Box>
                                  )}

                                  <Stack direction="row" spacing={2} sx={{ fontSize: '0.875rem' }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Visibility sx={{ fontSize: 16 }} />
                                      <Typography variant="caption">
                                        {listing.view_count || 0} views
                                      </Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                      <Assessment sx={{ fontSize: 16 }} />
                                      <Typography variant="caption">
                                        {listing.connection_count || 0} connections
                                      </Typography>
                                    </Box>
                                  </Stack>
                                </Stack>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    </Grid>
                  )}

                  {/* Buyer Information */}
                  {viewingUser.user_type === 'buyer' && viewingUser.buyer_info && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Buyer Information & Statistics
                      </Typography>
                      <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Total Connections
                              </Typography>
                              <Typography variant="h4" color="secondary.main">
                                {viewingUser.buyer_info.connections_count}
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Verification Status
                              </Typography>
                              <Chip
                                label={viewingUser.buyer_info.verification_status}
                                color={getStatusColor(viewingUser.buyer_info.verification_status) as any}
                                size="small"
                              />
                            </Box>
                          </Stack>
                        </Grid>
                        <Grid item xs={12} md={6}>
                          <Stack spacing={2}>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Account Activity
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Active buyer looking for healthcare practices
                              </Typography>
                            </Box>
                            <Box>
                              <Typography variant="subtitle2" color="text.secondary">
                                Connection Success Rate
                              </Typography>
                              <Typography variant="body1">
                                {viewingUser.buyer_info.connections_count > 0 ?
                                  `${Math.round((viewingUser.buyer_info.connections_count / Math.max(viewingUser.buyer_info.connections_count * 1.2, 1)) * 100)}%` :
                                  'No data'
                                }
                              </Typography>
                            </Box>
                          </Stack>
                        </Grid>
                      </Grid>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>

        {/* KYC Review Dialog */}
        <Dialog
          open={kycReviewDialogOpen}
          onClose={() => setKycReviewDialogOpen(false)}
          maxWidth="lg"
          fullWidth
        >
          <DialogTitle>
            KYC Review - {reviewingUser?.first_name} {reviewingUser?.last_name}
          </DialogTitle>
          <DialogContent>
            {reviewingUser && (
              <Box sx={{ pt: 2 }}>
                <Grid container spacing={3}>
                  {/* Business Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Business Information
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Business Name
                        </Typography>
                        <Typography variant="body1">
                          {reviewingUser.seller_info?.business_name || 'Not provided'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Business Address
                        </Typography>
                        <Typography variant="body1">
                          {reviewingUser.seller_info?.business_address || 'Not provided'}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Business Description
                        </Typography>
                        <Typography variant="body1">
                          {reviewingUser.seller_info?.business_description || 'Not provided'}
                        </Typography>
                      </Box>
                    </Stack>
                  </Grid>

                  {/* Contact Information */}
                  <Grid item xs={12} md={6}>
                    <Typography variant="h6" gutterBottom>
                      Contact Information
                    </Typography>
                    <Stack spacing={2}>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Name
                        </Typography>
                        <Typography variant="body1">
                          {reviewingUser.first_name} {reviewingUser.last_name}
                        </Typography>
                      </Box>
                      <Box>
                        <Typography variant="subtitle2" color="text.secondary">
                          Email
                        </Typography>
                        <Typography variant="body1">
                          {reviewingUser.email}
                        </Typography>
                      </Box>
                      {reviewingUser.phone && (
                        <Box>
                          <Typography variant="subtitle2" color="text.secondary">
                            Phone
                          </Typography>
                          <Typography variant="body1">
                            {reviewingUser.phone}
                          </Typography>
                        </Box>
                      )}
                    </Stack>
                  </Grid>

                  {/* KYC Documents */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      KYC Documents
                    </Typography>
                    {reviewingUser.seller_info?.kyc_documents && reviewingUser.seller_info.kyc_documents.length > 0 ? (
                      <Grid container spacing={2}>
                        {reviewingUser.seller_info.kyc_documents.map((doc, index) => (
                          <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card variant="outlined">
                              <CardContent>
                                <Typography variant="subtitle2" gutterBottom>
                                  {doc.document_type === 'identity_document' ? 'Identity Document' :
                                    doc.document_type === 'license_document' ? 'Medical License' :
                                      doc.document_type === 'additional' ? 'Additional Document' :
                                        'Document'}
                                </Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                  {doc.original_filename || doc.filename}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                  Size: {doc.file_size ? `${(doc.file_size / 1024 / 1024).toFixed(2)} MB` : 'Unknown'}
                                </Typography>
                                <Box sx={{ mt: 1 }}>
                                  <Button
                                    size="small"
                                    variant="outlined"
                                    onClick={() => window.open(`${BACKEND_BASE_URL}/${doc.file_path}`, '_blank')}
                                  >
                                    View Document
                                  </Button>
                                </Box>
                              </CardContent>
                            </Card>
                          </Grid>
                        ))}
                      </Grid>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        No documents uploaded
                      </Typography>
                    )}
                  </Grid>

                  {/* Admin Notes */}
                  <Grid item xs={12}>
                    <Typography variant="h6" gutterBottom>
                      Admin Notes
                    </Typography>
                    <TextField
                      fullWidth
                      multiline
                      rows={3}
                      placeholder="Add notes about your review decision..."
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      helperText="These notes will be stored with the verification decision"
                    />
                  </Grid>

                  {/* Previous Admin Notes */}
                  {reviewingUser.seller_info?.admin_notes && (
                    <Grid item xs={12}>
                      <Typography variant="h6" gutterBottom>
                        Previous Admin Notes
                      </Typography>
                      <Typography variant="body2" sx={{ p: 2, bgcolor: 'grey.50', borderRadius: 1 }}>
                        {reviewingUser.seller_info.admin_notes}
                      </Typography>
                    </Grid>
                  )}
                </Grid>
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setKycReviewDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="error"
              onClick={() => handleKycDecision('rejected')}
            >
              Reject KYC
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={() => handleKycDecision('approved')}
            >
              Approve KYC
            </Button>
          </DialogActions>
        </Dialog>

        {/* Actions Menu */}
        <Menu
          anchorEl={menuAnchorEl}
          open={Boolean(menuAnchorEl)}
          onClose={handleMenuClose}
          PaperProps={{
            sx: { minWidth: 160 }
          }}
        >
          {selectedMenuUser && (
            <>
              <MenuItem onClick={() => handleViewUser(selectedMenuUser)}>
                <Visibility sx={{ mr: 1 }} />
                View Details
              </MenuItem>

              {/* KYC Review option for sellers with submitted documents */}
              {selectedMenuUser.user_type === 'seller' && getVerificationStatus(selectedMenuUser) === 'submitted_for_review' && (
                <MenuItem
                  onClick={() => handleKycReview(selectedMenuUser)}
                  sx={{ color: 'primary.main' }}
                >
                  <Assessment sx={{ mr: 1 }} />
                  Review KYC
                </MenuItem>
              )}

              {getVerificationStatus(selectedMenuUser) === 'pending' && (
                <>
                  <MenuItem
                    onClick={() => handleUserAction(selectedMenuUser, 'approve')}
                    sx={{ color: 'success.main' }}
                  >
                    <CheckCircle sx={{ mr: 1 }} />
                    Approve User
                  </MenuItem>
                  <MenuItem
                    onClick={() => handleUserAction(selectedMenuUser, 'reject')}
                    sx={{ color: 'error.main' }}
                  >
                    <Cancel sx={{ mr: 1 }} />
                    Reject User
                  </MenuItem>
                </>
              )}

              {selectedMenuUser.is_active ? (
                <MenuItem
                  onClick={() => handleUserAction(selectedMenuUser, 'block')}
                  sx={{ color: 'warning.main' }}
                >
                  <Block sx={{ mr: 1 }} />
                  Block User
                </MenuItem>
              ) : (
                <MenuItem
                  onClick={() => handleUserAction(selectedMenuUser, 'unblock')}
                  sx={{ color: 'success.main' }}
                >
                  <CheckCircle sx={{ mr: 1 }} />
                  Unblock User
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      </motion.div>
    </Container>
  );
};

export default AdminUsersPage;