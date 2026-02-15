/**
 * Listings Slice
 * Listings state management
 */

import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import { listingsAPI } from '../../api';
import { Listing, ListingFilters } from '../../types';

interface ListingsState {
  items: Listing[];
  currentListing: Listing | null;
  savedListings: Listing[];
  myListings: Listing[];
  isLoading: boolean;
  error: string | null;
  filters: ListingFilters;
  pagination: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
  hasMore: boolean;
}

const initialState: ListingsState = {
  items: [],
  currentListing: null,
  savedListings: [],
  myListings: [],
  isLoading: false,
  error: null,
  filters: {
    page: 1,
    limit: 20,
  },
  pagination: {
    page: 1,
    pages: 1,
    total: 0,
    limit: 20,
  },
  hasMore: true,
};

// Async Thunks
export const fetchListings = createAsyncThunk(
  'listings/fetchListings',
  async (filters: ListingFilters | undefined, { rejectWithValue }) => {
    try {
      const response = await listingsAPI.getListings(filters);

      if (response.success && response.data) {
        return response.data;
      }

      return rejectWithValue(response.error?.message || 'Failed to fetch listings');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch listings');
    }
  }
);

export const fetchListingById = createAsyncThunk(
  'listings/fetchListingById',
  async (id: string, { rejectWithValue }) => {
    try {
      const response = await listingsAPI.getListing(id);

      if (response.success && response.data) {
        return response.data;
      }

      return rejectWithValue(response.error?.message || 'Failed to fetch listing');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch listing');
    }
  }
);

export const fetchSavedListings = createAsyncThunk(
  'listings/fetchSavedListings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await listingsAPI.getSavedListings();

      if (response.success && response.data) {
        return response.data.items.map((item: any) => item.listing);
      }

      return rejectWithValue(response.error?.message || 'Failed to fetch saved listings');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch saved listings');
    }
  }
);

export const fetchMyListings = createAsyncThunk(
  'listings/fetchMyListings',
  async (_, { rejectWithValue }) => {
    try {
      const response = await listingsAPI.getSellerListings();

      if (response.success && response.data) {
        return response.data.items;
      }

      return rejectWithValue(response.error?.message || 'Failed to fetch my listings');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to fetch my listings');
    }
  }
);

export const saveListing = createAsyncThunk(
  'listings/saveListing',
  async (listingId: string, { rejectWithValue }) => {
    try {
      const response = await listingsAPI.saveListing(listingId);

      if (response.success) {
        return listingId;
      }

      return rejectWithValue(response.error?.message || 'Failed to save listing');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to save listing');
    }
  }
);

export const unsaveListing = createAsyncThunk(
  'listings/unsaveListing',
  async (listingId: string, { rejectWithValue }) => {
    try {
      const response = await listingsAPI.unsaveListing(listingId);

      if (response.success) {
        return listingId;
      }

      return rejectWithValue(response.error?.message || 'Failed to unsave listing');
    } catch (error: any) {
      return rejectWithValue(error.message || 'Failed to unsave listing');
    }
  }
);

// Slice
const listingsSlice = createSlice({
  name: 'listings',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setFilters: (state, action: PayloadAction<ListingFilters>) => {
      state.filters = action.payload;
    },
    clearListings: (state) => {
      state.items = [];
      state.pagination = initialState.pagination;
      state.hasMore = true;
    },
    clearCurrentListing: (state) => {
      state.currentListing = null;
    },
  },
  extraReducers: (builder) => {
    // Fetch Listings
    builder.addCase(fetchListings.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchListings.fulfilled, (state, action) => {
      state.isLoading = false;
      const { items, pagination } = action.payload;

      if (pagination.page === 1) {
        state.items = items;
      } else {
        state.items = [...state.items, ...items];
      }

      state.pagination = pagination;
      state.hasMore = pagination.page < pagination.pages;
    });
    builder.addCase(fetchListings.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Listing By ID
    builder.addCase(fetchListingById.pending, (state) => {
      state.isLoading = true;
      state.error = null;
    });
    builder.addCase(fetchListingById.fulfilled, (state, action) => {
      state.isLoading = false;
      state.currentListing = action.payload;
    });
    builder.addCase(fetchListingById.rejected, (state, action) => {
      state.isLoading = false;
      state.error = action.payload as string;
    });

    // Fetch Saved Listings
    builder.addCase(fetchSavedListings.fulfilled, (state, action) => {
      state.savedListings = action.payload;
    });

    // Fetch My Listings
    builder.addCase(fetchMyListings.fulfilled, (state, action) => {
      state.myListings = action.payload;
    });

    // Save Listing
    builder.addCase(saveListing.fulfilled, (state, action) => {
      const listingId = action.payload;
      const listing = state.items.find((l) => l.listing_id === listingId);
      if (listing && !state.savedListings.find((l) => l.listing_id === listingId)) {
        state.savedListings.push(listing);
      }
    });

    // Unsave Listing
    builder.addCase(unsaveListing.fulfilled, (state, action) => {
      const listingId = action.payload;
      state.savedListings = state.savedListings.filter((l) => l.listing_id !== listingId);
    });
  },
});

export const { clearError, setFilters, clearListings, clearCurrentListing } =
  listingsSlice.actions;
export default listingsSlice.reducer;

