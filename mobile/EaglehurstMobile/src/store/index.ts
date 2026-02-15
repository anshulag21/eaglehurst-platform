/**
 * Store Export
 */

export { store } from './store';
export type { RootState, AppDispatch } from './store';
export { useAppDispatch, useAppSelector } from './hooks';

// Export auth actions and thunks
export {
  initializeAuth,
  login,
  register,
  logout,
  refreshUserProfile,
  clearError as clearAuthError,
  updateUser,
} from './slices/authSlice';

// Export listings actions and thunks
export {
  fetchListings,
  fetchListingById,
  fetchSavedListings,
  fetchMyListings,
  saveListing,
  unsaveListing,
  clearError as clearListingsError,
  setFilters,
  clearListings,
  clearCurrentListing,
} from './slices/listingsSlice';

// Export connections actions and thunks
export {
  fetchConnections,
  fetchConnectionById,
  fetchMessages,
  sendMessage,
  createConnection,
  updateConnectionStatus,
  clearError as clearConnectionsError,
  clearCurrentConnection,
  addMessage,
} from './slices/connectionsSlice';

