// verify-otp.js
// OTP verification screen for signup and forgot password flows

/* ------------------------------------------------------
WHAT IT DOES
- Handles OTP verification for both signup and forgot password
- Provides visual feedback with auto-focusing OTP inputs
- Includes resend OTP functionality with cooldown
- Shows appropriate messaging based on flow type
- Navigates to correct destination after verification

DEV PRINCIPLES
- Consistent design with other auth screens  
- Uses React Native best practices
- Implements proper form validation
- Provides clear user feedback
- Uses accessibility guidelines
------------------------------------------------------*/

import { useState, useEffect, useRef } from 'react';
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
import { useRouter, useLocalSearchParams } from 'expo-router';
import { Mail } from 'lucide-react-native';
import { verifyOtp, resendOtp, resendOtpForgotPassword } from '../../src/services/newApiService';

export default function VerifyOtp() {
  const [otp, setOtp] = useState(['', '', '', '']);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const [successMessage, setSuccessMessage] = useState('');

  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract parameters: email, isSignup (true for signup, false for forgot password)
  const email = params.email;
  const isSignup = params.isSignup === 'true';
  
  const inputRefs = [useRef(null), useRef(null), useRef(null), useRef(null)];

  useEffect(() => {
    // Auto-focus first input when screen loads
    inputRefs[0].current?.focus();
  }, []);

  useEffect(() => {
    // Countdown timer for resend cooldown
    let timer;
    if (resendCooldown > 0) {
      timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleOtpChange = (text, index) => {
    // Only allow numeric input
    const numericText = text.replace(/[^0-9]/g, '');
    
    const newOtp = [...otp];
    newOtp[index] = numericText;
    setOtp(newOtp);
    setError('');
    setSuccessMessage('');

    // Auto-focus next input if current field has a value
    if (numericText && index < 3) {
      inputRefs[index + 1].current?.focus();
    }
  };

  const handleKeyPress = (e, index) => {
    // Handle backspace to go to previous input
    if (e.nativeEvent.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs[index - 1].current?.focus();
    }
  };

  const handleVerifyOtp = async () => {
    const otpCode = otp.join('');
    
    if (otpCode.length !== 4) {
      setError('Please enter the complete 4-digit OTP');
      return;
    }
    
    setError('');
    setIsLoading(true);
    
    try {
      const result = await verifyOtp({
        signup: isSignup,
        email: email,
        otp: otpCode
      });
      
      if (result.success) {
        setSuccessMessage(result.message);
        
        if (isSignup) {
          // For signup, redirect to sign in after verification
          setTimeout(() => {
            router.replace('/auth/sign-in');
          }, 1500);
        } else {
          // For forgot password, redirect to new password screen with reset token
          setTimeout(() => {
            router.replace({
              pathname: '/auth/new-password',
              params: { 
                email: email,
                resetToken: result.reset_token 
              }
            });
          }, 1500);
        }
      }
    } catch (err) {
      setError(err.message || 'OTP verification failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendCooldown > 0) return;
    
    setError('');
    setResendCooldown(60); // 60 second cooldown
    
    try {
      let result;
      if (isSignup) {
        result = await resendOtp(email);
      } else {
        result = await resendOtpForgotPassword(email);
      }
      
      if (result.success) {
        setSuccessMessage('OTP has been resent to your email');
        // Clear the success message after 3 seconds
        setTimeout(() => setSuccessMessage(''), 3000);
      }
    } catch (err) {
      setError(err.message || 'Failed to resend OTP. Please try again.');
      setResendCooldown(0); // Reset cooldown on error
    }
  };

  const getTitle = () => {
    return isSignup ? 'Verify Your Email' : 'Verify OTP';
  };

  const getSubtitle = () => {
    return isSignup 
      ? `We've sent a verification code to ${email}.`
      : `We've sent a password reset code to ${email}.`;
  };

  return (
    <View style={styles.container}>
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
            accessibilityLabel="OTP verification illustration"
          />

          {/* Back button overlay */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            accessibilityLabel="Go back"
          >
            <Text style={styles.backButtonText}>←</Text>
          </TouchableOpacity>
        </View>
            <View style={styles.formContainer}>
              {/* Title */}
              <View style={styles.formHeader}>
                <Text style={styles.title}>{getTitle()}</Text>
                <View style={styles.titleUnderline} />
              </View>

              {/* Subtitle */}
              <Text style={styles.subtitle}>{getSubtitle()}</Text>

              {/* Success message */}
              {successMessage ? (
                <View style={styles.successContainer}>
                  <Text style={styles.successText} accessibilityRole="status">
                    {successMessage}
                  </Text>
                </View>
              ) : null}

              {/* Error message */}
              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* OTP Input */}
              <View style={styles.otpContainer}>
                <Text style={styles.label}>Enter Verification Code</Text>
                <View style={styles.otpInputContainer}>
                  {otp.map((digit, index) => (
                    <TextInput
                      key={index}
                      ref={inputRefs[index]}
                      style={[
                        styles.otpInput,
                        digit && styles.otpInputFilled,
                        error && styles.otpInputError
                      ]}
                      value={digit}
                      onChangeText={(text) => handleOtpChange(text, index)}
                      onKeyPress={(e) => handleKeyPress(e, index)}
                      keyboardType="numeric"
                      maxLength={1}
                      textAlign="center"
                      selectTextOnFocus
                      accessibilityLabel={`OTP digit ${index + 1}`}
                      accessibilityHint={`Enter digit ${index + 1} of the verification code`}
                    />
                  ))}
                </View>
              </View>

              {/* Verify button */}
              <TouchableOpacity
                style={[styles.verifyButton, isLoading && styles.verifyButtonDisabled]}
                onPress={handleVerifyOtp}
                disabled={isLoading}
                accessibilityLabel={isLoading ? 'Verifying OTP' : 'Verify OTP'}
              >
                <Text style={styles.verifyButtonText}>
                  {isLoading ? 'Verifying...' : 'Verify'}
                </Text>
              </TouchableOpacity>

              {/* Resend OTP */}
              <View style={styles.resendContainer}>
                <Text style={styles.resendText}>Didn't receive the code? </Text>
                <TouchableOpacity
                  onPress={handleResendOtp}
                  disabled={resendCooldown > 0}
                  accessibilityRole="button"
                  accessibilityLabel={
                    resendCooldown > 0 
                      ? `Resend available in ${resendCooldown} seconds`
                      : 'Resend verification code'
                  }
                >
                  <Text style={[
                    styles.resendLink,
                    resendCooldown > 0 && styles.resendLinkDisabled
                  ]}>
                    {resendCooldown > 0 ? `Resend (${resendCooldown}s)` : 'Resend'}
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Email info */}
              {/* <View style={styles.emailInfo}>
                <Mail size={16} color="#9CA3AF" />
                <Text style={styles.emailText}>{email}</Text>
              </View> */}
        </View>
      </KeyboardAwareScrollView>
    </View>
  );
}

// Design tokens (consistent with other auth screens)
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
    position: 'relative',
    zIndex: 100,
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButtonText: {
    color: '#FFFFFF',
    fontSize: 20,
    fontWeight: 'bold',
  },
  scrollView: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  scrollContent: {
    flexGrow: 1,
  },
  formContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 40,
    paddingBottom: 50,
  },
  formHeader: {
    marginBottom: 16,
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
    lineHeight: 24,
    marginBottom: 32,
  },
  successContainer: {
    marginBottom: 20,
    backgroundColor: '#E5F8E5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#10B981',
  },
  successText: {
    color: '#059669',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
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
  otpContainer: {
    marginBottom: 32,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: '#6B7280',
    marginBottom: 16,
    textAlign: 'center',
  },
  otpInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 20,
  },
  otpInput: {
    width: 56,
    height: 56,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
    backgroundColor: '#FFFFFF',
  },
  otpInputFilled: {
    borderColor: PRIMARY_COLOR,
    backgroundColor: '#FDF9F7',
  },
  otpInputError: {
    borderColor: '#FF6B6B',
  },
  verifyButton: {
    backgroundColor: PRIMARY_COLOR,
    borderRadius: 25,
    paddingVertical: 16,
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
  verifyButtonDisabled: {
    opacity: 0.7,
    elevation: 0,
    shadowOpacity: 0,
  },
  verifyButtonText: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '600',
  },
  resendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 24,
  },
  resendText: {
    fontSize: 16,
    color: '#9CA3AF',
  },
  resendLink: {
    color: '#FF6B6B',
    fontWeight: '500',
    fontSize: 16,
  },
  resendLinkDisabled: {
    color: '#D1D5DB',
  },
  emailInfo: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  emailText: {
    fontSize: 14,
    color: '#6B7280',
    marginLeft: 8,
    fontWeight: '500',
  },
}); 