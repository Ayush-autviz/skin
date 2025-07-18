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
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback } from 'react';

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

  console.log("isLoading", isLoading);

  useEffect(() => {
    console.log('📱 Home screen loaded');
  }, []);

  // Refetch photos whenever the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('📱 Home screen focused - refreshing photos');
      refreshPhotos();
    }, [])
  );

  const handleMenuPress = () => {
    setIsSettingsVisible(true);
  };

  console.log('🔵 photos:', photos);

  const handleLogout = async () => {
    try {
      const { logout } = useAuthStore.getState();
      logout();
      router.replace('/auth/sign-in');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };
  console.log('🔵 photos:', photos);

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
          <View style={styles.emptyStateContainer}>
            <View style={styles.emptyIconWrapper}>
              <Feather name="camera" size={48} color={colors.primary} />
            </View>
            <Text style={styles.emptyTitle}>No snapshots yet</Text>
            <Text style={styles.emptySubtitle}>Tap the + button below to capture your first photo</Text>
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
  emptyStateContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyIconWrapper: {
    backgroundColor: '#E8E2DA',
    padding: spacing.lg,
    borderRadius: 50,
    marginBottom: spacing.lg,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    textAlign: 'center',
    paddingHorizontal: spacing.lg,
  },
}); 