import React, { useState, useEffect, useRef } from 'react';
import {
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  Box,
  Stack,
  Avatar,
  IconButton,
  TextField,
  InputAdornment,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemButton,
  Divider,
  Badge,
  Chip,
  Button,
  Paper,
} from '@mui/material';
import {
  Send,
  Search,
  AttachFile,
  MoreVert,
  Business,
  Circle,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import { formatDistanceToNow } from 'date-fns';

import { useAppDispatch, useAppSelector } from '../store';
import { fetchConnections, fetchMessages, sendMessage } from '../store/slices/connectionSlice';
import { connectionService } from '../services/connection.service';
import type { Connection, Message } from '../types';
import toast from 'react-hot-toast';

const MessagesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { connections, messages, currentConnection, isLoadingMessages, isSendingMessage } = useAppSelector((state) => state.connections);
  const { user } = useAppSelector((state) => state.auth);
  
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);
  const [messageText, setMessageText] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    dispatch(fetchConnections());
  }, [dispatch]);

  useEffect(() => {
    if (selectedConnection) {
      dispatch(fetchMessages({ connectionId: selectedConnection.id }));
    }
  }, [dispatch, selectedConnection]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!messageText.trim() || !selectedConnection) return;
    
    try {
      await dispatch(sendMessage({
        connectionId: selectedConnection.id,
        content: messageText,
      }));
      setMessageText('');
    } catch (error) {
      console.error('Failed to send message:', error);
    }
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const handleConnectionAction = async (action: 'approved' | 'rejected') => {
    if (!selectedConnection) return;

    try {
      const response = await connectionService.updateConnectionStatus(
        selectedConnection.id,
        action,
        action === 'approved' ? 'Connection approved!' : 'Connection rejected.'
      );

      if (response.success) {
        toast.success(`Connection ${action === 'approved' ? 'approved' : 'rejected'} successfully!`);
        
        // Update the selected connection status
        setSelectedConnection(prev => prev ? { ...prev, status: action } : null);
        
        // Refresh connections list
        dispatch(fetchConnections());
      } else {
        toast.error(response.error?.message || `Failed to ${action} connection`);
      }
    } catch (error) {
      console.error(`Error ${action} connection:`, error);
      toast.error(`Failed to ${action} connection`);
    }
  };

  const filteredConnections = connections.filter(connection =>
    connection.other_party.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (connection.listing?.title || 'Direct Connection').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved': return 'success';
      case 'pending': return 'warning';
      case 'rejected': return 'error';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return <CheckCircle sx={{ fontSize: 16 }} />;
      case 'pending': return <Schedule sx={{ fontSize: 16 }} />;
      case 'rejected': return <Circle sx={{ fontSize: 16 }} />;
      default: return <Circle sx={{ fontSize: 16 }} />;
    }
  };

  const renderConnectionList = () => (
    <Card sx={{ height: '100%' }}>
      <CardContent sx={{ p: 0 }}>
        {/* Search */}
        <Box sx={{ p: 2 }}>
          <TextField
            fullWidth
            size="small"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Search />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <Divider />

        {/* Connections List */}
        <List sx={{ p: 0, maxHeight: 600, overflow: 'auto' }}>
          {filteredConnections.map((connection) => (
            <ListItemButton
              key={connection.id}
              selected={selectedConnection?.id === connection.id}
              onClick={() => setSelectedConnection(connection)}
              sx={{
                borderLeft: selectedConnection?.id === connection.id ? 3 : 0,
                borderColor: 'primary.main',
              }}
            >
              <ListItemAvatar>
                <Avatar>
                  <Business />
                </Avatar>
              </ListItemAvatar>
              <ListItemText
                primary={
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {connection.other_party.name}
                    </Typography>
                    <Chip
                      size="small"
                      label={connection.status}
                      color={getStatusColor(connection.status) as any}
                      icon={getStatusIcon(connection.status)}
                      sx={{ height: 20 }}
                    />
                  </Stack>
                }
                secondary={
                  <Box>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                      {connection.listing?.title || 'Direct Connection'}
                      {connection.seller_initiated && (
                        <Chip 
                          size="small" 
                          label="Seller Initiated" 
                          color="info" 
                          sx={{ ml: 1, height: 16, fontSize: '0.65rem' }} 
                        />
                      )}
                    </Typography>
                    {connection.last_message && (
                      <Typography variant="body2" sx={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: 200,
                      }}>
                        {connection.last_message.content}
                      </Typography>
                    )}
                  </Box>
                }
              />
              <Box sx={{ textAlign: 'right' }}>
                {connection.last_message && (
                  <Typography variant="caption" color="text.secondary">
                    {formatDistanceToNow(new Date(connection.last_message.timestamp), { addSuffix: true })}
                  </Typography>
                )}
                <Badge badgeContent={0} color="primary" sx={{ display: 'block', mt: 0.5 }} />
              </Box>
            </ListItemButton>
          ))}
        </List>

        {filteredConnections.length === 0 && (
          <Box sx={{ p: 4, textAlign: 'center' }}>
            <Business sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary">
              No conversations yet
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Start connecting with buyers or sellers to begin messaging
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );

  const renderMessageArea = () => {
    if (!selectedConnection) {
      return (
        <Card sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Box sx={{ textAlign: 'center', p: 4 }}>
            <Business sx={{ fontSize: 80, color: 'text.disabled', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
              Select a conversation
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Choose a conversation from the list to start messaging
            </Typography>
          </Box>
        </Card>
      );
    }

    return (
      <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        {/* Chat Header */}
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Stack direction="row" alignItems="center" spacing={2}>
              <Avatar>
                <Business />
              </Avatar>
              <Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>
                  {selectedConnection.other_party.name}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {selectedConnection.listing?.title || 'Direct Connection'}
                  {selectedConnection.seller_initiated && ' (Seller Initiated)'}
                </Typography>
              </Box>
            </Stack>
            <Stack direction="row" spacing={1}>
              <Chip
                label={selectedConnection.status}
                color={getStatusColor(selectedConnection.status) as any}
                icon={getStatusIcon(selectedConnection.status)}
                size="small"
              />
              <IconButton>
                <MoreVert />
              </IconButton>
            </Stack>
          </Stack>
        </Box>

        {/* Messages Area */}
        <Box sx={{ flexGrow: 1, overflow: 'auto', p: 2, maxHeight: 400 }}>
          <AnimatePresence>
            {messages.map((message, index) => {
              const isOwnMessage = message.sender_id === user?.id;
              return (
                <motion.div
                  key={message.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                >
                  <Box
                    sx={{
                      display: 'flex',
                      justifyContent: isOwnMessage ? 'flex-end' : 'flex-start',
                      mb: 2,
                    }}
                  >
                    <Paper
                      sx={{
                        p: 2,
                        maxWidth: '70%',
                        backgroundColor: isOwnMessage ? 'primary.main' : 'grey.100',
                        color: isOwnMessage ? 'white' : 'text.primary',
                        borderRadius: 2,
                        borderBottomRightRadius: isOwnMessage ? 0 : 2,
                        borderBottomLeftRadius: isOwnMessage ? 2 : 0,
                      }}
                    >
                      <Typography variant="body2">
                        {message.content}
                      </Typography>
                      <Typography
                        variant="caption"
                        sx={{
                          display: 'block',
                          mt: 1,
                          opacity: 0.7,
                        }}
                      >
                        {formatDistanceToNow(new Date(message.created_at), { addSuffix: true })}
                      </Typography>
                    </Paper>
                  </Box>
                </motion.div>
              );
            })}
          </AnimatePresence>
          <div ref={messagesEndRef} />
        </Box>

        {/* Message Input */}
        {selectedConnection.status === 'approved' ? (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <Stack direction="row" spacing={1} alignItems="flex-end">
              <TextField
                fullWidth
                multiline
                maxRows={3}
                placeholder="Type your message..."
                value={messageText}
                onChange={(e) => setMessageText(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={isSendingMessage}
              />
              <IconButton>
                <AttachFile />
              </IconButton>
              <Button
                variant="contained"
                onClick={handleSendMessage}
                disabled={!messageText.trim() || isSendingMessage}
                sx={{ minWidth: 'auto', p: 1.5 }}
              >
                <Send />
              </Button>
            </Stack>
          </Box>
        ) : (
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider', textAlign: 'center' }}>
            {selectedConnection.status === 'pending' ? (
              selectedConnection.seller_initiated && user?.user_type === 'buyer' ? (
                <Box>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    This seller wants to connect with you. Would you like to approve this connection?
                  </Typography>
                  <Stack direction="row" spacing={2} justifyContent="center">
                    <Button
                      variant="contained"
                      color="success"
                      onClick={() => handleConnectionAction('approved')}
                      size="small"
                    >
                      Approve
                    </Button>
                    <Button
                      variant="outlined"
                      color="error"
                      onClick={() => handleConnectionAction('rejected')}
                      size="small"
                    >
                      Reject
                    </Button>
                  </Stack>
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  Connection request is pending approval
                </Typography>
              )
            ) : (
              <Typography variant="body2" color="text.secondary">
                Connection request was not approved
              </Typography>
            )}
          </Box>
        )}
      </Card>
    );
  };

  return (
    <Container maxWidth="xl" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ fontWeight: 700, mb: 4 }}>
        Messages
      </Typography>

      <Grid container spacing={3} sx={{ height: 'calc(100vh - 200px)' }}>
        {/* Connections List */}
        <Grid item xs={12} md={4}>
          {renderConnectionList()}
        </Grid>

        {/* Message Area */}
        <Grid item xs={12} md={8}>
          {renderMessageArea()}
        </Grid>
      </Grid>
    </Container>
  );
};

export default MessagesPage;