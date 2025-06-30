// Recommendations.js
// React UI component for displaying skincare recommendations based on user's skin concerns

/* ------------------------------------------------------

WHAT IT DOES
- Displays personalized recommendations based on user's analyzed skin metrics
- Uses local concerns.json data instead of Firestore
- Groups recommendations by skin concern type
- Shows recommendations in a My Routine-style layout

DATA USED
- concernsData from concerns.json
- User's current skin metrics to determine which concerns apply

DEVELOPMENT HISTORY
- Original version used Firestore data
- Updated to use local concerns.json data with routine-style layout

------------------------------------------------------*/

// **LLM Notes**
// - Don't change the file name or its location.
// - Keep this documentation updated with each change.
// - Only change ONE piece of logic or UI at a time.

import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import ListItem from '../ui/ListItem';
import { colors } from '../../styles';

// Import the concerns data
import concernsData from '../../../data/concerns.json';

const Recommendations = ({ userMetrics }) => {
  // Process user metrics to determine which concerns apply
  const applicableConcerns = useMemo(() => {
    if (!userMetrics) return [];
    
    const concerns = [];
    const skinConcerns = concernsData.skinConcerns;
    
    // Check each metric against thresholds to determine concerns
    if (userMetrics.acneScore < 90) concerns.push(skinConcerns.acneScore);
    if (userMetrics.pigmentationScore < 90) concerns.push(skinConcerns.pigmentationScore);
    if (userMetrics.uniformnessScore < 90) concerns.push(skinConcerns.uniformnessScore);
    if (userMetrics.rednessScore < 70) concerns.push(skinConcerns.rednessScore);
    if (userMetrics.linesScore < 75) concerns.push(skinConcerns.linesScore);
    if (userMetrics.poresScore < 80) concerns.push(skinConcerns.poresScore);
    if (userMetrics.hydrationScore < 80) concerns.push(skinConcerns.hydrationScore);
    
    return concerns;
  }, [userMetrics]);

  const renderRecommendationItem = (item, index, concernName) => {
    // Choose icon and color based on type
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
      <View key={`${concernName}-${index}`} style={{ marginBottom: 12, marginHorizontal: 16 }}>
        <ListItem
          title={item.text}
          icon={iconName}
          iconColor={iconColor}
          showChevron={true}
          onPress={() => {
            console.log('Recommendation pressed:', item.text);
          }}
        />
      </View>
    );
  };

  if (!applicableConcerns.length) {
    return (
      <View style={styles.container}>
        <Text style={styles.noRecommendationsText}>
          Great job! Your skin metrics look good. Keep up your current routine.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      {applicableConcerns.map((concern, concernIndex) => (
        <View key={concern.keyForLookup} style={styles.concernSection}>
          <Text style={styles.concernTitle}>{concern.displayName}</Text>
          {concern.whatYouCanDo.map((item, itemIndex) => 
            renderRecommendationItem(item, itemIndex, concern.keyForLookup)
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  concernSection: {
    marginBottom: 24,
  },
  concernTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#222',
    marginBottom: 12,
    marginHorizontal: 16,
  },
  noRecommendationsText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 40,
    marginHorizontal: 20,
  },
});

export default Recommendations; 