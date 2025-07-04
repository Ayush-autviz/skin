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
import useAuthStore from '../../src/stores/authStore';
import { colors, spacing, typography, forms, shadows, borderRadius } from '../../src/styles';
import ConcernsCluster from '../../src/components/routine/ConcernsCluster';

export default function WelcomeScreen() {
  const { user } = useAuthStore();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleContinue = async () => {
    try {
      setLoading(true);
      // Navigate to main app - profile was already created in name.js
      router.replace('/(authenticated)/(tabs)');
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