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

import { useRouter, usePathname } from 'expo-router';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { BlurView } from 'expo-blur';
import { colors, spacing, typography, fontSize } from '../../styles';
import { version } from '../../config/version';
import Avatar from '../ui/Avatar';
import useAuthStore from '../../stores/authStore';

export default function SettingsDrawer({ isVisible, onClose }) {
  const slideAnim = useRef(new Animated.Value(-300)).current;
  const router = useRouter();
  const navigation = useNavigation();
  const pathname = usePathname();
  const { user, profile, logout } = useAuthStore();
  
  const fullName = profile?.user_name || user?.user_name || '';

  const [userInfo, setUserInfo] = useState({
    name: fullName || 'User',
    email: user?.email || '',
    photoURL: profile?.profile_img || null
  });

  const [isNavigationReady, setIsNavigationReady] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setUserInfo({
      name: fullName || 'User',
      email: user?.email || '',
      photoURL: profile?.profile_img || null
    });
  }, [user, profile, fullName]);

  // Check navigation readiness and focus state
  useEffect(() => {
    // Consider navigation ready if we have a pathname and user is authenticated
    const isReady = !!(pathname && user && user.user_id);
    setIsNavigationReady(isReady);
    
    console.log('🧭 [SettingsDrawer] Navigation readiness:', { 
      pathname, 
      hasUser: !!user, 
      hasUserId: !!user?.user_id,
      isReady 
    });
  }, [pathname, user]);

  // Listen for navigation focus state
  useEffect(() => {
    const focusListener = navigation?.addListener?.('focus', () => {
      console.log('🧭 [SettingsDrawer] Navigation focused');
      setIsFocused(true);
    });

    const blurListener = navigation?.addListener?.('blur', () => {
      console.log('🧭 [SettingsDrawer] Navigation blurred');
      setIsFocused(false);
    });

    // Set initial focus state
    setIsFocused(navigation?.isFocused?.() || false);

    return () => {
      focusListener?.();
      blurListener?.();
    };
  }, [navigation]);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: isVisible ? 0 : -350,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, [isVisible]);

  const handleSignOut = async () => {
    try {
      console.log('🔵 [SettingsDrawer] Sign out - Navigation ready:', isNavigationReady);
      logout();
      onClose();
      
      const delay = isNavigationReady ? 100 : 300;
      setTimeout(() => {
        if (router && typeof router.replace === 'function') {
          router.replace('/auth/sign-in');
        } else {
          console.error('🔴 [SettingsDrawer] Router not available for sign out');
        }
      }, delay);
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  // Simple test function for debugging
  const handleProfilePressSimple = () => {
    console.log('🔵 [SettingsDrawer] Simple profile press test');
    onClose();
    
    setTimeout(() => {
      console.log('🔵 [SettingsDrawer] Attempting simple navigation...');
      try {
        // Correct route path - we're already in (authenticated) stack, so just use 'profile'
        router.push('/profile');
        console.log('✅ [SettingsDrawer] Simple navigation attempted with correct path');
      } catch (error) {
        console.error('🔴 [SettingsDrawer] Simple navigation failed:', error);
      }
    }, 1000);
  };

  const handleProfilePress = () => {
    console.log('🔵 [SettingsDrawer] Profile press attempt');
    console.log('🔵 [SettingsDrawer] Current pathname:', pathname);
    console.log('🔵 [SettingsDrawer] Router available:', !!router);
    console.log('🔵 [SettingsDrawer] Navigation available:', !!navigation);
    console.log('🔵 [SettingsDrawer] User authenticated:', !!user);
    console.log('🔵 [SettingsDrawer] Navigation state:', navigation?.getState?.());
    console.log('🔵 [SettingsDrawer] Is focused:', isFocused);
    console.log('🔵 [SettingsDrawer] Navigation ready:', isNavigationReady);
    
    onClose();
    
    // Determine delay based on readiness state
    const baseDelay = isNavigationReady && isFocused ? 150 : 800;
    console.log(`🔵 [SettingsDrawer] Using base delay: ${baseDelay}ms`);
    
    // Try multiple navigation strategies with retry logic
    const tryNavigate = (attempt = 1) => {
      console.log(`🔵 [SettingsDrawer] Navigation attempt ${attempt}`);
          console.log('🔵 [SettingsDrawer] Available methods:', {
      routerPush: !!(router && router.push),
      routerReplace: !!(router && router.replace),
      routerNavigate: !!(router && router.navigate),
      navigationNavigate: !!(navigation && navigation.navigate),
      navigationGetParent: !!(navigation && navigation.getParent),
      navigationReset: !!(navigation && navigation.reset)
    });
    
    // Debug navigation structure
    try {
      const navState = navigation?.getState?.();
      console.log('🔵 [SettingsDrawer] Full navigation state:', JSON.stringify(navState, null, 2));
      const parentNav = navigation?.getParent?.();
      console.log('🔵 [SettingsDrawer] Parent navigation:', !!parentNav);
      if (parentNav) {
        console.log('🔵 [SettingsDrawer] Parent state:', JSON.stringify(parentNav.getState?.(), null, 2));
      }
    } catch (error) {
      console.log('🔵 [SettingsDrawer] Could not get navigation state:', error.message);
    }
      
      try {
        // Strategy 1: Use parent navigator (this is the correct approach based on the nav state)
        if (navigation && navigation.getParent && typeof navigation.getParent === 'function') {
          const parentNavigation = navigation.getParent();
          if (parentNavigation && typeof parentNavigation.navigate === 'function') {
            parentNavigation.navigate('profile');
            console.log('✅ [SettingsDrawer] Navigation attempted with parent.navigate');
            return;
          }
        }
        
        // Strategy 2: Try expo-router push as fallback
        if (router && typeof router.push === 'function') {
          router.push('/profile');
          console.log('✅ [SettingsDrawer] Navigation attempted with router.push');
          return;
        }
        
        // Strategy 3: Try React Navigation navigate directly
        if (navigation && typeof navigation.navigate === 'function') {
          navigation.navigate('profile');
          console.log('✅ [SettingsDrawer] Navigation attempted with navigation.navigate');
          return;
        }
        
        // Strategy 4: Try expo-router replace
        if (router && typeof router.replace === 'function') {
          router.replace('/profile');
          console.log('✅ [SettingsDrawer] Navigation attempted with router.replace');
          return;
        }
        
        // Strategy 5: Try navigating with correct nested structure
        if (navigation && typeof navigation.navigate === 'function') {
          // Navigate directly to profile within current stack
          navigation.navigate('profile');
          console.log('✅ [SettingsDrawer] Navigation attempted with correct nested navigation');
          return;
        }
        
        throw new Error('No navigation methods available');
        
      } catch (error) {
        console.error(`🔴 [SettingsDrawer] Navigation attempt ${attempt} failed:`, error);
        
        // Retry up to 3 times with increasing delays
        if (attempt < 3) {
          const delay = attempt * 500; // 500ms, 1000ms delays
          console.log(`⏳ [SettingsDrawer] Retrying navigation in ${delay}ms...`);
          setTimeout(() => tryNavigate(attempt + 1), delay);
        } else {
          console.error('🔴 [SettingsDrawer] All navigation attempts failed');
          // Final fallback - try with much longer delay and simpler path
          console.log('🔄 [SettingsDrawer] Attempting manual navigation with long delay as last resort');
          setTimeout(() => {
            try {
              // Try just "profile" without the full path
              if (router?.push) {
                router.push('/profile');
                console.log('✅ [SettingsDrawer] Final attempt with simple path');
              } else if (router?.replace) {
                router.replace('/profile');
                console.log('✅ [SettingsDrawer] Final attempt with simple replace');
              }
            } catch (finalError) {
              console.error('🔴 [SettingsDrawer] Final navigation attempt failed:', finalError);
            }
          }, 2000); // Much longer delay
        }
      }
    };
    
    // Start navigation attempt after drawer closes
    setTimeout(tryNavigate, baseDelay);
  };

  const handleResetOnboarding = async () => {
    try {
      // For now, just navigate to onboarding - could implement profile deletion later
      onClose();
      setTimeout(() => {
        router.push('/onboarding/name');
        console.log('✅ Navigating to onboarding');
      }, 100);
    } catch (error) {
      console.error('❌ Error resetting onboarding:', error);
    }
  };

  const MenuItem = ({ icon, title, onPress, textColor = colors.textPrimary, iconColor = colors.primary, showArrow = true, disabled = false }) => (
    <TouchableOpacity 
      style={[styles.menuItem, disabled && styles.menuItemDisabled]}
      onPress={disabled ? undefined : onPress}
      activeOpacity={disabled ? 1 : 0.7}
    >
      <View style={styles.menuItemContent}>
        <View style={styles.menuItemLeft}>
          <View style={styles.iconContainer}>
            <Ionicons name={icon} size={22} color={disabled ? colors.textTertiary : iconColor} />
          </View>
          <Text style={[styles.menuText, { color: disabled ? colors.textTertiary : textColor }]}>{title}</Text>
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
                  imageUrl={profile?.profile_img}
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
                  onClose();
                  // TODO: Implement notifications screen navigation
                  setTimeout(() => {
                    // router.push('/(authenticated)/notifications');
                  }, 100);
                }}
              />
              
              <MenuItem
                icon="help-circle-outline"
                title="Help & FAQs"
                onPress={() => {
                  onClose();
                  // TODO: Implement FAQ screen navigation
                  setTimeout(() => {
                    // router.push('/(authenticated)/help');
                  }, 100);
                }}
              />
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
  menuItemDisabled: {
    opacity: 0.5,
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