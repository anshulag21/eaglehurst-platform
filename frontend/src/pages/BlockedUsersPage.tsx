import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Card,
  CardContent,
  Box,
  Avatar,
  Button,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Grid,
  Paper,
} from '@mui/material';
import {
  Block,
  CheckCircle,
  Person,
  Business,
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

import { blockingService, BlockedUser } from '../services/blocking.service';

const BlockedUsersPage: React.FC = () => {
  const [blockedUsers, setBlockedUsers] = useState<BlockedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<BlockedUser | null>(null);
  const [unblockLoading, setUnblockLoading] = useState(false);

  useEffect(() => {
    loadBlockedUsers();
  }, []);

  const loadBlockedUsers = async () => {
    try {
      setLoading(true);
      const response = await blockingService.getBlockedUsers();
      if (response.success && response.data) {
        setBlockedUsers(response.data.blocked_users);
      }
    } catch (error) {
      console.error('Error loading blocked users:', error);
      toast.error('Failed to load blocked users');
    } finally {
      setLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    if (!selectedUser) return;

    try {
      setUnblockLoading(true);
      const response = await blockingService.unblockUser({
        blocked_user_id: selectedUser.id,
      });

      if (response.success) {
        toast.success(`${selectedUser.first_name} ${selectedUser.last_name} has been unblocked`);
        setUnblockDialogOpen(false);
        setSelectedUser(null);
        await loadBlockedUsers();
      } else {
        toast.error('Failed to unblock user');
      }
    } catch (error) {
      console.error('Error unblocking user:', error);
      toast.error('Failed to unblock user');
    } finally {
      setUnblockLoading(false);
    }
  };

  const getUserTypeIcon = (userType: string) => {
    return userType === 'seller' ? <Business /> : <Person />;
  };

  const getUserTypeColor = (userType: string) => {
    return userType === 'seller' ? 'primary' : 'secondary';
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
          <CircularProgress />
        </Box>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Box sx={{ mb: 4 }}>
          <Typography variant="h4" component="h1" gutterBottom>
            Blocked Users
          </Typography>
          <Typography variant="body1" color="text.secondary">
            Manage users you have blocked from contacting you
          </Typography>
        </Box>

        {blockedUsers.length === 0 ? (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Block sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              No Blocked Users
            </Typography>
            <Typography variant="body2" color="text.secondary">
              You haven't blocked any users yet.
            </Typography>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {blockedUsers.map((user, index) => (
              <Grid item xs={12} md={6} lg={4} key={user.id}>
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <Card sx={{ height: '100%' }}>
                    <CardContent>
                      <Stack spacing={2}>
                        <Box display="flex" alignItems="center" gap={2}>
                          <Avatar sx={{ width: 48, height: 48 }}>
                            {user.first_name[0]}{user.last_name[0]}
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="h6" noWrap>
                              {user.first_name} {user.last_name}
                            </Typography>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {user.email}
                            </Typography>
                          </Box>
                        </Box>

                        <Box>
                          <Chip
                            icon={getUserTypeIcon(user.user_type)}
                            label={user.user_type.charAt(0).toUpperCase() + user.user_type.slice(1)}
                            color={getUserTypeColor(user.user_type) as 'primary' | 'secondary'}
                            size="small"
                          />
                        </Box>

                        {user.reason && (
                          <Box>
                            <Typography variant="caption" color="text.secondary">
                              Reason:
                            </Typography>
                            <Typography variant="body2">
                              {user.reason}
                            </Typography>
                          </Box>
                        )}

                        <Box>
                          <Typography variant="caption" color="text.secondary">
                            Blocked on: {new Date(user.blocked_at).toLocaleDateString()}
                          </Typography>
                        </Box>

                        <Button
                          variant="outlined"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => {
                            setSelectedUser(user);
                            setUnblockDialogOpen(true);
                          }}
                          fullWidth
                        >
                          Unblock User
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </Grid>
        )}

        {/* Unblock Confirmation Dialog */}
        <Dialog
          open={unblockDialogOpen}
          onClose={() => setUnblockDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>
            Unblock {selectedUser?.first_name} {selectedUser?.last_name}?
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary">
              This will allow this user to send you connection requests and messages again.
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => setUnblockDialogOpen(false)}
              disabled={unblockLoading}
            >
              Cancel
            </Button>
            <Button
              variant="contained"
              color="success"
              onClick={handleUnblockUser}
              disabled={unblockLoading}
              startIcon={unblockLoading ? <CircularProgress size={16} /> : <CheckCircle />}
            >
              {unblockLoading ? 'Unblocking...' : 'Unblock User'}
            </Button>
          </DialogActions>
        </Dialog>
      </motion.div>
    </Container>
  );
};

export default BlockedUsersPage;
