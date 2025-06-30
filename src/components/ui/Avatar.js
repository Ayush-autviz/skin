// Avatar.js
// UI component for displaying user avatars or initials

/* ------------------------------------------------------
WHAT IT DOES
- Displays user avatar image if provided
- Falls back to initials if no image
- Supports different sizes
- Maintains consistent styling

DEV PRINCIPLES
- Use theme colors and spacing
- Support multiple sizes
- Keep it simple and reusable
------------------------------------------------------*/

import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { colors, spacing, borderRadius, typography, palette } from '../../styles';

const getInitials = (name) => {
  if (!name) return '';
  return name.charAt(0).toUpperCase();
};

const Avatar = ({ 
  size = 'md', 
  name = '', 
  imageUrl,
  style 
}) => {
  const styles = getStyles(size);

  if (imageUrl) {
    return (
      <Image 
        source={{ uri: imageUrl }} 
        style={[styles.avatar, style]}
      />
    );
  }

  return (
    <View style={[styles.avatar, styles.initialsContainer, style]}>
      <Text style={styles.initials}>{getInitials(name)}</Text>
    </View>
  );
};

const getStyles = (size) => {
  const dimensions = {
    sm: 32,
    md: 40,
    lg: 56,
    xl: 72
  };

  return StyleSheet.create({
    avatar: {
      width: dimensions[size],
      height: dimensions[size],
      borderRadius: borderRadius.pill,
      backgroundColor: colors.surface,
    },
    initialsContainer: {
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.primary,
    },
    initials: {
      color: palette.gray1,
      fontSize: dimensions[size] * 0.4,
      fontWeight: '500',
    }
  });
};

export default Avatar; 