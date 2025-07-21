// RecommendationsList.js
// React UI component for displaying skincare recommendations based on user's skin concerns

/* ------------------------------------------------------

WHAT IT DOES
- Displays skincare recommendations from concerns.json
- Shows recommendations in a My Routine-style layout using ListItem
- Groups recommendations by skin concern type
- Filters recommendations based on selected concerns from MyConcerns
- Shows max 3 recommendations per concern with "show more" option
- Opens AI threads when recommendations are tapped

DATA USED
- concernsData from concerns.json - all recommendations from all concerns
- selectedConcerns from MyConcerns - filters which sections to show

DEVELOPMENT HISTORY
- Original version used Firestore data
- Updated to use local concerns.json data with routine-style layout
- Simplified to show all recommendations without filtering
- Added MyConcerns component at top
- Added filtering based on selected concerns
- Added "show more" functionality with 3 item limit
- Added AI thread creation on recommendation tap

------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import ListItem from '../ui/ListItem';
import { colors, spacing, typography } from '../../styles';
import useAuthStore from '../../stores/authStore';
import { useThreadContext } from '../../contexts/ThreadContext';

// Import the concerns data
import concernsData from '../../../data/concerns.json';

// Mapping from profile concern names to concern keys (same as MyConcerns)
const PROFILE_TO_CONCERN_MAPPING = {
  'Aging': 'linesScore',
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

const RecommendationsList = ({ recommendations, onRecommendationPress }) => {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { createThread } = useThreadContext();
  
  // State to track which concerns are expanded
  const [expandedConcerns, setExpandedConcerns] = useState(new Set());
  
  // State to track automatically selected concerns based on user profile
  const [selectedConcerns, setSelectedConcerns] = useState(new Set());

  // Get all concerns from the JSON data
  const allConcerns = Object.values(concernsData.skinConcerns);
  
  // Automatically determine which concerns to show based on user profile
  useEffect(() => {
    if (profile?.concerns) {
      const userConcernKeys = new Set();
      
      // Convert profile concerns (boolean flags) to concern keys
      Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
        if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
          userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
        }
      });
      
      setSelectedConcerns(userConcernKeys);
      // console.log('🎯 [RecommendationsList] Auto-selected user concerns:', {
      //   profileConcerns: profile.concerns,
      //   mappedKeys: Array.from(userConcernKeys)
      // });
    }
  }, [profile?.concerns]);

  // Filter concerns based on automatically selected concerns
  const filteredConcerns = selectedConcerns.size === 0 
    ? allConcerns // Show all if none selected
    : allConcerns.filter(concern => selectedConcerns.has(concern.keyForLookup));

  const toggleExpanded = (concernKey) => {
    const newExpanded = new Set(expandedConcerns);
    if (newExpanded.has(concernKey)) {
      newExpanded.delete(concernKey);
    } else {
      newExpanded.add(concernKey);
    }
    setExpandedConcerns(newExpanded);
  };

  const handleRecommendationPress = async (recommendation) => {
    if (onRecommendationPress) {
      onRecommendationPress(recommendation);
    }
    
    console.log('Recommendation pressed:', recommendation.name);
    // TODO: Navigate to recommendation detail or AI chat when implemented
  };

  // Render individual recommendation item
  const renderRecommendationItem = (item, itemIndex, concernKey) => {
    // Choose icon based on type to match routine
    let iconName = 'help-circle';
    let iconColor = '#666';
    
    if (item.type === 'product') {
      iconName = 'bottle-tonic-outline';
      iconColor = colors.primary;
    } else if (item.type === 'activity') {
      iconName = 'shower-head';
      iconColor = '#009688';
    } else if (item.type === 'nutrition') {
      iconName = 'coffee';
      iconColor = '#FF9800';
    }

    return (
      <View key={`${concernKey}-${itemIndex}`} style={{ marginBottom: 12 }}>
        <ListItem
          title={item.text}
          icon={iconName}
          iconColor={iconColor}
          showChevron={true}
          onPress={() => handleRecommendationPress(item)}
        />
      </View>
    );
  };

  return (
    <ScrollView style={styles.container}>
      {/* TEMPORARILY COMMENTED OUT - Concerns filters confusing users */}
      {/* <MyConcerns 
        selectedConcerns={selectedConcerns}
        onSelectionChange={setSelectedConcerns}
      /> */}
     
      
      <View style={styles.microcopyContainer}>
        <Text style={styles.microcopyText}>
          Based on your current skin analysis
        </Text>
      </View>

      {filteredConcerns.map((concern, concernIndex) => {
        const isExpanded = expandedConcerns.has(concern.keyForLookup);
        const recommendations = concern.whatYouCanDo;
        const visibleRecommendations = isExpanded ? recommendations : recommendations.slice(0, 3);
        const hasMore = recommendations.length > 3;

        return (
          <View key={concern.keyForLookup} style={styles.concernSection}>
            <Text style={styles.concernTitle}>{concern.displayName}</Text>
            <View style={styles.itemsContainer}>
              {visibleRecommendations.map((item, itemIndex) => 
                renderRecommendationItem(item, itemIndex, concern.keyForLookup)
              )}
              
              {hasMore && (
                <TouchableOpacity 
                  style={styles.showMoreButton}
                  onPress={() => toggleExpanded(concern.keyForLookup)}
                >
                  <Text style={styles.showMoreText}>
                    {isExpanded ? 'Show less' : `Show ${recommendations.length - 3} more`}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        );
      })}
    </ScrollView>
  );
}

export default RecommendationsList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  microcopyContainer: {
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
  },
  microcopyText: {
    fontSize: 11,
    color: colors.textSecondary,
    textAlign: 'center',
    opacity: 0.7,
  },
  concernSection: {
    marginBottom: 32,
  },
  concernTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  itemsContainer: {
    marginHorizontal: 16,
  },
  showMoreButton: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  showMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '500',
  },
}); 