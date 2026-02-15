/**
 * Buyer Stack Navigator
 * Stack navigation for buyer screens with modals
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import BuyerTabNavigator from './BuyerTabNavigator';
import { ListingDetailScreen } from '../screens/buyer';
import { ChatScreen } from '../screens/common';
import { colors, typography } from '../theme';

const Stack = createStackNavigator();

export const BuyerStackNavigator: React.FC = () => {
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
        name="BuyerTabs"
        component={BuyerTabNavigator}
        options={{ headerShown: false }}
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

export default BuyerStackNavigator;

