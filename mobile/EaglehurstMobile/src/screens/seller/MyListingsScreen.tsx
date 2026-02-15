/**
 * My Listings Screen
 * Manage seller's listings
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Loading, EmptyState, Badge, Button } from '../../components/common';
import { listingsAPI } from '../../api';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Listing } from '../../types';

type TabType = 'all' | 'active' | 'pending' | 'rejected' | 'draft';

export const MyListingsScreen: React.FC = () => {
  const navigation = useNavigation();

  const [listings, setListings] = useState<Listing[]>([]);
  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadListings();
  }, [activeTab]);

  const loadListings = async () => {
    try {
      const filters = activeTab !== 'all' ? { status: activeTab } : {};
      console.log('📋 Loading seller listings with filters:', filters);
      const response = await listingsAPI.getSellerListings(filters);
      console.log('📋 Seller listings response:', JSON.stringify(response, null, 2));

      if (response.success && response.data) {
        const items = response.data.items || [];
        console.log('📋 Setting listings:', items.length, 'items');
        setListings(items);
      } else {
        console.error('❌ Failed to load listings:', response.error);
        setListings([]);
      }
    } catch (error) {
      console.error('❌ Exception loading listings:', error);
      setListings([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadListings();
  };

  const handleDeleteListing = (listingId: string) => {
    Alert.alert(
      'Delete Listing',
      'Are you sure you want to delete this listing? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await listingsAPI.deleteListing(listingId);
              if (response.success) {
                Alert.alert('Success', 'Listing deleted successfully');
                loadListings();
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to delete listing');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to delete listing');
            }
          },
        },
      ]
    );
  };

  const filteredListings = (listings || []).filter((listing) => {
    if (activeTab === 'all') return true;
    return listing.status === activeTab;
  });

  const renderListingCard = ({ item }: { item: Listing }) => (
    <Card style={styles.listingCard}>
      {/* Listing Header */}
      <View style={styles.listingHeader}>
        <View style={styles.listingInfo}>
          <Text style={styles.listingTitle} numberOfLines={2}>
            {item.title}
          </Text>
          <Text style={styles.listingLocation}>📍 {item.location}</Text>
        </View>
        <Badge
          text={item.status}
          variant={
            item.status === 'active'
              ? 'success'
              : item.status === 'pending'
              ? 'warning'
              : item.status === 'rejected'
              ? 'error'
              : 'default'
          }
        />
      </View>

      {/* Listing Details */}
      <View style={styles.listingDetails}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Price:</Text>
          <Text style={styles.detailValue}>£{item.asking_price?.toLocaleString()}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Type:</Text>
          <Text style={styles.detailValue}>{item.business_type}</Text>
        </View>
        {item.turnover && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Turnover:</Text>
            <Text style={styles.detailValue}>£{item.turnover.toLocaleString()}</Text>
          </View>
        )}
      </View>

      {/* Stats */}
      <View style={styles.listingStats}>
        <Text style={styles.statItem}>👁️ {item.view_count || 0} views</Text>
        <Text style={styles.statItem}>
          💬 {item.connection_count || 0} requests
        </Text>
        <Text style={styles.statItem}>❤️ {item.saved_count || 0} saved</Text>
      </View>

      {/* Actions */}
      <View style={styles.listingActions}>
        <Button
          title="Edit"
          variant="outline"
          size="small"
          onPress={() =>
            navigation.navigate('EditListing' as never, { listingId: item.listing_id })
          }
          style={styles.actionButton}
        />
        <Button
          title="View"
          variant="secondary"
          size="small"
          onPress={() =>
            navigation.navigate('ListingDetail' as never, { listingId: item.listing_id })
          }
          style={styles.actionButton}
        />
        <Button
          title="Delete"
          variant="danger"
          size="small"
          onPress={() => handleDeleteListing(item.listing_id)}
          style={styles.actionButton}
        />
      </View>

      {/* Rejection Reason */}
      {item.status === 'rejected' && item.rejection_reason && (
        <View style={styles.rejectionNote}>
          <Text style={styles.rejectionLabel}>❌ Rejection Reason:</Text>
          <Text style={styles.rejectionText}>{item.rejection_reason}</Text>
        </View>
      )}
    </Card>
  );

  const renderEmptyState = () => {
    const messages = {
      all: {
        icon: '📋',
        title: 'No Listings',
        message: 'Create your first listing to get started',
      },
      active: {
        icon: '✅',
        title: 'No Active Listings',
        message: 'Your active listings will appear here',
      },
      pending: {
        icon: '⏳',
        title: 'No Pending Listings',
        message: 'Listings awaiting approval will appear here',
      },
      rejected: {
        icon: '❌',
        title: 'No Rejected Listings',
        message: 'Rejected listings will appear here',
      },
      draft: {
        icon: '📝',
        title: 'No Draft Listings',
        message: 'Your draft listings will appear here',
      },
    };

    const { icon, title, message } = messages[activeTab];

    return (
      <EmptyState
        icon={icon}
        title={title}
        message={message}
        actionLabel="Create Listing"
        onAction={() => navigation.navigate('CreateListing' as never)}
      />
    );
  };

  if (isLoading) {
    return <Loading fullScreen message="Loading listings..." />;
  }

  return (
    <View style={styles.container}>
      {/* Debug Info */}
      <View style={{ padding: 10, backgroundColor: '#f0f0f0', borderBottomWidth: 1 }}>
        <Text style={{ fontSize: 12, color: '#666' }}>
          📊 Total Listings: {listings.length} | Filtered: {filteredListings.length} | Tab: {activeTab}
        </Text>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <Button
          title="+ Create Listing"
          variant="primary"
          size="medium"
          onPress={() => navigation.navigate('CreateListing' as never)}
        />
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'active', 'pending', 'rejected', 'draft'] as TabType[]).map((tab) => (
          <TouchableOpacity
            key={tab}
            style={[styles.tab, activeTab === tab && styles.tabActive]}
            onPress={() => setActiveTab(tab)}>
            <Text
              style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </Text>
            {tab !== 'all' && (
              <View style={styles.tabBadge}>
                <Text style={styles.tabBadgeText}>
                  {(listings || []).filter((l) => l.status === tab).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Listings List */}
      <FlatList
        data={filteredListings}
        renderItem={renderListingCard}
        keyExtractor={(item) => item.listing_id}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={renderEmptyState}
        refreshControl={
          <RefreshControl
            refreshing={isRefreshing}
            onRefresh={handleRefresh}
            tintColor={colors.primary[500]}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tabs: {
    flexDirection: 'row',
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: spacing.md,
    gap: spacing.xs,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: colors.primary[500],
  },
  tabText: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    fontWeight: '600',
    fontSize: 12,
  },
  tabTextActive: {
    color: colors.primary[500],
  },
  tabBadge: {
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.full,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tabBadgeText: {
    ...typography.caption,
    color: colors.primary[700],
    fontWeight: '700',
    fontSize: 10,
  },
  listContent: {
    padding: spacing.md,
  },
  listingCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  listingInfo: {
    flex: 1,
    marginRight: spacing.sm,
  },
  listingTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  listingLocation: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  listingDetails: {
    gap: spacing.sm,
    marginBottom: spacing.md,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  detailLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  detailValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  listingStats: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  statItem: {
    ...typography.bodySmall,
    color: colors.text.hint,
  },
  listingActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  actionButton: {
    flex: 1,
  },
  rejectionNote: {
    marginTop: spacing.md,
    padding: spacing.md,
    backgroundColor: colors.error.background,
    borderRadius: borderRadius.md,
  },
  rejectionLabel: {
    ...typography.bodyMedium,
    color: colors.error.dark,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  rejectionText: {
    ...typography.bodyMedium,
    color: colors.error.dark,
  },
});

export default MyListingsScreen;

