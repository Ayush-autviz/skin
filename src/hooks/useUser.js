// useUser.js
// Custom hook for accessing user data and methods

import { useState, useEffect } from 'react';
import { doc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../config/firebase';

export function useUser() {
  const [userState, setUserState] = useState('loading');

  const createUserDocument = async (userId) => {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        state: 'onboarding',
        onboardingCompleted: false,
        profile: {
          firstName: '',
          lastName: '',
          birthDate: null
        }
      });
      console.log('✅ Created new user document');
    } catch (error) {
      console.error('🔴 Error creating user document:', error);
      throw error;
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const userId = auth.currentUser?.uid;
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

  const updateState = async (newState) => {
    try {
      const userId = auth.currentUser?.uid;
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

  return {
    userState,
    updateProfile,
    updateState,
  };
} 