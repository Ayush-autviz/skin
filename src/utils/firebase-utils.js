// firebase-utils.js
// Shared utilities for Firebase services

import { getFunctions, httpsCallable } from "firebase/functions";

// Helper function for simple ID generation
export const generateSimpleId = (prefix = 'item') => {
  const timestamp = Date.now();
  const randomSuffix = Math.random().toString(36).substring(2, 8); // 6 random chars
  return `${prefix}-${timestamp}-${randomSuffix}`;
};

// Recommended Ingredients Function (Calls Backend)
export const getRecommendedIngredients = async () => {
  try {
    console.log('🔵 FIREBASE SERVICE: Calling getRecommendations backend function...');
    const getRecommendationsFunc = httpsCallable(getFunctions(), 'getRecommendations');
    const result = await getRecommendationsFunc();
    console.log('✅ FIREBASE SERVICE: Received recommendations:', result.data);
    return result.data;
  } catch (error) {
    console.error('🔴 FIREBASE SERVICE: Error getting recommendations:', error);
    throw error;
  }
};

// Export all utilities as a service object
export const firebaseUtils = {
  generateSimpleId,
  getRecommendedIngredients,
};