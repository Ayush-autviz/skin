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

DATA USED - UPDATED TO USE NEW API
- photos[]: Array of photo objects from new API endpoint (not Firebase)
  {
    id: String (image_id from API),
    storageUrl: String (front_image from API),
    timestamp: Date,
    analyzed: Boolean,
    analyzing: Boolean,
    apiData: Object (original API response)
  }
- onRefresh: Function to trigger photo refresh
- lastUpdated: Timestamp of last photo update

IMPORTANT:
- the desired behavior is to have the grid display the photos in  chronological order (NEWEST AT BOTTOM - AUTO SCROLL TO BOTTOM)
- theis is continually being broken and refixed
- NOW USING NEW API ENDPOINT: /api/v1/haut_process/?user_id={userId}
- API data is transformed in apiService.getUserPhotos() to match expected format

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
  TouchableOpacity,
  SectionList
} from 'react-native';
import { usePhotoContext } from '../../contexts/PhotoContext';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useRouter } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import { Image as ExpoImage } from 'expo-image'; // Much better performance than RN Image
import useAuthStore from '../../stores/authStore';
import { format } from 'date-fns';
import { colors } from '../../styles';


const PhotoGrid = ({ photos, onRefresh, lastUpdated, onLoadMore, isLoadingMore, hasMore, isLoading }) => {
  const [refreshing, setRefreshing] = useState(false);
  const flatListRef = useRef(null);
  const [inverted, setInverted] = useState(true); // Control inversion state
  const [initialScrollDone, setInitialScrollDone] = useState(false); // Track initial scroll
  const previousPhotoCount = useRef(photos?.length || 0);
  const router = useRouter();
  const { setSelectedSnapshot } = usePhotoContext();
  const { user } = useAuthStore();

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

  console.log('🔵 photos from PhotoGrid:', photos);

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

  // Handle end reached for infinite scrolling
  const handleEndReached = () => {
    if (hasMore && !isLoadingMore && onLoadMore) {
      onLoadMore();
    }
  };

  const handlePhotoPress = (photo) => {
    // For API photos, use the image_id directly (no .jpg removal needed)
    const photoId = photo.id; 
    
    // Store the photo in context with all required fields
    setSelectedSnapshot({
      id: photoId,
      url: photo.storageUrl,
      storageUrl: photo.storageUrl,
      // Add API data for reference
      apiData: photo.apiData
    });

    // Navigate WITH the required photoId param AND the thumbnailUrl
    // Add fromPhotoGrid flag to skip processing and go directly to polling
    router.push({ 
        pathname: '/snapshot', 
        params: { 
          photoId, 
          thumbnailUrl: photo.storageUrl,
          localUri: photo.storageUrl, // Provide URI for immediate render
          timestamp: photo.apiData?.created_at || null, // Pass creation date if available
          fromPhotoGrid: 'true', // Flag to indicate we're coming from PhotoGrid
          imageId: photo.hautUploadData?.imageId || photo.id // Pass the imageId for polling
        }
    });
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

  if (isLoading && photos.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading your photos...</Text>
      </View>
    );
  }

  if (!photos || photos.length === 0) {
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

  const renderItem = ({ item, index }) => {
    if (item.type === 'header') {
      return (
        <View style={styles.dateHeader}>
          <Text style={styles.dateHeaderText}>{item.label}</Text>
        </View>
      );
    }

    const qualityInfo = getQualityInfo(item.metrics);
    const imageUrl = item.storageUrl;

    return (
      <TouchableOpacity
        style={[styles.photoContainer, { marginLeft: index % 2 === 0 ? 0 : 0 }]}
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
        </View>
      </TouchableOpacity>
    );
  };

  // Render loading indicator for bottom
  const renderFooter = () => {
    if (!isLoadingMore) return null;
    
    return (
      <View style={styles.loadingFooter}>
        <ActivityIndicator size="small" color={colors.primary} />
        <Text style={styles.loadingFooterText}>Loading more photos...</Text>
      </View>
    );
  };

  // ---------- Build data with date headers ----------
  const buildSections = (photosArr) => {
    const today = new Date();
    const yesterdayDate = new Date();
    yesterdayDate.setDate(today.getDate() - 1);

    const makeLabel = (ts) => {
      const d = new Date(ts);
      if (d.toDateString() === today.toDateString()) return 'Today';
      if (d.toDateString() === yesterdayDate.toDateString()) return 'Yesterday';
      return format(d, 'MMMM d, yyyy');
    };

    const groups = {};
    photosArr.forEach((p) => {
      const label = makeLabel(p.timestamp);
      if (!groups[label]) groups[label] = [];
      groups[label].push(p);
    });

    const chunk = (arr, size) => {
      const res = [];
      for (let i = 0; i < arr.length; i += size) {
        res.push(arr.slice(i, i + size));
      }
      return res;
    };

    return Object.keys(groups).map((label) => ({
      title: label,
      data: chunk(groups[label], 2), // rows of 2 photos
    }));
  };

  const sections = buildSections(photos);

  return (
    <View style={styles.gridContainer}>
      <SectionList
        sections={sections}
        keyExtractor={(row, idx) => row[0]?.id ? `${row[0].id}-r${idx}` : `row-${idx}`}
        renderSectionHeader={({ section: { title } }) => (
          <View style={styles.dateHeader}>
            <Text style={styles.dateHeaderText}>{title}</Text>
          </View>
        )}
        renderItem={({ item: row }) => (
          <View style={{ flexDirection: 'row', columnGap: gutter, marginBottom: gutter }}>
            {row.map((photo, i) => (
              <TouchableOpacity
                key={photo.id}
                style={[styles.photoContainer, { marginLeft: i === 0 ? 0 : 0 }]}
                onPress={() => handlePhotoPress(photo)}
              >
                <View style={styles.photoWrapper}>
                  <ExpoImage
                    source={photo.storageUrl}
                    style={styles.photo}
                    contentFit="cover"
                    cachePolicy="memory-disk"
                    memoryCachePolicy="memory-only"
                    priority="high"
                  />
                </View>
              </TouchableOpacity>
            ))}
            {row.length === 1 && <View style={[styles.photoContainer, { opacity: 0 }]} />} {/* filler for uneven */}
          </View>
        )}
        contentContainerStyle={styles.grid}
        showsVerticalScrollIndicator={false}
        stickySectionHeadersEnabled={false}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.1}
        ListFooterComponent={renderFooter}
      />
    </View>
  );
};

const { width } = Dimensions.get('window');
const gutter = 8;
const photoSize = (width - 19 * 3) / 2; // two columns, 3 gutters (left, middle, right)

const styles = StyleSheet.create({
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  grid: {
    paddingHorizontal: 0,
    paddingTop: 10,
    paddingBottom: 120,
    rowGap: gutter,
    columnGap: 0,
  },

  gridContainer: {
    flex: 1,
    backgroundColor: '#FFF', // match app theme
  },

  list: {
    flex: 1,
  },
  
  photoContainer: {
    width: photoSize,
    height: photoSize,
  },
  photoWrapper: {
    flex: 1,
    borderRadius: 14,
    overflow: 'hidden',
    backgroundColor: '#DDD8D1',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 5,
    elevation: 4,
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
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
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
    dateHeader: {
    width: '100%',
    paddingVertical: 8,
    paddingHorizontal: gutter * 1.5,
  },
  dateHeaderText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#8B7355',
  },
  loadingFooter: {
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingFooterText: {
    marginTop: 8,
    fontSize: 14,
    color: colors.primary,
  },
});

export default PhotoGrid; 