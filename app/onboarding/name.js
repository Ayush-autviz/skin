// onboarding/name.js
// First onboarding screen - collect name and birth date

import { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { router } from 'expo-router';
import { useUser } from '../../src/contexts/UserContext';
import { colors, spacing, typography, forms, borderRadius } from '../../src/styles';
import { doc, updateDoc } from 'firebase/firestore';
import { auth, db } from '../../src/config/firebase';

export default function NameScreen() {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [birthDate, setBirthDate] = useState(null);
  const [error, setError] = useState('');
  const { updateProfile, updateState } = useUser();

  const handleDateChange = (event, selectedDate) => {
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleNext = async () => {
    console.log('1. Starting save...');

    if (!firstName.trim() || !lastName.trim() || !birthDate) {
      console.log('2. Validation failed');
      setError('Please fill in all fields');
      return;
    }

    try {
      console.log('3. Attempting profile update...');
      await updateProfile({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        birthDate: birthDate,
      });
      
      console.log('4. Update successful');
      
      // Complete onboarding and go directly to home (skip welcome screen)
      await updateState('active');
      const userRef = doc(db, 'users', auth.currentUser.uid);
      await updateDoc(userRef, {
        onboardingCompleted: true
      });
      router.push('/');
    } catch (err) {
      console.log('5. Error:', err.message);
      setError('Failed to save profile. Please try again.');
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
            <Text style={styles.heading}>Welcome!</Text>
          </View>

          {error && <Text style={styles.error}>{error}</Text>}

          <View style={styles.inputContainer}>
            <Text style={styles.label}>First Name</Text>
            <TextInput
              style={[
                styles.input,
                error && forms.input.error
              ]}
              placeholder="Enter your first name"
              value={firstName}
              onChangeText={setFirstName}
              placeholderTextColor={forms.input.placeholder.color}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Last Name</Text>
            <TextInput
              style={[
                styles.input,
                error && forms.input.error
              ]}
              placeholder="Enter your last name"
              value={lastName}
              onChangeText={setLastName}
              placeholderTextColor={forms.input.placeholder.color}
              autoCapitalize="words"
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Birth Date</Text>
            <DateTimePicker
              value={birthDate || new Date()}
              mode="date"
              display="default"
              onChange={handleDateChange}
              maximumDate={new Date()}
              style={styles.datePicker}
            />
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity 
              style={forms.button.primary.container}
              onPress={handleNext}
            >
              <Text style={forms.button.primary.text}>Continue</Text>
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
    paddingBottom: spacing.xxl, // Extra padding for keyboard
  },
  container: {
    flex: 1,
    padding: spacing.xl,
    justifyContent: 'flex-start', // Changed from 'center'
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: spacing.xxl,
  },
  title: {
    ...typography.h1,
    color: colors.textPrimary,
    marginBottom: spacing.xl,
    textAlign: 'center',
  },
  heading: {
    ...typography.h2,
    color: colors.textPrimary,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  subtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  error: {
    color: colors.error,
    marginBottom: spacing.lg,
    textAlign: 'center',
    ...typography.caption,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
    marginLeft: spacing.xs,
  },
  input: {
    ...forms.input.base,
  },
  datePicker: {
    margin: 0,
    paddingTop: 0,
    paddingBottom: 0,
    paddingLeft: 0,
    paddingRight: 0,
    marginLeft: -12,
    marginTop: 10,
  },
  buttonContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
}); 