// authStore.js
// Zustand store for user authentication and profile management

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // User authentication state
      user: null,
      isAuthenticated: false,
      loading: false,
      
      // Tokens
      accessToken: null,
      refreshToken: null,
      
      // Profile data and status
      profile: null,
      profileStatus: null, // true = complete, false = incomplete
      
      // Actions
      setUser: (user) => set({ user, isAuthenticated: !!user }),
      
      setTokens: (accessToken, refreshToken) => set({ 
        accessToken, 
        refreshToken 
      }),
      
      setProfile: (profile) => set({ profile }),
      
      setProfileStatus: (profileStatus) => set({ profileStatus }),
      
      setLoading: (loading) => set({ loading }),
      
      updateProfile: (profileData) => set((state) => ({
        profile: { ...state.profile, ...profileData }
      })),
      
      // Clear all auth data on logout
      logout: () => set({ 
        user: null,
        isAuthenticated: false,
        accessToken: null,
        refreshToken: null,
        profile: null,
        profileStatus: null,
        loading: false 
      }),
      
      // Get current state
      getState: () => get(),
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        profile: state.profile,
        profileStatus: state.profileStatus,
      }),
    }
  )
);

export default useAuthStore; 