import { apiService } from './api';
import { ApiResponse } from '../types';

// Connection Types
export interface Connection {
  id: string;
  buyer_id: string;
  seller_id: string;
  listing_id: string;
  status: 'pending' | 'approved' | 'rejected';
  initial_message: string;
  response_message?: string;
  seller_initiated: boolean;
  requested_at: string;
  responded_at?: string;
  last_activity: string;
  listing?: {
    id: string;
    title: string;
    location: string;
    asking_price?: number;
    price_range?: string;
    business_type: string;
    media_files?: Array<{
      file_url: string;
      is_primary: boolean;
    }>;
  };
  other_party?: {
    id: string;
    name: string;
    email: string;
    user_type: string;
    business_name?: string;
  };
  unread_messages: number;
  last_message?: {
    content: string;
    created_at: string;
    sender_name: string;
  };
}

export interface ConnectionListResponse {
  connections: Connection[];
  total_count: number;
  pending_count: number;
  approved_count: number;
  rejected_count: number;
}

export interface ConnectionCreateRequest {
  listing_id: string;
  initial_message: string;
}

export interface ConnectionUpdateRequest {
  status: 'approved' | 'rejected';
  response_message?: string;
}

export interface ConnectionFilters {
  page?: number;
  limit?: number;
  status_filter?: string;
  sort_by?: string;
}

export interface Message {
  id: string;
  connection_id: string;
  sender_id: string;
  content: string;
  message_type: 'text' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  is_read: boolean;
  read_at?: string;
  is_edited: boolean;
  edited_at?: string;
  sender_name?: string;
  sender_type?: string;
  created_at: string;
}

export interface MessageCreateRequest {
  content: string;
  message_type?: 'text' | 'file';
  file_url?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
}

export interface MessageListResponse {
  messages: Message[];
  total_count: number;
  unread_count: number;
  has_more: boolean;
}

export class ConnectionService {
  // Get user's connections (both buyer and seller)
  async getUserConnections(filters?: ConnectionFilters): Promise<ApiResponse<ConnectionListResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status_filter) params.append('status_filter', filters.status_filter);
      if (filters.sort_by) params.append('sort_by', filters.sort_by);
    }

    const queryString = params.toString();
    const url = queryString ? `/connections?${queryString}` : '/connections';
    
    return apiService.get<ConnectionListResponse>(url);
  }

  // Create connection request (buyer to seller)
  async createConnectionRequest(data: ConnectionCreateRequest): Promise<ApiResponse<Connection>> {
    return apiService.post<Connection>('/connections', data);
  }

  // Update connection status (seller response)
  async updateConnectionStatus(
    connectionId: string, 
    statusOrData: 'approved' | 'rejected' | ConnectionUpdateRequest,
    responseMessage?: string
  ): Promise<ApiResponse<Connection>> {
    let data: ConnectionUpdateRequest;
    
    if (typeof statusOrData === 'string') {
      // Handle individual parameters (legacy format)
      data = {
        status: statusOrData,
        response_message: responseMessage
      };
    } else {
      // Handle object parameter (new format)
      data = statusOrData;
    }
    
    return apiService.put<Connection>(`/connections/${connectionId}/status`, data);
  }

  // Get specific connection details
  async getConnection(connectionId: string): Promise<ApiResponse<Connection>> {
    return apiService.get<Connection>(`/connections/${connectionId}`);
  }

  // Check connection status for a listing (buyer)
  async getConnectionStatus(listingId: string): Promise<ApiResponse<{
    has_connection: boolean;
    connection?: Connection;
  }>> {
    return apiService.get(`/connections/status/${listingId}`);
  }

  // Send seller-to-buyer connection request
  async sendSellerToBuyerConnection(data: {
    buyer_id: string;
    message: string;
  }): Promise<ApiResponse<Connection>> {
    return apiService.post<Connection>('/connections/seller-to-buyer', data);
  }

  // Check seller-buyer connection
  async checkSellerBuyerConnection(buyerId: string): Promise<ApiResponse<{
    has_connection: boolean;
    connection?: Connection;
  }>> {
    return apiService.get(`/connections/check-seller-buyer/${buyerId}`);
  }

  // Get buyer's sent requests
  async getBuyerRequests(filters?: {
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<ConnectionListResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
    }

    const queryString = params.toString();
    const url = queryString ? `/connections/buyer/requests?${queryString}` : '/connections/buyer/requests';
    
    return apiService.get<ConnectionListResponse>(url);
  }

  // Get seller's received requests
  async getSellerRequests(filters?: {
    page?: number;
    limit?: number;
    status_filter?: string;
  }): Promise<ApiResponse<ConnectionListResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.status_filter) params.append('status_filter', filters.status_filter);
    }

    const queryString = params.toString();
    const url = queryString ? `/connections/seller/requests?${queryString}` : '/connections/seller/requests';
    
    return apiService.get<ConnectionListResponse>(url);
  }

  // Block/unblock connection
  async blockConnection(connectionId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.put(`/connections/${connectionId}/block`);
  }

  // Get messages for a connection
  async getConnectionMessages(
    connectionId: string,
    filters?: {
      page?: number;
      limit?: number;
      before_message_id?: string;
      after_message_id?: string;
    }
  ): Promise<ApiResponse<MessageListResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.before_message_id) params.append('before_message_id', filters.before_message_id);
      if (filters.after_message_id) params.append('after_message_id', filters.after_message_id);
    }

    const queryString = params.toString();
    const url = queryString 
      ? `/connections/${connectionId}/messages?${queryString}` 
      : `/connections/${connectionId}/messages`;
    
    return apiService.get<MessageListResponse>(url);
  }

  // Send message in connection
  async sendMessage(
    connectionId: string, 
    data: MessageCreateRequest
  ): Promise<ApiResponse<Message>> {
    return apiService.post<Message>(`/connections/${connectionId}/messages`, data);
  }

  // Mark messages as read
  async markMessagesAsRead(
    connectionId: string,
    messageIds: string[]
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.post(`/connections/${connectionId}/messages/read`, {
      message_ids: messageIds
    });
  }

  // Edit message
  async editMessage(
    connectionId: string,
    messageId: string,
    content: string
  ): Promise<ApiResponse<Message>> {
    return apiService.put<Message>(`/connections/${connectionId}/messages/${messageId}`, {
      content
    });
  }

  // Delete message
  async deleteMessage(
    connectionId: string,
    messageId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete(`/connections/${connectionId}/messages/${messageId}`);
  }

  // Upload file for message
  async uploadMessageFile(
    connectionId: string,
    file: File,
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ file_url: string; file_name: string; file_size: number; file_type: string }>> {
    return apiService.uploadFile(
      `/connections/${connectionId}/messages/upload`,
      file,
      onProgress
    );
  }

  // Get connection statistics
  async getConnectionStats(): Promise<ApiResponse<{
    total_connections: number;
    pending_count: number;
    approved_count: number;
    rejected_count: number;
    total_messages: number;
    unread_messages: number;
  }>> {
    return apiService.get('/connections/stats');
  }
}

export const connectionService = new ConnectionService();