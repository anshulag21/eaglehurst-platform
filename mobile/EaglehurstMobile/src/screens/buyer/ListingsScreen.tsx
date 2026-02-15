/**
 * Listings Screen
 * Browse and search medical business listings
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Loading, EmptyState, Badge, Button } from '../../components/common';
import { useAppSelector, useAppDispatch, fetchListings } from '../../store';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';
import { Listing, ListingFilters } from '../../types';
import { UK_REGIONS, BUSINESS_TYPES } from '../../constants';

export const ListingsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { items: listings, isLoading, pagination } = useAppSelector(
    (state) => state.listings
  );

  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<ListingFilters>({});
  const [showFilters, setShowFilters] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadListings();
  }, [filters]);

  const loadListings = async () => {
    await dispatch(fetchListings({ ...filters, search: searchQuery }));
    setIsRefreshing(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadListings();
  };

  const handleSearch = () => {
    loadListings();
  };

  const handleListingPress = (listing: Listing) => {
    // Navigate to listing detail screen
    navigation.navigate('ListingDetail' as never, { listingId: listing.listing_id });
  };

  const renderListingCard = ({ item }: { item: Listing }) => (
    <TouchableOpacity onPress={() => handleListingPress(item)}>
      <Card style={styles.listingCard}>
        {/* Listing Image */}
        <View style={styles.listingImage}>
          {item.media && item.media.length > 0 ? (
            <Text style={styles.listingImageIcon}>🏥</Text>
          ) : (
            <Text style={styles.listingImageIcon}>🏥</Text>
          )}
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
      icon="🔍"
      title="No Listings Found"
      message="Try adjusting your search or filters"
      actionLabel="Clear Filters"
      onAction={() => {
        setFilters({});
        setSearchQuery('');
      }}
    />
  );

  if (isLoading && listings.length === 0) {
    return <Loading fullScreen message="Loading listings..." />;
  }

  return (
    <View style={styles.container}>
      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            placeholder="Search listings..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}>
          <Text style={styles.filterIcon}>⚙️</Text>
        </TouchableOpacity>
      </View>

      {/* Filters */}
      {showFilters && (
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filters</Text>
          {/* Add filter options here */}
          <View style={styles.filterChips}>
            <TouchableOpacity
              style={[
                styles.filterChip,
                !filters.business_type && styles.filterChipActive,
              ]}
              onPress={() => setFilters({ ...filters, business_type: undefined })}>
              <Text style={styles.filterChipText}>All Types</Text>
            </TouchableOpacity>
            {BUSINESS_TYPES.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.filterChip,
                  filters.business_type === type && styles.filterChipActive,
                ]}
                onPress={() => setFilters({ ...filters, business_type: type })}>
                <Text style={styles.filterChipText}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Results Count */}
      <View style={styles.resultsHeader}>
        <Text style={styles.resultsCount}>
          {pagination.total} {pagination.total === 1 ? 'listing' : 'listings'} found
        </Text>
      </View>

      {/* Listings List */}
      <FlatList
        data={listings}
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
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          if (pagination.page < pagination.pages) {
            dispatch(
              fetchListings({
                ...filters,
                search: searchQuery,
                page: pagination.page + 1,
              })
            );
          }
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  searchContainer: {
    flexDirection: 'row',
    padding: spacing.md,
    gap: spacing.sm,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.md,
    paddingHorizontal: spacing.md,
    height: 48,
  },
  searchIcon: {
    fontSize: 20,
    marginRight: spacing.sm,
  },
  searchInput: {
    flex: 1,
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  filterButton: {
    width: 48,
    height: 48,
    backgroundColor: colors.primary[50],
    borderRadius: borderRadius.md,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterIcon: {
    fontSize: 20,
  },
  filtersContainer: {
    backgroundColor: colors.background.paper,
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  filtersTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.sm,
  },
  filterChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  filterChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background.default,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.border.light,
  },
  filterChipActive: {
    backgroundColor: colors.primary[500],
    borderColor: colors.primary[500],
  },
  filterChipText: {
    ...typography.bodyMedium,
    color: colors.text.primary,
  },
  resultsHeader: {
    padding: spacing.md,
    backgroundColor: colors.background.paper,
  },
  resultsCount: {
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
  },
  listingImageIcon: {
    fontSize: 64,
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

export default ListingsScreen;

