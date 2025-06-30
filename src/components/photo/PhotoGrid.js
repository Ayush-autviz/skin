// PhotoGrid.js
// React Native component for displaying a grid of photos from Firebase Storage

/* ------------------------------------------------------
WHAT IT DOES
- Displays user's photos in a grid layout using FlatList
- Handles loading and error states
- Shows placeholder when no photos are available
- Shows analysis status for each photo
- Supports pull-to-refresh for manual updates
- Displays last updated timestamp

DATA USED
- photos[]: Array of photo objects from Firebase Storage
  {
    id: String,
    url: String,
    analyzed: Boolean,
    analyzing: Boolean
  }
- onRefresh: Function to trigger photo refresh
- lastUpdated: Timestamp of last photo update

IMPORTANT:
- the desired behavior is to have the grid display the photos in  chronological order (NEWEST AT BOTTOM - AUTO SCROLL TO BOTTOM)
- theis is continually being broken and refixed
- NOTE WHAT'S TOING ON HERE:
...


------------------------------------------------------*/

import { useState, useEffect, useRef } from 'react';
import { 
  View, 
  FlatList, 
  Image, 
  ActivityIndicator, 
  Text, 
  StyleSheet,
  Dimensions,
  RefreshControl,
  TouchableOpacity
} from 'react-native';
import { usePhotoContext } from '../../contexts/PhotoContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { getPhotoStatus } from '../../services/FirebasePhotosService';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image'; // Much better performance than RN Image
import { useUser } from '../../contexts/UserContext';

const PhotoGrid = ({ photos, onRefresh, lastUpdated }) => {
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);
  const [inverted, setInverted] = useState(true); // Control inversion state
  const [initialScrollDone, setInitialScrollDone] = useState(false); // Track initial scroll
  const previousPhotoCount = useRef(photos?.length || 0);
  const router = useRouter();
  const { setSelectedSnapshot } = usePhotoContext();
  const user = useUser();

  // Prepare data - Reverse context data (newest-first) to get oldest-first for standard list
  // const preparedData = [...photos].reverse(); // REMOVED - Use photos directly (already Oldest -> Newest)

  // Scroll handling for new photos - Offset scroll effect commented out
  /*
  useEffect(() => {
    if (flatListRef.current && photos.length > 0) {
      flatListRef.current.scrollToOffset({ offset: 0, animated: true });
    }
  }, [photos.length]);
  */

  // Only scroll when new photos are added (scrollToEnd should work for non-inverted)
  useEffect(() => {
    const currentPhotoCount = photos?.length || 0;
    
    // --- Initial Scroll Logic --- 
    if (currentPhotoCount > 0 && !initialScrollDone) {
      // Use timeout to ensure layout is complete before scrolling
      const timer = setTimeout(() => {
        if (flatListRef.current) {
          flatListRef.current.scrollToEnd({ animated: false });
        }
        setInitialScrollDone(true);
      }, 300);
      return () => clearTimeout(timer);
    }
    // --- End Initial Scroll Logic ---

    // --- Scroll on New Photo Additions (after initial) ---
    if (initialScrollDone && currentPhotoCount > previousPhotoCount.current) {
      const timer = setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
      
      return () => clearTimeout(timer);
    }
    // --- End Scroll on New --- 
    
    previousPhotoCount.current = currentPhotoCount;
  // Depend on length AND the initialScrollDone flag
  }, [photos?.length, initialScrollDone]);


  // TEMPORARILY DISABLED - DO NOT DELETE
  // const handleRefresh = async () => {
  //   setRefreshing(true);
  //   if (onRefresh) {
  //     await onRefresh();
  //   }
  //   setRefreshing(false);
  // };

  const handlePhotoPress = (photo) => {
    const photoId = photo.id.replace('.jpg', ''); // Extract ID
    
    // Store the photo in context with all required fields
    setSelectedSnapshot({
      id: photoId, // Use extracted ID
      url: photo.storageUrl,
      storageUrl: photo.storageUrl,
      threadId: photo.threadId
    });

    // Navigate WITH the required photoId param AND the thumbnailUrl
    // We don't have localUri here, so loading background will be gray
    router.push({ 
        pathname: '/snapshot', 
        params: { photoId, thumbnailUrl: photo.storageUrl } // Pass photoId and thumbnailUrl
    });

    /* // Old navigation method - removed
    router.push('/snapshot', {
      presentation: 'modal'
    });
    */
  };

  const formatLastUpdated = (timestamp) => {
    if (!timestamp) return '';
    
    const now = new Date();
    const diff = now - timestamp;
    
    // Less than a minute
    if (diff < 60000) {
      return 'Just now';
    }
    
    // Less than an hour
    if (diff < 3600000) {
      const minutes = Math.floor(diff / 60000);
      return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'} ago`;
    }
    
    // Less than a day
    if (diff < 86400000) {
      const hours = Math.floor(diff / 3600000);
      return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`;
    }
    
    // Format as date
    return timestamp.toLocaleDateString();
  };

  if (!photos) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  if (photos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyText}>No photos yet</Text>
      </View>
    );
  }

  const getQualityInfo = (metrics) => {
    if (!metrics?.imageQuality?.overall) return { color: '#666666' }; // Gray for no data
    const score = metrics.imageQuality.overall;
    if (score <= 50) return { color: '#FF4D4F' };  // Red for poor
    if (score <= 75) return { color: '#FAAD14' };  // Yellow for ok
    return { color: '#52C41A' };                   // Green for good
  };

  const renderItem = ({ item }) => {
    const qualityInfo = getQualityInfo(item.metrics);
    const imageUrl = item.storageUrl;

    return (
      <TouchableOpacity 
        style={styles.photoContainer} 
        onPress={() => handlePhotoPress(item)}
      >
        <View style={styles.photoWrapper}>
          <ExpoImage 
            source={imageUrl}
            style={styles.photo}
            contentFit="cover"
            cachePolicy="memory-disk"
            memoryCachePolicy="memory-only"
            priority="high"
          />
          {/* Temporarily commented out quality dot */}
          {/* {item.metrics && (
            <View 
              style={[
                styles.qualityDot,
                { backgroundColor: qualityInfo.color }
              ]} 
            />
          )} */}
        </View>
      </TouchableOpacity>
    );
  };



  return (
    <View style={styles.gridContainer}>
      {lastUpdated && (
        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedText}>
            Last updated: {formatLastUpdated(lastUpdated)}
          </Text>
        </View>
      )}
      <FlatList
        ref={flatListRef}
        data={photos} // Use photos directly (Oldest -> Newest)
        renderItem={renderItem}
        keyExtractor={item => item.id}
        numColumns={2}
        style={styles.list}
        contentContainerStyle={styles.grid}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            // onRefresh={handleRefresh} // TEMPORARILY DISABLED - DO NOT DELETE
            progressViewOffset={80}
          />
        }
        removeClippedSubviews={true}
        initialNumToRender={12}
        maxToRenderPerBatch={9}
        windowSize={21}
        getItemLayout={(data, index) => ({
          length: photoSize,
          offset: photoSize * Math.floor(index / 2),
          index,
        })}
        onEndReachedThreshold={0.5}
        onEndReached={() => {
          // Implement pagination here if needed
        }}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');
const photoSize = width / 2 - 2;

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    padding: 1,
    flexGrow: 1,
    paddingTop: 64,
    paddingBottom: 100,
  },

  gridContainer: {
    flex: 1,
    backgroundColor: '#eeeeee',
  },

  list: {
    flex: 1,
  },
  
  photoContainer: {
    flex: 1/2,
    aspectRatio: 1,
    padding: 1,
    backgroundColor: "#f6f6f6",
  },
  photoWrapper: {
    width: '100%',
    height: '100%',
    backgroundColor: '#f0f0f0',
  },
  photo: {
    width: '100%',
    height: '100%',
  },

  unanalyzed: {
    opacity: 0.8,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 16,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
  },
  statusOverlay: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 16,
    padding: 4,
  },
  qualityDot: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    borderWidth: .5,
    borderColor: '#aaaaaa',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },  
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  lastUpdatedContainer: {
    padding: 8,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
    alignItems: 'center',
  },
  lastUpdatedText: {
    fontSize: 12,
    color: '#888888',
  },
});

const getPhotoAnalysisStatus = async (photoId) => {
  try {
    return await getPhotoStatus(photoId);
  } catch (error) {
    console.error('Error fetching photo status:', error);
    return { analyzed: false, analyzing: false };
  }
};

export default PhotoGrid; 