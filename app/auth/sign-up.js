// sign-up.js
// Authentication screen for user registration

/* ------------------------------------------------------
WHAT IT DOES
- Handles user registration with email/password
- Calls external API to create user subject
- Provides navigation to sign in
- Displays form validation and error messages

DEV PRINCIPLES
- Consistent design with Sign-In screen
- Uses React Native best practices
- Implements proper form validation
- Provides clear user feedback
- Uses accessibility guidelines
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
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Lock, Eye, EyeOff, User } from 'lucide-react-native';
import { signUp } from '../../src/services/newApiService';
import useAuthStore from '../../src/stores/authStore';

export default function SignUp() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const { setUser, setTokens, setLoading: setStoreLoading } = useAuthStore();
  const emailRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmPasswordRef = useRef(null);

  const handleSignUp = async () => {
    if (!name.trim() || !email || !password || !confirmPassword) {
      setError('Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    try {
      setLoading(true);
      setStoreLoading(true);
      setError('');

      // Sign up with new API
      const result = await signUp({
        name: name.trim(),
        email: email.toLowerCase().trim(),
        password: password
      });

      if (result.success) {
        // Store user data and tokens
        setUser(result.user);
        setTokens(result.access_token, result.refresh_token);
        
        // Navigate to profile creation (onboarding)
        router.push('/onboarding/name');
      }
    } catch (err) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
      setStoreLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      {/* Header illustration */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/images/auth.png')}
          style={styles.headerImage}
          resizeMode="cover"
          accessibilityLabel="Sign up illustration"
        />
      </View>

      <SafeAreaView style={styles.safeAreaBottom}>
        <KeyboardAvoidingView
          style={styles.keyboardContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            bounces={false}
          >
            <View style={styles.formContainer}>
              {/* Title */}
              <View style={styles.formHeader}>
                <Text style={styles.title}>Create Account</Text>
                <View style={styles.titleUnderline} />
              </View>

              {/* Error */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text
                    style={styles.errorText}
                    accessibilityRole="alert"
                  >
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Name</Text>
                <View style={styles.inputWrapper}>
                  <User size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="Enter your name"
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                    onSubmitEditing={() => emailRef.current?.focus()}
                    accessibilityLabel="Name input"
                    accessibilityHint="Enter your full name"
                    autoComplete="name"
                    textContentType="name"
                  />
                </View>
              </View>

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    ref={emailRef}
                    style={styles.input}
                    placeholder="demo@email.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                    onSubmitEditing={() => passwordRef.current?.focus()}
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    ref={passwordRef}
                    style={styles.input}
                    placeholder="Create password"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="next"
                    onSubmitEditing={() => confirmPasswordRef.current?.focus()}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity
                    onPress={() => setShowPassword(!showPassword)}
                    style={styles.eyeIcon}
                    accessibilityLabel={
                      showPassword ? 'Hide password' : 'Show password'
                    }
                    accessibilityRole="button"
                  >
                    {showPassword ? (
                      <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                      <Eye size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Confirm Password */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.inputWrapper}>
                  <Lock size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    ref={confirmPasswordRef}
                    style={styles.input}
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!showConfirmPassword}
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    onSubmitEditing={handleSignUp}
                    autoComplete="new-password"
                    textContentType="newPassword"
                  />
                  <TouchableOpacity
                    onPress={() =>
                      setShowConfirmPassword(!showConfirmPassword)
                    }
                    style={styles.eyeIcon}
                    accessibilityLabel={
                      showConfirmPassword ? 'Hide password' : 'Show password'
                    }
                    accessibilityRole="button"
                  >
                    {showConfirmPassword ? (
                      <EyeOff size={20} color="#9CA3AF" />
                    ) : (
                      <Eye size={20} color="#9CA3AF" />
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              {/* Create Account Button */}
              <TouchableOpacity
                style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                onPress={handleSignUp}
                disabled={loading}
                accessibilityLabel={loading ? 'Creating account' : 'Create account'}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading }}
              >
                <Text style={styles.signInButtonText}>
                  {loading ? 'Creating account...' : 'Create Account'}
                </Text>
              </TouchableOpacity>

              {/* Sign in link */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Already have an account? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/auth/sign-in')}
                  accessibilityRole="button"
                >
                  <Text style={styles.signUpLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

// Design tokens (matching Sign-In screen)
const PRIMARY_COLOR = '#8B7355';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  imageContainer: {
    width: '100%',
    height: 250,
    backgroundColor: '#FFFFFF',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  safeAreaBottom: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  keyboardContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 50,
  },
  formHeader: {
    marginBottom: 40,
    alignItems: 'flex-start',
  },
  title: {
    fontSize: 32,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  titleUnderline: {
    width: 60,
    height: 3,
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 2,
  },
  errorContainer: {
    marginBottom: 20,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  errorText: {
    color: '#D73527',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  inputContainer: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 12,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: PRIMARY_COLOR,
    paddingBottom: 8,
    minHeight: 44,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 44,
  },
  eyeIcon: {
    padding: 8,
    minWidth: 44,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  signInButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 16,
    marginTop: 10,
    marginBottom: 24,
    minHeight: 56,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
  },
  signInButtonDisabled: {
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  signInButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  signUpContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
  },
  signUpText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  signUpLink: {
    color: '#FF6B6B',
    fontWeight: '500',
    fontSize: 16,
  },
}); 