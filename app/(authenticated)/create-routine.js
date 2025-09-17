// create-routine.js
// Single scrollable screen for creating routine items

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  SafeAreaView,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import { BlurView } from 'expo-blur';
import { 
  FlaskConical, 
  Dumbbell, 
  Apple, 
  Sun, 
  Moon, 
  Calendar, 
  CalendarX,
  CheckCircle,
  CalendarDays,
  HelpCircle,
  ArrowLeft,
  Save
} from 'lucide-react-native';
import { colors, fontSize, spacing, typography, borderRadius, shadows } from '../../src/styles';
import { createRoutineItem } from '../../src/services/newApiService';

// Define concerns options
const concernsOptions = [
  'Breakouts',
  'Evenness',
  'Redness', 
  'Visible Pores',
  'Lines',
  'Eye Area Condition',
  'Pigmentation',
  'Dewiness',
  'Anti-Aging/Faces',
  'Anti-Aging/Eyes'
];

// Define stop reasons
const stopReasons = [
  'Not effective',
  'Doesn\'t feel right',
  'Allergy',
  'Too expensive',
  'Other'
];

export default function CreateRoutineScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Form state
  const [itemName, setItemName] = useState('');
  const [itemType, setItemType] = useState('Product');
  const [itemUsage, setItemUsage] = useState(['AM']);
  const [itemFrequency, setItemFrequency] = useState('Daily');
  const [itemConcerns, setItemConcerns] = useState([]);
  const [startDate, setStartDate] = useState(new Date()); // Default to today's date
  const [endDate, setEndDate] = useState(null);
  const [treatmentDate, setTreatmentDate] = useState(new Date()); // For treatment types
  const [isStopped, setIsStopped] = useState(false);
  const [stopReason, setStopReason] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Date picker states
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showEndDatePicker, setShowEndDatePicker] = useState(false);
  const [showTreatmentDatePicker, setShowTreatmentDatePicker] = useState(false);

  // Handle frequency parameter from navigation
  useEffect(() => {
    if (params.frequency) {
      setItemFrequency(params.frequency);
    }
  }, [params.frequency]);

  // Toggle logic for AM/PM usage - only allow one selection
  const handleUsageToggle = (tappedUsage) => {
    setItemUsage(currentUsage => {
      const isSelected = currentUsage.includes(tappedUsage);
      if (isSelected) {
        return []; // Deselect if already selected
      } else {
        return [tappedUsage]; // Select only the tapped option
      }
    });
  };

  // Toggle logic for concerns selection
  const handleConcernToggle = (concern) => {
    setItemConcerns(currentConcerns => {
      const isSelected = currentConcerns.includes(concern);
      if (isSelected) {
        return currentConcerns.filter(c => c !== concern);
      } else {
        return [...currentConcerns, concern];
      }
    });
  };

  // Date picker handlers
  const handleStartDateChange = (event, selectedDate) => {
  //  setShowStartDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setStartDate(selectedDate);
    }
  };

  const handleEndDateChange = (event, selectedDate) => {
   // setShowEndDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setEndDate(selectedDate);
    }
  };

  const handleTreatmentDateChange = (event, selectedDate) => {
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setTreatmentDate(selectedDate);
    }
  };

  // Check if current type is a treatment type
  const isTreatmentType = () => {
    return itemType && (
      itemType === 'Treatment / Facial' || 
      itemType === 'Treatment / Injection' || 
      itemType === 'Treatment / Other'
    );
  };

  // Format parameters for backend
  const formatParameter = (value) => {
    if (!value) return value;
    // Handle frequency
    if (value === 'Daily' || value === 'Weekly' || value === 'As needed') {
      return value === 'As needed' ? 'as_needed' : value.toLowerCase();
    }
    // Handle usage
    if (value === 'AM' || value === 'PM' || value === 'AM + PM' || value === 'As needed') {
      return value === 'AM + PM' ? 'both' : value === 'As needed' ? 'as_needed' : value.toLowerCase();
    }
    // Handle type
    if (value === 'Product' || value === 'Activity' || value === 'Nutrition') {
      return value.toLowerCase();
    }
    if (value === 'Treatment / Facial') return 'treatment_facial';
    if (value === 'Treatment / Injection') return 'treatment_injection';
    if (value === 'Treatment / Other') return 'treatment_other';
    return value;
  };

  // Save routine item
  const handleSave = async () => {
    // Validation with better UX
    if (!itemName.trim()) {
      Alert.alert('Missing Information', 'Please enter a name for your routine item.');
      return;
    }

    if (!itemType.trim()) {
      Alert.alert('Missing Information', 'Please select what type of item this is.');
      return;
    }

    if (itemConcerns.length === 0) {
      Alert.alert('Missing Information', 'Please select at least one concern to help track your progress.');
      return;
    }

    // For treatment types, validate treatment date
    if (isTreatmentType()) {
      if (!treatmentDate) {
        Alert.alert('Missing Information', 'Please select the treatment date.');
        return;
      }
    } else {
      // For non-treatment types, validate usage and frequency
      if (itemUsage.length === 0) {
        Alert.alert('Missing Information', 'Please select a time of day.');
        return;
      }
      
      if (!itemFrequency) {
        Alert.alert('Missing Information', 'Please select a usage frequency.');
        return;
      }
      
      // For non-treatment types, validate start date
      if (!startDate) {
        Alert.alert('Missing Information', 'Please select when you started using this item.');
        return;
      }

      // Validate dates if both are present
      if (startDate && endDate && endDate < startDate) {
        Alert.alert('Invalid Date', 'The end date cannot be before the start date.');
        return;
      }
    }

    // Prepare data for API
    const apiItemData = {
      name: itemName.trim(),
      type: formatParameter(itemType),
      concern: itemConcerns,
      extra: {
        dateCreated: new Date().toISOString()
      }
    };

    // Add usage and frequency only for non-treatment types
    if (!isTreatmentType()) {
      let finalUsage = 'AM';
      const includesAM = itemUsage.includes('AM');
      const includesPM = itemUsage.includes('PM');
      const includesAMPM = itemUsage.includes('AM & PM');
      
      if (includesAMPM) finalUsage = 'both';
      else if (includesAM && includesPM) finalUsage = 'both';
      else if (includesPM) finalUsage = 'pm';
      else if (includesAM) finalUsage = 'am';
      else if (itemUsage.includes('As needed')) finalUsage = 'as_needed';
      
      apiItemData.usage = finalUsage;
      apiItemData.frequency = formatParameter(itemFrequency);
    }

    // Add date fields based on type
    if (isTreatmentType()) {
      apiItemData.treatment_date = treatmentDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      apiItemData.extra.treatmentDate = treatmentDate?.toISOString();
    } else {
      apiItemData.start_date = startDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
      apiItemData.end_date = endDate ? endDate.toISOString().split('T')[0] : '';
      apiItemData.extra.dateStarted = startDate?.toISOString();
      apiItemData.extra.dateStopped = endDate?.toISOString();
      apiItemData.extra.stopReason = stopReason;
    }

    console.log('🟡 CreateRoutine: API Item Data:', apiItemData);

    setIsSaving(true);
    try {
      const response = await createRoutineItem(apiItemData);
      console.log('🟡 CreateRoutine: Create response:', response);
      
      if (response.success) {
        Alert.alert('Success!', 'Your routine item has been added successfully.', [
          {
            text: 'Continue',
            onPress: () => router.back()
          }
        ]);
      }
    } catch (err) {
      console.error('🔴 CreateRoutine: Error saving item:', err);
      Alert.alert('Error', err.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Header with BlurView */}
      <View style={styles.headerContainer}>
        <BlurView 
          intensity={80} 
          tint="light"
          style={styles.blurContainer}
        >
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
            >
              <View style={styles.iconContainer}>
                <ArrowLeft size={22} color={colors.primary} />
              </View>
            </TouchableOpacity>
            
            <View style={styles.titleContainer}>
              <Text style={styles.headerTitle}>Add to your routine</Text>
              <View style={styles.titleUnderline} />
            </View>
            
            <View style={styles.rightContainer} />
          </View>
        </BlurView>
        <View style={styles.shadowContainer} />
      </View>

      <KeyboardAvoidingView 
        style={styles.keyboardContainer}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
        {/* Category Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle2}>Indicate if Product or Service</Text>
          {/* <Text style={styles.sectionSubtitle}>Choose the type of item you want to add to your routine</Text> */}
          <View style={styles.chipSelectorContainer}>
            {[
              { name: 'Product', icon: FlaskConical, color: '#8B7355' },
            //   { name: 'Activity', icon: Dumbbell, color: '#009688' },
            //   { name: 'Nutrition', icon: Apple, color: '#FF6B35' },
              { name: 'Treatment / Facial', icon: FlaskConical, color: '#8B7355' },
              { name: 'Treatment / Injection', icon: FlaskConical, color: '#8B7355' },
              { name: 'Treatment / Other', icon: FlaskConical, color: '#8B7355' }
            ].map(({ name, icon: Icon, color }) => {
              const isActive = itemType === name;
              
              return (
                <TouchableOpacity
                  key={name}
                  style={[
                    styles.chipButton,
                    isActive && styles.chipButtonActive
                  ]}
                  onPress={() => setItemType(name)}
                >
                  <Icon 
                    size={20} 
                    color={isActive ? '#FFFFFF' : '#6B7280'} 
                  />
                  <Text style={[
                    styles.chipButtonText,
                    isActive && styles.chipButtonTextActive
                  ]}>
                    {name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Name Input */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle2}>Name</Text>
          {/* <Text style={styles.sectionSubtitle}>
            Give your {itemType.toLowerCase()} a name so you can easily identify it
          </Text> */}
          <View style={styles.inputWrapper}>
            <FlaskConical 
              size={20} 
              color="#6B7280" 
              style={styles.inputIcon} 
            />
            <TextInput
              style={styles.textInput}
              placeholder={`Enter ${itemType.toLowerCase()} name`}
              value={itemName}
              onChangeText={setItemName}
              placeholderTextColor="#9CA3AF"
              returnKeyType="next"
            />
          </View>
        </View>

        {/* Concerns Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Concerns</Text>
          <Text style={styles.sectionSubtitle}>Select all that apply</Text>
          <View style={styles.chipSelectorContainer}>
            {concernsOptions.map((concern) => {
              const isActive = itemConcerns.includes(concern);
              
              return (
                <TouchableOpacity
                  key={concern}
                  style={[
                    styles.chipButton,
                    isActive && styles.chipButtonActive
                  ]}
                  onPress={() => handleConcernToggle(concern)}
                >
                  <Text style={[
                    styles.chipButtonText,
                    isActive && styles.chipButtonTextActive
                  ]}>
                    {concern}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* Frequency Selection - Only show for non-treatment types */}
        {!isTreatmentType() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Usage Frequency</Text>
            <Text style={styles.sectionSubtitle}>Select One</Text>
            <View style={styles.chipSelectorContainer}>
              {[
                { name: 'Daily', icon: CheckCircle, color: '#10B981' },
                { name: 'Weekly', icon: CalendarDays, color: '#3B82F6' },
                { name: 'As needed', icon: HelpCircle, color: '#8B5CF6' }
              ].map(({ name, icon: Icon, color }) => {
                const isActive = itemFrequency === name;
                
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.chipButton,
                      isActive && styles.chipButtonActive
                    ]}
                    onPress={() => setItemFrequency(name)}
                  >
                    <Icon 
                      size={20} 
                      color={isActive ? '#FFFFFF' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.chipButtonText,
                      isActive && styles.chipButtonTextActive
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Time of Day Selection - Only show for non-treatment types */}
        {!isTreatmentType() && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Time of Day</Text>
            <Text style={styles.sectionSubtitle}>Select One</Text>
            <View style={styles.chipSelectorContainer}>
              {[
                { name: 'AM', icon: Sun, color: '#F59E0B' },
                { name: 'PM', icon: Moon, color: '#6366F1' },
                { name: 'AM & PM', icon: HelpCircle, color: '#8B5CF6' },
                { name: 'As needed', icon: HelpCircle, color: '#8B5CF6' }
              ].map(({ name, icon: Icon, color }) => {
                const isActive = itemUsage.includes(name);
                
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.chipButton,
                      isActive && styles.chipButtonActive
                    ]}
                    onPress={() => handleUsageToggle(name)}
                  >
                    <Icon 
                      size={20} 
                      color={isActive ? '#FFFFFF' : '#6B7280'} 
                    />
                    <Text style={[
                      styles.chipButtonText,
                      isActive && styles.chipButtonTextActive
                    ]}>
                      {name}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Date Selection - Different for treatment vs non-treatment types */}
        {isTreatmentType() ? (
          /* Treatment Date */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Treatment Date</Text>
            <Text style={styles.sectionSubtitle}>When did you receive this treatment?</Text>
            
            <TouchableOpacity onPress={() => setShowTreatmentDatePicker(!showTreatmentDatePicker)} style={styles.inputWrapper}>
              <Calendar 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowTreatmentDatePicker(!showTreatmentDatePicker)}
              >
                <Text style={[styles.dateText, !treatmentDate && styles.dateTextPlaceholder]}>
                  {treatmentDate ? treatmentDate.toDateString() : 'Select treatment date'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showTreatmentDatePicker && (
              <DateTimePicker
                value={treatmentDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleTreatmentDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(new Date().getFullYear() - 10, 0, 1)}
                textColor={Platform.OS === 'ios' ? colors.textPrimary : colors.white}
                style={Platform.OS === 'ios' ? { backgroundColor: colors.white } : undefined}
                themeVariant="light"
              />
            )}
          </View>
        ) : (
          /* Start Date for non-treatment types */
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Start Date</Text>
            <Text style={styles.sectionSubtitle}>Required for Efficacy Validation</Text>
            
            <TouchableOpacity onPress={() => setShowStartDatePicker(!showStartDatePicker)} style={styles.inputWrapper}>
              <Calendar 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowStartDatePicker(!showStartDatePicker)}
              >
                <Text style={[styles.dateText, !startDate && styles.dateTextPlaceholder]}>
                  {startDate ? startDate.toDateString() : 'Select start date'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showStartDatePicker && (
              <DateTimePicker
                value={startDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleStartDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(new Date().getFullYear() - 10, 0, 1)}
                textColor={Platform.OS === 'ios' ? colors.textPrimary : colors.white}
                style={Platform.OS === 'ios' ? { backgroundColor: colors.white } : undefined}
                themeVariant="light"
              />
            )}
          </View>
        )}

        {/* Stopped Checkbox - Only show for non-treatment types */}
        {!isTreatmentType() && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.checkboxContainer}
              onPress={() => setIsStopped(!isStopped)}
            >
              <View style={[styles.checkbox, isStopped && styles.checkboxChecked]}>
                {isStopped && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <Text style={styles.checkboxLabel}>Stopped Using It?</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* End Date - Only show if stopped and not treatment type */}
        {!isTreatmentType() && isStopped && (
          <View style={styles.section}>
            <Text style={styles.sectionSubtitle}>For Efficacy Validation Please Provide</Text>
            <TouchableOpacity onPress={() => setShowEndDatePicker(!showEndDatePicker)} style={styles.inputWrapper}>
              <CalendarX 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TouchableOpacity
                style={styles.dateInputButton}
                onPress={() => setShowEndDatePicker(!showEndDatePicker)}
              >
                <Text style={[styles.dateText, !endDate && styles.dateTextPlaceholder]}>
                  {endDate ? endDate.toDateString() : 'Select stop date'}
                </Text>
              </TouchableOpacity>
            </TouchableOpacity>

            {showEndDatePicker && (
              <DateTimePicker
                value={endDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={handleEndDateChange}
                maximumDate={new Date()}
                minimumDate={startDate || new Date(new Date().getFullYear() - 10, 0, 1)}
                textColor={Platform.OS === 'ios' ? colors.textPrimary : colors.white}
                style={Platform.OS === 'ios' ? { backgroundColor: colors.white } : undefined}
                themeVariant="light"
              />
            )}
          </View>
        )}

        {/* Stop Reason - Only show if stopped and not treatment type */}
        {!isTreatmentType() && isStopped && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle2}>Why did you stop using it?</Text>
            <View style={styles.chipSelectorContainer}>
              {stopReasons.map((reason) => {
                const isActive = stopReason === reason;
                
                return (
                  <TouchableOpacity
                    key={reason}
                    style={[
                      styles.chipButton,
                      isActive && styles.chipButtonActive
                    ]}
                    onPress={() => setStopReason(reason)}
                  >
                    <Text style={[
                      styles.chipButtonText,
                      isActive && styles.chipButtonTextActive
                    ]}>
                      {reason}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        )}

        {/* Save Button */}
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity
            style={[styles.saveButtonBottom, isSaving && styles.saveButtonDisabled]}
            onPress={handleSave}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color={colors.white} />
            ) : (
              <>
                <Text style={styles.saveButtonText}>Save to Routine</Text>
              </>
            )}
          </TouchableOpacity>
        </View>

        {/* Bottom padding for scroll */}
        <View style={styles.bottomPadding} />
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
  headerContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
    height: 120,
  },
  blurContainer: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: spacing.lg,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightContainer: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(139, 115, 85, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.textPrimary,
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  titleUnderline: {
    width: 40,
    height: 3,
    backgroundColor: colors.primary,
    borderRadius: 2,
    opacity: 0.8,
  },
  shadowContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: colors.primary,
    opacity: 0.1,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  keyboardContainer: {
    flex: 1,
    marginTop: 120,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  section: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.md,
    padding: spacing.lg,
    backgroundColor: colors.surface,
    borderRadius: borderRadius.lg,
    ...shadows.sm,
  },
  sectionTitle: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xs,
   // marginBottom: spacing.md,
  },
  sectionTitle2: {
    fontSize: fontSize.lg,
    fontWeight: '600',
    color: colors.textPrimary,
   // marginBottom: spacing.xs,
   marginBottom: spacing.md,
  },
  sectionSubtitle: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  chipSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: borderRadius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.background,
    gap: spacing.xs,
    minHeight: 40,
  },
  chipButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
    ...shadows.sm,
  },
  chipButtonText: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  chipButtonTextActive: {
    color: colors.white,
    fontWeight: '600',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: borderRadius.md,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
    minHeight: 50,
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  textInput: {
    flex: 1,
    paddingVertical: spacing.md,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: 'Inter',
  },
  dateInputButton: {
    flex: 1,
    paddingVertical: spacing.md,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: 'Inter',
  },
  dateTextPlaceholder: {
    color: colors.textSecondary,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: colors.border,
    borderRadius: borderRadius.sm,
    marginRight: spacing.sm,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  checkmark: {
    color: colors.white,
    fontSize: 12,
    fontWeight: 'bold',
  },
  checkboxLabel: {
    fontSize: fontSize.md,
    color: colors.textPrimary,
    fontFamily: 'Inter',
  },
  bottomPadding: {
    height: 100,
  },
  saveButtonContainer: {
    marginHorizontal: spacing.lg,
    marginVertical: spacing.lg,
  },
  saveButtonBottom: {
    backgroundColor: colors.primary,
    borderRadius: borderRadius.pill,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    minHeight: 50,
    ...shadows.md,
  },
  saveButtonDisabled: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: colors.white,
    fontSize: fontSize.md,
    fontWeight: '600',
    fontFamily: 'Inter',
  },
});
