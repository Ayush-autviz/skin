import messaging from '@react-native-firebase/messaging';
import { Alert, Platform } from 'react-native';

export async function requestUserPermission() {
  const authStatus = await messaging().requestPermission();
  const enabled =
    authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
    authStatus === messaging.AuthorizationStatus.PROVISIONAL;

  if (enabled) {
    console.log('✅ Notification permission granted.');
    getFcmToken();
  } else {
    console.log('🚫 Notification permission denied.');
  }
}

export async function getFcmToken() {
  console.log('🔑 Getting FCM Token...');
  try {
  const token = await messaging().getToken();
  } catch (error) {
    console.error('🚫 Error getting FCM token:', error);
  }
  console.log('🔑 FCM Token:', token);
  // 👉 send token to your backend if needed
  return token;
}

export function setupForegroundNotificationHandler() {
  messaging().onMessage(async remoteMessage => {
    console.log('📩 Foreground Notification:', remoteMessage);
    Alert.alert(
      remoteMessage.notification?.title || 'New Message',
      remoteMessage.notification?.body || ''
    );
  });
}
