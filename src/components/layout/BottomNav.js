// BottomNav.js
// Bottom navigation bar with elevated center camera button

/* ------------------------------------------------------
WHAT IT DOES
- Displays bottom navigation bar with 3 buttons
- Center camera button is elevated above the bar
- Handles navigation actions

DATA USED
- onCameraPress: Function to handle camera button press

DEV PRINCIPLES
- Uses vanilla JavaScript
- Follows app-wide styling guidelines
- Maintains consistent navigation pattern

NEXT STEPS
[ ] Add active state styling for nav items
[ ] Implement side button actions
[ ] Add navigation icons
------------------------------------------------------*/

import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../styles';
import { router } from 'expo-router';


export default function BottomNav({ onCameraPress }) {
  return (
    <View style={styles.container}>
      <View style={styles.background}>
        <TouchableOpacity 
          style={styles.sideButton}
          onPress={() => router.push('/(authenticated)/progress')}
        >
          <Feather 
            name="bar-chart-2"
            size={20} 
            color={colors.text} 
          />
          <Text style={styles.sideButtonText}>Progress</Text>
        </TouchableOpacity>

        <View style={styles.centerButtonSpace} />

        <TouchableOpacity 
          style={styles.sideButton}
          onPress={() => router.push('/(authenticated)/routine')}
        >
          <Feather 
            name="check-circle"
            size={20} 
            color={colors.text} 
          />
          <Text style={styles.sideButtonText}>Routine</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity 
        style={styles.cameraButton}
        onPress={onCameraPress}
      >
        <Text style={styles.cameraButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    alignItems: 'center',
  },
  background: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 100,
    backgroundColor: '#fff',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingBottom: 20,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  sideButton: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sideButtonText: {
    color: colors.text,
    fontSize: 14,
  },
  centerButtonSpace: {
    width: 60,
  },
  cameraButton: {
    position: 'absolute',
    bottom: 72,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4.65,
    // Android shadow
    elevation: 8,
  },
  cameraButtonText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginTop: -4,
  },
}); 
