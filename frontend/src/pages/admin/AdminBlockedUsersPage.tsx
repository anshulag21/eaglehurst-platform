import React, { useState, useEffect, useCallback } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Button,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  Paper,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Checkbox,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  IconButton,
  Badge,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
  Alert,
  Switch,
  InputAdornment,
  Menu,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  CheckCircle,
  Person,
  Business,
  Search,
  FilterList,
  Refresh,
  ExpandMore,
  Visibility,
  Edit,
  MoreVert,
  Download,
  AdminPanelSettings,
  TrendingUp,
  TrendingDown,
  Group,
  Security,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

import { 
  adminBlockingService, 
  AdminBlockedUser, 
  AdminBlockedUsersFilters,
  BlockingStatistics
} from '../../services/admin-blocking.service';


const AdminBlockedUsersPage: React.FC = () => {
  // State for blocked users
  const [blockedUsers, setBlockedUsers] = useState<AdminBlockedUser[]>([]);
  const [loading, setLoading] = useState(true);

  // State for statistics
  const [statistics, setStatistics] = useState<BlockingStatistics | null>(null);
  const [statisticsLoading, setStatisticsLoading] = useState(true);

  // State for filters and pagination
  const [filters, setFilters] = useState<AdminBlockedUsersFilters>({
    page: 1,
    limit: 20,
    search: '',
    blocker_type: '',
    blocked_type: '',
    is_active: undefined,
    date_from: '',
    date_to: '',
  });
  const [pagination, setPagination] = useState({
    current_page: 1,
    total_pages: 1,
    total_items: 0,
    items_per_page: 20,
  });

  // State for UI
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  
  // State for dialogs
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [bulkActionDialogOpen, setBulkActionDialogOpen] = useState(false);
  const [selectedBlock, setSelectedBlock] = useState<AdminBlockedUser | null>(null);
  
  // State for actions
  const [actionLoading, setActionLoading] = useState(false);
  const [bulkAction, setBulkAction] = useState<'activate' | 'deactivate' | 'delete'>('deactivate');
  const [adminNotes, setAdminNotes] = useState('');

  // Menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [menuBlockId, setMenuBlockId] = useState<string | null>(null);

  const loadBlockedUsers = useCallback(async () => {
    try {
      setLoading(true);
      const response = await adminBlockingService.getAllBlockedUsers(filters);
      if (response.success && response.data) {
        setBlockedUsers(response.data.blocked_users);
        setPagination(response.data.pagination);
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  const loadStatistics = async () => {
    try {
      setStatisticsLoading(true);
      const response = await adminBlockingService.getBlockingStatistics();
      if (response.success && response.data) {
        setStatistics(response.data);
      }
    } catch (error) {
      console.error('Error loading statistics:', error);
      toast.error('Failed to load blocking statistics');
    } finally {
      setStatisticsLoading(false);
    }
  };

  useEffect(() => {
    loadBlockedUsers();
    loadStatistics();
  }, [loadBlockedUsers]);

  const handleFilterChange = (key: keyof AdminBlockedUsersFilters, value: unknown) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
      page: 1, // Reset to first page when filters change
    }));
  };

  const handlePageChange = (_event: unknown, newPage: number) => {
    setFilters(prev => ({
      ...prev,
      page: newPage + 1,
    }));
  };

  const handleRowsPerPageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setFilters(prev => ({
      ...prev,
      limit: parseInt(event.target.value, 10),
      page: 1,
    }));
  };

  const handleSelectBlock = (blockId: string) => {
    setSelectedBlocks(prev => 
      prev.includes(blockId) 
        ? prev.filter(id => id !== blockId)
        : [...prev, blockId]
    );
  };

  const handleSelectAllBlocks = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.checked) {
      setSelectedBlocks(blockedUsers.map(block => block.id));
    } else {
      setSelectedBlocks([]);
    }
  };

  const handleViewBlock = (block: AdminBlockedUser) => {
    setSelectedBlock(block);
    setViewDialogOpen(true);
  };

  const handleEditBlock = (block: AdminBlockedUser) => {
    setSelectedBlock(block);
    setAdminNotes(block.admin_notes || '');
    setEditDialogOpen(true);
  };

  const handleUnblockUser = async () => {
    if (!selectedBlock) return;

    try {
      setActionLoading(true);
      const response = await adminBlockingService.adminUnblockUser({
        block_id: selectedBlock.id,
        admin_notes: adminNotes,
      });

      if (response.success) {
        toast.success('User unblocked successfully');
        setUnblockDialogOpen(false);
        setSelectedBlock(null);
        setAdminNotes('');
        await loadBlockedUsers();
        await loadStatistics();
      } else {
        toast.error('Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUpdateBlock = async () => {
    if (!selectedBlock) return;

    try {
      setActionLoading(true);
      const response = await adminBlockingService.updateBlock({
        block_id: selectedBlock.id,
        admin_notes: adminNotes,
      });

      if (response.success) {
        toast.success('Block updated successfully');
        setEditDialogOpen(false);
        setSelectedBlock(null);
        setAdminNotes('');
        await loadBlockedUsers();
      } else {
        toast.error('Failed to update block');
      }
    } catch (error) {
      console.error('Error updating block:', error);
      toast.error('Failed to update block');
    } finally {
      setActionLoading(false);
    }
  };

  const handleToggleBlockStatus = async (block: AdminBlockedUser) => {
    try {
      setActionLoading(true);
      const response = await adminBlockingService.updateBlock({
        block_id: block.id,
        is_active: !block.is_active,
        admin_notes: `Status changed to ${!block.is_active ? 'active' : 'inactive'} by admin`,
      });

      if (response.success) {
        toast.success(`Block ${!block.is_active ? 'activated' : 'deactivated'} successfully`);
        await loadBlockedUsers();
        await loadStatistics();
      } else {
        toast.error('Failed to update block status');
      }
    } catch (error) {
      console.error('Error updating block status:', error);
      toast.error('Failed to update block status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleBulkAction = async () => {
    if (selectedBlocks.length === 0) return;

    try {
      setActionLoading(true);
      const response = await adminBlockingService.bulkUpdateBlocks(
        selectedBlocks,
        bulkAction,
        adminNotes
      );

      if (response.success) {
        toast.success(`Bulk action completed: ${response.data?.message}`);
        setBulkActionDialogOpen(false);
        setSelectedBlocks([]);
        setAdminNotes('');
        await loadBlockedUsers();
        await loadStatistics();
      } else {
        toast.error('Failed to perform bulk action');
      }
    } catch (error) {
      console.error('Error performing bulk action:', error);
      toast.error('Failed to perform bulk action');
    } finally {
      setActionLoading(false);
    }
  };

  const getUserTypeIcon = (userType: string) => {
    switch (userType) {
      case 'seller':
        return <Business />;
      case 'admin':
        return <AdminPanelSettings />;
      default:
        return <Person />;
    }
  };

  const getUserTypeColor = (userType: string): 'primary' | 'secondary' | 'error' => {
    switch (userType) {
      case 'seller':
        return 'primary';
      case 'admin':
        return 'error';
      default:
        return 'secondary';
    }
  };

  const renderStatisticsCards = () => {
    if (statisticsLoading || !statistics) {
      return (
        <Grid container spacing={3} sx={{ mb: 4 }}>
          {[1, 2, 3, 4].map((i) => (
            <Grid item xs={12} sm={6} md={3} key={i}>
              <Card>
                <CardContent>
                  <CircularProgress size={24} />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      );
    }

    return (
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color="primary">
                      {statistics.total_blocks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Total Blocks
                    </Typography>
                  </Box>
                  <Security color="primary" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color="success.main">
                      {statistics.active_blocks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Active Blocks
                    </Typography>
                  </Box>
                  <TrendingUp color="success" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color="warning.main">
                      {statistics.inactive_blocks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      Inactive Blocks
                    </Typography>
                  </Box>
                  <TrendingDown color="warning" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center" justifyContent="space-between">
                  <Box>
                    <Typography variant="h4" color="info.main">
                      {statistics.blocks_by_user_type.buyer_blocks + statistics.blocks_by_user_type.seller_blocks}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      User Blocks
                    </Typography>
                  </Box>
                  <Group color="info" sx={{ fontSize: 40 }} />
                </Box>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    );
  };

  const renderFilters = () => (
    <Accordion expanded={showFilters} onChange={() => setShowFilters(!showFilters)}>
      <AccordionSummary expandIcon={<ExpandMore />}>
        <Box display="flex" alignItems="center" gap={1}>
          <FilterList />
          <Typography variant="h6">Advanced Filters</Typography>
          {(filters.search || filters.blocker_type || filters.blocked_type || filters.is_active !== undefined) && (
            <Badge color="primary" variant="dot" />
          )}
        </Box>
      </AccordionSummary>
      <AccordionDetails>
        <Grid container spacing={3}>
          <Grid item xs={12} md={4}>
            <TextField
              fullWidth
              label="Search"
              placeholder="Search by name, email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Blocker Type</InputLabel>
              <Select
                value={filters.blocker_type || ''}
                label="Blocker Type"
                onChange={(e) => handleFilterChange('blocker_type', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="buyer">Buyer</MenuItem>
                <MenuItem value="seller">Seller</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Blocked User Type</InputLabel>
              <Select
                value={filters.blocked_type || ''}
                label="Blocked User Type"
                onChange={(e) => handleFilterChange('blocked_type', e.target.value)}
              >
                <MenuItem value="">All Types</MenuItem>
                <MenuItem value="buyer">Buyer</MenuItem>
                <MenuItem value="seller">Seller</MenuItem>
                <MenuItem value="admin">Admin</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={filters.is_active === undefined ? '' : filters.is_active.toString()}
                label="Status"
                onChange={(e) => handleFilterChange('is_active', e.target.value === '' ? undefined : e.target.value === 'true')}
              >
                <MenuItem value="">All Statuses</MenuItem>
                <MenuItem value="true">Active</MenuItem>
                <MenuItem value="false">Inactive</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="From Date"
                value={filters.date_from ? new Date(filters.date_from) : null}
                onChange={(date) => handleFilterChange('date_from', date ? date.toISOString().split('T')[0] : '')}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>

          <Grid item xs={12} md={4}>
            <LocalizationProvider dateAdapter={AdapterDateFns}>
              <DatePicker
                label="To Date"
                value={filters.date_to ? new Date(filters.date_to) : null}
                onChange={(date) => handleFilterChange('date_to', date ? date.toISOString().split('T')[0] : '')}
                slotProps={{ textField: { fullWidth: true } }}
              />
            </LocalizationProvider>
          </Grid>
        </Grid>

        <Box sx={{ mt: 3, display: 'flex', gap: 2 }}>
          <Button
            variant="contained"
            startIcon={<Search />}
            onClick={() => loadBlockedUsers()}
          >
            Apply Filters
          </Button>
          <Button
            variant="outlined"
            onClick={() => {
              setFilters({
                page: 1,
                limit: 20,
                search: '',
                blocker_type: '',
                blocked_type: '',
                is_active: undefined,
                date_from: '',
                date_to: '',
              });
            }}
          >
            Clear Filters
          </Button>
        </Box>
      </AccordionDetails>
    </Accordion>
  );

  const renderBlocksTable = () => (
    <TableContainer component={Paper}>
      <Table>
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={selectedBlocks.length > 0 && selectedBlocks.length < blockedUsers.length}
                checked={blockedUsers.length > 0 && selectedBlocks.length === blockedUsers.length}
                onChange={handleSelectAllBlocks}
              />
            </TableCell>
            <TableCell>Blocker</TableCell>
            <TableCell>Blocked User</TableCell>
            <TableCell>Reason</TableCell>
            <TableCell>Status</TableCell>
            <TableCell>Date</TableCell>
            <TableCell>Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {blockedUsers.map((block, index) => (
            <TableRow
              key={block.id}
              component={motion.tr}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
            >
              <TableCell padding="checkbox">
                <Checkbox
                  checked={selectedBlocks.includes(block.id)}
                  onChange={() => handleSelectBlock(block.id)}
                />
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {block.blocker.first_name[0]}{block.blocker.last_name[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {block.blocker.first_name} {block.blocker.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {block.blocker.email}
                    </Typography>
                    <Box>
                      <Chip
                        icon={getUserTypeIcon(block.blocker.user_type)}
                        label={block.blocker.user_type}
                        size="small"
                        color={getUserTypeColor(block.blocker.user_type)}
                      />
                    </Box>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={2}>
                  <Avatar sx={{ width: 32, height: 32 }}>
                    {block.blocked_user.first_name[0]}{block.blocked_user.last_name[0]}
                  </Avatar>
                  <Box>
                    <Typography variant="body2" fontWeight={600}>
                      {block.blocked_user.first_name} {block.blocked_user.last_name}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      {block.blocked_user.email}
                    </Typography>
                    <Box>
                      <Chip
                        icon={getUserTypeIcon(block.blocked_user.user_type)}
                        label={block.blocked_user.user_type}
                        size="small"
                        color={getUserTypeColor(block.blocked_user.user_type)}
                      />
                    </Box>
                  </Box>
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2" sx={{ maxWidth: 200 }}>
                  {block.reason || 'No reason provided'}
                </Typography>
              </TableCell>
              <TableCell>
                <Box display="flex" alignItems="center" gap={1}>
                  <Switch
                    checked={block.is_active}
                    onChange={() => handleToggleBlockStatus(block)}
                    size="small"
                  />
                  <Chip
                    label={block.is_active ? 'Active' : 'Inactive'}
                    color={block.is_active ? 'success' : 'default'}
                    size="small"
                  />
                </Box>
              </TableCell>
              <TableCell>
                <Typography variant="body2">
                  {new Date(block.created_at).toLocaleDateString()}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(block.created_at).toLocaleTimeString()}
                </Typography>
              </TableCell>
              <TableCell>
                <IconButton
                  onClick={(e) => {
                    setAnchorEl(e.currentTarget);
                    setMenuBlockId(block.id);
                  }}
                >
                  <MoreVert />
                </IconButton>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <TablePagination
        rowsPerPageOptions={[10, 20, 50, 100]}
        component="div"
        count={pagination.total_items}
        rowsPerPage={pagination.items_per_page}
        page={pagination.current_page - 1}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
      />
    </TableContainer>
  );

  if (loading && blockedUsers.length === 0) {
    return (
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
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
          <Typography variant="h4" component="h1" gutterBottom>
            Blocked Users Management
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Comprehensive admin interface for managing user blocks and restrictions
          </Typography>
        </Box>

        {/* Statistics Cards */}
        {renderStatisticsCards()}

        {/* Action Bar */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box display="flex" alignItems="center" gap={2}>
            {selectedBlocks.length > 0 && (
              <Button
                variant="contained"
                color="warning"
                startIcon={<Edit />}
                onClick={() => setBulkActionDialogOpen(true)}
              >
                Bulk Actions ({selectedBlocks.length})
              </Button>
            )}
          </Box>
          
          <Box display="flex" alignItems="center" gap={2}>
            <Button
              variant="outlined"
              startIcon={<Refresh />}
              onClick={() => {
                loadBlockedUsers();
                loadStatistics();
              }}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<Download />}
              onClick={() => {
                // TODO: Implement export functionality
                toast('Export functionality coming soon');
              }}
            >
              Export
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        {renderFilters()}

        {/* Main Content */}
        <Box sx={{ mt: 3 }}>
          {blockedUsers.length === 0 && !loading ? (
            <Paper sx={{ p: 4, textAlign: 'center' }}>
              <Security sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" gutterBottom>
                No Blocked Users Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {filters.search || filters.blocker_type || filters.blocked_type || filters.is_active !== undefined
                  ? 'No blocked users match your current filters.'
                  : 'There are currently no blocked users in the system.'}
              </Typography>
            </Paper>
          ) : (
            renderBlocksTable()
          )}
        </Box>

        {/* Action Menu */}
        <Menu
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={() => {
            setAnchorEl(null);
            setMenuBlockId(null);
          }}
        >
          <MenuItem
            onClick={() => {
              const block = blockedUsers.find(b => b.id === menuBlockId);
              if (block) handleViewBlock(block);
              setAnchorEl(null);
              setMenuBlockId(null);
            }}
          >
            <ListItemIcon>
              <Visibility fontSize="small" />
            </ListItemIcon>
            <ListItemText>View Details</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              const block = blockedUsers.find(b => b.id === menuBlockId);
              if (block) handleEditBlock(block);
              setAnchorEl(null);
              setMenuBlockId(null);
            }}
          >
            <ListItemIcon>
              <Edit fontSize="small" />
            </ListItemIcon>
            <ListItemText>Edit Block</ListItemText>
          </MenuItem>
          <MenuItem
            onClick={() => {
              const block = blockedUsers.find(b => b.id === menuBlockId);
              if (block) {
                setSelectedBlock(block);
                setUnblockDialogOpen(true);
              }
              setAnchorEl(null);
              setMenuBlockId(null);
            }}
          >
            <ListItemIcon>
              <CheckCircle fontSize="small" />
            </ListItemIcon>
            <ListItemText>Unblock User</ListItemText>
          </MenuItem>
        </Menu>

        {/* View Block Dialog */}
        <Dialog
          open={viewDialogOpen}
          onClose={() => setViewDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Block Details</DialogTitle>
          <DialogContent>
            {selectedBlock && (
              <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Blocker Information</Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar>
                      {selectedBlock.blocker.first_name[0]}{selectedBlock.blocker.last_name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedBlock.blocker.first_name} {selectedBlock.blocker.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedBlock.blocker.email}
                      </Typography>
                      <Chip
                        icon={getUserTypeIcon(selectedBlock.blocker.user_type)}
                        label={selectedBlock.blocker.user_type}
                        size="small"
                        color={getUserTypeColor(selectedBlock.blocker.user_type)}
                      />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="h6" gutterBottom>Blocked User Information</Typography>
                  <Box display="flex" alignItems="center" gap={2} mb={2}>
                    <Avatar>
                      {selectedBlock.blocked_user.first_name[0]}{selectedBlock.blocked_user.last_name[0]}
                    </Avatar>
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {selectedBlock.blocked_user.first_name} {selectedBlock.blocked_user.last_name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedBlock.blocked_user.email}
                      </Typography>
                      <Chip
                        icon={getUserTypeIcon(selectedBlock.blocked_user.user_type)}
                        label={selectedBlock.blocked_user.user_type}
                        size="small"
                        color={getUserTypeColor(selectedBlock.blocked_user.user_type)}
                      />
                    </Box>
                  </Box>
                </Grid>

                <Grid item xs={12}>
                  <Divider sx={{ my: 2 }} />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Block Status
                  </Typography>
                  <Chip
                    label={selectedBlock.is_active ? 'Active' : 'Inactive'}
                    color={selectedBlock.is_active ? 'success' : 'default'}
                  />
                </Grid>

                <Grid item xs={12} md={6}>
                  <Typography variant="body2" color="text.secondary" gutterBottom>
                    Created Date
                  </Typography>
                  <Typography variant="body1">
                    {new Date(selectedBlock.created_at).toLocaleString()}
                  </Typography>
                </Grid>

                {selectedBlock.reason && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Reason
                    </Typography>
                    <Typography variant="body1">
                      {selectedBlock.reason}
                    </Typography>
                  </Grid>
                )}

                {selectedBlock.admin_notes && (
                  <Grid item xs={12}>
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      Admin Notes
                    </Typography>
                    <Typography variant="body1">
                      {selectedBlock.admin_notes}
                    </Typography>
                  </Grid>
                )}
              </Grid>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setViewDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        {/* Edit Block Dialog */}
        <Dialog
          open={editDialogOpen}
          onClose={() => setEditDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Edit Block</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              multiline
              rows={4}
              label="Admin Notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add admin notes about this block..."
              sx={{ mt: 2 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setEditDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              onClick={handleUpdateBlock}
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} /> : <Edit />}
            >
              {actionLoading ? 'Updating...' : 'Update Block'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Unblock Confirmation Dialog */}
        <Dialog
          open={unblockDialogOpen}
          onClose={() => setUnblockDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Unblock {selectedBlock?.blocked_user.first_name} {selectedBlock?.blocked_user.last_name}?
          </DialogTitle>
          <DialogContent>
            <Alert severity="warning" sx={{ mb: 2 }}>
              This will permanently remove the block and allow these users to interact again.
            </Alert>
            <TextField
              fullWidth
              multiline
              rows={3}
              label="Admin Notes (Optional)"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about why this block is being removed..."
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setUnblockDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleUnblockUser}
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} /> : <CheckCircle />}
            >
              {actionLoading ? 'Unblocking...' : 'Unblock User'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Bulk Action Dialog */}
        <Dialog
          open={bulkActionDialogOpen}
          onClose={() => setBulkActionDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Bulk Action on {selectedBlocks.length} Blocks</DialogTitle>
          <DialogContent>
            <FormControl fullWidth sx={{ mb: 3 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={bulkAction}
                label="Action"
                onChange={(e) => setBulkAction(e.target.value as 'activate' | 'deactivate' | 'delete')}
              >
                <MenuItem value="activate">Activate Blocks</MenuItem>
                <MenuItem value="deactivate">Deactivate Blocks</MenuItem>
                <MenuItem value="delete">Delete Blocks</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              multiline
              rows={3}
              label="Admin Notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              placeholder="Add notes about this bulk action..."
            />

            {bulkAction === 'delete' && (
              <Alert severity="error" sx={{ mt: 2 }}>
                Warning: This action cannot be undone. Deleted blocks will be permanently removed.
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setBulkActionDialogOpen(false)} disabled={actionLoading}>
              Cancel
            </Button>
            <Button
              variant="contained"
              color={bulkAction === 'delete' ? 'error' : 'primary'}
              onClick={handleBulkAction}
              disabled={actionLoading}
              startIcon={actionLoading ? <CircularProgress size={16} /> : <Edit />}
            >
              {actionLoading ? 'Processing...' : `${bulkAction.charAt(0).toUpperCase() + bulkAction.slice(1)} Blocks`}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default AdminBlockedUsersPage;
