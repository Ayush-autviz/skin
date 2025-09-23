4// MetricsSeries.js
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
import Popover from 'react-native-popover-view';
import { Image as ExpoImage } from 'expo-image';
import { useThreadContext } from '../../contexts/ThreadContext'; // Import thread context
import { usePhotoContext } from '../../contexts/PhotoContext'; // Import photo context
import { useRouter } from 'expo-router'; // Import router
import { colors, shadows } from '../../styles';
import { Expand, Flag, BookOpen, Book, FlagIcon } from 'lucide-react-native';
import useAuthStore from '../../stores/authStore';
import { ChevronRightIcon } from 'lucide-react-native';
import TrendChart from './TrendChart';
import { LineChart } from 'react-native-chart-kit';
import { Svg, Line as SvgLine, Circle as SvgCircle } from 'react-native-svg';

const { width } = Dimensions.get('window');
const DATE_CARD_WIDTH = 115;  // 100 * 1.15 = 115 (15% increase)
const DATE_CARD_HEIGHT = 173; // 150 * 1.15 ≈ 173 (15% increase)
const DATE_CARD_MARGIN = 3;  // 8 / 2 = 4

const router = useRouter(); 

const METRIC_KEYS = [
  'acneScore',
  'rednessScore',
  'eyeAreaCondition',
  'linesScore',
  'pigmentationScore',
  'poresScore',
  'hydrationScore',
  'uniformnessScore',
  'eyeAge',
  'perceivedAge',
  'skinType'
];

const METRIC_LABELS = {
  acneScore: 'Breakouts',
  rednessScore: 'Redness',
  eyeAreaCondition: 'Eye Area Condition',
  linesScore: 'Lines',
  pigmentationScore: 'Pigmentation',
  poresScore: 'Visible Pores',
  hydrationScore: 'Dewiness',
  uniformnessScore: 'Evenness',
  eyeAge: 'Perceived Eye Age',
  perceivedAge: 'Perceived Age',
  skinType: 'Skin Type'
};

const IMAGE_QUALITY_KEYS = [
  'focus',
  'lighting', 
  'overall'
];

const processPhotoMetrics = (photos) => {
  if (!photos?.length) return { metrics: [], timestamps: [] };

  // Refined timestamp extraction - prioritize created_at field from API
  const timestamps = photos.map(photo => {
    let dateValue;
    
    // Prioritize created_at field from API response
    if (photo.created_at) {
      dateValue = new Date(photo.created_at);
    } else {
      // Fallback to timestamp for backward compatibility
      const ts = photo.timestamp;
      if (ts?.seconds && typeof ts.seconds === 'number') { // Firestore Timestamp
          dateValue = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
      } else if (ts instanceof Date) { // Already a JS Date
          dateValue = ts;
      } else { // Attempt conversion from string/number
          dateValue = new Date(ts);
      }
    }
    return dateValue; // Return the Date object (or Invalid Date)
  }).filter(date => date instanceof Date && !isNaN(date.getTime())); // Filter out invalid dates

  // Create array of metric objects with scores array
  const processedMetrics = METRIC_KEYS.map(metricKey => ({
    metricName: metricKey,
    scores: photos.map(photo => {
      // Use the same robust conversion for score timestamp - prioritize created_at
      let timestamp;
      
      // Prioritize created_at field from API response
      if (photo.created_at) {
        timestamp = new Date(photo.created_at);
      } else {
        // Fallback to timestamp for backward compatibility
        const ts = photo.timestamp;
        if (ts?.seconds && typeof ts.seconds === 'number') {
            timestamp = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
        } else if (ts instanceof Date) {
            timestamp = ts;
        } else {
            timestamp = new Date(ts);
        }
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

      // For skin_type, store the string value instead of numeric score
      const value = metricKey === 'skinType' 
        ? photo.metrics?.[metricKey] ?? null
        : photo.metrics?.[metricKey] ?? null;

      return {
        photoId: photo.id,
        score: value, // This will be the skin type string for skinType metric
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

const PhotoThumbCard = ({
  photo,
  index,
  selectedIndex,
  onPress,
  onMaximize,
  summaryLoading,
  routineFlagLoading,
  setIsTooltipOpen,
  setIconsContainerRef,
}) => {
  if (!photo) return null;
  const isSelected = index === selectedIndex;
  const iconsRef = useRef(null);

  // Pass icons container ref up to parent when this card is selected
  useEffect(() => {
    if (isSelected) {
      setIconsContainerRef(iconsRef);
    }
  }, [isSelected]);

  const handleIconPress = () => {
    if (index !== selectedIndex) {
      onPress(); // select image
    } else {
      setIsTooltipOpen((prev) => !prev); // toggle tooltip
    }
  };

  // Date formatting - use created_at field from API response
  let date;
  if (photo.created_at) {
    // Use the created_at field from the API response
    date = new Date(photo.created_at);
  } else {
    // Fallback to timestamp for backward compatibility
    const ts = photo.timestamp;
    if (ts?.seconds && typeof ts.seconds === 'number') { 
      date = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0)); 
    } else if (ts instanceof Date) { 
      date = ts; 
    } else { 
      date = new Date(ts); 
    }
  }
  
  // Verify we have a valid date before rendering
  if (!(date instanceof Date && !isNaN(date.getTime()))) {
    console.warn(`[PhotoThumbCard] Invalid date for photo ${photo.id}`);
    return null;
  }
  
  return (
    <View style={styles.photoCardContainer}>
        <TouchableOpacity
          onPress={onPress}
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
            
            {/* Maximize button - only show when selected */}
            {isSelected && (
              <TouchableOpacity
                style={styles.thumbMaximizeButton}
                onPress={(e) => {
                  e.stopPropagation(); // Prevent triggering the parent onPress
                  onMaximize?.(photo, index);
                }}
                activeOpacity={0.7}
              >
                <Expand size={13} color={colors.white} />
              </TouchableOpacity>
            )}
          </View>
          <View style={styles.thumbDateContainer}> 
            <Text style={[styles.thumbDateText, isSelected && styles.selectedThumbDateText]}>
              {date.toLocaleString('default', { month: 'short', day: 'numeric' })}
            </Text>
          </View>
        </TouchableOpacity>
        
        {/* Icons container with ref */}
        <View ref={iconsRef} style={styles.iconsContainer}>
          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleIconPress}
            activeOpacity={0.7}
          >
            <Flag
              size={18}
              color={
                routineFlagLoading
                  ? '#D3D3D3' // Disabled during loading
                  : photo.apiData.image.routine_flag
                  ? isSelected
                    ? '#8B7355' // Selected color
                    : '#CCCCCC' // Default color
                  : '#D3D3D3' // No data color
              }
              strokeWidth={2.5}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.iconButton}
            onPress={handleIconPress}
            activeOpacity={0.7}
          >
            <BookOpen
              size={18}
              color={
                summaryLoading
                  ? '#D3D3D3' // Disabled during loading
                  : photo.apiData.image.summary
                  ? isSelected
                    ? '#8B7355' // Selected color
                    : '#CCCCCC' // Default color
                  : '#D3D3D3' // No data color
              }
              strokeWidth={2.5}
            />
          </TouchableOpacity>
        </View>

      </View>
  );
};

const TimeSelector = forwardRef(
  (
    {
      selectedIndex,
      onSelectDate,
      photos,
      onMaximize,
      summaryLoading,
      routineFlagLoading,
    },
    ref
  ) => {
    const flatListRef = useRef(null);
    const [iconsContainerRef, setIconsContainerRef] = useState(null);
    const [isTooltipOpen, setIsTooltipOpen] = useState(false);

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
          viewPosition: 0.45 // Center the item in the viewport
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
        onMaximize={onMaximize}
        summaryLoading={summaryLoading}
        routineFlagLoading={routineFlagLoading}
        setIsTooltipOpen={setIsTooltipOpen}
        setIconsContainerRef={setIconsContainerRef}
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
                  viewPosition: 0.45, // Center the item in the viewport
              });
          }
      }, 50); // 50ms delay
      return () => clearTimeout(timer); // Cleanup timer
    } else if (selectedIndex !== null) {
        console.warn(`[TimeSelector useEffect] Invalid selectedIndex for scroll: ${selectedIndex}. List length: ${photos?.length}`);
    }
  }, [selectedIndex, photos]); // Depend on selectedIndex and photos

  // Find the currently selected photo data for tooltip
  const selectedPhoto = selectedIndex !== null ? photos[selectedIndex] : null;

  const TooltipContent = ({
    selectedPhoto,
    routineFlagLoading,
    summaryLoading,
  }) => {
    const summary = selectedPhoto?.apiData?.image?.summary || null;
    const routineFlag = selectedPhoto?.apiData?.image?.routine_flag || null;

    return (
      <View style={{ alignItems: "center" }}>
        {/* Arrow pointing up */}
        <View
          style={{
            width: 0,
            height: 0,
            borderLeftWidth: 12,
            borderRightWidth: 12,
            borderBottomWidth: 12,
            borderLeftColor: "transparent",
            borderRightColor: "transparent",
            borderBottomColor: "white",
            marginBottom: -1,
            shadowColor: "#000",
            shadowOpacity: 0.1,
            shadowRadius: 2,
            shadowOffset: { width: 0, height: 1 },
            elevation: 8,
          }}
        />
        <View
          style={{
            backgroundColor: "white",
            borderRadius: 12,
            padding: 16,
            shadowColor: "#000",
            shadowOpacity: 0.15,
            shadowRadius: 8,
            shadowOffset: { width: 0, height: 4 },
            elevation: 8,
            borderWidth: 1,
            borderColor: "#E8E8E8",
            maxWidth: 340,
            minWidth: 300,
          }}
        >
          {(routineFlagLoading || summaryLoading) && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "center",
                paddingVertical: 8,
              }}
            >
              <ActivityIndicator size="small" color="#8B7355" />
              <Text style={{ color: "#666", marginLeft: 8, fontSize: 14 }}>
                Loading...
              </Text>
            </View>
          )}
          {!routineFlagLoading && routineFlag && (
            <View
              style={{
                flexDirection: "row",
                alignItems: "flex-start",
                marginBottom: 8,
              }}
            >
              <Flag size={16} color="#8B7355" style={{ marginRight: 6 }} />
              <Text style={{ color: "#333", flex: 1 }}>{routineFlag}</Text>
            </View>
          )}
          {!summaryLoading && summary && (
            <View style={{ flexDirection: "row", alignItems: "flex-start" }}>
              <BookOpen size={16} color="#8B7355" style={{ marginRight: 6 }} />
              <Text style={{ color: "#333", flex: 1 }}>{summary}</Text>
            </View>
          )}
          {!routineFlagLoading &&
            !summaryLoading &&
            !routineFlag &&
            !summary && (
              <View style={{ alignItems: "center", paddingVertical: 8 }}>
                <Text
                  style={{
                    color: "#999",
                    fontSize: 14,
                    fontStyle: "italic",
                  }}
                >
                  No data available
                </Text>
              </View>
            )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.timeSelectorContainer}>
      <FlatList
          ref={flatListRef}
          data={photos} // Use photos array directly as data
          renderItem={(props) => (
            <View key={props.item.id}>
              {renderPhotoThumb(props)}
            </View>
          )}
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
          centerContent={false} // Disable centerContent to allow proper centering with viewPosition
        />
        {/* Note text INSIDE the grey container, below the FlatList */}


        {/* <Text style={styles.noteInsideCarouselArea}>
          {noteText || ' '}
        </Text> */}

        {/* Tooltip anchored to icons container */}
        <Popover
          isVisible={isTooltipOpen}
          from={iconsContainerRef}
          placement="bottom"
          onRequestClose={() => setIsTooltipOpen(false)}
          popoverStyle={{ backgroundColor: "transparent" }}
          overlayStyle={{
            backgroundColor: "rgba(0, 0, 0, 0.7)",
            opacity: 0.7
          }}
        >
          <TooltipContent
            selectedPhoto={selectedPhoto}
            routineFlagLoading={routineFlagLoading}
            summaryLoading={summaryLoading}
          />
        </Popover>
      </View>
  );
});

const getColorForScore = (score) => {
  if (score <= 30) return '#FF3B30'; // Saturated red
  if (score <= 70) return '#FFB340'; // Rich gold
  return '#34C759'; // Vibrant green
};

// Helper to normalize metric values and handle null/zero cases
const normalizeMetricValue = (value, metricName = null, profile = null) => {
  // Check for null, undefined, NaN, or zero
  if (value === null || value === undefined || isNaN(value) || value === 0) {
    return {
      value: 50, // Center position
      color: '#999999', // Grey color
      isNullValue: true
    };
  }

  // For perceived age metric, use age comparison colors
  if (metricName === 'perceivedAge' && profile?.birth_date) {
    const actualAge = calculateActualAge(profile.birth_date);
    const ageComparisonColor = getAgeComparisonColor(value, actualAge);
    return {
      value,
      color: ageComparisonColor,
      isNullValue: false
    };
  }

  // For eye age metric, use eye age comparison colors
  if (metricName === 'eyeAge' && profile?.birth_date) {
    const actualAge = calculateActualAge(profile.birth_date);
    const eyeAgeComparisonColor = getEyeAgeComparisonColor(value, actualAge);
    return {
      value,
      color: eyeAgeComparisonColor,
      isNullValue: false
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

// Calculate user's actual age from birth date
const calculateActualAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

// Get age comparison color for perceived age metric
const getAgeComparisonColor = (perceivedAge, actualAge) => {
  if (!actualAge || !perceivedAge) return '#222'; // Default color if no data
  
  const ageDifference = perceivedAge - actualAge;
  
  if (ageDifference > 5) {
    return '#FF3B30'; // Red - perceived age is more than 5 years greater than actual age
  } else if (ageDifference > 0) {
    return '#FFB340'; // Yellow - perceived age is greater than actual age but within 5 years
  } else {
    return '#34C759'; // Green - perceived age is less than or equal to actual age (good)
  }
};

// Get age comparison color for eye age metric
const getEyeAgeComparisonColor = (eyeAge, actualAge) => {
  if (!actualAge || !eyeAge) return '#222'; // Default color if no data
  
  const ageDifference = eyeAge - actualAge;
  
  if (ageDifference <= 0) {
    return '#34C759'; // Green - eye age is equal to or less than actual age (good)
  } else if (ageDifference < 5) {
    return '#FFB340'; // Yellow - eye age is more than actual age but less than 5 years
  } else {
    return '#FF3B30'; // Red - eye age is more than 5 years greater than actual age
  }
};

// SkinTypeTrendChart component for progress screen
const SkinTypeTrendChart = ({
  photos,
  selectedIndex,
  onDataPointClick,
  scrollPosition,
  forceScrollSyncRef,
}) => {
  const scrollViewRef = useRef(null);
  const [dotPositions, setDotPositions] = useState({});

  // Process photos
  const processedData = photos
    .map((photo) => {
      let dateValue;
      if (photo.created_at) {
        dateValue = new Date(photo.created_at);
      } else {
        const ts = photo.timestamp;
        if (ts?.seconds && typeof ts.seconds === "number") {
          dateValue = new Date(
            ts.seconds * 1000 +
              (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0)
          );
        } else if (ts instanceof Date) {
          dateValue = ts;
        } else {
          dateValue = new Date(ts);
        }
      }

      if (!(dateValue instanceof Date && !isNaN(dateValue.getTime()))) {
        return null;
      }

      return {
        photoId: photo.id,
        date: dateValue,
        skinType: photo.metrics?.skinType || null,
      };
    })
    .filter((item) => item !== null);

  if (!processedData.length) {
    return (
      <Text style={{ textAlign: "center", marginTop: 20 }}>
        No skin type data available.
      </Text>
    );
  }

  // Skin type mapping
  const skinTypeMap = {
    Oily: 1,
    Combinational: 2,
    Normal: 3,
    Dry: 4,
  };

  const SKIN_TYPES = ["Dry", "Normal", "Combinational", "Oily"];

  const realData = processedData.map((item) => {
    if (!item.skinType || item.skinType === "Unknown") return 2;
    return skinTypeMap[item.skinType] || 2;
  });

  console.log("🔵 realData of SkinTypeTrendChart: in MetricsSeries.js", realData);

  const chartData = {
    labels: processedData.map((_, index) => `${index + 1}`),
    datasets: [
      {
        data: realData,
        color: () => `#8b7ba8`,
        strokeWidth: 3,
      },
      {
        data: [1, 4], // scaling dataset
        color: () => `transparent`,
        withDots: false,
        strokeWidth: 0,
      },
    ],
  };
  console.log("processedData of SkinTypeTrendChart: in MetricsSeries.js", processedData.length);

  const screenWidth = Dimensions.get("window").width;
  const POINT_SPACING = 16;
  const chartWidth = Math.max(processedData.length * POINT_SPACING, screenWidth - 32);
  const CHART_HEIGHT = 160;

  // Sync scroll position
  useEffect(() => {
    if (
      scrollViewRef.current &&
      scrollPosition !== undefined &&
      scrollPosition >= 0 &&
      processedData.length > 0
    ) {
      if (scrollPosition === 0 && selectedIndex !== 0) return;

      const rightPadding = 120;
      const totalContentWidth = chartWidth + rightPadding;
      const viewportWidth = screenWidth;
      const maxScrollPosition = Math.max(
        0,
        totalContentWidth - viewportWidth
      );
      const boundedScrollPosition = Math.min(
        scrollPosition,
        maxScrollPosition
      );

      setTimeout(() => {
        scrollViewRef.current.scrollTo({
          x: boundedScrollPosition,
          animated: !forceScrollSyncRef?.current,
        });
      }, forceScrollSyncRef?.current ? 0 : 50);
    }
  }, [scrollPosition, selectedIndex, processedData.length, chartWidth]);

  useEffect(() => {
    if (forceScrollSyncRef?.current) {
      const timer = setTimeout(() => {
        if (forceScrollSyncRef) {
          console.log("[SkinTypeTrendChart] Clearing force scroll flag");
          forceScrollSyncRef.current = false;
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [forceScrollSyncRef?.current]);

  // Record dot positions
  const renderDotContent = ({ x, y, index }) => {
    console.log("🔵 renderDotContent of SkinTypeTrendChart: in MetricsSeries.js", x, y, index);
    setDotPositions((prev) => {
      if (prev[index]) return prev;
      return { ...prev, [index]: { x, y } };
    });
    return null;
  };

  console.log("🔵 dotPositions of SkinTypeTrendChart: in MetricsSeries.js", dotPositions);

  // Decorator for line + enlarged dot
  const decorator = () => {
    if (selectedIndex == null || !(selectedIndex in dotPositions)) return null;

    const { x, y } = dotPositions[selectedIndex];

    console.log("🔵 decorator of SkinTypeTrendChart: in MetricsSeries.js", x, y);

    return (
      <Svg>
        {/* Vertical line */}
        <SvgLine
          x1={x}
          y1={0}
          x2={x}
          y2={CHART_HEIGHT}
          stroke="rgba(139,123,168,0.6)"
          strokeWidth={2}
          strokeDasharray={[4, 4]}
        />
        {/* Enlarged dot */}
        <SvgCircle
          cx={x}
          cy={y}
          r={8}
          fill="#8b7ba8"
          stroke="white"
          strokeWidth={2}
        />
      </Svg>
    );
  };

  const renderYAxisLabels = () => (
    <View
      style={{
        flexDirection: "column",
        gap: 10,
        paddingHorizontal: 4,
      }}
    >
      {SKIN_TYPES.map((skinType) => (
        <View
          key={skinType}
          style={{
            backgroundColor: "white",
            borderWidth: 1,
            borderColor: "rgba(0,0,0,0.1)",
            borderRadius: 16,
            paddingHorizontal: 10,
            paddingVertical: 7,
            alignSelf: "flex-start",
            opacity: 0.7,
          }}
        >
          <Text style={{ fontSize: 12, color: "#333", fontWeight: "500" }}>
            {skinType}
          </Text>
        </View>
      ))}
    </View>
  );

  return (
    <View style={{  }}>
      {/* Selected indicator */}
      {/* {selectedIndex !== null && processedData[selectedIndex] && (
        <View
          style={{
            alignSelf: "center",
            marginBottom: 10,
            backgroundColor: "#f2f2f2",
            padding: 8,
            borderRadius: 12,
          }}
        >
          <Text style={{ fontWeight: "bold", color: "#8b7ba8" }}>
            {processedData[selectedIndex].skinType || "Unknown"}
          </Text>
        </View>
      )} */}

      <ScrollView
        ref={scrollViewRef}
        horizontal
        showsHorizontalScrollIndicator={false}
       // contentContainerStyle={{ minWidth: screenWidth }}
        style={{ height: CHART_HEIGHT, marginRight: 10 }}
      >
        <LineChart
          data={chartData}
          width={chartWidth}
          height={CHART_HEIGHT}
          chartConfig={{
            backgroundColor: "#fff",
            backgroundGradientFrom: "#fff",
             backgroundGradientTo: "#fff",
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(110, 70, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            propsForDots: {
              r: "6",
              strokeWidth: "2",
              stroke: "#fff",
              fill: "#8b7ba8",
            },
            propsForBackgroundLines: {
              strokeDasharray: "",
              stroke: "#E0E0E0",
            },
          }}
          bezier
          withVerticalLabels={false}
          withHorizontalLabels={false}
          withInnerLines={true}
          withOuterLines={false}
          yLabelsOffset={0}
          withDots={true}
          withShadow={false}
          withVerticalLines={false}
          withHorizontalLines={true}
          segments={3}
          fromZero={false}
          yAxisInterval={1}
          decorator={decorator}
          renderDotContent={renderDotContent}
          onDataPointClick={(data) => {
            if (onDataPointClick) onDataPointClick(data.index);
          }}
        />
      </ScrollView>

      <View style={{ position: "absolute", left: 0, top: 0 }}>
        {renderYAxisLabels()}
      </View>
    </View>
  );
};

const MetricRow = ({ metric, selectedIndex, onDotPress, scrollPosition, forceScrollSyncRef, photos, profile }) => {
  if (!metric?.scores?.length) return null;

  const scrollViewRef = useRef(null);

  // Special handling for skin type - render SkinTypeTrendChart instead of bar chart
  if (metric.metricName === 'skinType') {
    console.log('inside of skin typemetric from MetricRow');
    return (
      <View style={styles.card2}>
        {/* Title Section */}
        <View style={styles.titleRow}>
          <TouchableOpacity
            style={{flexDirection: 'row', alignItems: 'center'}}
            onPress={() => {
              // Navigate to metric detail with proper parameters
              if (selectedIndex !== null && photos[selectedIndex]) {
                const selectedPhoto = photos[selectedIndex];
                console.log('Navigating to metric detail from MetricsSeries (skin type):', {
                  metricKey: metric.metricName,
                  metricValue: metric.scores[selectedIndex]?.score,
                  photoId: selectedPhoto.id
                });
                
                router.push({
                  pathname: '/(authenticated)/metricDetail',
                  params: {
                    maskResults: selectedPhoto?.maskResults,
                    maskImages: selectedPhoto?.maskImages,
                    metricKey: metric.metricName,
                    metricValue: metric.scores[selectedIndex]?.score,
                    photoData: JSON.stringify(selectedPhoto)
                  }
                });
              } else {
                // Fallback if no photo is selected - use the first photo
                const firstPhoto = photos[0];
                if (firstPhoto) {
                  console.log('Navigating to metric detail from MetricsSeries (skin type fallback):', {
                    metricKey: metric.metricName,
                    metricValue: metric.scores[0]?.score,
                    photoId: firstPhoto.id
                  });
                  
                  router.push({
                    pathname: '/(authenticated)/metricDetail',
                    params: {
                      maskResults: firstPhoto?.maskResults,
                      maskImages: firstPhoto?.maskImages,
                      metricKey: metric.metricName,
                      metricValue: metric.scores[0]?.score,
                      photoData: JSON.stringify(firstPhoto)
                    }
                  });
                }
              }
            }}
          >
            <Text style={styles.categoryText}>{METRIC_LABELS[metric.metricName] || metric.metricName}</Text>
            <ChevronRightIcon size={16} color="#8B7355" strokeWidth={3}/>
          </TouchableOpacity>
        </View>
        
        {/* Skin Type Chart */}
        <View style={styles.dataSection}>
          <SkinTypeTrendChart 
            photos={photos}
            selectedIndex={selectedIndex}
            onDataPointClick={onDotPress}
            scrollPosition={scrollPosition}
            forceScrollSyncRef={forceScrollSyncRef}
          />
        </View>
      </View>
    );
  }

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
        <TouchableOpacity
        style={{flexDirection: 'row', alignItems: 'center'}}
        onPress={() => {
  // Navigate to metric detail with proper parameters
  if (selectedIndex !== null && photos[selectedIndex]) {
    const selectedPhoto = photos[selectedIndex];
    console.log('Navigating to metric detail from MetricsSeries:', {
      metricKey: metric.metricName,
      metricValue: metric.scores[selectedIndex]?.score,
      photoId: selectedPhoto.id
    });
    
    router.push({
      pathname: '/(authenticated)/metricDetail',
      params: {
        maskResults: selectedPhoto?.maskResults,
        maskImages: selectedPhoto?.maskImages,
        metricKey: metric.metricName,
        metricValue: metric.scores[selectedIndex]?.score,
        photoData: JSON.stringify(selectedPhoto)
      }
    });
  } else {
    // Fallback if no photo is selected - use the first photo
    const firstPhoto = photos[0];
    if (firstPhoto) {
      console.log('Navigating to metric detail from MetricsSeries (fallback):', {
        metricKey: metric.metricName,
        metricValue: metric.scores[0]?.score,
        photoId: firstPhoto.id
      });
      
      router.push({
        pathname: '/(authenticated)/metricDetail',
        params: {
          maskResults: firstPhoto?.maskResults,
          maskImages: firstPhoto?.maskImages,
          metricKey: metric.metricName,
          metricValue: metric.scores[0]?.score,
          photoData: JSON.stringify(firstPhoto)
        }
      });
    }
  }
}}>
          <Text style={styles.categoryText}>{METRIC_LABELS[metric.metricName] || metric.metricName}</Text>
          <ChevronRightIcon size={16} color="#8B7355" strokeWidth={3}/>
        </TouchableOpacity>
        <View style={styles.metricStatsContainer}>
          {mockAverage !== null && (
            <Text style={styles.averageText}>Average Score:{mockAverage}</Text>
          )}
          {/* {percentChange !== null && (
            <Text style={[
              styles.percentChangeText,
              percentChange >= 0 ? styles.positiveChange : styles.negativeChange
            ]}>
              {percentChange >= 0 ? '+' : ''}{percentChange}%
            </Text>
          )} */}
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
              const normalizedMetric = normalizeMetricValue(scoreData.score, metric.metricName, profile);
              
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
  const [summary, setSummary] = useState(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [routineFlag, setRoutineFlag] = useState(null);
  const [routineFlagLoading, setRoutineFlagLoading] = useState(false);
  // Removed showContent state - loading is now handled by parent component
  const { metrics, timestamps } = processPhotoMetrics(photos);
  const timeSelectorRef = useRef(null);
  const initialSelectionDoneRef = useRef(false);
  const lastTapTimeRef = useRef(0);
  const forceScrollSyncRef = useRef(false);
  const { setSelectedSnapshot } = usePhotoContext(); // Use photo context
  const router = useRouter(); // Use router
  const { profile } = useAuthStore(); // Get user profile for age comparison

  console.log(metrics,'metrics from MetricsSeries');

  // Removed loading overlay timeout - loading is now handled by parent component

  // Debug renders
  // useEffect(() => {
  //   console.log(`[MetricsSeries] Render state:`, {
  //     photosLength: photos.length,
  //     selectedIndex,
  //     metricsLength: metrics?.length,
  //     timestampsLength: timestamps?.length,
  //     initialSelectionDone: initialSelectionDoneRef.current
  //   });
  // }, [selectedIndex]); // Only log when these key states change

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

  const handleMaximize = (photo, index) => {
    // Navigate to snapshot using same pattern as PhotoGrid
    // Don't remove .jpg - use the photo.id directly like PhotoGrid does
    const photoId = photo.id;
    
    // Convert timestamp to the required format: 'Thu Jul 24 2025 12:01:59 GMT+0530'
    let timestampParam = null;
    if (photo.timestamp) {
      const ts = photo.timestamp;
      let dateObj;
      
      if (ts?.seconds && typeof ts.seconds === 'number') {
        // Firestore Timestamp
        dateObj = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
      } else if (ts instanceof Date) {
        // Already a JS Date
        dateObj = ts;
      } else {
        // Attempt conversion from string/number
        dateObj = new Date(ts);
      }
      
      // Format to the required format: 'Thu Jul 24 2025 12:01:59 GMT+0530'
      if (dateObj instanceof Date && !isNaN(dateObj.getTime())) {
        timestampParam = dateObj.toString();
      }
    }

    // Store photo in context for snapshot screen - include apiData like PhotoGrid does
    setSelectedSnapshot({
      id: photoId,
      url: photo.storageUrl,
      storageUrl: photo.storageUrl,
      threadId: photo.threadId,
      apiData: {
        created_at: timestampParam // Add the timestamp as created_at to match PhotoGrid structure
      }
    });


    console.log('🔵 photoId from MetricsSeries:', photo);

    // Navigate to snapshot screen
    router.push({ 
      pathname: '/snapshot', 
      params: { 
        photoId: photo.hautUploadData?.imageId, 
        imageId: photo.hautUploadData?.imageId, // Use photo.id directly - this should be the image_id from API
        thumbnailUrl: photo.storageUrl, 
        localUri: photo.storageUrl, 
        fromPhotoGrid: 'true', 
        timestamp: timestampParam // Use the properly formatted ISO string
      }
    });
  };

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

  // Update summary and routine flag when selectedIndex changes
  // Data now comes directly from the API response, no separate API calls needed
  useEffect(() => {
    if (selectedIndex !== null && photos[selectedIndex]) {
      const selectedPhoto = photos[selectedIndex];
      console.log("🔵 selectedPhoto: in MetricsSeries", selectedPhoto);

      // Summary and routine flag are already available in the photo data
      // No loading states needed since data is already loaded
      setSummary(selectedPhoto.apiData.image.summary || null);
      setRoutineFlag(selectedPhoto.apiData.image.routine_flag || null);
      setSummaryLoading(false);
      setRoutineFlagLoading(false);
    } else {
      setSummary(null);
      setRoutineFlag(null);
      setSummaryLoading(false);
      setRoutineFlagLoading(false);
    }
  }, [selectedIndex, photos]);

  // Close height when no tooltips should be open
  // useEffect(() => {
  //   // Only close height if no image is selected
  //   if (selectedIndex === null) {
  //     setTimeout(() => {
  //       setIsTooltipOpen(false);
  //     }, 200); // Longer delay to allow for smooth transitions
  //   }
  // }, [selectedIndex]);

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
  const noteText = selectedIndex !== null && photos[selectedIndex] ? photos[selectedIndex].summary || "" : "";

  return (
    <View style={styles.container}>
      {/* Main content - always rendered */}
      <TimeSelector
        selectedIndex={selectedIndex}
        onSelectDate={handleDotPress}
        photos={photos}
        ref={timeSelectorRef}
        noteText={noteText} // Pass the summary/note text down
        onMaximize={handleMaximize}
        summaryLoading={summaryLoading}
        routineFlagLoading={routineFlagLoading}
      />
      <ScrollView style={[styles.metricsContainer, { zIndex: 1 }]}>
        {metrics.map((metric, index) => (
          <MetricRow
            key={index}
            metric={metric}
            selectedIndex={selectedIndex}
            onDotPress={handleDotPress}
            scrollPosition={scrollPosition}
            forceScrollSyncRef={forceScrollSyncRef}
            photos={photos}
            profile={profile}
          />
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: width,
    backgroundColor: '#FAFAFA',
  },
  card: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
   //height: 300,
  },
  card2: {
    backgroundColor: 'white',
    marginHorizontal: 16,
    marginVertical: 6,
    padding: 16,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#F5F5F5',
   height: 227,
  },
  categoryText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2C2C2C',
    letterSpacing: 0.3,
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
    backgroundColor: '#FAFAFA', // Clean white background
   // borderBottomWidth: 1,
   // borderBottomColor: '#E5E5E5',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    paddingVertical:10,
    overflow: 'visible',
    height: 245, // Fixed height for consistent layout
    position: 'relative', // Ensure relative positioning for absolute tooltip
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
    paddingRight: 200, // Add extra right padding to allow last items to center
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
   // flex: 1,
    paddingTop: 16,
    paddingBottom: 20,
    backgroundColor: '#FAFAFA',
    zIndex:5
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
    backgroundColor: '#f8f8f8',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 }, // Negative height for top shadow only
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  selectedPhotoThumbCard: {
    shadowColor: '#8B7355',
    shadowOffset: { width: 0, height: -4 }, // Negative height for top shadow only
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
    zIndex: 10,
    borderWidth: 2,
    borderColor: '#8B7355',
    marginTop: -8, // Lift up by reducing top margin
    height: DATE_CARD_HEIGHT + 8, // Increase height to maintain bottom alignment
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
    color: colors.primary, // Changed to white for dark background
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
    fontSize: 13,
    fontWeight: '500',
    color: '#8B7355',
   // marginRight: 12,
    backgroundColor: '#8B735510',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  percentChangeText: {
    fontSize: 13,
    fontWeight: '600',
    marginRight: 2,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  positiveChange: {
    color: '#22C55E',
    backgroundColor: '#22C55E15',
  },
  negativeChange: {
    color: '#EF4444',
    backgroundColor: '#EF444415',
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
    marginLeft: 24,
  },
  
  // Thumbnail Maximize Button Styles
  thumbMaximizeButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 14,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    ...shadows.sm,
  },
  
  // New styles for the design
  photoCardContainer: {
    alignItems: 'center',
    zIndex: 100, // Ensure it’s above other elements
    overflow: 'visible', // Allow children to overflow
  },
  iconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 0,
  },
  iconButton: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: 'transparent',
  },
  tooltip: {
    position: 'absolute',
    top: DATE_CARD_HEIGHT + 20, // Position below the image card
    left: -20,
    right: -20,
    backgroundColor: '#f8f8f8',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    zIndex: 9999,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 8,
    minWidth: 80,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  tooltipText: {
    color: '#333',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
  // Skin Type Chart Styles
  skinTypeChartContainer: {
    position: 'relative',
   // height: 200,
   // backgroundColor: '#F8F8F8',
    borderRadius: 16,
   // marginVertical: 8,
  },
  skinTypeFloatingYAxis: {
    position: 'absolute',
    left: 0,
    top: 0,
    justifyContent: 'space-between',
    zIndex: 10,
  },
  skinTypeYAxisContainer: {
    flexDirection: 'column',
    justifyContent: 'space-between',
    height: '100%',
  },
  skinTypeLabelContainer: {
    backgroundColor: 'white',
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.1)',
    borderRadius: 16,
    paddingHorizontal: 10,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    opacity: 0.7,
  },
  skinTypeLabel: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  trendPlaceholderText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
    fontStyle: 'italic',
  },
  skinTypeSelectedIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'white',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    zIndex: 20,
  },
  skinTypeSelectedValue: {
    fontSize: 12,
    color: '#333',
    fontWeight: '600',
  },
});

export default MetricsSeries;