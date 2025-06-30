// storageUtils.js
// Utility functions for Firebase Storage operations

/* ------------------------------------------------------
WHAT IT DOES
- Handles photo uploads to Firebase Storage
- Manages photo deletions
- Provides helper functions for storage operations

DATA USED
- photo: File or Blob to be uploaded
- userId: Current user's ID from Firebase Auth
- photoId: Unique identifier for each photo

DEV PRINCIPLES
- Uses vanilla JavaScript
- Implements proper error handling
- Provides upload progress tracking
- Maintains consistent file structure in storage

NEXT STEPS
[ ] Add batch upload functionality
[ ] Implement file compression
[ ] Add metadata handling
------------------------------------------------------*/

import { storage } from '../config/firebase';
import { ref, uploadBytes, deleteObject, getDownloadURL } from 'firebase/storage';

export const uploadPhoto = async (photo, userId, progressCallback = null) => {
  try {
    // Generate a unique filename using timestamp
    const filename = `${Date.now()}.jpg`;
    const storageRef = ref(storage, `users/${userId}/photos/${filename}`);

    // Upload the photo
    const response = await uploadBytes(storageRef, photo);
    
    // Get the download URL
    const downloadURL = await getDownloadURL(response.ref);

    return {
      id: filename,
      url: downloadURL
    };
  } catch (error) {
    console.error('Error uploading photo:', error);
    throw new Error('Failed to upload photo');
  }
};

export const deletePhoto = async (photoId, userId) => {
  try {
    const photoRef = ref(storage, `users/${userId}/photos/${photoId}`);
    await deleteObject(photoRef);
  } catch (error) {
    console.error('Error deleting photo:', error);
    throw new Error('Failed to delete photo');
  }
};

export const getPhotoUrl = async (photoId, userId) => {
  try {
    const photoRef = ref(storage, `users/${userId}/photos/${photoId}`);
    return await getDownloadURL(photoRef);
  } catch (error) {
    console.error('Error getting photo URL:', error);
    throw new Error('Failed to get photo URL');
  }
}; 