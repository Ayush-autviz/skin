// AuthProvider.js
// Auth provider for new authentication system using Zustand

import React, { useEffect, useState } from 'react';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import useAuthStore from '../stores/authStore';
import { getProfile } from '../services/newApiService';

const PROTECTED_SEGMENTS = ['(authenticated)', 'onboarding'];

export function AuthProvider({ children }) {
  const { 
    user, 
    isAuthenticated, 
    profile, 
    profileStatus,
    setProfile,
    loading,
    setLoading 
  } = useAuthStore();
  
  const router = useRouter();
  const segments = useSegments();
  const [isNavigationReady, setIsNavigationReady] = useState(false);

  // Initialize navigation readiness
  useEffect(() => {
    // Small delay to ensure navigation system is mounted
    const timer = setTimeout(() => {
      setIsNavigationReady(true);
    }, 100);

    return () => clearTimeout(timer);
  }, []);

  // Fetch profile data when user is authenticated, profile status is true, but profile data is missing
  // Also handle legacy users where profileStatus might be null but they have a profile
  useEffect(() => {
    const fetchProfileIfNeeded = async () => {
      if (isAuthenticated && user && !profile) {
        // If profileStatus is true, definitely fetch profile
        // If profileStatus is null (legacy user), try to fetch profile to determine status
        if (profileStatus === true || profileStatus === null) {
          try {
            setLoading(true);
            const result = await getProfile();
            if (result.success) {
              setProfile(result.profile);
              // If profileStatus was null and we got a profile, set it to true
              if (profileStatus === null) {
                const { setProfileStatus } = useAuthStore.getState();
                setProfileStatus(true);
              }
            }
          } catch (error) {
            console.error('Error fetching profile:', error);
            // If profile fetch fails and profileStatus was null, set it to false
            if (profileStatus === null) {
              const { setProfileStatus } = useAuthStore.getState();
              setProfileStatus(false);
            }
          } finally {
            setLoading(false);
          }
        }
      }
    };

    fetchProfileIfNeeded();
  }, [isAuthenticated, user, profileStatus, profile, setProfile, setLoading]);

  // Handle routing based on auth and profile state
  useEffect(() => {
    if (loading || !isNavigationReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const inProtectedRoute = PROTECTED_SEGMENTS.includes(segments[0]);

    console.log('🧭 [AuthProvider] Routing check:', { 
      isAuthenticated,
      hasUser: !!user,
      profileStatus,
      hasProfile: !!profile,
      segments: segments,
      isNavigationReady
    });

    // Not authenticated
    if (!isAuthenticated || !user) {
      if (!inAuthGroup) {
        console.log('🔄 Redirecting to sign-in: User not authenticated');
        setTimeout(() => {
          router.replace('/auth/sign-in');
        }, 0);
      }
      return;
    }

    // Authenticated but profile incomplete (profile_status is false or null)
    if (profileStatus === false || (profileStatus === null && !profile)) {
      if (!inOnboardingGroup) {
        console.log('🔄 Redirecting to onboarding: Profile status is incomplete');
        setTimeout(() => {
          router.replace('/onboarding/name');
        }, 0);
      }
      return;
    }

    // Fully authenticated user with complete profile (profile_status is true)
    if (isAuthenticated && user && profileStatus === true) {
      if (!segments[0] || segments[0] === 'auth' || segments[0] === 'onboarding') {
        console.log('🔄 Redirecting to main app: User is fully authenticated with complete profile');
        setTimeout(() => {
          router.replace('/(authenticated)/');
          // Add extra delay to ensure navigation stack is fully established
          setTimeout(() => {
            console.log('🔄 [AuthProvider] Navigation to main app completed, stack should be ready');
          }, 200);
        }, 100); // Slightly longer delay for navigation stability
      }
    }
  }, [isAuthenticated, user, profileStatus, segments, loading, router, isNavigationReady]);

  if (loading || !isNavigationReady) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFFFFF' }}>
        <ActivityIndicator size="large" color="#8B7355" />
      </View>
    );
  }

  return children;
}

export default AuthProvider;