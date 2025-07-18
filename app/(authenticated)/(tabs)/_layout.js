// (authenticated)/(tabs)/_layout.js
// Tab layout with custom bottom navigation design

import { Tabs, router } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Feather } from '@expo/vector-icons';
import { colors, spacing } from '../../../src/styles';

function CustomTabBar({ state, descriptors, navigation }) {
  const getActiveTab = () => {
    const currentRoute = state.routes[state.index].name;
    if (currentRoute === 'progress') return 'progress';
    if (currentRoute === 'routine') return 'routine';
    return null;
  };

  const activeTab = getActiveTab();

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
    const currentRoute = state.routes[state.index].name;
    
    if (currentRoute === 'index') {
      // If on home screen, go to camera
      router.push('/camera');
    } else {
      // If on any other screen, go to home screen
      navigation.navigate('index');
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.pillContainer}>
        {/* Progress Tab */}
        <TouchableOpacity 
          style={[
            styles.tabButton,
            activeTab === 'progress' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('progress')}
        >
          <View style={styles.tabContent}>
            <Feather 
              name="trending-up"
              size={20} 
              color={activeTab === 'progress' ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'progress' ? styles.activeTabText : styles.inactiveTabText
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
            activeTab === 'routine' && styles.activeTabButton
          ]}
          onPress={() => handleTabPress('routine')}
        >
          <View style={styles.tabContent}>
            <Feather 
              name="calendar"
              size={20} 
              color={activeTab === 'routine' ? colors.textOnPrimary : colors.textTertiary}
            />
            <Text style={[
              styles.tabText,
              activeTab === 'routine' ? styles.activeTabText : styles.inactiveTabText
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
  },
  activeTabButton: {
    backgroundColor: colors.primary,
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