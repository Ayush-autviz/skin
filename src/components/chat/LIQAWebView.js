// LIQAWebView/index.js
// React Native WebView wrapper for Haut.AI LIQA integration

/* ------------------------------------------------------
WHAT IT DOES
- Provides a WebView wrapper for LIQA skin analysis
- Handles communication between LIQA and our app
- Manages camera permissions and error states

DATA USED
- HAUT_API_KEY: API key for Haut.AI authentication
- HAUT_API_URL: Base URL for LIQA integration
- Camera permissions from expo-camera

DEV PRINCIPLES
- Always use vanilla JS
- Handle all WebView errors gracefully
- Maintain clear communication channel with LIQA
- Follow mobile-first responsive design

NEXT STEPS
[ ] Add error boundary
[ ] Implement loading states
[ ] Add custom styling options
------------------------------------------------------*/

import React from 'react';
import { WebView } from 'react-native-webview';

const HTML = `
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">
    <script type="module" src="https://liqa.haut.ai/liqa.js"></script>
    <style>
      * { margin: 0; padding: 0; }
      html, body { width: 100%; height: 100%; }
    </style>
  </head>
  <body>
    <hautai-liqa license="eyJpZCI6IkhBVVQtMjUwMjAxMTQtMCJ9"></hautai-liqa>
    <script>
      // Get LIQA element
      const liqa = document.querySelector('hautai-liqa');
      
      // Listen for captures event
      liqa.addEventListener('captures', async (event) => {
        try {
          // Convert captures to blobs
          const images = await Promise.all(
            event.detail.map(capture => capture.blob())
          );
          
          // Convert blobs to base64 strings for sending to React Native
          const base64Images = await Promise.all(
            images.map(async (blob) => {
              return new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result);
                reader.readAsDataURL(blob);
              });
            })
          );

          // Send to React Native
          window.ReactNativeWebView.postMessage(JSON.stringify({
            name: 'captures',
            payload: {
              images: base64Images
            }
          }));
        } catch (error) {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            name: 'error',
            payload: {
              message: error.message
            }
          }));
        }
      });

      // Forward all other LIQA events
      liqa.addEventListener('*', (event) => {
        if (event.type !== 'captures') {
          window.ReactNativeWebView.postMessage(JSON.stringify({
            name: event.type,
            payload: event.detail
          }));
        }
      });
    </script>
  </body>
</html>
`;

export const LIQAWebView = ({ onLiqaEvent }) => {
  const handleWebviewMessage = (event) => {
    const message = event.nativeEvent.data;
    const { name, payload } = JSON.parse(message);
    onLiqaEvent(name, payload);
  };

  return (
    <WebView
      source={{
        html: HTML,
        baseUrl: "https://localhost",
      }}
      originWhitelist={["*"]}
      mediaPlaybackRequiresUserAction={false}
      allowsInlineMediaPlayback={true}
      onMessage={handleWebviewMessage}
      mediaCapturePermissionGrantType="grant"
    />
  );
};

export default LIQAWebView; 