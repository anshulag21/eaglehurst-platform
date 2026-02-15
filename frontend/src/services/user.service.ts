import { apiService } from './api';
import { 
  UserProfile, 
  SellerAnalytics,
  ApiResponse 
} from '../types';

export class UserService {
  // Get user profile
  async getProfile(): Promise<ApiResponse<UserProfile>> {
    return apiService.get<UserProfile>('/users/profile');
  }

  // Update user profile
  async updateProfile(profileData: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    business_name?: string;
  }): Promise<ApiResponse<UserProfile>> {
    return apiService.put<UserProfile>('/users/profile', profileData);
  }

  // Submit seller verification with business information and documents
  async submitSellerVerification(
    verificationData: {
      businessName: string;
      businessDescription: string;
      businessType: string;
      businessAddress: string;
      identityDocument: File;
      licenseDocument: File;
      additionalDocuments?: File[];
    },
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ message: string; verification_status: string }>> {
    const formData = new FormData();
    
    // Add business information
    formData.append('business_name', verificationData.businessName);
    formData.append('business_description', verificationData.businessDescription);
    formData.append('business_type', verificationData.businessType);
    formData.append('business_address', verificationData.businessAddress);
    
    // Add documents
    formData.append('license_document', verificationData.licenseDocument);
    formData.append('identity_document', verificationData.identityDocument);
    
    if (verificationData.additionalDocuments) {
      verificationData.additionalDocuments.forEach((doc) => {
        formData.append('additional_documents', doc);
      });
    }

    return apiService.post('/users/seller-verification', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Upload KYC documents (for sellers) - Legacy method
  async uploadKYCDocuments(
    licenseDocument: File,
    identityDocument: File,
    additionalDocuments?: File[],
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ message: string; verification_status: string }>> {
    const formData = new FormData();
    formData.append('license_document', licenseDocument);
    formData.append('identity_document', identityDocument);
    
    if (additionalDocuments) {
      additionalDocuments.forEach((doc) => {
        formData.append('additional_documents', doc);
      });
    }

    return apiService.post('/users/kyc-upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
      onUploadProgress: (progressEvent) => {
        if (onProgress && progressEvent.total) {
          const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(progress);
        }
      },
    });
  }

  // Get seller analytics
  async getSellerAnalytics(period?: 'week' | 'month' | 'year'): Promise<ApiResponse<SellerAnalytics>> {
    const params = period ? `?period=${period}` : '';
    return apiService.get<SellerAnalytics>(`/users/seller-analytics${params}`);
  }

  // Change password
  async changePassword(currentPassword: string, newPassword: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post('/users/change-password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  }

  // Update notification preferences
  async updateNotificationPreferences(preferences: {
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    connection_requests: boolean;
    messages: boolean;
    listing_updates: boolean;
  }): Promise<ApiResponse<{ message: string }>> {
    return apiService.put('/users/notification-preferences', preferences);
  }

  // Get notification preferences
  async getNotificationPreferences(): Promise<ApiResponse<{
    email_notifications: boolean;
    push_notifications: boolean;
    marketing_emails: boolean;
    connection_requests: boolean;
    messages: boolean;
    listing_updates: boolean;
  }>> {
    return apiService.get('/users/notification-preferences');
  }

  // Delete user account
  async deleteAccount(password: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post('/users/delete-account', { password });
  }

  // Get user's subscription status
  async getSubscriptionStatus(): Promise<ApiResponse<{
    active: boolean;
    plan: string;
    expires_at: string;
    usage: {
      connections_used: number;
      connections_limit: number;
      listings_used: number;
      listings_limit: number;
    };
  }>> {
    return apiService.get('/users/subscription-status');
  }

  // Export user data (GDPR compliance)
  async exportUserData(): Promise<ApiResponse<{ download_url: string }>> {
    return apiService.post('/users/export-data');
  }

  // Create seller profile (helper for missing profiles)
  async createSellerProfile(): Promise<ApiResponse<{
    seller_id: string;
    verification_status: string;
    message: string;
  }>> {
    return apiService.post('/users/create-seller-profile');
  }
}

export const userService = new UserService();
