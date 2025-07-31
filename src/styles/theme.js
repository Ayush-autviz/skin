// theme.js
// Core theme variables for the entire application

/* ------------------------------------------------------
WHAT IT DOES
- Defines semantic color usage
- Maps palette colors to functional names
- Provides theme configuration

DEV PRINCIPLES
- Use semantic names for colors
- Map from palette to usage
- Keep color mapping simple
------------------------------------------------------*/

import palette from './palette';

const colors = {
  // Brand Colors - Updated to match auth screens
  primary: '#8B7355', // Brownish/gold color from auth screens
  secondary: '#8B7355',
  white: '#FFFFFF',
  
  // UI Colors
  background: '#FFFFFF', // Pure white to match auth screens
  surface: '#FFFFFF',
  surfaceHover: palette.gray3,
  
  // Text Colors - Updated to match auth screens
  textPrimary: '#1F2937', // Dark gray from auth screens
  textSecondary: '#6B7280', // Medium gray from auth screens
  textTertiary: '#9CA3AF', // Light gray from auth screens
  textOnPrimary: '#FFFFFF', // White text on primary color
  textMicrocopy: '#9CA3AF',
  text: '#1F2937', // Alias for textPrimary
  
  // Status Colors
  error: '#FF6B6B', // Red color from auth screens
  success: palette.green,
  warning: palette.yellow,
  info: palette.blue,
  
  // Border Colors - Updated to match auth theme
  border: '#8B7355', // Use primary color for borders
  borderFocus: '#8B7355',
  
  // Utility Colors
  divider: palette.gray3,
  overlay: 'rgba(0, 0, 0, 0.4)',
  shadow: palette.gray8,
};

const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48
};

const borderRadius = {
  sm: 4,
  md: 8,
  lg: 16,
  xl: 24,
  pill: 9999
};

const shadows = {
  sm: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.18,
    shadowRadius: 1.0,
    elevation: 1,
  },
  md: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 3,
  },
  lg: {
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.32,
    shadowRadius: 5.46,
    elevation: 6,
  },
};

export { colors, spacing, borderRadius, shadows, palette }; 