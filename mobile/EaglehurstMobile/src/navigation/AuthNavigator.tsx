/**
 * Auth Navigator
 * Authentication flow navigation
 */

import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import {
  LoginScreen,
  RegisterScreen,
  VerifyEmailScreen,
  ForgotPasswordScreen,
} from '../screens/auth';
import { AuthStackParamList } from '../types';
import { colors } from '../theme';

const Stack = createStackNavigator<AuthStackParamList>();

export const AuthNavigator: React.FC = () => {
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
          fontWeight: '600',
        },
        headerBackTitleVisible: false,
        cardStyle: {
          backgroundColor: colors.background.default,
        },
      }}>
      <Stack.Screen
        name="Login"
        component={LoginScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="Register"
        component={RegisterScreen}
        options={{ headerShown: false }}
      />
      <Stack.Screen
        name="VerifyEmail"
        component={VerifyEmailScreen}
        options={{
          title: 'Verify Email',
          headerLeft: () => null, // Prevent going back
        }}
      />
      <Stack.Screen
        name="ForgotPassword"
        component={ForgotPasswordScreen}
        options={{ title: 'Reset Password' }}
      />
    </Stack.Navigator>
  );
};

export default AuthNavigator;

