/* ------------------------------------------------------
WHAT IT DOES
- Provides environment-specific configuration
- Handles feature flags and environment detection
- Centralizes environment-dependent settings

USAGE
import { config, isDevelopment, isProduction } from '../config/environment';

if (isDevelopment()) {
  console.log('Debug info:', config.API_BASE_URL);
}

------------------------------------------------------*/

// Get the current environment
const environment = process.env.EXPO_PUBLIC_ENVIRONMENT || 'development';

// Environment detection helpers
export const isDevelopment = () => environment === 'development';
export const isProduction = () => environment === 'production';
export const isPreview = () => environment === 'preview';

// Environment-specific configuration
export const config = {
  // Environment info
  ENVIRONMENT: environment,
  
  // API Configuration
  API_BASE_URL: process.env.EXPO_PUBLIC_API_BASE_URL || 'https://dev-api.yourapp.com',
  
  // Firebase (already handled in firebase.js, but available here too)
  FIREBASE_PROJECT_ID: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  
  // Feature Flags
  ENABLE_DEBUG_LOGS: process.env.EXPO_PUBLIC_ENABLE_DEBUG_LOGS === 'true' || isDevelopment(),
  ENABLE_ANALYTICS: process.env.EXPO_PUBLIC_ENABLE_ANALYTICS === 'true' || isProduction(),
  
  // Development settings
  LOG_LEVEL: process.env.EXPO_PUBLIC_LOG_LEVEL || (isDevelopment() ? 'debug' : 'error'),
  
  // App-specific settings
  MAX_PHOTO_SIZE: isDevelopment() ? 1024 : 2048,
  UPLOAD_TIMEOUT: isDevelopment() ? 30000 : 60000, // 30s dev, 60s prod
};

// Logging helper that respects environment
export const envLog = (message, level = 'log') => {
  if (config.ENABLE_DEBUG_LOGS) {
    console[level](`[${environment.toUpperCase()}]`, message);
  }
};

// Export environment info for debugging
export const getEnvironmentInfo = () => ({
  environment,
  isDevelopment: isDevelopment(),
  isProduction: isProduction(),
  isPreview: isPreview(),
  config: {
    API_BASE_URL: config.API_BASE_URL,
    ENABLE_DEBUG_LOGS: config.ENABLE_DEBUG_LOGS,
    ENABLE_ANALYTICS: config.ENABLE_ANALYTICS,
  }
});

// Helper to display current environment info
export const logEnvironmentInfo = () => {
  console.log('\n🌍 ENVIRONMENT INFO');
  console.log('===================');
  console.log(`Environment: ${environment}`);
  console.log(`Firebase Project: ${config.FIREBASE_PROJECT_ID}`);
  console.log(`Debug Logs: ${config.ENABLE_DEBUG_LOGS ? 'ON' : 'OFF'}`);
  console.log(`Analytics: ${config.ENABLE_ANALYTICS ? 'ON' : 'OFF'}`);
  console.log(`Running Mode: ${isDevelopment() ? 'Development' : isProduction() ? 'Production' : 'Preview'}`);
  console.log('===================\n');
}; 