// forgot-password.js
// Authentication screen for password reset

/* ------------------------------------------------------
WHAT IT DOES
- Handles password reset via email
- Provides navigation back to sign in
- Displays form validation and error messages

DEV PRINCIPLES
- Uses vanilla JavaScript
- Implements proper form validation
- Provides clear user feedback
- Uses global style system
------------------------------------------------------*/

import { useState } from 'react';
import { View, Text, TextInput, StyleSheet, TouchableOpacity } from 'react-native';
import { Link } from 'expo-router';
import { sendPasswordResetEmail } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { colors, spacing, typography, forms } from '../../src/styles';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    try {
      setLoading(true);
      setError('');
      setSuccess('');
      await sendPasswordResetEmail(auth, email);
      setSuccess('Check your email for reset instructions');
      setEmail(''); // Clear email after successful send
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Reset Password</Text>
      
      <Text style={styles.subtitle}>
        Enter your email address and we'll send you instructions to reset your password.
      </Text>

      {error && <Text style={styles.error}>{error}</Text>}
      {success && <Text style={styles.success}>{success}</Text>}
      
      <TextInput
        style={[
          styles.input,
          error && forms.input.error
        ]}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholderTextColor={forms.input.placeholder.color}
      />

      <View style={styles.buttonContainer}>
        <TouchableOpacity 
          style={[
            forms.button.primary.container,
            loading && forms.button.primary.disabled
          ]}
          onPress={handleResetPassword}
          disabled={loading}
        >
          <Text style={forms.button.primary.text}>
            {loading ? 'Sending...' : 'Send Reset Link'}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.createAccountContainer}>
        <Text style={styles.createAccountText}>
          Remember your password?{' '}
          <Link href="/auth/sign-in" style={styles.link}>
            Sign in
          </Link>
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
    backgroundColor: colors.background,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
    ...typography.caption,
  },
  success: {
    color: colors.success,
    marginBottom: spacing.lg,
    textAlign: 'center',
    ...typography.caption,
  },
  input: {
    ...forms.input.base,
    marginBottom: spacing.lg,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  createAccountContainer: {
    alignItems: 'center',
    marginTop: spacing.lg,
  },
  createAccountText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  link: {
    color: colors.primary,
    textDecorationLine: 'underline',
  },
}); 