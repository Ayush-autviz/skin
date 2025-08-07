// TabHeader.js
// Beautiful header component for tab screens with sidebar menu

/* ------------------------------------------------------
WHAT IT DOES
- Displays beautiful header across tab screens
- Shows menu icon that opens sidebar
- Modern gradient background with blur effect
- Consistent branding with logo

DEV PRINCIPLES
- Modern, beautiful design
- Consistent across all tabs
- Easy sidebar integration
------------------------------------------------------*/

import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { BlurView } from 'expo-blur';
import { Ionicons } from '@expo/vector-icons';
import { colors, typography, spacing } from '../../styles';

export default function TabHeader({ title, onMenuPress, rightComponent, showBack = false }) {
  return (
    <View style={styles.headerContainer}>
      <BlurView 
        intensity={80} 
        tint="light"
        style={styles.blurContainer}
      >
        <View style={styles.header}>
          {/* Left - Menu Icon */}
          <TouchableOpacity 
            onPress={onMenuPress}
            style={styles.menuButton}
            activeOpacity={0.7}
          >
            <View style={styles.menuIconContainer}>
              {showBack ? (
                <Ionicons name="chevron-back" size={22} color={colors.primary} />
              ) : (
                <Ionicons name="menu-outline" size={24} color={colors.primary} />
              )}
            </View>
          </TouchableOpacity>

          {/* Center - Title */}
          <View style={styles.titleContainer}>
            <Text style={styles.title}>{title}</Text>
            <View style={styles.titleUnderline} />
          </View>

          {/* Right - Optional Component */}
          <View style={styles.rightContainer}>
            {rightComponent}
          </View>
        </View>
      </BlurView>
      
      {/* Bottom shadow */}
      <View style={styles.shadowContainer} />
    </View>
  );
}

const styles = StyleSheet.create({
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 120,
  },

  blurContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: spacing.lg,
  },
  menuButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    // iOS shadow
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    // Android shadow
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    opacity: 0.8,
  },
  rightContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  shadowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.1,
    // iOS shadow
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    // Android shadow
    elevation: 2,
  },
}); 