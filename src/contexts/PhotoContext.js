// PhotoContext.js
// Context for managing photo state across components

/* ------------------------------------------------------
WHAT IT DOES
- Provides global photo list state management (`photos`, `isLoading`).
- Manages the currently selected snapshot (`selectedSnapshot`).
- Handles photo list refresh triggers.
- Shares photo list loading state.
- Caches photo list in AsyncStorage for faster loading.
- Manages photo list data synchronization with API.

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
import { getUserPhotos } from '../services/newApiService';
import useAuthStore from '../stores/authStore';

const CACHE_KEY = 'PHOTO_CACHE';
const CACHE_TIMESTAMP_KEY = 'PHOTO_CACHE_TIMESTAMP';

const PhotoContext = createContext();

export function PhotoProvider({ children }) {
  // Manual state management instead of React Query
  const [photos, setPhotos] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
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

  // Cache photos helper
  const cachePhotos = useCallback(async (photosToCache) => {
    if (!photosToCache || photosToCache.length === 0) return; // Don't cache empty arrays
    try {
      const timestamp = Date.now();
      await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(photosToCache));
      await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, timestamp.toString());
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error caching photos:', error);
    }
  }, []);

  // Load cached photos helper
  const loadCachedPhotos = useCallback(async () => {
    try {
      const cachedPhotosJson = await AsyncStorage.getItem(CACHE_KEY);
      const cachedTimestamp = await AsyncStorage.getItem(CACHE_TIMESTAMP_KEY);

      if (cachedPhotosJson) {
        const cachedPhotos = JSON.parse(cachedPhotosJson);
        console.log('🔵 PHOTO_CONTEXT: Loaded cached photos:', cachedPhotos.length);
        setPhotos(cachedPhotos);
        setLastUpdated(cachedTimestamp ? new Date(parseInt(cachedTimestamp)) : new Date());
        return cachedPhotos;
      }
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error loading cached photos:', error);
    }
    return null;
  }, []);

  // Main fetch photos function
  const fetchPhotos = useCallback(async (useCache = true) => {
    try {
      setIsLoading(true);
      console.log('🔵 PHOTO_CONTEXT: Fetching photos from API');
      
      // Load cached photos first if requested
      if (useCache) {
        await loadCachedPhotos();
      }
      
      const apiPhotos = await getUserPhotos();
      
      // Sort the photos by timestamp (Oldest to Newest) 
      const sortedPhotos = [...apiPhotos].sort((a, b) => {
        const dateA = new Date(a.timestamp);
        const dateB = new Date(b.timestamp);
        return dateA.getTime() - dateB.getTime(); // Ascending sort (oldest first)
      });
      
      setPhotos(sortedPhotos);
      setLastUpdated(new Date());
      await cachePhotos(sortedPhotos);
      
      console.log('✅ PHOTO_CONTEXT: Photos fetched and sorted successfully:', sortedPhotos.length);
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error fetching photos from API:', error);
    } finally {
      setIsLoading(false);
    }
  }, [loadCachedPhotos, cachePhotos]);

  // Fetch photos when the authenticated user changes (Zustand store)
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) {
      setPhotos([]);
      setLastUpdated(null);
      setSelectedSnapshotWithLogging(null);
      return;
    }

    // Clear previous cache and state when user changes, then fetch
    (async () => {
      await clearCache();
      setSelectedSnapshotWithLogging(null);
      await fetchPhotos(false); // Don't use cache on user change
    })();
  }, [isAuthenticated, user?.user_id, fetchPhotos, setSelectedSnapshotWithLogging]);

  // Load cached photos on initial mount
  const hasFetchedFromApiRef = useRef(false);

  useEffect(() => {
    if (!isAuthenticated || !user?.user_id) return;

    if (!hasFetchedFromApiRef.current) {
      hasFetchedFromApiRef.current = true;
      fetchPhotos(true); // Use cache on initial load
    }
  }, [isAuthenticated, user?.user_id, fetchPhotos]);

  // Refresh photos function - force refresh without cache
  const refreshPhotos = useCallback(() => {
    console.log('🔵 PHOTO_CONTEXT: Refreshing photos...');
    fetchPhotos(false); // Don't use cache when refreshing
  }, [fetchPhotos]);

  // Clear cache function
  const clearCache = useCallback(async () => {
    try {
      await AsyncStorage.removeItem(CACHE_KEY);
      await AsyncStorage.removeItem(CACHE_TIMESTAMP_KEY);
      console.log('🔵 PHOTO_CONTEXT: Cache cleared');
    } catch (error) {
      console.error('🔴 PHOTO_CONTEXT: Error clearing cache:', error);
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