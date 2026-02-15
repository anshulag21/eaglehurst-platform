import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Badge,
  Popover,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Avatar,
  Typography,
  Box,
  Button,
  Divider,
  Stack,
  Chip,
} from '@mui/material';
import {
  Notifications,
  Business,
  Message,
  CheckCircle,
  Warning,
  Info,
  Error,
  MarkEmailRead,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

import { useAppDispatch, useAppSelector } from '../../store';
import { fetchNotifications, markNotificationAsRead, markAllNotificationsAsRead } from '../../store/slices/notificationSlice';
import type { Notification } from '../../types';

const NotificationCenter: React.FC = () => {
  const dispatch = useAppDispatch();
  const { notifications, unreadCount, isLoading } = useAppSelector((state) => state.notifications);
  
  const [anchorEl, setAnchorEl] = useState<HTMLButtonElement | null>(null);
  const open = Boolean(anchorEl);

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = (notificationId: string) => {
    dispatch(markNotificationAsRead(notificationId));
  };

  const handleMarkAllAsRead = () => {
    dispatch(markAllNotificationsAsRead());
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'connection_request':
        return <Business sx={{ color: 'primary.main' }} />;
      case 'message':
        return <Message sx={{ color: 'info.main' }} />;
      case 'listing_approved':
        return <CheckCircle sx={{ color: 'success.main' }} />;
      case 'listing_rejected':
        return <Error sx={{ color: 'error.main' }} />;
      case 'subscription_expiring':
        return <Warning sx={{ color: 'warning.main' }} />;
      default:
        return <Info sx={{ color: 'info.main' }} />;
    }
  };

  const getNotificationColor = (type: string) => {
    switch (type) {
      case 'connection_request': return 'primary';
      case 'message': return 'info';
      case 'listing_approved': return 'success';
      case 'listing_rejected': return 'error';
      case 'subscription_expiring': return 'warning';
      default: return 'default';
    }
  };

  return (
    <>
      <IconButton
        onClick={handleClick}
        sx={{ color: 'inherit' }}
      >
        <Badge badgeContent={unreadCount} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
        PaperProps={{
          sx: { width: 400, maxHeight: 500 }
        }}
      >
        <Box sx={{ p: 2 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Notifications
            </Typography>
            {unreadCount > 0 && (
              <Button
                size="small"
                onClick={handleMarkAllAsRead}
                startIcon={<MarkEmailRead />}
              >
                Mark all read
              </Button>
            )}
          </Stack>

          {notifications.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Notifications sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <List sx={{ p: 0, maxHeight: 350, overflow: 'auto' }}>
              <AnimatePresence>
                {notifications.map((notification, index) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 20 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                  >
                    <ListItem
                      sx={{
                        bgcolor: notification.is_read ? 'transparent' : 'action.hover',
                        borderRadius: 1,
                        mb: 1,
                        cursor: 'pointer',
                        '&:hover': {
                          bgcolor: 'action.selected',
                        },
                      }}
                      onClick={() => !notification.is_read && handleMarkAsRead(notification.id)}
                    >
                      <ListItemAvatar>
                        <Avatar sx={{ bgcolor: 'transparent' }}>
                          {getNotificationIcon(notification.type)}
                        </Avatar>
                      </ListItemAvatar>
                      <ListItemText
                        primary={
                          <Stack direction="row" alignItems="center" spacing={1}>
                            <Typography
                              variant="subtitle2"
                              sx={{
                                fontWeight: notification.is_read ? 400 : 600,
                                flex: 1,
                              }}
                            >
                              {notification.title}
                            </Typography>
                            {!notification.is_read && (
                              <Chip
                                size="small"
                                label="New"
                                color={getNotificationColor(notification.type) as any}
                                sx={{ height: 20 }}
                              />
                            )}
                          </Stack>
                        }
                        secondary={
                          <Box>
                            <Typography
                              variant="body2"
                              color="text.secondary"
                              sx={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                mb: 0.5,
                              }}
                            >
                              {notification.message}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {formatDistanceToNow(new Date(notification.created_at), { addSuffix: true })}
                            </Typography>
                          </Box>
                        }
                      />
                    </ListItem>
                    {index < notifications.length - 1 && <Divider />}
                  </motion.div>
                ))}
              </AnimatePresence>
            </List>
          )}

          {notifications.length > 0 && (
            <>
              <Divider sx={{ my: 2 }} />
              <Button fullWidth variant="outlined" onClick={handleClose}>
                View All Notifications
              </Button>
            </>
          )}
        </Box>
      </Popover>
    </>
  );
};

export default NotificationCenter;
