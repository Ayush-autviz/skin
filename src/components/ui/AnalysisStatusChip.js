// AnalysisStatusChip.js
// UI component for displaying analysis status in chip format

/* ------------------------------------------------------
WHAT IT DOES
- Shows different status chips based on analysis state
- Handles no_metrics, pending, analyzing, and error states
- Shows error message when needed
- Returns null for COMPLETE state (metrics table shows instead)

DATA USED
- status: String from ANALYSIS_STATES enum
- errorMessage: String (optional)
- onRetry: Function (optional)

DEV PRINCIPLES
- Clean, consistent styling
- Clear status communication
- Single source of truth for states
------------------------------------------------------*/

import { View, Text, ActivityIndicator, TouchableOpacity, StyleSheet } from 'react-native';

const ANALYSIS_STATES = {
  NO_METRICS: 'no_metrics',    // Legacy photos with no metrics
  PENDING: 'pending',          // Newly uploaded, waiting for analysis
  ANALYZING: 'analyzing',      // Analysis in progress
  COMPLETE: 'complete',        // Analysis finished successfully
  ERROR: 'error'              // Analysis failed
};

export default function AnalysisStatusChip({ status, errorMessage, onRetry }) {
  // Don't render anything if status is complete (metrics table will show)
  if (status === ANALYSIS_STATES.COMPLETE) return null;

  const renderContent = () => {
    switch (status) {
      case ANALYSIS_STATES.NO_METRICS:
        return (
          <View style={[styles.chip, styles.noMetricsChip]}>
            <Text style={styles.text}>No Analysis Available</Text>
          </View>
        );

      case ANALYSIS_STATES.PENDING:
        return (
          <View style={[styles.chip, styles.pendingChip]}>
            <Text style={styles.text}>Waiting for Analysis</Text>
          </View>
        );

      case ANALYSIS_STATES.ANALYZING:
        return (
          <View style={[styles.chip, styles.analyzingChip]}>
            <ActivityIndicator size="small" color="#fff" />
            <Text style={styles.text}>Analyzing...</Text>
          </View>
        );

      case ANALYSIS_STATES.ERROR:
        return (
          <View style={styles.errorContainer}>
            <View style={[styles.chip, styles.errorChip]}>
              <Text style={styles.text}>Analysis Failed</Text>
            </View>
            {errorMessage && (
              <Text style={styles.errorMessage}>{errorMessage}</Text>
            )}
            {onRetry && (
              <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
                <Text style={styles.retryText}>Try Again</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      default:
        return null;
    }
  };

  return renderContent();
}

const styles = StyleSheet.create({
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    gap: 8,
  },
  noMetricsChip: {
    backgroundColor: '#666',
  },
  pendingChip: {
    backgroundColor: '#F5A623',  // Orange for pending
  },
  analyzingChip: {
    backgroundColor: '#007AFF',
  },
  errorChip: {
    backgroundColor: '#FF3B30',
  },
  text: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    alignItems: 'center',
    gap: 12,
  },
  errorMessage: {
    color: '#666',
    fontSize: 14,
    textAlign: 'center',
  },
  retryButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: '#f0f0f0',
  },
  retryText: {
    color: '#007AFF',
    fontSize: 14,
    fontWeight: '600',
  },
}); 