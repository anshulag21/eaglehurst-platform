/**
 * Listings API
 * All listing-related endpoints
 */

import apiClient from './client';
import {
  Listing,
  CreateListingRequest,
  ListingFilters,
  PaginatedResponse,
  ApiResponse,
} from '../types';

/**
 * Transform listing from backend format to frontend format
 * Backend uses 'id', frontend uses 'listing_id'
 */
const transformListing = (listing: any): any => ({
  ...listing,
  listing_id: listing.id || listing.listing_id, // Ensure listing_id exists
});

export const listingsAPI = {
  /**
   * Get all listings with filters
   */
  getListings: async (
    filters?: ListingFilters
  ): Promise<ApiResponse<PaginatedResponse<Listing>>> => {
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

    const response = await apiClient.get<any>(url);
    
    // Transform listings to add listing_id
    if (response.success && response.data?.items) {
      response.data.items = response.data.items.map(transformListing);
    }
    
    return response;
  },

  /**
   * Get single listing by ID
   */
  getListing: async (id: string): Promise<ApiResponse<Listing>> => {
    const response = await apiClient.get<any>(`/listings/${id}`);
    
    // Transform listing to add listing_id
    if (response.success && response.data) {
      response.data = transformListing(response.data);
    }
    
    return response;
  },

  /**
   * Create new listing (Sellers only)
   */
  createListing: async (
    listingData: CreateListingRequest
  ): Promise<ApiResponse<Listing>> => {
    return apiClient.post<Listing>('/listings', listingData);
  },

  /**
   * Update listing (Sellers only)
   */
  updateListing: async (
    id: string,
    listingData: Partial<CreateListingRequest>
  ): Promise<ApiResponse<Listing>> => {
    return apiClient.put<Listing>(`/listings/${id}`, listingData);
  },

  /**
   * Delete listing (Sellers only)
   */
  deleteListing: async (id: string): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.delete(`/listings/${id}`);
  },

  /**
   * Upload listing media
   */
  uploadListingMedia: async (
    listingId: string,
    files: any[],
    onProgress?: (progress: number) => void
  ): Promise<ApiResponse<{ media_urls: string[] }>> => {
    return apiClient.uploadFiles(
      `/listings/${listingId}/media`,
      files,
      'media_files',
      onProgress
    );
  },

  /**
   * Delete media file
   */
  deleteListingMedia: async (
    listingId: string,
    mediaId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.delete(`/listings/${listingId}/media/${mediaId}`);
  },

  /**
   * Set primary media
   */
  setPrimaryMedia: async (
    listingId: string,
    mediaId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.put(`/listings/${listingId}/media/${mediaId}/primary`);
  },

  /**
   * Get seller's listings
   */
  getSellerListings: async (
    filters?: Partial<ListingFilters>
  ): Promise<ApiResponse<PaginatedResponse<Listing>>> => {
    const params = new URLSearchParams();

    if (filters) {
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
    }

    const queryString = params.toString();
    const url = queryString
      ? `/listings/seller/my-listings?${queryString}`
      : '/listings/seller/my-listings';

    const response = await apiClient.get<any>(url);
    
    // Transform backend response format to match expected format
    // Backend returns: { listings: [...], total_count: ... }
    // Frontend expects: { items: [...], total: ..., page: ..., pages: ..., limit: ... }
    if (response.success && response.data) {
      // Transform each listing to add listing_id (backend uses 'id')
      const transformedListings = (response.data.listings || []).map((listing: any) => ({
        ...listing,
        listing_id: listing.id, // Add listing_id for consistency
      }));
      
      const transformedData = {
        items: transformedListings,
        total: response.data.total_count || 0,
        page: 1,
        pages: 1,
        limit: transformedListings.length,
      };
      return {
        ...response,
        data: transformedData,
      };
    }
    
    return response;
  },

  /**
   * Save listing (Buyers only)
   */
  saveListing: async (
    listingId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.post(`/listings/${listingId}/save`);
  },

  /**
   * Unsave listing (Buyers only)
   */
  unsaveListing: async (
    listingId: string
  ): Promise<ApiResponse<{ message: string }>> => {
    return apiClient.delete(`/listings/${listingId}/save`);
  },

  /**
   * Get saved listings (Buyers only)
   */
  getSavedListings: async (params?: {
    skip?: number;
    limit?: number;
  }): Promise<ApiResponse<any>> => {
    const searchParams = new URLSearchParams();

    if (params?.skip !== undefined) {
      searchParams.append('skip', params.skip.toString());
    }
    if (params?.limit !== undefined) {
      searchParams.append('limit', params.limit.toString());
    }

    const queryString = searchParams.toString();
    const url = queryString ? `/listings/saved?${queryString}` : '/listings/saved';

    const response = await apiClient.get<any>(url);
    
    // Transform listings to add listing_id
    if (response.success && response.data?.listings) {
      response.data.listings = response.data.listings.map(transformListing);
    }
    
    return response;
  },

  /**
   * Get listing analytics (Sellers only)
   */
  getListingAnalytics: async (listingId: string): Promise<ApiResponse<any>> => {
    return apiClient.get(`/listings/${listingId}/analytics`);
  },
};

export default listingsAPI;

