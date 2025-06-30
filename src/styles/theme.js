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
  // Brand Colors
  primary: palette.indigo,
  secondary: palette.indigo,
  
  // UI Colors
  background: palette.gray1,
  surface: palette.gray2,
  surfaceHover: palette.gray3,
  
  // Text Colors
  textPrimary: palette.gray8,
  textSecondary: palette.gray7,
  textTertiary: palette.gray6,
  textOnPrimary: palette.gray1,
  textMicrocopy: palette.gray5,
  // Status Colors
  error: palette.red,
  success: palette.green,
  warning: palette.yellow,
  info: palette.blue,
  
  // Border Colors
  border: palette.gray4,
  borderFocus: palette.blue,
  
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