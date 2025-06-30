// (authenticated)/index.js
// Home screen with camera access, photo grid, and analysis features

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

NEXT STEPS
[x] Update PhotoGrid component
    - Add analysis status indicator overlay
    - Show checkmark for analyzed photos

[x] Implement caching for photo grid
    - Cache photos in AsyncStorage
    - Show last updated timestamp
    - Add pull-to-refresh functionality

[ ] Implement tap to view snapshot details

[ ] Integrate Analysis Features
    - Update Firebase schema for analysis data
    - Add analyzed boolean to photo metadata
    - Create analysis results collection
    - Implement analysis status fetching

[ ] Implement Snapshot Navigation
    - Create snapshot screen route
    - Handle photo selection
    - Pass photo data to snapshot view
    - Display analysis results table

[ ] Performance Optimizations
    - Cache analysis results locally
    - Implement lazy loading for grid
    - Optimize analysis status updates
    - Handle offline scenarios



------------------------------------------------------*/

import { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, ScrollView } from 'react-native';
import { router } from 'expo-router';
import { signOut, onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { Ionicons } from '@expo/vector-icons';
import SettingsDrawer from '../../src/components/layout/SettingsDrawer';
import PhotoGrid from '../../src/components/photo/PhotoGrid';
import Header from '../../src/components/ui/Header';
import { colors, spacing, typography, forms } from '../../src/styles';
import { useUser } from '../../src/contexts/UserContext';
import { usePhotoContext } from '../../src/contexts/PhotoContext';
import BottomNav from '../../src/components/layout/BottomNav';
import { Camera } from 'expo-camera';

export default function Home() {
  const [isSettingsVisible, setIsSettingsVisible] = useState(false);
  const { user } = useUser();
  const { photos, isLoading, refreshPhotos, lastUpdated } = usePhotoContext();

  useEffect(() => {
    console.log('📱 Home screen loaded');
  }, []);

  const handleCameraPress = () => {
    router.push('/camera');
  };

  const MenuButton = () => (
    <TouchableOpacity 
      onPress={() => setIsSettingsVisible(true)}
      style={styles.buttonContainer}
    >
      <Ionicons name="menu-outline" size={24} color="#333" />
    </TouchableOpacity>
  );

  const handleLogout = async () => {
    try {
      await signOut(auth);
      // _layout.js will handle redirect
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Magic Mirror" 
        leftComponent={<MenuButton />}
        isLogo={true}
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

      <BottomNav onCameraPress={handleCameraPress} />

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
    backgroundColor: '#fff',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    marginTop: 100, // Space for header
  },
  content: {
    flex: 1,
    marginBottom: 100, // Space for bottom nav
  },
  photoGridContainer: {
    justifyContent: 'flex-end', // This will push content to bottom
  },
  buttonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    color: colors.textLight,
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
  subText: {
    color: colors.textLight,
    ...typography.bodySmall,
    marginTop: spacing.sm,
  },
});