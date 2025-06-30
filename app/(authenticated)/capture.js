// capture.js
// Route handler that directs to the camera

/* ------------------------------------------------------
WHAT IT DOES
- Acts as a router for camera functionality
- Directs to regular camera screen

DEV PRINCIPLES
- Keep routing logic separate from component logic
- Maintain clean separation of concerns

NEXT STEPS
[ ] Add analytics tracking
[ ] Add loading state during routing
------------------------------------------------------*/

import { useEffect } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { router } from 'expo-router';

export default function CaptureRoute() {
  useEffect(() => {
    // Route to camera screen
    router.replace('/camera');
  }, []);

  // Show loading state while routing
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" />
    </View>
  );
} 