// Header.js
// Reusable header component with back button and title

/* ------------------------------------------------------
WHAT IT DOES
- Displays consistent header across authenticated screens
- Handles back navigation
- Shows title
- Optional left and right components
- Optional menu items with popover

DEV PRINCIPLES
- Vanilla JavaScript
- Flexible for different use cases
- Consistent styling
------------------------------------------------------*/

import { View, Text, TouchableOpacity, StyleSheet, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { typography } from '../../styles';
import { useState } from 'react';

export default function Header({ 
  title, 
  showBack = false,
  leftComponent,
  rightComponent,
  onLeftPress,
  isLogo = false,
  menuItems = null
}) {
  const router = useRouter();
  const [menuVisible, setMenuVisible] = useState(false);

  const handleBackPress = () => {
    if (onLeftPress) {
      onLeftPress();
    } else {
      router.back();
    }
  };

  const MenuButton = menuItems && (
    <TouchableOpacity 
      onPress={() => setMenuVisible(true)}
      style={styles.buttonContainer}
    >
      <Ionicons name="ellipsis-horizontal" size={24} color="#333" />
    </TouchableOpacity>
  );

  return (
    <>
      <BlurView 
        intensity={99} 
        tint="light"
        style={styles.blurContainer}
      >
        <View style={styles.header}>
          <View style={styles.leftContainer}>
            {leftComponent || (showBack ? (
              <TouchableOpacity 
                onPress={handleBackPress}
                style={styles.buttonContainer}
              >
                <Ionicons name="arrow-back" size={24} color="#333" />
              </TouchableOpacity>
            ) : null)}
          </View>

          <Text style={[
            styles.title,
            isLogo && styles.logoTitle
          ]}>
            {title}
          </Text>

          <View style={styles.rightContainer}>
            {rightComponent || MenuButton}
          </View>
        </View>
      </BlurView>

      <Modal
        visible={menuVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={styles.menuContainer}>
            {menuItems?.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={() => {
                  setMenuVisible(false);
                  item.onPress();
                }}
              >
                <Text style={[
                  styles.menuText,
                  item.destructive && styles.destructiveText
                ]}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  blurContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1,
    height: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    paddingTop: 50,
    paddingHorizontal: 20,
  },
  leftContainer: {
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-start',
  },
  rightContainer: {
    width: 80,
    height: 40,
    justifyContent: 'center',
    alignItems: 'flex-end',
  },
  buttonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    flex: 1,
    textAlign: 'center',
  },
  logoTitle: {
    ...typography.h1,
    marginBottom: 0,
    fontSize: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.4)',
  },
  menuContainer: {
    position: 'absolute',
    top: 90,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 8,
    padding: 8,
    minWidth: 140,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  menuItem: {
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  menuText: {
    fontSize: 16,
  },
  destructiveText: {
    color: '#FF3B30'
  }
}); 