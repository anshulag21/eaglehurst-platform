/**
 * App Navigator
 * Main application navigation
 */

import React, { useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { useAppDispatch, useAppSelector, initializeAuth } from '../store';
import { Loading } from '../components/common';
import AuthNavigator from './AuthNavigator';
import BuyerStackNavigator from './BuyerStackNavigator';
import SellerStackNavigator from './SellerStackNavigator';
import { RootStackParamList } from '../types';

const Stack = createStackNavigator<RootStackParamList>();

export const AppNavigator: React.FC = () => {
  const dispatch = useAppDispatch();
  const { user, isAuthenticated, isInitialized } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(initializeAuth());
  }, [dispatch]);

  if (!isInitialized) {
    return <Loading fullScreen message="Loading..." />;
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        ) : user?.user_type === 'buyer' ? (
          <Stack.Screen name="Main" component={BuyerStackNavigator} />
        ) : user?.user_type === 'seller' ? (
          <Stack.Screen name="Main" component={SellerStackNavigator} />
        ) : (
          <Stack.Screen name="Auth" component={AuthNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;

