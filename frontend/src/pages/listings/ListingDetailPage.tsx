import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  Container,
  Typography,
  Grid,
  Button,
  Chip,
  Box,
  Stack,
  IconButton,
  Paper,
  Skeleton,
  Divider,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  CircularProgress,
} from '@mui/material';
import {
  ArrowBack,
  LocationOn,
  Business,
  Share,
  Message,
  Edit,
  Delete,
  TrendingUp,
  Bookmark,
  BookmarkBorder,
  CalendarToday,
  ContentCopy,
  Facebook,
  Twitter,
  LinkedIn,
  WhatsApp,
  CheckCircle,
  Pending,
  Drafts,
  Block,
  Schedule,
  Close,
  NavigateBefore,
  NavigateNext,
  PhotoLibrary,
  Chat,
} from '@mui/icons-material';
import { useNavigate, useParams } from 'react-router-dom';
import { listingService } from '../../services/listing.service';
import { analyticsService } from '../../services/analytics.service';
import { connectionService } from '../../services/connection.service';
import { adminService } from '../../services/admin.service';
import { ROUTES, getImageUrl } from '../../constants';
import type { Listing, Connection } from '../../types';
import { useAppSelector, useAppDispatch } from '../../store';
import { saveListing, unsaveListing } from '../../store/slices/listingSlice';

import toast from 'react-hot-toast';

const statusConfig = {
  draft: {
    label: 'Draft',
    color: 'default' as const,
    icon: <Drafts />,
    description: 'Not yet submitted for review'
  },
  pending_approval: {
    label: 'Under Review',
    color: 'warning' as const,
    icon: <Pending />,
    description: 'Being reviewed by our team'
  },
  published: {
    label: 'Active',
    color: 'success' as const,
    icon: <CheckCircle />,
    description: 'Live and visible to buyers'
  },
  rejected: {
    label: 'Rejected',
    color: 'error' as const,
    icon: <Block />,
    description: 'Needs changes before approval'
  },
  archived: {
    label: 'Archived',
    color: 'default' as const,
    icon: <Schedule />,
    description: 'Listing has been archived'
  }
};

const ListingDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  
  const [listing, setListing] = useState<Listing | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [connectionDialogOpen, setConnectionDialogOpen] = useState(false);
  const [connectionMessage, setConnectionMessage] = useState('');
  const [sendingConnection, setSendingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<{
    has_connection: boolean;
    connection?: {
      id: string;
      status: string;
    };
    status?: string;
    connection_id?: string;
    can_connect?: boolean;
    reason?: string;
  } | null>(null);
  const [loadingConnectionStatus, setLoadingConnectionStatus] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [savingListing, setSavingListing] = useState(false);
  const [shareMenuAnchor, setShareMenuAnchor] = useState<null | HTMLElement>(null);
  const viewTrackedRef = useRef<string | null>(null); // Track which listing ID has been viewed
  
  // Admin-specific state
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [conversationDialogOpen, setConversationDialogOpen] = useState(false);
  
  const isAdmin = user?.user_type === 'admin';

  const loadConnectionStatus = useCallback(async (listingId: string) => {
    if (!user || user.user_type !== 'buyer') return;
    
    try {
      setLoadingConnectionStatus(true);
      const response = await connectionService.getConnectionStatus(listingId);
      if (response.success && response.data) {
        // Map the API response to the expected structure
        const statusData = {
          has_connection: response.data.has_connection,
          connection: response.data.connection,
          status: response.data.connection?.status,
          connection_id: response.data.connection?.id,
          can_connect: !response.data.has_connection,
          reason: response.data.has_connection ? undefined : 'No existing connection'
        };
        setConnectionStatus(statusData);
      }
    } catch (error) {
      console.error('Error loading connection status:', error);
    } finally {
      setLoadingConnectionStatus(false);
    }
  }, [user]);

  // Check if listing is saved
  const checkIfSaved = useCallback(async (listingId: string) => {
    if (!user || user.user_type !== 'buyer') return;
    
    try {
      const response = await analyticsService.isListingSaved(listingId);
      if (response.success && response.data) {
        setIsSaved(response.data.is_saved);
      }
    } catch (error) {
      console.error('Error checking if listing is saved:', error);
    }
  }, [user]);

  // Load connections for admin users
  const loadConnections = useCallback(async (listingId: string) => {
    if (!isAdmin) return;
    
    try {
      setLoadingConnections(true);
      const response = await adminService.getListingConnections(listingId);
      if (response.success && response.data) {
        setConnections(response.data.connections || []);
      }
    } catch (error) {
      console.error('Error loading connections:', error);
    } finally {
      setLoadingConnections(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (!id) return;

    // Redirect sellers to their own listing management - they shouldn't view other sellers' listings
    // But allow admin users to view any listing
    if (user?.user_type === 'seller' && !isAdmin) {
      navigate(ROUTES.MY_LISTINGS);
      return;
    }

    const loadListing = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Use admin service for admin users to get complete data
        const response = isAdmin 
          ? await adminService.getListingDetailsForAdmin(id)
          : await listingService.getListing(id);
        
        if (response.success && response.data) {
          setListing(response.data);
          
          // Only track view once per listing and only for authenticated users (B2B platform)
          // Don't track views for sellers viewing their own listings (unless admin)
          if (viewTrackedRef.current !== id && user && (user.user_type !== 'seller' || isAdmin)) {
            viewTrackedRef.current = id;
            // Track the view (fire and forget - don't wait for response)
            analyticsService.trackListingView(id).catch(err => {
              console.warn('Failed to track listing view:', err);
            });
          }
        } else {
          setError('Failed to load listing');
          toast.error('Failed to load listing');
        }
      } catch (err) {
        console.error('Error loading listing:', err);
        setError('Failed to load listing');
        toast.error('Failed to load listing');
      } finally {
        setLoading(false);
      }
    };

    loadListing();
    
    // Load connection status and saved status for buyers
    if (user?.user_type === 'buyer') {
      loadConnectionStatus(id);
      checkIfSaved(id);
    }
    
    // Load connections for admin users
    if (isAdmin) {
      loadConnections(id);
    }
  }, [id, user, isAdmin, loadConnectionStatus, checkIfSaved, loadConnections, navigate]);

  const handleEdit = () => {
    if (listing) {
      navigate(`${ROUTES.EDIT_LISTING.replace(':id', listing.id)}`);
    }
  };

  const handleDelete = async () => {
    if (!listing) return;
    
    try {
      const response = await listingService.deleteListing(listing.id);
      if (response.success) {
        toast.success('Listing deleted successfully');
        navigate(ROUTES.MY_LISTINGS);
      } else {
        toast.error('Failed to delete listing');
      }
    } catch (error) {
      console.error('Error deleting listing:', error);
      toast.error('Failed to delete listing');
    } finally {
      setDeleteDialogOpen(false);
    }
  };


  const handleConnectionRequest = async () => {
    if (!listing || !user) return;

    // Check if user is a buyer
    if (user.user_type !== 'buyer') {
      toast.error('Only buyers can send connection requests');
      return;
    }

    try {
      setSendingConnection(true);
      
      const response = await connectionService.createConnectionRequest({
        listing_id: listing.id,
        initial_message: connectionMessage.trim() || '',
      });

      if (response.success) {
        toast.success('Connection request sent successfully!');
        setConnectionDialogOpen(false);
        setConnectionMessage('');
        
        // Refresh connection status
        if (listing) {
          loadConnectionStatus(listing.id);
        }
      } else {
        toast.error(response.error?.message || 'Failed to send connection request');
      }
    } catch (error: unknown) {
      console.error('Error sending connection request:', error);
      const errorMessage = error instanceof Error ? error.message : 'Failed to send connection request';
      toast.error(errorMessage);
    } finally {
      setSendingConnection(false);
    }
  };

  // Handle save/unsave listing
  const handleSaveListing = async () => {
    if (!listing || !user || user.user_type !== 'buyer') return;

    try {
      setSavingListing(true);
      
      if (isSaved) {
        await dispatch(unsaveListing(listing.id)).unwrap();
        toast.success('Listing removed from saved');
        setIsSaved(false);
      } else {
        await dispatch(saveListing(listing.id)).unwrap();
        toast.success('Listing saved successfully');
        setIsSaved(true);
      }
    } catch (error) {
      console.error('Error saving/unsaving listing:', error);
      const errorMessage = isSaved ? 'Failed to remove listing from saved' : 'Failed to save listing';
      toast.error(errorMessage);
    } finally {
      setSavingListing(false);
    }
  };

  // Handle sharing functionality
  const handleShare = (event: React.MouseEvent<HTMLElement>) => {
    setShareMenuAnchor(event.currentTarget);
  };

  const handleShareClose = () => {
    setShareMenuAnchor(null);
  };

  const getListingUrl = () => {
    return `${window.location.origin}/listings/${listing?.id}`;
  };

  const getShareText = () => {
    if (!listing) return '';
    return `Check out this ${listing.business_type.replace('_', ' ')} opportunity: ${listing.title}`;
  };

  const handleNativeShare = async () => {
    if (!listing) return;
    
    if (navigator.share) {
      try {
        await navigator.share({
          title: listing.title,
          text: getShareText(),
          url: getListingUrl(),
        });
        handleShareClose();
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to copy to clipboard
        handleCopyLink();
      }
    } else {
      // Fallback to copy to clipboard
      handleCopyLink();
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(getListingUrl());
      toast.success('Link copied to clipboard!');
      handleShareClose();
    } catch (error) {
      console.error('Error copying to clipboard:', error);
      toast.error('Failed to copy link');
    }
  };

  const handleSocialShare = (platform: string) => {
    if (!listing) return;
    
    const url = encodeURIComponent(getListingUrl());
    const text = encodeURIComponent(getShareText());
    
    let shareUrl = '';
    
    switch (platform) {
      case 'facebook':
        shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${url}`;
        break;
      case 'twitter':
        shareUrl = `https://twitter.com/intent/tweet?text=${text}&url=${url}`;
        break;
      case 'linkedin':
        shareUrl = `https://www.linkedin.com/sharing/share-offsite/?url=${url}`;
        break;
      case 'whatsapp':
        shareUrl = `https://wa.me/?text=${text}%20${url}`;
        break;
      default:
        return;
    }
    
    window.open(shareUrl, '_blank', 'width=600,height=400');
    handleShareClose();
  };

  // Admin function to view conversation details
  const handleViewConversation = (connection: Connection) => {
    setSelectedConnection(connection);
    setConversationDialogOpen(true);
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-GB', {
      style: 'currency',
      currency: 'GBP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });
  };

  const renderConnectionButton = () => {
    if (!user || user.user_type !== 'buyer' || !listing) return null;

    if (loadingConnectionStatus) {
      return (
        <Button
          variant="contained"
          disabled
          fullWidth
        >
          Loading...
        </Button>
      );
    }

    if (!connectionStatus) {
      return (
        <Button
          variant="contained"
          startIcon={<Message />}
          onClick={() => {
            setConnectionMessage(`Hi, I'm interested in your listing "${listing.title}". I'd like to learn more about this opportunity.`);
            setConnectionDialogOpen(true);
          }}
          fullWidth
        >
          Connect with Seller
        </Button>
      );
    }

    if (connectionStatus.has_connection) {
      switch (connectionStatus.status) {
        case 'pending':
          return (
            <Button
              variant="outlined"
              disabled
              fullWidth
              sx={{ mt: 2 }}
              color="warning"
            >
              Connection Pending
            </Button>
          );
        case 'approved':
          return (
            <Button
              variant="contained"
              startIcon={<Chat />}
              onClick={() => navigate(`/messages/${connectionStatus.connection_id}`)}
              fullWidth
              sx={{ 
                mt: 2,
                bgcolor: 'success.main',
                '&:hover': { bgcolor: 'success.dark' }
              }}
            >
              Message Seller
            </Button>
          );
        case 'rejected':
          return (
            <Button
              variant="outlined"
              disabled
              fullWidth
              sx={{ mt: 2 }}
              color="error"
            >
              Connection Rejected
            </Button>
          );
        default:
          return null;
      }
    }

    if (connectionStatus.can_connect) {
      return (
        <Button
          variant="contained"
          startIcon={<Message />}
          onClick={() => {
            setConnectionMessage(`Hi, I'm interested in your listing "${listing.title}". I'd like to learn more about this opportunity.`);
            setConnectionDialogOpen(true);
          }}
          fullWidth
        >
          Connect with Seller
        </Button>
      );
    }

    return (
      <Button
        variant="outlined"
        disabled
        fullWidth
        sx={{ mt: 2 }}
        title={connectionStatus.reason || 'Cannot connect'}
      >
        {connectionStatus.reason === 'Connection limit reached' ? 'Limit Reached' : 'Cannot Connect'}
      </Button>
    );
  };

  if (loading) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Box sx={{ mb: 3 }}>
          <Skeleton variant="rectangular" width={100} height={40} />
        </Box>
        <Grid container spacing={4}>
          <Grid item xs={12} md={8}>
            <Skeleton variant="rectangular" width="100%" height={300} sx={{ mb: 3 }} />
            <Skeleton variant="text" width="80%" height={40} sx={{ mb: 2 }} />
            <Skeleton variant="text" width="100%" height={200} />
          </Grid>
          <Grid item xs={12} md={4}>
            <Skeleton variant="rectangular" width="100%" height={400} />
          </Grid>
        </Grid>
      </Container>
    );
  }

  if (error || !listing) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 3 }}>
          {error || 'Listing not found'}
        </Alert>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(ROUTES.MY_LISTINGS)}
        >
          Back to My Listings
        </Button>
      </Container>
    );
  }

  const config = statusConfig[listing.status as keyof typeof statusConfig] || statusConfig.draft;
  // For the public listing detail page, assume user is not the owner
  // Owners should use the SellerListingDetailPage from "My Listings"
  const isOwner = false;
  

  // Get all images (media_files or fallback to images array)
  const allImages = listing.media_files && listing.media_files.length > 0 
    ? listing.media_files.map(media => ({
        url: getImageUrl(media.file_url),
        caption: media.caption || '',
        isPrimary: media.is_primary
      }))
    : listing.images && listing.images.length > 0
    ? listing.images.map((url, index) => ({
        url: getImageUrl(url),
        caption: `${listing.title} - Image ${index + 1}`,
        isPrimary: index === 0
      }))
    : [
        // Mock images for demonstration
        {
          url: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          caption: 'Reception Area - Modern and welcoming entrance',
          isPrimary: true
        },
        {
          url: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1f?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          caption: 'Consultation Room - Fully equipped examination room',
          isPrimary: false
        },
        {
          url: 'https://images.unsplash.com/photo-1559757148-5c350d0d3c56?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          caption: 'Waiting Area - Comfortable seating for patients',
          isPrimary: false
        },
        {
          url: 'https://images.unsplash.com/photo-1582750433449-648ed127bb54?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          caption: 'Medical Equipment - State-of-the-art diagnostic tools',
          isPrimary: false
        },
        {
          url: 'https://images.unsplash.com/photo-1586773860418-d37222d8fce3?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80',
          caption: 'Exterior View - Professional building facade',
          isPrimary: false
        }
      ];

  const openLightbox = (index: number) => {
    setCurrentImageIndex(index);
    setLightboxOpen(true);
  };

  const closeLightbox = () => {
    setLightboxOpen(false);
  };

  const nextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % allImages.length);
  };

  const prevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + allImages.length) % allImages.length);
  };

  const renderImageGallery = () => {
    if (allImages.length === 0) return null;

    return (
      <Paper sx={{ mb: 3, overflow: 'hidden' }}>
        <Box sx={{ p: 3, pb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Typography variant="h6" sx={{ fontWeight: 600, display: 'flex', alignItems: 'center' }}>
              <PhotoLibrary sx={{ mr: 1, color: 'primary.main' }} />
              Practice Gallery
            </Typography>
            <Chip 
              label={`${allImages.length} ${allImages.length === 1 ? 'Photo' : 'Photos'}`}
              color="primary"
              variant="outlined"
              size="small"
            />
          </Box>
        </Box>

        {allImages.length === 1 ? (
          // Single image layout
          <Box sx={{ px: 3, pb: 3 }}>
            <Box
              sx={{
                position: 'relative',
                borderRadius: 2,
                overflow: 'hidden',
                cursor: 'pointer',
                '&:hover .image-overlay': {
                  opacity: 1,
                },
              }}
              onClick={() => openLightbox(0)}
            >
              <Box
                component="img"
                src={allImages[0].url}
                alt={allImages[0].caption}
                sx={{
                  width: '100%',
                  height: 400,
                  objectFit: 'cover',
                  display: 'block',
                }}
              />
              <Box
                className="image-overlay"
                sx={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  bgcolor: 'rgba(0, 0, 0, 0.3)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0,
                  transition: 'opacity 0.3s ease',
                }}
              >
                <Typography variant="h6" color="white" sx={{ fontWeight: 600 }}>
                  Click to view full size
                </Typography>
              </Box>
            </Box>
            {allImages[0].caption && (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1, px: 1 }}>
                {allImages[0].caption}
              </Typography>
            )}
          </Box>
        ) : (
          // Multiple images layout
          <Box sx={{ px: 3, pb: 3 }}>
            <Grid container spacing={2}>
              {/* Main image */}
              <Grid item xs={12} md={8}>
                <Box
                  sx={{
                    position: 'relative',
                    borderRadius: 2,
                    overflow: 'hidden',
                    cursor: 'pointer',
                    '&:hover .image-overlay': {
                      opacity: 1,
                    },
                  }}
                  onClick={() => openLightbox(0)}
                >
                  <Box
                    component="img"
                    src={allImages[0].url}
                    alt={allImages[0].caption}
                    sx={{
                      width: '100%',
                      height: { xs: 250, md: 350 },
                      objectFit: 'cover',
                      display: 'block',
                    }}
                  />
                  <Box
                    className="image-overlay"
                    sx={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      bgcolor: 'rgba(0, 0, 0, 0.3)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: 0,
                      transition: 'opacity 0.3s ease',
                    }}
                  >
                    <Typography variant="h6" color="white" sx={{ fontWeight: 600 }}>
                      View Gallery
                    </Typography>
                  </Box>
                  {allImages[0].isPrimary && (
                    <Chip
                      label="Primary"
                      color="primary"
                      size="small"
                      sx={{
                        position: 'absolute',
                        top: 12,
                        left: 12,
                        fontWeight: 600,
                      }}
                    />
                  )}
                </Box>
                {allImages[0].caption && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1, px: 1 }}>
                    {allImages[0].caption}
                  </Typography>
                )}
              </Grid>

              {/* Thumbnail grid */}
              <Grid item xs={12} md={4}>
                <Grid container spacing={1}>
                  {allImages.slice(1, 5).map((image, index) => (
                    <Grid item xs={6} key={index + 1}>
                      <Box
                        sx={{
                          position: 'relative',
                          borderRadius: 1,
                          overflow: 'hidden',
                          cursor: 'pointer',
                          '&:hover': {
                            opacity: 0.8,
                          },
                        }}
                        onClick={() => openLightbox(index + 1)}
                      >
                        <Box
                          component="img"
                          src={image.url}
                          alt={image.caption}
                          sx={{
                            width: '100%',
                            height: { xs: 80, md: 85 },
                            objectFit: 'cover',
                            display: 'block',
                          }}
                        />
                        {index === 3 && allImages.length > 5 && (
                          <Box
                            sx={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              right: 0,
                              bottom: 0,
                              bgcolor: 'rgba(0, 0, 0, 0.6)',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                            }}
                          >
                            <Typography variant="body2" color="white" sx={{ fontWeight: 600 }}>
                              +{allImages.length - 5}
                            </Typography>
                          </Box>
                        )}
                      </Box>
                    </Grid>
                  ))}
                </Grid>
              </Grid>
            </Grid>
          </Box>
        )}
      </Paper>
    );
  };

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 4 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(isOwner ? ROUTES.MY_LISTINGS : ROUTES.LISTINGS)}
          sx={{ color: 'text.secondary' }}
        >
          {isOwner ? 'Back to My Listings' : 'Back to Listings'}
        </Button>
        
        {isOwner && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            {listing.status === 'draft' && (
              <Button
                variant="outlined"
                startIcon={<Edit />}
                onClick={handleEdit}
              >
                Edit
              </Button>
            )}
            <Button
              variant="outlined"
              color="error"
              startIcon={<Delete />}
              onClick={() => setDeleteDialogOpen(true)}
            >
              Delete
            </Button>
          </Box>
        )}

      </Box>

      <Grid container spacing={4}>
        {/* Main Content */}
        <Grid item xs={12} md={8}>
          {/* Status Banner - Only visible to listing owner */}
          {isOwner && (
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'grey.50' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Chip
                  icon={config.icon}
                  label={config.label}
                  color={config.color}
                  size="medium"
                  sx={{ mr: 2 }}
                />
                <Typography variant="body2" color="text.secondary">
                  {config.description}
                </Typography>
              </Box>
              
              {listing.status === 'rejected' && (
                <Alert severity="warning" sx={{ mt: 2 }}>
                  This listing was rejected. Please review the feedback and make necessary changes before resubmitting.
                </Alert>
              )}
            </Paper>
          )}

          {/* Title and Basic Info */}
          <Box sx={{ mb: 4 }}>
            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 700 }}>
              {listing.title}
            </Typography>
            
            <Stack direction="row" spacing={3} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <LocationOn sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary">
                  {listing.location}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <Business sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary">
                  {listing.business_type}
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', alignItems: 'center' }}>
                <CalendarToday sx={{ fontSize: 20, mr: 1, color: 'text.secondary' }} />
                <Typography variant="body1" color="text.secondary">
                  Listed {formatDate(listing.created_at)}
                </Typography>
              </Box>
            </Stack>

            <Typography variant="h5" color="primary" sx={{ fontWeight: 600 }}>
              {/* Show price to admin users, connected buyers, or if user is not a buyer */}
              {(isAdmin || user?.user_type !== 'buyer' || (connectionStatus?.status === 'approved')) ? (
                listing.asking_price && listing.asking_price > 0 
                  ? formatPrice(listing.asking_price) 
                  : 'Price on request'
              ) : (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" color="text.secondary">
                    💰 Price available after connection
                  </Typography>
                </Box>
              )}
            </Typography>
          </Box>

          {/* Image Gallery */}
          {renderImageGallery()}

          {/* Description */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Description
            </Typography>
            <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
              {listing.description}
            </Typography>
          </Paper>

          {/* Business Summary - Gated behind connection */}
          {listing.business_summary && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                Business Summary
              </Typography>
              {(isAdmin || user?.user_type !== 'buyer' || (connectionStatus?.status === 'approved')) ? (
                <Typography variant="body1" sx={{ lineHeight: 1.7 }}>
                  {listing.business_summary}
                </Typography>
              ) : (
                <Box sx={{ 
                  p: 3, 
                  textAlign: 'center', 
                  backgroundColor: 'grey.50', 
                  borderRadius: 2,
                  border: '2px dashed',
                  borderColor: 'grey.300'
                }}>
                  <Typography variant="h6" color="text.secondary" gutterBottom>
                    🔒 Detailed Business Information
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    Connect with the seller to access comprehensive business details, financial information, and practice specifics.
                  </Typography>
                  <Button
                    variant="contained"
                    startIcon={<Message />}
                    onClick={() => {
                      setConnectionMessage(`Hi, I'm interested in your listing "${listing.title}". I'd like to learn more about this opportunity.`);
                      setConnectionDialogOpen(true);
                    }}
                    sx={{ mt: 1 }}
                  >
                    Connect to View Details
                  </Button>
                </Box>
              )}
            </Paper>
          )}

          {/* Admin-only Detailed Business Information */}
          {isAdmin && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                📊 Complete Business Details (Admin View)
              </Typography>
              
              <Grid container spacing={3}>
                {/* Financial Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    💰 Financial Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Asking Price
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {listing.asking_price ? formatPrice(listing.asking_price) : 'Not specified'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Annual Revenue
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {listing.financial_data?.annual_revenue || 
                           (listing as any).annual_revenue ? 
                           formatPrice(Number((listing as any).annual_revenue)) : 'Not disclosed'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'warning.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Net Profit
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {listing.financial_data?.net_profit || 
                           (listing as any).net_profit ? 
                           formatPrice(Number((listing as any).net_profit)) : 'Not disclosed'}
                        </Typography>
                      </Box>
                    </Grid>
                    {(listing as any).property_value && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, backgroundColor: 'secondary.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Property Value
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatPrice(Number((listing as any).property_value))}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                    {(listing as any).goodwill_valuation && (
                      <Grid item xs={12} sm={6}>
                        <Box sx={{ p: 2, backgroundColor: 'error.50', borderRadius: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Goodwill Valuation
                          </Typography>
                          <Typography variant="h6" sx={{ fontWeight: 600 }}>
                            {formatPrice(Number((listing as any).goodwill_valuation))}
                          </Typography>
                        </Box>
                      </Grid>
                    )}
                  </Grid>
                </Grid>

                {/* Practice Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    🏥 Practice Information
                  </Typography>
                  <Grid container spacing={2}>
                    {(listing.business_details?.practice_name || (listing as any).practice_name) && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Practice Name
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {listing.business_details?.practice_name || (listing as any).practice_name}
                        </Typography>
                      </Grid>
                    )}
                    {(listing.business_details?.practice_type || (listing as any).practice_type) && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Practice Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {listing.business_details?.practice_type || (listing as any).practice_type}
                        </Typography>
                      </Grid>
                    )}
                    {(listing.business_details?.premises_type || (listing as any).premises_type) && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Premises Type
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          {(listing.business_details?.premises_type || (listing as any).premises_type)?.charAt(0).toUpperCase() + 
                           (listing.business_details?.premises_type || (listing as any).premises_type)?.slice(1)}
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Grid>

                {/* NHS & Patient Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    🏥 NHS & Patient Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'primary.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          NHS Contract
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {(listing.business_details?.nhs_contract || (listing as any).nhs_contract) ? '✅ Yes' : '❌ No'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Patient List Size
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {(listing.business_details?.patient_list_size || 
                            listing.patient_list_size || 
                            (listing as any).patient_list_size)?.toLocaleString() || 'Not specified'}
                        </Typography>
                      </Box>
                    </Grid>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Private Patient Base
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {(listing.business_details?.private_patient_base || 
                            (listing as any).private_patient_base)?.toLocaleString() || 'Not specified'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Staff & Operations */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    👥 Staff & Operations
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Box sx={{ p: 2, backgroundColor: 'warning.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Staff Count
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {(listing.business_details?.staff_count || 
                            listing.staff_count || 
                            (listing as any).staff_count) || 'Not specified'}
                        </Typography>
                      </Box>
                    </Grid>
                    {(listing.business_details?.equipment_inventory || (listing as any).equipment_inventory) && (
                      <Grid item xs={12} sm={6}>
                        <Typography variant="body2" color="text.secondary">
                          Equipment Inventory
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500 }}>
                          Available (Click to view details)
                        </Typography>
                      </Grid>
                    )}
                  </Grid>
                </Grid>

                {/* Regulatory Information */}
                <Grid item xs={12}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                    📋 Regulatory Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'success.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          CQC Registered
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {(listing.business_details?.cqc_registered || (listing as any).cqc_registered) ? '✅ Yes' : '❌ No'}
                        </Typography>
                      </Box>
                    </Grid>
                    {(listing.business_details?.cqc_registration_number || (listing as any).cqc_registration_number) && (
                      <Grid item xs={12} sm={4}>
                        <Typography variant="body2" color="text.secondary">
                          CQC Registration Number
                        </Typography>
                        <Typography variant="body1" sx={{ fontWeight: 500, fontFamily: 'monospace' }}>
                          {listing.business_details?.cqc_registration_number || (listing as any).cqc_registration_number}
                        </Typography>
                      </Grid>
                    )}
                    <Grid item xs={12} sm={4}>
                      <Box sx={{ p: 2, backgroundColor: 'info.50', borderRadius: 1 }}>
                        <Typography variant="body2" color="text.secondary">
                          Professional Indemnity Insurance
                        </Typography>
                        <Typography variant="h6" sx={{ fontWeight: 600 }}>
                          {(listing.business_details?.professional_indemnity_insurance || 
                            (listing as any).professional_indemnity_insurance) ? '✅ Yes' : '❌ No'}
                        </Typography>
                      </Box>
                    </Grid>
                  </Grid>
                </Grid>

                {/* Additional Details */}
                {((listing.business_details?.nhs_contract_details || (listing as any).nhs_contract_details) ||
                  (listing.business_details?.insurance_details || (listing as any).insurance_details) ||
                  (listing.business_details?.lease_agreement_details || (listing as any).lease_agreement_details)) && (
                  <Grid item xs={12}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 2, color: 'primary.main' }}>
                      📄 Additional Details
                    </Typography>
                    <Stack spacing={2}>
                      {(listing.business_details?.nhs_contract_details || (listing as any).nhs_contract_details) && (
                        <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            NHS Contract Details
                          </Typography>
                          <Typography variant="body2">
                            {JSON.stringify(listing.business_details?.nhs_contract_details || (listing as any).nhs_contract_details)}
                          </Typography>
                        </Paper>
                      )}
                      {(listing.business_details?.insurance_details || (listing as any).insurance_details) && (
                        <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Insurance Details
                          </Typography>
                          <Typography variant="body2">
                            {JSON.stringify(listing.business_details?.insurance_details || (listing as any).insurance_details)}
                          </Typography>
                        </Paper>
                      )}
                      {(listing.business_details?.lease_agreement_details || (listing as any).lease_agreement_details) && (
                        <Paper sx={{ p: 2, backgroundColor: 'grey.50' }}>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                            Lease Agreement Details
                          </Typography>
                          <Typography variant="body2">
                            {JSON.stringify(listing.business_details?.lease_agreement_details || (listing as any).lease_agreement_details)}
                          </Typography>
                        </Paper>
                      )}
                    </Stack>
                  </Grid>
                )}
              </Grid>
            </Paper>
          )}

          {/* Admin-only Connections and Conversations Section */}
          {isAdmin && (
            <Paper sx={{ p: 3, mb: 3 }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
                🔗 Connections & Conversations
              </Typography>
              
              {loadingConnections ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                  <CircularProgress />
                </Box>
              ) : connections.length === 0 ? (
                <Alert severity="info" sx={{ mt: 2 }}>
                  No connections found for this listing.
                </Alert>
              ) : (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {connections.length} connection{connections.length !== 1 ? 's' : ''} found
                  </Typography>
                  
                  <Stack spacing={2}>
                    {connections.map((connection) => (
                      <Paper 
                        key={connection.id} 
                        sx={{ 
                          p: 2, 
                          border: '1px solid', 
                          borderColor: 'grey.200',
                          '&:hover': { borderColor: 'primary.main' }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
                          <Box sx={{ flex: 1 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                                {connection.other_party?.name || 'Unknown User'}
                              </Typography>
                              <Chip
                                label={connection.status}
                                size="small"
                                color={
                                  connection.status === 'approved' ? 'success' :
                                  connection.status === 'pending' ? 'warning' : 'error'
                                }
                              />
                              {connection.unread_messages > 0 && (
                                <Chip
                                  label={`${connection.unread_messages} unread`}
                                  size="small"
                                  color="primary"
                                  variant="outlined"
                                />
                              )}
                            </Box>
                            
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                              📧 {connection.other_party?.email}
                            </Typography>
                            
                            {connection.other_party?.phone && (
                              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                📞 {connection.other_party.phone}
                              </Typography>
                            )}
                            
                            <Typography variant="body2" color="text.secondary">
                              🕒 Requested: {formatDate(connection.requested_at)}
                            </Typography>
                            
                            {connection.responded_at && (
                              <Typography variant="body2" color="text.secondary">
                                ✅ Responded: {formatDate(connection.responded_at)}
                              </Typography>
                            )}
                          </Box>
                          
                          <Button
                            variant="outlined"
                            size="small"
                            startIcon={<Chat />}
                            onClick={() => handleViewConversation(connection)}
                          >
                            View Conversation
                          </Button>
                        </Box>
                        
                        {connection.initial_message && (
                          <Box sx={{ 
                            p: 2, 
                            backgroundColor: 'grey.50', 
                            borderRadius: 1,
                            borderLeft: '4px solid',
                            borderLeftColor: 'primary.main'
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Initial Message:
                            </Typography>
                            <Typography variant="body2">
                              "{connection.initial_message}"
                            </Typography>
                          </Box>
                        )}
                        
                        {connection.response_message && (
                          <Box sx={{ 
                            p: 2, 
                            mt: 1,
                            backgroundColor: 'success.50', 
                            borderRadius: 1,
                            borderLeft: '4px solid',
                            borderLeftColor: 'success.main'
                          }}>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                              Seller Response:
                            </Typography>
                            <Typography variant="body2">
                              "{connection.response_message}"
                            </Typography>
                          </Box>
                        )}
                        
                        {connection.last_message && (
                          <Box sx={{ mt: 1, p: 1, backgroundColor: 'info.50', borderRadius: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              Last message ({formatDate(connection.last_message.created_at)}): 
                            </Typography>
                            <Typography variant="body2" sx={{ fontStyle: 'italic' }}>
                              "{connection.last_message.content}"
                            </Typography>
                          </Box>
                        )}
                      </Paper>
                    ))}
                  </Stack>
                </Box>
              )}
            </Paper>
          )}

        </Grid>

        {/* Sidebar */}
        <Grid item xs={12} md={4}>
          {/* Action Card */}
          <Paper sx={{ p: 3, mb: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Actions
            </Typography>
            
            <Stack spacing={2}>
              {!isOwner && (
                <>
                  {renderConnectionButton()}
                  
                  <Button
                    variant="outlined"
                    fullWidth
                    startIcon={isSaved ? <Bookmark /> : <BookmarkBorder />}
                    onClick={handleSaveListing}
                    disabled={savingListing}
                  >
                    {savingListing ? 'Saving...' : (isSaved ? 'Saved' : 'Save Listing')}
                  </Button>
                </>
              )}
              
              <Button
                variant="outlined"
                fullWidth
                startIcon={<Share />}
                onClick={handleShare}
              >
                Share
              </Button>
              
            </Stack>
          </Paper>

          {/* Connection Status Info for Buyers (not shown to admin) */}
          {user?.user_type === 'buyer' && !isAdmin && connectionStatus?.status !== 'approved' && (
            <Paper sx={{ p: 3, mb: 3, backgroundColor: 'info.50', border: '1px solid', borderColor: 'info.200' }}>
              <Typography variant="h6" gutterBottom sx={{ fontWeight: 600, color: 'info.main' }}>
                🔐 Connect to Access Full Details
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                After connecting with the seller, you'll gain access to:
              </Typography>
              <Box component="ul" sx={{ pl: 2, m: 0 }}>
                <Typography component="li" variant="body2" color="text.secondary">
                  💰 Exact asking price and financial details
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  📍 Precise location and postcode
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  📊 Comprehensive business summary and performance data
                </Typography>
                <Typography component="li" variant="body2" color="text.secondary">
                  📞 Direct contact information
                </Typography>
              </Box>
            </Paper>
          )}

          {/* Listing Details */}
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom sx={{ fontWeight: 600 }}>
              Listing Details
            </Typography>
            
            <Stack spacing={2}>
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Listing ID
                </Typography>
                <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                  {listing.id.split('-')[0]}...
                </Typography>
              </Box>
              
              <Divider />
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Business Type
                </Typography>
                <Typography variant="body1">
                  {listing.business_type}
                </Typography>
              </Box>
              
              {listing.postcode && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Postcode
                    </Typography>
                    {(isAdmin || user?.user_type !== 'buyer' || (connectionStatus?.status === 'approved')) ? (
                      <Typography variant="body1">
                        {listing.postcode}
                      </Typography>
                    ) : (
                      <Typography variant="body1" color="text.secondary">
                        🔒 Available after connection
                      </Typography>
                    )}
                  </Box>
                </>
              )}
              
              {listing.region && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Region
                    </Typography>
                    <Typography variant="body1">
                      {listing.region}
                    </Typography>
                  </Box>
                </>
              )}
              
              <Divider />
              
              <Box>
                <Typography variant="body2" color="text.secondary">
                  Created
                </Typography>
                <Typography variant="body1">
                  {formatDate(listing.created_at)}
                </Typography>
              </Box>
              
              {listing.updated_at && (
                <>
                  <Divider />
                  <Box>
                    <Typography variant="body2" color="text.secondary">
                      Last Updated
                    </Typography>
                    <Typography variant="body1">
                      {formatDate(listing.updated_at)}
                    </Typography>
                  </Box>
                </>
              )}
            </Stack>
          </Paper>
        </Grid>
      </Grid>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onClose={() => setDeleteDialogOpen(false)}>
        <DialogTitle>Delete Listing</DialogTitle>
        <DialogContent>
          <Alert severity="warning" sx={{ mb: 2 }}>
            This action cannot be undone.
          </Alert>
          <Typography>
            Are you sure you want to delete "{listing.title}"? All associated data and inquiries will be permanently removed.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>


        {/* Connection Request Dialog */}
        <Dialog 
          open={connectionDialogOpen} 
          onClose={() => setConnectionDialogOpen(false)} 
          maxWidth="sm" 
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Message color="primary" />
              Connect with Seller
            </Box>
          </DialogTitle>
          <DialogContent>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
              Send a connection request to the seller of "{listing?.title}". 
              You can include an optional message to introduce yourself.
            </Typography>
            <TextField
              label="Message (Optional)"
              fullWidth
              multiline
              rows={4}
              placeholder="Hi, I'm interested in your listing and would like to learn more about the business..."
              value={connectionMessage}
              onChange={(e) => setConnectionMessage(e.target.value)}
              helperText="This message will be sent to the seller along with your connection request."
            />
          </DialogContent>
          <DialogActions>
            <Button 
              onClick={() => {
                setConnectionDialogOpen(false);
                setConnectionMessage('');
              }}
              disabled={sendingConnection}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleConnectionRequest} 
              variant="contained"
              disabled={sendingConnection}
              startIcon={sendingConnection ? undefined : <Message />}
            >
              {sendingConnection ? 'Sending...' : 'Send Request'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Image Lightbox Modal */}
        <Dialog
          open={lightboxOpen}
          onClose={closeLightbox}
          maxWidth={false}
          sx={{
            '& .MuiDialog-paper': {
              bgcolor: 'transparent',
              boxShadow: 'none',
              maxWidth: '95vw',
              maxHeight: '95vh',
            },
          }}
        >
          <Box
            sx={{
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80vh',
            }}
          >
            {/* Close button */}
            <IconButton
              onClick={closeLightbox}
              sx={{
                position: 'absolute',
                top: 20,
                right: 20,
                bgcolor: 'rgba(0, 0, 0, 0.5)',
                color: 'white',
                zIndex: 1,
                '&:hover': {
                  bgcolor: 'rgba(0, 0, 0, 0.7)',
                },
              }}
            >
              <Close />
            </IconButton>

            {/* Previous button */}
            {allImages.length > 1 && (
              <IconButton
                onClick={prevImage}
                sx={{
                  position: 'absolute',
                  left: 20,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  zIndex: 1,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <NavigateBefore />
              </IconButton>
            )}

            {/* Next button */}
            {allImages.length > 1 && (
              <IconButton
                onClick={nextImage}
                sx={{
                  position: 'absolute',
                  right: 20,
                  bgcolor: 'rgba(0, 0, 0, 0.5)',
                  color: 'white',
                  zIndex: 1,
                  '&:hover': {
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                  },
                }}
              >
                <NavigateNext />
              </IconButton>
            )}

            {/* Main image */}
            <Box
              sx={{
                maxWidth: '90vw',
                maxHeight: '80vh',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <Box
                component="img"
                src={allImages[currentImageIndex]?.url}
                alt={allImages[currentImageIndex]?.caption}
                sx={{
                  maxWidth: '100%',
                  maxHeight: '70vh',
                  objectFit: 'contain',
                  borderRadius: 2,
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)',
                }}
              />
              
              {/* Image info */}
              <Box
                sx={{
                  mt: 2,
                  p: 2,
                  bgcolor: 'rgba(0, 0, 0, 0.8)',
                  borderRadius: 1,
                  maxWidth: '80vw',
                }}
              >
                <Typography variant="body1" color="white" align="center">
                  {allImages[currentImageIndex]?.caption}
                </Typography>
                {allImages.length > 1 && (
                  <Typography variant="caption" color="rgba(255, 255, 255, 0.7)" align="center" display="block" sx={{ mt: 0.5 }}>
                    {currentImageIndex + 1} of {allImages.length}
                  </Typography>
                )}
              </Box>
            </Box>
          </Box>
        </Dialog>

        {/* Share Menu */}
        <Menu
          anchorEl={shareMenuAnchor}
          open={Boolean(shareMenuAnchor)}
          onClose={handleShareClose}
          anchorOrigin={{
            vertical: 'top',
            horizontal: 'center',
          }}
          transformOrigin={{
            vertical: 'bottom',
            horizontal: 'center',
          }}
        >
          {typeof navigator !== 'undefined' && 'share' in navigator && (
            <MenuItem onClick={handleNativeShare}>
              <ListItemIcon>
                <Share fontSize="small" />
              </ListItemIcon>
              <ListItemText>Share via device</ListItemText>
            </MenuItem>
          )}
          
          <MenuItem onClick={handleCopyLink}>
            <ListItemIcon>
              <ContentCopy fontSize="small" />
            </ListItemIcon>
            <ListItemText>Copy link</ListItemText>
          </MenuItem>
          
          <Divider />
          
          <MenuItem onClick={() => handleSocialShare('facebook')}>
            <ListItemIcon>
              <Facebook fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share on Facebook</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleSocialShare('twitter')}>
            <ListItemIcon>
              <Twitter fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share on Twitter</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleSocialShare('linkedin')}>
            <ListItemIcon>
              <LinkedIn fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share on LinkedIn</ListItemText>
          </MenuItem>
          
          <MenuItem onClick={() => handleSocialShare('whatsapp')}>
            <ListItemIcon>
              <WhatsApp fontSize="small" />
            </ListItemIcon>
            <ListItemText>Share on WhatsApp</ListItemText>
          </MenuItem>
        </Menu>

        {/* Admin Conversation Dialog */}
        <Dialog
          open={conversationDialogOpen}
          onClose={() => setConversationDialogOpen(false)}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Chat color="primary" />
              Conversation Details
              {selectedConnection && (
                <Chip
                  label={selectedConnection.status}
                  size="small"
                  color={
                    selectedConnection.status === 'approved' ? 'success' :
                    selectedConnection.status === 'pending' ? 'warning' : 'error'
                  }
                />
              )}
            </Box>
          </DialogTitle>
          <DialogContent>
            {selectedConnection && (
              <Box>
                {/* Connection Info */}
                <Paper sx={{ p: 2, mb: 3, backgroundColor: 'grey.50' }}>
                  <Typography variant="h6" gutterBottom>
                    Connection Information
                  </Typography>
                  <Grid container spacing={2}>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Buyer
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedConnection.other_party?.name}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedConnection.other_party?.email}
                      </Typography>
                      {selectedConnection.other_party?.phone && (
                        <Typography variant="body2" color="text.secondary">
                          {selectedConnection.other_party.phone}
                        </Typography>
                      )}
                    </Grid>
                    <Grid item xs={12} sm={6}>
                      <Typography variant="body2" color="text.secondary">
                        Status
                      </Typography>
                      <Typography variant="body1" sx={{ fontWeight: 500 }}>
                        {selectedConnection.status}
                      </Typography>
                      <Typography variant="body2" color="text.secondary">
                        Requested: {formatDate(selectedConnection.requested_at)}
                      </Typography>
                      {selectedConnection.responded_at && (
                        <Typography variant="body2" color="text.secondary">
                          Responded: {formatDate(selectedConnection.responded_at)}
                        </Typography>
                      )}
                    </Grid>
                  </Grid>
                </Paper>

                {/* Messages */}
                <Typography variant="h6" gutterBottom>
                  Conversation History
                </Typography>
                
                {selectedConnection.messages && selectedConnection.messages.length > 0 ? (
                  <Stack spacing={2} sx={{ maxHeight: 400, overflowY: 'auto' }}>
                    {selectedConnection.messages.map((message: any) => (
                      <Paper
                        key={message.id}
                        sx={{
                          p: 2,
                          backgroundColor: message.sender_id === selectedConnection.buyer_id ? 'primary.50' : 'success.50',
                          borderLeft: '4px solid',
                          borderLeftColor: message.sender_id === selectedConnection.buyer_id ? 'primary.main' : 'success.main'
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {message.sender_name}
                          </Typography>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography variant="caption" color="text.secondary">
                              {formatDate(message.created_at)}
                            </Typography>
                            {!message.is_read && (
                              <Chip label="Unread" size="small" color="primary" />
                            )}
                          </Box>
                        </Box>
                        <Typography variant="body2">
                          {message.content}
                        </Typography>
                      </Paper>
                    ))}
                  </Stack>
                ) : (
                  <Alert severity="info">
                    No messages in this conversation yet.
                  </Alert>
                )}
              </Box>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setConversationDialogOpen(false)}>
              Close
            </Button>
          </DialogActions>
        </Dialog>
      </Container>
    );
  };
  
  export default ListingDetailPage;