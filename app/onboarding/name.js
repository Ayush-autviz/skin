// onboarding/name.js
// First onboarding screen - collect name and birth date

import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  ScrollView,
  Platform,
  StatusBar,
  Image,
  SafeAreaView,
} from 'react-native';
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
  const [showDatePicker, setShowDatePicker] = useState(false);

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) setBirthDate(selectedDate);
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
    <View style={styles.container}>      
      <StatusBar barStyle="dark-content" backgroundColor="#FFFFFF" translucent={false} />

      {/* Illustration header */}
      <View style={styles.imageContainer}>
        <Image
          source={require('../../assets/images/auth.png')}
          style={styles.headerImage}
          resizeMode="cover"
          accessibilityLabel="Onboarding illustration"
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
                <Text style={styles.title}>Tell Us About You</Text>
                <View style={styles.titleUnderline} />
              </View>

              {error ? (
                <View style={styles.errorContainer}>
                  <Text style={styles.errorText} accessibilityRole="alert">
                    {error}
                  </Text>
                </View>
              ) : null}

              {/* First Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>First Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your first name"
                  value={firstName}
                  onChangeText={setFirstName}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>

              {/* Last Name */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Last Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter your last name"
                  value={lastName}
                  onChangeText={setLastName}
                  placeholderTextColor="#9CA3AF"
                  autoCapitalize="words"
                />
              </View>

              {/* Birth Date */}
              <View style={styles.inputContainer}>
                <Text style={styles.label}>Birth Date</Text>
                <TouchableOpacity
                  style={styles.dateInputWrapper}
                  onPress={() => setShowDatePicker(true)}
                >
                  <Text style={[styles.dateText, !birthDate && { color: '#9CA3AF' }]}> 
                    {birthDate ? birthDate.toDateString() : 'Select your birth date'}
                  </Text>
                </TouchableOpacity>
              </View>

              {showDatePicker && (
                <DateTimePicker
                  value={birthDate || new Date()}
                  mode="date"
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}

              {/* Continue button */}
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleNext}
              >
                <Text style={styles.primaryButtonText}>Continue</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#FFFFFF' },
  imageContainer: { width: '100%', height: 250 },
  headerImage: { width: '100%', height: '100%' },
  safeAreaBottom: { flex: 1, backgroundColor: '#FFFFFF' },
  keyboardContainer: { flex: 1, backgroundColor: '#FFFFFF' },
  scrollView: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  formContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 50,
  },
  formHeader: { marginBottom: 40, alignItems: 'flex-start' },
  title: { fontSize: 32, fontWeight: '600', color: '#1F2937', marginBottom: 8 },
  titleUnderline: { width: 60, height: 3, backgroundColor: '#8B7355', borderRadius: 2 },
  errorContainer: {
    marginBottom: 20,
    backgroundColor: '#FFE5E5',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FF6B6B',
  },
  errorText: { color: '#D73527', fontSize: 14, textAlign: 'center', fontWeight: '500' },
  inputContainer: { marginBottom: 24 },
  label: { fontSize: 16, fontWeight: '500', color: '#6B7280', marginBottom: 12 },
  input: {
    borderBottomWidth: 1,
    borderBottomColor: '#8B7355',
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 44,
  },
  dateInputWrapper: {
    borderBottomWidth: 1,
    borderBottomColor: '#8B7355',
    paddingVertical: 12,
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  primaryButton: {
    backgroundColor: '#8B7355',
    borderRadius: 25,
    paddingVertical: 16,
    marginTop: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  primaryButtonText: { color: '#FFFFFF', fontSize: 18, fontWeight: '600' },
  buttonContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
}); 