import React, { useState } from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Stack,
  Divider,
  useTheme,
  useMediaQuery,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Business,
  Message,
  Person,
  Logout,
  Add,
  Search,
  Bookmark,
  History,
  Block,
  Assessment,
} from '@mui/icons-material';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';

import { useAppDispatch, useAppSelector } from '../../store';
import { logoutUser } from '../../store/slices/authSlice';
import { ROUTES } from '../../constants';
import NotificationCenter from '../common/NotificationCenter';

const Header: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const dispatch = useAppDispatch();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  
  const { user, isAuthenticated } = useAppSelector((state) => state.auth);
  
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser());
      handleProfileMenuClose();
      navigate(ROUTES.HOME);
    } catch (error) {
      console.error('Logout failed:', error);
      // Even if logout fails, navigate to home
      handleProfileMenuClose();
      navigate(ROUTES.HOME);
    }
  };

  const getNavigationItems = () => {
    if (!isAuthenticated) return [];

    // Base items for all authenticated users
    const baseItems: Array<{ label: string; path: string; icon: React.ReactElement }> = [
      { label: 'Dashboard', path: getDashboardRoute(), icon: <Dashboard /> },
    ];

    if (user?.user_type === 'seller') {
      // Sellers can only manage their own listings, not browse others
      return [
        ...baseItems,
        { label: 'My Practices', path: ROUTES.MY_LISTINGS, icon: <Business /> },
        { label: 'List Practice', path: ROUTES.CREATE_LISTING, icon: <Add /> },
        { label: 'Enquiry History', path: ROUTES.ENQUIRY_HISTORY, icon: <History /> },
        { label: 'Messages', path: ROUTES.MESSAGES, icon: <Message /> },
        { label: 'My Account', path: ROUTES.PROFILE, icon: <Person /> },
      ];
    }

    if (user?.user_type === 'buyer') {
      // Buyers can browse all practices and save them
      return [
        ...baseItems,
        { label: 'Browse Practices', path: ROUTES.LISTINGS, icon: <Business /> },
        { label: 'Saved Practices', path: ROUTES.SAVED_LISTINGS, icon: <Bookmark /> },
        { label: 'Enquiry History', path: ROUTES.ENQUIRY_HISTORY, icon: <History /> },
        { label: 'Messages', path: ROUTES.MESSAGES, icon: <Message /> },
        { label: 'My Account', path: ROUTES.PROFILE, icon: <Person /> },
      ];
    }

    if (user?.user_type === 'admin') {
      // Admin has access to everything
      return [
        { label: 'Admin Dashboard', path: ROUTES.ADMIN_DASHBOARD, icon: <Dashboard /> },
        { label: 'Analytics', path: ROUTES.ADMIN_ANALYTICS, icon: <Assessment /> },
        { label: 'Buyers', path: ROUTES.ADMIN_BUYERS, icon: <Person /> },
        { label: 'Sellers', path: ROUTES.ADMIN_SELLERS, icon: <Business /> },
        { label: 'All Listings', path: ROUTES.ADMIN_ALL_LISTINGS, icon: <Business /> },
        { label: 'Review Practices', path: ROUTES.ADMIN_LISTINGS, icon: <Business /> },
        { label: 'Manage Users', path: ROUTES.ADMIN_USERS, icon: <Person /> },
      ];
    }

    // Fallback for unknown user types
    return baseItems;
  };

  const getDashboardRoute = () => {
    switch (user?.user_type) {
      case 'admin': return ROUTES.ADMIN_DASHBOARD;
      case 'seller': return ROUTES.SELLER_DASHBOARD;
      case 'buyer': return ROUTES.BUYER_DASHBOARD;
      default: return ROUTES.HOME;
    }
  };

  const renderDesktopNavigation = () => (
    <Stack direction="row" spacing={2} alignItems="center">
      {getNavigationItems().map((item) => (
        <Button
          key={item.path}
          color="inherit"
          onClick={() => navigate(item.path)}
          sx={{
            fontWeight: location.pathname === item.path ? 600 : 400,
            borderBottom: location.pathname === item.path ? 2 : 0,
            borderColor: 'white',
            borderRadius: 0,
            px: 2,
          }}
        >
          {item.label}
        </Button>
      ))}
    </Stack>
  );

  const renderMobileNavigation = () => (
    <Drawer
      anchor="left"
      open={mobileMenuOpen}
      onClose={() => setMobileMenuOpen(false)}
    >
      <Box sx={{ width: 250, pt: 2 }}>
        <List>
          {getNavigationItems().map((item) => (
            <ListItem
              key={item.path}
              button
              onClick={() => {
                navigate(item.path);
                setMobileMenuOpen(false);
              }}
              selected={location.pathname === item.path}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          ))}
        </List>
      </Box>
    </Drawer>
  );

  const renderProfileMenu = () => (
    <Menu
      anchorEl={anchorEl}
      open={Boolean(anchorEl)}
      onClose={handleProfileMenuClose}
      anchorOrigin={{
        vertical: 'bottom',
        horizontal: 'right',
      }}
      transformOrigin={{
        vertical: 'top',
        horizontal: 'right',
      }}
    >
      <MenuItem onClick={() => { navigate(ROUTES.PROFILE); handleProfileMenuClose(); }}>
        <Person sx={{ mr: 2 }} />
        Profile
      </MenuItem>
      <MenuItem onClick={() => { navigate(ROUTES.BLOCKED_USERS); handleProfileMenuClose(); }}>
        <Block sx={{ mr: 2 }} />
        Blocked Users
      </MenuItem>
      <Divider />
      <MenuItem onClick={handleLogout}>
        <Logout sx={{ mr: 2 }} />
        Logout
      </MenuItem>
    </Menu>
  );

  return (
    <>
      <AppBar position="sticky" elevation={1}>
        <Toolbar>
          {/* Mobile Menu Button */}
          {isMobile && isAuthenticated && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={() => setMobileMenuOpen(true)}
              sx={{ mr: 2 }}
            >
              <MenuIcon />
            </IconButton>
          )}

          {/* Logo */}
          <motion.div
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                cursor: 'pointer',
                gap: 1
              }}
              onClick={() => navigate(ROUTES.HOME)}
            >
              <Box
                sx={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: 'linear-gradient(45deg, #fff 30%, #e3f2fd 90%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '1.2rem',
                  fontWeight: 700,
                  color: 'primary.main'
                }}
              >
                🏥
              </Box>
              <Typography
                variant="h5"
                sx={{
                  fontWeight: 700,
                  background: 'linear-gradient(45deg, #fff 30%, #e3f2fd 90%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}
              >
                CareAcquire
              </Typography>
            </Box>
          </motion.div>

          <Box sx={{ flexGrow: 1 }} />

          {/* Desktop Navigation */}
          {!isMobile && isAuthenticated && renderDesktopNavigation()}

          {/* Right Side Actions */}
          <Stack direction="row" spacing={1} alignItems="center">
            {isAuthenticated ? (
              <>
                {/* Search Button */}
                <IconButton color="inherit">
                  <Search />
                </IconButton>

                {/* Notifications */}
                <NotificationCenter />

                {/* Profile Avatar */}
                <IconButton onClick={handleProfileMenuOpen} sx={{ p: 0.5 }}>
                  <Avatar
                    sx={{
                      width: 36,
                      height: 36,
                      bgcolor: 'secondary.main',
                      fontSize: '0.9rem',
                    }}
                  >
                    {user?.email?.[0]?.toUpperCase()}
                  </Avatar>
                </IconButton>
              </>
            ) : (
              <>
                <Button
                  color="inherit"
                  onClick={() => navigate(ROUTES.LOGIN)}
                  sx={{ fontWeight: 600 }}
                >
                  Login
                </Button>
                <Button
                  variant="contained"
                  color="secondary"
                  onClick={() => navigate(ROUTES.REGISTER)}
                  sx={{ fontWeight: 600 }}
                >
                  Sign Up
                </Button>
              </>
            )}
          </Stack>
        </Toolbar>
      </AppBar>

      {/* Mobile Navigation Drawer */}
      {isMobile && renderMobileNavigation()}

      {/* Profile Menu */}
      {isAuthenticated && renderProfileMenu()}
    </>
  );
};

export default Header;
