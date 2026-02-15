/**
 * Buyer Dashboard Screen
 * Overview of buyer activities and stats
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
import { Card, Loading, EmptyState, Badge } from '../../components/common';
import { useAppSelector, useAppDispatch, fetchListings } from '../../store';
import { connectionsAPI, listingsAPI } from '../../api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Connection, DashboardStats } from '../../types';

export const BuyerDashboardScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.auth);
  const { items: listings } = useAppSelector((state) => state.listings);

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [recentConnections, setRecentConnections] = useState<Connection[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadDashboardData = async () => {
    try {
      // Fetch connections
      const connectionsResponse = await connectionsAPI.getUserConnections({
        limit: 5,
        status: 'approved',
      });

      if (connectionsResponse.success && connectionsResponse.data) {
        setRecentConnections(connectionsResponse.data.items || []);
        // Calculate stats from connections data
        const allConnections = connectionsResponse.data.items || [];
        setStats({
          total_connections: allConnections.length,
          pending_requests: allConnections.filter((c: Connection) => c.status === 'pending').length,
          saved_listings: 0, // TODO: Fetch from saved listings API
        });
      }

      // Fetch recent listings
      dispatch(fetchListings({ limit: 10, status: 'active' }));
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

  if (isLoading) {
    return <Loading fullScreen message="Loading dashboard..." />;
  }

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
        <Text style={styles.greeting}>Welcome back,</Text>
        <Text style={styles.userName}>{user?.full_name || 'Buyer'}</Text>
        <Text style={styles.subtitle}>Find your perfect medical business</Text>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsGrid}>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.total_connections || 0}</Text>
          <Text style={styles.statLabel}>Connections</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.pending_requests || 0}</Text>
          <Text style={styles.statLabel}>Pending</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{stats?.saved_listings || 0}</Text>
          <Text style={styles.statLabel}>Saved</Text>
        </Card>
        <Card style={styles.statCard}>
          <Text style={styles.statValue}>{(listings || []).length}</Text>
          <Text style={styles.statLabel}>Available</Text>
        </Card>
      </View>

      {/* Quick Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('Listings' as never)}>
            <Text style={styles.actionIcon}>🔍</Text>
            <Text style={styles.actionLabel}>Browse Listings</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionCard}
            onPress={() => navigation.navigate('SavedListings' as never)}>
            <Text style={styles.actionIcon}>❤️</Text>
            <Text style={styles.actionLabel}>Saved Listings</Text>
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
            <Text style={styles.actionIcon}>⚙️</Text>
            <Text style={styles.actionLabel}>Settings</Text>
          </TouchableOpacity>
        </View>
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
            message="Start connecting with sellers to view them here"
            actionLabel="Browse Listings"
            onAction={() => navigation.navigate('Listings' as never)}
          />
        ) : (
          <View style={styles.connectionsList}>
            {recentConnections.map((connection) => (
              <Card key={connection.connection_id} style={styles.connectionCard}>
                <View style={styles.connectionHeader}>
                  <View>
                    <Text style={styles.connectionName}>
                      {connection.seller_name || 'Seller'}
                    </Text>
                    <Text style={styles.connectionBusiness}>
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
                {connection.last_message && (
                  <Text style={styles.lastMessage} numberOfLines={1}>
                    {connection.last_message}
                  </Text>
                )}
              </Card>
            ))}
          </View>
        )}
      </View>

      {/* Featured Listings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Featured Listings</Text>
          <TouchableOpacity onPress={() => navigation.navigate('Listings' as never)}>
            <Text style={styles.seeAllLink}>See All →</Text>
          </TouchableOpacity>
        </View>

        {!listings || listings.length === 0 ? (
          <EmptyState
            icon="📋"
            title="No Listings Available"
            message="Check back later for new opportunities"
          />
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {listings.slice(0, 5).map((listing) => (
              <Card key={listing.listing_id} style={styles.listingCard}>
                <View style={styles.listingImagePlaceholder}>
                  <Text style={styles.listingImageIcon}>🏥</Text>
                </View>
                <View style={styles.listingInfo}>
                  <Text style={styles.listingTitle} numberOfLines={1}>
                    {listing.title}
                  </Text>
                  <Text style={styles.listingLocation}>{listing.location}</Text>
                  <Text style={styles.listingPrice}>
                    £{listing.asking_price?.toLocaleString()}
                  </Text>
                </View>
              </Card>
            ))}
          </ScrollView>
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
    marginBottom: spacing.xl,
  },
  greeting: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },
  userName: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    ...typography.bodyMedium,
    color: colors.text.hint,
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
    marginBottom: spacing.sm,
  },
  connectionName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
  },
  connectionBusiness: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  lastMessage: {
    ...typography.bodyMedium,
    color: colors.text.hint,
    marginTop: spacing.xs,
  },
  listingCard: {
    width: 200,
    marginRight: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  listingImagePlaceholder: {
    width: '100%',
    height: 120,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  listingImageIcon: {
    fontSize: 48,
  },
  listingInfo: {
    padding: spacing.md,
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
    marginBottom: spacing.xs,
  },
  listingPrice: {
    ...typography.bodyLarge,
    color: colors.primary[500],
    fontWeight: '700',
  },
});

export default BuyerDashboardScreen;

