import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  StatusBar,
  Image,
  Dimensions,
  ActivityIndicator
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { X, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedScrollHandler,
  useAnimatedGestureHandler,
  withSpring,
  withTiming,
  interpolate,
  runOnJS,
  useDerivedValue,
  interpolateColor
} from 'react-native-reanimated';
import {
  PinchGestureHandler,
  PanGestureHandler,
  TapGestureHandler,
  GestureHandlerRootView
} from 'react-native-gesture-handler';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ConditionalImage } from '../../src/utils/imageUtils';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH - 40;
const TAB_HEIGHT = 50;
const MIN_SCALE = 1;
const MAX_SCALE = 4;

// App colors (from auth screens)
const colors = {
  primary: '#8B7355',
  background: '#FFFFFF',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  error: '#FF6B6B',
};

// Enhanced spring config for smooth animations
const springConfig = {
  damping: 15,
  stiffness: 150,
  mass: 1,
  overshootClamping: false,
  restDisplacementThreshold: 0.01,
  restSpeedThreshold: 0.01,
};

// Sanitize S3 URI function
const sanitizeS3Uri = (uriString) => {
  if (!uriString) return uriString;
  return uriString.replace(/\+/g, '%2B').replace(/ /g, '%20');
};

// Helper function to format mask condition names for display
const formatConditionName = (conditionName) => {
  if (!conditionName) return 'Original';
  
  const nameMap = {
    'none': 'Original',
    'redness': 'Redness',
    'hydration': 'Hydration', 
    'eye_bags': 'Eye Bags',
    'pores': 'Pores',
    'acne': 'Acne',
    'lines': 'Fine Lines',
    'translucency': 'Translucency',
    'pigmentation': 'Pigmentation',
    'uniformness': 'Uniformness'
  };
  
  return nameMap[conditionName] || conditionName.charAt(0).toUpperCase() + conditionName.slice(1);
};

// Enhanced zoomable mask image component
const ZoomableMaskImage = ({ photoUri, maskUri, conditionName, isActive }) => {
  const scale = useSharedValue(1);
  const translateX = useSharedValue(0);
  const translateY = useSharedValue(0);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [maskLoaded, setMaskLoaded] = useState(true);

  const pinchRef = useRef();
  const panRef = useRef();
  const doubleTapRef = useRef();

  // Reset zoom when switching images
  useEffect(() => {
    if (!isActive) {
      scale.value = withSpring(1, springConfig);
      translateX.value = withSpring(0, springConfig);
      translateY.value = withSpring(0, springConfig);
    }
  }, [isActive]);

  // Pinch gesture handler
  const pinchGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startScale = scale.value;
    },
    onActive: (event, context) => {
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, context.startScale * event.scale));
      scale.value = newScale;
    },
    onEnd: () => {
      if (scale.value < MIN_SCALE) {
        scale.value = withSpring(MIN_SCALE, springConfig);
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
      } else if (scale.value > MAX_SCALE) {
        scale.value = withSpring(MAX_SCALE, springConfig);
      }
    },
  });

  // Pan gesture handler
  const panGestureHandler = useAnimatedGestureHandler({
    onStart: (_, context) => {
      context.startX = translateX.value;
      context.startY = translateY.value;
    },
    onActive: (event, context) => {
      if (scale.value > 1) {
        const maxTranslate = (scale.value - 1) * (IMAGE_SIZE / 2);
        translateX.value = Math.max(-maxTranslate, Math.min(maxTranslate, context.startX + event.translationX));
        translateY.value = Math.max(-maxTranslate, Math.min(maxTranslate, context.startY + event.translationY));
      }
    },
    onEnd: () => {
      if (scale.value <= 1) {
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
      }
    },
  });

  // Double tap to zoom
  const doubleTapGestureHandler = useAnimatedGestureHandler({
    onActive: () => {
      if (scale.value > 1) {
        scale.value = withSpring(1, springConfig);
        translateX.value = withSpring(0, springConfig);
        translateY.value = withSpring(0, springConfig);
      } else {
        scale.value = withSpring(2, springConfig);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { scale: scale.value },
      { translateX: translateX.value },
      { translateY: translateY.value },
    ],
  }));

  const resetZoom = () => {
    scale.value = withSpring(1, springConfig);
    translateX.value = withSpring(0, springConfig);
    translateY.value = withSpring(0, springConfig);
  };

  const isLoading = !imageLoaded || !maskLoaded;

  return (
    <View style={styles.maskImageContainer}>
      {isLoading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      )}
      
      <GestureHandlerRootView style={styles.gestureContainer}>
        <PanGestureHandler
          ref={panRef}
          onGestureEvent={panGestureHandler}
          simultaneousHandlers={[pinchRef]}
          minPointers={1}
          maxPointers={1}
          avgTouches
        >
          <Animated.View style={styles.gestureWrapper}>
            <PinchGestureHandler
              ref={pinchRef}
              onGestureEvent={pinchGestureHandler}
              simultaneousHandlers={[panRef]}
            >
              <Animated.View style={styles.gestureWrapper}>
                <TapGestureHandler
                  ref={doubleTapRef}
                  onGestureEvent={doubleTapGestureHandler}
                  numberOfTaps={2}
                >
                  <Animated.View style={[styles.imageWrapper, animatedStyle]}>
                    {/* Check if maskUri is SVG or regular image */}
                    {maskUri && maskUri.toLowerCase().includes('.svg') ? (
                      // For SVG masks, show background image with mask overlay
                      <>
                        <Image
                          source={{ uri: sanitizeS3Uri(photoUri) }}
                          style={styles.backgroundImage}
                          resizeMode="cover"
                          onError={(error) => {
                            console.log('🔴 Error loading background image:', error.nativeEvent.error);
                          }}
                          onLoad={() => {
                            console.log('✅ Background image loaded successfully');
                            setImageLoaded(true)
                          }}
                        />
                        
                        <ConditionalImage
                          source={{ uri: sanitizeS3Uri(maskUri) }}
                          style={styles.maskOverlay}
                          resizeMode="cover"
                          onLoad={() => setMaskLoaded(true)}
                        />
                      </>
                    ) : maskUri ? (
                      // For non-SVG masks, show only the mask image
                      <Image
                        source={{ uri: sanitizeS3Uri(maskUri) }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('🔴 Error loading mask image:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('✅ Mask image loaded successfully');
                          setImageLoaded(true)
                        }}
                      />
                    ) : (
                      // For original (no mask), show background image
                      <Image
                        source={{ uri: sanitizeS3Uri(photoUri) }}
                        style={styles.backgroundImage}
                        resizeMode="cover"
                        onError={(error) => {
                          console.log('🔴 Error loading background image:', error.nativeEvent.error);
                        }}
                        onLoad={() => {
                          console.log('✅ Background image loaded successfully');
                          setImageLoaded(true)
                        }}
                      />
                    )}
                  </Animated.View>
                </TapGestureHandler>
              </Animated.View>
            </PinchGestureHandler>
          </Animated.View>
        </PanGestureHandler>
      </GestureHandlerRootView>


    </View>
  );
};

export default function MaskViewerScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  const parsedPhotoData = typeof params.photoData === 'string' 
    ? JSON.parse(params.photoData) 
    : params.photoData;

  const scrollX = useSharedValue(0);
  const currentIndex = useSharedValue(0);
  const [activeIndex, setActiveIndex] = useState(0);

  // Prepare mask data
  const maskOptions = [
    { skin_condition_name: 'none', mask_img_url: null, displayName: 'Original', image_url: parsedPhotoData?.maskImages[0]?.image_url },
    ...(parsedPhotoData?.maskImages || []).map((mask) => ({
      ...mask,
      displayName: formatConditionName(mask.skin_condition_name)
    }))
  ];

  console.log('🔵 maskOptions:', maskOptions);

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x;
      const index = Math.round(event.contentOffset.x / SCREEN_WIDTH);
      if (index !== currentIndex.value) {
        currentIndex.value = index;
        runOnJS(setActiveIndex)(index);
      }
    },
  });

  const scrollToIndex = (index) => {
    scrollRef.current?.scrollTo({
      x: index * SCREEN_WIDTH,
      animated: true
    });
    // navigationScrollRef.current?.scrollTo({
    //   x: index * 60,
    //   animated: true
    // });
  };

  const scrollRef = useRef();
  const navigationScrollRef = useRef();

  return (
    <SafeAreaView style={styles.container}>
    <GestureHandlerRootView style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />
      
      {/* Header */}
      <SafeAreaView  style={styles.headerContainer}>
        <BlurView intensity={20} style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Skin Analysis</Text>
            <TouchableOpacity 
              style={styles.closeButton}
              onPress={() => router.back()}
            >
              <X size={24} color="white" />
            </TouchableOpacity>
          </View>
        </BlurView>
      </SafeAreaView>

      {/* Main content */}
      <View style={styles.mainContent}>
        <Animated.ScrollView
          ref={scrollRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          decelerationRate="fast"
          snapToInterval={SCREEN_WIDTH}
          snapToAlignment="center"
        >
          {maskOptions.map((maskOption, index) => (
            <View key={index} style={styles.maskPage}>
              <ZoomableMaskImage
                photoUri={maskOption?.image_url}
                maskUri={maskOption.mask_img_url}
                conditionName={maskOption.skin_condition_name}
                isActive={index === activeIndex}
              />
              
              {/* Zoom controls - positioned just below the image */}
              <View style={styles.zoomControlsContainer}>
                <Animated.View style={[styles.zoomControls, { opacity: index === activeIndex ? 1 : 0 }]}>
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => {
                      // Zoom out functionality would need to be passed down or managed differently
                      console.log('Zoom out');
                    }}
                  >
                    <ZoomOut size={18} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => {
                      // Reset zoom functionality
                      console.log('Reset zoom');
                    }}
                  >
                    <RotateCcw size={18} color="white" />
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={styles.zoomButton}
                    onPress={() => {
                      // Zoom in functionality
                      console.log('Zoom in');
                    }}
                  >
                    <ZoomIn size={18} color="white" />
                  </TouchableOpacity>
                </Animated.View>
              </View>
            </View>
          ))}
        </Animated.ScrollView>

        {/* Current mask label */}
        <View style={styles.currentLabelContainer}>
          <BlurView intensity={40} style={styles.currentLabel}>
            <Text style={styles.currentLabelText}>
              {maskOptions[activeIndex]?.displayName}
            </Text>
            <View style={styles.currentLabelIndicator} />
          </BlurView>
        </View>
      </View>

      {/* Bottom navigation */}
      <View style={styles.bottomContainer}>
        <LinearGradient
          colors={['transparent', 'rgba(0, 0, 0, 0.3)', 'rgba(0, 0, 0, 0.8)']}
          style={styles.bottomGradient}
        >
          <BlurView intensity={30} style={styles.bottomNavigation}>
            <Animated.ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.navigationContent}
              style={styles.navigationScroll}
              ref={navigationScrollRef}
            > 
              {maskOptions.map((maskOption, index) => {
                return (
                  <TouchableOpacity
                    key={index}
                    onPress={() => scrollToIndex(index)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.navigationTab]}>
                      <Animated.Text style={[styles.navigationTabText, {color: '#FFF'}]}>
                        {maskOption.displayName}
                      </Animated.Text>
                      {index === activeIndex && (
                        <View style={styles.activeTabIndicator} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </Animated.ScrollView>
          </BlurView>
        </LinearGradient>
      </View>
    </GestureHandlerRootView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
  },
  header: {
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: 'white',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  mainContent: {
    flex: 1,
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    alignItems: 'center',
  },
  maskPage: {
    width: SCREEN_WIDTH,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  maskImageContainer: {
    width: IMAGE_SIZE,
    height: IMAGE_SIZE,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#111',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 15,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    zIndex: 10,
  },
  loadingText: {
    color: 'white',
    marginTop: 10,
    fontSize: 16,
  },
  gestureContainer: {
    flex: 1,
  },
  gestureWrapper: {
    flex: 1,
  },
  imageWrapper: {
    flex: 1,
    position: 'relative',
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  maskOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    opacity: 1,
    zIndex: 100,
  },
  zoomControlsContainer: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  zoomControls: {
    flexDirection: 'row',
    gap: 12,
  },
  zoomButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  currentLabelContainer: {
    position: 'absolute',
    bottom: 120,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  currentLabel: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  currentLabelText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 6,
  },
  currentLabelIndicator: {
    width: 30,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  bottomGradient: {
    paddingBottom: 40,
    paddingTop: 20,
  },
  bottomNavigation: {
    paddingVertical: 10,
  },
  navigationScroll: {
    maxHeight: TAB_HEIGHT,
  },
  navigationContent: {
    paddingHorizontal: 20,
    alignItems: 'center',
    gap: 8,
  },
  navigationTab: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    minWidth: 80,
    position: 'relative',
  },
  navigationTabText: {
    fontSize: 14,
    fontWeight: '500',
    textAlign: 'center',
    marginBottom: 6,
  },
  activeTabIndicator: {
    position: 'absolute',
    bottom: 0,
    width: 30,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 1.5,
  },
}); 