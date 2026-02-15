import { apiService } from './api';
import { ApiResponse } from '../types';

export interface BlockUserRequest {
  blocked_user_id: string;
  reason?: string;
}

export interface UnblockUserRequest {
  blocked_user_id: string;
}

export interface BlockedUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  user_type: string;
  blocked_at: string;
  reason?: string;
}

export interface BlockedUsersResponse {
  blocked_users: BlockedUser[];
  total_blocked: number;
}

export interface BlockUserResponse {
  id: string;
  blocked_user_id: string;
  blocked_user_name: string;
  reason?: string;
  created_at: string;
  message: string;
}

export interface UnblockUserResponse {
  blocked_user_id: string;
  message: string;
}

export interface BlockStatusResponse {
  user1_blocks_user2: boolean;
  user2_blocks_user1: boolean;
  any_blocking: boolean;
}

export class BlockingService {
  /**
   * Block a user
   */
  async blockUser(request: BlockUserRequest): Promise<ApiResponse<BlockUserResponse>> {
    return apiService.post<BlockUserResponse>('/blocking/block', request);
  }

  /**
   * Unblock a user
   */
  async unblockUser(request: UnblockUserRequest): Promise<ApiResponse<UnblockUserResponse>> {
    return apiService.post<UnblockUserResponse>('/blocking/unblock', request);
  }

  /**
   * Get list of blocked users
   */
  async getBlockedUsers(): Promise<ApiResponse<BlockedUsersResponse>> {
    return apiService.get<BlockedUsersResponse>('/blocking/blocked-users');
  }

  /**
   * Check blocking status between current user and another user
   */
  async checkBlockStatus(userId: string): Promise<ApiResponse<BlockStatusResponse>> {
    return apiService.get<BlockStatusResponse>(`/blocking/status/${userId}`);
  }
}

export const blockingService = new BlockingService();
