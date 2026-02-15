/**
 * Seller Stack Navigator
 * Stack navigation for seller screens with modals
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import SellerTabNavigator from './SellerTabNavigator';
import { CreateListingScreen } from '../screens/seller';
import { ListingDetailScreen } from '../screens/buyer';
import { ChatScreen } from '../screens/common';
import { colors, typography } from '../theme';

const Stack = createStackNavigator();

export const SellerStackNavigator: React.FC = () => {
  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: {
          backgroundColor: colors.background.paper,
          elevation: 0,
          shadowOpacity: 0,
        },
        headerTintColor: colors.text.primary,
        headerTitleStyle: {
          ...typography.titleLarge,
          fontWeight: '600',
        },
      }}>
      <Stack.Screen
        name="SellerTabs"
        component={SellerTabNavigator}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="CreateListing"
        component={CreateListingScreen}
        options={{
          title: 'Create Listing',
          presentation: 'modal',
        }}
      />
      <Stack.Screen
        name="ListingDetail"
        component={ListingDetailScreen}
        options={{
          title: 'Listing Details',
        }}
      />
      <Stack.Screen
        name="Chat"
        component={ChatScreen}
        options={{
          title: 'Messages',
        }}
      />
    </Stack.Navigator>
  );
};

export default SellerStackNavigator;

