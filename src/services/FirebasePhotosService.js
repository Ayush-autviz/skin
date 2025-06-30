// FirebasePhotosService.js
// Handles all photo-related Firebase operations including storage, analysis tracking, and real-time updates

import { auth, db, storage, rtdb } from '../config/firebase';
import {
  doc, getDoc, setDoc, updateDoc, serverTimestamp,
  collection, onSnapshot, query, orderBy, deleteDoc, limit, where, getDocs
} from 'firebase/firestore';
import { ref as storageRef, deleteObject } from 'firebase/storage';
import { ref as databaseRef, push } from 'firebase/database';

// Photo Functions
export async function createPhotoDocument(userId, photoId, storageUrl) {
  const photoRef = doc(db, 'users', userId, 'photos', photoId);
  const photoData = {
    storageUrl,
    status: {
      state: 'new',
      lastUpdated: new Date()
    },
    timestamp: serverTimestamp(),
    createdAt: new Date()
  };

  try {
    await setDoc(photoRef, photoData);
    return true;
  } catch (error) {
    console.error('🔴 FIREBASE ERROR:', error.message);
    throw error;
  }
}

export const getPhotoData = async (photoId) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const cleanPhotoId = photoId.replace('.jpg', '');
  const photoDoc = await getDoc(doc(db, 'users', userId, 'photos', cleanPhotoId));
  
  if (!photoDoc.exists()) {
    throw new Error('Photo not found');
  }
  return photoDoc.data();
};

export function onPhotosUpdate(userId, callback) {
  const photosRef = collection(db, `users/${userId}/photos`);
  const photosQuery = query(photosRef, orderBy('createdAt', 'desc'));
  
  return onSnapshot(photosQuery, (snapshot) => {
    const photos = [];
    snapshot.forEach((doc) => {
      photos.push({
        id: doc.id,
        ...doc.data()
      });
    });
    
    callback(photos);
  }, (error) => {
    console.error('🔴 FIREBASE: Photos listener error:', error);
  });
}

export const getSnapshot = async (userId, photoId) => {
  try {
    const photoDoc = await getDoc(doc(db, 'users', userId, 'photos', photoId));
    
    if (!photoDoc.exists()) {
      return null;
    }

    const data = photoDoc.data();

    return {
      id: photoId,  // add id to the data
      ...data
    };
  } catch (error) {
    console.error('🔴 Error getting snapshot:', error);
    throw error;
  }
}

export const updatePhotoDocument = async (userId, photoId, data) => {
  const photoRef = doc(db, 'users', userId, 'photos', photoId);
  await updateDoc(photoRef, data);
}

/**
 * Retry analysis for a photo
 * @param {string} userId - The user ID
 * @param {string} photoId - The photo ID
 * @param {string} batchId - The batch ID from the original analysis
 * @returns {Promise<void>}
 */
export const retryPhotoAnalysis = async (userId, photoId, batchId) => {
  try {
    // 1. Update photo status to analyzing
    await updatePhotoDocument(userId, photoId, {
      status: {
        state: 'analyzing',
        lastUpdated: serverTimestamp()
      }
    });
    
    // 2. Add to analysis queue in Realtime Database with better error handling
    try {
      if (!rtdb) {
        console.error('🔴 [FirebasePhotosService] RTDB instance is null');
        throw new Error('RTDB instance is null');
      }
      
      const queueRef = databaseRef(rtdb, 'analysisQueue');
      
      const result = await push(queueRef, {
        userId,
        photoId,
        batchId,
        timestamp: Date.now(),
        skipUpload: true // Signal to backend that this is a retry
      });
      
      return true;
    } catch (dbError) {
      console.error('🔴 [FirebasePhotosService] Database error:', dbError);
      return true;
    }
  } catch (error) {
    console.error('🔴 [FirebasePhotosService] Error retrying analysis:', error);
    throw error;
  }
}

export const deletePhoto = async (userId, photoId) => {
  try {
    // Delete from storage
    const photoStorageRef = storageRef(storage, `users/${userId}/photos/${photoId}`);
    await deleteObject(photoStorageRef);
    
    // Delete from Firestore
    const photoDocRef = doc(db, 'users', userId, 'photos', photoId);
    await deleteDoc(photoDocRef);
    
    return true;
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw error;
  }
} 

export const getLatestPhotos = async (numPhotos) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  const photosRef = collection(db, `users/${userId}/photos`);
  const photosQuery = query(photosRef, orderBy('createdAt', 'desc'), limit(numPhotos)); 

  const photosSnap = await getDocs(photosQuery);
  const photos = photosSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  return photos;
}

/**
 * Get latest photos that have completed analysis
 * @param {number} numPhotos Number of photos to fetch
 * @returns {Promise<Array>} Array of completed photo documents with metrics
 */
export const getLatestCompletedPhotos = async (numPhotos = 5) => {
  const userId = auth.currentUser?.uid;
  if (!userId) throw new Error('User not authenticated');

  // console.log('🔵 FIREBASE: Getting latest completed photos...');
  
  try {
    const photosRef = collection(db, `users/${userId}/photos`);
    const photosQuery = query(
      photosRef,
      where('status.state', '==', 'complete'),
      orderBy('createdAt', 'desc'),
      limit(numPhotos)
    );

    const photosSnap = await getDocs(photosQuery);
    const photos = photosSnap.docs.map(doc => ({ 
      id: doc.id, 
      ...doc.data() 
    }));

    // console.log(`✅ FIREBASE: Got ${photos.length} completed photos with metrics`);
    return photos;
  } catch (error) {
    console.error('🔴 FIREBASE: Error getting completed photos:', error);
    throw error;
  }
};

/**
 * Get photo analysis status (migrated from firebase-DEPRECATE.js)
 * @param {string} photoId - Photo ID
 * @returns {Promise<{analyzed: boolean, analyzing: boolean}>}
 */
export const getPhotoStatus = async (photoId) => {
  if (!photoId || typeof photoId !== 'string') {
    console.warn('Invalid photoId provided:', photoId);
    return { analyzed: false, analyzing: false };
  }

  try {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      throw new Error('User not authenticated');
    }

    const photoDoc = await getDoc(doc(db, 'users', userId, 'photos', photoId));
    
    if (!photoDoc.exists()) {
      return { analyzed: false, analyzing: false };
    }
    
    const data = photoDoc.data();
    return {
      analyzed: data.analyzed || false,
      analyzing: data.analyzing || false
    };
  } catch (error) {
    console.error('Error fetching photo status:', error);
    return { analyzed: false, analyzing: false };
  }
};

// Export all functions as a service object
export const firebasePhotosService = {
  createPhotoDocument,
  getPhotoData,
  getPhotoStatus,
  onPhotosUpdate,
  getSnapshot,
  updatePhotoDocument,
  retryPhotoAnalysis,
  deletePhoto,
  getLatestPhotos,
  getLatestCompletedPhotos,
};