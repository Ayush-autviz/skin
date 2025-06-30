// SettingsDrawer.js
// Settings drawer component with logout option

/* ------------------------------------------------------
WHAT IT DOES
- Displays settings options
- Handles user logout
- Provides drawer animation

DEV PRINCIPLES
- Uses vanilla JavaScript
- Clean component structure
- Proper animation handling

TODOS:
- [x] Add top area with user avatar and name
- [x] Add bottom area with sign out button
- [x] add a few other options: Notifications, FAQs (no screen yet just options)
- [x] Add version number
- [ ] Add privacy policy link
------------------------------------------------------*/

import { View, Text, StyleSheet, TouchableOpacity, Animated, Modal, Image } from 'react-native';
import { useEffect, useRef, useState } from 'react';
import { signOut } from 'firebase/auth';
import { auth } from '../../config/firebase';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
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
      toValue: isVisible ? 0 : -300,
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
          <View style={styles.header}>
            <View style={styles.profileSection}>
              <Avatar 
                name={fullName}
                imageUrl={profile?.photoURL}
                size="lg"
              />
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>{userInfo.name}</Text>
                <Text style={styles.profileEmail}>{userInfo.email}</Text>
              </View>
            </View>
          </View>

          {/* Reordered menu items */}
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={handleProfilePress}
          >
            <Ionicons name="person-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.menuText}>Profile</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // TODO: Implement notifications screen navigation
              // console.log('Notifications pressed');
              onClose();
            }}
          >
            <Ionicons name="notifications-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.menuText}>Notifications</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => {
              // TODO: Implement FAQ screen navigation
              // console.log('FAQs pressed');
              onClose();
            }}
          >
            <Ionicons name="help-circle-outline" size={24} color={colors.textPrimary} />
            <Text style={styles.menuText}>FAQs</Text>
          </TouchableOpacity>

          {userData?.testUser && (
            <TouchableOpacity 
              style={styles.menuItem}
              onPress={handleResetOnboarding}
            >
              <Ionicons name="refresh-outline" size={24} color={colors.primary} />
              <Text style={[styles.menuText, { color: colors.primary }]}>Reset Onboarding</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            style={[styles.menuItem, styles.signOutMenuItem]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out-outline" size={20} color={colors.textTertiary} />
            <Text style={[styles.menuText, styles.signOutText]}>Sign Out</Text>
          </TouchableOpacity>

          <View style={styles.versionContainer}>
            <Text style={styles.versionText}>Version {version.getFullVersion()}</Text>
          </View>
        </Animated.View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  drawer: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 300,
    backgroundColor: '#fff',
    paddingTop: 50,
    shadowColor: '#000',
    shadowOffset: {
      width: 2,
      height: 0,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  profileSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  profileInfo: {
    marginLeft: 15,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
  profileEmail: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  menuText: {
    fontSize: 16,
    color: '#333',
    marginLeft: 15,
  },
  signOutMenuItem: {
    marginTop: spacing.md,
    borderBottomWidth: 0,
  },
  signOutText: {
    color: colors.textTertiary,
    ...typography.caption,
  },
  versionContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  versionText: {
    fontSize: 12,
    color: colors.textTertiary,
    ...typography.caption,
  },
}); 