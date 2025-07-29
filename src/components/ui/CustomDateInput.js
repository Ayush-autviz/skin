// CustomDateInput.js
// [CustomDateInput.js]: Custom DD/MM/YY date input with built-in date conversion

import React, { useRef, useState, useEffect } from 'react';
import { View, TextInput, Text, StyleSheet } from 'react-native';
import { colors } from '../../styles';

// Internal conversion functions
function dateToInputString(date) {
  if (!date) return '';
  // Handle Firestore Timestamp
  if (typeof date.toDate === 'function') {
    date = date.toDate();
  }
  // Handle string dates
  if (typeof date === 'string') {
    date = new Date(date);
  }
  if (!(date instanceof Date) || isNaN(date.getTime())) {
    return '';
  }
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}/${month}/${year}`;
}

function inputStringToDate(dateStr) {
  if (!dateStr) return null;
  const [day, month, year] = dateStr.split('/');
  // Validate parts exist and are numbers
  if (!day || !month || !year) return null;
  // Convert to Date object (month is 0-based in JS Date)
  const fullYear = year.length === 2 ? `20${year}` : year;
  const date = new Date(fullYear, month - 1, day);
  // Validate date is real
  return isNaN(date.getTime()) ? null : date;
}

export default function CustomDateInput({
  value = null,
  onChange,
  placeholder = 'DD/MM/YYYY',
  disabled = false,
  style = {},
}) {
  // Use local state for the input values to prevent flickering
  const [day, setDay] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');

  // Refs for auto-advance
  const dayRef = useRef();
  const monthRef = useRef();
  const yearRef = useRef();

  // Update local state when value prop changes
  useEffect(() => {
    const displayValue = dateToInputString(value);
    const [d = '', m = '', y = ''] = displayValue.split('/');
    setDay(d);
    setMonth(m);
    setYear(y);
  }, [value]);

  // Handle change for each part
  const handleDayChange = (text) => {
    const cleanText = text.replace(/[^0-9]/g, '').slice(0, 2);
    setDay(cleanText);
    
    // Auto-advance focus
    if (cleanText.length === 2) {
      monthRef.current?.focus();
    }
    
    // Update parent if we have a complete date
    updateParent(cleanText, month, year);
  };

  const handleMonthChange = (text) => {
    const cleanText = text.replace(/[^0-9]/g, '').slice(0, 2);
    setMonth(cleanText);
    
    // Auto-advance focus
    if (cleanText.length === 2) {
      yearRef.current?.focus();
    }
    
    // Update parent if we have a complete date
    updateParent(day, cleanText, year);
  };

  const handleYearChange = (text) => {
    const cleanText = text.replace(/[^0-9]/g, '').slice(0, 4);
    setYear(cleanText);
    
    // Update parent if we have a complete date
    updateParent(day, month, cleanText);
  };

  const updateParent = (d, m, y) => {
    if (d && m && y && y.length === 4) {
      const newInputString = `${d}/${m}/${y}`;
      const newDateObject = inputStringToDate(newInputString);
      onChange(newDateObject);
    } else if (!d && !m && !y) {
      // Clear the date if all fields are empty
      onChange(null);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TextInput
        ref={dayRef}
        value={day}
        onChangeText={handleDayChange}
        placeholder="DD"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        maxLength={2}
        style={styles.input}
        editable={!disabled}
      />
      <Text style={styles.slash}>/</Text>
      <TextInput
        ref={monthRef}
        value={month}
        onChangeText={handleMonthChange}
        placeholder="MM"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        maxLength={2}
        style={styles.input}
        editable={!disabled}
      />
      <Text style={styles.slash}>/</Text>
      <TextInput
        ref={yearRef}
        value={year}
        onChangeText={handleYearChange}
        placeholder="YYYY"
        placeholderTextColor={colors.textTertiary}
        keyboardType="number-pad"
        maxLength={4}
        style={styles.input}
        editable={!disabled}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: colors.surface,
  },
  input: {
    fontSize: 16,
    color: colors.textPrimary,
    padding: 0,
    textAlign: 'center',
    minWidth: 30,
  },
  slash: {
    fontSize: 16,
    color: colors.textTertiary,
    marginHorizontal: 2,
    fontWeight: 'bold',
  },
});
