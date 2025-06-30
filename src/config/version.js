// version.js
// Version management and configuration

/* ------------------------------------------------------
WHAT IT DOES
- Centralizes version management
- Provides consistent version formatting
- Enables version checking and comparison

DEV PRINCIPLES
- Follow semantic versioning
- Keep version info in one place
- Provide helper functions for version operations
------------------------------------------------------*/

import Constants from 'expo-constants';

export const version = {
  number: Constants.expoConfig?.version || '0.0.1',
  build: Constants.expoConfig?.buildNumber || '1',
  getFullVersion: () => `${version.number} (${version.build})`
}; 