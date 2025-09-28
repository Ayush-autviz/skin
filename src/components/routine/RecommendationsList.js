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
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useRouter } from 'expo-router';
import ListItem from '../ui/ListItem';
import { colors, spacing, typography } from '../../styles';
import useAuthStore from '../../stores/authStore';
import { useThreadContext } from '../../contexts/ThreadContext';
import { getComparison, transformComparisonData } from '../../services/newApiService';

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

// Mapping from concern keys to display names (like in MetricsSheet)
const CONCERN_KEY_TO_DISPLAY_NAME = {
  'acneScore': 'Breakouts',
  'poresScore': 'Visible Pores',
  'rednessScore': 'Redness',
  'pigmentationScore': 'Pigmentation',
  'linesScore': 'Lines',
  'hydrationScore': 'Dewiness',
  'uniformnessScore': 'Evenness',
  'eyeBagsScore': 'Eye Area Condition',
  'saggingScore': 'Sagging',
  'translucencyScore': 'Translucency',
  'eyeAreaCondition': 'Eye Area Condition'
};

const RecommendationsList = ({ recommendations, onRecommendationPress }) => {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const { createThread } = useThreadContext();
  
  // State to track which concerns are expanded
  const [expandedConcerns, setExpandedConcerns] = useState(new Set());
  
  // State to track automatically selected concerns based on user profile
  const [selectedConcerns, setSelectedConcerns] = useState(new Set());
  
  // State for comparison data and loading
  const [comparisonData, setComparisonData] = useState(null);
  const [isLoadingComparison, setIsLoadingComparison] = useState(true);
  const [lowestScoringConcerns, setLowestScoringConcerns] = useState([]);
  const [latestScores, setLatestScores] = useState({});

  // Get all concerns from the JSON data
  const allConcerns = Object.values(concernsData.skinConcerns);
  
  // Function to get scores from the latest image (most recent photo)
  const getLatestImageScores = (photos) => {
    if (!photos || photos.length === 0) return {};
    
    // Sort photos by date to get the most recent one
    const sortedPhotos = [...photos].sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at) : (a.timestamp ? new Date(a.timestamp) : new Date(0));
      const dateB = b.created_at ? new Date(b.created_at) : (b.timestamp ? new Date(b.timestamp) : new Date(0));
      return dateB - dateA; // Most recent first
    });
    
    const latestPhoto = sortedPhotos[0];
    if (!latestPhoto || !latestPhoto.metrics) return {};
    
    // Define concern keys (excluding age, eye age, and translucency)
    const concernKeys = [
      'acneScore', 'poresScore', 'rednessScore', 'pigmentationScore', 
      'linesScore', 'hydrationScore', 'uniformnessScore', 'eyeAreaCondition', 
      'saggingScore'
    ];
    
    // Get scores from the latest photo
    const latestScores = {};
    concernKeys.forEach(key => {
      const score = latestPhoto.metrics[key];
      if (score !== null && score !== undefined && !isNaN(score) && score > 0) {
        latestScores[key] = score;
      } else {
        latestScores[key] = 0; // No data available
      }
    });
    
    console.log('🔵 Latest photo scores:', latestScores);
    console.log('🔵 Latest photo date:', latestPhoto.created_at || latestPhoto.timestamp);
    
    return latestScores;
  };
  
  // Function to identify the 3 lowest scoring concerns from latest image
  const getLowestScoringConcerns = (latestScores) => {
    const concernEntries = Object.entries(latestScores)
      .filter(([key, score]) => score > 0) // Only include concerns with data
      .sort(([, a], [, b]) => a - b) // Sort by score (ascending - lowest first)
      .slice(0, 3); // Take only the first 3 (lowest scores)
    
    console.log('🔵 Lowest scoring concerns from latest image:', concernEntries);
    return concernEntries.map(([key]) => key);
  };
  
  // Fetch comparison data and identify lowest scoring concerns
  useEffect(() => {
    const fetchComparisonData = async () => {
      try {
        setIsLoadingComparison(true);
        console.log('🔵 Fetching comparison data for ingredients recommendations');
        
        const response = await getComparison('older_than_6_month');
        
        if (response.success && response.data) {
          const transformedPhotos = transformComparisonData(response.data);
          console.log(`✅ Loaded ${transformedPhotos.length} photos for concern analysis`);
          
          setComparisonData(transformedPhotos);
          
          // Get scores from the latest image
          const latestScoresData = getLatestImageScores(transformedPhotos);
          console.log('🔵 Latest image scores:', latestScoresData);
          
          // Store latest scores for UI display
          setLatestScores(latestScoresData);
          
          // Identify the 3 lowest scoring concerns from latest image
          const lowestConcerns = getLowestScoringConcerns(latestScoresData);
          console.log('🔵 Lowest scoring concerns from latest image:', lowestConcerns);
          
          setLowestScoringConcerns(lowestConcerns);
        } else {
          console.log('⚠️ No comparison data available, falling back to profile concerns');
          // Fallback to profile-based selection
          if (profile?.concerns) {
            const userConcernKeys = new Set();
            Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
              if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
                userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
              }
            });
            setSelectedConcerns(userConcernKeys);
          }
        }
      } catch (error) {
        console.error('🔴 Error fetching comparison data:', error);
        // Fallback to profile-based selection
        if (profile?.concerns) {
          const userConcernKeys = new Set();
          Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
            if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
              userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
            }
          });
          setSelectedConcerns(userConcernKeys);
        }
      } finally {
        setIsLoadingComparison(false);
      }
    };
    
    fetchComparisonData();
  }, [profile?.concerns]);
  
  // Automatically determine which concerns to show based on user profile (fallback)
  useEffect(() => {
    if (profile?.concerns && lowestScoringConcerns.length === 0) {
      const userConcernKeys = new Set();
      
      // Convert profile concerns (boolean flags) to concern keys
      Object.entries(profile.concerns).forEach(([profileConcernName, isSelected]) => {
        if (isSelected && PROFILE_TO_CONCERN_MAPPING[profileConcernName]) {
          userConcernKeys.add(PROFILE_TO_CONCERN_MAPPING[profileConcernName]);
        }
      });
      
      setSelectedConcerns(userConcernKeys);
    }
  }, [profile?.concerns, lowestScoringConcerns.length]);

  // Filter concerns based on lowest scoring concerns from comparison data or fallback to selected concerns
  const filteredConcerns = (() => {
    // If we have lowest scoring concerns from comparison data, use those in the same order
    if (lowestScoringConcerns.length > 0) {
      // Create a map for quick lookup
      const concernMap = {};
      allConcerns.forEach(concern => {
        concernMap[concern.keyForLookup] = concern;
      });
      
      // Return concerns in the same order as lowestScoringConcerns
      return lowestScoringConcerns
        .map(concernKey => concernMap[concernKey])
        .filter(concern => concern && concern.advice);
    }
    
    // Fallback to selected concerns from profile
    if (selectedConcerns.size > 0) {
      return allConcerns.filter(concern => 
        selectedConcerns.has(concern.keyForLookup) && concern.advice
      );
    }
    
    // Final fallback - show all concerns with advice
    return allConcerns.filter(concern => concern.advice);
  })();

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

    // Get firstName from profile or user
    const firstName = profile?.user_name || user?.user_name || 'there';
    console.log('🎯 [RecommendationsList] First name:', firstName);

    // Navigate to thread-based chat with recommendation context
    const message = recommendation.initialChatMessage || `Tell me more about ${recommendation.text.toLowerCase()} and how it can help my skin.`;
    router.push({
      pathname: '/(authenticated)/threadChat',
      params: {
        chatType: 'snapshot_feedback',
        initialMessage: message
      }
    });
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
          // onPress={() => handleRecommendationPress(item)}
        />
      </View>
    );
  };

  // Render ingredient item from advice
  const renderIngredientItem = (ingredient, itemIndex, concernKey) => {
    return (
      <View key={`${concernKey}-ingredient-${itemIndex}`} style={{ marginBottom: 12 }}>
        <ListItem
          title={ingredient}
          icon="bottle-tonic-outline"
          iconColor={colors.primary}
          showChevron={false}
          onPress={() => {}}
        />
      </View>
    );
  };

  // Render stats for lowest scoring concerns
  const renderLowestScoringStats = () => {
    if (lowestScoringConcerns.length === 0 || Object.keys(latestScores).length === 0) {
      return null;
    }

    return (
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Areas Requiring Attention</Text>
        <View style={styles.statsGrid}>
          {lowestScoringConcerns.map((concernKey, index) => {
            const score = latestScores[concernKey] || 0;
            const displayName = CONCERN_KEY_TO_DISPLAY_NAME[concernKey];
            
            return (
              <View key={concernKey} style={styles.statItem}>
                <View style={styles.statHeader}>
                  <Text style={styles.statRank}>#{index + 1}</Text>
                  <Text style={styles.statScore}>{Math.round(score)}/100</Text>
                </View>
                <Text style={styles.statName}>{displayName}</Text>
                <View style={styles.statBar}>
                  <View 
                    style={[
                      styles.statBarFill, 
                      { 
                        width: `${(score / 100) * 100}%`,
                        backgroundColor: score <= 30 ? '#FF3B30' : score <= 70 ? '#FFB340' : '#34C759'
                      }
                    ]} 
                  />
                </View>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  // Show loading state while fetching comparison data
  if (isLoadingComparison) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Analyzing your skin concerns...</Text>
        <Text style={styles.loadingSubtext}>Finding ingredients for your areas of concern</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {/* TEMPORARILY COMMENTED OUT - Concerns filters confusing users */}
      {/* <MyConcerns 
        selectedConcerns={selectedConcerns}
        onSelectionChange={setSelectedConcerns}
      /> */}
     
      
      <View style={styles.microcopyContainer}>
        <Text style={styles.microcopyText}>
          {lowestScoringConcerns.length > 0 
            ? 'Based on your latest skin analysis'
            : 'Based on your current skin analysis'
          }
        </Text>
      </View>

      {/* Stats for lowest scoring concerns */}
      {renderLowestScoringStats()}

      {filteredConcerns.map((concern, concernIndex) => {
        // Only show concerns that have advice object
        if (!concern.advice) return null;
        
        // Use ingredients from advice if available, otherwise fall back to recommendations
        const itemsToShow = concern.advice.ingredients || concern.whatYouCanDo || [];
        const isExpanded = expandedConcerns.has(concern.keyForLookup);
        const visibleItems = isExpanded ? itemsToShow : itemsToShow.slice(0, 3);
        const hasMore = itemsToShow.length > 3;

        return (
          <View key={concern.keyForLookup} style={styles.concernSection}>
            <Text style={styles.concernTitle}>
              {CONCERN_KEY_TO_DISPLAY_NAME[concern.keyForLookup] || concern.displayName || concern.keyForLookup}
            </Text>
            <View style={styles.itemsContainer}>
              {visibleItems.map((item, itemIndex) => {
                // If it's an ingredient string, render as ingredient item
                if (typeof item === 'string') {
                  return renderIngredientItem(item, itemIndex, concern.keyForLookup);
                }
                // Otherwise render as regular recommendation item
                return renderRecommendationItem(item, itemIndex, concern.keyForLookup);
              })}
              
              {hasMore && (
                <TouchableOpacity 
                  style={styles.showMoreButton}
                  onPress={() => toggleExpanded(concern.keyForLookup)}
                >
                  <Text style={styles.showMoreText}>
                    {isExpanded ? 'Show less' : `Show ${itemsToShow.length - 3} more`}
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
  // paddingHorizontal: spacing.lg,
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
    marginHorizontal: 16,
  },
  concernTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 16,
    marginHorizontal: 16,
  },
  itemsContainer: {
  //  marginHorizontal: 16,
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingText: {
    fontSize: 16,
    color: colors.textPrimary,
    fontWeight: '600',
    marginTop: spacing.lg,
    textAlign: 'center',
  },
  loadingSubtext: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.sm,
    textAlign: 'center',
  },
  statsContainer: {
    backgroundColor: '#F8F9FA',
    marginHorizontal: 16,
    marginBottom: 20,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: 12,
    textAlign: 'center',
  },
  statsGrid: {
    gap: 12,
  },
  statItem: {
    backgroundColor: 'white',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E9ECEF',
  },
  statHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  statRank: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.primary,
    backgroundColor: colors.primary + '15',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  statScore: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  statName: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: 8,
  },
  statBar: {
    height: 6,
    backgroundColor: '#E9ECEF',
    borderRadius: 3,
    overflow: 'hidden',
  },
  statBarFill: {
    height: '100%',
    borderRadius: 3,
  },
}); 