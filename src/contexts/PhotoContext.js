// PhotoContext.js
// Context for managing photo state across components

/* ------------------------------------------------------
WHAT IT DOES
- Provides global photo list state management (`photos`, `isLoading`).
- Manages the currently selected snapshot (`selectedSnapshot`).
- Handles photo list refresh triggers.
- Shares photo list loading state.
- Caches photo list in AsyncStorage for faster loading.
- Manages photo list data synchronization with Firebase.

RESPONSIBILITIES REMOVED (Now in ThreadContext/SnapshotScreen):
- Thread creation and management.
- Loading individual snapshot details (handled by screens using selectedSnapshot.id).

DEV PRINCIPLES
- Uses vanilla JavaScript
- Implements React Context API
- Keeps photo *list* state management centralized
- Uses AsyncStorage for persistent caching
------------------------------------------------------*/



import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
// COMMENTED OUT - Using new API instead of Firebase
// import { onPhotosUpdate } from '../services/FirebasePhotosService';
import { getUserPhotos } from '../services/newApiService';
import useAuthStore from '../stores/authStore';

const CACHE_KEY = 'PHOTO_CACHE';
const CACHE_TIMESTAMP_KEY = 'PHOTO_CACHE_TIMESTAMP';

const PhotoContext = createContext();

export function PhotoProvider({ children }) {
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Loading state for the *list*
  const [lastUpdated, setLastUpdated] = useState(null);
  // COMMENTED OUT - No longer using Firebase listener
  // const [unsubscribePhotosListener, setUnsubscribePhotosListener] = useState(null);

  const [selectedSnapshot, setSelectedSnapshot] = useState(null);

  // --- Logging Helper ---
  const logSnapshot = (location, snapshot) => {
    const snapshotSummary = snapshot
      ? { id: snapshot.id, urlExists: !!snapshot.storageUrl, threadIdExists: !!snapshot.threadId }
      : null;
    // console.log(`[PhotoContext.js] -> ${location} : selectedSnapshot =`, snapshotSummary);
  };

  // --- Wrapped State Setter ---
  const setSelectedSnapshotWithLogging = useCallback((newValueOrFn) => {
    setSelectedSnapshot(currentSnapshot => {
      logSnapshot("setSelectedSnapshot (before)", currentSnapshot);
      const newValue = typeof newValueOrFn === 'function'
        ? newValueOrFn(currentSnapshot)
        : newValueOrFn;
      const newSnapshotSummary = newValue
        ? { id: newValue.id, urlExists: !!newValue.storageUrl, threadIdExists: !!newValue.threadId }
        : null;
      // console.log("[PhotoContext.js] -> setSelectedSnapshot (new value)", newSnapshotSummary);
      // Only update if the ID or presence of URL/threadId actually changes
      // Or if going to/from null
      const currentSummary = currentSnapshot
          ? { id: currentSnapshot.id, urlExists: !!currentSnapshot.storageUrl, threadIdExists: !!currentSnapshot.threadId }
          : null;
      if (JSON.stringify(currentSummary) !== JSON.stringify(newSnapshotSummary)) {
         return newValue;
      }
      // console.log("[PhotoContext.js] -> setSelectedSnapshot : New value identical, skipping state update.");
      return currentSnapshot; // Return current state if no change detected

    });
  }, []); // No dependency needed for useCallback wrapping setter

  // Log when selectedSnapshot actually changes state
  useEffect(() => {
     logSnapshot("useEffect[selectedSnapshot]", selectedSnapshot);
  }, [selectedSnapshot]);

  // Fetch photos when the authenticated user changes (Zustand store)
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) return;

    // Clear previous cache and state when user changes
    (async () => {
      await clearCache();
      setPhotos([]);
      setSelectedSnapshotWithLogging(null);
      setIsLoading(true);
      fetchPhotosFromAPI();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, user?.user_id]);

  // Load cached photos on initial mount
  useEffect(() => {
    // Only load cache if photos haven't been loaded yet (e.g., by listener)
    if (photos.length === 0) {
        loadCachedPhotos();
    }
  }, [photos.length]); // Depend on photos.length

  // COMMENTED OUT - Set up Firebase listener when auth state indicates a logged-in user
  /*
  useEffect(() => {
    const user = auth.currentUser;
    // Only setup listener if user exists AND listener is not already set
    if (user && !unsubscribePhotosListener) {
      setupPhotosListener(user.uid);
    }

    // Cleanup function for this effect
    return () => {
      // The auth listener effect handles cleanup on user change/logout
      // This cleanup is more for component unmount, although PhotoProvider likely lives for app duration
      // if (unsubscribePhotosListener) {
      //   console.log('🔵 PHOTO_CONTEXT: Cleaning up photos listener on effect cleanup');
      //   unsubscribePhotosListener();
      // }
    };
  // Depend on auth.currentUser directly if possible, or a state derived from it
  }, [auth.currentUser, unsubscribePhotosListener]); // Depend on user and listener state
  */

  // NEW - Fetch photos from API
  const hasFetchedFromApiRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) return;

    if (!hasFetchedFromApiRef.current) {
      hasFetchedFromApiRef.current = true;
      fetchPhotosFromAPI();
    }
  }, [isAuthenticated, user?.user_id, fetchPhotosFromAPI]);

  const loadCachedPhotos = useCallback(async () => {
    // Avoid loading cache if already loading or photos exist
    if (isLoading && photos.length === 0) {
        try {
          const cachedPhotosJson = await AsyncStorage.getItem(CACHE_KEY);
          const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

          if (cachedPhotosJson) {
            const cachedPhotos = JSON.parse(cachedPhotosJson);
             // Check again inside async block if photos were loaded by listener in the meantime
             if (photos.length === 0) {
                setPhotos(cachedPhotos);
                setIsLoading(false); // Set loading false only if cache is used

                if (cachedTimestamp) {
                  setLastUpdated(new Date(parseInt(cachedTimestamp)));
                }
             }
          }
        } catch (error) {
          console.error('🔴 PHOTO_CONTEXT: Error loading cached photos:', error);
          // Don't set isLoading false here either
        }
    }
  }, [isLoading, photos.length]); // Dependencies for useCallback

  const cachePhotos = useCallback(async (photosToCache) => {
    if (!photosToCache || photosToCache.length === 0) return; // Don't cache empty arrays
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(photosToCache));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
      setLastUpdated(new Date(timestamp));

    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error caching photos:', error);
    }
  }, []); // No dependencies needed

  // COMMENTED OUT - Using new API instead of Firebase listener
  /*
  const setupPhotosListener = useCallback((userId) => {
    // Prevent setting up multiple listeners
    if (unsubscribePhotosListener) {
        return;
    }

    const requiredFields = ['id', 'timestamp', 'storageUrl', 'metrics'];
    const requiredNestedFields = {
        // Support both old and new field names for backward compatibility
        hautUploadData: ['imageId'],
        hauteUploadData: ['imageId']
    };

    try {
      setIsLoading(true); // Set loading true when starting listener setup
      const listener = onPhotosUpdate(userId, (updatedPhotos) => {
        let filteredPhotos = [];
        let sortedPhotos = []; // Array for sorted photos

        if (updatedPhotos === null || updatedPhotos === undefined) { // Check for null/undefined specifically
          console.log('🔴 PHOTO_CONTEXT: No photos data received from listener (or error occurred).');
          // No filtering needed, already empty
        } else {
          filteredPhotos = updatedPhotos.filter(photo => {
            // Check top-level required fields
            const hasAllTopLevel = requiredFields.every(field => 
                photo.hasOwnProperty(field) && photo[field] !== null && photo[field] !== undefined
            );
            if (!hasAllTopLevel) {
                //  console.log(`[PhotoContext Filter] Skipping photo ${photo.id || '(no id)'}: Missing top-level field.`);
                 return false;
            }

            // Check specific type for metrics
            if (typeof photo.metrics !== 'object' || photo.metrics === null) {
                // console.log(`[PhotoContext Filter] Skipping photo ${photo.id}: metrics is not a non-null object.`);
                return false;
            }
            
            // Check specific type for hautUploadData or hauteUploadData (backward compatibility)
            const hasHautUpload = typeof photo.hautUploadData === 'object' && photo.hautUploadData !== null;
            const hasHauteUpload = typeof photo.hauteUploadData === 'object' && photo.hauteUploadData !== null;
            
            if (!hasHautUpload && !hasHauteUpload) {
                // console.log(`[PhotoContext Filter] Skipping photo ${photo.id}: neither hautUploadData nor hauteUploadData is a non-null object.`);
                return false;
            }

            // Check nested required fields - support both hautUploadData and hauteUploadData
            // We need at least ONE of the upload data fields to be valid
            const hasValidHautUpload = photo.hasOwnProperty('hautUploadData') && 
                typeof photo.hautUploadData === 'object' && 
                photo.hautUploadData !== null &&
                requiredNestedFields.hautUploadData.every(nestedField =>
                  photo.hautUploadData.hasOwnProperty(nestedField) && 
                  photo.hautUploadData[nestedField] !== null && 
                  photo.hautUploadData[nestedField] !== undefined
                );
                
            const hasValidHauteUpload = photo.hasOwnProperty('hauteUploadData') && 
                typeof photo.hauteUploadData === 'object' && 
                photo.hauteUploadData !== null &&
                requiredNestedFields.hauteUploadData.every(nestedField =>
                  photo.hauteUploadData.hasOwnProperty(nestedField) && 
                  photo.hauteUploadData[nestedField] !== null && 
                  photo.hauteUploadData[nestedField] !== undefined
                );
                
            const hasAllNested = hasValidHautUpload || hasValidHauteUpload;
            
             if (!hasAllNested) {
                 // console.log(`[PhotoContext Filter] Skipping photo ${photo.id}: Missing nested field.`);
                 return false;
             }

            // Check if timestamp is valid for sorting
            const timestamp = photo.timestamp;
            const isValidTimestamp = timestamp && 
                                   ((timestamp.seconds && typeof timestamp.seconds === 'number') || 
                                    (!(timestamp.seconds) && !isNaN(new Date(timestamp).getTime())));
            if (!isValidTimestamp) {
                // console.log(`[PhotoContext Filter] Skipping photo ${photo.id}: Invalid or missing timestamp.`);
                return false;
            }

            // If all checks pass
            return true;
          });

          // Sort the filtered photos by timestamp (Oldest to Newest)
          sortedPhotos = [...filteredPhotos].sort((a, b) => {
            // Convert both timestamps to JS Date objects consistently
            let dateA, dateB;
            const tsA = a.timestamp;
            const tsB = b.timestamp;

            if (tsA?.seconds && typeof tsA.seconds === 'number') { dateA = new Date(tsA.seconds * 1000 + (tsA.nanoseconds ? tsA.nanoseconds / 1000000 : 0)); } 
            else if (tsA instanceof Date) { dateA = tsA; } 
            else { dateA = new Date(tsA); }

            if (tsB?.seconds && typeof tsB.seconds === 'number') { dateB = new Date(tsB.seconds * 1000 + (tsB.nanoseconds ? tsB.nanoseconds / 1000000 : 0)); } 
            else if (tsB instanceof Date) { dateB = tsB; } 
            else { dateB = new Date(tsB); }

            // Explicit comparison using getTime() after filtering ensures valid dates
            const timeA = dateA.getTime();
            const timeB = dateB.getTime();

            // Handle potential NaN cases (though filter should prevent this)
            if (isNaN(timeA) || isNaN(timeB)) {
              // console.warn(`[PhotoContext Sort] Encountered NaN during sort: ${a.id} vs ${b.id}`);
              return 0; // Treat as equal if invalid
            }
            
            return timeA - timeB; // Ascending sort (oldest first)
          });
        }
        
        // Use the SORTED and filtered list
        setPhotos(sortedPhotos);
        cachePhotos(sortedPhotos); // Cache the sorted photos
        
        // Always set loading to false once the first update (or error) is received
        setIsLoading(false);
      });

      setUnsubscribePhotosListener(() => listener); // Store the unsubscribe function
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error setting up photos listener:', error);
      setIsLoading(false); // Set loading false on error
    }
  }, [cachePhotos, unsubscribePhotosListener]); // Include dependencies
  */

  // NEW - Fetch photos from API
  const fetchPhotosFromAPI = useCallback(async () => {
    try {
      setIsLoading(true);
      console.log('🔵 PHOTO_CONTEXT: Fetching photos from API');
      
      const apiPhotos = await getUserPhotos();
      
      // Sort the photos by timestamp (Oldest to Newest) 
      const sortedPhotos = [...apiPhotos].sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime(); // Ascending sort (oldest first)
      });
      
      setPhotos(sortedPhotos);
      cachePhotos(sortedPhotos); // Cache the sorted photos
      setIsLoading(false);
      
      console.log('✅ PHOTO_CONTEXT: Photos fetched and sorted successfully:', sortedPhotos.length);
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error fetching photos from API:', error);
      setIsLoading(false);
      // Don't throw error, just log and set loading to false
    }
  }, [cachePhotos]);

  const refreshPhotos = useCallback(() => {
    if (!isAuthenticated || !user?.user_id) {
      setIsLoading(false);
      return;
    }

    fetchPhotosFromAPI();
  }, [isAuthenticated, user?.user_id, fetchPhotosFromAPI]);

  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      // console.log('🧹 PHOTO_CONTEXT: Cache cleared');
    } catch (error) {
      console.error('❌ PHOTO_CONTEXT: Error clearing cache:', error);
    }
  }, []);

  // Define the value provided by the context
  const value = {
    photos,
    isLoading,
    refreshPhotos,
    lastUpdated,
    clearCache,
    selectedSnapshot,     // Provide the selected snapshot state
    setSelectedSnapshot: setSelectedSnapshotWithLogging,  // Provide the logging setter
  };

  return <PhotoContext.Provider value={value}>{children}</PhotoContext.Provider>;
}

export const usePhotoContext = () => {
    const context = useContext(PhotoContext);
    if (context === undefined) {
        throw new Error('usePhotoContext must be used within a PhotoProvider');
    }
    // Optional: Log consumption
    // const snapshotId = context.selectedSnapshot?.id;
    // console.log(`[PhotoContext.js] -> usePhotoContext : Consuming context (Snapshot ID: ${snapshotId ?? 'null'})`);
    return context;
}; 