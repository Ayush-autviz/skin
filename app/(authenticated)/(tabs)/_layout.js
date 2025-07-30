// (authenticated)/(tabs)/_layout.js
// Tab layout with custom bottom navigation design

import { Tabs, router } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../../src/styles';

function CustomTabBar({ state, descriptors, navigation }) {
  // More robust active tab detection
  const getCurrentRoute = () => {
    if (!state || !state.routes || state.index === undefined) {
      return null;
    }
    return state.routes[state.index]?.name;
  };

  const handleTabPress = (tab) => {
    switch (tab) {
      case 'progress':
        navigation.navigate('progress');
        break;
      case 'routine':
        navigation.navigate('routine');
        break;
    }
  };

  const handleCameraPress = () => {
    const currentRoute = getCurrentRoute();
    
    if (!currentRoute) {
      console.log('Navigation state not ready, assuming index screen');
      router.push('/camera');
      return;
    }
    
    if (currentRoute === 'index') {
      router.push('/camera');
    } else {
      navigation.navigate('index');
    }
  };

  // Direct route comparison - more reliable
  const isTabActive = (tab) => {
    const currentRoute = getCurrentRoute();
    const isActive = currentRoute === tab;
    console.log(`🔵 Tab ${tab} active state:`, isActive, 'Current route:', currentRoute);
    return isActive;
  };

  return (
    <View style={styles.container}>
      <View style={styles.pillContainer}>
        {/* Progress Tab */}
        <TouchableOpacity 
          style={[
            styles.tabButton,
            isTabActive('progress') && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('progress')}
          activeOpacity={1} // Disable opacity change on press
        >
          <View style={styles.tabContent}>
            <Feather 
              name="trending-up"
              size={20} 
              color={isTabActive('progress') ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              isTabActive('progress') ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Progress
            </Text>

          </View>
        </TouchableOpacity>

        {/* Empty space for center button */}
        <View style={styles.centerSpace} />

        {/* Routine Tab */}
        <TouchableOpacity 
          style={[
            styles.tabButton,
            isTabActive('routine') && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('routine')}
          activeOpacity={1} // Disable opacity change on press
        >
          <View style={styles.tabContent}>
            <Feather 
              name="calendar"
              size={20} 
              color={isTabActive('routine') ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              isTabActive('routine') ? styles.activeTabText : styles.inactiveTabText
            ]}>
              Routine
            </Text>

          </View>
        </TouchableOpacity>
      </View>

      {/* Add Button (Absolute positioned) */}
      <TouchableOpacity 
        style={styles.addButton}
        onPress={handleCameraPress}
      >
        <Text style={styles.addButtonText}>+</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function TabLayout() {
  return (
   
    <Tabs
      tabBar={(props) => <CustomTabBar {...props} />}
      screenOptions={{
        headerShown: false,
      }}
    >
      <Tabs.Screen 
        name="index"
        options={{
          title: 'Home',
          tabBarButton: () => null, // Hide from tab bar
        }}
      />
      <Tabs.Screen 
        name="progress"
        options={{
          title: 'Progress',
        }}
      />
      <Tabs.Screen 
        name="routine"
        options={{
          title: 'Routine',
        }}
      />
    </Tabs>
    
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: spacing.lg,

  },
  pillContainer: {
    flexDirection: 'row',
    backgroundColor: '#F5F1EB',
    borderRadius: 30,
    padding: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  tabButton: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 26,
    flex: 1,
    backgroundColor: 'transparent', // Explicitly set transparent background
    opacity: 1, // Ensure no opacity issues
  },
  activeTabButton: {
    backgroundColor: colors.primary,
    opacity: 1, // Ensure full opacity
  },
  centerSpace: {
    width: 60,
  },
  addButton: {
    position: 'absolute',
    top: -28,
    left: '50%',
   // marginLeft: -28, // Half of button width (56/2)
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  addButtonText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.textOnPrimary,
    marginTop: -2,
  },
  tabContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  tabUnderline: {
    position: 'absolute',
    bottom: -8,
    left: '50%',
    marginLeft: -15,
    width: 30,
    height: 2,
    backgroundColor: colors.textOnPrimary,
    borderRadius: 1,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
  },
  activeTabText: {
    color: colors.textOnPrimary,
  },
  inactiveTabText: {
    color: colors.textTertiary,
  },
}); 