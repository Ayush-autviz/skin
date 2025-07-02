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

import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import SettingsDrawer from '../../../src/components/layout/SettingsDrawer';
import TabHeader from '../../../src/components/ui/TabHeader';
import { colors, spacing, typography } from '../../../src/styles';
import MetricsSeries from '../../../src/components/analysis/MetricsSeries';
import { usePhotoContext } from '../../../src/contexts/PhotoContext';

export default function ProgressTab() {
  const { photos, loading } = usePhotoContext();
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);

  const handleMenuPress = () => {
    setIsSettingsVisible(true);
  };

  // Filter for only analyzed photos with metrics
  const analyzedPhotos = photos?.filter(photo => 
    photo.metrics && 
    Object.keys(photo.metrics).length > 0
  ) || [];

  return (
    <View style={styles.container}>
      <TabHeader 
        title="Progress"
        onMenuPress={handleMenuPress}
      />
      
      <View style={styles.content}>
        <MetricsSeries photos={analyzedPhotos} />
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
    marginTop: 110, // Space for new header
    marginBottom: 100, // Space for bottom nav
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 