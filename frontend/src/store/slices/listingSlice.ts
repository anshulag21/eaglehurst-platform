import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import type { Listing, ListingFilters, PaginatedResponse, CreateListingRequest, SavedListingItem, SavedListingsResponse } from '../../types';
import { listingService } from '../../services/listing.service';

interface ListingState {
  listings: Listing[];
  currentListing: Listing | null;
  myListings: Listing[];
  savedListings: SavedListingItem[];
  pagination: {
    current_page: number;
    total_pages: number;
    total_items: number;
    items_per_page: number;
  } | null;
  savedListingsPagination: {
    total: number;
    skip: number;
    limit: number;
    has_more: boolean;
  } | null;
  filters: ListingFilters;
  isLoading: boolean;
  isCreating: boolean;
  isUpdating: boolean;
  error: string | null;
}

const initialState: ListingState = {
  listings: [],
  currentListing: null,
  myListings: [],
  savedListings: [],
  pagination: null,
  savedListingsPagination: null,
  filters: {
    page: 1,
    limit: 20,
    sort_by: 'created_at',
    sort_order: 'desc',
  },
  isLoading: false,
  isCreating: false,
  isUpdating: false,
  error: null,
};

// Async thunks
export const fetchListings = createAsyncThunk(
  'listings/fetchListings',
  async (filters: ListingFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await listingService.getListings(filters);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch listings');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch listings');
    }
  }
);

export const fetchListing = createAsyncThunk(
  'listings/fetchListing',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await listingService.getListing(id);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch listing');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch listing');
    }
  }
);

export const createListing = createAsyncThunk(
  'listings/createListing',
  async (listingData: CreateListingRequest, { rejectWithValue }) => {
    try {
      const response = await listingService.createListing(listingData);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to create listing');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to create listing');
    }
  }
);

export const updateListing = createAsyncThunk(
  'listings/updateListing',
  async ({ id, data }: { id: string; data: Partial<CreateListingRequest> }, { rejectWithValue }) => {
    try {
      const response = await listingService.updateListing(id, data);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to update listing');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to update listing');
    }
  }
);

export const deleteListing = createAsyncThunk(
  'listings/deleteListing',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await listingService.deleteListing(id);
      if (response.success) {
        return id;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to delete listing');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to delete listing');
    }
  }
);

export const fetchMyListings = createAsyncThunk(
  'listings/fetchMyListings',
  async (filters: Partial<ListingFilters> | undefined, { rejectWithValue }) => {
    try {
      const response = await listingService.getSellerListings(filters);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch your listings');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch your listings');
    }
  }
);

export const fetchSavedListings = createAsyncThunk(
  'listings/fetchSavedListings',
  async (params: { skip?: number; limit?: number; filters?: Partial<ListingFilters> } | undefined, { rejectWithValue }) => {
    try {
      const response = await listingService.getSavedListings(params);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to fetch saved listings');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch saved listings');
    }
  }
);

export const saveListing = createAsyncThunk(
  'listings/saveListing',
  async (listingId: string, { rejectWithValue }) => {
    try {
      const response = await listingService.saveListing(listingId);
      if (response.success) {
        return listingId;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to save listing');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save listing');
    }
  }
);

export const unsaveListing = createAsyncThunk(
  'listings/unsaveListing',
  async (listingId: string, { rejectWithValue }) => {
    try {
      const response = await listingService.unsaveListing(listingId);
      if (response.success) {
        return listingId;
      } else {
        return rejectWithValue(response.error?.message || 'Failed to unsave listing');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unsave listing');
    }
  }
);

export const searchListings = createAsyncThunk(
  'listings/searchListings',
  async ({ query, filters }: { query: string; filters?: ListingFilters }, { rejectWithValue }) => {
    try {
      const response = await listingService.searchListings(query, filters);
      if (response.success && response.data) {
        return response.data;
      } else {
        return rejectWithValue(response.error?.message || 'Search failed');
      }
    } catch (error: any) {
      return rejectWithValue(error.message || 'Search failed');
    }
  }
);

const listingSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<Partial<ListingFilters>>) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    clearCurrentListing: (state) => {
      state.currentListing = null;
    },
    clearListings: (state) => {
      state.listings = [];
      state.pagination = null;
    },
  },
  extraReducers: (builder) => {
    builder
      // Fetch listings
      .addCase(fetchListings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchListings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.listings = action.payload.listings;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(fetchListings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch single listing
      .addCase(fetchListing.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchListing.fulfilled, (state, action) => {
        state.isLoading = false;
        state.currentListing = action.payload;
        state.error = null;
      })
      .addCase(fetchListing.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Create listing
      .addCase(createListing.pending, (state) => {
        state.isCreating = true;
        state.error = null;
      })
      .addCase(createListing.fulfilled, (state, action) => {
        state.isCreating = false;
        state.myListings.unshift(action.payload);
        state.error = null;
      })
      .addCase(createListing.rejected, (state, action) => {
        state.isCreating = false;
        state.error = action.payload as string;
      })
      
      // Update listing
      .addCase(updateListing.pending, (state) => {
        state.isUpdating = true;
        state.error = null;
      })
      .addCase(updateListing.fulfilled, (state, action) => {
        state.isUpdating = false;
        const index = state.myListings.findIndex(listing => listing.id === action.payload.id);
        if (index !== -1) {
          state.myListings[index] = action.payload;
        }
        if (state.currentListing?.id === action.payload.id) {
          state.currentListing = action.payload;
        }
        state.error = null;
      })
      .addCase(updateListing.rejected, (state, action) => {
        state.isUpdating = false;
        state.error = action.payload as string;
      })
      
      // Delete listing
      .addCase(deleteListing.fulfilled, (state, action) => {
        state.myListings = state.myListings.filter(listing => listing.id !== action.payload);
        state.listings = state.listings.filter(listing => listing.id !== action.payload);
        if (state.currentListing?.id === action.payload) {
          state.currentListing = null;
        }
      })
      
      // Fetch my listings
      .addCase(fetchMyListings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchMyListings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.myListings = action.payload.items;
        state.error = null;
      })
      .addCase(fetchMyListings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Fetch saved listings
      .addCase(fetchSavedListings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchSavedListings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.savedListings = action.payload.items;
        state.savedListingsPagination = {
          total: action.payload.total,
          skip: action.payload.skip,
          limit: action.payload.limit,
          has_more: action.payload.has_more
        };
        state.error = null;
      })
      .addCase(fetchSavedListings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      })
      
      // Search listings
      .addCase(searchListings.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(searchListings.fulfilled, (state, action) => {
        state.isLoading = false;
        state.listings = action.payload.listings;
        state.pagination = action.payload.pagination;
        state.error = null;
      })
      .addCase(searchListings.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearError, setFilters, clearCurrentListing, clearListings } = listingSlice.actions;
export default listingSlice.reducer;
