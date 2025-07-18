// AiMessageCard.js
// Displays AI-generated content OR custom text/actions.

/* ------------------------------------------------------
WHAT IT DOES
- Displays AI content (summary/message) OR overrideText.
- Shows loading/error/prompt states for AI content.
- Can display multiple optional action buttons/chips.
- Navigates to chat on press (default) OR calls an action's onPress OR does nothing if navigation disabled.
- Renders the 'a' avatar.

PROPS
- overrideText (string, optional): Displays this text instead of AI content.
- actions (array, optional): Array of action objects [{ label: string, onPress: function }]. Renders chips for each.
- disableNavigation (boolean, optional): Prevents navigation to chat on press.
- fixedToBottom (boolean, optional): Indicates if the card should be fixed to the bottom of the screen.

DEPENDENCIES
- ThreadContext (optional, only if not using overrideText)
- react-native components
- expo-router (optional, only if navigation not disabled)
- Feather icons
- Chip component
------------------------------------------------------*/

import React, { useCallback, useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { Feather } from '@expo/vector-icons'; 
import { useRouter } from 'expo-router';
import Chip from '../ui/Chip'; // Import Chip for the action button
import { spacing, colors, palette, typography } from '../../styles'; // Import styles
import { useSafeAreaInsets } from 'react-native-safe-area-context'; // Add this import

const AiMessageCard = ({ 
    overrideText,
    actions = [],
    disableNavigation = false,
    fixedToBottom = false, // Add this prop
}) => {
  const router = useRouter();
  const insets = useSafeAreaInsets(); // Add this
  // Only use context if overrideText is not provided
  // const { currentThread, isSummaryRequestedRecently } = overrideText ? { currentThread: null, isSummaryRequestedRecently: false } : useThreadContext();
  
  const [showFallbackPrompt, setShowFallbackPrompt] = useState(false); 
  const fallbackTimerRef = useRef(null);

  // Determine content presence (only relevant if not using overrideText)
  // const summaryContent = currentThread?.summary;
  // const messageContent = currentThread?.messages?.[0]?.content;
  // const hasAnyContent = !!summaryContent || !!messageContent;

  // Effect for fallback prompt (only runs if not using overrideText)
  useEffect(() => {
    if (overrideText) return; // Don't run if using override

    if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current);
    setShowFallbackPrompt(false); 

    // if (!hasAnyContent && !isSummaryRequestedRecently && currentThread?.id) { 
    //     fallbackTimerRef.current = setTimeout(() => {
    //         //console.log('🤖 AiMessageCard: Fallback timer triggered.');
    //         setShowFallbackPrompt(true);
    //         fallbackTimerRef.current = null; 
    //     }, 4000); 
    // }

    return () => { if (fallbackTimerRef.current) clearTimeout(fallbackTimerRef.current); };
  }, [overrideText]); 

  // --- Determine string to show --- 
  let stringToShow = "..."; 
  let applyPromptStyle = false;

  if (overrideText) {
      stringToShow = overrideText;
  } else if (showFallbackPrompt) {
    stringToShow = "Tell me about your routine or your skin in this snapshot";
    applyPromptStyle = true;
  }
  // --- End determine string --- 

  
  // console.log('🤖 AiMessageCard Render:', {
  //   threadId: currentThread?.id,
  //   overrideTextProvided: !!overrideText,
  //   actionsProvided: actions.length > 0,
  //   stringToShow: stringToShow.substring(0, 20) + '...', 
  // });

  // Original navigation handler
  const handleNavigateToChat = useCallback(() => {
    // if (currentThread?.id) {
    //   console.log(`🔵 AiMessageCard: Navigating to chat for thread ${currentThread.id}`);
    //   router.push({
    //       pathname: '/(authenticated)/aiChat',
    //       params: { threadId: currentThread.id, initialMessage: messageContent },
    //   });
    // } else {
    //   console.warn('⚠️ AiMessageCard: Cannot navigate, currentThread or ID is missing.');
    // }
  }, [router]);

  // Determine the onPress action for the main card container
  const handleCardPress = () => {
    // If actions exist OR navigation is disabled, do nothing on card press
    if (actions.length > 0 || disableNavigation) {
      console.log('🤖 AiMessageCard: Card press ignored (actions present or navigation disabled).');
      return; 
    }
    // Otherwise, perform default navigation
    handleNavigateToChat();
  };

  // Determine if multiple lines needed for text based on actions presence
  const numberOfTextLines = actions.length > 0 ? 2 : 3;

  // Define styles based on fixedToBottom prop
  const containerStyle = [
    styles.baseCardContainer,
    fixedToBottom
      ? {
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          width: '100%',
          backgroundColor: palette.gray2,
          // backgroundColor: 'red',
          borderTopWidth: 1,
          borderTopColor: palette.gray4,
          paddingHorizontal: spacing.lg,
          paddingTop: spacing.lg,
          paddingBottom: insets.bottom + spacing.md,
          marginHorizontal: 0,
          marginBottom: 0,
          marginTop: 0,
          borderRadius: 0,
          borderWidth: 0,
          shadowOffset: { width: 0, height: -6 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
        }
      : {
          backgroundColor: palette.gray2,
          marginHorizontal: spacing.lg,
          marginBottom: spacing.md,
          marginTop: spacing.sm,
          paddingTop: spacing.sm,
          paddingBottom: spacing.sm,
          paddingHorizontal: spacing.md,
          borderRadius: 12,
          shadowColor: colors.black,
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.15,
          shadowRadius: 6,
          elevation: 1,
          borderColor: palette.gray4,
          borderWidth: 1,
        }
  ];

  return (
    <TouchableOpacity 
        style={containerStyle}
        onPress={handleCardPress}
        activeOpacity={actions.length > 0 || disableNavigation ? 1 : 0.7}
    >
        <View style={styles.avatarCircle}>
            <Text style={styles.avatarText}>a</Text>
        </View>

        <View style={[styles.contentArea, fixedToBottom && styles.fixedContentPadding]}>
            <Text 
                style={[styles.messageText, applyPromptStyle && styles.promptText]} 
                numberOfLines={numberOfTextLines} 
            >
                {stringToShow} 
            </Text>
            
            {actions.length > 0 && (
                <View style={styles.actionsContainer}>
                    {actions.map((action, index) => (
                        <TouchableOpacity 
                            key={index} 
                            onPress={action.onPress} 
                            style={styles.actionChipTouchable}
                        >
                            <Chip 
                                label={action.label} 
                                type="default" 
                                styleVariant="normal" 
                                size="md"
                            />
                        </TouchableOpacity>
                    ))}
                </View>
            )}
        </View>

        {actions.length === 0 && !disableNavigation && (
            <View style={styles.chevronContainer}>
              <Feather name="chevron-right" size={20} color={palette.gray6} />
            </View>
        )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  baseCardContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    minHeight: 60,

  },
  fixedContentPadding: {
    // Add padding if needed for fixed mode
  },
  avatarCircle: {
    backgroundColor: colors.primary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
    marginTop: 2,
  },
  avatarText: {
    color: palette.gray1,
    fontWeight: 'bold',
    fontSize: 14,
  },
  contentArea: {
    flex: 1,
    // borderWidth: 1,
    // borderColor: 'red',
  },
  messageText: {
    ...typography.body,
    fontSize: 15,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 8,
    
  },
  promptText: {
    color: colors.textSecondary,
    fontStyle: 'italic',
  },
  actionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.sm,
  },
  actionChipTouchable: {
    marginRight: spacing.sm,
    marginBottom: 8,
  },
  chevronContainer: {
    justifyContent: 'center',
    alignSelf: 'stretch',
    paddingLeft: spacing.sm,
  },
});

export default AiMessageCard; 