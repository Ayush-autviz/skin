// (authenticated)/_layout.js
// Layout wrapper for protected routes

/* ------------------------------------------------------
WHAT IT DOES
- Protects authenticated routes
- Handles auth state
- Provides navigation structure for authenticated screens

DEV PRINCIPLES
- Uses vanilla JavaScript
- Implements proper route protection
- Clean navigation structure
------------------------------------------------------*/

import { useEffect } from 'react';
import { Stack, useRouter, useSegments } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { Dimensions } from 'react-native';
const { height } = Dimensions.get('window');

export default function AuthenticatedLayout() {
  const router = useRouter();
  const segments = useSegments();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user) {
        // Redirect to sign in if not authenticated
        router.replace('/auth/sign-in');
      }
    });

    return unsubscribe;
  }, []);

  // Debug logging for route segments
  // console.log('🧭 Layout Segments:', {
  //   segments,
  //   currentPath: segments.join('/'),
  //   availableScreens: ['index', 'snapshot', 'camera', 'routine', 'progress', 'metricDetail', 'aiChat']
  // });

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        gestureEnabled: true,
        gestureDirection: 'horizontal',
      }}
    >
      {/* Tab Navigation - Main navigation with bottom tabs */}
      <Stack.Screen 
        name="(tabs)"
        options={{
          animation: 'fade',
          headerShown: false,
        }}
      />
      
      {/* Modal/Detail Screens - Slide from right */}
      <Stack.Screen name="camera" />
      <Stack.Screen name="snapshot" />
      <Stack.Screen 
        name="metricDetail"
        options={{
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />
      <Stack.Screen 
        name="aiChat"
        options={{
          animation: 'slide_from_right',
          presentation: 'card',
        }}
      />
      <Stack.Screen name="camera-v1" />
      <Stack.Screen name="capture" />
      <Stack.Screen name="liqa" />
      <Stack.Screen name="profile" />
    </Stack>
  );
} 