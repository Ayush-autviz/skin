// aiChat.js
// Enhanced AI Chat interface with new API integration

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ActivityIndicator, SafeAreaView,
  StatusBar, Animated, Dimensions, Alert
} from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Feather, Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import useAuthStore from '../../src/stores/authStore';
import { colors, typography, spacing, shadows } from '../../src/styles';
import {
  sendChatMessage,
  getChatHistory,
  CHAT_TYPES,
  transformApiMessage,
  transformUserMessage
} from '../../src/services/chatApiService';

const { width } = Dimensions.get('window');

export default function AiChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuthStore();

  // Extract parameters
  const chatType = params.chatType || CHAT_TYPES.ROUTINE_CHECK;
  const imageId = params.imageId;
  const initialMessage = params.initialMessage;
  const metrics = params.metrics ? JSON.parse(params.metrics) : null;
  const skinConcerns = params.skinConcerns ? JSON.parse(params.skinConcerns) : [];
  const skinType = params.skinType || profile?.skinType || 'normal';
  const firstName = params.firstName || profile?.firstName || user?.user_name || 'there';

  // State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  // Initialize chat
  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    try {
      setIsInitializing(true);
      setError(null);

      // For snapshot feedback, load chat history first
      if (chatType === CHAT_TYPES.SNAPSHOT_FEEDBACK && imageId) {
        await loadChatHistory();
      }

      // Send initial message if provided
      if (initialMessage) {
        await sendInitialMessage();
      }

      // Start fade in animation
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }).start();

    } catch (error) {
      console.error('Error initializing chat:', error);
      setError('Failed to initialize chat');
    } finally {
      setIsInitializing(false);
    }
  };

  const loadChatHistory = async () => {
    try {
      const response = await getChatHistory(CHAT_TYPES.SNAPSHOT_FEEDBACK, imageId);
      if (response.success && response.messages.length > 0) {
        const formattedMessages = [];
        
        response.messages.forEach((apiMessage) => {
          // Add user message if query exists
          if (apiMessage.query && Array.isArray(apiMessage.query) && apiMessage.query.length > 0) {
            apiMessage.query.forEach((userQuery, index) => {
              formattedMessages.push({
                id: `user-${apiMessage.id}-${index}`,
                content: userQuery,
                role: 'user',
                timestamp: new Date(apiMessage.created_at)
              });
            });
          }
          
          // Add AI response
          formattedMessages.push({
            id: `ai-${apiMessage.id}`,
            content: apiMessage.response,
            role: 'assistant',
            timestamp: new Date(apiMessage.created_at)
          });
        });
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error loading chat history:', error);
      // Don't show error for history loading, just continue
    }
  };

  const sendInitialMessage = async () => {
    try {
      // Check if the initial message is already in the chat history
      const messageExists = messages.some(msg => 
        msg.role === 'user' && msg.content === initialMessage
      );
      
      if (messageExists) {
        console.log('Initial message already exists in chat history, skipping...');
        return;
      }

      const messageData = {
        type: chatType,
        firstName,
        skinType,
        skinConcerns,
        query: initialMessage
      };

      // Add metrics for snapshot feedback
      if (chatType === CHAT_TYPES.SNAPSHOT_FEEDBACK && metrics) {
        messageData.image_id = imageId;
        messageData.metrics = metrics;
        messageData.excludedMetrics = [];
      }

      const response = await sendChatMessage(messageData);

      if (response.success) {
        // Add user message
        const userMessage = transformUserMessage(initialMessage);
        // Add AI response
        const aiMessage = {
          id: `ai-${Date.now()}`,
          content: response.message,
          role: 'assistant',
          timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending initial message:', error);
      setError('Failed to send initial message');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim()) return;

    const userMessage = transformUserMessage(inputText.trim());
    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const messageData = {
        type: chatType,
        firstName,
        skinType,
        skinConcerns,
        query: inputText.trim()
      };

      // Add metrics for snapshot feedback
      if (chatType === CHAT_TYPES.SNAPSHOT_FEEDBACK && metrics) {
        messageData.image_id = imageId;
        messageData.metrics = metrics;
        messageData.excludedMetrics = [];
      }

      const response = await sendChatMessage(messageData);

      if (response.success) {
        const aiMessage = {
          id: `ai-${Date.now()}`,
          content: response.message,
          role: 'assistant',
          timestamp: new Date()
        };
        setMessages(prev => [...prev, aiMessage]);
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const renderMessage = ({ item }) => (
    <MessageBubble message={item} />
  );

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';

    return (
      <View style={[styles.messageContainer, isUser ? styles.userMessageContainer : styles.aiMessageContainer]}>
        {!isUser && (
          <View style={styles.aiAvatar}>
            <Feather name="cpu" size={16} color={colors.primary} />
          </View>
        )}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
          <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.aiMessageText]}>
            {message.content}
          </Text>
          <Text style={styles.messageTime}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </View>
      </View>
    );
  };

  if (isInitializing) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <LinearGradient
            colors={[colors.primary + '20', colors.primary + '10']}
            style={styles.loadingGradient}
          >
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Starting conversation...</Text>
          </LinearGradient>
        </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={styles.container}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.errorContainer}>
          <Feather name="alert-circle" size={48} color={colors.error} />
          <Text style={styles.errorText}>Something went wrong</Text>
          <Text style={styles.errorSubtext}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={initializeChat}>
            <Text style={styles.retryButtonText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />

      {/* Header */}
      <SafeAreaView style={{ flex: 0 }} />
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>AI Assistant</Text>
          <Text style={styles.headerSubtitle}>
            {chatType === CHAT_TYPES.SNAPSHOT_FEEDBACK ? 'Skin Analysis' : 'Routine Advice'}
          </Text>
        </View>
      </View>

      {/* Messages */}
      <Animated.View style={[styles.messagesContainer, { opacity: fadeAnim }]}>
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.messagesList}
          showsVerticalScrollIndicator={false}
        />
      </Animated.View>

      {/* Input */}
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <View style={styles.inputContainer}>
          <TextInput
            ref={inputRef}
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me anything about your skin..."
            placeholderTextColor={colors.textSecondary}
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={colors.textOnPrimary} />
            ) : (
              <Ionicons name="send" size={20} color={colors.textOnPrimary} />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },

  // Loading States
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  loadingGradient: {
    borderRadius: 20,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.md,
  },
  loadingText: {
    ...typography.h3,
    color: colors.textPrimary,
    marginTop: spacing.md,
    textAlign: 'center',
  },

  // Error States
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  errorText: {
    ...typography.h2,
    color: colors.textPrimary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  errorSubtext: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: 25,
    ...shadows.sm,
  },
  retryButtonText: {
    ...typography.button,
    color: colors.textOnPrimary,
    fontWeight: '600',
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    backgroundColor: colors.background,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    ...shadows.sm,
  },
  backButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '600',
  },
  headerSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: 2,
  },

  // Messages
  messagesContainer: {
    flex: 1,
  },
  messagesList: {
    padding: spacing.md,
    paddingBottom: spacing.xl,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.sm,
    alignItems: 'flex-end',
  },
  userMessageContainer: {
    justifyContent: 'flex-end',
  },
  aiMessageContainer: {
    justifyContent: 'flex-start',
  },
  aiAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    marginBottom: spacing.xs,
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 18,
    ...shadows.sm,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: colors.surface,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: colors.border,
  },
  messageText: {
    ...typography.body,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.textOnPrimary,
  },
  aiMessageText: {
    color: colors.textPrimary,
  },
  messageTime: {
    ...typography.caption,
    marginTop: spacing.xs,
    opacity: 0.7,
  },

  // Input
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.background,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    ...shadows.sm,
  },
  textInput: {
    flex: 1,
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    marginRight: spacing.sm,
    marginBottom: spacing.sm,
    maxHeight: 100,
  },
  sendButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.textSecondary,
    opacity: 0.5,
  },
});