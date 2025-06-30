import { useState, useEffect, useMemo, useContext } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, ActivityIndicator, Alert, Linking, Image, Dimensions } from 'react-native';
import { Camera, CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { uploadPhoto } from '../../src/utils/storageUtils';
import { auth } from '../../src/config/firebase';
import { usePhotoContext } from '../../src/contexts/PhotoContext';
import { createPhotoDocument } from '../../src/services/FirebasePhotosService';
import { storage } from '../../src/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import * as ImagePicker from 'expo-image-picker';
import { useUser } from '../../src/contexts/UserContext';
import Svg, { Path, Defs, Mask, Rect } from 'react-native-svg';

/* ------------------------------------------------------
WHAT IT DOES
- Handles camera permissions
- Provides camera preview
- Allows camera flipping (front/back)
- Captures photos
- Integrates with expo-camera
- Uploads captured photos to Firebase Storage
- Shows loading state during upload
- Navigates to snapshot view on success

DATA USED
- facing: CameraType ('front' | 'back')
- permission: CameraPermissionResponse object
- photo: Captured photo data
- userId: Current user's ID from Firebase Auth
- selectedSnapshot: Latest captured photo in UserContext

IMPORTANT IMPLEMENTATION NOTES
1. Photo Capture Settings:
   - quality: 0.7 (balanced size/quality)
   - base64: true (required for proper Firebase upload)
   - exif: false (CRITICAL: prevents image rotation issues with Haut AI API)

2. Upload Flow:
   - Capture photo with expo-camera
   - Upload to Firebase Storage
   - Get download URL
   - Create Firestore document
   - Set snapshot in UserContext
   - Navigate to snapshot view

3. Critical Dependencies:
   - expo-camera: Image capture
   - Firebase Storage: Photo storage
   - Firestore: Photo metadata
   - UserContext: Snapshot state management

TROUBLESHOOTING
- If images fail to upload: Check base64 setting
- If images fail to analyze: Check EXIF and orientation settings
- If context is lost: Check UserContext integration

EXIF DATA & ORIENTATION ISSUES
- EXIF (Exchangeable Image File Format) contains image metadata including orientation
- Mobile devices capture photos in their native orientation but add EXIF data to indicate how they should be displayed
- Problem: When a portrait mode photo is taken, the image data might still be in landscape orientation with EXIF data saying "rotate 90 degrees"
- Solution: Setting 'exif: false' in takePictureAsync() forces the image to be saved in the DISPLAYED orientation rather than relying on EXIF
- Image Library Uploads: Must also have 'exif: false' to ensure consistent orientation handling
- Library vs Camera: Both sources must use identical settings to ensure consistent analysis results
- Analysis API: Our backend analysis service expects faces in portrait orientation and may fail if it receives sideways faces

------------------------------------------------------*/

/* ------------------------------------------------------
FACE OVERLAY CONFIGURATION
- All percentage values are decimal (0-1)
- Width/Height are relative to screen width
- Center position is relative to screen height
------------------------------------------------------*/
const FACE_OVERLAY = {
  // Width of face rectangle as percentage of screen width
  RECT_WIDTH_PCT: 0.76,
  
  // Height of face rectangle as percentage of screen width (to maintain aspect ratio)
  RECT_HEIGHT_PCT: 1.1,
  
  // Border radius of the face rectangle in pixels
  RECT_RADIUS_PCT: 0.3,
  
  // Vertical center position as percentage of screen height (0 = top, 1 = bottom)
  RECT_CENTERED_AT_PCT: 0.45,
  
  // Optional: Additional configuration
  BORDER_WIDTH: 2,
  BORDER_COLOR: 'rgba(255,255,255,.33)',
  OVERLAY_OPACITY: 0.45,
  
};

// Add detailed debug logging
// console.log('🔵 CAMERA: Imports loaded');
// console.log('🔵 CAMERA: FirebaseService:', firebaseService);
// console.log('🔵 CAMERA: FirebaseService methods:', firebaseService ? Object.keys(firebaseService) : 'undefined');

// const ANALYSIS_STATES = {
//   NO_METRICS: 'no_metrics',
//   PENDING: 'pending',
//   ANALYZING: 'analyzing',
//   COMPLETE: 'complete',
//   ERROR: 'error'
// };

// Add this component after the FACE_OVERLAY constants
const FaceOverlay = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
  
  // Calculate dimensions
  const faceWidth = screenWidth * FACE_OVERLAY.RECT_WIDTH_PCT;
  const faceHeight = screenWidth * FACE_OVERLAY.RECT_HEIGHT_PCT;
  const borderRadius = faceWidth * FACE_OVERLAY.RECT_RADIUS_PCT;
  
  // Calculate position
  const centerY = screenHeight * FACE_OVERLAY.RECT_CENTERED_AT_PCT;
  const rectY = centerY - (faceHeight / 2);
  const rectX = (screenWidth - faceWidth) / 2;

  return (
    <Svg height={screenHeight} width={screenWidth} style={StyleSheet.absoluteFill}>
      <Defs>
        <Mask id="mask" x="0" y="0" height="100%" width="100%">
          <Rect width="100%" height="100%" fill="white" />
          <Rect
            x={rectX}
            y={rectY}
            width={faceWidth}
            height={faceHeight}
            rx={borderRadius}
            ry={borderRadius}
            fill="black"
          />
        </Mask>
      </Defs>
      
      <Rect
        width="100%"
        height="100%"
        fill="rgba(0,0,0,0.45)"
        mask="url(#mask)"
      />
      
      {/* Border for the face guide */}
      <Rect
        x={rectX}
        y={rectY}
        width={faceWidth}
        height={faceHeight}
        rx={borderRadius}
        ry={borderRadius}
        stroke="rgba(255,255,255,0.33)"
        strokeWidth={2}
        fill="none"
      />
    </Svg>
  );
};

export default function CameraScreen() {
  // Only the hooks we actually use
  const router = useRouter();
  const { setSelectedSnapshot } = usePhotoContext();
  const { user } = useUser();
  const [hasPermission, setHasPermission] = useState(null);
  const [camera, setCamera] = useState(null);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const [isUploading, setIsUploading] = useState(false);
  const [facing, setFacing] = useState('front');
  const [uploadedPhoto, setUploadedPhoto] = useState(null);
  const [uploadingPhotoUri, setUploadingPhotoUri] = useState(null);

  useEffect(() => {
    console.log('📸 Camera screen loaded');
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (uploadedPhoto) {
      console.log('🔵 NAVIGATION: Starting navigation to snapshot screen');
      
      // Store the photo in context before navigation
      // setSelectedSnapshot(uploadedPhoto); // REMOVE THIS - Snapshot screen will handle loading
      console.log('🔵 NAVIGATION: Stored photo in context:', uploadedPhoto);
      
      router.push('/snapshot');
      console.log('🔵 NAVIGATION: Navigation attempted');
      
      setUploadedPhoto(null);
      // setUploadingPhotoUri(null); // REMOVE THIS
      // setIsUploading(false); // REMOVE THIS
    }
  }, [uploadedPhoto]);

  // Add cleanup effect
  useEffect(() => {
    return () => {
      // Ensure shutdown is called on unmount
      (async () => {
         await shutdownCamera();
      })();
    };
  }, []);

  // Add debug logs
  //console.log('🔵 CAMERA: hasPermission:', hasPermission);
  //console.log('🔵 CAMERA: isCameraActive:', isCameraActive);

  // Wait for permission check
  if (hasPermission === null) {
    return null;
  }

  // Handle denied permission
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>No access to camera</Text>
        <Text style={styles.debugText}>
          Permission state: {JSON.stringify({hasPermission, isCameraActive}, null, 2)}
        </Text>
        <View style={styles.permissionButtonContainer}>
          <TouchableOpacity 
            style={styles.button}
            onPress={() => {
              Linking.openSettings();
            }}
          >
            <Text style={styles.buttonText}>Grant Access</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.button}
            onPress={() => router.replace('/')}
          >
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const shutdownCamera = async () => {
    setIsCameraActive(false);
    if (camera) {
      try {
        await camera.pausePreview();
      } catch (e) {
        console.error('🔴 CAMERA: Error during pausePreview():', e);
      }
      setCamera(null);
    }
  };

  const handleSuccess = async (photoId) => {
    try {
      await shutdownCamera();
      setIsUploading(false);
      await new Promise(resolve => setTimeout(resolve, 500));
      router.replace(`/snapshot/${photoId}`);
    } catch (error) {
      console.error('🔴 CAMERA: Error during shutdown:', error);
      setIsCameraActive(false);
      router.replace(`/snapshot/${photoId}`);
    }
  };

  // Shared function for processing photos
  const processPhoto = async (photo) => {
    // No need to set isUploading or isCameraActive here anymore
    //setIsCameraActive(false); 
    //setIsUploading(true);
    //setUploadingPhotoUri(photo.uri);

    try {
      if (!user?.uid) {
        console.error('🔴 PROCESS: No user ID available');
        Alert.alert('Error', 'User not authenticated');
        return;
      }

      const userId = user.uid;
      const photoId = `${Date.now()}`;
      
      await shutdownCamera();
      await new Promise(resolve => setTimeout(resolve, 200)); 
      
      router.push({ 
        pathname: '/(authenticated)/snapshot', 
        params: { photoId, localUri: photo.uri } 
      });

              // --- Perform upload and Firestore creation in the background ---
        
        const response = await fetch(photo.uri);
        const blob = await response.blob();
        const storageRef = ref(storage, `users/${userId}/photos/${photoId}`);
        await uploadBytes(storageRef, blob);
        
        const storageUrl = await getDownloadURL(storageRef);
        
        const createSuccess = await createPhotoDocument(userId, photoId, storageUrl);
        if (!createSuccess) {
            console.error("🔴 PROCESS (BG) ERROR: Failed to create photo document in Firestore.");
            return;
        }

      // 5. NO LONGER NEEDED HERE: Set the snapshot in context 
      // const snapshotData = { ... };
      // setSelectedSnapshot(snapshotData);

      // 6. NO LONGER NEEDED HERE: Navigate 
      // router.push('/(authenticated)/snapshot'); 
      
    } catch (error) {
      console.error('🔴 PROCESS ERROR (BG):', error);
      // Log error, but don't block UI 
      // Optionally update Firestore doc with error state for snapshot screen
      // Alert.alert('Error', `Failed to process photo: ${error.message}`); // Avoid Alert here
      // Resetting state here is not necessary as the screen is gone
      // setIsCameraActive(true); 
      // setUploadingPhotoUri(null);
      // setIsUploading(false);
    }
  };

  // Update capture handler to use shared function
  const handleCapture = async () => {
    if (!camera) {
      return;
    }

    try {
      const photo = await camera.takePictureAsync({
        quality: 0.7,
        base64: true,
        exif: false
      });

      // Use the shared processing function
      await processPhoto(photo);

    } catch (error) {
      console.error('🔴 CAMERA ERROR:', error.message);
      console.error('🔴 CAMERA ERROR Stack:', error.stack);
      Alert.alert('Error', 'Failed to capture photo. Please try again.');
      // Ensure states are reset if processPhoto wasn't called or failed early
      // setIsUploading(false); 
      setIsCameraActive(true); 
    }
  };

  // Update handleUpload to use shared function
  const handleUpload = async () => {
    try {
      console.log('🔵 UPLOAD: Starting upload flow');
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      console.log('🔵 UPLOAD: Permission status:', status);
      
      if (status !== 'granted') {
        console.log('🔴 UPLOAD: Permission denied');
        Alert.alert(
          'Permission needed',
          'Library access is required to upload photos',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() }
          ]
        );
        return;
      }

      // Using settings directly from the Expo documentation
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'], // Use array form as per docs
        allowsEditing: true,
        aspect: [3, 4],
        quality: 0.7,
        exif: false,
        
        // iOS specific options that might help
        presentationStyle: 'formSheet', // iOS - use a specific presentation style
        
        // Disable width/height settings as they might conflict with aspect ratio
        // Let the system handle the resizing based on aspect ratio
      });

      console.log('🔵 UPLOAD: Image picker result:', {
        cancelled: result.canceled,
        hasAssets: result.assets?.length > 0,
        dimensions: result.assets?.[0] ? `${result.assets[0].width}x${result.assets[0].height}` : 'none'
      });

      if (!result.canceled && result.assets?.[0]) {
        // Use the shared processing function
        await processPhoto(result.assets[0]);
      } else {
        console.log('🔵 UPLOAD: User cancelled selection');
      }
    } catch (error) {
      console.error('🔴 UPLOAD ERROR:', error);
      Alert.alert('Error', 'Failed to access photo library');
    }
  };

  
  return (
    <View style={styles.container}>
      {isCameraActive ? (
        <>
          <CameraView 
            ref={ref => setCamera(ref)}
            style={styles.camera}
            facing={facing}
            active={isCameraActive}
          />
          <FaceOverlay />
          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={styles.textButton}
              onPress={async () => {
                await shutdownCamera();
                router.back();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.captureButton}
              onPress={handleCapture}
              // disabled={isUploading} // Optionally disable while processing starts, though navigation is fast
            >
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.textButton}
              onPress={handleUpload}
            >
              <Text style={styles.buttonText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </>
      ) : (
        <View style={[styles.container, { backgroundColor: 'black' }]} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  camera: {
    flex: 1,
  },
  buttonContainer: {
    flex: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    paddingBottom: 80,
  },
  textButton: {
    padding: 10,
    minWidth: 80,
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  captureButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'white',
  },
  message: {
    fontSize: 16,
    color: 'black',
    textAlign: 'center',
    marginBottom: 20,
  },
  liqaContainer: {
    position: 'absolute',
    bottom: 36,
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  liqaButton: {
    padding: 10,
  },
  liqaText: {
    color: 'white',
    fontSize: 14,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  permissionButtonContainer: {
    gap: 10,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    fontFamily: 'monospace',
  },
  spinnerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  uploadingText: {
    color: '#ffffff',
    fontSize: 16,
    marginTop: 10,
    fontWeight: '600',
  },
  uploadingImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadingOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [
      { translateX: -50 },
      { translateY: -50 }
    ],
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: 'rgba(0,0,0,0.3)',
    borderRadius: 10,
  },
}); 