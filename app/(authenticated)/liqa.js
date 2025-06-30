// liqa.js
// LIQA WebView implementation route

/* ------------------------------------------------------
WHAT IT DOES
- Implements LIQA WebView integration
- Handles LIQA-specific camera flow
- Manages LIQA permissions and errors

DATA USED
- HAUT_API_KEY: API key for LIQA integration
- Camera permissions

DEV PRINCIPLES
- Keep LIQA implementation isolated
- Use vanilla JS
- Handle all WebView errors gracefully

NEXT STEPS
[ ] Implement error boundary
[ ] Add custom styling options
------------------------------------------------------*/

import { useState, useEffect } from "react";
import { View, StyleSheet, Alert } from "react-native";
import { Camera } from "expo-camera";
import Toast from "react-native-toast-message";
import { LIQAWebView } from "../../src/components/chat/LIQAWebView";
import { useRouter } from 'expo-router';
import { storage, auth } from '../../src/config/firebase';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { createPhotoDocument } from '../../src/services/FirebasePhotosService';

export default function LiqaScreen() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const webview = <LIQAWebView onLiqaEvent={handleLiqaEvent} />;
  const [view, setContentView] = useState();

  useEffect(() => {
    Camera.requestCameraPermissionsAsync()
      .then(() => setContentView(webview));
  }, []);

  const handleSuccess = async (photoId) => {
    try {
      setIsUploading(false);
      // Navigate to snapshot view
      console.log('🔵 LIQA: Navigating to snapshot...');
      router.replace(`/snapshot/${photoId}`);
    } catch (error) {
      console.error('🔴 LIQA: Error during navigation:', error);
      router.replace(`/snapshot/${photoId}`);
    }
  };

  async function handleLiqaEvent(name, payload) {
    let text = `LIQA: ${name}`;
    console.log('🔵 LIQA Event:', name, payload);

    if (name === 'captures') {
      try {
        setIsUploading(true);
        const { images } = payload;
        console.log(`🔵 LIQA: Received ${images.length} images`);

        // Get first image from the array (assuming it's the main capture)
        const base64Image = images[0];
        const userId = auth.currentUser?.uid;
        
        if (!userId) {
          console.error('🔴 LIQA: No user ID found!');
          return;
        }

        const photoId = `${Date.now()}`;
        console.log('🔵 LIQA: Photo details:', { userId, photoId });

        // 1. Convert base64 to blob
        const response = await fetch(base64Image);
        const blob = await response.blob();

        // 2. Upload to Firebase Storage
        console.log('🔵 LIQA: Starting Storage upload...');
        const storageRef = ref(storage, `users/${userId}/photos/${photoId}`);
        await uploadBytes(storageRef, blob);
        console.log('✅ LIQA: Photo uploaded to Storage');

        // 3. Get the download URL
        const storageUrl = await getDownloadURL(storageRef);
        console.log('✅ LIQA: Got download URL:', storageUrl);

        // 4. Create the photo document
        console.log('🔵 LIQA: About to call createPhotoDocument');
        await createPhotoDocument(userId, photoId, storageUrl);
        console.log('✅ LIQA: Photo process complete!');

        // Handle success
        await handleSuccess(photoId);

      } catch (error) {
        console.error('🔴 LIQA ERROR:', error.message);
        console.error('🔴 LIQA ERROR Stack:', error.stack);
        Alert.alert('Error', 'Failed to save photo. Please try again.');
        setIsUploading(false);
      }
    }

    // Show toast for all events
    if (payload) {
      let extras = JSON.stringify(payload);
      if (extras.length >= 1024) {
        extras = extras.substring(0, 1024) + "...";
      }
      text += `\n${extras}`;
    }

    log(text);
  }

  return (
    <View style={styles.container}>
      {view}
      <Toast />
    </View>
  );
}

function log(message) {
  const [text1, text2] = message.split("\n");
  Toast.show({
    text1,
    text2,
    position: "bottom",
  });
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  }
}); 