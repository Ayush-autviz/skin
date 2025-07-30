// maskViewer.js
// Full-screen mask viewer with scrollable mask images and zoom functionality

/* ------------------------------------------------------
WHAT IT DOES
- Displays all available mask images for a photo in a scrollable view
- Shows background photo with SVG mask overlays
- Provides zoom functionality for each mask
- Includes navigation indicators at the bottom
- Allows users to swipe between different mask types

DATA USED
- photoData: Full photo document with mask images and original photo
- maskImages: Array of mask image data with skin condition names and URLs

DEVELOPMENT HISTORY
- Created for enhanced mask visualization experience
------------------------------------------------------*/

import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Image,
  Dimensions,
  PanGestureHandler,
  PinchGestureHandler,
  Animated
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import SvgUri from 'react-native-svg-uri';
import { 
  PinchGestureHandler as RNGHPinchGestureHandler, 
  PanGestureHandler as RNGHPanGestureHandler, 
  State 
} from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Sanitize S3 URI function
const sanitizeS3Uri = (uriString) => {
  if (!uriString) return uriString;
  return uriString.replace(/\+/g, '%2B').replace(/ /g, '%20');
};

// Helper function to format mask condition names for display
const formatConditionName = (conditionName) => {
  if (!conditionName) return 'None';
  
  const nameMap = {
    'redness': 'Redness',
    'hydration': 'Hydration', 
    'eye_bags': 'Eye Bags',
    'pores': 'Pores',
    'acne': 'Acne',
    'lines': 'Lines',
    'translucency': 'Translucency',
    'pigmentation': 'Pigmentation',
    'uniformness': 'Uniformness'
  };
  
  return nameMap[conditionName] || conditionName.charAt(0).toUpperCase() + conditionName.slice(1);
};

// Individual mask image component with zoom functionality
const ZoomableMaskImage = ({ photoUri, maskUri, conditionName }) => {
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  const baseScale = useRef(1);
  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);
  
  const [currentScale, setCurrentScale] = useState(1);
  
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  
  // Reset zoom
  const resetZoom = () => {
    baseScale.current = 1;
    baseTranslateX.current = 0;
    baseTranslateY.current = 0;
    
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, useNativeDriver: true }),
      Animated.spring(translateX, { toValue: 0, useNativeDriver: true }),
      Animated.spring(translateY, { toValue: 0, useNativeDriver: true })
    ]).start();
    
    setCurrentScale(1);
  };
  
  // Handle pinch gesture
  const onPinchEvent = Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: false }
  );
  
  const onPinchStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const newScale = Math.max(1, Math.min(3, baseScale.current * event.nativeEvent.scale));
      baseScale.current = newScale;
      setCurrentScale(newScale);
      scale.setValue(newScale);
    }
  };
  
  // Handle pan gesture
  const onPanEvent = Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false }
  );
  
  const onPanStateChange = (event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      baseTranslateX.current += event.nativeEvent.translationX;
      baseTranslateY.current += event.nativeEvent.translationY;
      
      const maxTranslate = (currentScale - 1) * 100;
      baseTranslateX.current = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateX.current));
      baseTranslateY.current = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateY.current));
      
      translateX.setValue(baseTranslateX.current);
      translateY.setValue(baseTranslateY.current);
    }
  };
  
  return (
    <View style={styles.maskImageContainer}>
      <RNGHPinchGestureHandler
        ref={pinchRef}
        onGestureEvent={onPinchEvent}
        onHandlerStateChange={onPinchStateChange}
        simultaneousHandlers={[panRef]}
      >
        <RNGHPanGestureHandler
          ref={panRef}
          onGestureEvent={onPanEvent}
          onHandlerStateChange={onPanStateChange}
          enabled={currentScale > 1}
          simultaneousHandlers={[pinchRef]}
        >
          <Animated.View style={styles.zoomContainer}>
            {/* Background Image */}
            <Animated.Image
              source={{ uri: sanitizeS3Uri(photoUri) }}
              style={[
                styles.backgroundImage,
                {
                  transform: [
                    { scale: scale },
                    { translateX: translateX },
                    { translateY: translateY }
                  ]
                }
              ]}
              resizeMode="cover"
            />
            
            {/* SVG Overlay */}
            {maskUri && (
              <Animated.View 
                style={[
                  styles.svgOverlay,
                  {
                    transform: [
                      { scale: scale },
                      { translateX: translateX },
                      { translateY: translateY }
                    ]
                  }
                ]}
              >
                <SvgUri
                  width="100%"
                  height="100%"
                  source={{ uri: sanitizeS3Uri(maskUri) }}
                  onError={(error) => {
                    console.log('🔴 Error loading SVG mask:', error);
                  }}
                />
              </Animated.View>
            )}
            
            {/* Reset zoom button */}
            {currentScale > 1 && (
              <TouchableOpacity
                style={styles.resetZoomButton}
                onPress={resetZoom}
              >
                <Feather name="minimize-2" size={20} color="white" />
              </TouchableOpacity>
            )}
          </Animated.View>
        </RNGHPanGestureHandler>
      </RNGHPinchGestureHandler>
    </View>
  );
};

export default function MaskViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Parse the photoData
  const parsedPhotoData = typeof params.photoData === 'string' 
    ? JSON.parse(params.photoData) 
    : params.photoData;
  
  const [currentIndex, setCurrentIndex] = useState(0);
  const scrollViewRef = useRef(null);
  
  // Prepare mask data - add "None" option at the beginning
  const maskOptions = [
    { skin_condition_name: 'none', mask_img_url: null, displayName: 'None' },
    ...(parsedPhotoData?.maskImages || []).map(mask => ({
      ...mask,
      displayName: formatConditionName(mask.skin_condition_name)
    }))
  ];
  
  console.log('🔵 MaskViewer - Available masks:', maskOptions.length);
  console.log('🔵 MaskViewer - Photo URI:', parsedPhotoData?.storageUrl);
  
  // Handle scroll to specific mask
  const scrollToMask = (index) => {
    setCurrentIndex(index);
    scrollViewRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true
    });
  };
  
  // Handle scroll end
  const handleScrollEnd = (event) => {
    const contentOffset = event.nativeEvent.contentOffset;
    const index = Math.round(contentOffset.x / SCREEN_WIDTH);
    setCurrentIndex(index);
  };
  
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      
      {/* Header with close button */}
      <View style={styles.header}>
        <TouchableOpacity 
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <Feather name="x" size={24} color="white" />
        </TouchableOpacity>
      </View>
      
      {/* Main scrollable content */}
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={handleScrollEnd}
        style={styles.scrollView}
      >
        {maskOptions.map((maskOption, index) => (
          <View key={index} style={styles.maskPage}>
            <ZoomableMaskImage
              photoUri={parsedPhotoData?.storageUrl}
              maskUri={maskOption.mask_img_url}
              conditionName={maskOption.skin_condition_name}
            />
          </View>
        ))}
      </ScrollView>
      
      {/* Bottom navigation indicators */}
      <View style={styles.bottomNavigation}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.navigationContent}
        >
          {maskOptions.map((maskOption, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.navigationItem,
                index === currentIndex && styles.navigationItemActive
              ]}
              onPress={() => scrollToMask(index)}
            >
              <Text style={[
                styles.navigationText,
                index === currentIndex && styles.navigationTextActive
              ]}>
                {maskOption.displayName}
              </Text>
              {index === currentIndex && <View style={styles.activeIndicator} />}
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  header: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 100,
    zIndex: 100,
    justifyContent: 'flex-end',
    alignItems: 'flex-end',
    paddingRight: 20,
    paddingBottom: 10,
  },
  closeButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  maskPage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  maskImageContainer: {
    width: SCREEN_WIDTH - 40,
    height: SCREEN_WIDTH - 40,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
  },
  zoomContainer: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
  },
  resetZoomButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  bottomNavigation: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
  },
  navigationContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
  },
  navigationItem: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginHorizontal: 4,
    borderRadius: 20,
    minWidth: 80,
    alignItems: 'center',
    position: 'relative',
  },
  navigationItemActive: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  navigationText: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
  },
  navigationTextActive: {
    color: 'white',
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: 4,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 2,
    backgroundColor: 'white',
    borderRadius: 1,
  },
}); 