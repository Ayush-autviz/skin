import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, isFirebaseInitialized } from '../config/firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { View, ActivityIndicator } from 'react-native';

const FirebaseContext = createContext({
  isInitialized: false,
  isAuthenticated: false,
  user: null,
});

export function FirebaseProvider({ children }) {
  const [isInitialized, setIsInitialized] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let authUnsubscribe = () => {};

    const initializeFirebase = async () => {
      try {
        // Check Firebase initialization
        const status = isFirebaseInitialized();
        console.log('🔥 Firebase Initialization Status:', status);
        
        if (Object.values(status).every(Boolean)) {
          setIsInitialized(true);
          
          // Only set up auth listener after Firebase is initialized
          authUnsubscribe = onAuthStateChanged(auth, (user) => {
            setUser(user);
            setIsAuthenticated(!!user);
            setIsLoading(false);
            // console.log('👤 Auth State Changed:', !!user);
          });
        } else {
          console.error('Firebase initialization incomplete:', status);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Firebase initialization error:', error);
        setIsLoading(false);
      }
    };

    initializeFirebase();

    return () => {
      authUnsubscribe();
    };
  }, []);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <FirebaseContext.Provider 
      value={{
        isInitialized,
        isAuthenticated,
        user,
      }}
    >
      {children}
    </FirebaseContext.Provider>
  );
}

export const useFirebase = () => {
  const context = useContext(FirebaseContext);
  if (context === undefined) {
    throw new Error('useFirebase must be used within a FirebaseProvider');
  }
  return context;
}; 