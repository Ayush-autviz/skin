/* ------------------------------------------------------
WHAT IT DOES
- Initializes Firebase with environment variables
- Sets up persistent authentication storage
- Exports Firebase instances

DEV PRINCIPLES
- Keep Firebase config separate from business logic
- Use environment variables for sensitive data
- Initialize Firebase only once
- Ensure proper initialization order


*************************************************
DO NOT ALTER THIS FILE 
************************************************



------------------------------------------------------*/

import { initializeApp } from 'firebase/app';
import { getReactNativePersistence, initializeAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getDatabase } from 'firebase/database';
import AsyncStorage from '@react-native-async-storage/async-storage';
console.log(process.env.EXPO_PUBLIC_FIREBASE_API_KEY,'firebse key')
// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
  databaseURL: process.env.EXPO_PUBLIC_FIREBASE_DATABASE_URL
};

// Simple environment detection without importing other modules
const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';
const isDev = environment === 'development';

// Log configuration in development
if (isDev) {
  console.log('🔧 Firebase Config (Dev Mode):', firebaseConfig.projectId);
}

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Auth with AsyncStorage persistence
const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(AsyncStorage)
});

// Initialize Firestore
const db = getFirestore(app);

// Initialize Storage
const storage = getStorage(app);

// Initialize Realtime Database
let rtdb;
try {
  if (isDev) console.log('🔧 Initializing Realtime Database...');
  rtdb = getDatabase(app);
  if (isDev) console.log('🔧 Realtime Database initialized successfully');
} catch (error) {
  console.error('Error initializing Realtime Database:', error);
  rtdb = null;
}

console.log('\n\n---------------------------');
console.log('🔥 Firebase initialized successfully');
console.log(`🌍 Environment: ${environment}`);
console.log(`🔥 Project: ${firebaseConfig.projectId}`);
console.log('---------------------------');

// Export initialized instances
export { app, auth, db, storage, rtdb };

// Export initialization status checker
export const isFirebaseInitialized = () => {
  return {
    app: !!app,
    auth: !!auth,
    db: !!db,
    storage: !!storage,
    rtdb: !!rtdb
  };
}; 