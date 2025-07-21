// mobile/src/components/MyRoutine.js
// Component to display and manage the user's routine items

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function MyRoutine() {

  const handleNavigateToChat = () => {
    router.push({
      pathname: '/(authenticated)/aiChat',
      params: {
        chatType: 'routine_check',
        initialMessage: 'my routine',
        skinConcerns: JSON.stringify([]),
        skinType: 'normal'
      }
    });
  }
  return (
    <View style={styles.container}>
          <View style={styles.emptyListTopContainer}>
          <TouchableOpacity
            style={styles.motivationalCard}
            activeOpacity={0.85}
            onPress={handleNavigateToChat}
          >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>a</Text>
            </View>
            <Text style={styles.motivationalText}>
              {"Let's get started! Tell me about your current routine."}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
        </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  sectionsList: {
    flex: 1,
  },
  emptyListTopContainer: {
    paddingTop: 24,
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  motivationalText: {
    fontSize: 13,
    flex: 1,
   
  },
  arrowIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
}); 