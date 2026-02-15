import { ApiResponse } from '../types';
import { apiService } from './api';

export interface AdminDashboard {
  overview: {
    total_users: number;
    total_sellers: number;
    total_buyers: number;
    verified_users: number;
    new_users_this_month: number;
    user_growth_percentage: number;
    total_listings: number;
    published_listings: number;
    pending_listings: number;
    draft_listings: number;
    total_connections: number;
    active_connections: number;
    pending_connections: number;
    active_subscriptions: number;
    revenue_this_month: number;
    pending_service_requests: number;
  };
  recent_activity: {
    new_users: Array<{
      id: string;
      name: string;
      email: string;
      user_type: string;
      created_at: string;
    }>;
    new_listings: Array<{
      id: string;
      title: string;
      business_type: string;
      status: string;
      created_at: string;
    }>;
    new_connections: Array<{
      id: string;
      status: string;
      requested_at: string;
    }>;
  };
  alerts: Array<{
    type: string;
    message: string;
    count: number;
    priority: string;
  }>;
}

export interface PendingListing {
  id: string;
  edit_id?: string; // Present for listing edits
  title: string;
  description: string;
  business_type: string;
  location: string;
  asking_price: string; // Changed to string to match backend response
  status: string;
  created_at: string;
  seller: {
    id: string;
    business_name: string;
    verification_status: string;
  } | null;
  type: 'new_listing' | 'listing_edit'; // Distinguish between new listings and edits
  edit_reason?: string; // Present for listing edits
}

export interface ListingDetail {
  id: string;
  edit_id?: string; // Present for listing edits
  title: string;
  description: string;
  business_type: string;
  location: string;
  postcode?: string;
  region?: string;
  asking_price: number;
  annual_revenue?: number;
  net_profit?: number;
  practice_name?: string;
  practice_type?: string;
  premises_type?: string;
  nhs_contract?: boolean;
  nhs_contract_details?: string;
  private_patient_base?: number;
  staff_count?: number;
  patient_list_size?: number;
  equipment_inventory?: string;
  cqc_registered?: boolean;
  cqc_registration_number?: string;
  professional_indemnity_insurance?: boolean;
  insurance_details?: string;
  lease_agreement_details?: string;
  property_value?: number;
  goodwill_valuation?: number;
  business_details?: any;
  financial_statements?: any;
  status: string;
  created_at: string;
  media?: Array<{
    id: string;
    file_url: string;
    file_type: string;
    is_primary: boolean;
    uploaded_at: string;
  }>;
  seller: {
    id: string;
    business_name: string;
    verification_status: string;
    user: {
      name: string;
      email: string;
      phone?: string;
    };
  } | null;
}

export interface ListingApprovalRequest {
  status: 'approved' | 'rejected';
  admin_notes?: string;
  rejection_reason?: string;
}

export interface PaginatedListingsResponse {
  listings: PendingListing[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}


export class AdminService {
  // Dashboard
  async getDashboard(): Promise<ApiResponse<AdminDashboard>> {
    return apiService.get('/admin/dashboard');
  }

  // Listings Management
  async getPendingListings(
    page: number = 1,
    limit: number = 20,
    businessType?: string
  ): Promise<ApiResponse<PaginatedListingsResponse>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (businessType) {
      params.append('business_type', businessType);
    }

    return apiService.get(`/admin/listings/pending?${params.toString()}`);
  }

  async getAllListings(
    page: number = 1,
    limit: number = 20,
    status?: string,
    businessType?: string,
    search?: string,
    sortBy?: string,
    sortOrder?: string
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (status) params.append('status', status);
    if (businessType) params.append('business_type', businessType);
    if (search) params.append('search', search);
    if (sortBy) params.append('sort_by', sortBy);
    if (sortOrder) params.append('sort_order', sortOrder);

    return apiService.get(`/admin/listings/all?${params.toString()}`);
  }

  async getListingForReview(listingId: string, editId?: string): Promise<ApiResponse<ListingDetail>> {
    const url = editId 
      ? `/admin/listings/${listingId}?edit_id=${editId}`
      : `/admin/listings/${listingId}`;
    return apiService.get(url);
  }

  async approveOrRejectListing(
    listingId: string,
    approvalData: ListingApprovalRequest,
    editId?: string
  ): Promise<ApiResponse<{ message: string }>> {
    const url = editId 
      ? `/admin/listings/${listingId}/approve?edit_id=${editId}`
      : `/admin/listings/${listingId}/approve`;
    return apiService.put(url, approvalData);
  }

  // Users Management
  async getUsers(
    page: number = 1,
    limit: number = 20,
    userType?: string,
    verificationStatus?: string,
    search?: string
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    
    if (userType) params.append('user_type', userType);
    if (verificationStatus) params.append('verification_status', verificationStatus);
    if (search) params.append('search', search);

    return apiService.get(`/admin/users?${params.toString()}`);
  }

  async getUserDetails(userId: string): Promise<ApiResponse<any>> {
    return apiService.get(`/admin/users/${userId}`);
  }

  async verifyUser(
    userId: string,
    verificationData: {
      status: 'approved' | 'rejected';
      admin_notes?: string;
    }
  ): Promise<ApiResponse<any>> {
    return apiService.put(`/admin/users/${userId}/verify`, verificationData);
  }

  async updateUserStatus(
    userId: string,
    isActive: boolean,
    adminNotes?: string
  ): Promise<ApiResponse<any>> {
    const params = new URLSearchParams({
      is_active: isActive.toString(),
    });
    
    if (adminNotes) {
      params.append('admin_notes', adminNotes);
    }

    return apiService.put(`/admin/users/${userId}/status?${params.toString()}`);
  }

  // Analytics
  async getPlatformAnalytics(period: string = '30d'): Promise<ApiResponse<any>> {
    return apiService.get(`/admin/analytics/platform?period=${period}`);
  }

  async getBuyerAnalytics(buyerId: string): Promise<ApiResponse<any>> {
    try {
      // Use the new admin analytics endpoint
      const response = await apiService.get(`/admin/users/${buyerId}/analytics`);
      
      if (response.success && response.data) {
        return response;
      }
      
      // Fallback to constructing data from user details if endpoint fails
      const userResponse = await this.getUserDetails(buyerId);
      
      if (userResponse.success && userResponse.data) {
        const userData = userResponse.data;
        
        // Extract analytics from connections and other data
        const connections = userData.connections || [];
        const totalConnections = connections.length;
        const activeConnections = connections.filter((c: any) => c.status === 'approved').length;
        
        return {
          success: true,
          data: {
            total_connections: totalConnections,
            active_connections: activeConnections,
            saved_listings: 0,
            total_messages: 0,
            listings_viewed: 0,
            avg_response_time: 0,
            connection_message_counts: {}
          }
        };
      }
      
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Buyer not found' }
      };
    } catch (error) {
      console.error('Error getting buyer analytics:', error);
      return {
        success: false,
        error: { code: 'API_ERROR', message: 'Could not fetch buyer analytics' }
      };
    }
  }

  // System Management
  async getSystemNotifications(): Promise<ApiResponse<any>> {
    return apiService.get('/admin/notifications');
  }

  async getSystemStatus(): Promise<ApiResponse<any>> {
    return apiService.get('/admin/system-status');
  }

  async broadcastNotification(notificationData: {
    title: string;
    message: string;
    user_type?: string;
    send_email?: boolean;
  }): Promise<ApiResponse<any>> {
    return apiService.post('/admin/notifications/broadcast', notificationData);
  }

  // Seller Management
  async getSellerListings(sellerId: string): Promise<ApiResponse<any>> {
    // This endpoint doesn't exist on the backend, so we'll use available endpoints
    // First try to get pending listings and filter, then get user details which might include listings
    try {
      // Try to get user details first, which might include some listing info
      const userResponse = await this.getUserDetails(sellerId);
      if (userResponse.success && userResponse.data?.listings) {
        return {
          success: true,
          data: { listings: userResponse.data.listings }
        };
      }
      
      // If no listings in user details, return empty array
      return {
        success: true,
        data: { listings: [] }
      };
    } catch (error) {
      console.error('Error getting seller listings:', error);
      return {
        success: false,
        error: { code: 'NOT_FOUND', message: 'Could not fetch seller listings' }
      };
    }
  }


  // Get connections for a specific listing (admin)
  async getListingConnections(listingId: string): Promise<ApiResponse<any>> {
    try {
      // Try to get real connections from backend
      const response = await apiService.get(`/admin/listings/${listingId}/connections`);
      
      if (response.success && response.data) {
        return response;
      }
      
      // If endpoint doesn't exist, return empty connections
      return {
        success: true,
        data: {
          connections: []
        }
      };
    } catch (error) {
      console.error('Error getting listing connections:', error);
      return {
        success: true,
        data: {
          connections: []
        }
      };
    }
  }

  // Get detailed listing information for admin (includes all data)
  async getListingDetailsForAdmin(listingId: string): Promise<ApiResponse<any>> {
    try {
      // Try to get the listing from admin endpoint first
      const response = await this.getListingForReview(listingId);
      
      if (response.success && response.data) {
        return response;
      }
      
      // Fallback to regular listing service if admin endpoint doesn't work
      const fallbackResponse = await apiService.get(`/listings/${listingId}`);
      return fallbackResponse;
    } catch (error) {
      console.error('Error getting admin listing details:', error);
      return {
        success: false,
        error: { code: 'API_ERROR', message: 'Could not fetch listing details' }
      };
    }
  }

  // Get listing analytics for admin
  async getListingAnalytics(listingId: string): Promise<ApiResponse<any>> {
    try {
      // Get both analytics and connections data
      const [analyticsResponse, connectionsResponse] = await Promise.all([
        apiService.get(`/listings/${listingId}/analytics`),
        apiService.get(`/admin/listings/${listingId}/connections`)
      ]);
      
      if (analyticsResponse.success && analyticsResponse.data) {
        const analyticsData = analyticsResponse.data as any;
        const connectionsData = connectionsResponse.success ? connectionsResponse.data : { connections: [] };
        
        // Transform connections data to match frontend expectations
        const transformedConnections = (connectionsData.connections || []).map((conn: any) => ({
          id: conn.id,
          buyer_name: conn.buyer?.name || 'Unknown',
          buyer_email: conn.buyer?.email || 'Unknown',
          status: conn.status,
          initial_message: conn.initial_message || '',
          requested_at: conn.requested_at,
          responded_at: conn.responded_at
        }));
        
        // Transform the response to match the expected admin format
        return {
          success: true,
          data: {
            listing: {
              id: listingId,
              title: 'Listing Analytics',
              business_type: 'full_sale',
              location: 'UK',
              status: 'published'
            },
            analytics: {
              total_views: analyticsData.total_views || 0,
              unique_views: analyticsData.unique_views || 0,
              views_this_week: analyticsData.views_this_week || 0,
              views_this_month: analyticsData.views_this_month || 0,
              connection_requests: analyticsData.connection_requests || 0,
              approved_connections: analyticsData.approved_connections || 0,
              pending_connections: transformedConnections.filter((c: any) => c.status === 'pending').length,
              conversion_rate: 0,
              avg_time_on_page: 0,
              bounce_rate: 0
            },
            viewers: analyticsData.viewer_locations || [],
            connections: transformedConnections
          }
        };
      }
      
      return {
        success: false,
        error: { code: 'API_ERROR', message: 'Could not fetch listing analytics' }
      };
    } catch (error: any) {
      console.error('Error getting listing analytics:', error);
      
      // Provide helpful error information
      if (error?.response?.status === 403) {
        return {
          success: false,
          error: { 
            code: 'FORBIDDEN', 
            message: 'Access denied. Admin authentication required.' 
          }
        };
      } else if (error?.response?.status === 404) {
        return {
          success: false,
          error: { 
            code: 'NOT_FOUND', 
            message: 'Listing not found.' 
          }
        };
      }
      
      return {
        success: false,
        error: { code: 'API_ERROR', message: 'Could not fetch listing analytics' }
      };
    }
  }
}

export const adminService = new AdminService();
