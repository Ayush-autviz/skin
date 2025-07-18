import { Stack } from 'expo-router';
import { PhotoProvider } from '../src/contexts/PhotoContext';
import { ThreadProvider } from '../src/contexts/ThreadContext';
import AuthProvider from '../src/contexts/AuthProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Root layout with new authentication system
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <AuthProvider>
        <PhotoProvider>
          <ThreadProvider>
              <Stack
                screenOptions={{
                  headerShown: false,
                }}
              >
                <Stack.Screen 
                  name="(authenticated)" 
                  options={{
                    animation: 'fade',
                  }}
                />
                <Stack.Screen 
                  name="auth" 
                  options={{
                    animation: 'fade',
                  }}
                />
                <Stack.Screen 
                  name="onboarding" 
                  options={{
                    animation: 'fade',
                  }}
                />
              </Stack>
            </ThreadProvider>
          </PhotoProvider>
        </AuthProvider>
    </GestureHandlerRootView>
  );
} 