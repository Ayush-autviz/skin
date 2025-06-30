// progress.js
// Screen for tracking user progress over time

/* ------------------------------------------------------
WHAT IT DOES
- Displays progress tracking interface
- Shows trends and improvements over time using photo metrics
- Fetches and processes user's analyzed photos

DEV PRINCIPLES
- Uses vanilla JavaScript
- Clean component structure
- Consistent styling

NEXT STEPS
[x] Design and implement progress metrics
[x] Add progress visualization components
[x] Integrate with analysis data


## PHOTO DATA STRUCTURE

```javascript
{
  // Top Level Fields
  batchId: string,            // Batch identifier for analysis
  storageUrl: string,         // Firebase Storage URL
  timestamp: timestamp,       // Creation timestamp
  updatedAt: timestamp,       // Last modification timestamp

  // Analysis Status
  analysis: {},               // Empty object - ignored
  analyzed: boolean,          // Whether analysis is complete
  analyzing: boolean,         // Whether analysis is in progress

  // Haut AI Upload Data
  hautUploadData: {
    hautBatchId: string,      // Haut AI batch identifier
    imageId: string,          // Unique image identifier
    status: string,           // Upload status (e.g. "uploaded")
    urls: {
      "500x500": string,      // Medium resolution URL
      "800x1200": string,     // Large resolution URL
      original: string        // Original resolution URL
    }
  },

  // Skin Analysis Metrics
  metrics: {
    acneScore: 0,            // Severity of acne presence (0-100)
    eyeAge: 0,               // Estimated age based on eye area appearance
    eyeAreaCondition: 0,     // Overall eye area health score (0-100)
    hydrationScore: 0,       // Skin moisture level assessment (0-100)
    imageQuality: {          // Technical image assessment scores
      focus: 0,              // Image clarity and sharpness (0-100)
      lighting: 0,           // Lighting quality and evenness (0-100)
      overall: 0             // Combined image quality score (0-100)
    },
    linesScore: 0,           // Presence and depth of fine lines (0-100)
    perceivedAge: 0,         // AI-estimated age based on overall appearance
    pigmentationScore: 0,    // Even skin tone assessment (0-100)
    poresScore: 0,           // Pore size and visibility rating (0-100)
    rednessScore: 0,         // Skin redness/inflammation level (0-100)
    skinTone: "Unknown",     // Classified skin tone category
    skinType: "Unknown",     // Classified skin type (e.g., Dry, Oily)
    translucencyScore: 0,    // Skin clarity/transparency rating (0-100)
    uniformnessScore: 0      // Overall evenness of skin texture (0-100)
  },

  // Raw Analysis Results - unparsed direct from haut
  results: {
    // ... 
  },

  // Status Information
  status: {
    lastUpdated: timestamp,   // Last update timestamp
    message: string,          // Status message
    state: string            // Current state
  }
}
------------------------------------------------------*/

import { View, Text, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import Header from '../../src/components/ui/Header';
import { colors, spacing, typography } from '../../src/styles';
import MetricsSeries from '../../src/components/analysis/MetricsSeries';
import { usePhotoContext } from '../../src/contexts/PhotoContext';

export default function ProgressScreen() {
  const { photos, loading } = usePhotoContext();

  // Filter for only analyzed photos with metrics
  const analyzedPhotos = photos?.filter(photo => 
    photo.metrics && 
    Object.keys(photo.metrics).length > 0
  ) || [];

  return (
    <View style={styles.container}>
      <Header 
        title="Progress"
        showBack={true}
      />
      
      <View style={styles.content}>
        <MetricsSeries photos={analyzedPhotos} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 100
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: 'center',
  },
}); 