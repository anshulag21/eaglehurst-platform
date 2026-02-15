/**
 * Connections Screen
 * View and manage buyer connections
 */

import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Card, Loading, EmptyState, Badge, Avatar } from '../../components/common';
import { useAppSelector, useAppDispatch, fetchConnections } from '../../store';
import { colors, typography, spacing, borderRadius } from '../../theme';
import { Connection } from '../../types';

type TabType = 'all' | 'approved' | 'pending' | 'rejected';

export const ConnectionsScreen: React.FC = () => {
  const navigation = useNavigation();
  const dispatch = useAppDispatch();
  const { items: connections, isLoading } = useAppSelector(
    (state) => state.connections
  );

  const [activeTab, setActiveTab] = useState<TabType>('all');
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadConnections();
  }, [activeTab]);

  const loadConnections = async () => {
    const filters = activeTab !== 'all' ? { status: activeTab } : {};
    await dispatch(fetchConnections(filters));
    setIsRefreshing(false);
  };

  const handleRefresh = () => {
    setIsRefreshing(true);
    loadConnections();
  };

  const handleConnectionPress = (connection: Connection) => {
    if (connection.status === 'approved') {
      navigation.navigate('Chat' as never, { connectionId: connection.connection_id });
    }
  };

  const filteredConnections = (connections || []).filter((conn) => {
    if (activeTab === 'all') return true;
    return conn.status === activeTab;
  });

  const renderConnectionCard = ({ item }: { item: Connection }) => (
    <TouchableOpacity onPress={() => handleConnectionPress(item)}>
      <Card style={styles.connectionCard}>
        <View style={styles.connectionHeader}>
          <Avatar
            name={item.seller_name || 'Seller'}
            size={56}
            style={styles.avatar}
          />
          <View style={styles.connectionInfo}>
            <Text style={styles.connectionName}>{item.seller_name || 'Seller'}</Text>
            <Text style={styles.connectionBusiness} numberOfLines={1}>
              {item.listing_title}
            </Text>
            <Text style={styles.connectionLocation}>📍 {item.location}</Text>
          </View>
          <Badge
            text={item.status}
            variant={
              item.status === 'approved'
                ? 'success'
                : item.status === 'pending'
                ? 'warning'
                : 'error'
            }
          />
        </View>

        {item.last_message && item.status === 'approved' && (
          <View style={styles.messagePreview}>
            <Text style={styles.lastMessage} numberOfLines={1}>
              {item.last_message}
            </Text>
            {item.unread_count > 0 && (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadCount}>{item.unread_count}</Text>
              </View>
            )}
          </View>
        )}

        {item.status === 'pending' && (
          <Text style={styles.pendingNote}>⏳ Waiting for seller approval</Text>
        )}

        {item.status === 'rejected' && (
          <Text style={styles.rejectedNote}>❌ Connection request declined</Text>
        )}
      </Card>
    </TouchableOpacity>
  );

  const renderEmptyState = () => {
    const messages = {
      all: {
        icon: '🤝',
        title: 'No Connections',
        message: 'Start connecting with sellers to view them here',
      },
      approved: {
        icon: '✅',
        title: 'No Approved Connections',
        message: 'Your approved connections will appear here',
      },
      pending: {
        icon: '⏳',
        title: 'No Pending Requests',
        message: 'Your pending connection requests will appear here',
      },
      rejected: {
        icon: '❌',
        title: 'No Rejected Requests',
        message: 'Declined connection requests will appear here',
      },
    };

    const { icon, title, message } = messages[activeTab];

    return (
      <EmptyState
        icon={icon}
        title={title}
        message={message}
        actionLabel="Browse Listings"
        onAction={() => navigation.navigate('Listings' as never)}
      />
    );
  };

  if (isLoading && connections.length === 0) {
    return <Loading fullScreen message="Loading connections..." />;
  }

  return (
    <View style={styles.container}>
      {/* Tabs */}
      <View style={styles.tabs}>
        {(['all', 'approved', 'pending', 'rejected'] as TabType[]).map((tab) => (
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
                  {(connections || []).filter((c) => c.status === tab).length}
                </Text>
              </View>
            )}
          </TouchableOpacity>
        ))}
      </View>

      {/* Connections List */}
      <FlatList
        data={filteredConnections}
        renderItem={renderConnectionCard}
        keyExtractor={(item) => item.connection_id}
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
  },
  tabTextActive: {
    color: colors.primary[500],
  },
  tabBadge: {
    backgroundColor: colors.primary[100],
    borderRadius: borderRadius.full,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  tabBadgeText: {
    ...typography.caption,
    color: colors.primary[700],
    fontWeight: '700',
    fontSize: 11,
  },
  listContent: {
    padding: spacing.md,
  },
  connectionCard: {
    marginBottom: spacing.md,
    padding: spacing.md,
  },
  connectionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: spacing.md,
  },
  avatar: {
    marginTop: spacing.xs,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    ...typography.titleMedium,
    color: colors.text.primary,
    fontWeight: '600',
    marginBottom: spacing.xs,
  },
  connectionBusiness: {
    ...typography.bodyMedium,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  connectionLocation: {
    ...typography.bodySmall,
    color: colors.text.hint,
  },
  messagePreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  lastMessage: {
    ...typography.bodyMedium,
    color: colors.text.hint,
    flex: 1,
    marginRight: spacing.sm,
  },
  unreadBadge: {
    backgroundColor: colors.primary[500],
    borderRadius: borderRadius.full,
    minWidth: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xs,
  },
  unreadCount: {
    ...typography.caption,
    color: colors.neutral.white,
    fontWeight: '700',
    fontSize: 12,
  },
  pendingNote: {
    ...typography.bodyMedium,
    color: colors.warning.main,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
  rejectedNote: {
    ...typography.bodyMedium,
    color: colors.error.main,
    marginTop: spacing.md,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border.light,
  },
});

export default ConnectionsScreen;

