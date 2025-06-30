// RoutineActionsCard.js
// A card component providing primary actions for the routine screen.

/* ------------------------------------------------------
WHAT IT DOES
- Displays a card with actionable buttons/chips.
- Provides callbacks for 'Add' and 'Discuss' actions.

PROPS
- onAddPress (function): Callback when 'Add to my routine' is pressed.
- onDiscussPress (function): Callback when 'Discuss routine' is pressed.
------------------------------------------------------*/

import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import Chip from '../ui/Chip'; // Import Chip from ui directory
import { palette, colors, spacing, typography } from '../../styles';

export default function RoutineActionsCard({ onAddPress, onDiscussPress }) {
  return (
    <View style={styles.cardContainer}>
      <TouchableOpacity onPress={onAddPress} style={styles.chipTouchable}>
        <Chip 
          label="Add to my routine" 
          type="default" // Use default grey
          styleVariant="bold" // Make it stand out
          size="md" // Medium size seems appropriate
        />
      </TouchableOpacity>
      <TouchableOpacity onPress={onDiscussPress} style={styles.chipTouchable}>
        <Chip 
          label="Discuss routine" 
          type="default" // Use default grey
          styleVariant="bold" // Make it stand out
          size="md" // Medium size
        />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: palette.gray2, // Use a light grey from palette
    marginHorizontal: spacing.lg, // Match MyRoutine horizontal padding
    marginBottom: spacing.md,    // Space below the card
    marginTop: spacing.sm,     // Space above the card
    paddingVertical: spacing.sm, // Reduced padding vs AiMessageCard
    paddingHorizontal: spacing.md,
    borderRadius: 12,
    flexDirection: 'row',       // Arrange chips horizontally
    justifyContent: 'space-around', // Distribute chips evenly
    alignItems: 'center',
    // Optional: Add subtle shadow/border if desired
    shadowColor: colors.black,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1, 
    borderColor: palette.gray3, 
  },
  chipTouchable: {
    // No specific style needed for touchable wrapper unless margins are desired per chip
  },
}); 