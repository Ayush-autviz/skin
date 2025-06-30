// AnalysisMetrics.js
// React Native component for displaying analysis metrics from Haut.ai

/* ------------------------------------------------------
WHAT IT DOES
- Displays analysis metrics with quality level chips
- Shows "No Results" when photoData.results is null/undefined
- Shows image quality status with color coding

DATA STRUCTURE
'''json


```json
photoData : {
    metrics: {
    // Image Quality Metrics
    imageQuality: {
        focus: number,    // Quality of image focus/clarity
        lighting: number, // Quality of image lighting
        overall: number   // Overall image quality score
    },

    // Age Related Metrics
    eyeAge: number,        // Estimated age based on eye area
    perceivedAge: number,  // Overall estimated age

    // Skin Condition Scores
    acneScore: number,         // Presence and severity of acne
    eyeAreaCondition: number,  // Overall eye area health
    hydrationScore: number,    // Skin hydration level
    linesScore: number,        // Presence of fine lines/wrinkles
    pigmentationScore: number, // Even/uneven skin tone
    poresScore: number,        // Pore visibility/size
    rednessScore: number,      // Skin redness/inflammation
    translucencyScore: number, // Skin clarity/translucency
    uniformnessScore: number,  // Overall skin texture uniformity

    // Skin Classifications
    skinTone: string,  // "Unknown" | Classification of skin tone
    skinType: string   // "Unknown" | Classification of skin type
    },
    ...
}
```


'''

DEV PRINCIPLES
- Check photoData.results for null state
- Handle null states gracefully
- Clear user feedback
------------------------------------------------------*/

import { View, Text, StyleSheet } from 'react-native';
import { memo } from 'react';

// Metric groupings for organized display
const METRIC_GROUPS = {
  quality: {
    title: 'Image Quality',
    metrics: ['imageQuality']
  },
  age: {
    title: 'Age Metrics',
    metrics: ['eyeAge', 'perceivedAge']
  },
  skin: {
    title: 'Skin Analysis',
    metrics: [
      'hydrationScore',
      'pigmentationScore',
      'poresScore',
      'rednessScore',
      'translucencyScore',
      'uniformnessScore',
      'acneScore',
      'linesScore',
      'eyeAreaCondition'
    ]
  },
  properties: {
    title: 'Skin Properties',
    metrics: ['skinType', 'skinTone']
  }
};

const getQualityInfo = (score) => {
  if (score === 0) return { text: 'No Face Detected', color: '#666666' };
  if (score <= 50) return { text: 'Poor', color: '#FF4D4F' };
  if (score <= 75) return { text: 'Ok', color: '#FAAD14' };
  return { text: 'Good', color: '#52C41A' };
};

const AnalysisMetrics = memo(({ photoData }) => {
  // Check for results first
  if (!photoData?.results) {
    return (
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>Metrics</Text>
        <View style={styles.metricRow}>
          <Text style={styles.noResultsText}>No Results</Text>
        </View>
      </View>
    );
  }

  const metrics = photoData.metrics;
  const qualityScore = metrics.imageQuality?.overall || 0;
  const qualityInfo = getQualityInfo(qualityScore);

  // Format numeric values consistently
  const formatScore = (value) => {
    if (typeof value !== 'number') return '—';
    return value.toFixed(1);
  };

  // Format metric names for display
  const formatMetricName = (key) => {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/Score$/, '')
      .trim()
      .replace(/^./, str => str.toUpperCase());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.sectionTitle}>Analysis Results</Text>

      {/* Image Quality Chip Row */}
      <View style={styles.metricRow}>
        <Text style={styles.metricName}>Image Quality</Text>
        <View style={[styles.chip, { backgroundColor: qualityInfo.color }]}>
          <Text style={styles.chipText}>
            {qualityScore.toFixed(1)}: {qualityInfo.text}
          </Text>
        </View>
      </View>

      {/* Core Metrics */}
      {[
        'hydrationScore',
        'pigmentationScore',
        'poresScore',
        'rednessScore',
        'translucencyScore',
        'uniformnessScore'
      ].map(key => (
        <View key={key} style={styles.metricRow}>
          <Text style={styles.metricName}>
            {formatMetricName(key)}
          </Text>
          <Text style={styles.metricValue}>
            {formatScore(metrics[key])}
          </Text>
        </View>
      ))}

      {/* Skin Properties */}
      <View style={styles.metricRow}>
        <Text style={styles.metricName}>Skin Type</Text>
        <Text style={styles.metricValue}>
          {metrics.skinType || '—'}
        </Text>
      </View>
      <View style={styles.metricRow}>
        <Text style={styles.metricName}>Skin Tone</Text>
        <Text style={styles.metricValue}>
          {metrics.skinTone || '—'}
        </Text>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 20,
    color: '#000',
  },
  metricRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  metricName: {
    fontSize: 16,
    color: '#666',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 120,
    alignItems: 'center',
  },
  chipText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  noResultsText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
});

// Add display name for debugging
AnalysisMetrics.displayName = 'AnalysisMetrics';

export default AnalysisMetrics; 