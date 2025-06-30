// errorMessages.js
// Utility for managing error message strings

/* ------------------------------------------------------
WHAT IT DOES
- Centralizes error message handling
- Maps Firebase auth errors to user-friendly messages
- Provides consistent error messaging across the app

DEV PRINCIPLES
- Use clear, user-friendly language
- Maintain consistent error message structure
- Handle common Firebase auth errors
------------------------------------------------------*/

const authErrors = {
  'auth/invalid-email': 'Please enter a valid email address',
  'auth/user-disabled': 'This account has been disabled',
  'auth/user-not-found': 'No account found with this email',
  'auth/wrong-password': 'Incorrect password',
  'auth/email-already-in-use': 'An account already exists with this email',
  'auth/operation-not-allowed': 'Email/password accounts are not enabled',
  'auth/weak-password': 'Password should be at least 6 characters',
  'auth/invalid-credential': 'Invalid login credentials',
  'auth/invalid-verification-code': 'Invalid verification code',
  'auth/invalid-verification-id': 'Invalid verification ID',
  'auth/network-request-failed': 'Network error. Please check your connection',
};

export const getAuthErrorMessage = (error) => {
  // Extract the error code from Firebase error
  const errorCode = error?.code || error?.message;
  
  // Return mapped message or original error if no mapping exists
  return authErrors[errorCode] || error.message;
};
