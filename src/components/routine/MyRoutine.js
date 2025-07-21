// mobile/src/components/MyRoutine.js
// Component to display and manage the user's routine items

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MyRoutine() {

  const handleNavigateToChat = () => {
    router.push('/(authenticated)/aiChat?initialMessage=tell me about your current routine');
  }
  return (
    <View style={styles.container}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
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