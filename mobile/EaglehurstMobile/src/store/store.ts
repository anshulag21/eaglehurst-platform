/**
 * Redux Store Configuration
 */

import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import listingsReducer from './slices/listingsSlice';
import connectionsReducer from './slices/connectionsSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    listings: listingsReducer,
    connections: connectionsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // Ignore these action types to prevent serialization warnings
        ignoredActions: [
          'auth/login/fulfilled',
          'auth/login/rejected',
          'auth/register/fulfilled',
          'auth/register/rejected',
          'auth/initialize/fulfilled',
          'auth/initialize/rejected',
          'auth/refreshProfile/fulfilled',
          'auth/refreshProfile/rejected',
        ],
        // Ignore these paths in the state
        ignoredPaths: ['auth.error'],
      },
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;

