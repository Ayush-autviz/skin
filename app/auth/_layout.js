// auth/_layout.js
// Layout configuration for authentication screens

/* ------------------------------------------------------
WHAT IT DOES
- Configures navigation transitions for auth screens
- Sets up stack navigation for auth flow
- Maintains consistent navigation behavior

DEV PRINCIPLES
- Use native-feeling transitions
- Keep transitions smooth
- Maintain visual hierarchy
------------------------------------------------------*/

import { Stack } from 'expo-router';

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
        // Optional: customize animation duration
        animationDuration: 200,
      }}
    >
      <Stack.Screen 
        name="sign-in" 
        options={{
          animation: 'slide_from_left'
        }}
      />
      <Stack.Screen 
        name="sign-up"
        options={{
          animation: 'slide_from_right'
        }}
      />
      <Stack.Screen 
        name="forgot-password"
        options={{
          animation: 'slide_from_right'
        }}
      />
    </Stack>
  );
} 