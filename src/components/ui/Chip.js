// Chip.js
// Reusable chip component for displaying small pieces of info (like category/type)

/* ------------------------------------------------------
WHAT IT DOES
- Displays text label within a styled chip.
- Supports different sizes, types (colors), and variants (styles).

PROPS
- label (string): The text to display.
- type (string): Determines the dark color used ('ingredient', 'activity', 'nutrition', 'usage', 'default'). Defaults to 'default' (grey).
- size (string): Size of the chip ('sm', 'md', 'lg'). Defaults to 'md'.
- styleVariant (string): Appearance style ('normal', 'bold'). Defaults to 'normal'.
- onPress (function): Callback function to be called when the chip is pressed.

DEV PRINCIPLES
- Reusable and flexible.
- Consistent styling based on props.
------------------------------------------------------*/

import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { palette, colors, spacing, typography } from '../../styles';

// Function to get the dark color based on type
const getDarkColor = (type) => {
  switch (type) {
    case 'ingredient':
      return colors.primary;
    case 'activity':
      return '#009688'; // Keep placeholder or use theme color
    case 'nutrition':
      return '#ff9800'; // Keep placeholder or use theme color
    case 'usage':
      return colors.primary; // Usage chips are primary color when bold
    case 'default':
    default:
      return palette.gray7 // Use gray from the exported palette
  }
};

export default function Chip({
  label,
  type = 'default',
  size = 'md',
  styleVariant = 'normal',
  onPress,
}) {
  if (!label) return null;

  const darkColor = getDarkColor(type);
  const whiteColor = '#FFFFFF'; // Hardcode white color for testing

  // Base styles
  const chipStyle = [styles.chipBase];
  const textStyle = [styles.textBase];

  // Apply size styles
  if (size === 'sm') {
    chipStyle.push(styles.sizeSm);
    textStyle.push(styles.textSizeSm);
  } else if (size === 'lg') {
    chipStyle.push(styles.sizeLg);
    textStyle.push(styles.textSizeLg);
  } else { // Default to md
    chipStyle.push(styles.sizeMd);
    textStyle.push(styles.textSizeMd);
  }

  // Apply variant styles
  chipStyle.push({ borderColor: darkColor }); // Border is always dark color

  if (styleVariant === 'bold') {
    // Bold: Dark background, white text
    chipStyle.push({ backgroundColor: darkColor });
    textStyle.push({ color: whiteColor });
  } else {
    // Normal (default): White background, dark text
    chipStyle.push({ backgroundColor: whiteColor });
    textStyle.push({ color: darkColor });
  }

  // Conditionally wrap in TouchableOpacity only if onPress is provided
  if (onPress) {
    return (
      <TouchableOpacity onPress={onPress} style={chipStyle} activeOpacity={0.7}> 
        <Text style={textStyle}>{label}</Text>
      </TouchableOpacity>
    );
  } else {
    // Render without touch wrapper if no onPress is given
    return (
      <View style={chipStyle}>
        <Text style={textStyle}>{label}</Text>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  chipBase: {
    borderRadius: 999,
    borderWidth: 1,
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    // Vertical padding and height are controlled by size styles
  },
  textBase: {
    ...typography.caption, // Base typography
    fontWeight: '600',
    // Font size is controlled by size styles
  },
  // --- Size Styles --- 
  sizeSm: {
    paddingVertical: spacing.xxs,
    paddingHorizontal: spacing.sm,
  },
  textSizeSm: {
     fontSize: typography.caption.fontSize * 0.85, // Smaller font
  },
  sizeMd: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
  },
  textSizeMd: {
     fontSize: typography.caption.fontSize, // Default caption size
  },
  sizeLg: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
  },
  textSizeLg: {
     fontSize: typography.caption.fontSize * 1.2, // Larger font
  },
  // --- Removed old type-specific and inactive styles ---
}); 