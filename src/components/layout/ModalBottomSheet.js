import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Modal,
  ScrollView,
  Animated,
} from 'react-native';
import { colors, fontSize, spacing, typography } from '../../styles';
import { PrimaryButton, SecondaryButton, DestructiveButton } from '../ui/buttons/ModalButtons';

const ModalBottomSheet = (props) => {
  // Extract props inside the component
  const {
    isVisible,
    onClose,
    title,
    children,
    primaryActionLabel = 'OK',
    onPrimaryAction,
    isPrimaryActionDisabled = false,
    isPrimaryActionLoading = false,
    secondaryActionLabel,
    onSecondaryAction,
    destructiveActionLabel,
    onDestructiveAction,
  } = props;

  const [modalVisible, setModalVisible] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(300)).current; // Start below screen

  useEffect(() => {
    if (isVisible) {
      // Show modal immediately, then animate in
      setModalVisible(true);
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Animate out, then hide modal
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        // Hide modal after animation completes
        setModalVisible(false);
      });
    }
  }, [isVisible]);

  const handleSecondaryAction = () => {
    if (onSecondaryAction) {
      onSecondaryAction();
    } else {
      onClose(); // Default secondary action is to close
    }
  };

  return (
    <Modal
      animationType="none"
      transparent={true}
      visible={modalVisible}
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Animated.View 
          style={[
            styles.backdrop,
            {
              opacity: fadeAnim,
            }
          ]}
        >
          <TouchableOpacity
            style={styles.backdropTouchable}
            activeOpacity={1}
            onPress={onClose}
          />
          <Animated.View 
            style={[
              styles.modalContainer,
              {
                transform: [{ translateY: slideAnim }],
              }
            ]}
          >
            <View style={styles.modalContent}>
              <View style={styles.handleIndicator} />

              {/* <Text style={styles.title}>{title || ''}</Text> */}
              
              <ScrollView 
                style={styles.scrollViewStyle} 
                contentContainerStyle={styles.scrollViewContentContainer}
                showsVerticalScrollIndicator={false}
              >
                {children}

                <View style={styles.buttonContainer}>
                  {onPrimaryAction ? (
                    <PrimaryButton
                      title={primaryActionLabel}
                      onPress={onPrimaryAction}
                      disabled={isPrimaryActionDisabled}
                      loading={isPrimaryActionLoading}
                      style={styles.buttonSpacing}
                    />
                  ) : null}
                  {secondaryActionLabel ? (
                    <SecondaryButton
                      title={secondaryActionLabel}
                      onPress={handleSecondaryAction}
                      style={styles.buttonSpacing}
                    />
                  ) : null}
                  {destructiveActionLabel && onDestructiveAction ? (
                    <DestructiveButton
                      title={destructiveActionLabel}
                      onPress={onDestructiveAction}
                      style={styles.buttonSpacing}
                    />
                  ) : null}
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoidingView: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    width: '100%',
    height: '100%',
    justifyContent: 'flex-end',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  backdropTouchable: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalContainer: {
    width: '100%',
    height: '85%',
    backgroundColor: colors.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.lg,
    paddingTop: spacing.sm,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 5,
  },
  modalContent: {
    alignItems: 'center',
    flex: 1,
  },
  handleIndicator: {
    width: 50,
    height: 5,
    borderRadius: 2.5,
    backgroundColor: colors.textTertiary,
    marginBottom: spacing.md,
  },
  title: {
    ...typography.h3,
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.textPrimary,
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,   
    textAlign: 'center',
  },
  scrollViewStyle: {
    width: '100%',
    flex: 1,
  },
  scrollViewContentContainer: {
    paddingBottom: 0,
  },
  buttonContainer: {
    flexDirection: 'column',
    width: '100%',
    paddingHorizontal: spacing.sm,
   // marginTop: spacing.lg,
  },
  buttonSpacing: {
    // marginVertical: spacing.xs,
    // paddingVertical: 0,
    marginVertical: 10,
  },
});

export default ModalBottomSheet; 