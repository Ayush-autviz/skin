// ActivityList.js
// Component to display user activity timeline

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
} from 'react-native';
import { colors, spacing, typography } from '../../styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';

// Mock activity data - in a real app, this would come from an API
const mockActivities = [
  {
    id: '1',
    title: 'Started using Retinol Serum before bed',
    source: 'Based on chat with Amber',
    timestamp: '2 hours ago',
    type: 'routine',
    icon: 'bottle-tonic-outline',
  },
  {
    id: '2',
    title: 'Returned from a week in Florida',
    source: 'Based on chat with Amber',
    timestamp: '1 day ago',
    type: 'travel',
    icon: 'airplane',
  },
  {
    id: '3',
    title: 'Purchased and started using Vitamin C Serum',
    source: 'Based on change to Routine Builder',
    timestamp: '3 days ago',
    type: 'routine',
    icon: 'bottle-tonic-outline',
  },
  {
    id: '4',
    title: 'Traveled to Florida',
    source: 'Based on chat with Amber',
    timestamp: '1 week ago',
    type: 'travel',
    icon: 'airplane',
  },
  {
    id: '5',
    title: 'Completed morning skincare routine',
    source: 'Routine tracking',
    timestamp: '2 days ago',
    type: 'routine',
    icon: 'check-circle-outline',
  },
  {
    id: '6',
    title: 'Updated skin concerns',
    source: 'Profile settings',
    timestamp: '4 days ago',
    type: 'profile',
    icon: 'account-edit',
  },
  {
    id: '7',
    title: 'Added new product to routine',
    source: 'Routine Builder',
    timestamp: '1 week ago',
    type: 'routine',
    icon: 'plus-circle-outline',
  },
  {
    id: '8',
    title: 'Completed evening skincare routine',
    source: 'Routine tracking',
    timestamp: '3 days ago',
    type: 'routine',
    icon: 'check-circle-outline',
  },
];

const ActivityList = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Simulate API call
    const loadActivities = async () => {
      setLoading(true);
      // Simulate network delay
      await new Promise(resolve => setTimeout(resolve, 1000));
      setActivities(mockActivities);
      setLoading(false);
    };

    loadActivities();
  }, []);

  const getIconColor = (type) => {
    switch (type) {
      case 'routine':
        return colors.primary;
      case 'travel':
        return '#3B82F6';
      case 'profile':
        return '#10B981';
      default:
        return colors.textSecondary;
    }
  };

  const renderActivityItem = ({ item }) => (
    <View style={styles.activityItem}>
      <View style={styles.activityIconContainer}>
        <MaterialCommunityIcons
          name={item.icon}
          size={24}
          color={getIconColor(item.type)}
        />
      </View>
      <View style={styles.activityContent}>
        <Text style={styles.activityTitle} numberOfLines={1}>{item.title}</Text>
        <View style={styles.activitySourceContainer}>
          <Text style={styles.activitySource}>{item.source}</Text>
          <MaterialCommunityIcons
            name="chevron-right"
            size={16}
            color={colors.textSecondary}
          />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name="timeline-clock-outline"
        size={64}
        color={colors.textSecondary}
      />
      <Text style={styles.emptyTitle}>No Activity Yet</Text>
      <Text style={styles.emptySubtitle}>
        Your activity will appear here as you use the app
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading activity...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Coming Soon Watermark */}
      <View style={styles.comingSoonOverlay} pointerEvents="none">
        <Text style={styles.comingSoonText}>Coming Soon!</Text>
      </View>

      {/* Faded Background Content */}
      <View style={styles.fadedContent}>
        <FlatList
          data={activities}
          renderItem={renderActivityItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  listContainer: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.xl,
  },
  activityItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: spacing.md,
  },
  activityIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  activityContent: {
    flex: 1,
    justifyContent: 'center',
  },
  activityTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: '500',
    marginBottom: spacing.xs,
    lineHeight: 20,
  },
  activitySourceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  activitySource: {
    ...typography.caption,
    color: colors.textSecondary,
    flex: 1,
  },
  activityTimestamp: {
    ...typography.caption,
    color: colors.textMicrocopy,
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 64, // Align with content (48px icon + 16px margin)
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xxl,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  // Coming Soon Watermark Styles
  comingSoonOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 9999,
  },
  comingSoonText: {
    ...typography.h1,
    color: colors.primary,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
    letterSpacing: 3,
    fontSize: 28,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  // Faded Content Styles
  fadedContent: {
    flex: 1,
    opacity: 0.2, // Faded appearance
    backgroundColor: colors.background,
  },
});

export default ActivityList;
