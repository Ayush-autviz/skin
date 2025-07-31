// MyRoutine.js
// Component to display and manage the user's routine items

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, SectionList, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, Alert, Platform } from 'react-native';
import { colors, spacing, typography, palette } from '../../styles';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import Chip from '../ui/Chip';
import ModalBottomSheet from '../layout/ModalBottomSheet';
import AiMessageCard from '../chat/AiMessageCard';
import { useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ListItem from '../ui/ListItem';
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
  X,
  Plus
} from 'lucide-react-native';
import { 
  getRoutineItems, 
  createRoutineItem, 
  updateRoutineItem, 
  deleteRoutineItem 
} from '../../services/newApiService';

// Define static messages based on routine size
const staticAiMessages = [
    {
        numItems: 0,
        msg: "Build a routine to see some results!"
    },
    {
        numItems: 1,
        msg: "What else do you use or do? Add another item!"
    },
    {
        numItems: 3, // Use this threshold for 2 or 3 items
        msg: "Looking good! Do you want help building more of a routine?"
    },
    {
        // numItems: "full", // Use a condition check instead of string key
        msgs: [ // Array of messages for > 3 items
            "Consistency is key! Keep up the great work.",
            "Your routine is looking comprehensive!",
            "Looking good! Remember to review your routine periodically."
        ]
    }
];

// Helper function to calculate usage duration
const calculateUsageDuration = (dateStarted) => {
  let start;
  // Firestore Timestamp
  if (dateStarted && typeof dateStarted.toDate === 'function') {
    start = dateStarted.toDate();
  } 
  // JS Date
  else if (dateStarted instanceof Date) {
    start = dateStarted;
  } 
  // String date (MM/DD/YY or MM/DD/YYYY)
  else if (typeof dateStarted === 'string' && dateStarted.includes('/')) {
    // Normalize to MM/DD/YYYY if needed
    let parts = dateStarted.split('/');
    if (parts.length === 3 && parts[2].length === 2) {
      parts[2] = (parseInt(parts[2], 10) > 50 ? '19' : '20') + parts[2];
    }
    start = new Date(parts.join('/'));
  } else {
    return null;
  }

  if (isNaN(start)) return null;
  const now = new Date();
  const diffMs = now - start;
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const months = Math.floor(diffDays / 30);
  const years = Math.floor(months / 12);

  if (years > 0) {
    return `Using since ${start.toLocaleDateString()}`; // Display start date for long durations
  } else if (months > 0) {
    return `Using for ${months} month${months > 1 ? 's' : ''}`;
  } else {
    return `Using for ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
  }
};

export default function MyRoutine() {
  const router = useRouter();
  const [routineItems, setRoutineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('Product');
  const [newItemUsage, setNewItemUsage] = useState(['AM']);
  const [newItemFrequency, setNewItemFrequency] = useState('Daily');
  const [newItemDateStarted, setNewItemDateStarted] = useState(null);
  const [newItemDateStopped, setNewItemDateStopped] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // State for Date Pickers
  const [showStartDatePicker, setShowStartDatePicker] = useState(false);
  const [showStopDatePicker, setShowStopDatePicker] = useState(false);

  const insets = useSafeAreaInsets();
  const [fixedCardHeight, setFixedCardHeight] = useState(150);

  // Transform API data to component format
  const transformApiItem = (apiItem) => {
    // Normalize API values to component expected format
    const typeMap = {
      'product': 'Product',
      'activity': 'Activity', 
      'nutrition': 'Nutrition'
    };
    
    const usageMap = {
      'am': 'AM',
      'pm': 'PM',
      'both': 'Both'
    };
    
    const frequencyMap = {
      'daily': 'Daily',
      'weekly': 'Weekly',
      'as_needed': 'As Needed'
    };

    return {
      id: apiItem.id,
      name: apiItem.name,
      type: typeMap[apiItem.type] || apiItem.type,
      usage: usageMap[apiItem.usage] || apiItem.usage,
      frequency: frequencyMap[apiItem.frequency] || apiItem.frequency,
      dateStarted: apiItem.extra?.dateStarted ? new Date(apiItem.extra.dateStarted) : null,
      dateStopped: apiItem.extra?.dateStopped ? new Date(apiItem.extra.dateStopped) : null,
      dateCreated: apiItem.extra?.dateCreated ? new Date(apiItem.extra.dateCreated) : new Date(),
      extra: apiItem.extra || {}
    };
  };

  // Fetch routine items from API
  const fetchRoutineItems = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await getRoutineItems();
      
      if (response.success && response.data) {
        const transformedItems = response.data.map(transformApiItem);
        setRoutineItems(transformedItems);
      } else {
        setRoutineItems([]);
      }
      
      setLoading(false);
    } catch (err) {
      console.error('🔴 MyRoutine: Error fetching routine items:', err);
      setError(err.message || 'Failed to load routine items.');
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRoutineItems();
  }, []);

  // Toggle logic for AM/PM usage (checkbox style)
  const handleUsageToggle = (tappedUsage) => {
    setNewItemUsage(currentUsage => {
      const isSelected = currentUsage.includes(tappedUsage);
      if (isSelected) {
        // Deselect: remove it from the array
        return currentUsage.filter(u => u !== tappedUsage);
      } else {
        // Select: add it to the array
        return [...currentUsage, tappedUsage].sort(); // Keep sorted for consistency
      }
    });
  };

  // Date picker handlers
  const handleStartDateChange = (event, selectedDate) => {
    setShowStartDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setNewItemDateStarted(selectedDate);
    }
  };

  const handleStopDateChange = (event, selectedDate) => {
    setShowStopDatePicker(false);
    if (event.type === 'dismissed') return;
    if (selectedDate) {
      setNewItemDateStopped(selectedDate);
    }
  };

  // Handler for navigating to the chat screen for routine discussion
  const handleNavigateToChat = async () => { 
    if (!routineItems || routineItems.length === 0) {
      console.error("MyRoutine: Cannot create routine thread, no user context.");
      alert("Please log in to chat about your routine.");
      return;
    }

    try {
      // Conditional initial message based on whether user has existing routine items
      const hasRoutineItems = routineItems && routineItems.length > 0;
      const initialMessage = hasRoutineItems 
        ? "Have you made any changes to your routine lately, or are you thinking about trying something new?"
        : "Let's walk through your current skincare routine. Tell me what you're currently doing, one product or activity at a time.";
      
      // TODO: Replace with actual API call to create thread
      // const { success, threadId: newThreadId } = await createThread(user.uid, {
      //     type: 'routine_add_discussion',
      //     initialMessageContent: initialMessage
      // });

      // Navigate to thread-based chat
      router.push({
        pathname: '/(authenticated)/threadChat',
        params: {
          chatType: 'routine_add_discussion',
          initialMessage: initialMessage
        } 
      });
    } catch (error) {
        console.error("MyRoutine: Error creating or navigating to routine chat:", error);
        alert("Sorry, couldn't start the routine chat. Please try again.");
    }
  };

  // Combined Add/Update handler
  const handleSaveItem = async () => {
    if (!newItemName.trim()) {
      Alert.alert('Error', 'Please enter an item name.');
      return;
    }

    if (!newItemType.trim()) {
      Alert.alert('Error', 'Please select an item type.');
      return;
    }

    // Validate dates if both are present
    if (newItemDateStarted && newItemDateStopped && newItemDateStopped < newItemDateStarted) {
      Alert.alert('Error', 'Stop date cannot be before start date.');
      return;
    }

    let finalUsage = 'AM';
    const includesAM = newItemUsage.includes('AM');
    const includesPM = newItemUsage.includes('PM');
    if (includesAM && includesPM) finalUsage = 'Both';
    else if (includesPM) finalUsage = 'PM';
    else if (includesAM) finalUsage = 'AM';

    // Prepare data for API (with extra field for additional info)
    const apiItemData = {
      name: newItemName.trim(),
      type: newItemType,
      usage: finalUsage,
      frequency: newItemFrequency,
      extra: {
        dateStarted: newItemDateStarted?.toISOString(),
        dateStopped: newItemDateStopped?.toISOString(),
        dateCreated: editingItem?.dateCreated?.toISOString() || new Date().toISOString()
      }
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        // Update existing item
        const response = await updateRoutineItem(editingItem.id, apiItemData);
        console.log('🟡 MyRoutine: Update response:', response);
        
        if (response.success) {
          // Refetch all routine items to ensure consistency
          await fetchRoutineItems();
          Alert.alert('Success', 'Item updated successfully');
        }
      } else {
        // Create new item
        const response = await createRoutineItem(apiItemData);
        console.log('🟡 MyRoutine: Create response:', response);
        
        if (response.success) {
          // Refetch all routine items to ensure consistency
          await fetchRoutineItems();
          Alert.alert('Success', 'Item added successfully');
        }
      }
      closeModal();
    } catch (err) {
      console.error('🔴 MyRoutine: Error saving item:', err);
      Alert.alert('Error', err.message || 'Failed to save item. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  // Render individual routine item
  const renderRoutineItem = ({ item }) => {
    const isNotUsing = item.dateStopped && new Date(item.dateStopped) <= new Date();
    const usageDuration = calculateUsageDuration(item.dateStarted);
    
    // Determine display usage
    let displayUsage = item.usage;
    if (item.usage === 'Both') displayUsage = 'AM/PM';
    
    // Create chips array
    const chips = [];
    if (item.usage && !isNotUsing) {
      chips.push({ label: displayUsage, type: 'default' });
    }
    if (isNotUsing) {
      chips.push({ label: 'Stopped', type: 'stopped' });
    }
    if (item.frequency && item.frequency !== 'Daily') {
      chips.push({ label: item.frequency, type: 'frequency' });
    }

    console.log('item', item);
    
    return (
        <ListItem
          title={item.name}
          subtitle={usageDuration || 'Recently added'}
          description={item.type}
          icon={item.type === 'Product' ? 'bottle-tonic-outline' : item.type === 'Activity' ? 'yoga' : 'food-apple-outline'}
          iconColor={item.type === 'Product' ? colors.primary : item.type === 'Activity' ? '#009688' : '#FF6B35'}
          chips={chips}
          showChevron={false}
          onPress={() => handleEditItem(item)}
        />
    );
  };

  // Delete handler
  const handleDeleteItemRequest = (itemToDelete) => {
    if (!itemToDelete) return;

    Alert.alert(
      "Confirm Delete",
      `Are you sure you want to delete "${itemToDelete.name}"? This cannot be undone.`,
      [
        {
          text: "Cancel",
          style: "cancel"
        },
        {
          text: "Delete",
          onPress: async () => {
            setIsDeleting(true);
            try {
              const response = await deleteRoutineItem(itemToDelete.id);
              
              if (response.success) {
                // Refetch all routine items to ensure consistency
                await fetchRoutineItems();
                closeModal();
                Alert.alert("Success", "Item deleted successfully");
              }
            } catch (error) {
              console.error('🔴 MyRoutine: Error deleting item:', error);
              Alert.alert("Error", error.message || "Could not delete the routine item.");
            } finally {
              setIsDeleting(false);
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // --- Group items into sections using useMemo ---
  const routineSections = useMemo(() => {
    if (!routineItems || routineItems.length === 0) {
      return [];
    }

    // Define desired order
    const sectionOrder = ['Daily', 'Weekly', 'As Needed'];
    const grouped = {
      'Daily': [],
      'Weekly': [],
      'As Needed': [],
    };

    routineItems.forEach(item => {
      const freq = item.frequency || 'As Needed';
      if (grouped[freq]) {
        grouped[freq].push(item);
      } else {
        grouped['As Needed'].push(item);
      }
    });

    // --- Sort within groups and create sections --- 
    const sections = sectionOrder
      .map(title => {
        const items = grouped[title];

        const usageOrder = { 'AM': 1, 'Both': 2, 'PM': 3 };

        items.sort((a, b) => {
          const usageA = a.usage || 'Both'; 
          const usageB = b.usage || 'Both';
          const orderA = usageOrder[usageA] || 2; 
          const orderB = usageOrder[usageB] || 2;
          if (orderA === orderB) {
             // Sort by creation date descending (newest first) if usage is same
             const dateA = a.dateCreated?.toDate?.() || 0;
             const dateB = b.dateCreated?.toDate?.() || 0;
             return dateB - dateA; 
          }
          return orderA - orderB;
        });

        return {
          title: title.toUpperCase(),
          data: items,
        };
      })
      .filter(section => section.data.length > 0);

    return sections;

  }, [routineItems]);

  // Function to open modal for editing
  const openEditModal = (item) => {
    setIsSaving(false);
    setEditingItem(item);
    setIsModalVisible(true);

    setNewItemName(item.name || '');
    setNewItemType(item.type || 'Product');
    
    // Handle usage conversion
    if (item.usage === 'Both') {
      setNewItemUsage(['AM', 'PM']);
    } else if (item.usage) {
      setNewItemUsage([item.usage]);
    } else {
      setNewItemUsage(['AM']);
    }
    
    setNewItemFrequency(item.frequency || 'Daily');

    // Handle null dates - CustomDateInput expects Date objects or null
    setNewItemDateStarted(item.dateStarted || null);
    setNewItemDateStopped(item.dateStopped || null);
  };

  // Function to close modal and reset state
  const closeModal = () => {
    setIsSaving(false);
    setIsModalVisible(false);
    setEditingItem(null);
    setNewItemName('');
    setNewItemType('Product'); // Set default type to avoid validation error
    setNewItemUsage(['AM']);
    setNewItemFrequency('Daily');
    setNewItemDateStarted(null); 
    setNewItemDateStopped(null); 
  };

  // Update the openAddModalWithFrequency function with proper mapping
  const openAddModalWithFrequency = (frequency) => {
    setIsSaving(false);
    setEditingItem(null);
    setIsModalVisible(true);

    // Map section titles to frequency values
    let mappedFrequency;
    switch (frequency.toLowerCase()) {
      case 'daily':
        mappedFrequency = 'Daily';
        break;
      case 'weekly':
        mappedFrequency = 'Weekly';
        break;
      case 'as needed':
        mappedFrequency = 'As Needed';
        break;
      default:
        mappedFrequency = frequency; // fallback to original value
    }

    // Reset all fields to defaults
    setNewItemName('');
    setNewItemType('Product'); // Set default type
    setNewItemUsage(['AM']);
    setNewItemFrequency(mappedFrequency); // Use mapped frequency
    setNewItemDateStarted(null);
    setNewItemDateStopped(null);
  };

  // Also update the regular openAddModal function for consistency
  const openAddModal = () => {
    setIsSaving(false);
    setEditingItem(null);
    setIsModalVisible(true);

    setNewItemName('');
    setNewItemType('Product'); // Set default type
    setNewItemUsage(['AM']);
    setNewItemFrequency('Daily');
    setNewItemDateStarted(null);
    setNewItemDateStopped(null);
  };

  // Update the renderSectionHeader function
  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <View style={styles.sectionHeaderLeft}>
          <Text style={styles.sectionHeaderText}>{title}</Text>
          <View style={styles.sectionHeaderLine} />
        </View>
        <TouchableOpacity
          style={styles.sectionAddButton}
          onPress={() => openAddModalWithFrequency(title)}
        >
          <MaterialCommunityIcons 
            name="plus" 
            size={16} 
            color={"#fff"} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );



  // --- Select Static Message for AiMessageCard ---
  const getStaticRoutineMessage = (count) => {
    if (count === 0) {
      return staticAiMessages.find(m => m.numItems === 0)?.msg || "Add your first routine item!";
    }
    if (count === 1) {
      return staticAiMessages.find(m => m.numItems === 1)?.msg || "Add another item!";
    }
    // Use threshold for 2 or 3 items
    if (count <= 3) { 
      return staticAiMessages.find(m => m.numItems === 3)?.msg || "Keep building your routine!";
    }
    // Handle > 3 items ("full" routine)
    const fullMessages = staticAiMessages.find(m => Array.isArray(m.msgs))?.msgs;
    if (fullMessages && fullMessages.length > 0) {
      // Return a random message from the list
      return fullMessages[Math.floor(Math.random() * fullMessages.length)];
    } 
    // Default fallback if structure is wrong or no messages defined
    return "You've built a great routine!"; 
  };

  // Calculate the message based on current routineItems length
  const routineMessage = useMemo(() => getStaticRoutineMessage(routineItems.length), [routineItems.length]);

  // --- Layout Handler for Fixed Card ---
  const handleCardLayout = (event) => {
    const { height } = event.nativeEvent.layout;
    // Update state only if height is positive and different from current
    // Add a small buffer (e.g., 50 pixels) to prevent content potentially clipping
    const newHeight = height + 50; 
    if (height > 0 && newHeight !== fixedCardHeight) {
      setFixedCardHeight(newHeight);
    }
  };

  // Add back the handleEditItem function:
  const handleEditItem = (item) => {
    openEditModal(item);
  };

  if (loading) {
    return <ActivityIndicator size="large" color={colors.primary} style={styles.centered} />;
  }

  if (error) {
    return <Text style={styles.errorText}>{error}</Text>;
  }

  return (
    <View style={styles.container}>
      {routineSections.length === 0 ? (
      <View style={styles.emptyListTopContainer}>
        <TouchableOpacity
            style={styles.motivationalCard}
          activeOpacity={0.85}
          onPress={handleNavigateToChat}
        >
            <View style={styles.avatarCircle}>
              <Text style={styles.avatarText}>a</Text>
            </View>
            <Text style={styles.motivationalText}>
              {"Let's get started! Tell me about your current routine."}
            </Text>
            <MaterialCommunityIcons
              name="chevron-right"
              size={24}
              color={colors.primary}
              style={styles.arrowIcon}
            />
          </TouchableOpacity>
        </View>
      ) : (
        <>
        <SectionList
          style={styles.sectionsList}
          sections={routineSections}
          renderItem={renderRoutineItem}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[
            styles.listContentContainerBase,
            { paddingBottom: insets.bottom + fixedCardHeight }
          ]}
          stickySectionHeadersEnabled={false}
        />
        {/* Fixed AI Message Card */}
        <View style={styles.fixedCardWrapper} onLayout={handleCardLayout}>
          <AiMessageCard
            overrideText={routineMessage}
            actions={[
              { label: "Tell me more about your routine", onPress: handleNavigateToChat },
            ]}
            disableNavigation={true}
            fixedToBottom={true}
          />
        </View>
        </>
      )}

      {/* Add/Edit Item Modal */}
      <ModalBottomSheet
        isVisible={isModalVisible}
        onClose={closeModal}
      //  title={editingItem ? "Edit Routine Item" : "Add to your routine"}
        primaryActionLabel={editingItem ? "Update" : "Save"}
        onPrimaryAction={handleSaveItem}
        isPrimaryActionLoading={isSaving}
        isPrimaryActionDisabled={!newItemName.trim() || isSaving || isDeleting}
        secondaryActionLabel="Cancel"
        destructiveActionLabel={editingItem ? "Delete Item" : undefined}
        onDestructiveAction={editingItem ? () => handleDeleteItemRequest(editingItem) : undefined}
      >
        <View style={styles.modalInputContainer}>
          {/* Header with icon */}
          <View style={styles.modalHeader}>
            <View style={styles.modalHeaderIcon}>
              <FlaskConical size={24} color="#8B7355" />
            </View>
            <Text style={styles.modalHeaderTitle}>
              {editingItem ? "Edit Routine Item" : "Add to your routine"}
            </Text>
            {/* <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
              <X size={20} color="#6B7280" />
            </TouchableOpacity> */}
          </View>

          {/* Item Name Input with Icon */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Item Name</Text>
            <View style={styles.inputWrapper}>
              <FlaskConical 
                size={20} 
                color="#6B7280" 
                style={styles.inputIcon} 
              />
              <TextInput
                style={styles.textInput}
                placeholder="What do you use or do?"
                value={newItemName}
                onChangeText={setNewItemName}
                placeholderTextColor="#9CA3AF"
                autoFocus={true}
                returnKeyType="next"
              />
            </View>
          </View>

          {/* Item Type Selector */}
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Category</Text>
            <View style={styles.chipSelectorContainer}>
              {[
                { name: 'Product', icon: FlaskConical, color: '#8B7355' },
                { name: 'Activity', icon: Dumbbell, color: '#009688' },
                { name: 'Nutrition', icon: Apple, color: '#FF6B35' }
              ].map(({ name, icon: Icon, color }) => {
                const isActive = newItemType === name;
                
                return (
                  <TouchableOpacity
                    key={name}
                    style={[
                      styles.chipButton,
                      isActive && styles.chipButtonActive
                    ]}
                    onPress={() => setNewItemType(name)}
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

                      {/* Usage Time Selector */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Time of Day</Text>
              <View style={styles.chipSelectorContainer}>
                {[
                  { name: 'AM', icon: Sun, color: '#F59E0B' },
                  { name: 'PM', icon: Moon, color: '#6366F1' }
                ].map(({ name, icon: Icon, color }) => {
                  const isActive = newItemUsage.includes(name);
                  
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

                      {/* Frequency Selector */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Frequency</Text>
              <View style={styles.chipSelectorContainer}>
                {[
                  { name: 'Daily', icon: CheckCircle, color: '#10B981' },
                  { name: 'Weekly', icon: CalendarDays, color: '#3B82F6' },
                  { name: 'As Needed', icon: HelpCircle, color: '#8B5CF6' }
                ].map(({ name, icon: Icon, color }) => {
                  const isActive = newItemFrequency === name;
                  
                  return (
                    <TouchableOpacity
                      key={name}
                      style={[
                        styles.chipButton,
                        isActive && styles.chipButtonActive
                      ]}
                      onPress={() => setNewItemFrequency(name)}
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

                      {/* Start Date Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Start Date (Optional)</Text>
              <View style={styles.inputWrapper}>
                <Calendar 
                  size={20} 
                  color="#6B7280" 
                  style={styles.inputIcon} 
                />
                <TouchableOpacity
                  style={styles.dateInputButton}
                  onPress={() => setShowStartDatePicker(true)}
                >
                  <Text style={[styles.dateText, !newItemDateStarted && styles.dateTextPlaceholder]}>
                    {newItemDateStarted ? newItemDateStarted.toDateString() : 'Select start date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          {showStartDatePicker && (
            <DateTimePicker
              value={newItemDateStarted || new Date()}
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

                      {/* Stop Date Input */}
            <View style={styles.inputContainer}>
              <Text style={styles.label}>Stop Date (Optional)</Text>
              <View style={styles.inputWrapper}>
                <CalendarX 
                  size={20} 
                  color="#6B7280" 
                  style={styles.inputIcon} 
                />
                <TouchableOpacity
                  style={styles.dateInputButton}
                  onPress={() => setShowStopDatePicker(true)}
                >
                  <Text style={[styles.dateText, !newItemDateStopped && styles.dateTextPlaceholder]}>
                    {newItemDateStopped ? newItemDateStopped.toDateString() : 'Select stop date'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

          {showStopDatePicker && (
            <DateTimePicker
              value={newItemDateStopped || new Date()}
              mode="date"
              display={Platform.OS === 'ios' ? 'spinner' : 'default'}
              onChange={handleStopDateChange}
              maximumDate={new Date()}
              minimumDate={newItemDateStarted || new Date(new Date().getFullYear() - 10, 0, 1)}
              textColor={Platform.OS === 'ios' ? colors.textPrimary : colors.white}
              style={Platform.OS === 'ios' ? { backgroundColor: colors.white } : undefined}
              themeVariant="light"
            />
          )}

        </View>
      </ModalBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  sectionsList: {
    flex: 1,
  },
  listContentContainerBase: {
    paddingTop: spacing.lg,
    paddingBottom: 200,
    paddingHorizontal: 0,
  },
  emptyListTopContainer: {
    paddingTop: 24,
    alignItems: 'stretch',
    paddingHorizontal: 0,
  },
  emptyListText: {
    ...typography.h3,
    color: colors.textMicrocopy,
    textAlign: 'center',
  },
  emptyListSubText: {
    ...typography.caption,
    color: colors.textMicrocopy,
    textAlign: 'center',
    marginTop: spacing.xs,
  },
  sectionHeader: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: '#FFF',
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionHeaderText: {
    ...typography.h3,
    color: colors.textPrimary,
    fontWeight: '700',
    fontSize: 18,
    marginRight: spacing.sm,
  },
  sectionHeaderLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#E2E8F0',
    marginLeft: spacing.sm,
  },
  sectionAddButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  routineItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.xs,
    borderRadius: 8,
    borderTopWidth: 1,
    borderColor: palette.gray4,
  },
  itemIconContainer: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  itemTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  itemName: {
    ...typography.body,
    fontWeight: '600',
    color: colors.textPrimary,
    marginBottom: spacing.xxs,
  },
  itemMicrocopyText: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  concernChipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  itemChipContainer: {
    marginLeft: spacing.sm,
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: spacing.xxs,
  },
  errorText: {
    ...typography.body,
    color: colors.error,
    textAlign: 'center',
    marginTop: spacing.xl,
    paddingHorizontal: spacing.md,
  },
  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  modalInputContainer: {
    paddingHorizontal: 30,
    paddingBottom: 50,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 32,
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  modalHeaderIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#FEF3C7',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  modalHeaderTitle: {
    flex: 1,
    fontSize: 24,
    fontWeight: '600',
    color: '#1F2937',
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
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
    borderBottomColor: '#8B7355',
    paddingBottom: 8,
    minHeight: 44,
  },
  inputIcon: {
    marginRight: 12,
  },
  textInput: {
    flex: 1,
    fontSize: 16,
    color: '#1F2937',
    paddingVertical: 4,
    minHeight: 44,
  },
  chipSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  chipButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    minHeight: 48,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  chipButtonActive: {
    backgroundColor: '#8B7355',
    borderColor: '#8B7355',
    shadowColor: '#8B7355',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  chipButtonText: {
    fontSize: 14,
    color: '#6B7280',
    fontWeight: '500',
  },
  chipButtonTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  dateInputButton: {
    flex: 1,
    paddingVertical: 4,
    minHeight: 44,
    justifyContent: 'center',
  },
  dateText: {
    fontSize: 16,
    color: '#1F2937',
  },
  dateTextPlaceholder: {
    color: '#9CA3AF',
  },
  routineItemContainer: {
    marginBottom: 12, 
    marginHorizontal: 16,
    borderRadius: 12,
    backgroundColor: colors.white,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },

  fixedCardWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 150,
    backgroundColor: 'transparent',
  },

  motivationalCard: {
    backgroundColor: colors.white,
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 5,
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 16,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 60,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  avatarCircle: {
    backgroundColor: colors.primary,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  avatarText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 12,
  },
  motivationalText: {
    fontSize: 13,
    flex: 1,
    color: colors.textPrimary,
  },
  arrowIcon: {
    fontSize: 16,
    marginLeft: 8,
  },
}); 