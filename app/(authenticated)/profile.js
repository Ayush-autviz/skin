// profile.js
// User profile screen with basic information display

/* ------------------------------------------------------
WHAT IT DOES
- Displays user profile information with modern, clean design
- Allows editing of profile information via edit button
- Shows user stats and join date
- Supports scrollable content

DATA USED
- User profile from UserContext
- Firestore profile data: firstName, lastName, birthDate, createdAt

DEV PRINCIPLES
- Clean, modern UI with proper spacing
- Consistent typography and colors
- Proper input handling
------------------------------------------------------*/

import { useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform } from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useRouter } from 'expo-router';
import Header from '../../src/components/ui/Header';
import Avatar from '../../src/components/ui/Avatar';
import ConcernsCluster from '../../src/components/routine/ConcernsCluster';
import { PrimaryButton, SecondaryButton } from '../../src/components/ui/buttons/ModalButtons';
import { useUser } from '../../src/contexts/UserContext';
import { colors, spacing, fontSize, typography, forms, shadows, borderRadius } from '../../src/styles';
import { Ionicons } from '@expo/vector-icons';

export default function Profile() {
  const userContextData = useUser();
  const { user, profile, loading, updateProfile, createdAt } = userContextData;
  const router = useRouter();
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [error, setError] = useState('');
  
  const [editForm, setEditForm] = useState({
    firstName: profile?.firstName || '',
    lastName: profile?.lastName || '',
    birthDate: profile?.birthDate ? new Date(profile.birthDate.seconds * 1000) : null
  });

  const calculateAge = (birthDate) => {
    if (!birthDate?.seconds) return null;
    const birth = new Date(birthDate.seconds * 1000);
    const today = new Date();
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const formatJoinDate = (date) => {
    if (!date?.seconds) return 'Recently';
    
    const joinDate = new Date(date.seconds * 1000);
    const now = new Date();
    const diffInMs = now - joinDate;
    const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24));
    const diffInWeeks = Math.floor(diffInDays / 7);
    const diffInMonths = Math.floor(diffInDays / 30);
    const diffInYears = Math.floor(diffInDays / 365);
    
    if (diffInDays < 1) return 'Today';
    if (diffInDays === 1) return '1 day ago';
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInWeeks === 1) return '1 week ago';
    if (diffInWeeks < 4) return `${diffInWeeks} weeks ago`;
    if (diffInMonths === 1) return '1 month ago';
    if (diffInMonths < 12) return `${diffInMonths} months ago`;
    if (diffInYears === 1) return '1 year ago';
    return `${diffInYears} years ago`;
  };

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  const age = calculateAge(profile?.birthDate);
  const joinDate = formatJoinDate(createdAt);
  const fullName = profile?.firstName && profile?.lastName 
    ? `${profile.firstName} ${profile.lastName}`.trim()
    : 'User';

  const handleSave = async () => {
    try {
      await updateProfile({
        firstName: editForm.firstName.trim(),
        lastName: editForm.lastName.trim(),
        birthDate: editForm.birthDate
      });
      setIsEditing(false);
      setError('');
    } catch (err) {
      setError('Failed to update profile');
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setEditForm(prev => ({ ...prev, birthDate: selectedDate }));
    }
  };

  return (
    <View style={styles.container}>
      <Header 
        title="Profile"
        showBack={true}
        rightComponent={
          !isEditing && (
            <TouchableOpacity 
              onPress={() => setIsEditing(true)}
              style={styles.editButton}
            >
              <Text style={styles.editButtonText}>Edit</Text>
            </TouchableOpacity>
          )
        }
      />
      
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 88 : 0}
      >
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {isEditing ? (
            <View style={styles.editSection}>
              <View style={styles.formContainer}>
                <View style={styles.inputContainer}>
                  <Text style={styles.label}>First Name</Text>
                  <TextInput
                    style={[forms.input.base]}
                    value={editForm.firstName}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, firstName: text }))}
                    placeholder="First Name"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Last Name</Text>
                  <TextInput
                    style={[forms.input.base]}
                    value={editForm.lastName}
                    onChangeText={(text) => setEditForm(prev => ({ ...prev, lastName: text }))}
                    placeholder="Last Name"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputContainer}>
                  <Text style={styles.label}>Birth Date</Text>
                  <DateTimePicker
                    value={editForm.birthDate || new Date()}
                    mode="date"
                    display="default"
                    onChange={handleDateChange}
                    maximumDate={new Date()}
                    style={styles.datePicker}
                  />
                </View>

                {error && <Text style={styles.error}>{error}</Text>}

                <View style={styles.buttonContainer}>
                  <SecondaryButton
                    title="Cancel"
                    onPress={() => {
                      setIsEditing(false);
                      setEditForm({
                        firstName: profile?.firstName || '',
                        lastName: profile?.lastName || '',
                        birthDate: profile?.birthDate ? new Date(profile.birthDate.seconds * 1000) : null
                      });
                      setError('');
                    }}
                    style={styles.cancelButtonStyle}
                  />
                  <PrimaryButton
                    title="Save"
                    onPress={handleSave}
                    style={styles.saveButtonStyle}
                  />
                </View>
              </View>
            </View>
          ) : (
            <>
              <View style={styles.profileHeader}>
                <View style={styles.avatarContainer}>
                  <Avatar 
                    name={fullName}
                    imageUrl={profile?.photoURL}
                    size="xl"
                  />
                </View>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{fullName}</Text>
                  <Text style={styles.userEmail}>{user?.email}</Text>
                </View>
              </View>

              <View style={styles.infoSection}>
                <View style={styles.bioSection}>
                  {age && (
                    <View style={styles.infoItem}>
                      <Ionicons name="calendar-outline" size={24} color={colors.primary} style={styles.infoIcon} />
                      <Text style={styles.infoText}>{age}</Text>
                      <Text style={styles.infoLabel}>years old</Text>
                    </View>
                  )}
                  <View style={styles.infoItem}>
                    <Ionicons name="time-outline" size={24} color={colors.primary} style={styles.infoIcon} />
                    <Text style={styles.infoText}>Joined</Text>
                    <Text style={styles.infoLabel}>{joinDate}</Text>
                  </View>
                </View>
              </View>

              {/* TEMPORARILY COMMENTED OUT - Concerns cluster confusing users
              <View style={styles.concernsSection}>
                <Text style={styles.sectionTitle}>What would you like to improve?</Text>
                <Text style={styles.sectionSubtitle}>Help us personalize your skincare recommendations</Text>
                <ConcernsCluster />
              </View>
              */}
            </>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
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
    marginTop: 100,
    padding: spacing.lg
  },
  profileHeader: {
    alignItems: 'center',
    padding: spacing.xxl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  avatarContainer: {
    marginBottom: spacing.md,
  },
  userInfo: {
    alignItems: 'center',
  },
  userName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  userEmail: {
    ...typography.caption,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  editSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  formContainer: {
    padding: spacing.xl,
  },
  inputContainer: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.xs,
  },
  dateChip: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderWidth: 1,
    borderRadius: borderRadius.pill,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignSelf: 'flex-start',
    marginTop: spacing.xs,
  },
  dateChipText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontWeight: '500',
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: spacing.md,
    marginTop: spacing.xl,
  },
  cancelButtonStyle: {
    flex: 1,
  },
  saveButtonStyle: {
    flex: 1,
  },
  saveButton: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  error: {
    fontSize: fontSize.sm,
    color: colors.error,
    marginTop: spacing.small,
  },
  infoSection: {
    padding: spacing.xl,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    marginBottom: spacing.lg,
    ...shadows.sm,
  },
  concernsSection: {
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    alignItems: 'center',
    padding: spacing.xl,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
    textAlign: 'center',
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.md,
  },
  bioSection: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  infoItem: {
    alignItems: 'center',
    flex: 1,
  },
  infoIcon: {
    marginBottom: spacing.xs,
  },
  infoText: {
    fontSize: fontSize.md,
    fontWeight: '500',
    color: colors.textPrimary,
    textAlign: 'center',
  },
  infoLabel: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  editButton: {
    color: colors.primary,
    fontSize: fontSize.md,
    fontWeight: '500',
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyboardView: {
    flex: 1,
  },
  editButton: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    minWidth: 40,
    alignItems: 'center',
  },
  editButtonText: {
    color: colors.primary,
    fontSize: fontSize.sm,
    fontWeight: '600',
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
}); 