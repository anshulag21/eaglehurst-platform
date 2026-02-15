/**
 * Buyer Tab Navigator
 * Bottom tab navigation for buyers
 */

import React from 'react';
import { Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { BuyerTabParamList } from '../types';
import { colors, typography } from '../theme';
import {
  BuyerDashboardScreen,
  ListingsScreen,
  SavedListingsScreen,
  ConnectionsScreen,
} from '../screens/buyer';
import { ProfileScreen } from '../screens/common';

const Tab = createBottomTabNavigator<BuyerTabParamList>();

export const BuyerTabNavigator: React.FC = () => {
  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.primary[500],
        tabBarInactiveTintColor: colors.text.secondary,
        tabBarStyle: {
          backgroundColor: colors.background.paper,
          borderTopColor: colors.border.light,
          paddingBottom: 8,
          paddingTop: 8,
          height: 60,
        },
        tabBarLabelStyle: {
          ...typography.caption,
          fontWeight: '600',
        },
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
      <Tab.Screen
        name="BuyerDashboard"
        component={BuyerDashboardScreen}
        options={{
          title: 'Dashboard',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🏠</Text>,
        }}
      />
      <Tab.Screen
        name="Listings"
        component={ListingsScreen}
        options={{
          title: 'Browse',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>🔍</Text>,
        }}
      />
      <Tab.Screen
        name="SavedListings"
        component={SavedListingsScreen}
        options={{
          title: 'Saved',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>❤️</Text>,
        }}
      />
      <Tab.Screen
        name="Connections"
        component={ConnectionsScreen}
        options={{
          title: 'Connections',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>💬</Text>,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          title: 'Profile',
          tabBarIcon: () => <Text style={{ fontSize: 24 }}>👤</Text>,
        }}
      />
    </Tab.Navigator>
  );
};

export default BuyerTabNavigator;

