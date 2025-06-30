import { useState } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  StyleSheet, 
  TouchableOpacity,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { useUser } from '../../src/hooks/useUser';
import { colors, spacing, typography, forms, shadows, borderRadius } from '../../src/styles';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase';
import ConcernsCluster from '../../src/components/routine/ConcernsCluster';

export default function WelcomeScreen() {
  const { updateState } = useUser();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    try {
      setLoading(true);
      await updateState('active');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true
      });
      router.push('/');
    } catch (err) {
      console.log('Error completing onboarding:', err);
      setError('Failed to complete setup. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={styles.keyboardView}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.container}>
          <View style={styles.headerContainer}>
            <Text style={styles.title}>What would you like to improve?</Text>
            <Text style={styles.subtitle}>
              Help us personalize your skincare recommendations
            </Text>
          </View>

          {error ? <Text style={styles.error}>{error}</Text> : null}

          <View style={styles.concernsSection}>
            <ConcernsCluster />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={forms.button.primary.container}
              onPress={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={forms.button.primary.text}>Continue</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  keyboardView: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingTop: 120,
    flexGrow: 1,
    paddingBottom: spacing.xxl,
  },
  container: {
    flex: 1,
    padding: spacing.lg,
    justifyContent: 'flex-start',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    paddingHorizontal: spacing.md,
  },
  concernsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    padding: spacing.xl,
    marginBottom: spacing.xl,
    ...shadows.sm,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  error: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
    ...typography.caption,
  }
}); 