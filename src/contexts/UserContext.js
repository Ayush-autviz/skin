// UserContext.js
// Global context for managing user authentication and profile data

/* ------------------------------------------------------
WHAT IT DOES
- Manages authentication state
- Handles protected route access
- Provides user profile data (Firestore)
- Manages user document state ('onboarding', 'active')
- Controls onboarding flow
- Manages global loading states
- Creates Haut AI subject ID if needed
- Clears photo cache on user change

REMOVED RESPONSIBILITIES:
- Managing selected snapshot (Moved to PhotoContext)

DATA USED
- Firebase Auth user
- Firestore user document:
  users/{userId}/
    profile/
    hautSubjectId
    state
    uid
    createdAt
    updatedAt

DEV PRINCIPLES
- Single source of truth for auth state
- Proper route protection
- Clean navigation handling
------------------------------------------------------*/

import React, { createContext, useState, useContext, useEffect } from 'react'; // Removed useCallback as it wasn't used after removal
import { auth, db } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, onSnapshot, updateDoc, serverTimestamp } from 'firebase/firestore';
import { useRouter, useSegments } from 'expo-router';
import { View, ActivityIndicator } from 'react-native';
import { createSubject } from '../services/hautServiceMobile';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Import constants from PhotoContext for cache clearing
const PHOTO_CACHE_KEY = 'PHOTO_CACHE';
const PHOTO_CACHE_TIMESTAMP_KEY = 'PHOTO_CACHE_TIMESTAMP';

const UserContext = createContext();

const PROTECTED_SEGMENTS = ['(authenticated)', 'onboarding'];

export function UserProvider({ children }) {
  const [state, setState] = useState({
    user: null,        // Firebase auth user
    profile: null,     // Firestore profile data
    documentState: null, // Store document-level state
    createdAt: null,   // User creation timestamp
    userData: null,    // Full user document data
    loading: true,     // Global loading state
    error: null,       // Error state
    // REMOVED: selectedSnapshot state
  });
  
  const router = useRouter();
  const segments = useSegments();

  // Function to clear photo cache
  const clearPhotoCache = async () => {
    try {
      await AsyncStorage.removeItem(PHOTO_CACHE_KEY);
      await AsyncStorage.removeItem(PHOTO_CACHE_TIMESTAMP_KEY);
      console.log('🧹 [UserContext] Photo cache cleared on user change');
    } catch (error) {
      console.error('❌ [UserContext] Error clearing photo cache:', error);
    }
  };

  // updateProfile function moved here from useUser hook to avoid circular dependency
  const updateProfile = async (profileData) => {
    try {
      const userId = state.user?.uid;
      if (!userId) throw new Error('No user ID found');

      const updates = {};

      // Handle profile fields - only update if provided
      if (profileData.firstName !== undefined) {
        updates['profile.firstName'] = profileData.firstName.trim();
      }
      if (profileData.lastName !== undefined) {
        updates['profile.lastName'] = profileData.lastName.trim();
      }
      if (profileData.age !== undefined && !isNaN(Number(profileData.age))) {
        updates['profile.age'] = Number(profileData.age);
      }
      if (profileData.birthDate !== undefined) {
        updates['profile.birthDate'] = profileData.birthDate;
      }
      if (profileData.concerns !== undefined) {
        updates['profile.concerns'] = profileData.concerns;
      }
      
      // Always update the timestamp
      updates['updatedAt'] = serverTimestamp();

      // Only proceed if there are actual updates to make (besides timestamp)
      if (Object.keys(updates).length <= 1) {
        console.log('⚠️ No profile data to update');
        return;
      }

      console.log('📝 Updating profile:', updates);
      
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, updates);
      
      console.log('✅ Profile updated successfully');
    } catch (error) {
      console.error('🔴 Error updating profile:', error);
      throw error;
    }
  };

  // updateState function moved here from useUser hook to avoid circular dependency
  const updateState = async (newState) => {
    try {
      const userId = state.user?.uid;
      if (!userId) throw new Error('No user ID found');

      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, {
        state: newState,
        updatedAt: serverTimestamp()
      });
    } catch (error) {
      console.error('Error updating user state:', error);
      throw error;
    }
  };

  // Handle routing based on auth and profile state
  useEffect(() => {
    if (state.loading) return;

    const inAuthGroup = segments[0] === 'auth';
    const inOnboardingGroup = segments[0] === 'onboarding';
    const inProtectedRoute = PROTECTED_SEGMENTS.includes(segments[0]);

    // console.log('🧭 [UserContext] Routing check:', { 
    //   user: !!state.user, 
    //   profile: !!state.profile,
    //   profileState: state.profile?.state,
    //   documentState: state.documentState,
    //   segments: segments
    // });

    // Not authenticated
    if (!state.user) {
      if (!inAuthGroup) {
        router.replace('/auth/sign-in');
      }
      return;
    }

    // Authenticated but no profile (new user)
    if (!state.profile) {
      if (!inOnboardingGroup) {
        router.replace('/onboarding/name');
      }
      return;
    }

    // Handle onboarding state - check both locations for backward compatibility
    const userState = state.documentState || state.profile.state;
    
    if (userState === 'onboarding') {
      if (!inOnboardingGroup) {
        router.replace('/onboarding/name');
        console.log('🔄 Redirecting to onboarding: User state is', userState);
      }
      return;
    }

    // Fully onboarded user
    if (userState === 'active' || state.profile.onboardingCompleted) {
      if (!segments[0] || segments[0] === 'auth' || segments[0] === 'onboarding') {
        router.replace('/(authenticated)/');
      }
    }
  }, [state.user, state.profile, state.documentState, segments, state.loading]);

  // Set up auth and profile listeners
  useEffect(() => {
    let profileUnsubscribe;
    let isCreatingSubject = false;  // Add flag to prevent duplicate calls
    let previousUserId = null;

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('👤 User loaded');
      
      // If the user ID has changed (including switching from null to a value or vice versa),
      // clear the photo cache
      if (previousUserId !== user?.uid) {
        clearPhotoCache();
        previousUserId = user?.uid;
      }
      
      if (user) {
        // Subscribe to profile changes
        const userRef = doc(db, 'users', user.uid);
        profileUnsubscribe = onSnapshot(userRef, 
          async (doc) => {
            const userData = doc.exists() ? doc.data() : null;

            
            // Update state first to prevent loading spinner from showing indefinitely
            setState(prev => ({
              ...prev,
              user,
              profile: userData?.profile || null,
              documentState: userData?.state || null,
              createdAt: userData?.createdAt || null,
              userData: userData || null,
              loading: false
            }));
            
            // Check if we need to update the user data
            let needsUpdate = false;
            let updateData = {};
            
            // Migrate old data structure to new one if needed
            if (userData && userData.profile?.state && !userData.state) {
              updateData.state = userData.profile.state;
              updateData.updatedAt = serverTimestamp();
              needsUpdate = true;
            }
            
            // Check if uid is missing at root level
            if (userData && !userData.uid) {
              updateData.uid = user.uid;
              needsUpdate = true;
            }
            
            // Check if email is missing in profile
            if (userData && userData.profile && !userData.profile.email && user.email) {
              updateData['profile.email'] = user.email;
              needsUpdate = true;
            }
            
            // Perform the update if needed
            if (needsUpdate) {
              try {
                await updateDoc(userRef, updateData);
              } catch (error) {
                console.error('❌ [UserContext] Error updating user data:', error);
              }
            }
            
            // Check if hautSubjectId exists and not already creating subject
            if (userData && !userData.hautSubjectId && !isCreatingSubject) {
              try {
                isCreatingSubject = true;  // Set flag before creating subject
                
                // Get the full name from profile
                const fullName = userData.profile ? 
                  `${userData.profile.firstName} ${userData.profile.lastName}`.trim() : 
                  'Anonymous User';
                
                if (!fullName.trim()) {
                  isCreatingSubject = false;
                  return;
                }
                
                // Use the new createSubject function
                const { subjectId } = await createSubject(fullName);
                
                await updateDoc(userRef, {
                  hautSubjectId: subjectId
                });
                
              } catch (error) {
                console.error('❌ Error creating Haut subject:', error);
                setState(prev => ({
                  ...prev,
                  error: 'Failed to create Haut subject',
                  loading: false
                }));
              } finally {
                isCreatingSubject = false;
              }
            }
          },
          (error) => {
            console.error('🔴 Profile fetch error:', error);
            setState(prev => ({
              ...prev,
              user,
              error: 'Failed to fetch profile',
              loading: false
            }));
          }
        );
      } else {
        setState({
          user: null,
          profile: null,
          documentState: null,
          createdAt: null,
          userData: null,
          loading: false,
          error: null
        });
        
        if (profileUnsubscribe) {
          profileUnsubscribe();
        }
      }
    });

    return () => {
      unsubscribe();
      if (profileUnsubscribe) {
        profileUnsubscribe();
      }
    };
  }, []);

  // Provide only the necessary state, excluding the removed snapshot state/setter
  const value = {
      user: state.user,
      profile: state.profile,
      documentState: state.documentState,
      createdAt: state.createdAt,
      userData: state.userData,
      loading: state.loading,
      error: state.error,
      updateProfile,
      updateState
  };

  return (
    // Pass the corrected value object
    <UserContext.Provider value={value}>
      {state.loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator size="large" />
        </View>
      ) : (
        children
      )}
    </UserContext.Provider>
  );
}

// Custom hook
export function useUser() {
  const context = useContext(UserContext);
  if (context === undefined) {
    throw new Error('useUser must be used within a UserProvider');
  }
  return context;
}