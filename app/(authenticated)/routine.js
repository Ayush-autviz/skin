// routine.js
// Screen for managing skincare routine and viewing recommendations

/* ------------------------------------------------------
WHAT IT DOES
- Displays routine management interface (under construction)
- Displays ingredient recommendations based on latest analysis
- Provides tab navigation between "My Routine" and "Recommendations"

DEV PRINCIPLES
- Uses vanilla JavaScript/React Native
- Clean component structure
- Consistent styling

NEXT STEPS
[x] Add Tab Navigation (2024-04-22)
[x] Add Recommendations Placeholder (2024-04-22)
[x] Add SafeAreaView (Corrected Placement) (2024-04-22)
[x] Add Padding below Header (2024-04-22)
[ ] Design routine tracking interface
[ ] Implement routine management features
[ ] Connect Recommendations tab to service
[x] Add Activity Tab (State, Button, Content) (2024-04-22)
[x] Restyle Tabs (Underline Style) (2024-04-22)
[x] Implement Horizontal Scrolling Tabs (2024-04-22)
------------------------------------------------------*/

import React, { useState, useEffect } from 'react'; // Keep useState
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
  // Removed FlatList, ActivityIndicator
} from 'react-native';
import Header from '../../src/components/ui/Header';
import RecommendationsList from '../../src/components/routine/RecommendationsList';
import MyRoutine from '../../src/components/routine/MyRoutine'; // Import the new component
import { colors, spacing, typography } from '../../src/styles';
// Removed firebaseService, auth imports

export default function RoutineScreen() {
  const [activeTab, setActiveTab] = useState('myRoutine');
  
  useEffect(() => {
    console.log('🧴 Routine screen loaded');
  }, []);

  return (
    <View style={styles.outerContainer}>
      <Header 
        title="Routine"
        showBack={true}
      />
      <View style={styles.contentContainer}>
        {/* Tab Navigation */}
        <ScrollView 
          horizontal={true} 
          showsHorizontalScrollIndicator={false}
          style={styles.tabScrollView}
          contentContainerStyle={styles.tabContainer}
        >
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('myRoutine')}
          >
            <Text style={[styles.tabText, activeTab === 'myRoutine' && styles.activeTabText]}>My Routine</Text>
            {activeTab === 'myRoutine' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('recommendations')}
          >
            <Text style={[styles.tabText, activeTab === 'recommendations' && styles.activeTabText]}>Recommendations</Text>
            {activeTab === 'recommendations' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          {/* [routine.js]: COMMENTED OUT Activity Tab per current task
          <TouchableOpacity 
            style={styles.tabButton}
            onPress={() => setActiveTab('activity')}
          >
            <Text style={[styles.tabText, activeTab === 'activity' && styles.activeTabText]}>Activity</Text>
            {activeTab === 'activity' && <View style={styles.activeTabIndicator} />}
          </TouchableOpacity>
          [routine.js]: END COMMENTED OUT Activity Tab */}
        </ScrollView>

        {/* Tab Content */}
        {activeTab === 'myRoutine' && <MyRoutine />}
        {activeTab === 'recommendations' && <RecommendationsList />}
        {/* [routine.js]: COMMENTED OUT Activity Tab Content per current task
        {activeTab === 'activity' && (
          <Text style={styles.text}>Activity Feed - Under Construction</Text>
        )}
        [routine.js]: END COMMENTED OUT Activity Tab Content */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  outerContainer: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    flex: 1,
    marginTop: 100,
  },
  tabScrollView: {
    flexGrow: 0,
    borderBottomColor: colors.border,
    marginTop: spacing.sm,
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    marginBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    paddingVertical: 0,
    paddingHorizontal: spacing.lg,
    alignItems: 'center',
  },
  tabText: {
    ...typography.button,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  activeTabText: {
    color: colors.textPrimary,
    fontWeight: 'bold',
  },
  activeTabIndicator: {
    height: 3,
    width: '100%',
    backgroundColor: colors.primary,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
}); 