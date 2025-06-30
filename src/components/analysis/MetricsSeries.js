// MetricsSeries.js
// React Native component for displaying a series of metrics with animated visualization

/* ------------------------------------------------------
WHAT IT DOES
- Displays time series visualization of skin metrics
- Processes photo metrics into categorical time series
- Shows trends over time with interactive dots
- Supports date selection and metric highlighting

DATA USED
- photos[]: Array of photo objects from Firebase
  {
    id: String,
    createdAt: Timestamp,
    metrics: {
      hydrationScore: Number,
      poresScore: Number,
      rednessScore: Number,
      pigmentationScore: Number,
      linesScore: Number,
      uniformnessScore: Number,
      translucencyScore: Number
    }
  }

DEV PRINCIPLES
- Uses vanilla JavaScript
- Clean data processing
- Consistent styling

PHOTO PROCESSING ALGORITHM
- rethinking processing algorithm by photos, not by dates.
- 1. assume the photos are already sorted by date
- 2. create an EMPTY array of metrics: with only one key: the photo id, and null values for all metrics
- 3. iterate through the photos, and for each photo, iterate through the metrics
- 4. first put in approproate date for the photo - NEW: Date format is : "Mar 2 2035 3:45pm"
- 5. then replace the null values with the actual metrics IF THEY EXIST 
- 6. return the array


DATA MODEL IN USERS/PHOTOS:
```javascript
{
  // Top Level Fields
  batchId: string,            // Batch identifier for analysis
  storageUrl: string,         // Firebase Storage URL
  timestamp: timestamp,       // Creation timestamp
  updatedAt: timestamp,       // Last modification timestamp

  // Analysis Status
  analysis: {},               // Empty object - ignored
  analyzed: boolean,          // Whether analysis is complete
  analyzing: boolean,         // Whether analysis is in progress

  // Haut AI Upload Data
  hautUploadData: {
    hautBatchId: string,     // Haut AI batch identifier
    imageId: string,          // Unique image identifier
    status: string,           // Upload status (e.g. "uploaded")
    urls: {
      "500x500": string,      // Medium resolution URL
      "800x1200": string,     // Large resolution URL
      original: string        // Original resolution URL
    }
  },

  // Skin Analysis Metrics
  metrics: {
    acneScore: 0,            // Severity of acne presence (0-100)
    eyeAge: 0,               // Estimated age based on eye area appearance
    eyeAreaCondition: 0,     // Overall eye area health score (0-100)
    hydrationScore: 0,       // Skin moisture level assessment (0-100)
    imageQuality: {          // Technical image assessment scores
      focus: 0,              // Image clarity and sharpness (0-100)
      lighting: 0,           // Lighting quality and evenness (0-100)
      overall: 0             // Combined image quality score (0-100)
    },
    linesScore: 0,           // Presence and depth of fine lines (0-100)
    perceivedAge: 0,         // AI-estimated age based on overall appearance
    pigmentationScore: 0,    // Even skin tone assessment (0-100)
    poresScore: 0,           // Pore size and visibility rating (0-100)
    rednessScore: 0,         // Skin redness/inflammation level (0-100)
    skinTone: "Unknown",     // Classified skin tone category
    skinType: "Unknown",     // Classified skin type (e.g., Dry, Oily)
    translucencyScore: 0,    // Skin clarity/transparency rating (0-100)
    uniformnessScore: 0      // Overall evenness of skin texture (0-100)
  },

  // Raw Analysis Results - unparsed direct from haut
  results: {
    // ... 
  },

  // Status Information
  status: {
    lastUpdated: timestamp,   // Last update timestamp
    message: string,          // Status message
    state: string            // Current state
  }
}
```







------------------------------------------------------*/

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity, FlatList, Animated, ActivityIndicator } from 'react-native';
import { Image as ExpoImage } from 'expo-image';
import { useThreadContext } from '../../contexts/ThreadContext'; // Import thread context
import { usePhotoContext } from '../../contexts/PhotoContext'; // Import photo context
import { useRouter } from 'expo-router'; // Import router

const { width } = Dimensions.get('window');
const DATE_CARD_WIDTH = 115;  // 100 * 1.15 = 115 (15% increase)
const DATE_CARD_HEIGHT = 173; // 150 * 1.15 ≈ 173 (15% increase)
const DATE_CARD_MARGIN = 3;  // 8 / 2 = 4

const METRIC_KEYS = [
  'acneScore',
  'eyeAge',
  'eyeAreaCondition', 
  'hydrationScore',
  'linesScore',
  'perceivedAge',
  'pigmentationScore',
  'poresScore',
  'rednessScore',
  'translucencyScore',
  'uniformnessScore'
];

const METRIC_LABELS = {
  acneScore: 'Acne',
  eyeAge: 'Eye Age',
  eyeAreaCondition: 'Eyes',
  hydrationScore: 'Hydration',
  linesScore: 'Wrinkles',
  perceivedAge: 'Perceived Age',
  pigmentationScore: 'Pigmentation',
  poresScore: 'Pores',
  rednessScore: 'Redness',
  translucencyScore: 'Translucency',
  uniformnessScore: 'Texture'
};

const IMAGE_QUALITY_KEYS = [
  'focus',
  'lighting', 
  'overall'
];

const processPhotoMetrics = (photos) => {
  if (!photos?.length) return { metrics: [], timestamps: [] };

  // Refined timestamp extraction
  const timestamps = photos.map(photo => {
    let dateValue;
    const ts = photo.timestamp;
    if (ts?.seconds && typeof ts.seconds === 'number') { // Firestore Timestamp
        dateValue = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
    } else if (ts instanceof Date) { // Already a JS Date
        dateValue = ts;
    } else { // Attempt conversion from string/number
        dateValue = new Date(ts);
    }
    return dateValue; // Return the Date object (or Invalid Date)
  }).filter(date => date instanceof Date && !isNaN(date.getTime())); // Filter out invalid dates

  // Create array of metric objects with scores array
  const processedMetrics = METRIC_KEYS.map(metricKey => ({
    metricName: metricKey,
    scores: photos.map(photo => {
      // Use the same robust conversion for score timestamp
      let timestamp;
      const ts = photo.timestamp;
      if (ts?.seconds && typeof ts.seconds === 'number') {
          timestamp = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
      } else if (ts instanceof Date) {
          timestamp = ts;
      } else {
          timestamp = new Date(ts);
      }

      // Format the date only if it's valid
      const formattedDate = timestamp instanceof Date && !isNaN(timestamp.getTime()) 
        ? timestamp.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
          })
        : 'Invalid Date';

      return {
        photoId: photo.id,
        score: photo.metrics?.[metricKey] ?? null,
        timestamp: timestamp, // Store the actual Date object
        date: formattedDate // Store the formatted string
      };
    })
  }));

  return {
    metrics: processedMetrics,
    timestamps: timestamps  // These are now valid Date objects, sorted if input `photos` was sorted
  };
};

const PhotoThumbCard = ({ photo, index, selectedIndex, onPress, onLongPress }) => {
  if (!photo) return null;
  
  const isSelected = index === selectedIndex;
  const scaleAnim = useRef(new Animated.Value(1)).current; // Animated value for scale

  // Animate scale based on isSelected changes
  useEffect(() => {
    Animated.timing(scaleAnim, {
      toValue: isSelected ? 1.1 : 1, // Target scale: 110% if selected, 100% otherwise
      duration: 200, // Animation duration (milliseconds)
      useNativeDriver: true, // Use native driver for performance
    }).start();
  }, [isSelected, scaleAnim]);

  // Date formatting (ensure it uses item's timestamp)
  let date;
  const ts = photo.timestamp;
  if (ts?.seconds && typeof ts.seconds === 'number') { date = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0)); } 
  else if (ts instanceof Date) { date = ts; } 
  else { date = new Date(ts); }
  
  // Verify we have a valid date before rendering
  if (!(date instanceof Date && !isNaN(date.getTime()))) {
    console.warn(`[PhotoThumbCard] Invalid date for photo ${photo.id}`);
    return null;
  }
  
  return (
    // Apply animated scale to TouchableOpacity
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}> 
      <TouchableOpacity 
        onPress={onPress}
        onLongPress={() => onLongPress?.(photo, index)}
        // Apply conditional styles: base + selected (shadows, border, zIndex)
        style={[ 
          styles.photoThumbCard, 
          isSelected && styles.selectedPhotoThumbCard 
        ]}
        activeOpacity={0.8} // Can adjust opacity on press
      >
        <View style={styles.thumbContainer}>
          <ExpoImage 
            // Reverted to using the original storageUrl
            source={photo.storageUrl} 
            style={styles.thumbImage}
            contentFit="cover"
            cachePolicy="memory-disk" // Keep existing cache policy
            memoryCachePolicy="memory-only"
            priority="high"
          />
        </View>
        <View style={styles.thumbDateContainer}> 
          <Text style={[styles.thumbDateText, isSelected && styles.selectedThumbDateText]}>
            {date.toLocaleString('default', { month: 'short', day: 'numeric' })}
          </Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const TimeSelector = forwardRef(({ selectedIndex, onSelectDate, photos, noteText, onLongPress }, ref) => {
  const flatListRef = useRef(null);

  // Debug photos array changes
  // useEffect(() => {
  //   console.log(`[TimeSelector] Photos updated:`, {
  //     photosLength: photos?.length,
  //     selectedIndex,
  //     firstPhotoId: photos?.[0]?.id,
  //     hasPhotos: !!photos?.length
  //   });
  // }, [photos, selectedIndex]);

  // Expose scrollToIndex via ref
  useImperativeHandle(ref, () => ({
    scrollToIndex: (index) => {
      // Validate index against the photos array length
      if (flatListRef.current && photos && index >= 0 && index < photos.length) { 
        console.log(`[TimeSelector] Scrolling to center index ${index} (List length: ${photos.length})`);
        flatListRef.current.scrollToIndex({
          index,
          animated: true,
          viewPosition: 0.5 // Center the item in the viewport
        });
      } else {
         console.warn(`[TimeSelector] scrollToIndex failed: Invalid index ${index}. List length: ${photos?.length}. SelectedIndex prop: ${selectedIndex}.`);
      }
    },
  }), [photos, selectedIndex]); // Depend on photos, selectedIndex

  const renderPhotoThumb = ({ item, index }) => {
    // Log the item being rendered by FlatList
    // console.log(`[TimeSelector FlatList Render] Index: ${index}, Photo ID: ${item?.id}, Timestamp: ${item?.timestamp}`);

    // Directly use the item from FlatList data (which is now a photo object)
    if (!item) return null;

    // Note logic removed from here, passed via prop
    
    return (
      <PhotoThumbCard
        photo={item} // Use item directly
        index={index}
        selectedIndex={selectedIndex}
        onPress={() => {
          onSelectDate(index);
        }}
        onLongPress={onLongPress}
      />
    );
  };

  // Effect to scroll when selectedIndex prop changes from outside
  useEffect(() => {
    // Check if selectedIndex is a valid number and within bounds
    if (selectedIndex !== null && typeof selectedIndex === 'number' && selectedIndex >= 0 && photos && selectedIndex < photos.length) {
      // Add a small delay to allow FlatList to potentially render before scrolling
      const timer = setTimeout(() => {
          if (flatListRef.current) {
              console.log(`[TimeSelector useEffect] Scrolling to center selectedIndex: ${selectedIndex}`);
              flatListRef.current.scrollToIndex({
                  index: selectedIndex,
                  animated: true,
                  viewPosition: 0.5, // Center the item in the viewport
              });
          }
      }, 50); // 50ms delay
      return () => clearTimeout(timer); // Cleanup timer
    } else if (selectedIndex !== null) {
        console.warn(`[TimeSelector useEffect] Invalid selectedIndex for scroll: ${selectedIndex}. List length: ${photos?.length}`);
    }
  }, [selectedIndex, photos]); // Depend on selectedIndex and photos

  return (
    <View>
      {/* Container for the FlatList AND the note text */}
      <View style={styles.timeSelectorContainer}>
        <FlatList
          ref={flatListRef}
          data={photos} // Use photos array directly as data
          renderItem={renderPhotoThumb}
          keyExtractor={(item) => item.id} // Use unique photo ID as key
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.timeScrollContent}
          snapToInterval={DATE_CARD_WIDTH + (DATE_CARD_MARGIN * 2)}
          decelerationRate="fast"
          getItemLayout={(data, index) => ({
            length: DATE_CARD_WIDTH + (DATE_CARD_MARGIN * 2),
            offset: (DATE_CARD_WIDTH + (DATE_CARD_MARGIN * 2)) * index,
            index,
          })}
          onScrollToIndexFailed={(info) => {
              console.error("[TimeSelector] onScrollToIndexFailed:", info);
          }}
        />
        {/* Note text INSIDE the grey container, below the FlatList */}
        <Text style={styles.noteInsideCarouselArea}>
          {noteText || ' '}
        </Text>
      </View>
      
      {/* Shadow layers remain visually below the grey container */}
      <View style={styles.shadowLayer1} />
      <View style={styles.shadowLayer2} />
      <View style={styles.shadowLayer3} />
    </View>
  );
});

const getColorForScore = (score) => {
  if (score <= 30) return '#FF3B30'; // Saturated red
  if (score <= 70) return '#FFB340'; // Rich gold
  return '#34C759'; // Vibrant green
};

// Helper to normalize metric values and handle null/zero cases
const normalizeMetricValue = (value) => {
  // Check for null, undefined, NaN, or zero
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return {
      value: 50, // Center position
      color: '#999999', // Grey color
      isNullValue: true
    };
  }

  // For valid values, return the normalized value and appropriate color
  return {
    value,
    color: getColorForScore(value),
    isNullValue: false
  };
};

// Helper to calculate percentage change from first to most recent measurement
const calculatePercentageChange = (scores) => {
  if (!scores || scores.length < 2) return null;
  
  // Find first and last valid scores
  const validScores = scores.filter(s => s.score !== null && s.score !== undefined && !isNaN(s.score) && s.score !== 0);
  if (validScores.length < 2) return null;
  
  const firstScore = validScores[0].score;
  const lastScore = validScores[validScores.length - 1].score;
  
  if (firstScore === 0) return null; // Avoid division by zero
  
  const percentChange = ((lastScore - firstScore) / firstScore) * 100;
  return Math.round(percentChange * 10) / 10; // Round to 1 decimal place
};

// Helper to generate light version of a color
const getLightColor = (hexColor) => {
  // Convert hex to RGB, then create a light version
  if (!hexColor || hexColor === '#999999') return '#f0f0f0'; // Grey for null values
  
  switch (hexColor) {
    case '#FF3B30': return '#FFEBEA'; // Light red
    case '#FFB340': return '#FFF4E6'; // Light amber  
    case '#34C759': return '#E8F5E8'; // Light green
    default: return '#f0f0f0';
  }
};

const MetricRow = ({ metric, selectedIndex, onDotPress, scrollPosition, forceScrollSyncRef }) => {
  if (!metric?.scores?.length) return null;

  const scrollViewRef = useRef(null);

  // Sync scroll position when it changes or when forced
  useEffect(() => {
    if (scrollViewRef.current && scrollPosition !== undefined && scrollPosition >= 0) {
      // Calculate dimensions for debugging
      const plotAreaWidth = metric.scores.length * 16; // barSlotWidth = 16
      const rightPadding = 120; // Match the contentContainerStyle paddingRight
      const totalContentWidth = plotAreaWidth + rightPadding;
      const maxScrollPosition = Math.max(0, totalContentWidth - width);
      const boundedScrollPosition = Math.min(scrollPosition, maxScrollPosition);
      
      // Check if this is a forced sync (initial load) or normal interaction
      const isForced = forceScrollSyncRef?.current;
      const shouldAnimate = !isForced; // Don't animate on forced initial sync for speed
      
      // Add tiny stagger based on metric index to reduce simultaneous animation load
      const metricIndex = METRIC_KEYS.indexOf(metric.metricName);
      const staggerDelay = shouldAnimate ? metricIndex * 10 : 0; // No stagger on forced sync
      
      // console.log(`[MetricRow] ${metric.metricName} scroll debug:`, {
      //   requestedScrollPos: scrollPosition,
      //   boundedScrollPos: boundedScrollPosition,
      //   plotAreaWidth,
      //   totalContentWidth,
      //   maxScrollPos: maxScrollPosition,
      //   viewportWidth: width,
      //   scoresLength: metric.scores.length,
      //   isForced,
      //   shouldAnimate
      // });
      
      setTimeout(() => {
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({ 
            x: boundedScrollPosition, 
            animated: shouldAnimate,
            duration: shouldAnimate ? 200 : 0
          });
        }
      }, staggerDelay);
    }
  }, [scrollPosition, metric.scores.length, metric.metricName]); // Removed selectedIndex from dependencies

  // Separate effect to clear force flag after initial load
  useEffect(() => {
    if (forceScrollSyncRef?.current) {
      // Clear the force flag after a short delay to allow all metrics to scroll
      const timer = setTimeout(() => {
        if (forceScrollSyncRef) {
          // console.log('[MetricRow] Clearing force scroll flag');
          forceScrollSyncRef.current = false;
        }
      }, 500); // Give enough time for all metrics to complete their scroll
      
      return () => clearTimeout(timer);
    }
  }, [forceScrollSyncRef?.current]); // Only run when force flag changes to true

  const percentChange = calculatePercentageChange(metric.scores);
  
  // Mock average calculation (we'll fix this later)
  const validScores = metric.scores.filter(s => s.score !== null && s.score !== undefined && !isNaN(s.score) && s.score !== 0);
  const mockAverage = validScores.length > 0 
    ? Math.round(validScores.reduce((sum, s) => sum + s.score, 0) / validScores.length)
    : null;
  
  // Bar chart constants (from simple series)
  const barWidth = 10;
  const barRadius = 5;
  const barSlotWidth = 16;
  const plotAreaWidth = metric.scores.length * barSlotWidth;
  const chartHeight = 48; // Reduced by 25% from 64px for more compact design

  return (
    <View style={styles.card}>
      {/* Title Section with average and percentage change */}
      <View style={styles.titleRow}>
        <Text style={styles.categoryText}>{METRIC_LABELS[metric.metricName] || metric.metricName}</Text>
        <View style={styles.metricStatsContainer}>
          {mockAverage !== null && (
            <Text style={styles.averageText}>{mockAverage} Avg.</Text>
          )}
          {percentChange !== null && (
            <Text style={[
              styles.percentChangeText,
              percentChange >= 0 ? styles.positiveChange : styles.negativeChange
            ]}>
              {percentChange >= 0 ? '+' : ''}{percentChange}%
            </Text>
          )}
        </View>
      </View>
      
      {/* Data Section - Bar Chart */}
      <View style={[styles.dataSection, { height: chartHeight + 40 }]}>
        {/* Scrollable Bar Container */}
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.barScrollView}
          contentContainerStyle={{ 
            paddingTop: 28,
            paddingRight: 16 // Add right padding so selected items can be properly visible
          }}
        >
          <View style={[styles.plotArea, { width: plotAreaWidth, height: chartHeight }]}>
            {/* Y-Axis Grid Lines */}
            <View style={styles.gridContainer}>
              <View style={[styles.yAxisGridLine, { bottom: chartHeight - 1 }]} />
              <View style={[styles.yAxisGridLine, { bottom: chartHeight / 2 }]} />
              <View style={[styles.yAxisGridLine, { bottom: 0 }]} />
            </View>
            
            {/* Selected Value Indicator */}
            {selectedIndex !== null && metric.scores[selectedIndex] && (
              <View style={[
                styles.selectedIndicator,
                { left: selectedIndex * barSlotWidth + (barSlotWidth / 2) - 0.5 }
              ]}>
                <Text style={styles.selectedValue}>
                  {metric.scores[selectedIndex].score === 0 || metric.scores[selectedIndex].score === null ? 'No Data' : `${metric.scores[selectedIndex].score}/100`}
                </Text>
              </View>
            )}
            
            {/* Bars */}
            {metric.scores.map((scoreData, index) => {
              const normalizedMetric = normalizeMetricValue(scoreData.score);
              
              if (normalizedMetric.isNullValue) {
                // Render null data indicator at center
                const xPosition = index * barSlotWidth;
                return (
                  <TouchableOpacity
                    key={scoreData.photoId}
                    onPress={() => onDotPress(index)}
                    style={[
                      styles.nullBarContainer,
                      {
                        left: xPosition,
                        bottom: chartHeight / 2 - 2,
                      }
                    ]}
                  >
                    <View style={styles.nullBar} />
                  </TouchableOpacity>
                );
              }
              
              // Calculate bar height and position
              const barHeight = (normalizedMetric.value / 100) * chartHeight;
              const xPosition = index * barSlotWidth;
              const isSelected = selectedIndex === index;
              const isRecent = index >= metric.scores.length - 3;
              
              // Get dark and light colors
              const darkColor = normalizedMetric.color;
              const lightColor = getLightColor(normalizedMetric.color);
              
              return (
                <View key={scoreData.photoId} style={{ 
                  position: 'absolute', 
                  left: xPosition, 
                  bottom: 0, 
                  width: barSlotWidth, 
                  alignItems: 'center'
                }}>
                  <TouchableOpacity
                    onPress={() => onDotPress(index)}
                    style={{
                      width: barSlotWidth,
                      height: chartHeight,
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                    }}
                    activeOpacity={0.7}
                  >
                    {/* Light background bar */}
                    <View
                      style={[
                        styles.bar,
                        {
                          width: barWidth,
                          height: Math.max(barHeight, 2),
                          borderRadius: barRadius,
                          backgroundColor: lightColor,
                          opacity: isRecent ? 1 : 0.7,
                        }
                      ]}
                    />
                    
                    {/* Dark circle at top of bar */}
                    <View
                      style={[
                        styles.barCircle,
                        isSelected && styles.selectedBarCircle,
                        {
                          backgroundColor: darkColor,
                          opacity: isRecent ? 1 : 0.7,
                          position: 'absolute',
                          bottom: Math.max(barHeight - (isSelected ? 4 : 3), isSelected ? -2 : -1),
                        }
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const MetricsSeries = ({ photos }) => {
  const [selectedIndex, setSelectedIndex] = useState(null);
  const [showContent, setShowContent] = useState(true); // Start with overlay showing
  const { metrics, timestamps } = processPhotoMetrics(photos);
  const timeSelectorRef = useRef(null);
  const initialSelectionDoneRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const forceScrollSyncRef = useRef(false);
  const { currentThread, listenToThread } = useThreadContext(); // Use thread context
  const { setSelectedSnapshot } = usePhotoContext(); // Use photo context
  const router = useRouter(); // Use router

  // Simple timeout approach - hide loading overlay after 2 seconds
  useEffect(() => {
    if (photos.length > 0 && showContent) {
      // console.log(`[MetricsSeries] Starting 2-second timeout for ${photos.length} photos`);
      const timeoutId = setTimeout(() => {
        // console.log(`[MetricsSeries] Timeout reached! Hiding loading overlay.`);
        setShowContent(false);
      }, 2000);

      return () => clearTimeout(timeoutId);
    }
  }, [photos.length, showContent]);

  // Debug renders
  // useEffect(() => {
  //   console.log(`[MetricsSeries] Render state:`, {
  //     showContent,
  //     photosLength: photos.length,
  //     selectedIndex,
  //     metricsLength: metrics?.length,
  //     timestampsLength: timestamps?.length,
  //     initialSelectionDone: initialSelectionDoneRef.current
  //   });
  // }, [showContent, selectedIndex]); // Only log when these key states change

  // Bar chart constants (matching MetricRow)
  const barSlotWidth = 16;

  // Memoize scroll position calculation for performance
  const scrollPosition = useMemo(() => {
    if (selectedIndex === null || metrics.length === 0) return 0;
    
    // Calculate position to center the selected bar in the viewport
    const selectedBarPosition = selectedIndex * barSlotWidth;
    const viewportWidth = width;
    const targetPosition = selectedBarPosition - (viewportWidth / 2) + (barSlotWidth / 2);
    
    // Calculate max scroll position accounting for right padding
    const plotAreaWidth = metrics[0]?.scores?.length * barSlotWidth || 0;
    const rightPadding = 120; // From MetricRow contentContainerStyle paddingRight
    const totalContentWidth = plotAreaWidth + rightPadding;
    const maxScrollPosition = Math.max(0, totalContentWidth - viewportWidth);
    
    // Clamp to valid scroll range: [0, maxScrollPosition]
    const boundedPosition = Math.max(0, Math.min(targetPosition, maxScrollPosition));
    
    // console.log(`[MetricsSeries] Scroll calc: selectedIndex=${selectedIndex}, barPos=${selectedBarPosition}, centered=${targetPosition.toFixed(1)}, bounded=${boundedPosition.toFixed(1)}, max=${maxScrollPosition.toFixed(1)}, plotWidth=${plotAreaWidth}, totalWidth=${totalContentWidth}`);
    return boundedPosition;
  }, [selectedIndex, metrics.length, barSlotWidth, width]);

  // Log timestamps order after processing
  useEffect(() => {
    if (timestamps && timestamps.length > 0) {
      const formattedTimestamps = timestamps.map(ts => ts instanceof Date ? ts.toISOString() : String(ts));
      // console.log('[MetricsSeries] Timestamps order passed to TimeSelector:', JSON.stringify(formattedTimestamps, null, 2));
    }
  }, [timestamps]); // Log when timestamps change

  const handleDotPress = (index) => {
    // Simple debounce to prevent rapid-fire taps
    const now = Date.now();
    if (now - lastTapTimeRef.current < 50) return; //  debounce
    lastTapTimeRef.current = now;
    
    // console.log(`[MetricsSeries] Dot press detected for index ${index}`);
    // Allow deselecting by pressing the same dot again
    setSelectedIndex(prevIndex => prevIndex === index ? null : index);
  };

  const handleLongPress = (photo, index) => {
    // Navigate to snapshot using same pattern as PhotoGrid
    const photoId = photo.id.replace('.jpg', '');
    
    // Store photo in context for snapshot screen
    setSelectedSnapshot({
      id: photoId,
      url: photo.storageUrl,
      storageUrl: photo.storageUrl,
      threadId: photo.threadId
    });

    // Navigate to snapshot screen
    router.push({ 
      pathname: '/snapshot', 
      params: { photoId, thumbnailUrl: photo.storageUrl }
    });
  };

  // Effect to listen to the thread of the selected photo
  useEffect(() => {
    let unsubscribeThread = () => {}; // Default no-op cleanup
    if (selectedIndex !== null && photos && selectedIndex >= 0 && selectedIndex < photos.length) {
        const selectedPhoto = photos[selectedIndex];
        const threadId = selectedPhoto?.threadId; // Get threadId from selected photo
        if (threadId) {
            // console.log(`[MetricsSeries] Selected photo ${selectedPhoto.id}, listening to thread ${threadId}`);
            unsubscribeThread = listenToThread(threadId); // Call context function
        } else {
            // console.log(`[MetricsSeries] Selected photo ${selectedPhoto.id} has no threadId. Clearing listener.`);
            unsubscribeThread = listenToThread(null); // Clear listener if no threadId
        }
    } else {
        // No photo selected, clear listener
        //  console.log(`[MetricsSeries] No photo selected. Clearing listener.`);
        unsubscribeThread = listenToThread(null);
    }

    // Cleanup function for this effect
    return () => {
        //  console.log(`[MetricsSeries] Cleanup effect for selectedIndex ${selectedIndex}. Unsubscribing thread listener.`);
        unsubscribeThread();
    };
  }, [selectedIndex, photos, listenToThread]); // Dependencies

  // Auto-select most recent photo on mount/data load (run only once per data load)
  useEffect(() => {
    // Only run if timestamps exist, have length, AND initial selection hasn't been done yet
    if (!initialSelectionDoneRef.current && timestamps && timestamps.length > 0) {
      // Add small delay to ensure the component has fully rendered
      const timer = setTimeout(() => {
          const lastIndex = timestamps.length - 1;
          // Check index validity one last time before setting/scrolling
          if (lastIndex >= 0) {
              // console.log('[MetricsSeries useEffect] Auto-selecting initial photo (last index):', {
              //   index: lastIndex,
              //   total: timestamps.length,
              //   photoId: photos[lastIndex]?.hautUploadData?.imageId
              // });
              setSelectedIndex(lastIndex);
              
              // Scroll the TimeSelector to the end
              timeSelectorRef.current?.scrollToIndex(lastIndex);
              
              // Add additional delay for metrics scroll sync on initial load
              // This ensures MetricRow ScrollViews are fully mounted before sync
              setTimeout(() => {
                // console.log('[MetricsSeries] Triggering initial metrics scroll sync');
                // Set flag to force scroll sync in MetricRow components
                forceScrollSyncRef.current = true;
                // Don't trigger another setState - just let the existing scrollPosition logic handle it
              }, 200); // Shorter delay since content is always rendered
              
              // Mark initial selection as done
              initialSelectionDoneRef.current = true; 
          } else {
              console.warn('[MetricsSeries useEffect] Auto-selection skipped: lastIndex calculation invalid.');
          }
      }, 100); // Small delay to let TimeSelector render

      return () => clearTimeout(timer); // Cleanup timer
    }
    // If timestamps array becomes empty later, reset the ref so selection happens again if data returns
    else if (timestamps && timestamps.length === 0) {
        initialSelectionDoneRef.current = false;
        setSelectedIndex(null); // Clear selection if no data
    }
  }, [photos, timestamps]); // Removed showContent dependency since content always renders

  // Safety check - ensure we have photos before rendering
  if (!photos || photos.length === 0) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No photos available</Text>
        <Text style={styles.noDataSubtext}>Take some photos to see your progress</Text>
      </View>
    );
  }

  // If no photo metrics available
  if (!metrics?.length) {
    return (
      <View style={styles.noDataContainer}>
        <Text style={styles.noDataText}>No metrics data available yet</Text>
        <Text style={styles.noDataSubtext}>Take more photos to see your trends</Text>
      </View>
    );
  }

  // Determine the note text based on the current thread summary
  const noteText = currentThread?.summary || (selectedIndex !== null ? " " : " ");

  return (
    <View style={styles.container}>
      {/* Main content - always rendered */}
      <TimeSelector 
        selectedIndex={selectedIndex}
        onSelectDate={handleDotPress}
        photos={photos}
        ref={timeSelectorRef}
        noteText={noteText} // Pass the summary/note text down
        onLongPress={handleLongPress}
      />
      <ScrollView style={styles.metricsContainer}>
        {metrics.map((metric, index) => (
          <MetricRow 
            key={index} 
            metric={metric} 
            selectedIndex={selectedIndex}
            onDotPress={handleDotPress}
            scrollPosition={scrollPosition}
            forceScrollSyncRef={forceScrollSyncRef}
          />
        ))}
      </ScrollView>

      {/* Loading overlay - conditionally rendered on top */}
      {showContent && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#6E46FF" />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    backgroundColor: '#f5f5f5',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 4,
    padding: 12,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  categoryText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#555',
    letterSpacing: 0.5,
  },
  dataSection: {
    height: 60,  // Adjusted for better proportions
    marginVertical: 4,
    position: 'relative',
  },
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'space-between',
  },
  gridLine: {
    width: '100%',
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  dotContainer: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -8 }, { translateY: -8 }], // Center the dot vertically
  },
  nullDotContainer: {
    width: 20,
    height: 20,
    transform: [{ translateX: -10 }, { translateY: -10 }], // Center the null dot vertically
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 3,
    borderColor: '#00000010',
  },
  historyDot: {
    opacity: 0.4,  // More transparent for historical dots
  },
  recentDot: {
    opacity: 1,    // Full opacity for recent dots
  },
  selectedIndicator: {
    position: 'absolute',
    top: 0,           // Start from top of container
    bottom: 0,        // End at bottom of container
    transform: [{ translateX: -0.5 }], // Center the 1px line
    alignItems: 'center',
    width: 1,         // Make it just the width of the line
    backgroundColor: '#ccc',
    zIndex: 1,
  },
  selectedValue: {
    position: 'absolute',
    top: -28,         // Moved up by 10 pixels from -18
    left: -30,        // Center the text (60px wide)
    width: 60,
    fontSize: 11,     // Slightly smaller font
    color: '#333',
    fontWeight: '500',
    textAlign: 'center',
    backgroundColor: 'white',
    paddingVertical: 1,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  timeSelectorContainer: {
    backgroundColor: '#333333', // Darker background for photo carousel
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
    // marginBottom: 16, // Removed margin bottom
    // Padding will be handled by FlatList content and the note text
    // paddingVertical: 16, 
  },
  shadowLayer1: {
    position: 'absolute',
    bottom: -3,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#000',
    opacity: 0.03,
  },
  shadowLayer2: {
    position: 'absolute',
    bottom: -6,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#000',
    opacity: 0.02,
  },
  shadowLayer3: {
    position: 'absolute',
    bottom: -9,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: '#000',
    opacity: 0.01,
  },
  timeScrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16, // Keep vertical padding for FlatList items
  },
  dateCard: {
    width: DATE_CARD_WIDTH,
    height: DATE_CARD_WIDTH,
    marginHorizontal: DATE_CARD_MARGIN,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  selectedDateCard: {
    backgroundColor: '#333',
    transform: [{ scale: 1.00 }],
  },
  dateMonth: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
    marginBottom: 2,
  },
  dateDay: {
    fontSize: 24,
    fontWeight: '600',
    color: '#333',
  },
  dateYear: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  selectedDateText: {
    color: 'white',
  },
  metricsContainer: {
    flex: 1,
    paddingTop: 24, // Added top padding for spacing from carousel
  },
  noDataContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  noDataText: {
    fontSize: 16,
    color: '#333',
    fontWeight: '500',
    marginBottom: 8,
  },
  noDataSubtext: {
    fontSize: 14,
    color: '#666',
  },
  nullDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    borderWidth: 2,
    borderColor: '#dddddd',
    backgroundColor: '#dddddd',
  },
  photoThumbCard: {
    width: DATE_CARD_WIDTH,
    height: DATE_CARD_HEIGHT,
    marginHorizontal: DATE_CARD_MARGIN,
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 6,
  },
  selectedPhotoThumbCard: {
    // Scale set to 110% - Animation will handle the actual transform
    // transform: [{ scale: 1.1 }], 
    
    // Further enhance shadow for more "pop"
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 }, // Further increased height offset
    shadowOpacity: 0.30, // Further increased opacity
    shadowRadius: 15, // Further increased radius
    elevation: 15, // Further increased elevation for Android
    zIndex: 10, // Keep zIndex
    borderWidth: 2,
    borderColor: 'white',
  },
  thumbContainer: {
    flex: 1,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    // overflow: 'hidden',
  },
  thumbImage: {
    width: '100%',
    height: '100%',
  },
  thumbDateContainer: {
    height: 24, // Reverted height
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  thumbDateText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  selectedThumbDateText: {
    color: '#ffffff',
  },
  // Renamed style for the note text INSIDE the carousel area
  noteInsideCarouselArea: {
    fontSize: 12,
    color: '#ffffff', // Changed to white for dark background
    textAlign: 'center',
    paddingHorizontal: 16, // Horizontal padding
    paddingTop: 4,       // Requested top padding (pushes note down from thumbs)
    paddingBottom: 16,    // Bottom padding within the grey area
    width: '100%',         // Full width within the container
    // backgroundColor: '#f5f5f0', // No background needed, inherits from container
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  metricStatsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  averageText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#999',
    marginRight: 8,
  },
  percentChangeText: {
    fontSize: 12,
    fontWeight: '600',
    marginRight: 2,
  },
  positiveChange: {
    color: '#34C759',
  },
  negativeChange: {
    color: '#FF3B30',
  },
  changeLabel: {
    fontSize: 10,
    fontWeight: '500',
    color: '#666',
  },
  yAxisGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  nullBarContainer: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -8 }, { translateY: -8 }], // Center the null bar vertically
  },
  nullBar: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dddddd',
  },
  bar: {
    width: 10,
    height: 2,
    borderRadius: 5,
    backgroundColor: '#333',
    opacity: 0.7,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  barCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  selectedBarCircle: {
    width: 16,
    height: 16,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 6,
  },
  barScrollView: {
    height: 48,
  },
  plotArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
  },
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#ffffff",
  },
  loadingText: {
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '500',
    marginBottom: 8,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#ffffff',
  },
  timeoutText: {
    fontSize: 12,
    color: '#ffffff',
    marginTop: 8,
  },
});

export default MetricsSeries;