import React from 'react';
import {
  Alert,
  AlertTitle,
  Box,
  IconButton,
  Collapse,
} from '@mui/material';
import { Close } from '@mui/icons-material';
import { useAppSelector, useAppDispatch } from '../../store';
import { clearNotification } from '../../store/slices/authSlice';

interface NotificationBannerProps {
  className?: string;
}

const NotificationBanner: React.FC<NotificationBannerProps> = ({ className }) => {
  const dispatch = useAppDispatch();
  const notification = useAppSelector((state) => state.auth.notification);

  const handleClose = () => {
    dispatch(clearNotification());
  };

  if (!notification || !notification.show_on_login) {
    return null;
  }

  return (
    <Box className={className} sx={{ mb: 2 }}>
      <Collapse in={!!notification}>
        <Alert
          severity={notification.type}
          action={
            <IconButton
              aria-label="close"
              color="inherit"
              size="small"
              onClick={handleClose}
            >
              <Close fontSize="inherit" />
            </IconButton>
          }
          sx={{
            '& .MuiAlert-message': {
              width: '100%',
            },
          }}
        >
          <AlertTitle sx={{ fontWeight: 600 }}>
            {notification.title}
          </AlertTitle>
          {notification.message}
        </Alert>
      </Collapse>
    </Box>
  );
};

export default NotificationBanner;
