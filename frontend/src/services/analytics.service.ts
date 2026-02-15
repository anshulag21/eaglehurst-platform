import { ApiResponse } from '../types';
import { apiService } from './api';

export interface ListingAnalytics {
  listing_id: string;
  analytics: {
    total_views: number;
    unique_views: number;
    views_this_week: number;
    views_this_month: number;
    connection_requests: number;
    approved_connections: number;
    pending_connections: number;
    conversion_rate: number;
  };
  viewers: Array<{
    buyer_id: string;
    buyer_name: string;
    buyer_email: string;
    verification_status: string;
    viewed_at: string;
    location?: string;
  }>;
  connections: Array<{
    id: string;
    buyer_name: string;
    buyer_email: string;
    status: string;
    initial_message: string;
    requested_at: string;
    responded_at?: string;
  }>;
}

export interface SellerAnalytics {
  total_listings: number;
  total_views: number;
  total_inquiries: number;
  total_saved: number;
  active_listings: number;
  average_views_per_listing: number;
  conversion_rate: number;
}

export interface BuyerAnalytics {
  total_searches: number;
  saved_listings: number;
  active_connections: number;
  unread_messages: number;
  recent_activity: number;
  profile_views: number;
}

export class AnalyticsService {
  // Track listing view
  async trackListingView(listingId: string): Promise<ApiResponse<{ view_id: string; total_views: number }>> {
    return apiService.post(`/analytics/listings/${listingId}/view`);
  }

  // Get comprehensive listing analytics (for sellers and admins)
  async getListingAnalytics(listingId: string): Promise<ApiResponse<ListingAnalytics>> {
    try {
      // Get both analytics and connections data for sellers
      const [analyticsResponse, connectionsResponse] = await Promise.all([
        apiService.get(`/listings/${listingId}/analytics`),
        apiService.get(`/listings/${listingId}/connections`)
      ]);
      
      if (analyticsResponse.success && analyticsResponse.data) {
        const analyticsData = analyticsResponse.data as any;
        const connectionsData = connectionsResponse.success ? connectionsResponse.data : { connections: [] };
        
        // Transform connections data to match frontend expectations
        const transformedConnections = (connectionsData.connections || []).map((conn: any) => ({
          id: conn.id,
          buyer_name: conn.buyer_name || 'Unknown',
          buyer_email: conn.buyer_email || 'Unknown',
          status: conn.status,
          initial_message: conn.initial_message || '',
          requested_at: conn.requested_at,
          responded_at: conn.responded_at
        }));
        
        // Transform the response to match the expected seller page format
        const transformedData = {
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
            conversion_rate: analyticsData.connection_requests > 0 ? Math.round((analyticsData.approved_connections / analyticsData.connection_requests) * 100) : 0,
            avg_time_on_page: 0,
            bounce_rate: 0
          },
          viewers: analyticsData.viewer_locations || [],
          connections: transformedConnections
        };
        
        return {
          success: true,
          data: transformedData
        };
      }
      
      return analyticsResponse;
    } catch (error) {
      console.error('Error getting listing analytics:', error);
      return {
        success: false,
        error: { code: 'API_ERROR', message: 'Could not fetch listing analytics' }
      };
    }
  }

  // Get seller overview analytics
  async getSellerAnalytics(): Promise<ApiResponse<SellerAnalytics>> {
    return apiService.get('/analytics/seller/overview');
  }

  // Get buyer overview analytics
  async getBuyerAnalytics(): Promise<ApiResponse<BuyerAnalytics>> {
    return apiService.get('/analytics/buyer/overview');
  }

  // Save/favorite a listing (for buyers)
  async saveListing(listingId: string): Promise<ApiResponse<{ saved_id: string; saved_at: string }>> {
    return apiService.post(`/analytics/listings/${listingId}/save`);
  }

  // Remove from saved/favorites (for buyers)
  async unsaveListing(listingId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete(`/analytics/listings/${listingId}/save`);
  }

  // Check if listing is saved (for buyers)
  async isListingSaved(listingId: string): Promise<ApiResponse<{ is_saved: boolean; saved_at: string | null }>> {
    return apiService.get(`/analytics/listings/${listingId}/is-saved`);
  }

}

export const analyticsService = new AnalyticsService();
