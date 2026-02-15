/**
 * User API
 * All user management endpoints
 */

import apiClient from './client';
import { UserProfile, ApiResponse } from '../types';

export const userAPI = {
  /**
   * Get user profile
   */
  getProfile: async (): Promise<ApiResponse<UserProfile>> => {
    return apiClient.get<UserProfile>('/users/profile');
  },

  /**
   * Update user profile
   */
  updateProfile: async (profileData: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    business_name?: string;
  }): Promise<ApiResponse<UserProfile>> => {
    return apiClient.put<UserProfile>('/users/profile', profileData);
  },

  /**
   * Submit seller verification with KYC documents
   */
  submitSellerVerification: async (
    verificationData: {
      businessName: string;
      businessDescription: string;
      businessType: string;
      businessAddress: string;
      identityDocument: any;
      licenseDocument: any;
      additionalDocuments?: any[];
    },
    onProgress?: (progress: number) => void
  ): Promise<
    ApiResponse<{
      message: string;
      verification_status: string;
    }>
  > => {
    const formData = new FormData();

    formData.append('business_name', verificationData.businessName);
    formData.append('business_description', verificationData.businessDescription);
    formData.append('business_type', verificationData.businessType);
    formData.append('business_address', verificationData.businessAddress);
    formData.append('license_document', verificationData.licenseDocument);
    formData.append('identity_document', verificationData.identityDocument);

    if (verificationData.additionalDocuments) {
      verificationData.additionalDocuments.forEach((doc) => {
        formData.append('additional_documents', doc);
      });
    }

    return apiClient.post('/users/seller-verification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round(
            (progressEvent.loaded * 100) / progressEvent.total
          );
          onProgress(progress);
        }
      },
    });
  },

  /**
   * Get seller analytics
   */
  getSellerAnalytics: async (
    period?: 'week' | 'month' | 'year'
  ): Promise<ApiResponse<any>> => {
    const params = period ? `?period=${period}` : '';
    return apiClient.get(`/analytics/seller/overview${params}`);
  },

  /**
   * Change password
   */
  changePassword: async (
    currentPassword: string,
    newPassword: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post('/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  /**
   * Get subscription status
   */
  getSubscriptionStatus: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/users/subscription-status');
  },

  /**
   * Get notification preferences
   */
  getNotificationPreferences: async (): Promise<ApiResponse<any>> => {
    return apiClient.get('/users/notification-preferences');
  },

  /**
   * Update notification preferences
   */
  updateNotificationPreferences: async (preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    connection_requests: boolean;
    messages: boolean;
    listing_updates: boolean;
  }): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.put('/users/notification-preferences', preferences);
  },
};

export default userAPI;

