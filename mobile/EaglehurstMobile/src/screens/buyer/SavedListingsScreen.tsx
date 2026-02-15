/**
 * Saved Listings Screen
 * View and manage saved/favorited listings
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
import { useAppSelector, useAppDispatch, fetchSavedListings, unsaveListing } from '../../store';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Listing } from '../../types';

export const SavedListingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { savedListings, isLoading } = useAppSelector((state) => state.listings);

  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadSavedListings();
  }, []);

  const loadSavedListings = async () => {
    await dispatch(fetchSavedListings());
    setIsRefreshing(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadSavedListings();
  };

  const handleUnsave = (listingId: string) => {
    Alert.alert(
      'Remove from Saved',
      'Are you sure you want to remove this listing from your saved items?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: async () => {
            await dispatch(unsaveListing(listingId));
          },
        },
      ]
    );
  };

  const handleListingPress = (listing: Listing) => {
    navigation.navigate('ListingDetail' as never, { listingId: listing.listing_id });
  };

  const renderListingCard = ({ item }: { item: Listing }) => (
    <TouchableOpacity onPress={() => handleListingPress(item)}>
      <Card style={styles.listingCard}>
        {/* Listing Image */}
        <View style={styles.listingImage}>
          <Text style={styles.listingImageIcon}>🏥</Text>
          <TouchableOpacity
            style={styles.unsaveButton}
            onPress={() => handleUnsave(item.listing_id)}>
            <Text style={styles.unsaveIcon}>❤️</Text>
          </TouchableOpacity>
        </View>

        {/* Listing Info */}
        <View style={styles.listingContent}>
          <View style={styles.listingHeader}>
            <Text style={styles.listingTitle} numberOfLines={2}>
              {item.title}
            </Text>
            <Badge
              text={item.status}
              variant={item.status === 'active' ? 'success' : 'default'}
            />
          </View>

          <Text style={styles.listingLocation}>📍 {item.location}</Text>

          <View style={styles.listingDetails}>
            <Text style={styles.detailItem}>🏢 {item.business_type}</Text>
            {item.turnover && (
              <Text style={styles.detailItem}>
                💰 £{item.turnover.toLocaleString()} turnover
              </Text>
            )}
          </View>

          <View style={styles.listingFooter}>
            <Text style={styles.listingPrice}>
              £{item.asking_price?.toLocaleString()}
            </Text>
            <Button
              title="View Details"
              variant="primary"
              size="small"
              onPress={() => handleListingPress(item)}
            />
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => (
    <EmptyState
      icon="❤️"
      title="No Saved Listings"
      message="Save listings you're interested in to view them here"
      actionLabel="Browse Listings"
      onAction={() => navigation.navigate('Listings' as never)}
    />
  );

  if (isLoading && savedListings.length === 0) {
    return <Loading fullScreen message="Loading saved listings..." />;
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Saved Listings</Text>
        <Text style={styles.headerSubtitle}>
          {savedListings.length} {savedListings.length === 1 ? 'listing' : 'listings'} saved
        </Text>
      </View>

      {/* Listings List */}
      <FlatList
        data={savedListings}
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
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTitle: {
    ...typography.headlineSmall,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  listContent: {
    padding: spacing.md,
  },
  listingCard: {
    marginBottom: spacing.md,
    padding: 0,
    overflow: 'hidden',
  },
  listingImage: {
    width: '100%',
    height: 180,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  listingImageIcon: {
    fontSize: 64,
  },
  unsaveButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    width: 40,
    height: 40,
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsaveIcon: {
    fontSize: 24,
  },
  listingContent: {
    padding: spacing.md,
  },
  listingHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.sm,
  },
  listingTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '600',
    flex: 1,
    marginRight: spacing.sm,
  },
  listingLocation: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  listingDetails: {
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  detailItem: {
    ...typography.bodyMedium,
    color: colors.text.hint,
  },
  listingFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  listingPrice: {
    ...typography.titleLarge,
    color: colors.primary[500],
    fontWeight: '700',
  },
});

export default SavedListingsScreen;

