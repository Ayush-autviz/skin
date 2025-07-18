// FirebaseThreadsService.js (stub)
// Temporary stub to satisfy legacy imports after Firebase removal.
// All functions simply log a warning and perform a no-op so that the app can compile.

/* eslint-disable no-console */

export function listenToThread(userId, threadId, callback) {
  console.warn('[Stub] listenToThread called but Firebase is removed. Returning no-op unsubscribe.');
  // Immediately invoke callback with null to indicate no data
  if (typeof callback === 'function') {
    callback(null);
  }
  // Return unsubscribe function
  return () => {};
}

export async function createThread(userId, options = {}) {
  console.warn('[Stub] createThread called but Firebase is removed.');
  // Return a fake thread ID so callers can proceed without crashing
  return { success: true, threadId: `stub-${Date.now()}` };
}

export async function retryThread(userId, threadId) {
  console.warn('[Stub] retryThread called but Firebase is removed.');
  return { success: false, message: 'Firebase removed' };
}

export async function addMessageToThread(userId, threadId, messageData) {
  console.warn('[Stub] addMessageToThread called but Firebase is removed.');
  return { success: false };
}

export async function generateThreadSummary(threadId) {
  console.warn('[Stub] generateThreadSummary called but Firebase is removed.');
  return { success: false, summary: '' };
} 