// ListItem.js
// Enhanced reusable list item component with modern design

/* ------------------------------------------------------

WHAT IT DOES
- Displays a modern, consistent list item with icon, text content, and optional chips/badges
- Used across MyRoutine, RecommendationsList, and MetricDetail screens
- Supports different layouts, variants, and content types
- Enhanced visual hierarchy and interaction states

DATA USED
- item object with name, description, type, etc.
- Optional onPress handler
- Optional chips/badges
- Variant and size options for flexible styling

DEVELOPMENT HISTORY
- 2025.01.XX - Initial creation for consistent list item design
- 2025.01.XX - Updated to match metricDetail "What You Can Do" card style
- 2025.07.XX - Enhanced design with better typography, spacing, and variants

------------------------------------------------------*/

import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons, Feather } from '@expo/vector-icons';
import { colors, spacing, typography } from '../../styles';
import Chip from './Chip';

export default function ListItem({
  title,
  subtitle,
  description,
  icon,
  iconColor = colors.primary,
  iconBackgroundColor = null,
  iconLibrary = 'MaterialCommunityIcons',
  chips = [],
  showChevron = true,
  titleSize = 'medium', // 'small', 'medium', 'large'
  variant = 'default', // 'default', 'compact', 'detailed', 'minimal'
  onPress,
  style,
  disabled = false,
  priority = 'normal', // 'low', 'normal', 'high' - affects visual prominence
  isNew = false, // Shows "NEW" badge
  rightElement = null, // Custom right-side content
  dateInfo = null, // New prop for date information
}) {
  const IconComponent = iconLibrary === 'Feather' ? Feather : MaterialCommunityIcons;
  
  // Dynamic styles based on variant and priority
  const getContainerStyle = () => {
    let baseStyle = styles.container;
    
    switch (variant) {
      case 'compact':
        baseStyle = { ...baseStyle, ...styles.containerCompact };
        break;
      case 'detailed':
        baseStyle = { ...baseStyle, ...styles.containerDetailed };
        break;
      case 'minimal':
        baseStyle = { ...baseStyle, ...styles.containerMinimal };
        break;
    }
    
    switch (priority) {
      case 'high':
        baseStyle = { ...baseStyle, ...styles.containerHigh };
        break;
      case 'low':
        baseStyle = { ...baseStyle, ...styles.containerLow };
        break;
    }
    
    return baseStyle;
  };

  const getIconStyle = () => {
    if (iconBackgroundColor) {
      return [
        styles.iconWithBackground,
        { backgroundColor: iconBackgroundColor }
      ];
    }
    return styles.icon;
  };

  const getTitleStyle = () => {
    let baseStyle = styles.title;
    
    switch (titleSize) {
      case 'small':
        baseStyle = { ...baseStyle, ...styles.titleSmall };
        break;
      case 'large':
        baseStyle = { ...baseStyle, ...styles.titleLarge };
        break;
    }
    
    if (priority === 'high') {
      baseStyle = { ...baseStyle, ...styles.titleHigh };
    }
    
    return baseStyle;
  };

  const content = (
    <View style={[
      getContainerStyle(),
      style,
      disabled && styles.disabled,
      onPress && !disabled && styles.pressable
    ]}>
      {/* Main Content Area */}
      <View style={styles.contentArea}>
        {/* Icon Container */}
        {icon && (
          <View style={getIconStyle()}>
            <IconComponent 
              name={icon} 
              size={variant === 'compact' ? 20 : 24}
              color={iconBackgroundColor ? colors.white : iconColor}
            />
          </View>
        )}
        
        {/* Text Content */}
        <View style={styles.textContainer}>
          {/* Title with optional NEW badge */}
          <View style={styles.titleRow}>
            <Text style={getTitleStyle()} numberOfLines={2}>
              {title}
            </Text>
            {isNew && (
              <View style={styles.newBadge}>
                <Text style={styles.newBadgeText}>NEW</Text>
              </View>
            )}
          </View>
          
          {/* {subtitle && (
            <Text style={styles.subtitle} numberOfLines={1}>
              {subtitle}
            </Text>
          )} */}
          
          {description && (
            <Text 
              style={styles.subtitle} 
              numberOfLines={variant === 'compact' ? 2 : 3}
            >
              {description}
            </Text>
          )}
          
          {/* Chips */}
          {chips.length > 0 && (
            <View style={styles.chipsContainer}>
              {chips.map((chip, index) => (
                <Chip 
                  key={index}
                  label={chip.label} 
                  type={chip.type || 'default'}
                  size={variant === 'compact' ? 'xs' : 'sm'}
                  styleVariant={chip.styleVariant || 'normal'}
                />
              ))}
            </View>
          )}
          
          {/* Date Information */}
          {dateInfo && (
            <Text style={styles.dateInfo}>
              {dateInfo}
            </Text>
          )}
        </View>
      </View>
      
      {/* Right Side Content */}
      <View style={styles.rightContent}>
        {rightElement}
        {showChevron && !rightElement && (
          <Feather 
            name="chevron-right" 
            size={20} 
            color={colors.textSecondary}
            style={styles.chevron}
          />
        )}
      </View>
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity 
        onPress={onPress} 
        activeOpacity={0.7}
        style={styles.touchableContainer}
      >
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  touchableContainer: {
    // Ensures proper touch target
  },
  container: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginVertical: 6,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 70,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.06)',
  },
  containerCompact: {
    minHeight: 60,
    paddingVertical: 12,
    marginVertical: 4,
  },
  containerDetailed: {
    minHeight: 90,
    paddingVertical: 20,
  },
  containerMinimal: {
    backgroundColor: 'transparent',
    shadowOpacity: 0,
    elevation: 0,
    borderWidth: 0,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.08)',
    borderRadius: 0,
    marginHorizontal: 0,
  },
  containerHigh: {
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    shadowOpacity: 0.12,
  },
  containerLow: {
    opacity: 0.8,
  },
  pressable: {
    // Visual feedback for pressable items
    transform: [{ scale: 1 }],
  },
  disabled: {
    opacity: 0.5,
  },
  contentArea: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  icon: {
    marginRight: 14,
    marginTop: 2,
  },
  iconWithBackground: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  textContainer: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 2,
  },
  title: {
    fontSize: 16,
    lineHeight: 22,
    color: colors.textPrimary,
    fontWeight: '600',
    flex: 1,
  },
  titleSmall: {
    fontSize: 14,
    lineHeight: 20,
  },
  titleLarge: {
    fontSize: 18,
    lineHeight: 24,
    fontWeight: '700',
  },
  titleHigh: {
    color: colors.primary,
  },
  subtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    marginBottom: 4,
    fontWeight: '500',
  },
  description: {
    fontSize: 13,
    lineHeight: 18,
    color: colors.textTertiary,
    marginBottom: 8,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 4,
  },
  dateInfo: {
    fontSize: 11,
    color: colors.textTertiary,
    marginTop: 4,
    fontStyle: 'italic',
  },
  newBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginLeft: 8,
  },
  newBadgeText: {
    fontSize: 10,
    fontWeight: '700',
    color: colors.white,
    letterSpacing: 0.5,
  },
  rightContent: {
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 12,
  },
  chevron: {
    opacity: 0.6,
  },
});

// Default color scheme if not imported
const defaultColors = {
  primary: '#6E46FF',
  white: '#FFFFFF',
  success: '#10B981',
  textPrimary: '#1F2937',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
};