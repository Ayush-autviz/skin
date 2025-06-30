// ListItem.js
// Reusable list item component for routine items, recommendations, and metric actions

/* ------------------------------------------------------

WHAT IT DOES
- Displays a consistent list item with icon, text content, and optional chips/badges
- Used across MyRoutine, RecommendationsList, and MetricDetail screens
- Supports different layouts and content types

DATA USED
- item object with name, description, type, etc.
- Optional onPress handler
- Optional chips/badges

DEVELOPMENT HISTORY
- 2025.01.XX - Initial creation for consistent list item design
- 2025.01.XX - Updated to match metricDetail "What You Can Do" card style

------------------------------------------------------*/

// **LLM Notes**
// - Keep this component flexible for different content types
// - Match the metricDetail.js "What You Can Do" design
// - Support icons, text, and action indicators

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
  iconColor = '#6E46FF', // Match metricDetail purple
  iconLibrary = 'MaterialCommunityIcons', // 'MaterialCommunityIcons' or 'Feather'
  chips = [],
  showChevron = true, // Default to true to match metricDetail
  titleSize = 'medium', // Add this prop back
  onPress,
  style,
  disabled = false
}) {
  const IconComponent = iconLibrary === 'Feather' ? Feather : MaterialCommunityIcons;

  const content = (
    <View style={[styles.container, style, disabled && styles.disabled]}>
      {/* Icon and Content Container */}
      <View style={styles.itemContent}>
        {/* Icon */}
        {icon && (
          <IconComponent 
            name={icon} 
            size={24}
            color={iconColor} 
            style={styles.icon} 
          />
        )}
        
        {/* Text Content */}
        <View style={styles.textContainer}>
          <Text style={[
            styles.title, 
            titleSize === 'small' && styles.titleSmall
          ]}>{title}</Text>
          {subtitle && (
            <Text style={styles.subtitle}>{subtitle}</Text>
          )}
          {description && (
            <Text style={styles.description}>{description}</Text>
          )}
          
          {/* Chips */}
          {chips.length > 0 && (
            <View style={styles.chipsContainer}>
              {chips.map((chip, index) => (
                <Chip 
                  key={index}
                  label={chip.label} 
                  type={chip.type || 'default'}
                  size="sm"
                  styleVariant={chip.styleVariant || 'normal'}
                />
              ))}
            </View>
          )}
        </View>
      </View>
      
      {/* Chevron */}
      {showChevron && (
        <Feather name="chevron-right" size={20} color="#999" />
      )}
    </View>
  );

  if (onPress && !disabled) {
    return (
      <TouchableOpacity onPress={onPress} activeOpacity={0.7}>
        {content}
      </TouchableOpacity>
    );
  }

  return content;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    paddingVertical: 12,
    paddingHorizontal: 8,
    marginBottom: 0,
    marginHorizontal: 0,
  },
  disabled: {
    opacity: 0.6,
  },
  itemContent: {
    flexDirection: 'row',
    alignItems: 'flex-start', // Align icon with top of text
    flex: 1, // Take up available space
  },
  icon: {
    marginRight: 12,
    marginTop: 2, // Slight alignment with multi-line text
  },
  textContainer: {
    flex: 1, // Allow text to wrap
  },
  title: {
    fontSize: 15, // Default medium size
    lineHeight: 20,
    color: '#333',
    fontWeight: '500',
    marginBottom: 2,
  },
  titleSmall: {
    fontSize: 14, // Small size override
  },
  subtitle: {
    fontSize: 12,
    color: '#666',
    marginBottom: 2,
  },
  description: {
    fontSize: 12,
    lineHeight: 16,
    color: '#777',
    marginBottom: 6,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 4,
    marginTop: 4,
  },
}); 