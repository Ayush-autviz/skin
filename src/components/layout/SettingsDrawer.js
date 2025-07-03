// SettingsDrawer.js
// Beautiful settings drawer component with modern design

/* ------------------------------------------------------
WHAT IT DOES
- Displays settings options with beautiful UI
- Handles user logout
- Provides smooth drawer animation
- Modern gradient design with card-based layout

DEV PRINCIPLES
- Modern, beautiful design
- Smooth animations
- Consistent with app design language
------------------------------------------------------*/

import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Image } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography, fontSize } from '../../styles';
import { version } from '../../config/version';
import Avatar from '../ui/Avatar';
import { useUser } from '../../contexts/UserContext';

export default function SettingsDrawer({ isVisible, onClose }) {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const router = useRouter();
  const { user, profile, userData, updateState } = useUser();
  
  const fullName = profile?.firstName && profile?.lastName 
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : '';

  const [userInfo, setUserInfo] = useState({
    name: fullName || 'User',
    email: user?.email || '',
    photoURL: user?.photoURL || null
  });

  useEffect(() => {
    setUserInfo({
      name: fullName || 'User',
      email: user?.email || '',
      photoURL: user?.photoURL || null
    });
  }, [user, profile]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -350,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const handleSignOut = async () => {
    try {
      await signOut(auth);
      onClose();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const handleProfilePress = () => {
    onClose();
    router.push('/profile');
  };

  const handleResetOnboarding = async () => {
    try {
      await updateState('onboarding');
      onClose();
      console.log('✅ User state reset to onboarding');
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
    }
  };

  const MenuItem = ({ icon, title, onPress, textColor = colors.textPrimary, iconColor = colors.primary, showArrow = true }) => (
    <TouchableOpacity 
      style={styles.menuItem}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={22} color={iconColor} />
          </View>
          <Text style={[styles.menuText, { color: textColor }]}>{title}</Text>
        </View>
        {showArrow && (
          <Ionicons name="chevron-forward" size={20} color={colors.textTertiary} />
        )}
      </View>
    </TouchableOpacity>
  );

  if (!isVisible) return null;

  return (
    <Modal
      visible={isVisible}
      animationType="none"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <Animated.View 
          style={[
            styles.drawer,
            {
              transform: [{ translateX: slideAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={['#FFFFFF', '#F8F6F2']}
            style={styles.drawerGradient}
          >
            {/* Header with Profile */}
            <View style={styles.header}>
              <View style={styles.profileCard}>
                <Avatar 
                  name={fullName}
                  imageUrl={profile?.photoURL}
                  size="xl"
                />
                <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{userInfo.name}</Text>
                  <Text style={styles.profileEmail}>{userInfo.email}</Text>
                  {/* <View style={styles.profileBadge}>
                    <Text style={styles.profileBadgeText}>Premium</Text>
                  </View> */}
                </View>
              </View>
            </View>

            {/* Menu Items */}
            <View style={styles.menuSection}>
              <Text style={styles.sectionTitle}>Settings</Text>
              
              <MenuItem
                icon="person-outline"
                title="Profile"
                onPress={handleProfilePress}
              />
              
              <MenuItem
                icon="notifications-outline"
                title="Notifications"
                onPress={() => {
                  // TODO: Implement notifications screen navigation
                  onClose();
                }}
              />
              
              <MenuItem
                icon="help-circle-outline"
                title="Help & FAQs"
                onPress={() => {
                  // TODO: Implement FAQ screen navigation
                  onClose();
                }}
              />

              {userData?.testUser && (
                <MenuItem
                  icon="refresh-outline"
                  title="Reset Onboarding"
                  onPress={handleResetOnboarding}
                  iconColor={colors.primary}
                  textColor={colors.primary}
                />
              )}
            </View>

            {/* Sign Out Section */}
            <View style={styles.bottomSection}>
              <TouchableOpacity 
                style={styles.signOutButton}
                onPress={handleSignOut}
                activeOpacity={0.7}
              >
                <View style={styles.signOutContent}>
                  <Ionicons name="log-out-outline" size={20} color="#FF6B6B" />
                  <Text style={styles.signOutText}>Sign Out</Text>
                </View>
              </TouchableOpacity>

              <Text style={styles.versionText}>Version {version.getFullVersion()}</Text>
            </View>
          </LinearGradient>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 320,
    borderTopRightRadius: 24,
    borderBottomRightRadius: 24,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: {
      width: 4,
      height: 0,
    },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 15,
  },
  drawerGradient: {
    flex: 1,
  },
  header: {
  //  paddingTop: 60,
  //  paddingHorizontal: spacing.lg,
  
    paddingBottom: spacing.lg,
  },
  profileCard: {
   // backgroundColor: 'rgba(255, 255, 255, 0.9)',

   backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderBottomRightRadius: 20,
    paddingTop: 70,
    padding: spacing.lg,
    alignItems: 'center',
    // iOS shadow
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    // Android shadow
    elevation: 4,
  },
  profileInfo: {
    alignItems: 'center',
    marginTop: spacing.md,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
  },
  profileBadge: {
    backgroundColor: colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  profileBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.textOnPrimary,
  },
  menuSection: {
    flex: 1,
    paddingHorizontal: 10,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.md,
    marginLeft: spacing.sm,
  },
  menuItem: {
    marginBottom: 10,
  },
  menuItemContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.5)',
    borderColor: 'rgba(255, 107, 107, 0.7)',
    borderWidth: 0.2,
    borderRadius: 999,
    paddingHorizontal: spacing.lg,
    paddingVertical: 12,
    minHeight: 56,
  },
  menuItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    //backgroundColor: 'rgba(139, 115, 85, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  menuText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  bottomSection: {
    paddingHorizontal: spacing.lg,
    paddingBottom: 40,
  },
  signOutButton: {
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: 999,
    marginBottom: spacing.lg,
  },
  signOutContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  signOutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B6B',
    marginLeft: spacing.sm,
  },
  versionText: {
    fontSize: 12,
    color: colors.textTertiary,
    textAlign: 'center',
    fontWeight: '500',
  },
}); 