// forgot-password.js
// Authentication screen for password reset

/* ------------------------------------------------------
WHAT IT DOES
- Handles password reset via email
- Provides navigation back to sign in
- Displays form validation and success messages

DEV PRINCIPLES
- Consistent design with Sign-In screen
- Uses React Native best practices
- Implements proper form validation
- Provides clear user feedback
- Uses accessibility guidelines
------------------------------------------------------*/

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
} from 'react-native';
import { KeyboardAwareScrollView } from 'react-native-keyboard-aware-scroll-view';
import { useRouter } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { forgotPassword } from '../../src/services/newApiService';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleResetPassword = async () => {
    if (!email) {
      setError('Please enter your email');
      return;
    }

    setError('');
    setSuccess('');
    setLoading(true);

    try {
      const result = await forgotPassword(email.toLowerCase().trim());
      
      if (result.success) {
        // Navigate to OTP verification screen for forgot password flow
        router.push({
          pathname: '/auth/verify-otp',
          params: { 
            email: email.toLowerCase().trim(),
            isSignup: 'false'
          }
        });
      }
    } catch (err) {
      setError(err.message || 'Failed to send reset email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#FFFFFF"
        translucent={false}
      />

      <KeyboardAwareScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        bounces={false}
        enableOnAndroid={true}
        extraScrollHeight={20}
        enableResetScrollToCoords={false}
      >
        {/* Header illustration */}
        <View style={styles.imageContainer}>
          <Image
            source={require('../../assets/images/auth.png')}
            style={styles.headerImage}
            resizeMode="cover"
            accessibilityLabel="Forgot password illustration"
          />
        </View>
            <View style={styles.formContainer}>
              {/* Title */}
              <View style={styles.formHeader}>
                <Text style={styles.title}>Reset Password</Text>
                <View style={styles.titleUnderline} />
              </View>

              <Text style={styles.subtitle}>
                Enter your email address and we'll send you instructions to reset
                your password.
              </Text>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {success ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText} accessibilityRole="status">
                    {success}
                  </Text>
                </View>
              ) : null}

              {/* Email */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Email</Text>
                <View style={styles.inputWrapper}>
                  <Mail size={20} color="#9CA3AF" style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    placeholder="demo@email.com"
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    placeholderTextColor="#9CA3AF"
                    returnKeyType="done"
                    onSubmitEditing={handleResetPassword}
                    accessibilityLabel="Email input"
                    accessibilityHint="Enter your email address"
                    autoComplete="email"
                    textContentType="emailAddress"
                  />
                </View>
              </View>

              {/* Send Reset Code */}
              <TouchableOpacity
                style={[styles.signInButton, loading && styles.signInButtonDisabled]}
                onPress={handleResetPassword}
                disabled={loading}
                accessibilityLabel={loading ? 'Sending reset code' : 'Send reset code'}
                accessibilityRole="button"
                accessibilityState={{ disabled: loading }}
              >
                <Text style={styles.signInButtonText}>
                  {loading ? 'Sending...' : 'Send Reset Code'}
                </Text>
              </TouchableOpacity>

              {/* Back to sign in */}
              <View style={styles.signUpContainer}>
                <Text style={styles.signUpText}>Remember your password? </Text>
                <TouchableOpacity
                  onPress={() => router.push('/auth/sign-in')}
                  accessibilityRole="button"
                >
                  <Text style={styles.signUpLink}>Sign in</Text>
                </TouchableOpacity>
              </View>
        </View>
      </KeyboardAwareScrollView>
    </SafeAreaView>
  );
}

// Design tokens (matching Sign-In screen)
const PRIMARY_COLOR = '#8B7355';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
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
  formContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 50,
  },
  formHeader: {
    marginBottom: 24,
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
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 32,
    lineHeight: 22,
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
  successContainer: {
    marginBottom: 20,
    backgroundColor: '#E6F9ED',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#34C759',
  },
  successText: {
    color: '#28A745',
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
  signInButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 16,
    marginTop: 16,
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