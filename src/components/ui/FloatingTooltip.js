// FloatingTooltip.js
// Generic floating tooltip component that can be positioned anywhere on screen

/* ------------------------------------------------------
WHAT IT DOES
- Displays a floating tooltip above all other content
- Positions itself absolutely relative to the screen
- Accepts custom content and positioning
- Can be used by any component that needs tooltips

PROPS
- visible: Boolean - whether tooltip should be shown
- x: Number - horizontal position on screen
- y: Number - vertical position on screen (from top)
- content: Object - { primary, secondary } text content
- style: Object (optional) - custom styling overrides

DEVELOPMENT HISTORY
- 2025-05-28: Initial creation for metric detail charts
------------------------------------------------------*/

// **LLM Notes**
// - This is a generic component - keep it flexible for reuse
// - Position is always absolute to screen, not relative to parent
// - Content should be structured but flexible

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

const FloatingTooltip = ({ 
  visible = false, 
  x = 0, 
  y = 0, 
  content = {},
  style = {}
}) => {
  if (!visible) return null;

  const { primary, secondary } = content;

  return (
    <View style={[styles.overlay, { zIndex: 9999 }]} pointerEvents="none">
      <View style={[
        styles.tooltipContainer,
        {
          position: 'absolute',
          left: x - 36, // Center tooltip on x position (tooltip width is ~72)
          top: y - 60,  // Position above the target point
        },
        style
      ]}>
        <View style={styles.tooltipContent}>
          {primary && <Text style={styles.primaryText}>{primary}</Text>}
          {secondary && <Text style={styles.secondaryText}>{secondary}</Text>}
        </View>
        <View style={styles.tooltipArrow} />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  tooltipContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  tooltipContent: {
    backgroundColor: '#2C2C2E',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 8,
    minWidth: 72,
  },
  primaryText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  secondaryText: {
    color: '#FFFFFF',
    fontSize: 10,
    opacity: 0.85,
    textAlign: 'center',
    lineHeight: 11,
  },
  tooltipArrow: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 8,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
    borderTopColor: '#2C2C2E',
    marginTop: -1,
  },
});

export default FloatingTooltip; 