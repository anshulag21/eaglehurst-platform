import React, { useState, useEffect } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Button,
  Box,
  Stack,
  Avatar,
  Chip,
  TextField,
  Divider,
  LinearProgress,
} from '@mui/material';
import {
  Edit,
  Verified,
  Business,
  Email,
  Phone,
  CreditCard,
  Block,
  VerifiedUser,
} from '@mui/icons-material';
import { motion } from 'framer-motion';

import { useAppSelector, useAppDispatch } from '../store';
import { getCurrentUser } from '../store/slices/authSlice';
import { USER_TYPE_LABELS, ROUTES } from '../constants';
import { useNavigate } from 'react-router-dom';

// Interface for the actual API response structure
interface ActualUserProfile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone: string;
  user_type: 'buyer' | 'seller';
  is_verified?: boolean;
  is_active?: boolean;
  last_login?: string;
  created_at?: string;
  updated_at?: string;
  buyer_profile?: {
    verification_status: 'pending' | 'approved' | 'rejected';
    preferences?: Record<string, unknown>;
  };
  seller_profile?: {
    business_name?: string;
    verification_status: 'pending' | 'approved' | 'rejected';
  };
}

const ProfilePage: React.FC = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user, profile, isLoading } = useAppSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);

  // Load profile data when component mounts
  useEffect(() => {
    if (user && !profile) {
      dispatch(getCurrentUser());
    }
  }, [dispatch, user, profile]);

  const profileCompleteness = () => {
    if (!profile) return 0;
    const actualProfile = profile as ActualUserProfile;
    const fields = [
      actualProfile.first_name,
      actualProfile.last_name,
      actualProfile.phone,
      actualProfile.email,
    ];
    
    // Add business name for sellers
    if (actualProfile.user_type === 'seller' && actualProfile.seller_profile) {
      fields.push(actualProfile.seller_profile.business_name || '');
    }
    
    const completedFields = fields.filter(field => field && field.trim() !== '').length;
    return Math.round((completedFields / fields.length) * 100);
  };

  // Show loading state while fetching profile
  if (isLoading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4, textAlign: 'center' }}>
        <Typography>Loading profile...</Typography>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Grid container spacing={4}>
        <Grid item xs={12} md={4}>
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardContent sx={{ textAlign: 'center', p: 4 }}>
                <Avatar
                  sx={{
                    width: 120,
                    height: 120,
                    fontSize: '3rem',
                    bgcolor: 'primary.main',
                    mx: 'auto',
                    mb: 2,
                  }}
                >
                  {profile?.first_name?.[0]}{profile?.last_name?.[0]}
                </Avatar>

                <Typography variant="h5" sx={{ fontWeight: 600, mb: 1 }}>
                  {profile?.first_name} {profile?.last_name}
                </Typography>
                
                <Chip
                  label={USER_TYPE_LABELS[user?.user_type as keyof typeof USER_TYPE_LABELS]}
                  color="primary"
                  sx={{ mb: 2 }}
                />

                <Stack direction="row" alignItems="center" justifyContent="center" spacing={1} sx={{ mb: 2 }}>
                  <Verified sx={{ fontSize: 20, color: 'success.main' }} />
                  <Typography variant="body2" color="success.main">
                    Verified Account
                  </Typography>
                </Stack>

                <Box sx={{ mb: 3 }}>
                  <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                      Profile Completeness
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {profileCompleteness()}%
                    </Typography>
                  </Stack>
                  <LinearProgress
                    variant="determinate"
                    value={profileCompleteness()}
                    sx={{ borderRadius: 1, height: 8 }}
                  />
                </Box>

                <Button
                  fullWidth
                  variant="outlined"
                  startIcon={<Edit />}
                  onClick={() => setIsEditing(!isEditing)}
                >
                  {isEditing ? 'Cancel' : 'Edit Profile'}
                </Button>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>

        <Grid item xs={12} md={8}>
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  Profile Information
                </Typography>

                <Grid container spacing={3}>
                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="First Name"
                      value={profile?.first_name || ''}
                      disabled={!isEditing}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Last Name"
                      value={profile?.last_name || ''}
                      disabled={!isEditing}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Email Address"
                      value={profile?.email || ''}
                      disabled
                      InputProps={{
                        startAdornment: <Email sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>

                  <Grid item xs={12} sm={6}>
                    <TextField
                      fullWidth
                      label="Phone Number"
                      value={profile?.phone || ''}
                      disabled={!isEditing}
                      InputProps={{
                        startAdornment: <Phone sx={{ mr: 1, color: 'text.secondary' }} />,
                      }}
                    />
                  </Grid>

                  {user?.user_type === 'seller' && (
                    <>
                      <Grid item xs={12}>
                        <Divider sx={{ my: 2 }} />
                        <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>
                          Business Information
                        </Typography>
                      </Grid>

                      <Grid item xs={12}>
                        <TextField
                          fullWidth
                          label="Business Name"
                          value={(profile as ActualUserProfile)?.seller_profile?.business_name || ''}
                          disabled={!isEditing}
                          InputProps={{
                            startAdornment: <Business sx={{ mr: 1, color: 'text.secondary' }} />,
                          }}
                        />
                      </Grid>
                    </>
                  )}
                </Grid>

                {isEditing && (
                  <Box sx={{ mt: 3, textAlign: 'right' }}>
                    <Button variant="contained" sx={{ mr: 2 }}>
                      Save Changes
                    </Button>
                    <Button variant="outlined" onClick={() => setIsEditing(false)}>
                      Cancel
                    </Button>
                  </Box>
                )}
              </CardContent>
            </Card>
          </motion.div>
          
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card sx={{ mt: 3 }}>
              <CardContent sx={{ p: 4 }}>
                <Typography variant="h5" sx={{ fontWeight: 600, mb: 3 }}>
                  Account Management
                </Typography>
                
                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<CreditCard />}
                      onClick={() => navigate(ROUTES.PROFILE_SUBSCRIPTION)}
                      sx={{ py: 1.5 }}
                    >
                      Subscription
                    </Button>
                  </Grid>
                  
                  
                  <Grid item xs={12} sm={6} md={4}>
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Block />}
                      onClick={() => navigate(ROUTES.BLOCKED_USERS)}
                      sx={{ py: 1.5 }}
                    >
                      Blocked Users
                    </Button>
                  </Grid>
                  
                  {user?.user_type === 'seller' && (
                    <Grid item xs={12} sm={6} md={4}>
                      <Button
                        fullWidth
                        variant="outlined"
                        startIcon={<VerifiedUser />}
                        onClick={() => navigate(ROUTES.KYC_UPLOAD)}
                        sx={{ py: 1.5 }}
                      >
                        KYC Documents
                      </Button>
                    </Grid>
                  )}
                </Grid>
              </CardContent>
            </Card>
          </motion.div>
        </Grid>
      </Grid>
    </Container>
  );
};

export default ProfilePage;
