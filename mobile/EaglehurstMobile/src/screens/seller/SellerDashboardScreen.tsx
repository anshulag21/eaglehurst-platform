/**
 * Seller Dashboard Screen
 * Overview of seller activities and analytics
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Loading, EmptyState, Badge, Button } from '../../components/common';
import { useAppSelector } from '../../store';
import { userAPI, listingsAPI, connectionsAPI } from '../../api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { SellerAnalytics, Listing, Connection } from '../../types';

export const SellerDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const { user } = useAppSelector((state) => state.auth);

  const [analytics, setAnalytics] = useState<SellerAnalytics | null>(null);
  const [recentListings, setRecentListings] = useState<Listing[]>([]);
  const [recentConnections, setRecentConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      // Fetch seller analytics
      const analyticsResponse = await userAPI.getSellerAnalytics();
      if (analyticsResponse.success && analyticsResponse.data) {
        setAnalytics(analyticsResponse.data);
      }

      // Fetch recent listings
      const listingsResponse = await listingsAPI.getSellerListings({ limit: 5 });
      if (listingsResponse.success && listingsResponse.data) {
        setRecentListings(listingsResponse.data.items || []);
      }

      // Fetch recent connections
      const connectionsResponse = await connectionsAPI.getUserConnections({
        limit: 5,
      });
      if (connectionsResponse.success && connectionsResponse.data) {
        setRecentConnections(connectionsResponse.data.items || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadDashboardData();
  };

  const getVerificationStatus = () => {
    const verificationStatus = user?.seller_profile?.verification_status;
    
    if (verificationStatus === 'approved' || verificationStatus === 'verified') {
      return { text: 'Verified ✓', color: colors.success.main };
    } else if (verificationStatus === 'pending') {
      return { text: 'Pending Review', color: colors.warning.main };
    } else if (verificationStatus === 'rejected') {
      return { text: 'Rejected', color: colors.error.main };
    }
    // For new users without verification status yet
    return { text: 'Not Verified', color: colors.text.secondary };
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

  const verificationStatus = getVerificationStatus();

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={
        <RefreshControl
          refreshing={isRefreshing}
          onRefresh={handleRefresh}
          tintColor={colors.primary[500]}
        />
      }>
      {/* Welcome Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Welcome back,</Text>
          <Text style={styles.userName}>{user?.full_name || 'Seller'}</Text>
        </View>
        <View style={styles.verificationBadge}>
          <Text style={[styles.verificationText, { color: verificationStatus.color }]}>
            {verificationStatus.text}
          </Text>
        </View>
      </View>

      {/* Verification Alert - Only show if pending or rejected, not for new users */}
      {user?.seller_profile?.verification_status === 'pending' && (
        <Card style={styles.alertCard}>
          <Text style={styles.alertIcon}>⏳</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Verification Pending</Text>
            <Text style={styles.alertMessage}>
              Your KYC documents are under review. We'll notify you once approved.
            </Text>
          </View>
        </Card>
      )}
      {user?.seller_profile?.verification_status === 'rejected' && (
        <Card style={styles.alertCard}>
          <Text style={styles.alertIcon}>⚠️</Text>
          <View style={styles.alertContent}>
            <Text style={styles.alertTitle}>Verification Required</Text>
            <Text style={styles.alertMessage}>
              Please resubmit your KYC documents to continue
            </Text>
            <Button
              title="Resubmit KYC"
              variant="primary"
              size="small"
              onPress={() => navigation.navigate('KYCVerification' as never)}
              style={styles.alertButton}
            />
          </View>
        </Card>
      )}

      {/* Analytics Cards */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{analytics?.total_listings || 0}</Text>
          <Text style={styles.statLabel}>Total Listings</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{analytics?.active_listings || 0}</Text>
          <Text style={styles.statLabel}>Active</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{analytics?.total_views || 0}</Text>
          <Text style={styles.statLabel}>Total Views</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{analytics?.total_inquiries || 0}</Text>
          <Text style={styles.statLabel}>Inquiries</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('CreateListing' as never)}>
            <Text style={styles.actionIcon}>➕</Text>
            <Text style={styles.actionLabel}>Create Listing</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('MyListings' as never)}>
            <Text style={styles.actionIcon}>📋</Text>
            <Text style={styles.actionLabel}>My Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Connections' as never)}>
            <Text style={styles.actionIcon}>💬</Text>
            <Text style={styles.actionLabel}>Messages</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Profile' as never)}>
            <Text style={styles.actionIcon}>📊</Text>
            <Text style={styles.actionLabel}>Analytics</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Recent Listings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Listings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('MyListings' as never)}>
            <Text style={styles.seeAllLink}>See All →</Text>
          </TouchableOpacity>
        </View>

        {!recentListings || recentListings.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No Listings Yet"
            message="Create your first listing to get started"
            actionLabel="Create Listing"
            onAction={() => navigation.navigate('CreateListing' as never)}
          />
        ) : (
          <View style={styles.listingsList}>
            {recentListings.map((listing) => (
              <Card key={listing.listing_id} style={styles.listingCard}>
                <View style={styles.listingHeader}>
                  <View style={styles.listingInfo}>
                    <Text style={styles.listingTitle} numberOfLines={1}>
                      {listing.title}
                    </Text>
                    <Text style={styles.listingLocation}>{listing.location}</Text>
                  </View>
                  <Badge
                    text={listing.status}
                    variant={
                      listing.status === 'active'
                        ? 'success'
                        : listing.status === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </View>
                <View style={styles.listingStats}>
                  <Text style={styles.listingStat}>👁️ {listing.view_count || 0} views</Text>
                  <Text style={styles.listingStat}>
                    💬 {listing.connection_count || 0} requests
                  </Text>
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* Recent Connections */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Connections</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Connections' as never)}>
            <Text style={styles.seeAllLink}>See All →</Text>
          </TouchableOpacity>
        </View>

        {!recentConnections || recentConnections.length === 0 ? (
          <EmptyState
            icon="🤝"
            title="No Connections Yet"
            message="Connections from buyers will appear here"
          />
        ) : (
          <View style={styles.connectionsList}>
            {recentConnections.map((connection) => (
              <Card key={connection.connection_id} style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <View>
                    <Text style={styles.connectionName}>
                      {connection.buyer_name || 'Buyer'}
                    </Text>
                    <Text style={styles.connectionListing}>
                      {connection.listing_title}
                    </Text>
                  </View>
                  <Badge
                    text={connection.status}
                    variant={
                      connection.status === 'approved'
                        ? 'success'
                        : connection.status === 'pending'
                        ? 'warning'
                        : 'default'
                    }
                  />
                </View>
              </Card>
            ))}
          </View>
        )}
      </View>
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.lg,
  },
  greeting: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },
  userName: {
    ...typography.headlineMedium,
    color: colors.text.primary,
  },
  verificationBadge: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.md,
    ...shadows.sm,
  },
  verificationText: {
    ...typography.bodyMedium,
    fontWeight: '600',
  },
  alertCard: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: colors.warning.background,
    marginBottom: spacing.lg,
  },
  alertIcon: {
    fontSize: 32,
    marginRight: spacing.md,
  },
  alertContent: {
    flex: 1,
  },
  alertTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  alertMessage: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  alertButton: {
    alignSelf: 'flex-start',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
    marginBottom: spacing.xl,
  },
  statCard: {
    flex: 1,
    minWidth: '45%',
    padding: spacing.lg,
    alignItems: 'center',
  },
  statValue: {
    ...typography.headlineLarge,
    color: colors.primary[500],
    fontWeight: '700',
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  sectionTitle: {
    ...typography.titleLarge,
    color: colors.text.primary,
    fontWeight: '600',
  },
  seeAllLink: {
    ...typography.bodyMedium,
    color: colors.primary[500],
    fontWeight: '600',
  },
  actionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.md,
  },
  actionCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: colors.background.paper,
    padding: spacing.lg,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    ...shadows.sm,
  },
  actionIcon: {
    fontSize: 32,
    marginBottom: spacing.sm,
  },
  actionLabel: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
    textAlign: 'center',
  },
  listingsList: {
    gap: spacing.md,
  },
  listingCard: {
    padding: spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  listingInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  listingTitle: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  listingLocation: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  listingStats: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  listingStat: {
    ...typography.bodyMedium,
    color: colors.text.hint,
  },
  connectionsList: {
    gap: spacing.md,
  },
  connectionCard: {
    padding: spacing.md,
  },
  connectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  connectionName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  connectionListing: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
});

export default SellerDashboardScreen;

