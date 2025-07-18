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

import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useState, useEffect } from 'react';
import SettingsDrawer from '../../../src/components/layout/SettingsDrawer';
import TabHeader from '../../../src/components/ui/TabHeader';
import { colors, spacing, typography } from '../../../src/styles';
import MetricsSeries from '../../../src/components/analysis/MetricsSeries';
import { getComparison, transformComparisonData } from '../../../src/services/newApiService';

export default function ProgressTab() {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isError, setIsError] = useState(false);

  const handleMenuPress = () => {
    setIsSettingsVisible(true);
  };

  // Fetch comparison data using simple axios
  const fetchComparisonData = async () => {
    try {
      setLoading(true);
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
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchComparisonData();
  }, []);

  // All photos from comparison API already have metrics
  const analyzedPhotos = photos;

  return (
    <View style={styles.container}>
      <TabHeader 
        title="Progress"
        onMenuPress={handleMenuPress}
      />
      
      <View style={styles.content}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your progress...</Text>
          </View>
        ) : isError ? (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>Failed to load progress data</Text>
            <Text style={styles.errorSubtext}>{error?.message || 'Unknown error occurred'}</Text>
          </View>
        ) : analyzedPhotos.length > 0 ? (
          <MetricsSeries photos={analyzedPhotos} />
        ) : (
          <View style={styles.noDataContainer}>
            <Text style={styles.noDataText}>No progress data available</Text>
            <Text style={styles.noDataSubtext}>Take some photos to see your progress</Text>
          </View>
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
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 120, // Space for new header
    marginBottom: 100, // Space for bottom nav
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
    textAlign: 'center',
  },
  errorContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  errorText: {
    ...typography.h3,
    color: colors.error || '#FF3B30',
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  noDataContainer: {
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  noDataText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  noDataSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 