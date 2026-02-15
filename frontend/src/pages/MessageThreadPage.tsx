import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Container,
  Paper,
  Box,
  Typography,
  TextField,
  IconButton,
  Avatar,
  Divider,
  Chip,
  Alert,
  CircularProgress,
  InputAdornment,
  Tooltip,
  Card,
  CardContent,
  Fade,
  Slide,
  Badge,
  Button,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Send as SendIcon,
  ArrowBack as ArrowBackIcon,
  AttachFile as AttachFileIcon,
  MoreVert as MoreVertIcon,
  Circle as CircleIcon,
  CheckCircle as CheckCircleIcon,
  Schedule as ScheduleIcon,
  Business as BusinessIcon,
  LocationOn as LocationOnIcon,
  AttachMoney as AttachMoneyIcon,
} from '@mui/icons-material';
import { format, isToday, isYesterday } from 'date-fns';
import toast from 'react-hot-toast';

import { connectionService, Message, Connection } from '../services/connection.service';
import { useAppSelector } from '../store';
import LoadingScreen from '../components/common/LoadingScreen';


interface MessageWithSender extends Message {
  sender_name?: string;
  sender_type?: string;
  is_own_message?: boolean;
}

const MessageThreadPage: React.FC = () => {
  const { connectionId } = useParams<{ connectionId: string }>();
  const navigate = useNavigate();
  const { user } = useAppSelector((state) => state.auth);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const theme = useTheme();

  const [connection, setConnection] = useState<Connection | null>(null);
  const [messages, setMessages] = useState<MessageWithSender[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sendingMessage, setSendingMessage] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMoreMessages, setHasMoreMessages] = useState(true);
  const [loadingMoreMessages, setLoadingMoreMessages] = useState(false);

  // Auto-scroll to bottom when new messages arrive
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Load connection details and initial messages
  const loadConnectionData = async () => {
    if (!connectionId) {
      setError('Connection ID is required');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load connection details
      const connectionResponse = await connectionService.getConnection(connectionId);
      
      if (connectionResponse.success && connectionResponse.data) {
        setConnection(connectionResponse.data);
      } else {
        setError('Failed to load connection details');
        setLoading(false);
        return;
      }

      // Load messages
      await loadMessages(1, true);
    } catch (err: unknown) {
      console.error('Error loading connection data:', err);
      setError((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to load conversation');
    } finally {
      setLoading(false);
    }
  };

  // Load messages with pagination
  const loadMessages = async (pageNum: number = 1, replace: boolean = false) => {
    if (!connectionId) return;

    try {
      if (pageNum > 1) {
        setLoadingMoreMessages(true);
      }

      const response = await connectionService.getConnectionMessages(connectionId, {
        page: pageNum,
        limit: 50
      });
      
      if (response.success && response.data) {
        const newMessages = response.data.messages.map((msg: Message) => ({
          ...msg,
          is_own_message: msg.sender_id === user?.id,
          // Use sender info from backend if available, otherwise fallback
          sender_name: msg.sender_name || (msg.sender_id === user?.id ? 'You' : getOtherPartyName()),
          sender_type: msg.sender_type || (msg.sender_id === user?.id ? user?.user_type : getOtherPartyType()),
        }));

        if (replace) {
          setMessages(newMessages);
        } else {
          setMessages(prev => [...newMessages, ...prev]);
        }

        setHasMoreMessages(response.data.messages.length === 50);
        setPage(pageNum);
      }
    } catch (err: unknown) {
      console.error('Error loading messages:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoadingMoreMessages(false);
    }
  };

  // Send a new message
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !connectionId || sendingMessage) return;

    try {
      setSendingMessage(true);
      
      const response = await connectionService.sendMessage(connectionId, {
        content: newMessage.trim(),
        message_type: 'text'
      });
      
      if (response.success && response.data) {
        const sentMessage: MessageWithSender = {
          ...response.data,
          is_own_message: true,
          sender_name: 'You',
          sender_type: user?.user_type,
        };

        setMessages(prev => [...prev, sentMessage]);
        setNewMessage('');
        
        // Update connection last activity
        if (connection) {
          setConnection(prev => prev ? {
            ...prev,
            last_activity: new Date().toISOString()
          } : null);
        }

        toast.success('Message sent');
        setTimeout(scrollToBottom, 100);
      }
    } catch (err: unknown) {
      console.error('Error sending message:', err);
      toast.error((err as { response?: { data?: { detail?: string } } })?.response?.data?.detail || 'Failed to send message');
    } finally {
      setSendingMessage(false);
    }
  };

  // Handle key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle connection approval/rejection
  const handleConnectionAction = async (action: 'approved' | 'rejected') => {
    if (!connection || !connectionId) return;

    try {
      const response = await connectionService.updateConnectionStatus(
        connectionId,
        action,
        action === 'approved' ? 'Connection approved!' : 'Connection rejected.'
      );

      if (response.success) {
        toast.success(`Connection ${action === 'approved' ? 'approved' : 'rejected'} successfully!`);
        
        // Update connection status
        setConnection(prev => prev ? { ...prev, status: action } : null);
      } else {
        toast.error(response.error?.message || `Failed to ${action} connection`);
      }
    } catch (error) {
      console.error(`Error ${action} connection:`, error);
      toast.error(`Failed to ${action} connection`);
    }
  };

  // Get other party name from connection
  const getOtherPartyName = (): string => {
    if (!connection) return 'Unknown';
    return connection.other_party?.name || 'Unknown User';
  };

  // Get other party type from connection
  const getOtherPartyType = (): string => {
    if (!connection) return 'unknown';
    return connection.other_party?.user_type || 'unknown';
  };

  // Format message timestamp
  const formatMessageTime = (timestamp: string): string => {
    const date = new Date(timestamp);
    
    if (isToday(date)) {
      return format(date, 'HH:mm');
    } else if (isYesterday(date)) {
      return `Yesterday ${format(date, 'HH:mm')}`;
    } else {
      return format(date, 'MMM d, HH:mm');
    }
  };

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'pending':
        return 'warning';
      case 'rejected':
        return 'error';
      default:
        return 'default';
    }
  };

  // Load data on component mount
  useEffect(() => {
    loadConnectionData();
  }, [connectionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Auto-refresh messages every 30 seconds
  useEffect(() => {
    if (!connectionId || !connection) return;

    const interval = setInterval(() => {
      // Only refresh if connection is active and user is not typing
      if (connection.status === 'approved') {
        loadMessages(1, true);
      }
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [connectionId, connection?.status]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return <LoadingScreen />;
  }

  if (error) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
        <IconButton onClick={() => navigate(-1)} sx={{ mb: 2 }}>
          <ArrowBackIcon />
        </IconButton>
      </Container>
    );
  }

  if (!connection) {
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="warning">Connection not found</Alert>
      </Container>
    );
  }

  return (
    <Box sx={{ 
      height: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.02)} 0%, ${alpha(theme.palette.secondary.main, 0.02)} 100%)`,
    }}>
      {/* Header */}
      <Paper 
        elevation={0} 
        sx={{ 
          p: 3, 
          flexShrink: 0,
          background: `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
          color: '#ffffff',
          borderRadius: 0,
        }}
      >
        <Container maxWidth="lg">
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 3 }}>
            <IconButton 
              onClick={() => navigate(-1)} 
              size="small"
              sx={{ 
                color: '#ffffff',
                bgcolor: alpha('#ffffff', 0.1),
                '&:hover': { bgcolor: alpha('#ffffff', 0.2) }
              }}
            >
              <ArrowBackIcon />
            </IconButton>
            
            <Badge
              overlap="circular"
              anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
              badgeContent={
                <Box sx={{ 
                  width: 12, 
                  height: 12, 
                  borderRadius: '50%', 
                  bgcolor: 'success.main',
                  border: '2px solid white'
                }} />
              }
            >
              <Avatar 
                sx={{ 
                  width: 56, 
                  height: 56,
                  bgcolor: alpha('#ffffff', 0.2),
                  color: '#ffffff',
                  fontSize: '1.5rem',
                  fontWeight: 600,
                  border: '3px solid rgba(255,255,255,0.2)'
                }}
              >
                {getOtherPartyName().charAt(0)}
              </Avatar>
            </Badge>
            
            <Box sx={{ flexGrow: 1 }}>
              <Typography variant="h5" sx={{ fontWeight: 700, mb: 0.5 }}>
                {getOtherPartyName()}
              </Typography>
              {connection.listing && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <BusinessIcon sx={{ fontSize: 16, opacity: 0.8 }} />
                  <Typography variant="body2" sx={{ opacity: 0.9 }}>
                    {connection.listing.title}
                    {connection.seller_initiated && ' (Seller Initiated)'}
                  </Typography>
                </Box>
              )}
            </Box>

            <Chip
              label={connection.status}
              color={getStatusColor(connection.status) as 'success' | 'warning' | 'error' | 'default'}
              size="medium"
              variant="filled"
              sx={{
                bgcolor: connection.status === 'approved' ? 'success.main' : 'warning.main',
                color: '#ffffff',
                fontWeight: 600,
                textTransform: 'capitalize',
                '& .MuiChip-icon': { color: '#ffffff' }
              }}
              icon={connection.status === 'approved' ? <CheckCircleIcon /> : <ScheduleIcon />}
            />

            <IconButton 
              size="small"
              sx={{ 
                color: '#ffffff',
                bgcolor: alpha('#ffffff', 0.1),
                '&:hover': { bgcolor: alpha('#ffffff', 0.2) }
              }}
            >
              <MoreVertIcon />
            </IconButton>
          </Box>

          {/* Connection Info Card */}
          {connection.listing && (
            <Fade in timeout={800}>
              <Card sx={{ 
                mt: 3, 
                bgcolor: alpha('#ffffff', 0.95),
                backdropFilter: 'blur(10px)',
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 2,
                overflow: 'hidden'
              }}>
                <CardContent sx={{ p: 3 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                    <BusinessIcon color="primary" />
                    <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary' }}>
                      {connection.listing.title}
                    </Typography>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Chip 
                        label={connection.listing.business_type.replace('_', ' ')}
                        size="small"
                        variant="outlined"
                        color="primary"
                        sx={{ textTransform: 'capitalize' }}
                      />
                    </Box>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                      <LocationOnIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
                      <Typography variant="body2" color="text.secondary">
                        {connection.listing.location}
                      </Typography>
                    </Box>
                    
                    {connection.listing.asking_price && (
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                        <AttachMoneyIcon sx={{ fontSize: 16, color: 'success.main' }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, color: 'success.main' }}>
                          £{parseFloat(connection.listing.asking_price.toString()).toLocaleString()}
                        </Typography>
                      </Box>
                    )}
                  </Box>
                </CardContent>
              </Card>
            </Fade>
          )}
        </Container>
      </Paper>

      {/* Messages Container */}
      <Container maxWidth="lg" sx={{ flexGrow: 1, display: 'flex', py: 2 }}>
        <Paper 
          elevation={0} 
          sx={{ 
            flexGrow: 1, 
            display: 'flex', 
            flexDirection: 'column',
            overflow: 'hidden',
            minHeight: 0,
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'divider',
            bgcolor: 'background.paper'
          }}
        >
          {/* Messages List */}
          <Box 
            sx={{ 
              flexGrow: 1, 
              overflow: 'auto', 
              p: 3,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
              background: `linear-gradient(180deg, ${alpha(theme.palette.grey[50], 0.3)} 0%, transparent 100%)`
            }}
          >
          {/* Load More Messages Button */}
          {hasMoreMessages && messages.length > 0 && (
            <Fade in>
              <Box sx={{ textAlign: 'center', mb: 3 }}>
                <Chip
                  label={loadingMoreMessages ? 'Loading...' : 'Load older messages'}
                  onClick={() => loadMessages(page + 1)}
                  disabled={loadingMoreMessages}
                  variant="outlined"
                  color="primary"
                  icon={loadingMoreMessages ? <CircularProgress size={16} /> : undefined}
                  sx={{ 
                    borderRadius: 3,
                    px: 2,
                    py: 1,
                    '&:hover': { bgcolor: alpha(theme.palette.primary.main, 0.1) }
                  }}
                />
              </Box>
            </Fade>
          )}

          {/* Initial Messages */}
          {connection.initial_message && (
            <Slide direction="up" in timeout={600}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    label="Initial Message" 
                    size="small" 
                    color="primary" 
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {format(new Date(connection.requested_at), 'MMM d, yyyy HH:mm')}
                  </Typography>
                </Box>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    background: `linear-gradient(135deg, ${alpha(theme.palette.primary.main, 0.08)} 0%, ${alpha(theme.palette.primary.main, 0.04)} 100%)`,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.primary.main, 0.2),
                    borderRadius: 3,
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: 'primary.main',
                      borderRadius: '0 2px 2px 0'
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {connection.initial_message}
                  </Typography>
                </Paper>
              </Box>
            </Slide>
          )}

          {connection.response_message && (
            <Slide direction="up" in timeout={800}>
              <Box sx={{ mb: 3 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
                  <Chip 
                    label="Response" 
                    size="small" 
                    color="success" 
                    variant="outlined"
                    sx={{ fontSize: '0.75rem' }}
                  />
                  <Typography variant="caption" color="text.secondary">
                    {connection.responded_at && format(new Date(connection.responded_at), 'MMM d, yyyy HH:mm')}
                  </Typography>
                </Box>
                <Paper 
                  elevation={0} 
                  sx={{ 
                    p: 3, 
                    background: `linear-gradient(135deg, ${alpha(theme.palette.success.main, 0.08)} 0%, ${alpha(theme.palette.success.main, 0.04)} 100%)`,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.success.main, 0.2),
                    borderRadius: 3,
                    position: 'relative',
                    '&::before': {
                      content: '""',
                      position: 'absolute',
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: 4,
                      bgcolor: 'success.main',
                      borderRadius: '0 2px 2px 0'
                    }
                  }}
                >
                  <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                    {connection.response_message}
                  </Typography>
                </Paper>
              </Box>
            </Slide>
          )}

          {messages.length > 0 && (
            <Box sx={{ display: 'flex', alignItems: 'center', my: 3 }}>
              <Divider sx={{ flexGrow: 1 }} />
              <Chip 
                label="Messages" 
                size="small" 
                variant="outlined" 
                sx={{ mx: 2, fontSize: '0.75rem' }}
              />
              <Divider sx={{ flexGrow: 1 }} />
            </Box>
          )}

          {/* No Messages State */}
          {messages.length === 0 && !connection.initial_message && !connection.response_message && (
            <Fade in timeout={1000}>
              <Box sx={{ 
                textAlign: 'center', 
                py: 8,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2
              }}>
                <Avatar sx={{ 
                  width: 64, 
                  height: 64, 
                  bgcolor: alpha(theme.palette.primary.main, 0.1),
                  color: 'primary.main'
                }}>
                  💬
                </Avatar>
                <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500 }}>
                  No messages yet
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Start the conversation and build your business relationship!
                </Typography>
              </Box>
            </Fade>
          )}

          {/* Regular Messages */}
          {messages.map((message, index) => (
            <Slide 
              key={message.id}
              direction={message.is_own_message ? 'left' : 'right'}
              in 
              timeout={300 + index * 100}
            >
              <Box
                sx={{
                  display: 'flex',
                  justifyContent: message.is_own_message ? 'flex-end' : 'flex-start',
                  mb: 2
                }}
              >
                <Box
                  sx={{
                    maxWidth: '75%',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: message.is_own_message ? 'flex-end' : 'flex-start'
                  }}
                >
                  <Paper
                    elevation={0}
                    sx={{
                      p: 2.5,
                      background: message.is_own_message 
                        ? `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`
                        : `linear-gradient(135deg, ${alpha(theme.palette.grey[100], 0.8)} 0%, ${alpha(theme.palette.grey[50], 0.8)} 100%)`,
                      color: message.is_own_message ? '#ffffff' : 'text.primary',
                      borderRadius: 3,
                      borderTopRightRadius: message.is_own_message ? 0.5 : 3,
                      borderTopLeftRadius: message.is_own_message ? 3 : 0.5,
                      border: message.is_own_message ? 'none' : '1px solid',
                      borderColor: alpha(theme.palette.grey[300], 0.5),
                      boxShadow: message.is_own_message 
                        ? `0 4px 12px ${alpha(theme.palette.primary.main, 0.3)}`
                        : `0 2px 8px ${alpha(theme.palette.grey[500], 0.1)}`,
                      position: 'relative',
                      '&::after': message.is_own_message ? {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        right: -8,
                        width: 0,
                        height: 0,
                        borderLeft: `8px solid ${theme.palette.primary.main}`,
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent'
                      } : {
                        content: '""',
                        position: 'absolute',
                        top: 0,
                        left: -8,
                        width: 0,
                        height: 0,
                        borderRight: `8px solid ${alpha(theme.palette.grey[100], 0.8)}`,
                        borderTop: '8px solid transparent',
                        borderBottom: '8px solid transparent'
                      }
                    }}
                  >
                    <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                      {message.content}
                    </Typography>
                  </Paper>
                  
                  <Box sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: 1, 
                    mt: 1,
                    px: 1
                  }}>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.75rem' }}>
                      {formatMessageTime(message.created_at)}
                    </Typography>
                    {message.is_own_message && (
                      <Tooltip title={message.is_read ? 'Read' : 'Delivered'}>
                        {message.is_read ? (
                          <CheckCircleIcon sx={{ fontSize: 12, color: 'success.main' }} />
                        ) : (
                          <CircleIcon sx={{ fontSize: 8, color: 'text.secondary' }} />
                        )}
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Box>
            </Slide>
          ))}

          <div ref={messagesEndRef} />
        </Box>

        {/* Message Input */}
        <Box sx={{ 
          p: 3, 
          borderTop: '1px solid', 
          borderColor: 'divider',
          background: `linear-gradient(180deg, transparent 0%, ${alpha(theme.palette.grey[50], 0.3)} 100%)`
        }}>
          {connection.status !== 'approved' ? (
            connection.status === 'pending' && connection.seller_initiated && user?.user_type === 'buyer' ? (
              <Box sx={{ textAlign: 'center' }}>
                <Alert 
                  severity="info" 
                  sx={{ 
                    borderRadius: 2,
                    border: '1px solid',
                    borderColor: alpha(theme.palette.info.main, 0.2),
                    bgcolor: alpha(theme.palette.info.main, 0.05),
                    mb: 2
                  }}
                >
                  This seller wants to connect with you. Would you like to approve this connection?
                </Alert>
                <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                  <Button
                    variant="contained"
                    color="success"
                    onClick={() => handleConnectionAction('approved')}
                    startIcon={<CheckCircleIcon />}
                  >
                    Approve Connection
                  </Button>
                  <Button
                    variant="outlined"
                    color="error"
                    onClick={() => handleConnectionAction('rejected')}
                    startIcon={<CircleIcon />}
                  >
                    Reject Connection
                  </Button>
                </Box>
              </Box>
            ) : (
              <Alert 
                severity="info" 
                sx={{ 
                  borderRadius: 2,
                  border: '1px solid',
                  borderColor: alpha(theme.palette.info.main, 0.2),
                  bgcolor: alpha(theme.palette.info.main, 0.05)
                }}
              >
                {connection.status === 'pending' 
                  ? 'Connection is pending approval. You can send messages once it\'s approved.'
                  : 'This connection has been rejected. You cannot send messages.'
                }
              </Alert>
            )
          ) : (
            <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-end' }}>
              <TextField
                fullWidth
                multiline
                maxRows={4}
                placeholder="Type your message..."
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={sendingMessage}
                variant="outlined"
                sx={{
                  '& .MuiOutlinedInput-root': {
                    borderRadius: 3,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: alpha(theme.palette.grey[300], 0.5),
                    '&:hover': {
                      borderColor: alpha(theme.palette.primary.main, 0.5),
                    },
                    '&.Mui-focused': {
                      borderColor: 'primary.main',
                      boxShadow: `0 0 0 2px ${alpha(theme.palette.primary.main, 0.1)}`,
                    },
                  },
                  '& .MuiOutlinedInput-input': {
                    py: 2,
                    px: 2.5,
                  }
                }}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Attach file (Coming soon)">
                        <IconButton 
                          size="small" 
                          disabled
                          sx={{ 
                            color: 'text.secondary',
                            '&:hover': { bgcolor: alpha(theme.palette.grey[500], 0.1) }
                          }}
                        >
                          <AttachFileIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
              />
              
              <IconButton
                onClick={handleSendMessage}
                disabled={!newMessage.trim() || sendingMessage}
                sx={{ 
                  width: 56,
                  height: 56,
                  background: !newMessage.trim() || sendingMessage 
                    ? alpha(theme.palette.grey[400], 0.3)
                    : `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`,
                  color: '#ffffff',
                  borderRadius: 3,
                  boxShadow: !newMessage.trim() || sendingMessage 
                    ? 'none'
                    : `0 4px 12px ${alpha(theme.palette.primary.main, 0.4)}`,
                  '&:hover': { 
                    background: !newMessage.trim() || sendingMessage 
                      ? alpha(theme.palette.grey[400], 0.3)
                      : `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 100%)`,
                    transform: !newMessage.trim() || sendingMessage ? 'none' : 'translateY(-2px)',
                    boxShadow: !newMessage.trim() || sendingMessage 
                      ? 'none'
                      : `0 6px 16px ${alpha(theme.palette.primary.main, 0.5)}`,
                  },
                  '&:disabled': { 
                    color: alpha(theme.palette.grey[500], 0.5),
                  },
                  transition: 'all 0.2s ease-in-out'
                }}
              >
                {sendingMessage ? (
                  <CircularProgress size={24} sx={{ color: '#ffffff' }} />
                ) : (
                  <SendIcon />
                )}
              </IconButton>
            </Box>
          )}
        </Box>
      </Paper>
    </Container>
    </Box>
  );
};

export default MessageThreadPage;
