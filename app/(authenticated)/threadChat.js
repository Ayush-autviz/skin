// threadChat.js
// Thread-based AI Chat interface with new API integration

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
  createThread,
  sendThreadMessage,
  confirmThreadItem
} from '../../src/services/newApiService';

const { width } = Dimensions.get('window');

export default function ThreadChatScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuthStore();

  // Extract parameters
  const chatType = params.chatType || 'general_chat';
  const initialMessage = params.initialMessage;
  const imageId = params.imageId;

  // State
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isInitializing, setIsInitializing] = useState(true);
  const [error, setError] = useState(null);
  const [threadId, setThreadId] = useState(null);
  const [pendingItem, setPendingItem] = useState(null);

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

      // Send initial message to create thread
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

  const sendInitialMessage = async () => {
    try {
      const messageData = {
        content: initialMessage,
        role: 'user',
        thread_type: chatType
      };

      const response = await createThread(messageData);

      if (response.success) {
        setThreadId(response.data.thread_id);
        
        // Add user message
        const userMessage = {
          id: `user-${Date.now()}`,
          content: initialMessage,
          role: 'user',
          timestamp: new Date()
        };

        // Add AI response (last message from the response)
        const aiMessages = response.data.messages || [];
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        if (lastAiMessage && lastAiMessage.role === 'assistant') {
          const aiMessage = {
            id: `ai-${Date.now()}`,
            content: lastAiMessage.content,
            role: 'assistant',
            timestamp: new Date(lastAiMessage.timestamp)
          };

          setMessages([userMessage, aiMessage]);
        } else {
          setMessages([userMessage]);
        }

        // Check for pending item
        if (response.data.pendingAddItem && response.data.pendingAddItem.length > 0) {
          setPendingItem(response.data.pendingAddItem[0]);
        }
      }
    } catch (error) {
      console.error('Error sending initial message:', error);
      setError('Failed to send initial message');
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !threadId) return;

    const userMessage = {
      id: `user-${Date.now()}`,
      content: inputText.trim(),
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const messageData = {
        content: inputText.trim(),
        role: 'user',
        thread_type: chatType
      };

      const response = await sendThreadMessage(threadId, messageData);

      if (response.success) {
        // Add AI response (last message from the response)
        const aiMessages = response.data.messages || [];
        const lastAiMessage = aiMessages[aiMessages.length - 1];
        
        if (lastAiMessage && lastAiMessage.role === 'assistant') {
          const aiMessage = {
            id: `ai-${Date.now()}`,
            content: lastAiMessage.content,
            role: 'assistant',
            timestamp: new Date(lastAiMessage.timestamp)
          };
          setMessages(prev => [...prev, aiMessage]);
        }

        // Check for pending item
        if (response.data.pendingAddItem && response.data.pendingAddItem.length > 0) {
          setPendingItem(response.data.pendingAddItem[0]);
        } else {
          setPendingItem(null);
        }
      }
    } catch (error) {
      console.error('Error sending message:', error);
      Alert.alert('Error', 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmItem = async (confirmed) => {
    if (!threadId || !pendingItem) return;

    try {
      setIsLoading(true);

      if (confirmed) {
        // Confirm the item
        const response = await confirmThreadItem(threadId, pendingItem);
        
        if (response.success) {
          // Add confirmation message
          const confirmMessage = {
            id: `confirm-${Date.now()}`,
            content: 'Yes',
            role: 'user',
            timestamp: new Date()
          };

          // Add AI response (last message from the response)
          const aiMessages = response.data.messages || [];
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          
          if (lastAiMessage && lastAiMessage.role === 'assistant') {
            const aiMessage = {
              id: `ai-${Date.now()}`,
              content: lastAiMessage.content,
              role: 'assistant',
              timestamp: new Date(lastAiMessage.timestamp)
            };
            setMessages(prev => [...prev, confirmMessage, aiMessage]);
          } else {
            setMessages(prev => [...prev, confirmMessage]);
          }
        }
      } else {
        // Send "no" message
        const messageData = {
          content: 'No',
          role: 'user',
          thread_type: chatType
        };

        const response = await sendThreadMessage(threadId, messageData);

        if (response.success) {
          const noMessage = {
            id: `no-${Date.now()}`,
            content: 'No',
            role: 'user',
            timestamp: new Date()
          };

          // Add AI response (last message from the response)
          const aiMessages = response.data.messages || [];
          const lastAiMessage = aiMessages[aiMessages.length - 1];
          
          if (lastAiMessage && lastAiMessage.role === 'assistant') {
            const aiMessage = {
              id: `ai-${Date.now()}`,
              content: lastAiMessage.content,
              role: 'assistant',
              timestamp: new Date(lastAiMessage.timestamp)
            };
            setMessages(prev => [...prev, noMessage, aiMessage]);
          } else {
            setMessages(prev => [...prev, noMessage]);
          }
        }
      }

      setPendingItem(null);
    } catch (error) {
      console.error('Error handling item confirmation:', error);
      Alert.alert('Error', 'Failed to process confirmation. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const scrollToBottom = useCallback(() => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages.length]);

  useEffect(() => {
    scrollToBottom();
  }, [scrollToBottom]);

  const renderMessage = ({ item }) => (
    <MessageBubble message={item} />
  );

  const MessageBubble = ({ message }) => {
    const isUser = message.role === 'user';
    
    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        <View style={[
          styles.messageBubble,
          isUser ? styles.userBubble : styles.aiBubble
        ]}>
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText
          ]}>
            {message.content}
          </Text>
        </View>
        <Text style={styles.timestamp}>
          {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    );
  };

  const PendingItemCard = () => {
    if (!pendingItem) return null;

    return (
      <View style={styles.pendingItemCard}>
        <Text style={styles.pendingItemTitle}>Confirm Item</Text>
        <View style={styles.pendingItemDetails}>
          <Text style={styles.pendingItemText}>
            <Text style={styles.pendingItemLabel}>Name:</Text> {pendingItem.name}
          </Text>
          <Text style={styles.pendingItemText}>
            <Text style={styles.pendingItemLabel}>Type:</Text> {pendingItem.type}
          </Text>
          <Text style={styles.pendingItemText}>
            <Text style={styles.pendingItemLabel}>Usage:</Text> {pendingItem.usage}
          </Text>
          <Text style={styles.pendingItemText}>
            <Text style={styles.pendingItemLabel}>Frequency:</Text> {pendingItem.frequency}
          </Text>
        </View>
        <View style={styles.pendingItemActions}>
          <TouchableOpacity
            style={[styles.pendingItemButton, styles.confirmButton]}
            onPress={() => handleConfirmItem(true)}
            disabled={isLoading}
          >
            <Text style={styles.confirmButtonText}>Yes</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.pendingItemButton, styles.declineButton]}
            onPress={() => handleConfirmItem(false)}
            disabled={isLoading}
          >
            <Text style={styles.declineButtonText}>No</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isInitializing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Initializing chat...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={initializeChat}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Assistant</Text>
        <View style={styles.headerSpacer} />
      </View>

      <Animated.View style={[styles.content, { opacity: fadeAnim }]}>
        {/* Messages */}
        <FlatList
          ref={flatListRef}
          data={messages}
          renderItem={renderMessage}
          keyExtractor={(item) => item.id}
          style={styles.messagesList}
          contentContainerStyle={styles.messagesContainer}
          showsVerticalScrollIndicator={false}
        />

        {/* Pending Item Card */}
        <PendingItemCard />

        {/* Input Area */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.inputContainer}
        >
          <View style={styles.inputWrapper}>
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="Type your message..."
              placeholderTextColor={colors.textSecondary}
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              editable={!isLoading}
            />
            <TouchableOpacity
              style={[styles.sendButton, !inputText.trim() && styles.sendButtonDisabled]}
              onPress={sendMessage}
              disabled={!inputText.trim() || isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <Feather name="send" size={20} color="#FFFFFF" />
              )}
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Animated.View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
  },
  loadingText: {
    ...typography.body,
    color: colors.textSecondary,
    marginTop: spacing.md,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  retryButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: 8,
  },
  retryButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  backButton: {
    padding: spacing.xs,
  },
  headerTitle: {
    ...typography.h3,
    color: colors.textPrimary,
    flex: 1,
    textAlign: 'center',
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  messageContainer: {
    marginBottom: spacing.md,
  },
  userMessageContainer: {
    alignItems: 'flex-end',
  },
  aiMessageContainer: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    maxWidth: width * 0.75,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: 16,
  },
  userBubble: {
    backgroundColor: colors.primary,
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F3F4F6',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 16,
    lineHeight: 22,
  },
  userMessageText: {
    color: '#FFFFFF',
  },
  aiMessageText: {
    color: colors.textPrimary,
  },
  timestamp: {
    ...typography.caption,
    color: colors.textSecondary,
    marginTop: spacing.xs,
    alignSelf: 'flex-end',
  },
  pendingItemCard: {
    backgroundColor: '#FEF3C7',
    margin: spacing.lg,
    padding: spacing.lg,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  pendingItemTitle: {
    ...typography.h4,
    color: '#92400E',
    marginBottom: spacing.sm,
    fontWeight: '600',
  },
  pendingItemDetails: {
    marginBottom: spacing.md,
  },
  pendingItemText: {
    ...typography.body,
    color: '#92400E',
    marginBottom: spacing.xs,
  },
  pendingItemLabel: {
    fontWeight: '600',
  },
  pendingItemActions: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  pendingItemButton: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: 8,
    alignItems: 'center',
  },
  confirmButton: {
    backgroundColor: '#10B981',
  },
  declineButton: {
    backgroundColor: '#EF4444',
  },
  confirmButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  declineButtonText: {
    ...typography.body,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#F3F4F6',
    backgroundColor: '#FFFFFF',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    gap: spacing.sm,
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 20,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    maxHeight: 100,
    fontSize: 16,
    color: colors.textPrimary,
  },
  sendButton: {
    backgroundColor: colors.primary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: '#D1D5DB',
  },
}); 