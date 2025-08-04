// mobile/src/components/buttons/ModalButtons.js
// Reusable styled buttons for modals/bottom sheets

import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { colors, spacing, typography } from '../../../styles';

// --- Primary Button (Solid Background) ---
export const PrimaryButton = ({
  title,
  onPress,
  disabled = false,
  loading = false,
  style, // Allow passing additional styles
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        styles.primaryButton,
        disabled || loading ? styles.buttonDisabled : {},
        style, // Apply custom styles last
      ]}
      onPress={onPress}
      disabled={disabled || loading}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonTextBase, styles.primaryButtonText]}>
        {loading ? (title === "Save" ? "Saving..." : "Updating...") : title}
      </Text>
    </TouchableOpacity>
  );
};

// --- Secondary Button (Clear Background, Text Only) ---
export const SecondaryButton = ({
  title,
  onPress,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        styles.secondaryButton,
        disabled ? styles.buttonDisabled : {},
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonTextBase, styles.secondaryButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// --- Destructive Button (Red Text, Clear Background) ---
export const DestructiveButton = ({
  title,
  onPress,
  disabled = false,
  style,
}) => {
  return (
    <TouchableOpacity
      style={[
        styles.buttonBase,
        styles.destructiveButton, // Use specific style
        disabled ? styles.buttonDisabled : {},
        style,
      ]}
      onPress={onPress}
      disabled={disabled}
      activeOpacity={0.7}
    >
      <Text style={[styles.buttonTextBase, styles.destructiveButtonText]}>
        {title}
      </Text>
    </TouchableOpacity>
  );
};

// --- Styles --- 
const styles = StyleSheet.create({
  buttonBase: {
    paddingVertical: spacing.md, // Generous vertical padding
    paddingHorizontal: spacing.lg,
    borderRadius: 30, // Highly rounded corners
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%', // Make buttons take full width by default (within their container)
    // minHeight: 50, // Ensure consistent height
    marginVertical: spacing.sm, // Add vertical margin between buttons
  },
  primaryButton: {
    backgroundColor: colors.primary,
    // Add shadow/elevation if desired
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  secondaryButton: {
    backgroundColor: 'transparent', // No background
    paddingVertical: 2,
  },
  destructiveButton: {
    backgroundColor: 'transparent',
    paddingVertical: 2,
  },
  buttonDisabled: {
    opacity: 0.5, // Standard disabled appearance
  },
  buttonTextBase: {
    ...typography.button, // Use button typography
    fontWeight: '600', // Slightly bolder
  },
  primaryButtonText: {
    color: colors.textOnPrimary,
  },
  secondaryButtonText: {
    color: colors.textSecondary, // Use secondary text color (often grey)
  },
  destructiveButtonText: {
    color: colors.error, // Use error color for text
  },
});
