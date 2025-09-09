// archived-routines.js
// Screen to display archived (stopped) routine items

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, SectionList, ActivityIndicator, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { colors, spacing, typography } from '../../src/styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ListItem from '../../src/components/ui/ListItem';
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

    return {
      id: apiItem.id,
      name: apiItem.name,
      type: typeMap[apiItem.type] || apiItem.type,
      usage: usageMap[apiItem.usage] || apiItem.usage,
      frequency: frequencyMap[apiItem.frequency] || apiItem.frequency,
      concerns: apiItem.extra?.concerns || [],
      dateStarted: apiItem.extra?.dateStarted ? new Date(apiItem.extra.dateStarted) : null,
      dateStopped: apiItem.extra?.dateStopped ? new Date(apiItem.extra.dateStopped) : null,
      stopReason: apiItem.extra?.stopReason || '',
      dateCreated: apiItem.extra?.dateCreated ? new Date(apiItem.extra.dateCreated) : new Date(),
      extra: apiItem.extra || {}
    };
  };

  // Fetch routine items from API
  const fetchRoutineItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getRoutineItems();
      
      if (response.success && response.data) {
        const transformedItems = response.data.map(transformApiItem);
        // Filter only stopped items
        const stoppedItems = transformedItems.filter(item => 
          item.dateStopped && new Date(item.dateStopped) <= new Date()
        );
        setRoutineItems(stoppedItems);
      } else {
        setRoutineItems([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('🔴 ArchivedRoutines: Error fetching routine items:', err);
      setError(err.message || 'Failed to load archived routine items.');
      setRoutineItems([]);
      setLoading(false);
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

    // Sort items within each group by stop date (most recent first)
    Object.keys(grouped).forEach(reason => {
      grouped[reason].sort((a, b) => {
        const dateA = a.dateStopped ? new Date(a.dateStopped) : new Date(0);
        const dateB = b.dateStopped ? new Date(b.dateStopped) : new Date(0);
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
    
    // Create chips array
    const chips = [];
    if (item.usage) {
      chips.push({ label: displayUsage, type: 'default' });
    }
    if (item.frequency && item.frequency !== 'Daily') {
      chips.push({ label: item.frequency, type: 'frequency' });
    }
    chips.push({ label: 'Stopped', type: 'stopped' });

    // Format date info
    let dateInfo = null;
    if (item.dateStarted && item.dateStopped) {
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

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Archived Routines</Text>
          <View style={styles.placeholder} />
        </View>
        <ActivityIndicator size="large" color={colors.primary} style={styles.centered} />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Archived Routines</Text>
          <View style={styles.placeholder} />
        </View>
        <Text style={styles.errorText}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <MaterialCommunityIcons name="arrow-left" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Archived Routines</Text>
        <View style={styles.placeholder} />
      </View>

      {archivedSections.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons 
            name="archive" 
            size={64} 
            color={colors.textSecondary} 
            style={styles.emptyIcon}
          />
          <Text style={styles.emptyTitle}>No Archived Items</Text>
          <Text style={styles.emptySubtitle}>
            Items you stop using will appear here
          </Text>
        </View>
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
        />
      )}
    </View>
  );
};

export default ArchivedRoutines;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  placeholder: {
    width: 40,
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
    backgroundColor: '#FFF',
  },
  sectionHeaderText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyIcon: {
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
