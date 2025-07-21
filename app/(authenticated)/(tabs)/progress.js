// (authenticated)/(tabs)/progress.js
// Progress tab screen for tracking user progress over time

/* ------------------------------------------------------
WHAT IT DOES
- Displays progress tracking interface
- Shows trends and improvements over time using photo metrics
- Fetches and processes user's analyzed photos

DEV PRINCIPLES
- Uses vanilla JavaScript
- Clean component structure
- Consistent styling
------------------------------------------------------*/

import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity, ScrollView, RefreshControl } from 'react-native';
import { useState, useEffect } from 'react';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import SettingsDrawer from '../../../src/components/layout/SettingsDrawer';
import TabHeader from '../../../src/components/ui/TabHeader';
import { colors, spacing, typography, shadows } from '../../../src/styles';
import MetricsSeries from '../../../src/components/analysis/MetricsSeries';
import { getComparison, transformComparisonData } from '../../../src/services/newApiService';

export default function ProgressTab() {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleMenuPress = () => {
    setIsSettingsVisible(true);
  };

  // Fetch comparison data using simple axios
  const fetchComparisonData = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      setIsError(false);

      console.log('🔵 Fetching comparison data for progress screen');
      const response = await getComparison('older_than_6_month');

      if (response.success && response.data) {
        const transformedPhotos = transformComparisonData(response.data);
        console.log(`✅ Loaded ${transformedPhotos.length} photos for progress display`);
        setPhotos(transformedPhotos);
      } else {
        throw new Error('Failed to fetch comparison data');
      }
    } catch (err) {
      console.error('🔴 Progress data fetch error:', err);
      setError(err);
      setIsError(true);
    } finally {
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  const handleRefresh = () => {
    fetchComparisonData(true);
  };

  const handleRetry = () => {
    fetchComparisonData(false);
  };

  useEffect(() => {
    fetchComparisonData();
  }, []);

  // All photos from comparison API already have metrics
  const analyzedPhotos = photos;

  // Enhanced Loading Component
  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <LinearGradient
        colors={[colors.primary + '20', colors.primary + '10']}
        style={styles.loadingGradient}
      >
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Analyzing your progress...</Text>
          <Text style={styles.loadingSubtext}>This may take a moment</Text>
        </View>
      </LinearGradient>
    </View>
  );

  // Enhanced Error Component
  const ErrorState = () => (
    <View style={styles.errorContainer}>
      <View style={styles.errorContent}>
        <View style={styles.errorIconContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
        </View>
        <Text style={styles.errorText}>Unable to load progress</Text>
        <Text style={styles.errorSubtext}>
          {error?.message || 'Something went wrong while loading your progress data'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={handleRetry}>
          <Feather name="refresh-cw" size={16} color={colors.textOnPrimary} />
          <Text style={styles.retryButtonText}>Try Again</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Enhanced Empty State Component
  const EmptyState = () => (
    <View style={styles.noDataContainer}>
      <View style={styles.emptyContent}>
        <LinearGradient
          colors={[colors.primary + '15', colors.primary + '05']}
          style={styles.emptyIconContainer}
        >
          <Feather name="trending-up" size={48} color={colors.primary} />
        </LinearGradient>
        <Text style={styles.noDataText}>Start your progress journey</Text>
        <Text style={styles.noDataSubtext}>
          Take your first photo to begin tracking your skin health progress over time
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TabHeader
        title="Progress"
        onMenuPress={handleMenuPress}
      />

      <View style={styles.content}>
        {loading ? (
          <LoadingState />
        ) : isError ? (
          <ErrorState />
        ) : analyzedPhotos.length > 0 ? (
          <ScrollView
            style={styles.scrollContainer}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          >
            <MetricsSeries photos={analyzedPhotos} />
          </ScrollView>
        ) : (
          <EmptyState />
        )}
      </View>

      <SettingsDrawer
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    marginTop: 120, // Space for new header
    marginBottom: 100, // Space for bottom nav
  },
  scrollContainer: {
    flex: 1,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },

  // Enhanced Loading Styles
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingGradient: {
    borderRadius: 20,
    padding: spacing.xl,
    minWidth: 280,
    alignItems: 'center',
    ...shadows.md,
  },
  loadingContent: {
    alignItems: 'center',
  },
  loadingText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    textAlign: 'center',
    fontWeight: '600',
  },
  loadingSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },

  // Enhanced Error Styles
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  errorIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.error + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  errorText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  errorSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.xl,
  },
  retryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    ...shadows.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
    marginLeft: spacing.sm,
    fontWeight: '600',
  },

  // Enhanced Empty State Styles
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyContent: {
    alignItems: 'center',
    maxWidth: 320,
  },
  emptyIconContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  noDataText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
    fontWeight: '600',
  },
  noDataSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 22,
  },
});