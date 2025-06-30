// FirebaseThreadsService.js
// Handles AI conversation threads and their real-time updates

import { db, rtdb } from '../config/firebase';
import {
  doc, getDoc, updateDoc, writeBatch,
  onSnapshot, Timestamp, arrayUnion
} from 'firebase/firestore';
import { ref as databaseRef, push } from 'firebase/database';
import { generateSimpleId } from '../utils/firebase-utils';

export async function getThreadById(userId, threadId) {
  try {
    console.log('📝 Getting thread:', { userId, threadId });
    const threadRef = doc(db, 'users', userId, 'threads', threadId);
    const threadDoc = await getDoc(threadRef);
    
    if (threadDoc.exists()) {
      return { id: threadDoc.id, ...threadDoc.data() };
    }
    console.log('⚠️ Thread not found:', threadId);
    return null;
  } catch (error) {
    console.error('🔴 Error getting thread:', error);
    throw error;
  }
}

/**
 * Sets up a real-time listener for a specific thread document.
 * @param {string} userId The ID of the user.
 * @param {string} threadId The ID of the thread to listen to.
 * @param {function} callback Function to call with thread data (or null).
 * @returns {function} Unsubscribe function.
 */
export function listenToThread(userId, threadId, callback) {
  try {
    const threadRef = doc(db, 'users', userId, 'threads', threadId);

    // Ensure the callback handles potential null data during initial setup or deletion
    const unsubscribe = onSnapshot(threadRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        callback({ id: docSnapshot.id, ...docSnapshot.data() });
      } else {
        callback(null); // Explicitly pass null if document doesn't exist
      }
    }, (error) => {
      console.error('🔴 Thread listener error:', error);
      // Consider passing the error or a specific state to the callback
      callback(null); // Pass null on error for simplicity here
    });

    return unsubscribe; // Return the unsubscribe function
  } catch (error) {
    console.error('🔴 Error setting up thread listener:', error);
    // Rethrow or handle as appropriate for your app's error strategy
    throw error;
  }
}

/**
 * Creates a new thread document and optionally updates the related photo document.
 * @param {string} userId The user ID.
 * @param {object} options Thread options.
 * @param {string} options.type Type of thread (e.g., 'snapshot_feedback', 'routine_add_discussion').
 * @param {string} [options.photoId] Optional associated photo ID (required for snapshot_feedback).
 * @param {string} [options.initialMessageContent] Optional content for the first assistant message.
 * @param {object} [options.context] Optional initial context data.
 * @returns {Promise<{success: boolean, threadId: string}>}
 */
export async function createThread(userId, options) {
  const { type, photoId, context, initialMessageContent } = options;
  console.log('🔵 FIREBASE SERVICE: Creating thread:', { userId, type, photoId, hasInitialMsg: !!initialMessageContent });

  if (!userId || !type) {
    throw new Error('Missing required parameters: userId and type must be provided');
  }
  if (type === 'snapshot_feedback' && !photoId) {
    throw new Error('Missing photoId for snapshot_feedback thread type');
  }

  // Use existing generateSimpleId or Firestore auto-ID for threadId
  const threadId = generateSimpleId(type === 'snapshot_feedback' ? `snp-${photoId}` : type); 

  const threadRef = doc(db, 'users', userId, 'threads', threadId);
  const now = new Date();
  const threadData = {
    type: type,
    status: {
      state: 'pending', // Initial state
      lastUpdated: Timestamp.fromDate(now)
    },
    messages: [{
      // Use provided initial content or default to null
      content: initialMessageContent !== undefined ? initialMessageContent : null,
      role: 'user',
      timestamp: Timestamp.fromDate(now)
    }],
    createdAt: Timestamp.fromDate(now),
    updatedAt: Timestamp.fromDate(now)
  };

  if (photoId) threadData.photoId = photoId;
  if (context) threadData.context = context;

  const batch = writeBatch(db);
  batch.set(threadRef, threadData);

  if (type === 'snapshot_feedback' && photoId) {
    const photoRef = doc(db, 'users', userId, 'photos', photoId);
    batch.update(photoRef, {
      threadId: threadId,
      updatedAt: Timestamp.fromDate(now)
    });
    console.log(`🔵 Batch: Will update photo ${photoId} with threadId ${threadId}`);
  }

  try {
    await batch.commit();
    console.log(`✅ FIREBASE SERVICE: Thread ${threadId} created successfully.`);
    return { success: true, threadId: threadId };
  } catch (error) {
    console.error('🔴 FIREBASE SERVICE: Error committing thread creation batch:', error);
    throw error; 
  }
}

/**
 * Adds a message to an existing thread.
 * @param {string} userId The user ID.
 * @param {string} threadId The thread ID.
 * @param {object} messageData The message object.
 * @param {string} messageData.content The message content.
 * @param {string} messageData.role The role ('user' or 'assistant').
 * @returns {Promise<{success: boolean}>}
 */
export async function addMessageToThread(userId, threadId, messageData) {
  try {
    console.log('🔵 Adding message to thread:', { userId, threadId, role: messageData.role });

    if (!userId || !threadId || !messageData || !messageData.content || !messageData.role) {
      throw new Error('Missing required parameters for adding message');
    }

    const threadRef = doc(db, 'users', userId, 'threads', threadId);
    const threadDoc = await getDoc(threadRef);

    if (!threadDoc.exists()) {
      throw new Error(`Thread not found: ${threadId}`);
    }

    const thread = threadDoc.data();
    const now = Timestamp.fromDate(new Date());

    // Prepare the new message with a server timestamp
    const newMessage = {
      ...messageData,
      timestamp: now
    };

    // Create the updated messages array
    const updatedMessages = [...thread.messages, newMessage];

    await updateDoc(threadRef, {
      messages: updatedMessages,
      // Optionally update thread status if needed (e.g., set to 'active' on user message)
      // status: {
      //   ...thread.status,
      //   state: 'active', // Example: Mark active on new message
      // },
      updatedAt: now // Update thread timestamp
    });

    console.log(`✅ FIREBASE: Message added to thread ${threadId}`);
    return { success: true };
  } catch (error) {
    console.error(`🔴 FIREBASE: Error adding message to thread ${threadId}:`, error);
    throw error;
  }
}

/**
 * Initiates a retry for a thread's processing (e.g., AI message generation).
 * Actual retry logic depends on backend implementation (e.g., queue trigger).
 * This function currently just updates the status.
 * @param {string} userId The user ID.
 * @param {string} threadId The thread ID to retry.
 * @returns {Promise<{success: boolean}>}
 */
export async function retryThread(userId, threadId) {
   try {
    console.log('🔄 Retrying thread:', { userId, threadId });
     if (!userId || !threadId) {
       throw new Error('Missing required parameters for retrying thread');
     }

     const threadRef = doc(db, 'users', userId, 'threads', threadId);

     // Update status to 'pending' to signify retry attempt
     await updateDoc(threadRef, {
       status: {
         state: 'pending', // Reset status to trigger backend listener (if applicable)
         lastUpdated: Timestamp.fromDate(new Date())
       },
       // Optionally clear the last message content if backend generates anew
       // messages: FieldValue.arrayRemove(...) // More complex logic needed here
       updatedAt: Timestamp.fromDate(new Date())
     });

     // TODO: Implement actual backend trigger mechanism if needed
     // e.g., write to RTDB queue, call Cloud Function HTTPS endpoint

     console.log(`✅ FIREBASE: Thread ${threadId} status reset to pending for retry.`);
     return { success: true };
   } catch (error) {
     console.error(`🔴 FIREBASE: Error retrying thread ${threadId}:`, error);
     throw error;
   }
}

export async function generateThreadSummary(userId, threadId) {
  try {
    console.log('🔵 Generating summary for thread:', { userId, threadId });

    const aiSummaryThreadQueueObject = {
      id: threadId,
      createdAt: new Date().toLocaleString(),
      type: 'snapshot-thread-exit',
      data: {
        userId,
        threadId
      }
    };

    const queueRef = databaseRef(rtdb, 'aiSummaryQueue');
    await push(queueRef, aiSummaryThreadQueueObject);
    console.log('🔵 FIREBASE: Summary generation request added to /aiSummaryQueue:', aiSummaryThreadQueueObject);
  } catch (error) {
    console.error('🔴 FIREBASE: Error generating summary:', error);
    throw error;
  }
}

// Export all functions as a service object
export const firebaseThreadsService = {
  getThreadById,
  listenToThread,
  createThread,
  addMessageToThread,
  retryThread,
  generateThreadSummary,
};