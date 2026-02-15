/**
 * Connections API
 * All connection-related endpoints
 */

import apiClient from './client';
import {
  Connection,
  ConnectionCreateRequest,
  ConnectionUpdateRequest,
  Message,
  MessageCreateRequest,
  ApiResponse,
} from '../types';

export const connectionsAPI = {
  /**
   * Get user's connections
   */
  getUserConnections: async (filters?: {
    page?: number;
    limit?: number;
    status_filter?: string;
    sort_by?: string;
  }): Promise<
    ApiResponse<{
      connections: Connection[];
      total_count: number;
      pending_count: number;
      approved_count: number;
      rejected_count: number;
    }>
  > => {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status_filter) params.append('status_filter', filters.status_filter);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
    }

    const queryString = params.toString();
    const url = queryString ? `/connections?${queryString}` : '/connections';

    return apiClient.get(url);
  },

  /**
   * Create connection request (Buyer to Seller)
   */
  createConnectionRequest: async (
    data: ConnectionCreateRequest
  ): Promise<ApiResponse<Connection>> => {
    return apiClient.post<Connection>('/connections', data);
  },

  /**
   * Update connection status (Seller response)
   */
  updateConnectionStatus: async (
    connectionId: string,
    data: ConnectionUpdateRequest
  ): Promise<ApiResponse<Connection>> => {
    return apiClient.put<Connection>(`/connections/${connectionId}/status`, data);
  },

  /**
   * Get specific connection
   */
  getConnection: async (connectionId: string): Promise<ApiResponse<Connection>> => {
    return apiClient.get<Connection>(`/connections/${connectionId}`);
  },

  /**
   * Check connection status for a listing
   */
  getConnectionStatus: async (
    listingId: string
  ): Promise<
    ApiResponse<{
      has_connection: boolean;
      connection?: Connection;
    }>
  > => {
    return apiClient.get(`/connections/status/${listingId}`);
  },

  /**
   * Get buyer's sent requests
   */
  getBuyerRequests: async (filters?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const url = queryString
      ? `/connections/buyer/requests?${queryString}`
      : '/connections/buyer/requests';

    return apiClient.get(url);
  },

  /**
   * Get seller's received requests
   */
  getSellerRequests: async (filters?: {
    page?: number;
    limit?: number;
    status_filter?: string;
  }): Promise<ApiResponse<any>> => {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status_filter) params.append('status_filter', filters.status_filter);
    }

    const queryString = params.toString();
    const url = queryString
      ? `/connections/seller/requests?${queryString}`
      : '/connections/seller/requests';

    return apiClient.get(url);
  },

  /**
   * Get messages for a connection
   */
  getConnectionMessages: async (
    connectionId: string,
    filters?: {
      page?: number;
      limit?: number;
      before_message_id?: string;
    }
  ): Promise<
    ApiResponse<{
      messages: Message[];
      total_count: number;
      unread_count: number;
      has_more: boolean;
    }>
  > => {
    const params = new URLSearchParams();

    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.before_message_id)
        params.append('before_message_id', filters.before_message_id);
    }

    const queryString = params.toString();
    const url = queryString
      ? `/connections/${connectionId}/messages?${queryString}`
      : `/connections/${connectionId}/messages`;

    return apiClient.get(url);
  },

  /**
   * Send message
   */
  sendMessage: async (
    connectionId: string,
    data: MessageCreateRequest
  ): Promise<ApiResponse<Message>> => {
    return apiClient.post<Message>(`/connections/${connectionId}/messages`, data);
  },

  /**
   * Upload file for message
   */
  uploadMessageFile: async (
    connectionId: string,
    file: any,
    onProgress?: (progress: number) => void
  ): Promise<
    ApiResponse<{
      file_url: string;
      file_name: string;
      file_size: number;
      file_type: string;
    }>
  > => {
    return apiClient.uploadFile(
      `/connections/${connectionId}/messages/upload`,
      file,
      onProgress
    );
  },

  /**
   * Mark messages as read
   */
  markMessagesAsRead: async (
    connectionId: string,
    messageIds: string[]
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post(`/connections/${connectionId}/messages/read`, {
      message_ids: messageIds,
    });
  },

  /**
   * Get connection stats
   */
  getConnectionStats: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/connections/stats');
  },
};

export default connectionsAPI;

