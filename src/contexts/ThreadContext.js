// ThreadContext.js
// Manages state for the currently active/listened-to AI thread

/* ------------------------------------------------------
WHAT IT DOES
- Holds state for the current thread (`currentThread`, `threadStatus`, `messages`, `latestMessage`).
- Provides functions to interact with threads using FirebaseThreadsService:
  - `listenToThread`: Sets up a real-time listener for a specific thread.
  - `createThread`: Creates a new thread (atomically linking to photo if applicable).
  - `retryMessage`: Initiates a retry for the current thread's processing.
  - `sendMessage`: Adds a user message to the current thread.
- Manages loading/error states and timeouts related to thread listening.

CONTEXTS USED
- Relies on `auth` for `currentUser.uid`.
- Uses FirebaseThreadsService for all Firestore interactions.
------------------------------------------------------*/

import React, { createContext, useState, useContext, useEffect, useCallback, useRef } from 'react';
import { listenToThread as listenToThreadService, createThread as createThreadService, retryThread as retryThreadService, addMessageToThread as addMessageToThreadService } from '../services/FirebaseThreadsService';
import { auth } from '../config/firebase';

const ThreadContext = createContext();

// Timeout for considering a listener 'stuck' in loading
const LISTENER_TIMEOUT_MS = 8000; // Increased slightly

export function ThreadProvider({ children }) {
  const [currentThreadId, setCurrentThreadId] = useState(null); // Track the ID we are listening to
  const [currentThread, setCurrentThread] = useState(null);
  const [threadStatus, setThreadStatus] = useState('idle'); // idle, loading, complete, error
  const [messages, setMessages] = useState([]);
  const unsubscribeRef = useRef(null); // Use ref instead of state to avoid re-renders
  const [latestMessage, setLatestMessage] = useState(null);

  const listenerTimeoutRef = useRef(null); // Ref for the listener timeout

  // Cleanup listener on unmount
  useEffect(() => {
    return () => {
      if (unsubscribeRef.current) {
        // console.log(`🧹 ThreadContext: Cleaning up listener for thread ${currentThreadId}`);
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        // Clear timeout if listener is cleaned up
        if (listenerTimeoutRef.current) {
            clearTimeout(listenerTimeoutRef.current);
            listenerTimeoutRef.current = null;
        }
      }
    };
  }, []); // No dependencies - only cleanup on unmount

  // Use useCallback to memoize listenToThread, preventing unnecessary effect runs
  const listenToThread = useCallback((threadId) => {
    if (!threadId) {
      // If called with null, ensure cleanup of any existing listener
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
        unsubscribeRef.current = null;
        setCurrentThreadId(null);
        setCurrentThread(null);
        setMessages([]);
        setLatestMessage(null);
        setThreadStatus('idle');
        if (listenerTimeoutRef.current) {
            clearTimeout(listenerTimeoutRef.current);
            listenerTimeoutRef.current = null;
        }
      }
      return () => {}; // Return no-op cleanup
    }

    // Prevent re-subscribing to the same thread unnecessarily
    if (threadId === currentThreadId && unsubscribeRef.current) {
        // Return the existing unsubscribe function if already listening
        // Note: This might not be ideal if the component calling listenToThread expects a *new* cleanup function for its own useEffect.
        // A safer approach might be to always cleanup and resubscribe, letting firebase handle efficiency. Let's stick with cleanup/resubscribe.
        // return unsubscribeRef.current;
    }
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("🔴 ThreadContext: User not authenticated for listenToThread.");
      setThreadStatus('error');
      return () => {}; // Return no-op cleanup
    }

    // Cleanup previous listener FIRST
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      if (listenerTimeoutRef.current) {
         clearTimeout(listenerTimeoutRef.current);
         listenerTimeoutRef.current = null;
      }
    }
     // Reset state before starting listener
    setCurrentThreadId(threadId); // Set the new ID immediately
    setCurrentThread(null);
    setMessages([]);
    setLatestMessage(null);
    setThreadStatus('loading'); // Set loading status

    // Clear previous timeout just in case
    if (listenerTimeoutRef.current) {
       clearTimeout(listenerTimeoutRef.current);
    }

    // Set a timeout to prevent getting stuck in loading state
    listenerTimeoutRef.current = setTimeout(() => {
      if (threadStatus === 'loading' && currentThreadId === threadId) { // Check if still loading the *same* thread
        console.warn(`⏱️ ThreadContext: Listener timeout reached for thread ${threadId}. Setting status to error.`);
        setThreadStatus('error');
      }
      listenerTimeoutRef.current = null; // Clear ref after timeout runs
    }, LISTENER_TIMEOUT_MS);


    // Call the service function
    try {
      const newUnsubscribe = listenToThreadService(userId, threadId, (thread) => {
        // Clear the timeout once data is received (or confirmed non-existent)
        if (listenerTimeoutRef.current) {
           clearTimeout(listenerTimeoutRef.current);
           listenerTimeoutRef.current = null;
        }

        if (thread) {
          setCurrentThread(thread);
          setMessages(thread.messages || []);

          // Set latest message if available
          const lastMsg = thread.messages?.[thread.messages.length - 1];
          setLatestMessage(lastMsg?.content || null); // Handle null content explicitly

          // Update status based on thread state - simplified to avoid circular dependencies
          const currentStatus = thread.status?.state || 'pending';
          setThreadStatus(currentStatus);

        } else {
          // Thread doesn't exist or was deleted
          setCurrentThread(null);
          setMessages([]);
          setLatestMessage(null);
          setThreadStatus('error'); // Treat non-existence as an error state for the listener
        }
      });

      // Store the new unsubscribe function in ref
      unsubscribeRef.current = newUnsubscribe;

      // Return the specific unsubscribe function for this call
      return newUnsubscribe;

    } catch (error) {
        console.error(`🔴 ThreadContext: Error setting up listener via service for thread ${threadId}:`, error);
        setThreadStatus('error');
        // Clear timeout on error
        if (listenerTimeoutRef.current) {
           clearTimeout(listenerTimeoutRef.current);
           listenerTimeoutRef.current = null;
        }
        return () => {}; // Return no-op cleanup on error
    }

  // *** REMOVE dependencies that cause the loop ***
  // It primarily depends on the 'threadId' argument and implicitly on 'auth.currentUser.uid'.
  // Callbacks created with useCallback capture variables from their outer scope.
  // Rely on the auth listener effect to handle user changes.
  }, []); // Keep dependency array empty or add only truly external, stable dependencies

  const createThread = useCallback(async (options) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("🔴 CONTEXT: User not authenticated for createThread.");
      throw new Error('User not authenticated');
    }

    try {
      const result = await createThreadService(userId, options);

      // Automatically listen to the newly created thread
      // Note: The photo doc update should trigger the listener in SnapshotScreen,
      // which updates selectedSnapshot, triggering listeners in children.
      // Calling listenToThread here might be redundant if already handled by UI flow.
      // However, it ensures the context starts listening immediately.
      if (result.success && result.threadId) {
        // listenToThread(result.threadId); // Decide if explicit listen here is needed
      }

      return result.threadId; // Return the new thread ID
    } catch (error) {
      console.error('🔴 CONTEXT: Error calling createThread:', error);
      throw error; // Rethrow for the calling component
    }
  }, []); // No dependencies needed if it only uses auth


  const retryMessage = useCallback(async () => {
    const threadId = currentThreadId; // Use the ID we are currently tracking
    if (!threadId) {
      console.warn("⚠️ ThreadContext: Cannot retry, no current thread ID.");
      return;
    }

    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("🔴 ThreadContext: User not authenticated for retryMessage.");
      return; // Or throw error
    }

    setThreadStatus('loading'); // Set loading state while retrying

    try {
      // Call the updated service function
      await retryThreadService(userId, threadId);
      // Listener should pick up status changes automatically if backend resets to pending/active
    } catch (error) {
      console.error(`🔴 ThreadContext: Error retrying thread ${threadId} via service:`, error);
      setThreadStatus('error'); // Set error state if retry fails
    }
  }, [currentThreadId]); // Depend on the current thread ID


  const sendMessage = useCallback(async (threadId, content) => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      console.error("🔴 ThreadContext: User not authenticated for sendMessage.");
      throw new Error('User not authenticated');
    }
    if (!threadId) {
      console.warn("⚠️ ThreadContext: sendMessage called with no threadId.");
      throw new Error('Thread ID is required to send a message');
    }
    if (!content || typeof content !== 'string' || !content.trim()) {
      console.warn("⚠️ ThreadContext: sendMessage called with empty or invalid content.");
      throw new Error('Message content cannot be empty');
    }

    try {
      const messageData = { content, role: 'user' }; // timestamp added by service
      await addMessageToThreadService(userId, threadId, messageData);
      return { success: true };
    } catch (error) {
      console.error(`🔴 ThreadContext: Error sending message to thread ${threadId}:`, error);
      throw error;
    }
  }, []);

  // Consolidate value to provide
  const value = {
    currentThread,
    threadStatus,
    messages,
    latestMessage,
    listenToThread,
    createThread,
    retryMessage,
    sendMessage
  };

  return <ThreadContext.Provider value={value}>{children}</ThreadContext.Provider>;
}

export const useThreadContext = () => useContext(ThreadContext);