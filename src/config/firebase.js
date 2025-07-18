// firebase.js (stub)
// Temporary Firebase auth stub to satisfy legacy imports after Firebase removal.

export const auth = {
  currentUser: null,
  // Provide a listener signature to avoid crashes if some code subscribes
  onAuthStateChanged: () => () => {},
};

export const db = null;
export const isFirebaseInitialized = false; 