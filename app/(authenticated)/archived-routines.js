// archived-routines.js
// Screen to display archived (stopped) routine items

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, SectionList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { colors, spacing, typography, shadows } from '../../src/styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { LinearGradient } from 'expo-linear-gradient';
import { Feather } from '@expo/vector-icons';
import ListItem from '../../src/components/ui/ListItem';
import TabHeader from '../../src/components/ui/TabHeader';
import { 
  getRoutineItems, 
  updateRoutineItem,
  clearPendingRequests
} from '../../src/services/newApiService';

// Helper function to calculate usage duration
const calculateUsageDuration = (dateStarted) => {
  let start;
  // Firestore Timestamp
  if (dateStarted && typeof dateStarted.toDate === 'function') {
    start = dateStarted.toDate();
  } 
  // JS Date
  else if (dateStarted instanceof Date) {
    start = dateStarted;
  } 
  // String date (MM/DD/YY or MM/DD/YYYY)
  else if (typeof dateStarted === 'string' && dateStarted.includes('/')) {
    // Normalize to MM/DD/YYYY if needed
    let parts = dateStarted.split('/');
    if (parts.length === 3 && parts[2].length === 2) {
      parts[2] = (parseInt(parts[2], 10) > 50 ? '19' : '20') + parts[2];
    }
    start = new Date(parts.join('/'));
  } else {
    return null;
  }

  if (isNaN(start)) return null;
  const now = new Date();
  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return `Used for ${years} year${years > 1 ? 's' : ''}`;
  } else if (months > 0) {
    return `Used for ${months} month${months > 1 ? 's' : ''}`;
  } else {
    return `Used for ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
};

const ArchivedRoutines = () => {
  const router = useRouter();
  const [routineItems, setRoutineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const insets = useSafeAreaInsets();

  // Transform API data to component format
  const transformApiItem = (apiItem) => {
    // Normalize API values to component expected format
    const typeMap = {
      'product': 'Product',
      'activity': 'Activity', 
      'nutrition': 'Nutrition',
      'treatment_facial': 'Treatment / Facial',
      'treatment_injection': 'Treatment / Injection',
      'treatment_other': 'Treatment / Other'
    };
    
    const usageMap = {
      'am': 'AM',
      'pm': 'PM',
      'both': 'AM + PM',
      'as_needed': 'As needed'
    };
    
    const frequencyMap = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'as_needed': 'As needed'
    };

    // Check if this is a treatment type
    const isTreatment = apiItem.type && (
      apiItem.type === 'treatment_facial' || 
      apiItem.type === 'treatment_injection' || 
      apiItem.type === 'treatment_other'
    );

    return {
      id: apiItem.id,
      name: apiItem.name,
      type: typeMap[apiItem.type] || apiItem.type,
      usage: usageMap[apiItem.usage] || apiItem.usage,
      frequency: frequencyMap[apiItem.frequency] || apiItem.frequency,
      concerns: apiItem.extra?.concerns || [],
      // For treatment types, use treatment date; for others, use start/stop dates
      dateStarted: isTreatment ? 
        (apiItem.extra?.treatmentDate ? new Date(apiItem.extra.treatmentDate) : null) :
        (apiItem.extra?.dateStarted ? new Date(apiItem.extra.dateStarted) : null),
      dateStopped: isTreatment ? null : // Treatments don't have stop dates
        (apiItem.extra?.dateStopped ? new Date(apiItem.extra.dateStopped) : null),
      treatmentDate: isTreatment ? 
        (apiItem.extra?.treatmentDate ? new Date(apiItem.extra.treatmentDate) : null) : null,
      stopReason: apiItem.extra?.stopReason || '',
      dateCreated: apiItem.extra?.dateCreated ? new Date(apiItem.extra.dateCreated) : new Date(),
      extra: apiItem.extra || {}
    };
  };

  // Fetch routine items from API
  const fetchRoutineItems = async (isRefresh = false) => {
    try {
      if (isRefresh) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);
      
      const response = await getRoutineItems();
      
      if (response.success && response.data) {
        const transformedItems = response.data.map(transformApiItem);
        // Filter only stopped items (for non-treatment types) or all treatment items
        const stoppedItems = transformedItems.filter(item => {
          const isTreatment = item.type && (
            item.type === 'Treatment / Facial' || 
            item.type === 'Treatment / Injection' || 
            item.type === 'Treatment / Other'
          );
          
          if (isTreatment) {
            // For treatments, include all items (they don't have stop dates)
            return true;
          } else {
            // For non-treatments, only include stopped items
            return item.dateStopped && new Date(item.dateStopped) <= new Date();
          }
        });
        setRoutineItems(stoppedItems);
      } else {
        setRoutineItems([]);
      }
      
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    } catch (err) {
      console.error('🔴 ArchivedRoutines: Error fetching routine items:', err);
      setError(err.message || 'Failed to load archived routine items.');
      setRoutineItems([]);
      if (isRefresh) {
        setRefreshing(false);
      } else {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    fetchRoutineItems();
  }, []);

  // Refetch data when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      clearPendingRequests();
      fetchRoutineItems();
    }, [])
  );

  const handleRefresh = () => {
    fetchRoutineItems(true);
  };

  const handleMenuPress = () => {
    router.back();
  };

  // Group items by stop reason
  const archivedSections = useMemo(() => {
    if (!routineItems || routineItems.length === 0) {
      return [];
    }

    const grouped = {};
    routineItems.forEach(item => {
      const reason = item.stopReason || 'Other';
      if (!grouped[reason]) {
        grouped[reason] = [];
      }
      grouped[reason].push(item);
    });

    // Sort items within each group by date (most recent first)
    Object.keys(grouped).forEach(reason => {
      grouped[reason].sort((a, b) => {
        // For treatment types, use treatment date; for others, use stop date
        const isTreatmentA = a.type && (
          a.type === 'Treatment / Facial' || 
          a.type === 'Treatment / Injection' || 
          a.type === 'Treatment / Other'
        );
        const isTreatmentB = b.type && (
          b.type === 'Treatment / Facial' || 
          b.type === 'Treatment / Injection' || 
          b.type === 'Treatment / Other'
        );
        
        const dateA = isTreatmentA ? 
          (a.treatmentDate ? new Date(a.treatmentDate) : new Date(0)) :
          (a.dateStopped ? new Date(a.dateStopped) : new Date(0));
        const dateB = isTreatmentB ? 
          (b.treatmentDate ? new Date(b.treatmentDate) : new Date(0)) :
          (b.dateStopped ? new Date(b.dateStopped) : new Date(0));
        
        return dateB - dateA;
      });
    });

    // Create sections
    return Object.keys(grouped).map(reason => ({
      title: reason,
      data: grouped[reason]
    }));
  }, [routineItems]);

  // Render individual archived routine item
  const renderArchivedItem = ({ item }) => {
    const usageDuration = calculateUsageDuration(item.dateStarted);
    
    // Determine display usage
    let displayUsage = item.usage;
    if (item.usage === 'AM + PM') displayUsage = 'AM/PM';
    
    // Check if this is a treatment type
    const isTreatment = item.type && (
      item.type === 'Treatment / Facial' || 
      item.type === 'Treatment / Injection' || 
      item.type === 'Treatment / Other'
    );

    // Create chips array
    const chips = [];
    
    // Only show usage and frequency for non-treatment types
    if (!isTreatment) {
      if (item.usage) {
        chips.push({ label: displayUsage, type: 'default' });
      }
      if (item.frequency && item.frequency !== 'Daily') {
        chips.push({ label: item.frequency, type: 'frequency' });
      }
      chips.push({ label: 'Stopped', type: 'stopped' });
    }

    // Format date info
    let dateInfo = null;
    
    if (isTreatment) {
      // For treatment types, show treatment date
      if (item.treatmentDate) {
        const treatmentDate = new Date(item.treatmentDate);
        const formattedTreatmentDate = treatmentDate.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
        dateInfo = `Received on ${formattedTreatmentDate}`;
      }
    } else if (item.dateStarted && item.dateStopped) {
      // For non-treatment types, show start and stop dates
      const startDate = new Date(item.dateStarted);
      const stopDate = new Date(item.dateStopped);
      const formattedStartDate = startDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      const formattedStopDate = stopDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
      if( item.type === 'Product' || item.type === 'Nutrition') {
        dateInfo = `Used from ${formattedStartDate} to ${formattedStopDate}`;
      } else if( item.type === 'Activity') {
        dateInfo = `Done from ${formattedStartDate} to ${formattedStopDate}`;
      } 
    }
    
    return (
      <ListItem
        title={item.name}
        subtitle={usageDuration || 'Recently stopped'}
        description={item.type}
        icon={item.type === 'Product' ? 'bottle-tonic-outline' : item.type === 'Activity' ? 'yoga' : 'food-apple-outline'}
        iconColor={item.type === 'Product' ? colors.primary : item.type === 'Activity' ? '#009688' : '#FF6B35'}
        chips={chips}
        showChevron={false}
        onPress={() => {}} // No edit functionality for archived items
        dateInfo={dateInfo}
      />
    );
  };

  // Render section header
  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <Text style={styles.sectionHeaderText}>{title}</Text>
    </View>
  );

  // Enhanced Loading Component
  const LoadingState = () => (
    <View style={styles.loadingContainer}>
      <LinearGradient
        colors={[colors.primary + '20', colors.primary + '10']}
        style={styles.loadingGradient}
      >
        <View style={styles.loadingContent}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading archived routines...</Text>
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
        <Text style={styles.errorText}>Unable to load archived routines</Text>
        <Text style={styles.errorSubtext}>
          {error?.message || 'Something went wrong while loading your archived routines'}
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchRoutineItems()}>
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
          <Feather name="archive" size={48} color={colors.primary} />
        </LinearGradient>
        <Text style={styles.noDataText}>No Archived Routines</Text>
        <Text style={styles.noDataSubtext}>
          Items you stop using will appear here
        </Text>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <TabHeader
        title="Archived Routines"
        onMenuPress={handleMenuPress}
        showBack={true}
      />

      <View style={styles.content}>
        {loading ? (
          <LoadingState />
        ) : error ? (
          <ErrorState />
        ) : archivedSections.length === 0 ? (
          <EmptyState />
        ) : (
          <SectionList
            style={styles.sectionsList}
            sections={archivedSections}
            renderItem={renderArchivedItem}
            renderSectionHeader={renderSectionHeader}
            keyExtractor={(item) => item.id}
            contentContainerStyle={[
              styles.listContentContainer,
              { paddingBottom: insets.bottom + 20 }
            ]}
            stickySectionHeadersEnabled={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
          />
        )}
      </View>
    </View>
  );

};

export default ArchivedRoutines;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    flex: 1,
    marginTop: 120, // Space for header
    marginBottom: 100, // Space for bottom nav
  },
  sectionsList: {
    flex: 1,
  },
  listContentContainer: {
    paddingTop: spacing.lg,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  sectionHeaderText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
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
