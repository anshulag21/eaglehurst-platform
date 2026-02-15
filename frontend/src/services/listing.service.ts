import { apiService } from './api';
import { 
  Listing, 
  CreateListingRequest, 
  ListingFilters, 
  PaginatedResponse,
  SavedListingsResponse,
  ApiResponse 
} from '../types';

export class ListingService {
  // Get all listings with filters
  async getListings(filters?: ListingFilters): Promise<ApiResponse<PaginatedResponse<Listing>>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/listings?${queryString}` : '/listings';
    
    return apiService.get<PaginatedResponse<Listing>>(url);
  }

  // Get single listing by ID
  async getListing(id: string): Promise<ApiResponse<Listing>> {
    return apiService.get<Listing>(`/listings/${id}`);
  }

  // Create new listing
  async createListing(listingData: CreateListingRequest): Promise<ApiResponse<Listing>> {
    return apiService.post<Listing>('/listings', listingData);
  }

  // Update existing listing
  async updateListing(id: string, listingData: Partial<CreateListingRequest>): Promise<ApiResponse<Listing>> {
    return apiService.put<Listing>(`/listings/${id}`, listingData);
  }

  // Delete listing
  async deleteListing(id: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete(`/listings/${id}`);
  }

  // Get pending changes for a listing
  async getPendingChanges(listingId: string): Promise<ApiResponse<any>> {
    return apiService.get<any>(`/listings/${listingId}/pending-changes`);
  }

  // Upload media files for listing
  async uploadListingMedia(
    listingId: string, 
    files: File[], 
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ media_urls: string[] }>> {
    return apiService.uploadFiles(
      `/listings/${listingId}/media`,
      files,
      'media_files',
      onProgress
    );
  }

  // Get seller's listings
  async getSellerListings(filters?: Partial<ListingFilters>): Promise<ApiResponse<PaginatedResponse<Listing>>> {
    const params = new URLSearchParams();
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString ? `/listings/seller/my-listings?${queryString}` : '/listings/seller/my-listings';
    
    return apiService.get<PaginatedResponse<Listing>>(url);
  }

  // Save listing as favorite (for buyers)
  async saveListing(listingId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.post(`/listings/${listingId}/save`);
  }

  // Remove listing from favorites
  async unsaveListing(listingId: string): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete(`/listings/${listingId}/save`);
  }

  // Get saved listings
  async getSavedListings(params?: { 
    skip?: number; 
    limit?: number; 
    filters?: Partial<ListingFilters> 
  }): Promise<ApiResponse<SavedListingsResponse>> {
    const searchParams = new URLSearchParams();
    
    // Add pagination parameters
    if (params?.skip !== undefined) {
      searchParams.append('skip', params.skip.toString());
    }
    if (params?.limit !== undefined) {
      searchParams.append('limit', params.limit.toString());
    }
    
    // Add filter parameters
    if (params?.filters) {
      Object.entries(params.filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, value.toString());
        }
      });
    }

    const queryString = searchParams.toString();
    const url = queryString ? `/listings/saved?${queryString}` : '/listings/saved';
    
    return apiService.get<SavedListingsResponse>(url);
  }

  // Search listings
  async searchListings(query: string, filters?: ListingFilters): Promise<ApiResponse<PaginatedResponse<Listing>>> {
    const params = new URLSearchParams({ q: query });
    
    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    return apiService.get<PaginatedResponse<Listing>>(`/listings/search?${params.toString()}`);
  }

  // Get listing analytics (for sellers)
  async getListingAnalytics(listingId: string): Promise<ApiResponse<{
    views: number;
    connection_requests: number;
    saved_count: number;
    weekly_views: Array<{ date: string; views: number }>;
  }>> {
    return apiService.get(`/listings/${listingId}/analytics`);
  }

  // Delete media file from listing
  async deleteListingMedia(
    listingId: string,
    mediaId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.delete(`/listings/${listingId}/media/${mediaId}`);
  }

  // Set primary media for listing
  async setPrimaryMedia(
    listingId: string,
    mediaId: string
  ): Promise<ApiResponse<{ message: string }>> {
    return apiService.put(`/listings/${listingId}/media/${mediaId}/primary`);
  }
}

export const listingService = new ListingService();
