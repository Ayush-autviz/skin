import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Button, ActivityIndicator, Alert } from 'react-native';
import { CameraType, useCameraPermissions } from 'expo-camera';
import { useRouter } from 'expo-router';
import { CameraView } from 'expo-camera';
import { uploadPhoto } from '../../src/utils/storageUtils';
import { auth } from '../../src/config/firebase';
import { usePhotoContext } from '../../src/contexts/PhotoContext';
import { createPhotoDocument } from '../../src/services/FirebasePhotosService';
import { storage } from '../../src/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';

/* ------------------------------------------------------
WHAT IT DOES
- Handles camera permissions
- Provides camera preview
- Allows camera flipping (front/back)
- Captures photos
- Integrates with expo-camera
- Uploads captured photos to Firebase Storage
- Shows loading state during upload
- Navigates back to photo grid on success

DATA USED
- facing: CameraType ('front' | 'back')
- permission: CameraPermissionResponse object
- photo: Captured photo data
- userId: Current user's ID from Firebase Auth

DEV PRINCIPLES
- Uses vanilla JavaScript
- Follows React Native best practices
- Implements proper permission handling
- Uses StyleSheet for styling
- Maintains clean component structure

NEXT STEPS
[ ] Add flash control
[ ] Implement image preview after capture
[ ] Add camera grid overlay option
[ ] Add exposure control
------------------------------------------------------*/

// Add detailed debug logging
// console.log('🔵 CAMERA: Imports loaded');
// console.log('🔵 CAMERA: FirebaseService:', firebaseService);
// console.log('🔵 CAMERA: FirebaseService methods:', firebaseService ? Object.keys(firebaseService) : 'undefined');

const ANALYSIS_STATES = {
  NO_METRICS: 'no_metrics',
  PENDING: 'pending',
  ANALYZING: 'analyzing',
  COMPLETE: 'complete',
  ERROR: 'error'
};

export default function CameraScreen() {
  const [facing, setFacing] = useState('front');
  const [permission, requestPermission] = useCameraPermissions();
  const [camera, setCamera] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraActive, setIsCameraActive] = useState(true);
  const router = useRouter();
  const { triggerRefresh } = usePhotoContext();

  // Add cleanup effect
  useEffect(() => {
    return () => {
      console.log('🔵 CAMERA: Cleanup - turning off camera');
      if (camera) {
        camera.pausePreview();
        setCamera(null);
      }
    };
  }, [camera]);

  const shutdownCamera = async () => {
    console.log('🔵 CAMERA: Force shutdown sequence');
    setIsCameraActive(false);
    if (camera) {
      try {
        await camera.pausePreview();
      } catch (e) {
        console.log('🔴 CAMERA: Error in pausePreview:', e);
      }
    }
    setCamera(null);
  };

  if (!permission) {
    return <View style={styles.container}><Text>Requesting permission...</Text></View>;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.message}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleSuccess = async (photoId) => {
    try {
      // Turn off camera before navigation
      console.log('🔵 CAMERA: Turning off camera...');
      await shutdownCamera();
      setIsUploading(false);

      // Small delay to ensure camera is off before navigation
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Navigate to snapshot view
      console.log('🔵 CAMERA: Navigating to snapshot...');
      router.replace(`/snapshot/${photoId}`);
    } catch (error) {
      console.error('🔴 CAMERA: Error during shutdown:', error);
      setIsCameraActive(false);
      router.replace(`/snapshot/${photoId}`);
    }
  };

  const handleCapture = async () => {
    // Add debug log inside the handler
    console.log('🔵 CAMERA: HandleCapture - FirebaseService:', firebaseService);
    
    if (!camera) {
      console.log('🔴 CAMERA: No camera ref!');
      return;
    }

    try {
      console.log('🔵 CAMERA: Starting photo capture');
      const photo = await camera.takePictureAsync({
        quality: 0.7,
        base64: true,
      });
      const userId = auth.currentUser?.uid;
      
      if (!userId) {
        console.error('🔴 CAMERA: No user ID found!');
        return;
      }

      setIsUploading(true);
      const photoId = `${Date.now()}`;
      console.log('🔵 CAMERA: Photo details:', { userId, photoId });

      // 1. Upload photo to Firebase Storage
      console.log('🔵 CAMERA: Starting Storage upload...');
      const response = await fetch(photo.uri);
      const blob = await response.blob();
      const storageRef = ref(storage, `users/${userId}/photos/${photoId}`);
      await uploadBytes(storageRef, blob);
      console.log('✅ CAMERA: Photo uploaded to Storage');
      
      // 2. Get the download URL
      const storageUrl = await getDownloadURL(storageRef);
      console.log('✅ CAMERA: Got download URL:', storageUrl);

      // 3. Create the photo document - SIMPLIFIED
      console.log('🔵 CAMERA: About to call createPhotoDocument');
      await createPhotoDocument(userId, photoId, storageUrl);
      console.log('✅ CAMERA: Photo process complete!');

      // Handle success and camera shutdown
      await handleSuccess(photoId);
      
    } catch (error) {
      console.error('🔴 CAMERA ERROR:', error.message);
      console.error('🔴 CAMERA ERROR Stack:', error.stack);
      Alert.alert('Error', 'Failed to save photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <View style={styles.container}>
      {isCameraActive ? (
        <CameraView 
          ref={ref => setCamera(ref)}
          style={styles.camera}
          facing={facing}
          active={isCameraActive}
        >
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

            {isUploading ? (
              <View style={styles.captureButton}>
                <ActivityIndicator size="large" color="#fff" />
              </View>
            ) : (
              <TouchableOpacity 
                style={styles.captureButton}
                onPress={handleCapture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.textButton}
              onPress={handleCapture}
            >
              <Text style={styles.buttonText}>Upload</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.liqaContainer}>
            <TouchableOpacity
              style={styles.liqaButton}
              onPress={() => router.push('/liqa')}
            >
              <Text style={styles.liqaText}>LIQA</Text>
            </TouchableOpacity>
          </View>
        </CameraView>
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
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
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
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
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
}); 