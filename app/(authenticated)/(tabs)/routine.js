// (authenticated)/(tabs)/routine.js
// Routine tab screen for managing skincare routine and viewing recommendations

/* ------------------------------------------------------
WHAT IT DOES
- Displays routine management interface (under construction)
- Displays ingredient recommendations based on latest analysis
- Provides tab navigation between "My Routine" and "Recommendations"

DEV PRINCIPLES
- Uses vanilla JavaScript/React Native
- Clean component structure
- Consistent styling
------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, SafeAreaView, ScrollView,
} from 'react-native';
import TabHeader from '../../../src/components/ui/TabHeader';
import SettingsDrawer from '../../../src/components/layout/SettingsDrawer';
import RecommendationsList from '../../../src/components/routine/RecommendationsList';
import MyRoutine from '../../../src/components/routine/MyRoutine';
import { colors, spacing, typography } from '../../../src/styles';

export default function RoutineTab() {
  const [activeTab, setActiveTab] = useState('myRoutine');
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  
  useEffect(() => {
    console.log('🧴 Routine tab loaded');
  }, []);

  const handleMenuPress = () => {
    setIsSettingsVisible(true);
  };

  return (
    <View style={styles.outerContainer}>
      <TabHeader 
        title="Routine"
        onMenuPress={handleMenuPress}
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
        </ScrollView>

        {/* Tab Content */}
        <View style={styles.tabContentContainer}>
          {activeTab === 'myRoutine' && <MyRoutine />}
          {activeTab === 'recommendations' && <RecommendationsList />}
        </View>
      </View>

      <SettingsDrawer 
        isVisible={isSettingsVisible}
        onClose={() => setIsSettingsVisible(false)}
      />
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
    marginTop: 120, // Space for new header
    marginBottom: 100, // Space for bottom nav
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
  tabContentContainer: {
    flex: 1,
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xl,
  },
}); 