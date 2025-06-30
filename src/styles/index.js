// index.js
// Exports all style configurations

/* ------------------------------------------------------
WHAT IT DOES
- Centralizes style exports
- Provides single import point for components
- Maintains style organization

DEV PRINCIPLES
- Keep exports at root level for direct access
- Organize by category (colors, spacing, forms, etc)
- Maintain flat structure for easy access
------------------------------------------------------*/

import palette from './palette';
import { colors, spacing, borderRadius, shadows } from './theme';
import { typography, fontSize } from './typography';
import forms from './forms';

// Export everything at root level
export {
  // Colors
  palette,
  colors,
  
  // Layout
  spacing,
  borderRadius,
  shadows,
  
  // Typography
  typography,
  fontSize,
  
  // Form Elements
  forms,
};

// Common combinations at root level too
export const common = {
  shadow: shadows.md,
  card: {
    backgroundColor: colors.background,
    borderRadius: borderRadius.md,
    padding: spacing.md,
  }
};

// Usage:
colors.primary
spacing.lg
typography.h1
forms.input.base 