// (authenticated)/(tabs)/index.js
// Home tab screen with camera access, photo grid, and analysis features

/* ------------------------------------------------------
WHAT IT DOES
- Displays home screen content
- Provides camera access
- Handles user logout
- Shows photo grid with analysis status
- Navigates to detailed snapshot view
- Uses cached photos for faster loading

DEV PRINCIPLES
- Uses vanilla JavaScript
- Clean component structure
- Proper navigation handling
- Efficient photo grid rendering
- Implements caching for better performance
------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';

import SettingsDrawer from '../../../src/components/layout/SettingsDrawer';
import PhotoGrid from '../../../src/components/photo/PhotoGrid';
import TabHeader from '../../../src/components/ui/TabHeader';
import { colors, spacing, typography, forms } from '../../../src/styles';
import useAuthStore from '../../../src/stores/authStore';
import { usePhotoContext } from '../../../src/contexts/PhotoContext';
import { Camera } from 'expo-camera';

export default function Home() {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { user } = useAuthStore();
  const { photos, isLoading, refreshPhotos, lastUpdated } = usePhotoContext();

  useEffect(() => {
    console.log('📱 Home screen loaded');
  }, []);

  const handleMenuPress = () => {
    setIsSettingsVisible(true);
  };

  const handleLogout = async () => {
    try {
      const { logout } = useAuthStore.getState();
      logout();
      router.replace('/auth/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <TabHeader 
        title="Magic Mirror" 
        onMenuPress={handleMenuPress}
      />
      
      <View style={[styles.content, styles.photoGridContainer]}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your photos...</Text>
          </View>
        ) : photos.length === 0 ? (
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>No photos yet</Text>
            <Text style={styles.subText}>Tap + to take your first photo</Text>
          </View>
        ) : (
          <PhotoGrid 
            photos={photos} 
            onRefresh={refreshPhotos}
            lastUpdated={lastUpdated}
          />
        )}
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
    backgroundColor: '#FFF', // Match creamy background of tab bar
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    marginTop: 100,
  },
  content: {
    flex: 1,
    marginTop: 120,
    marginBottom: 140, // Extra space for floating add button
    paddingHorizontal: spacing.lg,
  },
  photoGridContainer: {
    justifyContent: 'flex-end',
  },

  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
  subText: {
    color: colors.textSecondary,
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
}); 