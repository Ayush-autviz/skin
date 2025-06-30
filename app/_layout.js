import { Stack } from 'expo-router';
import { PhotoProvider } from '../src/contexts/PhotoContext';
import { UserProvider } from '../src/contexts/UserContext';
import { ThreadProvider } from '../src/contexts/ThreadContext';
import { FirebaseProvider } from '../src/contexts/FirebaseProvider';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

// Root layout with Firebase initialization
export default function RootLayout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <FirebaseProvider>
        <UserProvider>
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
        </UserProvider>
      </FirebaseProvider>
    </GestureHandlerRootView>
  );
} 