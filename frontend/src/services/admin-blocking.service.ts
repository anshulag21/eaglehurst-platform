import { apiService } from './api';
import { ApiResponse } from '../types';

export interface AdminBlockedUser {
  id: string;
  blocker: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
  };
  blocked_user: {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    user_type: string;
  };
  reason?: string;
  admin_notes?: string;
  is_active: boolean;
  created_at: string;
  updated_at?: string;
}

export interface AdminBlockedUsersResponse {
  blocked_users: AdminBlockedUser[];
  total_count: number;
  active_blocks: number;
  inactive_blocks: number;
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  };
}

export interface AdminBlockedUsersFilters {
  page?: number;
  limit?: number;
  search?: string;
  blocker_type?: string;
  blocked_type?: string;
  is_active?: boolean;
  date_from?: string;
  date_to?: string;
}

export interface AdminBlockUserRequest {
  blocker_id: string;
  blocked_user_id: string;
  reason?: string;
  admin_notes?: string;
}

export interface AdminUnblockUserRequest {
  block_id: string;
  admin_notes?: string;
}

export interface AdminUpdateBlockRequest {
  block_id: string;
  is_active?: boolean;
  admin_notes?: string;
}

export interface BlockingStatistics {
  total_blocks: number;
  active_blocks: number;
  inactive_blocks: number;
  blocks_by_user_type: {
    buyer_blocks: number;
    seller_blocks: number;
    admin_blocks: number;
  };
  recent_blocks: AdminBlockedUser[];
  top_blockers: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      user_type: string;
    };
    block_count: number;
  }>;
  top_blocked: Array<{
    user: {
      id: string;
      name: string;
      email: string;
      user_type: string;
    };
    blocked_count: number;
  }>;
}

export class AdminBlockingService {
  /**
   * Get all blocked users with admin privileges
   */
  async getAllBlockedUsers(filters?: AdminBlockedUsersFilters): Promise<ApiResponse<AdminBlockedUsersResponse>> {
    const params = new URLSearchParams();
    
    if (filters) {
      if (filters.page) params.append('page', filters.page.toString());
      if (filters.limit) params.append('limit', filters.limit.toString());
      if (filters.search) params.append('search', filters.search);
      if (filters.blocker_type) params.append('blocker_type', filters.blocker_type);
      if (filters.blocked_type) params.append('blocked_type', filters.blocked_type);
      if (filters.is_active !== undefined) params.append('is_active', filters.is_active.toString());
      if (filters.date_from) params.append('date_from', filters.date_from);
      if (filters.date_to) params.append('date_to', filters.date_to);
    }

    const queryString = params.toString();
    const url = queryString ? `/admin/blocking/all?${queryString}` : '/admin/blocking/all';
    
    return apiService.get<AdminBlockedUsersResponse>(url);
  }

  /**
   * Get blocking statistics for admin dashboard
   */
  async getBlockingStatistics(): Promise<ApiResponse<BlockingStatistics>> {
    return apiService.get<BlockingStatistics>('/admin/blocking/statistics');
  }

  /**
   * Admin block a user (on behalf of another user or system)
   */
  async adminBlockUser(request: AdminBlockUserRequest): Promise<ApiResponse<AdminBlockedUser>> {
    return apiService.post<AdminBlockedUser>('/admin/blocking/block', request);
  }

  /**
   * Admin unblock a user
   */
  async adminUnblockUser(request: AdminUnblockUserRequest): Promise<ApiResponse<{ message: string }>> {
    return apiService.post<{ message: string }>('/admin/blocking/unblock', request);
  }

  /**
   * Update block status or add admin notes
   */
  async updateBlock(request: AdminUpdateBlockRequest): Promise<ApiResponse<AdminBlockedUser>> {
    return apiService.put<AdminBlockedUser>('/admin/blocking/update', request);
  }

  /**
   * Get specific block details
   */
  async getBlockDetails(blockId: string): Promise<ApiResponse<AdminBlockedUser>> {
    return apiService.get<AdminBlockedUser>(`/admin/blocking/${blockId}`);
  }

  /**
   * Get user's blocking history (both as blocker and blocked)
   */
  async getUserBlockingHistory(userId: string): Promise<ApiResponse<{
    as_blocker: AdminBlockedUser[];
    as_blocked: AdminBlockedUser[];
    total_blocks_made: number;
    total_blocks_received: number;
  }>> {
    return apiService.get(`/admin/blocking/user/${userId}/history`);
  }

  /**
   * Bulk update blocks
   */
  async bulkUpdateBlocks(blockIds: string[], action: 'activate' | 'deactivate' | 'delete', adminNotes?: string): Promise<ApiResponse<{
    updated_count: number;
    failed_count: number;
    message: string;
  }>> {
    return apiService.post('/admin/blocking/bulk-update', {
      block_ids: blockIds,
      action,
      admin_notes: adminNotes
    });
  }
}

export const adminBlockingService = new AdminBlockingService();

