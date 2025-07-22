// mobile/src/components/MyRoutine.js
// Component to display and manage the user's routine items

import { MaterialCommunityIcons } from '@expo/vector-icons';
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import useAuthStore from '../../stores/authStore';

export default function MyRoutine() {
  const router = useRouter();
  const { user, profile } = useAuthStore();
  
  // Get firstName from profile or user
  const firstName = profile?.user_name || user?.user_name || 'there';

  const handleNavigateToChat = () => {
    router.push({
      pathname: '/(authenticated)/aiChat',
      params: {
        chatType: 'routine_check',
        initialMessage: 'my routine',
        firstName: firstName,
        skinConcerns: JSON.stringify([]),
        skinType: 'normal'
      }
    });
  }
  return (
    <View style={styles.container}>
      <View style={styles.emptyListTopContainer}>
        <TouchableOpacity
          style={styles.aiInsightsMessage}
          activeOpacity={0.85}
          onPress={handleNavigateToChat}
        >
          {/* <View style={styles.aiAvatar}>
            <Text style={styles.aiAvatarText}>a</Text>
          </View> */}
          <View style={styles.aiMessageContent}>
            <Text style={styles.aiMessageText}>Let's get started! Tell me about your current routine.</Text>
            <View style={styles.aiMessageFooter}>
              <Text style={styles.aiMessageTime}>Tap to chat</Text>
            </View>
          </View>
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
    paddingHorizontal: 16,
  },
  
  // AI Insights Message Styles (matching MetricsSheet)
  aiInsightsMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    // paddingVertical: 6,
    marginBottom: 16,
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#6E46FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  aiAvatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  aiMessageContent: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    borderRadius: 18,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  aiMessageText: {
    fontSize: 16,
    color: '#374151',
    lineHeight: 20,
  },
  aiMessageFooter: {
    marginTop: 8,
  },
  aiMessageTime: {
    fontSize: 12,
    color: '#9CA3AF',
    fontStyle: 'italic',
  },
}); 