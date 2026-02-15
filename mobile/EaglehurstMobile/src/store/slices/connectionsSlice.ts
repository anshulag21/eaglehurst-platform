/**
 * Connections Slice
 * Connections and messages state management
 */

import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { connectionsAPI } from '../../api';
import { Connection, Message } from '../../types';

interface ConnectionsState {
  items: Connection[];
  currentConnection: Connection | null;
  messages: { [connectionId: string]: Message[] };
  isLoading: boolean;
  error: string | null;
  stats: {
    total_connections: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
  };
}

const initialState: ConnectionsState = {
  items: [],
  currentConnection: null,
  messages: {},
  isLoading: false,
  error: null,
  stats: {
    total_connections: 0,
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
  },
};

// Async Thunks
export const fetchConnections = createAsyncThunk(
  'connections/fetchConnections',
  async (filters: any = {}, { rejectWithValue }) => {
    try {
      const response = await connectionsAPI.getUserConnections(filters);

      if (response.success && response.data) {
        return response.data;
      }

      return rejectWithValue(response.error?.message || 'Failed to fetch connections');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch connections');
    }
  }
);

export const fetchConnectionById = createAsyncThunk(
  'connections/fetchConnectionById',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const response = await connectionsAPI.getConnection(connectionId);

      if (response.success && response.data) {
        return response.data;
      }

      return rejectWithValue(response.error?.message || 'Failed to fetch connection');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch connection');
    }
  }
);

export const fetchMessages = createAsyncThunk(
  'connections/fetchMessages',
  async (connectionId: string, { rejectWithValue }) => {
    try {
      const response = await connectionsAPI.getConnectionMessages(connectionId);

      if (response.success && response.data) {
        return { connectionId, messages: response.data.messages };
      }

      return rejectWithValue(response.error?.message || 'Failed to fetch messages');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch messages');
    }
  }
);

export const sendMessage = createAsyncThunk(
  'connections/sendMessage',
  async (
    { connectionId, content }: { connectionId: string; content: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await connectionsAPI.sendMessage(connectionId, {
        content,
        message_type: 'text',
      });

      if (response.success && response.data) {
        return { connectionId, message: response.data };
      }

      return rejectWithValue(response.error?.message || 'Failed to send message');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to send message');
    }
  }
);

export const createConnection = createAsyncThunk(
  'connections/createConnection',
  async (
    { listingId, message }: { listingId: string; message: string },
    { rejectWithValue }
  ) => {
    try {
      const response = await connectionsAPI.createConnectionRequest({
        listing_id: listingId,
        initial_message: message,
      });

      if (response.success && response.data) {
        return response.data;
      }

      return rejectWithValue(response.error?.message || 'Failed to create connection');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create connection');
    }
  }
);

export const updateConnectionStatus = createAsyncThunk(
  'connections/updateStatus',
  async (
    {
      connectionId,
      status,
      responseMessage,
    }: {
      connectionId: string;
      status: 'approved' | 'rejected';
      responseMessage?: string;
    },
    { rejectWithValue }
  ) => {
    try {
      const response = await connectionsAPI.updateConnectionStatus(connectionId, {
        status,
        response_message: responseMessage,
      });

      if (response.success && response.data) {
        return response.data;
      }

      return rejectWithValue(response.error?.message || 'Failed to update connection');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update connection');
    }
  }
);

// Slice
const connectionsSlice = createSlice({
  name: 'connections',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    clearCurrentConnection: (state) => {
      state.currentConnection = null;
    },
    addMessage: (state, action) => {
      const { connectionId, message } = action.payload;
      if (!state.messages[connectionId]) {
        state.messages[connectionId] = [];
      }
      state.messages[connectionId].push(message);
    },
  },
  extraReducers: (builder) => {
    // Fetch Connections
    builder.addCase(fetchConnections.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchConnections.fulfilled, (state, action) => {
      state.isLoading = false;
      state.items = action.payload.items || [];
      if (action.payload.stats) {
        state.stats = action.payload.stats;
      }
    });
    builder.addCase(fetchConnections.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Connection By ID
    builder.addCase(fetchConnectionById.fulfilled, (state, action) => {
      state.currentConnection = action.payload;
    });

    // Fetch Messages
    builder.addCase(fetchMessages.fulfilled, (state, action) => {
      const { connectionId, messages } = action.payload;
      state.messages[connectionId] = messages;
    });

    // Send Message
    builder.addCase(sendMessage.fulfilled, (state, action) => {
      const { connectionId, message } = action.payload;
      if (!state.messages[connectionId]) {
        state.messages[connectionId] = [];
      }
      state.messages[connectionId].push(message);
    });

    // Create Connection
    builder.addCase(createConnection.fulfilled, (state, action) => {
      state.items.unshift(action.payload);
      state.stats.total_connections += 1;
      state.stats.pending_count += 1;
    });

    // Update Connection Status
    builder.addCase(updateConnectionStatus.fulfilled, (state, action) => {
      const index = state.items.findIndex((c) => c.connection_id === action.payload.connection_id);
      if (index !== -1) {
        state.items[index] = action.payload;
      }
      if (state.currentConnection?.connection_id === action.payload.connection_id) {
        state.currentConnection = action.payload;
      }
    });
  },
});

export const { clearError, clearCurrentConnection, addMessage } =
  connectionsSlice.actions;
export default connectionsSlice.reducer;

