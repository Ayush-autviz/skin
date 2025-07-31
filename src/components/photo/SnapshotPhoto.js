// SnapshotPhoto.js
// Advanced photo component with zoom and pan capabilities

/* ------------------------------------------------------
WHAT IT DOES
- Displays a photo with support for pinch-to-zoom and panning
- Handles loading states and errors
- Provides callbacks for zoom state changes
- Transitions smoothly between normal and zoomed states

STATE MANAGEMENT
- Uses react-native-gesture-handler for standard zoom/pan behavior
- Maintains zoom bounds and pan constraints
- Reports zoom state to parent via callback
- Exposes methods: resetZoom(), setZoom() via ref

RESPONSIBILITIES
- Render the photo with proper transforms
- Handle gesture interactions using best practices
- Maintain zoom and pan state
- Report zoom changes to parent
------------------------------------------------------*/

import React, { useState, useRef, useEffect, forwardRef, useImperativeHandle, useCallback } from 'react';
import { 
  StyleSheet, 
  Animated, 
  ActivityIndicator, 
  View, 
  Dimensions, 
  TouchableOpacity,
  Text
} from 'react-native';
import { 
  PinchGestureHandler, 
  PanGestureHandler, 
  State,
  TapGestureHandler 
} from 'react-native-gesture-handler';
import { Feather } from '@expo/vector-icons';
import { SvgXml } from 'react-native-svg';
import { sanitizeSvgString } from '../../utils/photoUtils';
import { useRouter } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Define quality thresholds (matching those in snapshot.js)
const QUALITY_THRESHOLD_MIN = 10;
const QUALITY_WARNING_THRESHOLD = 50;

// Zoom configuration
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
const DOUBLE_TAP_ZOOM = 2;

// --- POC constants for square view (No longer primary drivers for pocSquareImageArea dimensions) ---
// const IMAGE_WIDTH_PERCENTAGE = 1.2; // MODIFIED: 120% of screen width
// const POC_MARGIN = 20; // REMOVED: No longer used for pocSquareSize
// const ASSUMED_HEADER_HEIGHT = 60; // ADDED: Assumed height for the screen header - Will be replaced by prop
// const pocSquareSize = SCREEN_WIDTH * IMAGE_WIDTH_PERCENTAGE; // Will be replaced by dynamic calculation
// --- End POC constants ---

// Helper component for rendering a Line (React Native Views)
const LineView = ({ x1, y1, x2, y2, color, thickness }) => {
  const deltaX = x2 - x1;
  const deltaY = y2 - y1;
  const length = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
  const angleRad = Math.atan2(deltaY, deltaX);
  const angleDeg = angleRad * (180 / Math.PI);

  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;

  if (length === 0) return null;

  return (
    <View
      style={{
        position: 'absolute',
        width: length,
        height: thickness,
        backgroundColor: color,
        left: midX - length / 2,
        top: midY - thickness / 2,
        transform: [{ rotate: `${angleDeg}deg` }],
        zIndex: 1000, // Ensure it's on top
      }}
    />
  );
};

// Re-add XMark component for the center mark
const XMark = ({ cx, cy, size, color, thickness }) => {
  const armLength = size / Math.SQRT2; // Length of each arm from center to corner of X
  return (
    <>
      <LineView x1={cx - armLength / 2} y1={cy - armLength / 2} x2={cx + armLength / 2} y2={cy + armLength / 2} color={color} thickness={thickness} />
      <LineView x1={cx - armLength / 2} y1={cy + armLength / 2} x2={cx + armLength / 2} y2={cy - armLength / 2} color={color} thickness={thickness} />
    </>
  );
};

const SnapshotPhoto = forwardRef(({ 
  uri, 
  isLoaded, 
  onLoadStart, 
  onLoad, 
  onError, 
  onZoomStateChange,
  onViewStateChange, // Add new prop for direct view state control
  isZoomed = false, 
  viewState = 'default',
  photoData,  // Add this prop to access quality data
  maskContent, // <-- Accept maskContent (SVG string) prop
  isMaskVisible,  // <-- Accept isMaskVisible prop
  showRegistrationMarks = false, // <-- Prop to control debug marks
  headerHeight = 0, // <-- New prop from snapshot.js
  peekSheetHeight = 0, // <-- New prop from snapshot.js
  minimizedSheetHeight = 0 // <-- New prop for when sheet is fully minimized during zoom
}, ref) => {

  console.log('🔵 photoData in SnapshotPhoto:', photoData);
  
  const router = useRouter();
  
  // Animated values for gestures
  const scale = useRef(new Animated.Value(1)).current;
  const translateX = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(0)).current;
  
  // Refs for gesture handlers
  const pinchRef = useRef(null);
  const panRef = useRef(null);
  const doubleTapRef = useRef(null);
  const singleTapRef = useRef(null); // Add single tap ref
  
  // Base values for calculations
  const baseScale = useRef(1);
  const baseTranslateX = useRef(0);
  const baseTranslateY = useRef(0);
  
  // State tracking
  const [currentScale, setCurrentScale] = useState(1);
  
  // Log important state changes
  useEffect(() => {
    console.log('🔍 SnapshotPhoto state:', { currentScale, isZoomed, viewState, isMaskVisible, hasMaskContent: !!maskContent });
  }, [currentScale, isZoomed, viewState, isMaskVisible, maskContent]);
  
  // Reset zoom and pan to initial values
  const resetZoom = useCallback(() => {
    console.log('🔍 SnapshotPhoto: Resetting zoom and centering image');
    
    // Reset base values
    baseScale.current = 1;
    baseTranslateX.current = 0;
    baseTranslateY.current = 0;
    
    // Animate back to initial state (centered) - no need to clear offsets since we don't use them
    Animated.parallel([
      Animated.spring(scale, {
        toValue: 1,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(translateX, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        useNativeDriver: true,
        friction: 8,
        tension: 40,
      })
    ]).start();
    
    setCurrentScale(1);
  }, []);
  
  // Set zoom to a specific level
  const setZoom = useCallback((zoomLevel) => {
    console.log(`🔍 SnapshotPhoto: Setting zoom to ${zoomLevel}`);
    
    // Enforce zoom bounds
    zoomLevel = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, zoomLevel));
    
    baseScale.current = zoomLevel;
    
    // Animate to new zoom level
    Animated.spring(scale, {
      toValue: zoomLevel,
      useNativeDriver: true,
      friction: 8,
      tension: 40,
    }).start();
    
    setCurrentScale(zoomLevel);
  }, []);
  
  // Expose methods to parent component
  useImperativeHandle(ref, () => ({
    resetZoom,
    setZoom
  }));
  
  // Handle double tap to zoom
  const onDoubleTap = useCallback((event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      console.log('🔍 SnapshotPhoto: Double tap detected');
      
      if (currentScale > 1) {
        // If zoomed in, zoom out
        resetZoom();
        if (onZoomStateChange) onZoomStateChange(false);
      } else {
        // If at normal scale, zoom in
        setZoom(DOUBLE_TAP_ZOOM);
        if (onZoomStateChange) onZoomStateChange(true);
      }
    }
  }, [currentScale, resetZoom, setZoom, onZoomStateChange]);
  
  // Handle pinch gesture
  const onPinchEvent = useCallback(Animated.event(
    [{ nativeEvent: { scale: scale } }],
    { useNativeDriver: false } // Changed to false to avoid nesting issues
  ), []);
  
  const onPinchStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      const newScale = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, baseScale.current * event.nativeEvent.scale));
      
      baseScale.current = newScale;
      setCurrentScale(newScale);
      
      // Reset scale to base value to prevent accumulation
      scale.setValue(newScale);
      
      // Handle zoom state changes
      if (newScale > 1.1 && !isZoomed) {
        console.log('🔍 SnapshotPhoto: Zoom in detected');
        if (onZoomStateChange) onZoomStateChange(true);
      } else if (newScale <= 1.1 && isZoomed) {
        console.log('🔍 SnapshotPhoto: Zoom out detected');
        if (onZoomStateChange) onZoomStateChange(false);
      }
    }
  }, [isZoomed, onZoomStateChange]);
  
  // Handle pan gesture
  const onPanEvent = useCallback(Animated.event(
    [{ nativeEvent: { translationX: translateX, translationY: translateY } }],
    { useNativeDriver: false } // Changed to false to avoid nesting issues
  ), []);
  
  const onPanStateChange = useCallback((event) => {
    if (event.nativeEvent.oldState === State.ACTIVE) {
      // Update base translation values
      baseTranslateX.current += event.nativeEvent.translationX;
      baseTranslateY.current += event.nativeEvent.translationY;
      
      // Apply bounds to prevent panning too far
      const maxTranslate = (currentScale - 1) * 100;
      
      baseTranslateX.current = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateX.current));
      baseTranslateY.current = Math.max(-maxTranslate, Math.min(maxTranslate, baseTranslateY.current));
      
      // Instead of using setOffset, set the values directly
      translateX.setValue(baseTranslateX.current);
      translateY.setValue(baseTranslateY.current);
    }
  }, [currentScale]);
  
  // Effect to handle external zoom state changes
  useEffect(() => {
    if (isZoomed && currentScale === 1) {
      // If externally set to zoomed but we're not zoomed, zoom in slightly
      setZoom(1.2);
    } else if (!isZoomed && currentScale > 1) {
      // If externally set to not zoomed but we are zoomed, reset
      resetZoom();
    }
  }, [isZoomed, currentScale, setZoom, resetZoom]);

  // Add effect to ensure we reset translation when scale goes to 1
  useEffect(() => {
    if (currentScale <= 1) {
      // When we're at normal scale, force center position
      baseTranslateX.current = 0;
      baseTranslateY.current = 0;
      translateX.setValue(0);
      translateY.setValue(0);
    }
  }, [currentScale]);

  // TEMPORARY: Force show warning for testing
  const showQualityWarning = true; // TESTING ONLY - return true regardless of score
  
  /* Normal implementation (uncomment after testing):
  const showQualityWarning = () => {
    if (!photoData?.metrics?.imageQuality?.overall) return false;
    const score = photoData.metrics.imageQuality.overall;
    return score >= QUALITY_THRESHOLD_MIN && score <= QUALITY_WARNING_THRESHOLD;
  };
  */

  // Sanitize the SVG content before passing it to SvgXml
  const sanitizedXml = maskContent ? sanitizeSvgString(maskContent /*, showRegistrationMarks */) : null; // showRegistrationMarks is effectively false now

  // Memoized function to calculate the target size of the image display area
  const calculateTargetImageSize = useCallback(() => {
    let targetHeight;
    if (viewState === 'zooming') {
      targetHeight = SCREEN_HEIGHT - headerHeight - minimizedSheetHeight;
    } else {
      targetHeight = SCREEN_HEIGHT - headerHeight - peekSheetHeight;
    }
    // Ensure it's not negative, default to a portion of screen height
    return targetHeight > 0 ? targetHeight : SCREEN_HEIGHT * 0.5;
  }, [viewState, headerHeight, peekSheetHeight, minimizedSheetHeight]);

  // Animated value for the image container's size (width and height)
  const imageContainerSizeAnim = useRef(new Animated.Value(calculateTargetImageSize())).current;

  // Effect to animate the image container size when relevant props change
  useEffect(() => {
    const newSize = calculateTargetImageSize();
    Animated.spring(imageContainerSizeAnim, {
      toValue: newSize,
      friction: 9, // Adjust for desired springiness
      tension: 70,
      useNativeDriver: false // width/height cannot use native driver
    }).start();
  }, [calculateTargetImageSize, imageContainerSizeAnim]);

  // Handle single tap - for sheet management and mask viewer navigation
  const onSingleTap = useCallback((event) => {
    if (event.nativeEvent.state === State.ACTIVE) {
      console.log('🔍 SnapshotPhoto: Single tap detected, viewState:', viewState);
      
      // If in metrics view (sheet maximized), collapse back to default state
      if (viewState === 'metrics') {
        console.log('🔍 SnapshotPhoto: Collapsing sheet from metrics view to default');
        if (onViewStateChange) onViewStateChange('default'); // Return to home state
        return;
      }
      
      // If in zooming view, exit zoom back to default state
      if (viewState === 'zooming') {
        console.log('🔍 SnapshotPhoto: Exiting zoom mode to default');
        resetZoom();
        if (onZoomStateChange) onZoomStateChange(false); // This will trigger return to default
        return;
      }
      
      // In default view, navigate to mask viewer if we have photoData with mask images
      if (viewState === 'default' && photoData && photoData.maskImages && photoData.maskImages.length > 0) {
        console.log('🔍 SnapshotPhoto: Navigating to mask viewer');
        router.push({
          pathname: '/(authenticated)/maskViewer',
          params: {
            photoData: JSON.stringify(photoData)
          }
        });
        return;
      }
      
      // In default view without mask data, single tap does nothing (double-tap handles zoom)
    }
  }, [viewState, resetZoom, onZoomStateChange, onViewStateChange, photoData, router]);

  return (
    <View style={styles.container}>
      {/* MODIFIED FOR POC: This View now centers the square content */}
      <Animated.View style={[styles.pocCenteringContainer, { paddingTop: headerHeight }]}>
        {/* Simplified gesture structure - PinchGestureHandler with simultaneous Pan and DoubleTap */}
        <PinchGestureHandler
          ref={pinchRef}
          onGestureEvent={onPinchEvent}
          onHandlerStateChange={onPinchStateChange}
          enabled={isLoaded}
          simultaneousHandlers={[panRef, doubleTapRef]}
        >
          <PanGestureHandler
            ref={panRef}
            onGestureEvent={onPanEvent}
            onHandlerStateChange={onPanStateChange}
            enabled={currentScale > 1} // Only allow panning when zoomed
            simultaneousHandlers={[pinchRef, doubleTapRef]}
          >
            <TapGestureHandler
              ref={doubleTapRef}
              onHandlerStateChange={onDoubleTap}
              numberOfTaps={2}
              enabled={isLoaded}
              simultaneousHandlers={[pinchRef, panRef]}
            >
              <TapGestureHandler
                ref={singleTapRef}
                onHandlerStateChange={onSingleTap}
                numberOfTaps={1}
                enabled={isLoaded}
                simultaneousHandlers={[pinchRef, panRef, doubleTapRef]}
              >
                {/* MODIFIED FOR POC: This View is the actual square area, now animated */}
                <Animated.View 
                  style={[
                    styles.pocSquareImageArea, 
                    { 
                      width: imageContainerSizeAnim, // Use animated value
                      height: imageContainerSizeAnim  // Use animated value
                    }
                  ]}
                >
                  <Animated.Image
                    source={{ uri }}
                    style={[
                      styles.image, // Will still be 100% width/height of pocSquareImageArea
                      { 
                        opacity: 1,
                        transform: [
                          { scale: scale },
                          { translateX: translateX },
                          { translateY: translateY }
                        ]
                      }
                    ]}
                    resizeMode="cover" // MODIFIED FOR POC - Try "cover"
                    onLoadStart={onLoadStart}
                    onLoad={onLoad}
                    onError={onError}
                  />

                  {/* Conditionally render the SVG Mask using SvgXml */}
                  {isMaskVisible && maskContent && (
                    <Animated.View 
                      style={[
                        styles.svgContainer, // Will still be 100% width/height of pocSquareImageArea
                        { transform: [
                          { scale: scale },
                          { translateX: translateX },
                          { translateY: translateY }
                        ] } // Apply the SAME transform
                      ]}
                      pointerEvents="none" // Make SVG non-interactive
                    >
                      {sanitizedXml && console.log("🎨 Sanitized SVG (SnapshotPhoto):", sanitizedXml.substring(0, 200) + "...")}
                      <SvgXml
                        xml={sanitizedXml}
                        width="100%"
                        height="100%"
                        preserveAspectRatio="none" // MODIFIED FOR POC - try "none"
                      />
                    </Animated.View>
                  )}

                  {/* Analyze with images button - positioned relative to image */}
                  {isLoaded && viewState === 'default' && photoData && photoData.maskImages && photoData.maskImages.length > 0 && (
                    <View style={styles.analyzeButtonContainer}>
                      <TouchableOpacity
                        style={styles.analyzeButton}
                        onPress={() => {
                          console.log('🔍 SnapshotPhoto: Navigating to mask viewer from button');
                          router.push({
                            pathname: '/(authenticated)/maskViewer',
                            params: {
                              photoData: JSON.stringify(photoData)
                            }
                          });
                        }}
                      >
                        <View style={styles.analyzeButtonContent}>
                          <Feather name="image" size={16} color="white" />
                          <Text style={styles.analyzeButtonText}>Analyze with images</Text>
                        </View>
                      </TouchableOpacity>
                    </View>
                  )}
                </Animated.View>
              </TapGestureHandler>
            </TapGestureHandler>
          </PanGestureHandler>
        </PinchGestureHandler>
        
        {/* Loading indicator */}
        {!isLoaded && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FFFFFF" />
          </View>
        )}
        
        {/* Exit zoom button */}
        {isZoomed && (
          <TouchableOpacity
            style={styles.exitZoomButton}
            onPress={() => {
              resetZoom();
              if (onZoomStateChange) onZoomStateChange(false);
            }}
          >
            <Feather name="minimize-2" size={24} color="white" />
          </TouchableOpacity>
        )}
        
        {/* Low quality warning chip */}
        {isLoaded && showQualityWarning && (
          <View style={styles.qualityWarningChip}>
            <Text style={styles.qualityWarningText}>Low Image Quality</Text>
          </View>
        )}
      </Animated.View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    overflow: 'hidden',
    backgroundColor: '#333', // ADDED: Consistent dark background
  },
  // --- POC styles ---
  pocCenteringContainer: {
    flex: 1,
    justifyContent: 'flex-start', // MODIFIED: Align to top
    alignItems: 'center',
    // paddingTop: ASSUMED_HEADER_HEIGHT, // REMOVED: Now set dynamically via style prop using headerHeight
  },
  pocSquareImageArea: {
    // width: pocSquareSize, // REMOVED: Now set dynamically via style prop
    // height: pocSquareSize, // REMOVED: Now set dynamically via style prop
    // backgroundColor: 'lightgrey', // REMOVED: To use container's background
    overflow: 'hidden', // Important for resizeMode="contain"
    // position: 'relative', // Ensure children with position:absolute are relative to this
  },
  // --- End POC styles ---
  image: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    top: 0,
    left: 0,
  },
  loadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#333', // Changed from #f0f0f0 to dark gray
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1, // Ensure it can cover the image area if image is transparent during load
  },
  exitZoomButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Add a new style for the zoom background
  /*
  zoomBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: '#333', // Dark grey background
    zIndex: -1, // Ensure it's behind the image
  },
  */
  qualityWarningChip: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    zIndex: 100,
    // Add shadow
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
    elevation: 2,
  },
  qualityWarningText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '500',
  },
  // Fancy analyze button styles
  analyzeButtonContainer: {
    position: 'absolute',
    bottom: 60,
    right: 80,
    zIndex: 100,
  },
  analyzeButton: {
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 10,
    // Add shadow for depth
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    // Add border for extra fancy look
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  analyzeButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  analyzeButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
    letterSpacing: 0.5,
  },
  // Style for the SVG container
  svgContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    // width: '100%', // Covered by absolute positioning
    // height: '100%', // Covered by absolute positioning
  },
  photoRegistrationContainer: {
    position: 'absolute',
    top: 0, // Will be placed inside pocSquareImageArea which is centered
    left: 0,
    // Dimensions will be controlled by parent (pocSquareImageArea)
    width: '100%', 
    height: '100%',
    // backgroundColor: 'rgba(255, 0, 0, 0.1)', // Optional: Light red background for container
  },
  // Remove old photoRegRect and photoRegLine styles as they are no longer used
  /*
  photoRegRect: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    borderWidth: 1, // Use a thin border, 1px is fine for RN
    borderColor: 'red',
  },
  photoRegLine: {
    position: 'absolute',
    top: '50%',
    left: 20, // Start from inset edge
    right: 20, // End at inset edge
    height: 1, // Border thickness
    backgroundColor: 'red',
  },
  photoRegLine1: { // Line from top-left to bottom-right of the inset rect
    transform: [
      { translateY: -0.5 }, // Adjust for border thickness
      { rotate: '45deg' }, // Approximation, actual angle depends on aspect ratio
      // For a more precise X, we might need to calculate based on inset rect dimensions
    ],
    // This simple rotation won't create a perfect X across the inset rect 
    // due to aspect ratio. A true X would require two separate lines calculated 
    // from corner to corner of the photoRegRect.
    // For now, let's make them cross at the center of the screen, adjusting length based on inset.
    left: '10%', // Example, adjust to make it visually centered and long enough
    right: '10%',
  },
  photoRegLine2: { // Line from top-right to bottom-left of the inset rect
    transform: [
      { translateY: -0.5 },
      { rotate: '-45deg' },
    ],
    left: '10%',
    right: '10%',
  },
  */
});

export default SnapshotPhoto; 