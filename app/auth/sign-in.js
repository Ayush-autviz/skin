// sign-in.js
// Authentication screen for user sign in

/* ------------------------------------------------------
WHAT IT DOES
- Handles user sign in with email/password
- Provides navigation to sign up and forgot password
- Displays form validation and error messages

DEV PRINCIPLES
- Uses vanilla JavaScript
- Implements proper form validation
- Provides clear user feedback
- Uses global style system
------------------------------------------------------*/

import { useState, useRef } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform
} from 'react-native';
import { Link } from 'expo-router';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { colors, spacing, typography, forms } from '../../src/styles';
import { getAuthErrorMessage } from '../../src/utils/errorMessages';

export default function SignIn() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const passwordRef = useRef(null);

  const handleSignIn = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      return;
    }

    try {
      setLoading(true);
      setError('');
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(getAuthErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 50 : 0}
    >
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.content}>
          <Text style={styles.title}>Magic Mirror</Text>
          
          {error && <Text style={styles.error}>{error}</Text>}
          
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
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
          />
          
          <TextInput
            ref={passwordRef}
            style={[
              styles.input,
              error && forms.input.error
            ]}
            placeholder="Password"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            placeholderTextColor={forms.input.placeholder.color}
            returnKeyType="done"
            onSubmitEditing={handleSignIn}
            autoComplete="current-password"
            textContentType="password"
            passwordRules=""
          />
          
          <Link href="/auth/forgot-password" style={styles.forgotPassword}>
            Forgot Password?
          </Link>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                forms.button.primary.container,
                loading && forms.button.primary.disabled
              ]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={forms.button.primary.text}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>
              Don't have an account?{' '}
              <Link href="/auth/sign-up" style={styles.link}>
                Create one
              </Link>
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  content: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'center',
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xxl,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
    ...typography.caption,
  },
  input: {
    ...forms.input.base,
    marginBottom: spacing.lg,
  },
  forgotPassword: {
    ...typography.caption,
    color: colors.primary,
    textAlign: 'right',
    marginTop: spacing.xs,
    marginBottom: spacing.xl,
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