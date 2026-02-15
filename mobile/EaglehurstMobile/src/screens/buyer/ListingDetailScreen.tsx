/**
 * Listing Detail Screen
 * Detailed view of a single listing
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Card, Loading, Badge, Button, Avatar } from '../../components/common';
import { useAppSelector, useAppDispatch, fetchListingById, saveListing, unsaveListing } from '../../store';
import { connectionsAPI } from '../../api';
import { colors, typography, spacing, borderRadius, shadows } from '../../theme';

export const ListingDetailScreen: React.FC = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { listingId } = route.params as { listingId: string };
  
  const { currentListing, isLoading, savedListings } = useAppSelector((state) => state.listings);
  const { user } = useAppSelector((state) => state.auth);

  const [isSaved, setIsSaved] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);

  useEffect(() => {
    loadListing();
  }, [listingId]);

  useEffect(() => {
    setIsSaved(savedListings.some((l) => l.listing_id === listingId));
  }, [savedListings, listingId]);

  const loadListing = async () => {
    console.log('📋 Loading listing with ID:', listingId);
    const result = await dispatch(fetchListingById(listingId));
    console.log('📋 Listing load result:', JSON.stringify(result, null, 2));
  };

  const handleSaveToggle = async () => {
    if (isSaved) {
      await dispatch(unsaveListing(listingId));
    } else {
      await dispatch(saveListing(listingId));
    }
  };

  const handleConnect = async () => {
    if (user?.user_type !== 'buyer') {
      Alert.alert('Error', 'Only buyers can connect with sellers');
      return;
    }

    Alert.prompt(
      'Connect with Seller',
      'Send a message to the seller (optional):',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send Request',
          onPress: async (message) => {
            setIsConnecting(true);
            try {
              const response = await connectionsAPI.createConnectionRequest({
                listing_id: listingId,
                initial_message: message || 'I am interested in your listing.',
              });

              if (response.success) {
                Alert.alert(
                  'Success! 🎉',
                  'Your connection request has been sent to the seller.',
                  [
                    {
                      text: 'OK',
                      onPress: () => navigation.navigate('Connections' as never),
                    },
                  ]
                );
              } else {
                Alert.alert('Error', response.error?.message || 'Failed to send connection request');
              }
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Failed to send connection request');
            } finally {
              setIsConnecting(false);
            }
          },
        },
      ],
      'plain-text'
    );
  };

  console.log('📋 ListingDetailScreen state:', {
    isLoading,
    hasCurrentListing: !!currentListing,
    listingId,
    currentListingId: currentListing?.id || currentListing?.listing_id,
  });

  if (isLoading) {
    return <Loading fullScreen message="Loading listing..." />;
  }

  if (!currentListing) {
    return (
      <View style={styles.container}>
        <View style={{ padding: 20, alignItems: 'center' }}>
          <Text style={{ fontSize: 48, marginBottom: 16 }}>❌</Text>
          <Text style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>
            Listing Not Found
          </Text>
          <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginBottom: 20 }}>
            This listing could not be loaded. It may have been removed or you may not have access.
          </Text>
          <Button
            title="Go Back"
            variant="primary"
            onPress={() => navigation.goBack()}
          />
        </View>
      </View>
    );
  }

  const listing = currentListing;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* Listing Image */}
      <View style={styles.imageContainer}>
        <View style={styles.imagePlaceholder}>
          <Text style={styles.imageIcon}>🏥</Text>
        </View>
        <TouchableOpacity style={styles.saveButton} onPress={handleSaveToggle}>
          <Text style={styles.saveIcon}>{isSaved ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.headerInfo}>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.location}>📍 {listing.location}</Text>
          </View>
          <Badge
            text={listing.status}
            variant={listing.status === 'active' ? 'success' : 'default'}
          />
        </View>
        <Text style={styles.price}>£{listing.asking_price?.toLocaleString()}</Text>
      </View>

      {/* Quick Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{listing.business_type}</Text>
          <Text style={styles.statLabel}>Type</Text>
        </View>
        {listing.turnover && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>£{(listing.turnover / 1000).toFixed(0)}K</Text>
            <Text style={styles.statLabel}>Turnover</Text>
          </View>
        )}
        {listing.established_year && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{listing.established_year}</Text>
            <Text style={styles.statLabel}>Est. Year</Text>
          </View>
        )}
        {listing.number_of_employees && (
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{listing.number_of_employees}</Text>
            <Text style={styles.statLabel}>Employees</Text>
          </View>
        )}
      </View>

      {/* Description */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Description</Text>
        <Text style={styles.description}>{listing.description}</Text>
      </Card>

      {/* Financial Information */}
      {(listing.turnover || listing.profit_margin) && (
        <Card style={styles.section}>
          <Text style={styles.sectionTitle}>Financial Information</Text>
          <View style={styles.infoGrid}>
            {listing.turnover && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Annual Turnover:</Text>
                <Text style={styles.infoValue}>£{listing.turnover.toLocaleString()}</Text>
              </View>
            )}
            {listing.profit_margin && (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Profit Margin:</Text>
                <Text style={styles.infoValue}>{listing.profit_margin}%</Text>
              </View>
            )}
          </View>
        </Card>
      )}

      {/* Business Details */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Business Details</Text>
        <View style={styles.infoGrid}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Business Type:</Text>
            <Text style={styles.infoValue}>{listing.business_type}</Text>
          </View>
          {listing.established_year && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Established:</Text>
              <Text style={styles.infoValue}>{listing.established_year}</Text>
            </View>
          )}
          {listing.number_of_employees && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employees:</Text>
              <Text style={styles.infoValue}>{listing.number_of_employees}</Text>
            </View>
          )}
          {listing.reason_for_selling && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Reason for Selling:</Text>
              <Text style={styles.infoValue}>{listing.reason_for_selling}</Text>
            </View>
          )}
        </View>
      </Card>

      {/* Seller Info (Masked for buyers until connected) */}
      <Card style={styles.section}>
        <Text style={styles.sectionTitle}>Seller Information</Text>
        <View style={styles.sellerInfo}>
          <Avatar name="Seller" size={48} />
          <View style={styles.sellerDetails}>
            <Text style={styles.sellerName}>Verified Seller</Text>
            <Text style={styles.sellerNote}>
              Connect to view full seller details
            </Text>
          </View>
        </View>
      </Card>

      {/* Action Buttons */}
      {user?.user_type === 'buyer' && (
        <View style={styles.actions}>
          <Button
            title={isConnecting ? 'Connecting...' : 'Connect with Seller'}
            variant="primary"
            size="large"
            fullWidth
            onPress={handleConnect}
            disabled={isConnecting}
            loading={isConnecting}
            style={styles.actionButton}
          />
          <Button
            title={isSaved ? 'Saved ❤️' : 'Save Listing'}
            variant={isSaved ? 'secondary' : 'outline'}
            size="large"
            fullWidth
            onPress={handleSaveToggle}
            style={styles.actionButton}
          />
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background.default,
  },
  content: {
    paddingBottom: spacing.xl,
  },
  imageContainer: {
    position: 'relative',
  },
  imagePlaceholder: {
    width: '100%',
    height: 300,
    backgroundColor: colors.primary[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageIcon: {
    fontSize: 96,
  },
  saveButton: {
    position: 'absolute',
    top: spacing.lg,
    right: spacing.lg,
    width: 48,
    height: 48,
    backgroundColor: colors.background.paper,
    borderRadius: borderRadius.full,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  saveIcon: {
    fontSize: 28,
  },
  header: {
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  headerInfo: {
    flex: 1,
    marginRight: spacing.md,
  },
  title: {
    ...typography.headlineMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  location: {
    ...typography.bodyLarge,
    color: colors.text.secondary,
  },
  price: {
    ...typography.headlineLarge,
    color: colors.primary[500],
    fontWeight: '700',
  },
  statsContainer: {
    flexDirection: 'row',
    padding: spacing.lg,
    backgroundColor: colors.background.paper,
    borderBottomWidth: 1,
    borderBottomColor: colors.border.light,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    ...typography.titleLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  statLabel: {
    ...typography.caption,
    color: colors.text.secondary,
  },
  section: {
    margin: spacing.lg,
    padding: spacing.lg,
  },
  sectionTitle: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.md,
  },
  description: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    lineHeight: 24,
  },
  infoGrid: {
    gap: spacing.md,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
  },
  infoValue: {
    ...typography.bodyMedium,
    color: colors.text.primary,
    fontWeight: '600',
  },
  sellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  sellerDetails: {
    flex: 1,
  },
  sellerName: {
    ...typography.bodyLarge,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  sellerNote: {
    ...typography.bodyMedium,
    color: colors.text.hint,
  },
  actions: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  actionButton: {
    marginBottom: 0,
  },
});

export default ListingDetailScreen;

