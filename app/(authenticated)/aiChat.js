// aiChat.js
// Chat interface for AI skin analysis

/* ------------------------------------------------------
WHAT IT DOES
- Displays AI-generated messages about skin analysis
- Shows chat history with AI avatar
- Provides input for follow-up questions (coming soon)

DEVELOPMENT HISTORY
- 2024.03.29: Initial version with hardcoded message

INITIAL DISPLAY LOGIC
- Receives `threadId` and `initialMessage` via navigation parameters.
- **Immediately** displays the `initialMessage` as the first message in the chat. This message is treated as the **permanent** start of the displayed conversation for this session.
- Sets up a listener via ThreadContext to fetch the live messages for the given `threadId`.
- Once the live messages arrive from ThreadContext (`currentThread.messages`):
    - It takes all messages *except* the very first one (index 0) from the context data.
    - It prepends the `initialMessage` (passed via params) to this subset of live messages.
    - It updates the display with this combined list.
------------------------------------------------------*/

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { View, Text, TextInput, FlatList, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator, Image, SafeAreaView, StatusBar } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useUser } from '../../src/contexts/UserContext';
import { useThreadContext } from '../../src/contexts/ThreadContext';
import { generateThreadSummary } from '../../src/services/FirebaseThreadsService';
import { addRoutineItem, clearPendingAddItem } from '../../src/services/FirebaseUserService';
import { colors, typography, spacing } from '../../src/styles'; // Import colors for buttons
import Chip from '../../src/components/ui/Chip'; // Make sure Chip is imported

const MANUAL_HEADER_HEIGHT = 50; // Approximate height for offset calculation

// Updated confirmation card (Chat Bubble Style)
const PendingAddItemCard = ({ itemData, onConfirm, onCancel, status }) => {
  // Convert usage to descriptive phrase
  let usageDisplay;
  switch (itemData.usage) {
    case 'AM':
      usageDisplay = 'in the morning';
      break;
    case 'PM':
      usageDisplay = 'in the evening';
      break;
    case 'Both':
      usageDisplay = 'in the morning and evening';
      break;
    default:
      usageDisplay = itemData.usage; // Fallback
  }
  const formattedDetails = `${itemData.name} (${itemData.type}), ${itemData.frequency}, ${usageDisplay}`;

  return (
    // Apply styles similar to an AI message bubble
    <View style={styles.pendingCardContainer}>
      {status === 'idle' && (
        <>
          <Text style={styles.pendingCardQuestion}>Add this item to your routine?</Text>
          <Text style={styles.pendingCardSummary}>{formattedDetails}</Text>
          <View style={styles.pendingCardActions}>
            <Chip
              label="No"
              onPress={onCancel}
              type="error"
              size="md"
            />
            <Chip
              label="Yes"
              onPress={onConfirm}
              type="success"
              size="md"
            />
          </View>
        </>
      )}
      {status === 'adding' && (
        <View style={styles.pendingCardStatusContainer}> 
          <ActivityIndicator size="small" color={colors.primary} />
          <Text style={styles.pendingCardStatusText}>Adding...</Text>
        </View>
      )}
      {status === 'added' && (
        <View style={styles.pendingCardStatusContainer}> 
          <Ionicons name="checkmark-circle" size={20} color={colors.success} />
          <Text style={styles.pendingCardStatusText}>Added!</Text>
        </View>
      )}
       {status === 'error' && (
        <View style={styles.pendingCardStatusContainer}> 
          <Ionicons name="warning" size={20} color={colors.error} />
          <Text style={styles.pendingCardStatusText}>Error adding item.</Text>
        </View>
      )}
    </View>
  );
};

const AiChatScreen = () => {
  const router = useRouter();
  const { initialMessage: initialMessageParam, threadId: threadIdParam } = useLocalSearchParams();
  const { user, profile } = useUser();
  const {
    currentThread,
    threadStatus,
    listenToThread,
    sendMessage,
    createThread
  } = useThreadContext();

  const [activeThreadId, setActiveThreadId] = useState(threadIdParam);

  // --- State for Displayed Messages ---
  // Format the initial message passed from the card. This will be PERMANENTLY the first message shown.
  const permanentFirstMessage = useMemo(() => ({
    id: 'initial-0', // Static ID for the first message
    content: initialMessageParam || 'Tell me about your routine or your skin in this snapshot',
    role: 'assistant',
    // Use a fixed early timestamp or the param timestamp if available? For simplicity, use local time.
    timestamp: new Date()
  }), [initialMessageParam]);

  // Initialize display state *only* with the permanent first message.
  const [displayMessages, setDisplayMessages] = useState([permanentFirstMessage]);
  const [pendingItem, setPendingItem] = useState(null); // State to hold pending item data
  const [addItemStatus, setAddItemStatus] = useState('idle'); // 'idle', 'adding', 'added', 'error'
  const [isAiResponding, setIsAiResponding] = useState(false);
  const [messageCountWhenSent, setMessageCountWhenSent] = useState(0); // Track message count when user sends

  const [inputMessage, setInputMessage] = useState('');
  const flatListRef = useRef(null);

  const userInitials = useMemo(() => {
    if (profile) {
        const firstName = profile.firstName;
        const lastName = profile.lastName;
        let initials = '';
        if (firstName) initials += firstName.charAt(0);
        if (lastName) initials += lastName.charAt(0);
        return initials.toUpperCase() || '?';
    }
    return '?';
  }, [profile]);

  useEffect(() => {
    //console.log('💬 aiChat: Received params - initialMessageParam:', initialMessageParam, 'threadIdParam:', threadIdParam);

    const initializeChat = async () => {
      if (threadIdParam) {
        // console.log(`💬 aiChat: threadIdParam provided (${threadIdParam}), setting as active and listening.`);
        if (activeThreadId !== threadIdParam) {
            setActiveThreadId(threadIdParam);
        }
        listenToThread(threadIdParam);
      } else if (initialMessageParam) {
        // console.log('💬 aiChat: No threadIdParam, but initialMessageParam exists. Creating new thread...');
        if (!user?.uid) {
          console.error('💬 aiChat: User not available to create a new thread. Cannot proceed.');
          return;
        }
        try {
          // console.log(`💬 aiChat: Attempting to call context.createThread with initialMessage: "${initialMessageParam}"`);
          const newThreadId = await createThread({
            initialMessageContent: initialMessageParam,
            type: 'general_chat'
          });
          if (newThreadId) {
            // console.log(`💬 aiChat: New thread created with ID: ${newThreadId}. Setting active and listening.`);
            setActiveThreadId(newThreadId);
            listenToThread(newThreadId);
          } else {
            console.error('💬 aiChat: createThread did not return a new thread ID.');
          }
        } catch (error) {
          console.error('💬 aiChat: Error creating new thread:', error);
        }
      } else {
        console.error("💬 aiChat: Critical - No threadIdParam and no initialMessageParam. Cannot initialize chat.");
      }
    };

    initializeChat();
  }, [threadIdParam, initialMessageParam, user, createThread, listenToThread]);

  useEffect(() => {
    if (currentThread?.messages?.length) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [currentThread?.messages]);

  useEffect(() => {
    const contextMessages = currentThread?.messages;
    const pendingData = currentThread?.pendingAddItem; // Check for pending item

    // Update pending item state
    if (pendingData && typeof pendingData === 'object') {
      // Only set if status is idle, otherwise we might overwrite 'added' state
      if (addItemStatus === 'idle') { 
        // console.log("💬 aiChat: Pending add item data found:", pendingData);
        setPendingItem(pendingData);
      }
    } else {
      // Clear pending item if it's no longer present in the thread data 
      // AND the status isn't showing 'added' (allow time for message to display)
      if (pendingItem !== null && addItemStatus !== 'added') {
        //  console.log("💬 aiChat: Clearing pending add item data.");
         setPendingItem(null);
         setAddItemStatus('idle'); // Reset status when data disappears from thread
      }
    }

    // Update displayed messages (existing logic)
    if (contextMessages && contextMessages.length > 0) {
        const subsequentMessages = contextMessages.slice(1);
        // console.log(`💬 aiChat: Context messages received. Combining permanent first message with ${subsequentMessages.length} subsequent messages.`);
        setDisplayMessages([permanentFirstMessage, ...subsequentMessages]);

        // Check if AI has responded - improved logic with message count tracking
        if (isAiResponding) {
            const lastMessage = contextMessages[contextMessages.length - 1];
            const currentMessageCount = contextMessages.length;
            
            // AI has responded if:
            // 1. We have MORE messages than when we sent, AND the last message is from assistant
            // 2. OR if thread status indicates error (to stop spinner on error)
            const hasNewAssistantMessage = currentMessageCount > messageCountWhenSent && 
                                          lastMessage && 
                                          lastMessage.role === 'assistant';
            
            const shouldStopSpinner = hasNewAssistantMessage || threadStatus === 'error';
            
            if (shouldStopSpinner) {
                setIsAiResponding(false);
            }
        }
    } else if (contextMessages) {
        //  console.log("💬 aiChat: Context messages arrived but empty. Displaying only permanent first message.");
         if (displayMessages.length !== 1 || displayMessages[0].id !== permanentFirstMessage.id) {
             setDisplayMessages([permanentFirstMessage]);
         }
    }
  }, [currentThread, threadStatus, permanentFirstMessage, addItemStatus, pendingItem, isAiResponding, messageCountWhenSent, displayMessages.length]); // Add messageCountWhenSent dependency

  useEffect(() => {
    if (displayMessages.length > 0 && activeThreadId) {
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 150);
    }
  }, [displayMessages, activeThreadId]); // Depend on activeThreadId as well

  const handleBackPress = useCallback(async () => {
    // console.log('💬 aiChat: Back button pressed. Setting summary flag and triggering summary generation...');
    if (!user?.uid || !activeThreadId) {
        console.error(`❌ Cannot trigger summary: userId (${user?.uid}) or activeThreadId (${activeThreadId}) missing.`);
        router.back();
        return;
    }

    // Summary flag functionality removed - was calling non-existent function

    try {
        await generateThreadSummary(user.uid, activeThreadId);
        // console.log(`✅ Summary request called for thread ${activeThreadId}.`);
    } catch (error) {
        console.error(`🔴 Failed to trigger summary generation for thread ${activeThreadId}:`, error);
    }
    router.back();
  }, [user?.uid, activeThreadId, router]);

  const handleSend = async () => {
    const messageToSend = inputMessage.trim();
    // console.log(`💬 aiChat: handleSend triggered. Raw inputMessage: "${inputMessage}", Trimmed messageToSend: "${messageToSend}"`); // Log both raw and trimmed

    if (!messageToSend) {
      // console.log('💬 aiChat: handleSend - messageToSend is empty, not proceeding.');
      return; 
    }

    setInputMessage(''); // Clear input
    if (!activeThreadId) { 
      console.error('💬 aiChat: Cannot send message, no active thread ID.');
      alert("Error: No active chat session.");
      return;
    }

    setIsAiResponding(true); // Set spinner true
    setMessageCountWhenSent(currentThread?.messages?.length || 0); // Track current message count
    try {
      // console.log(`💬 aiChat: PRE-SEND CHECK -> activeThreadId: "${activeThreadId}", messageToSend: "${messageToSend}"`);
      // console.log(`💬 aiChat: Calling context sendMessage for thread ${activeThreadId}...`);
      await sendMessage(activeThreadId, messageToSend); 
      // console.log('💬 aiChat: Context sendMessage finished.');
    } catch (error) {
      console.error('Error submitting message via context:', error);
      alert("Error sending message.");
      setIsAiResponding(false); // Set spinner false on error
    }
  };

  const renderMessageItem = ({ item }) => {
    const isUser = item.role === 'user';
    const showAvatar = !isUser || (isUser && userInitials && userInitials !== '?');
    const messageContent = String(item.content ?? '...');

    return (
      <View style={[styles.messageRow, isUser ? styles.userMessageRow : styles.aiMessageRow]}>
        {!isUser && (
            <View style={[styles.avatar, styles.aiAvatar]}>
                <Text style={styles.avatarText}>a</Text>
            </View>
        )}
        {/* Bubble first for user messages */}
        <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.aiBubble]}>
           <Text style={styles.messageText}>{messageContent}</Text>
        </View>
        {/* Avatar after bubble for user messages */}
        {isUser && showAvatar && (
             <View style={[styles.avatar, styles.userAvatar]}>
                <Text style={styles.avatarText}>{userInitials}</Text>
             </View>
        )}
      </View>
    );
  };

  // --- Handlers for Pending Item Card --- 

  const handleConfirmAddItem = useCallback(async () => {
    if (!pendingItem || !user?.uid || !activeThreadId) return;
    // console.log('➕ Confirming add item:', pendingItem);
    setAddItemStatus('adding');

    try {
      // 1. Add item to user's routine
      const addedItem = await addRoutineItem(user.uid, pendingItem);
      // console.log('✅ Item added successfully:', addedItem.id);

      // 2. Clear the pending item field in the thread document
      await clearPendingAddItem(user.uid, activeThreadId);
      // console.log('✅ Pending item cleared from thread.');

      // 3. Update UI to show 'Added!' confirmation (and keep it)
      setAddItemStatus('added');

    } catch (error) {
      console.error('🔴 Error confirming add item:', error);
      setAddItemStatus('error');
      // Optionally reset after a delay or leave the error message?
      setTimeout(() => {
         setAddItemStatus('idle'); // Reset status after showing error
         // Do NOT clear pendingItem here, allow user to retry or cancel?
      }, 3000); // Show error for 3 seconds
    }
  }, [pendingItem, user?.uid, activeThreadId]);

  const handleCancelAddItem = useCallback(async () => {
    if (!user?.uid || !activeThreadId) return;
    // console.log('➖ Cancelling add item');
    
    // Clear local state immediately to hide the card
    setPendingItem(null);
    setAddItemStatus('idle');

    try {
      // Clear the pending item field in the thread document (fire and forget is okay here)
      await clearPendingAddItem(user.uid, activeThreadId);
      // console.log('✅ Pending item cleared from thread on cancel.');
    } catch (error) {
      // Log error but UI has already moved on
      console.error('🔴 Error clearing pending item from thread on cancel:', error);
    }
  }, [user?.uid, activeThreadId]);

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      {/* REMOVED: <Stack.Screen options={{...}}/> */}

      {/* --- Manual Header (Updated) --- */}
      <View style={styles.manualHeader}>
        <TouchableOpacity
            style={styles.backButtonContainer} // Use container for row layout
            onPress={handleBackPress}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        >
            <Ionicons name="arrow-back" size={28} color="#333" />
            {/* <Text style={styles.backButtonText}>Back</Text>  */}
        </TouchableOpacity>
        {/* REMOVED Title and Placeholder */}
      </View>
      {/* --- End Manual Header --- */}

      {/* KeyboardAvoidingView now inside SafeAreaView, after manual header */}
      <KeyboardAvoidingView
        style={{ flex: 1 }} // Takes remaining space
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        // Offset needs to account for the manual header height
        keyboardVerticalOffset={MANUAL_HEADER_HEIGHT + (Platform.OS === "ios" ? 10 : 0)} // Adjust base offset (10) if needed
      >
        <FlatList
          ref={flatListRef}
          data={displayMessages}
          renderItem={renderMessageItem}
          keyExtractor={(item, index) => item.id || `msg-${index}`}
          style={styles.chatArea}
          contentContainerStyle={styles.chatContentContainer}
          ListEmptyComponent={<Text style={styles.emptyText}>Loading chat...</Text>}
        />

        {/* Conditionally render the PendingAddItemCard based on pendingItem */} 
        {/* Pass status and handlers */} 
        {pendingItem && (
          <PendingAddItemCard
            itemData={pendingItem}
            onConfirm={handleConfirmAddItem}
            onCancel={handleCancelAddItem}
            status={addItemStatus} // Pass the status
          />
        )}

        {isAiResponding && (
            <View style={styles.spinnerContainer}>
                <ActivityIndicator size="small" color={colors.primary} />
            </View>
        )}

        {/* Input Area */}
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            value={inputMessage}
            onChangeText={setInputMessage}
            placeholder="Ask about your skin..."
            placeholderTextColor="#999"
            multiline
          />
          <TouchableOpacity
             onPress={handleSend}
             style={styles.sendButton}
             disabled={!inputMessage.trim()}
          >
            <Ionicons name="arrow-up-circle" size={32} color={!inputMessage.trim() ? "#ccc" : "#6E46FF"} />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  // --- Manual Header Styles ---
  manualHeader: {
    height: MANUAL_HEADER_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    backgroundColor: '#fff',
  },
  backButtonContainer: { // Container for icon and text
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 5, // Padding for the container
  },
  backButtonText: { // Style for "Back" text
      fontSize: 17, // Standard iOS size
      color: '#333', // Dark Grey Text
      marginLeft: 4, // Space between icon and text
  },
  chatArea: {
    flex: 1,
  },
  chatContentContainer: {
    paddingVertical: 10,
    paddingHorizontal: 10,
  },
  messageRow: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'flex-end',
  },
  userMessageRow: {
    justifyContent: 'flex-end',
  },
  aiMessageRow: {
    justifyContent: 'flex-start',
  },
  avatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 8,
    marginBottom: 2,
  },
  userAvatar: {
      backgroundColor: '#ccc',
  },
  aiAvatar: {
    backgroundColor: '#6E46FF',
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 14,
  },
  messageBubble: {
    maxWidth: '75%',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 18,
  },
  userBubble: {
    backgroundColor: '#E5E5EA',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    backgroundColor: '#F0F0F0',
    borderBottomLeftRadius: 4,
  },
  messageText: {
    fontSize: 15,
    color: '#000',
  },
  inputContainer: {
    flexDirection: 'row',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderColor: '#eee',
    backgroundColor: '#fff',
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 120,
    backgroundColor: '#f0f0f0',
    borderRadius: 20,
    paddingHorizontal: 15,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    marginRight: 10,
  },
  sendButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Platform.OS === 'ios' ? 2 : 4,
  },
  emptyText: {
      textAlign: 'center',
      marginTop: 50,
      color: '#999',
  },
  pendingCardContainer: { 
    backgroundColor: '#F0F0F0', // Match AI bubble color
    borderRadius: 18, // Match bubble radius
    paddingVertical: 10, // Match bubble padding V
    paddingHorizontal: 14, // Match bubble padding H
    marginHorizontal: spacing.lg,  // Keep some margin
    marginBottom: spacing.md,    
    marginTop: spacing.sm,      
    alignSelf: 'flex-start', // Align bubble to the left
    maxWidth: '85%', // Max width like bubbles
    // Remove border/shadow from previous card style
  },
  pendingCardQuestion: {
    ...typography.body, 
    fontSize: 14,
    color: colors.textSecondary, 
    marginBottom: spacing.sm, // Space between question and summary
  },
  pendingCardSummary: {
    ...typography.body,
    fontSize: 15,
    fontWeight: '500',
    color: colors.textPrimary,
    marginBottom: spacing.md, // Space before chips
  },
  pendingCardActions: {
    flexDirection: 'row', // Chips inline
    justifyContent: 'flex-start', // Align chips to the start/left
    alignItems: 'center',
    gap: spacing.md, // Add gap between chips
    marginTop: spacing.xs, // Small space above chips
  },
  // New styles for status display inside the card
  pendingCardStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center', // Center the status message
    paddingVertical: 10, // Add some vertical padding for status
  },
  pendingCardStatusText: {
    ...typography.body,
    marginLeft: spacing.sm,
    fontSize: 15,
    color: colors.textPrimary,
  },
  spinnerContainer: {
    paddingVertical: spacing.sm, // Keep padding
    alignItems: 'center',        // Keep align center
    justifyContent: 'center',    // Keep justify center
    // Removed flex: 1
  },
});

export default AiChatScreen; 