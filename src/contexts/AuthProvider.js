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

  // Fetch profile data when user is authenticated but profile is missing
  useEffect(() => {
    const fetchProfileIfNeeded = async () => {
      if (isAuthenticated && user && !profile) {
        try {
          setLoading(true);
          const result = await getProfile();
          if (result.success) {
            setProfile(result.profile);
          }
        } catch (error) {
          console.error('Error fetching profile:', error);
          // Don't logout user if profile fetch fails, they might not have created profile yet
        } finally {
          setLoading(false);
        }
      }
    };

    fetchProfileIfNeeded();
  }, [isAuthenticated, user, profile, setProfile, setLoading]);

  // Handle routing based on auth and profile state
  useEffect(() => {
    if (loading || !isNavigationReady) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const inProtectedRoute = PROTECTED_SEGMENTS.includes(segments[0]);

    console.log('🧭 [AuthProvider] Routing check:', { 
      isAuthenticated,
      hasUser: !!user,
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

    // Authenticated but no profile (new user needs to complete onboarding)
    if (!profile) {
      if (!inOnboardingGroup) {
        console.log('🔄 Redirecting to onboarding: User has no profile');
        setTimeout(() => {
          router.replace('/onboarding/name');
        }, 0);
      }
      return;
    }

    // Fully authenticated user with profile
    if (isAuthenticated && user && profile) {
      if (!segments[0] || segments[0] === 'auth' || segments[0] === 'onboarding') {
        console.log('🔄 Redirecting to main app: User is fully authenticated');
        setTimeout(() => {
          router.replace('/(authenticated)/');
        }, 0);
      }
    }
  }, [isAuthenticated, user, profile, segments, loading, router, isNavigationReady]);

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