// FirebaseUserService.js
// Manages user profile data and routine management within the user document

import { db } from '../config/firebase';
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  arrayUnion, arrayRemove, deleteField, Timestamp
} from 'firebase/firestore';
import { generateSimpleId } from '../utils/firebase-utils';

// User Profile Functions
export const createProfile = async (uid, email) => {
  try {
  const userDoc = {
    profile: {
      firstName: '',
      lastName: '',
      email: email,
      birthDate: null
    },
    uid: uid,
    state: 'onboarding',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  };

  await setDoc(doc(db, 'users', uid), userDoc);
  return;

  } catch (error) {
    console.error('🔴 FIREBASE: Error creating profile:', error);
    throw error;
  }
};

export const getProfile = async (uid) => {
  const userDoc = await getDoc(doc(db, 'users', uid));
  if (!userDoc.exists()) {
    throw new Error('Profile not found');
  }
  return userDoc.data().profile;
};

export const updateProfile = async (uid, profileData) => {
  if (!uid || !profileData) {
    console.error('🔴 FIREBASE: Missing parameters:', { uid, profileData });
    throw new Error('Missing required parameters for profile update');
  }

  try {
    const userRef = doc(db, 'users', uid);
    const updates = Object.entries(profileData).reduce((acc, [key, value]) => {
      acc[`profile.${key}`] = value;
      return acc;
    }, {});

    updates.updatedAt = serverTimestamp();
    await updateDoc(userRef, updates);
  } catch (error) {
    console.error('🔴 FIREBASE ERROR:', error.message);
    throw error;
  }
};

// === Routine Management Functions ===

/**
 * Adds a new item to the user's routine array within the profile.
 * dateStarted is optional; defaults to client timestamp if not provided.
 * Uses client-side timestamps for dateCreated/dateModified due to array update limitations.
 * @param {string} userId - The ID of the user.
 * @param {object} newItemData - The data for the new routine item.
 */
export const addRoutineItem = async (userId, newItemData) => {
  console.log('🔵 FIREBASE SERVICE: Adding routine item (Read-Modify-Write):', { userId, newItemData });
  if (!userId || !newItemData || !newItemData.name) { 
    throw new Error('User ID and item name are required for new routine item.');
  }
  
  const userRef = doc(db, 'users', userId);
  const itemId = generateSimpleId(newItemData.type?.toLowerCase() || 'item');
  const now = new Date(); // Use client-side time now
  
  // Handle optional dateStarted - use client time if not provided or invalid
  let startDate = now; // Default to client-side now
  if (newItemData.dateStarted) {
    try {
      const parsedDate = new Date(newItemData.dateStarted);
      if (!isNaN(parsedDate.getTime())) {
          startDate = parsedDate; // Use valid provided date
      }
    } catch (e) { 
      console.warn('Invalid dateStarted format provided, defaulting to client timestamp.', e);
      // Keep default client timestamp (now)
    }
  }
  
  const itemToAdd = {
    ...newItemData,
    id: itemId,
    // Use client-side Timestamps for array update compatibility
    dateCreated: Timestamp.fromDate(now),
    dateModified: Timestamp.fromDate(now),
    dateStarted: Timestamp.fromDate(startDate), 
    dateStopped: null               
  };

  try {
    // Read-Modify-Write pattern
    const userDocSnap = await getDoc(userRef);
    if (!userDocSnap.exists()) {
      throw new Error('User document not found.');
    }
    const currentData = userDocSnap.data();
    const currentRoutine = currentData.profile?.routine || [];
    
    // Append the new item
    const newRoutine = [...currentRoutine, itemToAdd];

    // Update the entire array
    await updateDoc(userRef, {
      'profile.routine': newRoutine
    });

    console.log('✅ FIREBASE SERVICE: Routine item added (Read-Modify-Write):', itemId);
    // Return the item we added (which already has client dates)
    return itemToAdd; 

  } catch (error) { 
    console.error('🔴 FIREBASE SERVICE: Error adding routine item (Read-Modify-Write):', error);
    throw error;
  }
};

/**
 * Updates an existing item in the user's profile.routine array.
 * @param {string} userId - The ID of the user.
 * @param {object} updatedItem - The routine item object with updated data (must include the correct id).
 */
export async function updateRoutineItem(userId, updatedItem) {
  try {
    // console.log('[FirebaseUserService] updateRoutineItem called', { userId, updatedItem });
    
    // Get user doc reference
    const userRef = doc(db, 'users', userId);
    
    // Get current user data
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User document not found');
    }

    // Get current routine array from profile.routine
    const currentRoutine = userDoc.data()?.profile?.routine || [];
    // console.log('[FirebaseUserService] Current routine:', currentRoutine);
    
    // Find index of item to update
    const itemIndex = currentRoutine.findIndex(item => item.id === updatedItem.id);
    if (itemIndex === -1) {
      throw new Error('Routine item not found');
    }

    // Create new array with updated item - use client-side Timestamp
    const now = new Date();
    const newRoutine = [...currentRoutine];
    newRoutine[itemIndex] = {
      ...currentRoutine[itemIndex],
      ...updatedItem,
      dateModified: Timestamp.fromDate(now) // Use client-side timestamp
    };

    // Update the document with the new routine array in profile.routine
    await updateDoc(userRef, {
      'profile.routine': newRoutine
    });

    //console.log('[FirebaseUserService] Successfully updated routine item');
    return true;

  } catch (error) {
    console.error('[FirebaseUserService] Error updating routine item in profile.routine:', error);
    throw error;
  }
}

/**
 * Deletes an item from the user's profile.routine array by its ID.
 * @param {string} userId - The ID of the user.
 * @param {string} itemIdToDelete - The ID of the routine item to delete.
 */
export const deleteRoutineItem = async (userId, itemIdToDelete) => {
  // console.log('🔵 FIREBASE SERVICE: Deleting profile.routine item:', itemIdToDelete, 'for user:', userId);
  if (!userId || !itemIdToDelete) {
    throw new Error('User ID and item ID to delete are required.');
  }
  try {
    const userRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      throw new Error('User document not found.');
    }

    const profile = userDoc.data()?.profile || {};
    const routine = profile.routine || [];
    const itemToDelete = routine.find(item => item.id === itemIdToDelete);

    if (!itemToDelete) {
      console.warn('⚠️ FIREBASE SERVICE: profile.routine item not found to delete:', itemIdToDelete);
      return; // Item already gone or never existed
    }

    // Remove from the nested array
    await updateDoc(userRef, {
      'profile.routine': arrayRemove(itemToDelete)
    });

    console.log('✅ FIREBASE SERVICE: Routine item deleted from profile.routine:', itemIdToDelete);
  } catch (error) {
    console.error('🔴 FIREBASE SERVICE: Error deleting profile.routine item:', error);
    throw error;
  }
};

/**
 * Removes the pendingAddItem field from a specific thread document.
 * @param {string} userId The ID of the user.
 * @param {string} threadId The ID of the thread.
 * @returns {Promise<{success: boolean}>}
 */
export async function clearPendingAddItem(userId, threadId, itemData = null) {
  // console.log('🔵 FIREBASE SERVICE: Clearing pendingAddItem for thread:', threadId);
  if (!userId || !threadId) {
    throw new Error('User ID and Thread ID are required to clear pending item.');
  }

  const threadRef = doc(db, 'users', userId, 'threads', threadId);

  try {
    // If no itemData provided, read the current pendingAddItem
    let pendingData = itemData;
    if (!pendingData) {
      const threadDoc = await getDoc(threadRef);
      pendingData = threadDoc.exists() ? threadDoc.data().pendingAddItem : null;
    }

    // Only add continuation message if there's item data (user confirmed, not cancelled)
    const updates = {
      pendingAddItem: deleteField(),
      updatedAt: Timestamp.fromDate(new Date())
    };

    if (pendingData) {
      // Create continuation message to prevent AI repetition
      const continuationMessage = {
        role: 'assistant',
        content: `Perfect! I've added ${pendingData.name || 'the item'} to your ${pendingData.usage?.toLowerCase() || ''} routine. Is there anything else you'd like help with today?`,
        timestamp: Timestamp.fromDate(new Date()),
        itemProcessed: true // Flag to indicate this is a post-processing message
      };

      updates.messages = arrayUnion(continuationMessage);
      updates['status.state'] = 'active';
    }

    await updateDoc(threadRef, updates);
    // console.log('✅ FIREBASE SERVICE: pendingAddItem cleared' + (pendingData ? ' and continuation message added' : '') + ' for thread:', threadId);
    return { success: true };
  } catch (error) {
    // Log error but don't necessarily throw if the field might already be gone
    if (error.code === 'not-found') {
      console.warn('⚠️ FIREBASE SERVICE: Thread not found while trying to clear pendingAddItem:', threadId);
    } else {
      console.error('🔴 FIREBASE SERVICE: Error clearing pendingAddItem field:', error);
    }
    // Indicate failure, but maybe the UI can still proceed
    return { success: false, error: error }; 
  }
}

// Export all functions as a service object
export const firebaseUserService = {
  // Profile functions
  createProfile,
  getProfile,
  updateProfile,
  
  // Routine functions
  addRoutineItem,
  updateRoutineItem,
  deleteRoutineItem,
  
  // Thread integration
  clearPendingAddItem,
};