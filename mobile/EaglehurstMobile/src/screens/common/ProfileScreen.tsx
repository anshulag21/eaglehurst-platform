/**
 * Profile Screen
 * User profile and settings (shared by buyers and sellers)
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Avatar, Badge, Button } from '../../components/common';
import { useAppSelector, useAppDispatch, logout } from '../../store';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const ProfileScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: () => {
          dispatch(logout());
        },
      },
    ]);
  };

  const menuItems = [
    {
      icon: '👤',
      title: 'Edit Profile',
      subtitle: 'Update your personal information',
      onPress: () => navigation.navigate('EditProfile' as never),
    },
    {
      icon: '🔔',
      title: 'Notifications',
      subtitle: 'Manage notification preferences',
      onPress: () => navigation.navigate('NotificationSettings' as never),
    },
    {
      icon: '💳',
      title: 'Subscription',
      subtitle: 'Manage your subscription plan',
      onPress: () => navigation.navigate('Subscription' as never),
      show: user?.user_type === 'seller',
    },
    {
      icon: '🔐',
      title: 'Change Password',
      subtitle: 'Update your password',
      onPress: () => navigation.navigate('ChangePassword' as never),
    },
    {
      icon: '📄',
      title: 'Privacy Policy',
      subtitle: 'Read our privacy policy',
      onPress: () => navigation.navigate('PrivacyPolicy' as never),
    },
    {
      icon: '📋',
      title: 'Terms & Conditions',
      subtitle: 'Read our terms and conditions',
      onPress: () => navigation.navigate('TermsConditions' as never),
    },
    {
      icon: '❓',
      title: 'Help & Support',
      subtitle: 'Get help and contact support',
      onPress: () => navigation.navigate('Support' as never),
    },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Profile Header */}
      <Card style={styles.profileCard}>
        <View style={styles.profileHeader}>
          <Avatar name={user?.full_name || 'User'} size={80} />
          <View style={styles.profileInfo}>
            <Text style={styles.profileName}>{user?.full_name}</Text>
            <Text style={styles.profileEmail}>{user?.email}</Text>
            <Badge
              text={user?.user_type || 'User'}
              variant={user?.user_type === 'seller' ? 'primary' : 'secondary'}
              style={styles.userTypeBadge}
            />
          </View>
        </View>

        {/* Verification Status for Sellers */}
        {user?.user_type === 'seller' && (
          <View style={styles.verificationSection}>
            <View style={styles.verificationRow}>
              <Text style={styles.verificationLabel}>Verification Status:</Text>
              <Badge
                text={user?.verification_status || 'Not Verified'}
                variant={
                  user?.verification_status === 'verified'
                    ? 'success'
                    : user?.verification_status === 'pending'
                    ? 'warning'
                    : 'error'
                }
              />
            </View>
            {user?.verification_status !== 'verified' && (
              <Button
                title="Complete Verification"
                variant="primary"
                size="small"
                onPress={() => navigation.navigate('KYCVerification' as never)}
                style={styles.verificationButton}
              />
            )}
          </View>
        )}

        {/* Subscription Info for Sellers */}
        {user?.user_type === 'seller' && user?.subscription_plan && (
          <View style={styles.subscriptionSection}>
            <View style={styles.subscriptionRow}>
              <Text style={styles.subscriptionLabel}>Subscription:</Text>
              <Badge text={user.subscription_plan} variant="primary" />
            </View>
            {user.subscription_status === 'active' && (
              <Text style={styles.subscriptionExpiry}>
                Renews on: {new Date(user.subscription_end_date || '').toLocaleDateString()}
              </Text>
            )}
          </View>
        )}
      </Card>

      {/* Menu Items */}
      <View style={styles.menuSection}>
        {menuItems
          .filter((item) => item.show !== false)
          .map((item, index) => (
            <TouchableOpacity
              key={index}
              style={styles.menuItem}
              onPress={item.onPress}>
              <View style={styles.menuItemLeft}>
                <Text style={styles.menuIcon}>{item.icon}</Text>
                <View style={styles.menuItemContent}>
                  <Text style={styles.menuItemTitle}>{item.title}</Text>
                  <Text style={styles.menuItemSubtitle}>{item.subtitle}</Text>
                </View>
              </View>
              <Text style={styles.menuItemArrow}>›</Text>
            </TouchableOpacity>
          ))}
      </View>

      {/* Logout Button */}
      <Button
        title="Logout"
        variant="danger"
        size="large"
        fullWidth
        onPress={handleLogout}
        style={styles.logoutButton}
      />

      {/* App Version */}
      <Text style={styles.appVersion}>Version 1.0.0</Text>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    padding: spacing.lg,
  },
  profileCard: {
    padding: spacing.lg,
    marginBottom: spacing.lg,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    ...typography.titleLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  profileEmail: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  userTypeBadge: {
    alignSelf: 'flex-start',
  },
  verificationSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  verificationRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  verificationLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  verificationButton: {
    alignSelf: 'flex-start',
  },
  subscriptionSection: {
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
    marginTop: spacing.md,
  },
  subscriptionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  subscriptionLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  subscriptionExpiry: {
    ...typography.caption,
    color: colors.text.hint,
  },
  menuSection: {
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.lg,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  menuItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  menuIcon: {
    fontSize: 24,
    marginRight: spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  menuItemSubtitle: {
    ...typography.bodySmall,
    color: colors.text.secondary,
  },
  menuItemArrow: {
    ...typography.headlineSmall,
    color: colors.text.hint,
  },
  logoutButton: {
    marginBottom: spacing.lg,
  },
  appVersion: {
    ...typography.caption,
    color: colors.text.hint,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
});

export default ProfileScreen;

