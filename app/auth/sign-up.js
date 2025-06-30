// sign-up.js
// Authentication screen for user registration

/* ------------------------------------------------------
WHAT IT DOES
- Handles user registration with email/password
- Provides navigation to sign in
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
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../src/config/firebase';
import { colors, spacing, typography, forms } from '../../src/styles';
import { createProfile } from '../../src/services/FirebaseUserService';
import { getAuthErrorMessage } from '../../src/utils/errorMessages';

export default function SignUp() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState(''); // NEW
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setError('');
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await createProfile(userCredential.user.uid, email);
      // go to onboarding
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
          <Text style={styles.title}>Create Account</Text>
          
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
            returnKeyType="next"
            onSubmitEditing={() => confirmPasswordRef.current?.focus()}
            autoComplete="new-password"
            textContentType="newPassword"
            passwordRules=""
            keyboardType="default"
          />

          <TextInput
            ref={confirmPasswordRef}
            style={[
              styles.input,
              error && forms.input.error
            ]}
            placeholder="Confirm Password"
            value={confirmPassword}
            onChangeText={setConfirmPassword}
            secureTextEntry
            placeholderTextColor={forms.input.placeholder.color}
            returnKeyType="done"
            onSubmitEditing={handleSignUp}
            autoComplete="new-password"
            textContentType="newPassword"
            passwordRules=""
            keyboardType="default"
          />

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={[
                forms.button.primary.container,
                loading && forms.button.primary.disabled
              ]}
              onPress={handleSignUp}
              disabled={loading}
            >
              <Text style={forms.button.primary.text}>
                {loading ? 'Creating Account...' : 'Create Account'}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.createAccountContainer}>
            <Text style={styles.createAccountText}>
              Already have an account?{' '}
              <Link href="/auth/sign-in" style={styles.link}>
                Sign in
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