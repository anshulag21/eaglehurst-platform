import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { Connection, Message } from '../../types';
import { apiService } from '../../services/api';

interface ConnectionState {
  connections: Connection[];
  currentConnection: Connection | null;
  messages: Message[];
  isLoading: boolean;
  isLoadingMessages: boolean;
  isSendingMessage: boolean;
  error: string | null;
}

const initialState: ConnectionState = {
  connections: [],
  currentConnection: null,
  messages: [],
  isLoading: false,
  isLoadingMessages: false,
  isSendingMessage: false,
  error: null,
};

// Async thunks
export const fetchConnections = createAsyncThunk(
  'connections/fetchConnections',
  async (_, { rejectWithValue }) => {
    try {
      const response = await apiService.get<{ connections: Connection[] }>('/connections');
      if (response.success && response.data) {
        return response.data.connections;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch connections');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch connections');
    }
  }
);

export const sendConnectionRequest = createAsyncThunk(
  'connections/sendConnectionRequest',
  async ({ listingId, message }: { listingId: string; message?: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.post('/connections', { listing_id: listingId, message });
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to send connection request');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send connection request');
    }
  }
);

export const updateConnectionStatus = createAsyncThunk(
  'connections/updateConnectionStatus',
  async ({ connectionId, status, message }: { connectionId: string; status: 'approved' | 'rejected'; message?: string }, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/connections/${connectionId}/status`, { 
        status, 
        response_message: message 
      });
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to update connection status');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update connection status');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'connections/fetchMessages',
  async ({ connectionId, page = 1, limit = 50 }: { connectionId: string; page?: number; limit?: number }, { rejectWithValue }) => {
    try {
      const response = await apiService.get<{ messages: Message[] }>(`/connections/${connectionId}/messages?page=${page}&limit=${limit}`);
      if (response.success && response.data) {
        return response.data.messages;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch messages');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'connections/sendMessage',
  async ({ connectionId, content, messageType = 'text' }: { connectionId: string; content: string; messageType?: 'text' | 'file' }, { rejectWithValue }) => {
    try {
      const response = await apiService.post<Message>(`/connections/${connectionId}/messages`, {
        content,
        message_type: messageType,
      });
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to send message');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

export const markMessageAsRead = createAsyncThunk(
  'connections/markMessageAsRead',
  async (messageId: string, { rejectWithValue }) => {
    try {
      const response = await apiService.put(`/messages/${messageId}/read`);
      if (response.success) {
        return messageId;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to mark message as read');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to mark message as read');
    }
  }
);

const connectionSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setCurrentConnection: (state, action) => {
      state.currentConnection = action.payload;
    },
    clearMessages: (state) => {
      state.messages = [];
    },
    addMessage: (state, action) => {
      state.messages.push(action.payload);
    },
    updateMessageStatus: (state, action) => {
      const { messageId, isRead } = action.payload;
      const message = state.messages.find(msg => msg.id === messageId);
      if (message) {
        message.is_read = isRead;
      }
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch connections
      .addCase(fetchConnections.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchConnections.fulfilled, (state, action) => {
        state.isLoading = false;
        state.connections = action.payload;
        state.error = null;
      })
      .addCase(fetchConnections.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Send connection request
      .addCase(sendConnectionRequest.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(sendConnectionRequest.fulfilled, (state, action) => {
        state.isLoading = false;
        state.connections.unshift(action.payload);
        state.error = null;
      })
      .addCase(sendConnectionRequest.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Update connection status
      .addCase(updateConnectionStatus.fulfilled, (state, action) => {
        const index = state.connections.findIndex(conn => conn.id === action.payload.id);
        if (index !== -1) {
          state.connections[index] = action.payload;
        }
        if (state.currentConnection?.id === action.payload.id) {
          state.currentConnection = action.payload;
        }
      })
      
      // Fetch messages
      .addCase(fetchMessages.pending, (state) => {
        state.isLoadingMessages = true;
        state.error = null;
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        state.isLoadingMessages = false;
        state.messages = action.payload.reverse(); // Show newest at bottom
        state.error = null;
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        state.isLoadingMessages = false;
        state.error = action.payload as string;
      })
      
      // Send message
      .addCase(sendMessage.pending, (state) => {
        state.isSendingMessage = true;
        state.error = null;
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSendingMessage = false;
        state.messages.push(action.payload);
        state.error = null;
      })
      .addCase(sendMessage.rejected, (state, action) => {
        state.isSendingMessage = false;
        state.error = action.payload as string;
      })
      
      // Mark message as read
      .addCase(markMessageAsRead.fulfilled, (state, action) => {
        const message = state.messages.find(msg => msg.id === action.payload);
        if (message) {
          message.is_read = true;
        }
      });
  },
});

export const { 
  clearError, 
  setCurrentConnection, 
  clearMessages, 
  addMessage, 
  updateMessageStatus 
} = connectionSlice.actions;

export default connectionSlice.reducer;
