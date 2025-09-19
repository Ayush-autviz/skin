import { useState, useEffect, useRef } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, Alert, Linking, Dimensions 
} from 'react-native';
import { useCameraPermission, useCameraDevice, Camera } from 'react-native-vision-camera';
import { router } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Path, Defs, Mask, Rect } from 'react-native-svg';
import useAuthStore from '../../src/stores/authStore';

/* ------------------------------------------------------
FACE OVERLAY CONFIGURATION
------------------------------------------------------*/
const FACE_OVERLAY = {
  RECT_WIDTH_PCT: 0.76,
  RECT_HEIGHT_PCT: 1.1,
  RECT_RADIUS_PCT: 0.3,
  RECT_CENTERED_AT_PCT: 0.45,
  BORDER_WIDTH: 2,
  BORDER_COLOR: 'rgba(255,255,255,.33)',
  OVERLAY_OPACITY: 0.45,
};

const FaceOverlay = () => {
  const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

  const faceWidth = screenWidth * FACE_OVERLAY.RECT_WIDTH_PCT;
  const faceHeight = screenWidth * FACE_OVERLAY.RECT_HEIGHT_PCT;
  const borderRadius = faceWidth * FACE_OVERLAY.RECT_RADIUS_PCT;

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
  const { user } = useAuthStore();

  const camera = useRef(null);
  const [isActive, setIsActive] = useState(true);
  const [facing, setFacing] = useState('front');

  // Vision Camera permissions
  const { hasPermission, requestPermission } = useCameraPermission();
  const device = useCameraDevice(facing);

  useEffect(() => {
    if (!hasPermission) {
      requestPermission();
    }
  }, [hasPermission]);

  // Handle denied permissions
  if (hasPermission === false) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>No access to camera</Text>
        <View style={styles.permissionButtonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => Linking.openSettings()}>
            <Text style={styles.buttonText}>Grant Access</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Check authentication
  if (!user?.user_id) {
    return (
      <View style={[styles.container, styles.centered]}>
        <Text style={styles.message}>Authentication Required</Text>
        <View style={styles.permissionButtonContainer}>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/auth/sign-in')}>
            <Text style={styles.buttonText}>Sign In</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button} onPress={() => router.replace('/')}>
            <Text style={styles.buttonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Capture photo
  const handleCapture = async () => {
    try {
      if (camera.current == null) return;

      const photo = await camera.current.takePhoto({
        qualityPrioritization: 'balanced',
        flash: 'off',
      });

      const userId = user.user_id;
      const photoId = `${Date.now()}`;

      setIsActive(false);

      router.push({
        pathname: '/(authenticated)/snapshot',
        params: {
          photoId,
          localUri: `file://${photo.path}`,
          userId,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (e) {
      console.error('🔴 CAMERA ERROR:', e);
      Alert.alert('Error', 'Failed to capture photo');
      setIsActive(true);
    }
  };

  // Upload from gallery
  const handleUpload = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Library access is required');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.7,
      });

      if (!result.canceled && result.assets?.[0]) {
        const userId = user.user_id;
        const photoId = `${Date.now()}`;
        router.push({
          pathname: '/(authenticated)/snapshot',
          params: {
            photoId,
            localUri: result.assets[0].uri,
            userId,
            timestamp: new Date().toISOString(),
          },
        });
      }
    } catch (error) {
      console.error('🔴 UPLOAD ERROR:', error);
      Alert.alert('Error', 'Failed to access photo library');
    }
  };

  

  return (
    <View style={styles.container}>
      {isActive ? (
        <>
        {/* {device && (
          <Camera
            ref={camera}
            style={styles.camera}
            device={device}
            isActive={isActive}
            photo={true}
          />
        
        )
        } */}
          <FaceOverlay />
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.textButton}
              onPress={() => {
                setIsActive(false);
                router.back();
              }}
            >
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.captureButton} onPress={handleCapture}>
              <View style={styles.captureButtonInner} />
            </TouchableOpacity>

            <TouchableOpacity style={styles.textButton} onPress={handleUpload}>
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
  container: { flex: 1 },
  camera: { flex: 1 },
  buttonContainer: {
    backgroundColor: 'rgba(0,0,0,0.8)',
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
  textButton: { padding: 10, minWidth: 80, alignItems: 'center' },
  buttonText: { color: 'white', fontSize: 16 },
  captureButton: {
    width: 60, height: 60, borderRadius: 30,
    backgroundColor: 'rgba(255,255,255,0.3)',
    justifyContent: 'center', alignItems: 'center',
  },
  captureButtonInner: {
    width: 50, height: 50, borderRadius: 25, backgroundColor: 'white',
  },
  message: { fontSize: 16, color: 'black', textAlign: 'center', marginBottom: 20 },
  centered: { justifyContent: 'center', alignItems: 'center', flex: 1 },
  permissionButtonContainer: { gap: 10 },
  button: { backgroundColor: '#007AFF', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8 },
});
