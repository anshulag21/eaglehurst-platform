import React, { useState, useEffect } from 'react';
import {
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Typography,
  Box,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  Block,
  CheckCircle,
} from '@mui/icons-material';
import toast from 'react-hot-toast';

import { blockingService, BlockStatusResponse } from '../../services/blocking.service';

interface UserBlockingActionsProps {
  userId: string;
  userName: string;
  variant?: 'button' | 'menu-item';
  onBlockStatusChange?: (isBlocked: boolean) => void;
}

const UserBlockingActions: React.FC<UserBlockingActionsProps> = ({
  userId,
  userName,
  variant = 'button',
  onBlockStatusChange,
}) => {
  const [blockStatus, setBlockStatus] = useState<BlockStatusResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [blockDialogOpen, setBlockDialogOpen] = useState(false);
  const [unblockDialogOpen, setUnblockDialogOpen] = useState(false);
  const [blockReason, setBlockReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Load block status on component mount
  useEffect(() => {
    loadBlockStatus();
  }, [userId]);

  const loadBlockStatus = async () => {
    try {
      setLoading(true);
      const response = await blockingService.checkBlockStatus(userId);
      if (response.success && response.data) {
        setBlockStatus(response.data);
      }
    } catch (error) {
      console.error('Error loading block status:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleBlockUser = async () => {
    try {
      setActionLoading(true);
      const response = await blockingService.blockUser({
        blocked_user_id: userId,
        reason: blockReason.trim() || undefined,
      });

      if (response.success) {
        toast.success(`${userName} has been blocked`);
        setBlockDialogOpen(false);
        setBlockReason('');
        await loadBlockStatus();
        onBlockStatusChange?.(true);
      } else {
        toast.error('Failed to block user');
      }
    } catch (error) {
      console.error('Error blocking user:', error);
      toast.error('Failed to block user');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnblockUser = async () => {
    try {
      setActionLoading(true);
      const response = await blockingService.unblockUser({
        blocked_user_id: userId,
      });

      if (response.success) {
        toast.success(`${userName} has been unblocked`);
        setUnblockDialogOpen(false);
        await loadBlockStatus();
        onBlockStatusChange?.(false);
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

  if (loading) {
    return <CircularProgress size={20} />;
  }

  if (!blockStatus) {
    return null;
  }

  const isCurrentUserBlocked = blockStatus.user1_blocks_user2;

  const BlockButton = () => (
    <Button
      variant={isCurrentUserBlocked ? "outlined" : "contained"}
      color={isCurrentUserBlocked ? "success" : "error"}
      startIcon={isCurrentUserBlocked ? <CheckCircle /> : <Block />}
      onClick={isCurrentUserBlocked ? () => setUnblockDialogOpen(true) : () => setBlockDialogOpen(true)}
      size="small"
    >
      {isCurrentUserBlocked ? 'Unblock User' : 'Block User'}
    </Button>
  );

  return (
    <>
      {variant === 'button' && <BlockButton />}
      
      {/* Block User Dialog */}
      <Dialog
        open={blockDialogOpen}
        onClose={() => setBlockDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Block {userName}?</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2 }}>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Blocking this user will prevent them from:
            </Typography>
            <Box component="ul" sx={{ pl: 2, mb: 2 }}>
              <Typography component="li" variant="body2">
                Sending you connection requests
              </Typography>
              <Typography component="li" variant="body2">
                Messaging you through the platform
              </Typography>
            </Box>
            <Alert severity="info" sx={{ mb: 2 }}>
              The user will not be notified that they have been blocked.
            </Alert>
          </Box>
          
          <TextField
            fullWidth
            label="Reason for blocking (optional)"
            multiline
            rows={3}
            value={blockReason}
            onChange={(e) => setBlockReason(e.target.value)}
            placeholder="e.g., Inappropriate behavior, spam, harassment..."
            helperText="This reason is for your records only and will not be shared with the user."
          />
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setBlockDialogOpen(false)}
            disabled={actionLoading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="error"
            onClick={handleBlockUser}
            disabled={actionLoading}
            startIcon={actionLoading ? <CircularProgress size={16} /> : <Block />}
          >
            {actionLoading ? 'Blocking...' : 'Block User'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Unblock User Dialog */}
      <Dialog
        open={unblockDialogOpen}
        onClose={() => setUnblockDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Unblock {userName}?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will allow {userName} to send you connection requests and messages again.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button 
            onClick={() => setUnblockDialogOpen(false)}
            disabled={actionLoading}
          >
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
    </>
  );
};

export default UserBlockingActions;
