// mobile/src/components/MyRoutine.js
// Component to display and manage the user's routine items

import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, SectionList, ActivityIndicator, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { createThread } from '../../services/FirebaseThreadsService';
import { updateRoutineItem, addRoutineItem, deleteRoutineItem } from '../../services/FirebaseUserService';
import { auth } from '../../config/firebase';
import { db } from '../../config/firebase'; // Import db
import { doc, onSnapshot } from 'firebase/firestore'; // Import doc and onSnapshot
import { colors, spacing, typography, palette } from '../../styles';
import { MaterialCommunityIcons } from '@expo/vector-icons'; // Import icons
import Chip from '../ui/Chip'; // Import the Chip component
import ModalBottomSheet from '../layout/ModalBottomSheet'; // Update import name
// [MyRoutine.js]: Switched to official RN date picker
import CustomDateInput from '../ui/CustomDateInput'; // [MyRoutine.js]: Custom MM/DD/YY date input
import AiMessageCard from '../chat/AiMessageCard'; // Import the refactored AiMessageCard
import { useRouter } from 'expo-router'; // Import useRouter for navigation
import { useUser } from '../../contexts/UserContext'; // Import useUser for thread creation
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ListItem from '../ui/ListItem'; // Make sure this import is added

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
// [MyRoutine.js]: Calculate usage duration from dateStarted (string, Date, or Timestamp)
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
    console.error("Error calculating usage duration:", error);
    return ''; // Return empty string on error
  }
};

export default function MyRoutine() {
  const router = useRouter(); // Get router instance
  const { user } = useUser(); // Get user from context for thread creation
  const [routineItems, setRoutineItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // Track item being edited
  const [newItemName, setNewItemName] = useState('');
  const [newItemType, setNewItemType] = useState('Product');
  const [newItemUsage, setNewItemUsage] = useState(['AM']);
  const [newItemFrequency, setNewItemFrequency] = useState('Daily');
  const [newItemDateStarted, setNewItemDateStarted] = useState(null);
  const [newItemDateStopped, setNewItemDateStopped] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false); // State for delete operation

  // State for the Date Picker Modal
  const [isDatePickerVisible, setDatePickerVisibility] = useState(false);
  const [editingDateField, setEditingDateField] = useState(null); // 'start' or 'stop'

  const insets = useSafeAreaInsets();
  const [fixedCardHeight, setFixedCardHeight] = useState(150); // Initial estimate for card height including safe area

  useEffect(() => {
    const userId = auth.currentUser?.uid;
    if (!userId) {
      setError('User not logged in.');
      setLoading(false);
      return;
    }

    // console.log('🔄 MyRoutine: Setting up profile listener ONCE for user:', userId);
    // setLoading(true); // Already true by default, avoid setting again
    setError(null);

    const userRef = doc(db, 'users', userId);

    // Set up the real-time listener
    const unsubscribe = onSnapshot(userRef,
      (docSnapshot) => {
        if (docSnapshot.exists()) {
          // console.log('✅ MyRoutine: Profile snapshot received.');
          const profileData = docSnapshot.data()?.profile;
          const userRoutine = profileData?.routine || [];
          // console.log(' MyRoutine: Updated routine from snapshot:', userRoutine.length, 'items');
          setRoutineItems(userRoutine);
          setError(null); // Clear any previous error on successful update
        } else {
          console.warn(' MyRoutine: User document not found in snapshot.');
          setError('User profile not found.');
          setRoutineItems([]); // Clear items if profile disappears
        }
        // Set loading to false only after the first snapshot is processed
        // This check should remain to turn off the initial loading indicator
        if (loading) {
            //  console.log(' MyRoutine: First snapshot processed, setting loading to false.');
             setLoading(false);
        }
      },
      (err) => { // Error handler for the listener
        console.error('🔴 MyRoutine: Listener error:', err);
        setError('Failed to listen for routine updates.');
        setLoading(false); // Stop loading on listener error
      }
    );

    // Return the unsubscribe function for cleanup
    return () => {
      // console.log(' MyRoutine: Cleaning up profile listener on unmount.');
      unsubscribe();
    };

  }, []); // <--- Use empty dependency array to run only ONCE on mount

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

  // --- Date Picker Handlers ---
  const showDatePicker = (field) => {
    // console.log(`MyRoutine: showDatePicker called for field: ${field}`); // Add log
    setEditingDateField(field);
    setDatePickerVisibility(true); 
    // console.log(`MyRoutine: isDatePickerVisible state should now be true`); // Add log (Note: state updates might be async, this logs intent)
  };

  const hideDatePicker = () => {
    setDatePickerVisibility(false);
    setEditingDateField(null); // Reset editing field
  };

  const handleConfirmDate = (date) => {
    const formattedDate = date.toLocaleDateString(); // Format consistently
    if (editingDateField === 'start') {
      setNewItemDateStarted(date);
    } else if (editingDateField === 'stop') {
      setNewItemDateStopped(date);
    }
    hideDatePicker();
  };
  // --- End Date Picker Handlers ---

  // Handler for navigating to the chat screen for routine discussion
  const handleNavigateToChat = async () => { 
    // console.log("MyRoutine: Initiating routine discussion chat...");
    if (!user?.uid) {
        console.error("MyRoutine: Cannot create routine thread, user not logged in.");
        alert("Please log in to chat about your routine.");
        return;
    }

    try {
      // Conditional initial message based on whether user has existing routine items
      const hasRoutineItems = routineItems && routineItems.length > 0;
      const initialMessage = hasRoutineItems 
        ? "Have you made any changes to your routine lately, or are you thinking about trying something new?"
        : "Let's walk through your current skincare routine. Tell me what you're currently doing, one product or activity at a time.";
      
      // console.log(`MyRoutine: Using ${hasRoutineItems ? 'existing routine' : 'new routine'} initial message`);
      // console.log("MyRoutine: Calling createThread with type routine_add_discussion and initial message");
      const { success, threadId: newThreadId } = await createThread(user.uid, {
          type: 'routine_add_discussion',
          initialMessageContent: initialMessage
      });

      if (success && newThreadId) {
          // console.log(`MyRoutine: Created new routine thread ${newThreadId}. Navigating...`);
          router.push({ 
              pathname: '/(authenticated)/aiChat', 
              params: { 
                  threadId: newThreadId, 
                  initialMessage: initialMessage
              } 
          });
      } else {
          throw new Error('Thread creation failed or did not return ID.');
      }
    } catch (error) {
        console.error("MyRoutine: Error creating or navigating to routine chat:", error);
        alert("Sorry, couldn't start the routine chat. Please try again.");
    }
  };

  // Combined Add/Update handler
  const handleSaveItem = async () => {
    const userId = auth.currentUser?.uid;
    if (!newItemName.trim() || !userId) {
      alert('Please enter an item name.');
      return;
    }

    // Validate dates if both are present
    if (newItemDateStarted && newItemDateStopped && newItemDateStopped < newItemDateStarted) {
      alert('Stop date cannot be before start date.');
      return;
    }

    let finalUsage = 'AM';
    const includesAM = newItemUsage.includes('AM');
    const includesPM = newItemUsage.includes('PM');
    if (includesAM && includesPM) finalUsage = 'Both';
    else if (includesPM) finalUsage = 'PM';
    else if (includesAM) finalUsage = 'AM';

    const itemData = {
      name: newItemName.trim(),
      type: newItemType,
      usage: finalUsage,
      frequency: newItemFrequency,
      dateStarted: newItemDateStarted, // Already a Date object or null
      dateStopped: newItemDateStopped, // Already a Date object or null
    };

    setIsSaving(true);
    try {
      if (editingItem) {
        await updateRoutineItem(userId, { ...itemData, id: editingItem.id });
      } else {
        await addRoutineItem(userId, itemData);
      }
      closeModal();
    } catch (err) {
      console.error('🔴 MyRoutine: Error saving item:', err);
      alert('Failed to save item. Please try again.');
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
      chips.push({ label: 'Stopped', type: 'default' });
    }
    if (item.frequency && item.frequency !== 'Daily') {
      chips.push({ label: item.frequency, type: 'default' });
    }
    
    return (
      <View style={{ marginBottom: 12, marginHorizontal: 16 }}>
        <ListItem
          title={item.name}
          subtitle={usageDuration || 'Recently added'}
          description={item.type === 'Product' ? `${item.type} for daily routine` : item.type}
          icon={item.type === 'Product' ? 'bottle-tonic-outline' : 'shower-head'}
          iconColor={item.type === 'Product' ? colors.primary : '#009688'}
          chips={chips}
          showChevron={false}
          onPress={() => handleEditItem(item)}
        />
      </View>
    );
  };

  // Delete handler (ensure no manual state update here)
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
              const userId = auth.currentUser?.uid;
              if (!userId) throw new Error('User not found');

              console.log('🗑️ MyRoutine: Deleting item via service:', itemToDelete.id);
              await deleteRoutineItem(userId, itemToDelete.id);
              console.log('✅ MyRoutine: Delete request sent for item:', itemToDelete.id, '. Listener will update state.');

              // *** NO setRoutineItems call here ***
              closeModal(); // Close the edit modal after delete request
            } catch (error) {
              console.error('🔴 MyRoutine: Error deleting item:', error);
              Alert.alert("Error", "Could not delete the routine item.");
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
      
    // console.log('🔄 MyRoutine: Generated sorted sections:', sections.map(s => ({title: s.title, count: s.data.length})))

    return sections;

  }, [routineItems]); // Recalculate whenever routineItems changes

  // [MyRoutine.js]: Function to open modal for editing
  // Converts string date fields to Date objects for CustomDateInput
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
    
    // console.log('📅 MyRoutine: Opening edit modal with dates:', {
    //   dateStarted: item.dateStarted,
    //   dateStopped: item.dateStopped,
    //   convertedStart: item.dateStarted || null,
    //   convertedStop: item.dateStopped || null
    // });
  };

  // Function to close modal and reset state
  const closeModal = () => {
    setIsSaving(false);
    setIsModalVisible(false);
    setEditingItem(null);
    setNewItemName('');
    setNewItemType('Product');
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
    setNewItemType(''); // Remove default 'Product' - let user choose
    setNewItemUsage(['AM']);
    setNewItemFrequency(mappedFrequency); // Use mapped frequency
    setNewItemDateStarted(null);
    setNewItemDateStopped(null);

    // console.log('📅 Opening modal with frequency:', mappedFrequency);
  };

  // Also update the regular openAddModal function for consistency
  const openAddModal = () => {
    setIsSaving(false);
    setEditingItem(null);
    setIsModalVisible(true);

    setNewItemName('');
    setNewItemType(''); // Remove default 'Product' here too
    setNewItemUsage(['AM']);
    setNewItemFrequency('Daily');
    setNewItemDateStarted(null);
    setNewItemDateStopped(null);
  };

  // Update the renderSectionHeader function
  const renderSectionHeader = ({ section: { title } }) => (
    <View style={styles.sectionHeader}>
      <View style={styles.sectionHeaderContent}>
        <Text style={styles.sectionHeaderText}>{title.toUpperCase()}</Text>
        <TouchableOpacity
          style={styles.sectionAddButton}
          onPress={() => openAddModalWithFrequency(title)}
        >
          <MaterialCommunityIcons 
            name="plus" 
            size={12} 
            color={colors.primary} 
          />
        </TouchableOpacity>
      </View>
    </View>
  );

  // Function to get the initial date for the picker
  const getPickerInitialDate = () => {
    const dateString = editingDateField === 'start' ? newItemDateStarted : newItemDateStopped;
    if (dateString) {
      try {
        const parsedDate = new Date(dateString);
        if (!isNaN(parsedDate.getTime())) {
          return parsedDate;
        }
      } catch (e) { /* Ignore parsing error, default below */ }
    }
    // Default to today if no valid date string or parsing fails
    return new Date(); 
  };

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
      // console.log(`Measured AiMessageCard height: ${height}, Setting padding height to: ${newHeight}`); // For debugging
      setFixedCardHeight(newHeight);
    }
  };

  // Add back the handleEditItem function:
  const handleEditItem = (item) => {
    // console.log('MyRoutine: Editing item:', item.name);
    setEditingItem(item);
    setNewItemName(item.name || '');
    setNewItemType(item.type || 'Product');
    setNewItemUsage(item.usage ? [item.usage] : ['AM']);
    setNewItemFrequency(item.frequency || 'Daily');
    setNewItemDateStarted(item.dateStarted || null);
    setNewItemDateStopped(item.dateStopped || null);
    setIsModalVisible(true);
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
        title={editingItem ? "Edit Routine Item" : "Add to your routine"}
        primaryActionLabel={editingItem ? "Update" : "Save"}
        onPrimaryAction={handleSaveItem}
        isPrimaryActionLoading={isSaving}
        isPrimaryActionDisabled={!newItemName.trim() || isSaving || isDeleting}
        secondaryActionLabel="Cancel"
        destructiveActionLabel={editingItem ? "Delete Item" : undefined}
        onDestructiveAction={editingItem ? () => handleDeleteItemRequest(editingItem) : undefined}
      >
        <View style={styles.modalInputContainer}>

          {/* Item Name Input */}
          <TextInput
            style={styles.input}
            placeholder="What do you use or do?"
            value={newItemName}
            onChangeText={setNewItemName}
            placeholderTextColor={colors.textSecondary}
            autoFocus={true}
          />

          {/* Item Type Selector - Using same pattern as AM/PM */}
          <Text style={styles.typeLabel}>What kind of thing do you do?</Text>
          <View style={styles.typeSelectorContainer}>
            {['Product', 'Activity', 'Nutrition'].map((typeName) => {
              const isActive = newItemType === typeName;
              return (
                <TouchableOpacity
                  key={typeName}
                  style={styles.chipTouchable}
                  onPress={() => setNewItemType(typeName)}
                >
                  <Chip 
                    label={typeName} 
                    type="default" 
                    styleVariant={isActive ? 'bold' : 'normal'} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Item Usage Selector - Checkbox style */}
          <Text style={styles.typeLabel}>What time of day?</Text>
          <View style={styles.typeSelectorContainer}>
            {['AM', 'PM'].map((usageName) => {
              const isActive = newItemUsage.includes(usageName);
              return (
                <TouchableOpacity
                  key={usageName}
                  style={styles.chipTouchable}
                  onPress={() => handleUsageToggle(usageName)}
                >
                  <Chip 
                    label={usageName} 
                    type="default" 
                    styleVariant={isActive ? 'bold' : 'normal'} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Item Frequency Selector - Using same pattern as AM/PM */}
          <Text style={styles.typeLabel}>How often?</Text>
          <View style={styles.typeSelectorContainer}>
            {['Daily', 'Weekly', 'As Needed'].map((freq) => {
              const isActive = newItemFrequency === freq;
              return (
                <TouchableOpacity
                  key={freq}
                  style={styles.chipTouchable}
                  onPress={() => setNewItemFrequency(freq)}
                >
                  <Chip 
                    label={freq} 
                    type="default" 
                    styleVariant={isActive ? 'bold' : 'normal'} 
                  />
                </TouchableOpacity>
              );
            })}
          </View>

          {/* [MyRoutine.js]: Custom Date Input for Start Date */}
          <Text style={styles.typeLabel}>Start Date (Optional)</Text>
           <CustomDateInput
             value={newItemDateStarted}
             onChange={setNewItemDateStarted}
             placeholder="DD/MM/YYYY"
             style={{ marginBottom: 12 }}
           />

          {/* [MyRoutine.js]: Custom Date Input for Stop Date */}
          <Text style={styles.typeLabel}>Stop Date (Optional)</Text>
           <CustomDateInput
             value={newItemDateStopped}
             onChange={setNewItemDateStopped}
             placeholder="DD/MM/YYYY"
           />
        </View>
      </ModalBottomSheet>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  sectionsList: {
    flex: 1,
  },
  listContentContainerBase: {
    paddingTop: spacing.md,
    paddingBottom: 150 + spacing.xl,
    padddingHorizontal: spacing.md
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
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: colors.background,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionHeaderText: {
    ...typography.overline,
    color: colors.textSecondary,
    fontWeight: '600',
    marginRight: spacing.sm,
  },
  sectionAddButton: {
    width: 18,
    height: 18,
    borderRadius: 9,
    backgroundColor: colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
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
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  typeLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  input: {
    ...typography.body,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
    width: '100%',
    color: colors.textPrimary,
  },
  typeSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  chipTouchable: {},
  dateInputTouchable: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.white,
    marginBottom: spacing.sm,
    minHeight: 40,
    justifyContent: 'center',
    width: '100%',
  },
  dateInputText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  dateInputPlaceholder: {
    color: colors.textPlaceholder,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: spacing.xl,
    width: '100%',
    gap: spacing.md,
  },
  modalButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 80,
  },
  modalButtonText: {
    ...typography.button,
    color: colors.white,
  },
  saveButton: {
    backgroundColor: colors.primary,
  },
  deleteButton: {
    backgroundColor: colors.error,
    marginRight: 'auto',
  },
  addButton: {
    position: 'absolute',
    bottom: 150 + spacing.lg,
    right: spacing.lg,
    backgroundColor: colors.primary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    zIndex: 10,
  },
  fixedCardWrapper: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    minHeight: 150, // Use constant here too
  },
  inputLabel: {
    ...typography.label,
    color: colors.textSecondary,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  usageSelectorContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.sm,
  },
  usageChip: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 8,
  },
  usageChipSelected: {
    backgroundColor: colors.primary,
  },
  usageChipText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  usageChipTextSelected: {
    fontWeight: '600',
  },
  snapshotCard: {
    backgroundColor: colors.white,
    borderRadius: 8,
    padding: spacing.md,
    margin: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  snapshotCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  snapshotCardText: {
    ...typography.body,
    color: colors.textPrimary,
  },
  snapshotCardChevron: {
    marginLeft: spacing.md,
  },
  motivationalCard: {
    backgroundColor: '#f8f8f8',
    marginHorizontal: 16,
    marginBottom: 10,
    marginTop: 5,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 50,
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