// ConcernsCluster.js
// Clustered concerns display with stacked tags and auto-save functionality

/* ------------------------------------------------------
WHAT IT DOES
- Displays skin concerns as stacked, selectable tags (no scrolling)
- Auto-saves selections to user profile when concerns are tapped
- Shows selected state for each concern
- Uses a flexWrap layout to create stacked rows of concerns

DATA USED
- concernsData from concerns.json - all available skin concerns
- user.profile.concerns - user's selected concerns (boolean flags)

DEV PRINCIPLES
- Clean, responsive layout using flexWrap
- Auto-save on tap for immediate persistence
- Visual feedback for selected/unselected state
------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import Chip from '../ui/Chip';
import { colors, spacing } from '../../styles';
import useAuthStore from '../../stores/authStore';
import { 
  profileConcernsToLookupKeys, 
  lookupKeyToProfileKey,
  lookupKeysToProfileConcerns 
} from '../../utils/concernMappings';

// Import the concerns data
import concernsData from '../../../data/concerns.json';

export default function ConcernsCluster() {
  const { user, profile } = useAuthStore();
  const [selectedConcerns, setSelectedConcerns] = useState(new Set());
  
  // Get all concerns from the JSON data
  const allConcerns = Object.values(concernsData.skinConcerns);

  // Initialize selected concerns from user profile
  useEffect(() => {
    if (profile?.concerns) {
      // Use centralized utility to convert profile concerns to lookup keys
      const userConcernKeys = profileConcernsToLookupKeys(profile.concerns);
      
      setSelectedConcerns(userConcernKeys);
      console.log('🎯 [ConcernsCluster] Initialized user concerns:', {
        profileConcerns: profile.concerns,
        mappedKeys: Array.from(userConcernKeys)
      });
    }
  }, [profile?.concerns]);

  const handleChipPress = async (concernKey) => {
    const newSelected = new Set(selectedConcerns);
    const isCurrentlySelected = newSelected.has(concernKey);
    
    if (isCurrentlySelected) {
      newSelected.delete(concernKey);
    } else {
      newSelected.add(concernKey);
    }
    
    // Update local state immediately for responsiveness
    setSelectedConcerns(newSelected);
    
    // Auto-save to profile using centralized utility
    try {
      // Convert the new selection back to profile format
      const updatedProfileConcerns = lookupKeysToProfileConcerns(newSelected);
      
      await updateProfile({ concerns: updatedProfileConcerns });
      console.log('💾 [ConcernsCluster] Auto-saved concerns:', {
        selectedLookupKeys: Array.from(newSelected),
        profileConcerns: updatedProfileConcerns
      });
    } catch (error) {
      console.error('❌ [ConcernsCluster] Failed to auto-save concern:', error);
      // Revert local state on error
      setSelectedConcerns(selectedConcerns);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.concernsGrid}>
        {allConcerns.map((concern) => {
          const isSelected = selectedConcerns.has(concern.keyForLookup);
          return (
            <View key={concern.keyForLookup} style={styles.chipWrapper}>
              <Chip
                label={concern.displayName}
                type="default"
                size="md"
                styleVariant={isSelected ? "bold" : "normal"}
                onPress={() => handleChipPress(concern.keyForLookup)}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
    width: '100%',
  },
  concernsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  chipWrapper: {
    marginBottom: spacing.sm,
  },
});