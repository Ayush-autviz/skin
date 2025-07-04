// MyConcerns.js
// React UI component for displaying user's skin concerns as filter chips

/* ------------------------------------------------------

WHAT IT DOES
- Displays skin concerns as selectable filter chips in a horizontal scrolling row
- Functions as filters for recommendations
- Shows all available concerns from concerns.json
- Manages selected/unselected state for filtering
- Initializes with user's selected concerns from profile
- Maps profile concern names to concern keys

DATA USED
- concernsData from concerns.json - all available skin concerns
- user.profile.concerns - user's selected concerns from profile (boolean flags)

DEVELOPMENT HISTORY
- Initial implementation as static component
- Chip layout with centered alignment
- Updated to use existing Chip component with correct props
- Changed to horizontal scrolling layout
- Removed title, added filter functionality
- Added initialization from user profile concerns
- Added mapping between profile concerns and concern keys

------------------------------------------------------*/

import React, { useEffect } from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import Chip from '../ui/Chip';
import { colors, spacing } from '../../styles';
import useAuthStore from '../../stores/authStore';

// Import the concerns data
import concernsData from '../../../data/concerns.json';

// Mapping from profile concern names to concern keys
const PROFILE_TO_CONCERN_MAPPING = {
  'Aging': 'linesScore', // or 'saggingScore' - need to decide
  'Breakouts': 'acneScore',
  'Dark circles': 'eyeBagsScore',
  'Pigmented spots': 'pigmentationScore',
  'Pores': 'poresScore',
  'Redness': 'rednessScore',
  'Sagging': 'saggingScore',
  'Under eye lines': 'linesScore',
  'Under eye puff': 'eyeBagsScore',
  'Uneven skin tone': 'uniformnessScore',
  'Wrinkles': 'linesScore'
};

export default function MyConcerns({ selectedConcerns = new Set(), onSelectionChange }) {
  const { user, profile } = useAuthStore();
  
  // Get all concerns from the JSON data
  const allConcerns = Object.values(concernsData.skinConcerns);

  // Initialize selected concerns from user profile
  useEffect(() => {
    if (profile?.concerns) {
      const userConcernKeys = new Set();
      
      // Convert profile concerns (boolean flags) to concern keys
      Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
        if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
          userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
        }
      });
      
      onSelectionChange(userConcernKeys);
      console.log('🎯 [MyConcerns] Mapped user concerns:', {
        profileConcerns: profile.concerns,
        mappedKeys: Array.from(userConcernKeys)
      });
    }
  }, [profile?.concerns, onSelectionChange]);

  const handleChipPress = (concernKey) => {
    const newSelected = new Set(selectedConcerns);
    if (newSelected.has(concernKey)) {
      newSelected.delete(concernKey);
    } else {
      newSelected.add(concernKey);
    }
    onSelectionChange(newSelected);
    console.log('Selected concerns:', Array.from(newSelected));
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
        style={styles.scrollView}
      >
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
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.md,
    backgroundColor: '#fff',
  },
  scrollView: {
    flexGrow: 0, // Prevent the ScrollView from taking up extra space
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  chipWrapper: {
    marginRight: spacing.sm, // Space between chips
  },
}); 