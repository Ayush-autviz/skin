// forms.js
// Form styles and variants for inputs, buttons, etc.

/* ------------------------------------------------------
WHAT IT DOES
- Defines form element styles
- Provides variants for different states
- Maintains consistent form styling

DEV PRINCIPLES
- Keep consistent spacing
- Maintain clear hierarchy
- Use semantic naming
------------------------------------------------------*/

import { colors, spacing, borderRadius, palette } from './theme';
import { typography } from './typography';

const forms = {
  // Text Inputs
  input: {
    base: {
      height: 56,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      borderRadius: borderRadius.md,
      paddingHorizontal: spacing.md,
      paddingVertical: spacing.sm,
      color: colors.textPrimary,
      ...typography.body,
      fontSize: 16,
    },
    focus: {
      borderColor: colors.borderFocus,
    },
    error: {
      borderColor: colors.error,
    },
    disabled: {
      backgroundColor: colors.surface,
      color: colors.textTertiary,
    },
    placeholder: {
      color: colors.textTertiary,
    },
  },

  // Labels
  label: {
    base: {
      marginBottom: spacing.xs,
      color: colors.textSecondary,
      ...typography.caption,
    },
    error: {
      color: colors.error,
    },
    required: {
      color: colors.error,
    },
  },

  // Error Messages
  errorText: {
    marginTop: spacing.xs,
    color: colors.error,
    ...typography.caption,
  },

  // Buttons
  button: {
    // Primary Button
    primary: {
      container: {
        backgroundColor: colors.primary,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.pill,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
      },
      text: {
        color: colors.textOnPrimary,
        ...typography.button,
      },
      disabled: {
        opacity: 0.5,
      },
    },

    // Secondary Button
    secondary: {
      container: {
        backgroundColor: colors.surface,
        paddingVertical: spacing.md,
        paddingHorizontal: spacing.xl,
        borderRadius: borderRadius.pill,
        borderWidth: 1,
        borderColor: colors.primary,
        minHeight: 48,
        justifyContent: 'center',
        alignItems: 'center',
      },
      text: {
        color: colors.primary,
        ...typography.button,
      },
      disabled: {
        opacity: 0.5,
      },
    },

    // Text Button (Link-like)
    text: {
      container: {
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
      },
      text: {
        color: colors.primary,
        ...typography.button,
        textDecorationLine: 'underline',
      },
      disabled: {
        opacity: 0.5,
      },
    },
  },

  // Helper Text
  helperText: {
    marginTop: spacing.xs,
    color: colors.textTertiary,
    ...typography.caption,
  },

  // Form Groups
  formGroup: {
    marginBottom: spacing.lg,
  },
};

export default forms; 