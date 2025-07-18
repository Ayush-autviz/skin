// metricDetail.js
// Screen component for displaying detailed information about a specific skin metric

/* ------------------------------------------------------
WHAT IT DOES
- Displays detailed information for a single skin metric
- Shows overall score, breakdown, and additional details from Haut analysis
- Provides educational information about the metric
- Shows historical data and improvement suggestions

DATA USED
- route.params: Contains metric information passed from MetricsSheet
  - metricKey: The key name of the metric (e.g., "hydrationScore")
  - metricValue: The numeric value (0-100) or string value
  - photoData: Full photo document from Firestore with all metrics and results

DEVELOPMENT HISTORY
- Tue Mar 30 2025
  - Initial implementation
------------------------------------------------------*/

import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Image
} from 'react-native';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePhotoContext } from '../../src/contexts/PhotoContext';
import ListItem from '../../src/components/ui/ListItem';
import FloatingTooltip from '../../src/components/ui/FloatingTooltip';
import { colors } from '../../src/styles';

// Import the JSON data
import concernsData from '../../data/concerns.json';
import MetricsSeries_simple from '../../src/components/analysis/MetricsSeries_simple';

// Helper function to map metric keys to condition names for mask images
const getConditionNameForMetric = (metricKey) => {
  const mapping = {
    'rednessScore': 'redness',
    'hydrationScore': 'hydration', 
    'eyeAge': 'eye_bags',
    'poresScore': 'pores',
    'acneScore': 'acne',
    'linesScore': 'lines',
    'translucencyScore': 'translucency',
    'pigmentationScore': 'pigmentation',
    'uniformnessScore': 'uniformness',
    'eyeAreaCondition': 'eye_bags'
  };
  
  return mapping[metricKey] || null;
};

// Helper functions for processing metrics data
const metricHelpers = {
  // Convert camelCase metric key to snake_case tech_name format
  getMatchPattern: (key) => {
    if (!key) return '';
    return key
      .replace(/([A-Z])/g, '_$1')
      .toLowerCase()
      .replace(/^_/, '');
  },
  
  // Get metrics related to a specific key from area_results
  getRelatedMetrics: (areaResults, metricKey) => {
    if (!areaResults || !Array.isArray(areaResults) || !metricKey) {
      return [];
    }
    
    const techNamePattern = metricHelpers.getMatchPattern(metricKey);
    const baseName = techNamePattern.replace('_score', '');
    
    // console.log(`Finding metrics related to: ${techNamePattern} (base: ${baseName})`);
    
    return areaResults.filter(metric => {
      // Match exactly by tech_name or loosely by name 
      return (
        metric.tech_name?.includes(techNamePattern) ||
        metric.tech_name?.includes(baseName) ||
        (metric.name && metric.name.toLowerCase().includes(baseName))
      );
    });
  },
  
  // Group metrics by facial region
  groupByRegion: (metrics) => {
    const regions = {};
    
    metrics.forEach(metric => {
      const region = metric.area_name || 'Overall';
      if (!regions[region]) {
        regions[region] = [];
      }
      regions[region].push(metric);
    });
    
    return regions;
  },
  
  // Format metric value based on widget_type
  formatValue: (metric) => {
    if (metric.value === undefined) return 'N/A';
    
    // Round numerical values to 1 decimal place
    let formattedValue = typeof metric.value === 'number' 
      ? Math.round(metric.value * 10) / 10 
      : metric.value;
    
    // Add unit if available
    if (metric.unit) {
      formattedValue = `${formattedValue} ${metric.unit}`;
    }
    
    // Custom formatting based on widget_type
    switch (metric.widget_type) {
      case 'category':
        // For categorical values, no additional formatting
        return formattedValue;
      case 'density':
      case 'bad_good_line':
        // For score-type metrics, add /100 if no unit and value is numeric
        if (typeof metric.value === 'number' && !metric.unit) {
          return `${formattedValue}/100`;
        }
        return formattedValue;
      default:
        return formattedValue;
    }
  },
  
  // Helper function to find the appropriate score level based on value
  getScoreLevelForValue: (scoreLevels, value) => {
    if (!scoreLevels || typeof value !== 'number') return null;
    
    // Find the level where value falls within min/max range
    for (const [levelName, levelData] of Object.entries(scoreLevels)) {
      if (value >= levelData.min && value <= levelData.max) {
        return levelData;
      }
    }
    return null;
  },
  
  // Get appropriate description for a metric based on value and type
  getMetricDescription: (metric, defaultKey, displayType, currentConcernDetails) => {
    // First try to use the new scoreLevels structure from concerns.json
    if (currentConcernDetails && currentConcernDetails.scoreLevels && typeof metric === 'number') {
      const scoreLevel = metricHelpers.getScoreLevelForValue(currentConcernDetails.scoreLevels, metric);
      if (scoreLevel && scoreLevel.text) {
        return scoreLevel.text;
      }
    }
    
    // Fallback to the old hardcoded descriptions for concerns that don't have scoreLevels yet
    const descriptions = {
      hydrationScore: {
        good: 'Your skin is well-hydrated.',
        fair: 'Your skin could use more hydration.',
        bad: 'Your skin is dehydrated.'
      },
      acneScore: {
        good: 'Your skin shows minimal acne activity.',
        fair: 'Your skin shows some acne activity.',
        bad: 'Your skin shows significant acne activity.'
      },
      poresScore: {
        good: 'Your pores appear small and refined.',
        fair: 'Your pores are somewhat visible.',
        bad: 'Your pores are enlarged and noticeable.'
      },
      rednessScore: {
        good: 'Your skin shows minimal redness.',
        fair: 'Your skin shows some areas of redness.',
        bad: 'Your skin shows significant redness.'
      },
      pigmentationScore: {
        good: 'Your skin tone is even with minimal pigmentation issues.',
        fair: 'Your skin shows some uneven pigmentation.',
        bad: 'Your skin shows significant pigmentation issues.'
      },
      default: {
        good: 'Your score is excellent!',
        fair: 'Your score is average.',
        bad: 'This metric needs improvement.'
      },
      skinType: { // Description for skinType category
        default: `Your skin is classified as {value}. Understanding your skin type helps in choosing the right products.`
      },
      age: { // Description for age values
        default: `This estimates the age appearance of this feature. It is {value} years.`
      },
      translucencyScore: {
        good: 'Your skin has good translucency.',
        fair: 'Your skin has fair translucency.',
        bad: 'Your skin has poor translucency.'
      }
    };

    if (displayType === 'skinType') {
      return descriptions.skinType.default.replace('{value}', metric?.value || defaultKey);
    }
    if (displayType === 'age') {
      return descriptions.age.default.replace('{value}', metric?.value || defaultKey);
    }

    // Determine rating category based on value (for fallback descriptions)
    let category = 'fair';
    if (typeof metric === 'number') {
      if (metric >= 70) category = 'good';
      else if (metric < 50) category = 'bad';
    } else if (metric?.value !== undefined && typeof metric.value === 'number') {
      if (metric.value >= 70) category = 'good';
      else if (metric.value < 50) category = 'bad';
    }
    
    // Get the appropriate description set
    const descriptionSet = descriptions[defaultKey] || descriptions.default;
    return descriptionSet[category];
  },
  
  // Determine if a metric is a score-type (0-100) or standalone value
  isScoreMetric: (metricKey, metricValue, metric) => {
    // Known score metrics (ending with "Score")
    if (metricKey && metricKey.endsWith('Score')) {
      return true;
    }
    
    // Check widget_type if available
    if (metric && metric.widget_type) {
      return metric.widget_type === 'bad_good_line';
    }
    
    // If numeric and between 0-100, likely a score
    if (typeof metricValue === 'number' && metricValue >= 0 && metricValue <= 100) {
      // These known metrics are NOT scores despite being 0-100
      const nonScoreMetrics = ['eyeAge', 'perceivedAge', 'age'];
      return !nonScoreMetrics.some(m => metricKey.includes(m));
    }
    
    return false;
  },
  
  // Get the appropriate display format for a metric
  getMetricDisplayInfo: (metricKey, metricValue, metric, currentConcernDetails) => {
    // Determine display type: 'score', 'category' (for skinType), 'age'
    let displayType = 'score';
    if (['skinType'].includes(metricKey)) { // Can be expanded with other categorical non-score metrics
      displayType = 'category';
    } else if (['eyeAge', 'perceivedAge', 'age'].includes(metricKey)) {
      displayType = 'age';
    }

    const isScore = displayType === 'score' && metricHelpers.isScoreMetric(metricKey, metricValue, metric);
    let suffix = '';
    let valueDisplay = metricValue;
    
    // Handle NaN or null/undefined values
    if (metricValue === undefined || metricValue === null || 
        (typeof metricValue === 'number' && isNaN(metricValue))) {
      return {
        displayType, // Add displayType
        isScore: false,
        valueDisplay: metric?.value || 'Not Available',
        description: 'This measurement is not available for this photo.',
        showTag: false
      };
    }
    
    // For skin type (category display)
    if (displayType === 'category') {
      const actualValue = metric?.value || metricValue;
      return {
        displayType,
        isScore: false,
        valueDisplay: actualValue,
        description: metricHelpers.getMetricDescription(metric, actualValue, displayType, currentConcernDetails),
        showTag: false,
        // options: metricKey === 'skinTone' ? ['Light', 'Intermediate', 'Dark'] : // Original skinTone options
        //          metricKey === 'skinType' ? ['Dry', 'Normal', 'Oily', 'Combination'] : null // Original skinType options
        // For now, icon display for skinType, so options might not be directly used in the card
      };
    }
    
    // For age metrics (age display)
    if (displayType === 'age') {
      suffix = ' yrs';
      valueDisplay = `${metricValue}${suffix}`;
      return {
        displayType,
        isScore: false, // Age is not a 0-100 score in this context
        valueDisplay,
        description: metricHelpers.getMetricDescription({ value: metricValue }, String(metricValue), displayType, currentConcernDetails),
        showTag: false
      };
    }
    
    // For numeric count metrics
    if (metric && metric.tech_name && 
       (metric.tech_name.includes('number') || 
        metric.tech_name.includes('count'))) {
      return {
        displayType,
        isScore: false,
        valueDisplay: metricValue,
        description: `This measurement shows a count of ${metricValue}.`,
        showTag: false
      };
    }
    
    // For density metrics
    if (metric && metric.widget_type === 'density') {
      return {
        displayType,
        isScore: true,
        valueDisplay: `${metricValue}/100`,
        description: metricHelpers.getMetricDescription(metricValue, metricKey, displayType, currentConcernDetails),
        showTag: true
      };
    }
    
    // Default for score metrics (0-100)
    if (isScore) {
      return {
        displayType, // Add displayType
        isScore: true,
        valueDisplay: `${metricValue}/100`,
        description: metricHelpers.getMetricDescription(metricValue, metricKey, displayType, currentConcernDetails),
        showTag: true
      };
    }
    
    // Default for other numeric, non-score, non-age metrics
    return {
      displayType, // Add displayType
      isScore: false,
      valueDisplay: `${metricValue}`,
      description: `This measurement is ${metricValue}.`, // Generic description
      showTag: false
    };
  }
};

// Add visualization components using only standard React Native
const MetricVisualizations = {
  // For score metrics (0-100)
  ScoreBar: ({ value, style }) => {
    const percentage = typeof value === 'number' ? Math.min(100, Math.max(0, value)) : 50;
    let barColor = '#f44336'; // Red for bad scores
    
    if (percentage >= 70) {
      barColor = '#4caf50'; // Green for good scores
    } else if (percentage >= 50) {
      barColor = '#ff9800'; // Orange for fair scores
    }
    
    return (
      <View style={[styles.scoreBarContainer, style]}>
        <View style={styles.scoreBarBackground}>
          <View 
            style={[
              styles.scoreBarFill, 
              { width: `${percentage}%`, backgroundColor: barColor }
            ]} 
          />
        </View>
        <View style={styles.scoreBarLabels}>
          <Text style={styles.scoreBarLabelBad}>Poor</Text>
          <Text style={styles.scoreBarLabelGood}>Excellent</Text>
        </View>
      </View>
    );
  },
  
  // For distribution metrics (e.g., skin type which has a spectrum)
  DistributionBar: ({ value, options = ['Dry', 'Normal', 'Oily'], style }) => {
    const selectedIndex = options.findIndex(
      option => option.toLowerCase() === String(value).toLowerCase()
    );
    
    return (
      <View style={[styles.distributionContainer, style]}>
        <View style={styles.distributionBar}>
          {options.map((option, index) => (
            <View 
              key={option} 
              style={[
                styles.distributionSegment,
                { 
                  backgroundColor: index === selectedIndex ? '#6E46FF' : '#e0e0e0',
                  width: `${100 / options.length}%` 
                }
              ]}
            />
          ))}
        </View>
        <View style={styles.distributionLabels}>
          {options.map((option, index) => (
            <Text 
              key={option}
              style={[
                styles.distributionLabel,
                index === selectedIndex && styles.distributionLabelSelected
              ]}
            >
              {option}
            </Text>
          ))}
        </View>
      </View>
    );
  },
  
  // Simple numeric display with large styled number
  NumericValue: ({ value, unit = '', style }) => {
    return (
      <View style={[styles.numericContainer, style]}>
        <Text style={styles.numericValue}>{value}</Text>
        {unit && <Text style={styles.numericUnit}>{unit}</Text>}
      </View>
    );
  },
  
  // Chart placeholder for timeline data
  TimelineChart: ({ style, metric }) => {
    // Create date labels for last 7 days
    const dateLabels = [];
    const today = new Date();
    
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);
      dateLabels.push(date.getDate()); // Just the day number for simplicity
    }
    
    return (
      <View style={[styles.timelineContainer, style]}>
        <View style={styles.timelineBackground}>
          <View style={styles.timelineBars}>
            {[40, 60, 45, 70, 55, 65, 75].map((value, index) => (
              <View key={index} style={styles.timelineBarColumn}>
                <View 
                  style={[
                    styles.timelineBar,
                    { 
                      height: `${value}%`, 
                      backgroundColor: value >= 70 ? '#4caf50' : value >= 50 ? '#ff9800' : '#f44336' 
                    }
                  ]}
                />
                <Text style={styles.timelineDate}>{dateLabels[index]}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.timelineLegend}>
            <Text style={styles.timelineLegendText}>Last 7 days</Text>
            <TouchableOpacity style={styles.timelineButton}>
              <Text style={styles.timelineButtonText}>View all history</Text>
              <Feather name="chevron-right" size={14} color="#6E46FF" />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  }
};

const sanitizeS3Uri = (uriString) => {
  if (!uriString) return uriString;
  // Only touch the query part – a cheap approach is just replacing "+" with
  // its percent-encoded form and ensuring no literal spaces remain.
  return uriString.replace(/\+/g, '%2B').replace(/ /g, '%20');
};

export default function MetricDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  
  // Extract parameters from navigation
  const { metricKey, metricValue, photoData } = params || {};
  console.log('🔵 metricKey:', metricKey);
  
  // Parse the photoData if it's a string
  const parsedPhotoData = typeof photoData === 'string' ? JSON.parse(photoData) : photoData;

  console.log(parsedPhotoData,'parsed photo data');
  
  // State for whether the current concern is being tracked by the user
  const [isConcernTracked, setIsConcernTracked] = useState(false);
  // State for the detailed content of the current concern
  const [currentConcernDetails, setCurrentConcernDetails] = useState(null);
  // State for tooltip
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: {} });
  
  // Format the metric name for display (convert camelCase to Title Case)
  const formatMetricName = (key) => {
    if (!key) return '';
    
    let processedKey = key;
    // If the key ends with "Score", remove it for a cleaner title
    if (processedKey.endsWith('Score')) {
      processedKey = processedKey.substring(0, processedKey.length - 'Score'.length);
    }
    
    return processedKey.replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  };
  
  // Format date for tooltip
  const formatDateLabel = (date) => {
    if (!date) return '';
    const d = typeof date === 'object' && date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Handle chart selection changes
  const handleChartSelection = (selectionData) => {
    if (!selectionData.visible) {
      setTooltip({ visible: false, x: 0, y: 0, content: {} });
      return;
    }

    // Calculate screen position for the tooltip
    // This is a rough calculation - you might need to fine-tune based on your layout
    const chartContainerY = 400; // Approximate Y position of the chart on screen
    const chartLeftMargin = 50; // Approximate left margin
    const barWidth = 16; // From chart component
    
    const x = chartLeftMargin + (selectionData.barIndex * barWidth) + (barWidth / 2);
    const y = chartContainerY - 20; // Position above the chart

    setTooltip({
      visible: true,
      x,
      y,
      content: {
        primary: selectionData.dataPoint.score.toString(),
        secondary: formatDateLabel(selectionData.dataPoint.date).replace(', ', '\n')
      }
    });
  };
  
  // Parse photo date from timestamp if available
  const formatDate = (timestamp) => {
    // Add proper checking for undefined or null values
    if (!timestamp || typeof timestamp !== 'string') {
      return 'No date available';
    }
    
    try {
      // Extract date from string format "30 March 2025 at 09:39:58 UTC-7"
      const dateMatch = timestamp.match(/(\d+)\s+(\w+)\s+(\d+)/);
      if (dateMatch) {
        return `${dateMatch[1]} ${dateMatch[2]} ${dateMatch[3]}`;
      }
      return timestamp; // Return the original string if regex doesn't match
    } catch (error) {
      // console.log('Error formatting date:', error);
      return 'Date format error';
    }
  };
  
  // Helper function to get tag and colors based on metric value
  const getMetricTag = (value) => {
    if (typeof value !== 'number') return { tag: 'N/A', color: '#999', bg: '#f5f5f5' };
    if (value >= 70) return { tag: 'GOOD', color: '#2e7d32', bg: '#e6f4ea' };
    if (value < 50) return { tag: 'BAD', color: '#c62828', bg: '#fdecea' };
    return { tag: 'FAIR', color: '#f57c00', bg: '#fff8e1' };
  };
  
  // Get metric styling
  const { tag, color, bg } = getMetricTag(Number(metricValue));

  const [groupedMetrics, setGroupedMetrics] = useState({});
  const [metricDisplayInfo, setMetricDisplayInfo] = useState({
    displayType: 'score', // Default display type
    isScore: true,
    valueDisplay: '',
    description: '',
    showTag: true
  });

  const { photos } = usePhotoContext();
  const analyzedPhotos = photos?.filter(photo => photo.metrics && Object.keys(photo.metrics).length > 0) || [];

  // Helper to get the latest photo's date string
  const getLatestPhotoDateString = () => {
    if (!analyzedPhotos.length) return '';
    const latestPhoto = analyzedPhotos[analyzedPhotos.length - 1];
    const ts = latestPhoto?.timestamp;
    let dateObj;
    if (ts?.seconds && typeof ts.seconds === 'number') {
      dateObj = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
    } else if (ts instanceof Date) {
      dateObj = ts;
    } else if (typeof ts === 'string' || typeof ts === 'number') {
      dateObj = new Date(ts);
    }
    if (dateObj && !isNaN(dateObj.getTime())) {
      return dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    return '';
  };

  useEffect(() => {
    // console.log('MetricDetail received params:', {
    //   metricKey,
    //   metricValue,
    //   photoDataExists: !!photoData,
    //   parsedDataExists: !!parsedPhotoData,
    // });

    // Load concern details from JSON
    if (metricKey && concernsData) {
      // First check if this is a profile metric (non-scored)
      const profileMetrics = ['skinType', 'perceivedAge', 'eyeAge', 'skinTone'];
      const isProfileMetric = profileMetrics.includes(metricKey);
      
      // console.log('Metric type check:', { metricKey, isProfileMetric });
      
      let details = null;
      
      if (isProfileMetric && concernsData.skinProfiles) {
        // Look in skinProfiles for non-scored metrics
        // console.log('Looking for profile metric in skinProfiles:', metricKey);
        details = concernsData.skinProfiles[metricKey];
        if (details) {
          // console.log('Found profile details for:', metricKey);
          // Add a flag to indicate this is a profile metric
          details._isProfileMetric = true;
        }
      } else if (concernsData.skinConcerns) {
        // Look in skinConcerns for scored metrics
        // console.log('Looking for score metric in skinConcerns:', metricKey);
        details = concernsData.skinConcerns[metricKey];
        
        // If not found directly, try some common variations
        if (!details) {
          console.log('Direct key not found, trying variations...');
          // Try with 'Score' suffix if it doesn't already have it
          if (!metricKey.endsWith('Score')) {
            const keyWithScore = metricKey + 'Score';
            // console.log('Trying key with Score suffix:', keyWithScore);
            details = concernsData.skinConcerns[keyWithScore];
          }
          
          // Try without 'Score' suffix if it has it
          if (!details && metricKey.endsWith('Score')) {
            const keyWithoutScore = metricKey.substring(0, metricKey.length - 'Score'.length);
            // console.log('Trying key without Score suffix:', keyWithoutScore);
            details = concernsData.skinConcerns[keyWithoutScore];
          }
        }
      }
      
      if (details) {
        setCurrentConcernDetails(details);
      } else {
        console.warn(`No details found for metricKey: ${metricKey}`);
        console.warn('Available score keys:', Object.keys(concernsData.skinConcerns || {}));
        console.warn('Available profile keys:', Object.keys(concernsData.skinProfiles || {}));
        setCurrentConcernDetails(null);
      }
    }

    if (!parsedPhotoData || !parsedPhotoData.results || !parsedPhotoData.results.area_results) {
      // console.log('No area_results data available');
      return;
    }
    
    // Get all metrics related to the selected metric key
    const related = metricHelpers.getRelatedMetrics(
      parsedPhotoData.results.area_results, 
      metricKey
    );
    
    console.log(`Found ${related.length} related metrics`);
    
    // Group metrics by facial region
    const grouped = metricHelpers.groupByRegion(related);
    setGroupedMetrics(grouped);
  }, [metricKey, photoData, parsedPhotoData]);

  // Separate useEffect to calculate display info when currentConcernDetails is available
  useEffect(() => {
    if (!parsedPhotoData || !parsedPhotoData.results || !parsedPhotoData.results.area_results) {
      return;
    }

    // Get all metrics related to the selected metric key
    const related = metricHelpers.getRelatedMetrics(
      parsedPhotoData.results.area_results, 
      metricKey
    );
    
    // Get primary metric for display info
    const primaryMetric = related.find(m => 
      m.area_name === 'face' || 
      m.tech_name === metricHelpers.getMatchPattern(metricKey)
    );
    
    // Set display info based on metric type
    setMetricDisplayInfo(
      metricHelpers.getMetricDisplayInfo(metricKey, Number(metricValue), primaryMetric, currentConcernDetails)
    );
  }, [metricKey, metricValue, parsedPhotoData, currentConcernDetails]);

  // Helper function to get smart context text using scoreLevels when available
  const getSmartContextText = (metricValue, metricKey, currentConcernDetails) => {
    // console.log('getSmartContextText called with:', {
    //   metricValue,
    //   metricKey,
    //   hasConcernDetails: !!currentConcernDetails,
    //   hasScoreLevels: !!(currentConcernDetails && currentConcernDetails.scoreLevels)
    // });
    
    if (!Number.isFinite(Number(metricValue))) {
      return 'No measurement available for this metric.';
    }

    const numericValue = Number(metricValue);
    
    // Try to use scoreLevels for more specific context
    if (currentConcernDetails && currentConcernDetails.scoreLevels) {
      // console.log('Found scoreLevels, attempting to get level for value:', numericValue);
      const scoreLevel = metricHelpers.getScoreLevelForValue(currentConcernDetails.scoreLevels, numericValue);
      // console.log('Score level result:', scoreLevel);
      
      if (scoreLevel && scoreLevel.text) {
        // console.log('Using scoreLevels text:', scoreLevel.text);
        // Return the scoreLevel text directly as it's already complete
        return scoreLevel.text;
      }
    }
    
    // Fallback to generic template
    // console.log('Using fallback generic template');
    const level = numericValue >= 70 ? 'good' : numericValue >= 50 ? 'fair' : 'poor';
    return `Your ${formatMetricName(metricKey).toLowerCase()} score of ${numericValue} indicates ${level} skin health in this area.`;
  };

  // Helper function to get the level name and styling from scoreLevels
  const getScoreLevelInfo = (metricValue, currentConcernDetails) => {
    if (!currentConcernDetails || !currentConcernDetails.scoreLevels || !Number.isFinite(Number(metricValue))) {
      // Fallback to the old system for backward compatibility
      const numValue = Number(metricValue);
      if (numValue >= 70) return { levelName: 'Good', color: '#2e7d32', bg: '#e6f4ea' };
      if (numValue >= 50) return { levelName: 'Fair', color: '#f57c00', bg: '#fff8e1' };
      return { levelName: 'Poor', color: '#c62828', bg: '#fdecea' };
    }
    
    const numericValue = Number(metricValue);
    
    // Find the level where value falls within min/max range
    for (const [levelName, levelData] of Object.entries(currentConcernDetails.scoreLevels)) {
      if (numericValue >= levelData.min && numericValue <= levelData.max) {
        // Determine colors based on level name
        let color, bg;
        const lowerName = levelName.toLowerCase();
        if (lowerName.includes('excellent') || lowerName.includes('great')) {
          color = '#2e7d32'; bg = '#e6f4ea'; // Green
        } else if (lowerName.includes('good')) {
          color = '#388e3c'; bg = '#e8f5e8'; // Slightly different green
        } else if (lowerName.includes('average') || lowerName.includes('fair')) {
          color = '#f57c00'; bg = '#fff8e1'; // Orange
        } else if (lowerName.includes('poor')) {
          color = '#d84315'; bg = '#ffebe9'; // Red-orange
        } else if (lowerName.includes('bad')) {
          color = '#c62828'; bg = '#fdecea'; // Red
        } else {
          // Default colors
          color = '#666'; bg = '#f5f5f5';
        }
        
        return { 
          levelName: levelName.charAt(0).toUpperCase() + levelName.slice(1), // Capitalize first letter
          color, 
          bg 
        };
      }
    }
    
    // Fallback if no level found
    return { levelName: 'Unknown', color: '#666', bg: '#f5f5f5' };
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Feather name="arrow-left" size={24} color="#000" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{formatMetricName(metricKey)}</Text>
        </View>
        {/* <TouchableOpacity 
          style={styles.trackButton}
          onPress={() => setIsConcernTracked(!isConcernTracked)}
        >
          <Feather 
            name={isConcernTracked ? "check-circle" : "plus-circle"} 
            size={24} 
            color={isConcernTracked ? "#4CAF50" : "#BDBDBD"}
          />
        </TouchableOpacity> */}
      </View>
      
      {/* Content */}
      <ScrollView style={styles.scrollContainer}>
        {/* Main metric card */}
        <View style={{ marginHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>{getLatestPhotoDateString()}</Text>
          <View style={styles.metricCard}>
            {/* Profile Metric Template (for skinType, perceivedAge, eyeAge, skinTone) */}
            {currentConcernDetails?._isProfileMetric ? (
              <View style={{ width: '100%', marginBottom: 8 }}>
                {/* Profile Box - full width, light gray styling */}
                <View style={{
                  width: '100%',
                  backgroundColor: '#f5f5f5', // Light gray background
                  borderRadius: 12,
                  justifyContent: 'center',
                  alignItems: 'center',
                  paddingVertical: 16,
                  paddingHorizontal: 16,
                  marginBottom: 12,
                }}>
                  <Text style={{ 
                    fontSize: 18, 
                    fontWeight: '600', 
                    color: '#222', 
                    textAlign: 'center',
                  }}>
                    {metricValue}
                  </Text>
                </View>
                {/* Context Text - below the box */}
                <Text style={{ fontSize: 14, lineHeight: 20, color: '#555' }}>
                  {(() => {
                    // First try to use scoreLevels if available for profile metrics
                    if (currentConcernDetails.scoreLevels) {
                      // For categorical metrics (like skin type), try direct lookup
                      if (currentConcernDetails.metricType === 'category' && currentConcernDetails.scoreLevels[metricValue]) {
                        // console.log('Profile metric - using categorical scoreLevels for:', metricValue);
                        return currentConcernDetails.scoreLevels[metricValue].text;
                      }
                      
                      // For numeric metrics (like age), use range lookup
                      const numericValue = Number(metricValue);
                      if (!isNaN(numericValue)) {
                        // console.log('Profile metric - checking scoreLevels for value:', numericValue);
                        const scoreLevel = metricHelpers.getScoreLevelForValue(currentConcernDetails.scoreLevels, numericValue);
                        // console.log('Found scoreLevel:', scoreLevel);
                        if (scoreLevel && scoreLevel.text) {
                          return scoreLevel.text;
                        }
                      }
                    }
                    
                    // Fallback to type-specific descriptions
                    if (currentConcernDetails.metricType === 'category' && currentConcernDetails.typeDescriptions) {
                      // For skinType and skinTone - use specific descriptions
                      const typeDesc = currentConcernDetails.typeDescriptions[metricValue];
                      return typeDesc ? typeDesc.description : currentConcernDetails.contextText;
                    } else if (currentConcernDetails.metricType === 'age') {
                      // For age metrics - use contextText as fallback
                      return currentConcernDetails.contextText;
                    }
                    return currentConcernDetails.contextText;
                  })()}
                </Text>
              </View>
            ) : (
              /* Score Metric Template (existing logic for scored metrics) */
              <>
                {/* Type 1: Score Display (0-100) */}
                {metricDisplayInfo.displayType === 'score' && metricDisplayInfo.isScore && (
                  <>
                    {/* New score/context row layout */}
                    <View style={{ flexDirection: 'row', alignItems: 'flex-start', width: '100%', marginBottom: 8 }}>
                      {/* Score Box - 1/3 width, with score */}
                      <View style={{
                        width: '33%',
                        backgroundColor: bg,
                        borderRadius: 12,
                        justifyContent: 'center',
                        alignItems: 'center',
                        paddingVertical: 12,
                        marginRight: 12,
                      }}>
                        <Text style={{ fontSize: 18, fontWeight: '600', color: '#222', textAlign: 'center' }}>
                          {Number.isFinite(Number(metricValue)) ? Number(metricValue) : '--'}
                        </Text>
                      </View>
                      {/* Context Text - 2/3 width */}
                      <View style={{ width: '67%', justifyContent: 'flex-start', paddingTop: 4 }}>
                        <Text style={{ fontSize: 14, lineHeight: 20, color: '#555' }}>
                          {getSmartContextText(metricValue, metricKey, currentConcernDetails)}
                        </Text>
                      </View>
                    </View>
                  </>
                )}

                {/* Type 2: Category Display (e.g., Skin Type) & Type 3: Age Value Display */}
                {(metricDisplayInfo.displayType === 'category' || metricDisplayInfo.displayType === 'age') && (
                  <View style={styles.iconTypeCardContent}>
                    <Text style={styles.iconTypeValueText}>
                      {metricDisplayInfo.valueDisplay}
                    </Text>
                    <Feather name="star" size={48} color="gray" style={styles.placeholderIcon} />
                    <Text style={styles.metricDescription}>
                      {metricDisplayInfo.description}
                    </Text>
                  </View>
                )}
                
                {/* Fallback for non-score, non-category, non-age types if any (or other numeric that didn't fit above) */}
                {metricDisplayInfo.displayType === 'score' && !metricDisplayInfo.isScore && (
                   <View style={styles.iconTypeCardContent}>
                    <Text style={styles.iconTypeValueText}>
                      {metricDisplayInfo.valueDisplay}
                    </Text>
                    {/* Could also use a different icon or no icon for generic numeric */}
                    <Feather name="info" size={48} color="gray" style={styles.placeholderIcon} /> 
                    <Text style={styles.metricDescription}>
                      {metricDisplayInfo.description}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>
        </View>
        
        {/* Mask Image Section */}
        {(() => {
          const conditionName = getConditionNameForMetric(metricKey);
          console.log('🔵 conditionName:', conditionName);
          const maskImageData = parsedPhotoData?.maskImages?.filter(image => image.skin_condition_name === conditionName)[0];
          console.log('🔵 maskImageData:', maskImageData);
          
          if (conditionName && maskImageData?.mask_img_url) {
            return (
              <View style={{ marginHorizontal: 16 }}>
                <Text style={styles.sectionTitle}>Analysis Visualization</Text>
                <View style={styles.metricCard}>
                  <Text style={styles.maskImageDescription}>
                    This visualization shows the analyzed areas for {formatMetricName(metricKey).toLowerCase()} on your face.
                  </Text>
                  <View style={styles.maskImageContainer}>
                    <Image 
                      source={{ uri: sanitizeS3Uri(maskImageData.mask_img_url) }}
                      style={styles.maskImage}
                      resizeMode="contain"
                      onError={(error) => {
                        console.log('🔴 Error loading mask image:', error.nativeEvent.error);
                      }}
                      onLoad={() => {
                        console.log('✅ Mask image loaded successfully for:', conditionName);
                      }}
                    />
                  </View>
                  <Text style={styles.maskImageNote}>
                    Highlighted areas indicate regions where {formatMetricName(metricKey).toLowerCase()} was detected and analyzed.
                  </Text>
                </View>
              </View>
            );
          }
          return null;
        })()}
        
        {/* Trend/History Card */}
        <View style={{ marginHorizontal: 16 }}>
          <Text style={styles.sectionTitle}>Trend</Text>
          <View style={styles.metricCard}>
            {analyzedPhotos.length > 0 ? (
              <MetricsSeries_simple
                photos={analyzedPhotos}
                metricKeyToDisplay={metricKey}
                chartHeight={100}
                pointsVisibleInWindow={5}
                showXAxisLabels={true}
                showYAxisLabels={true}
                chartBackgroundColor="#F8F8F8"
                scrollToEnd={true}
                onSelectionChange={handleChartSelection}
              />
            ) : (
              <Text style={styles.trendPlaceholderText}>No trend data available.</Text>
            )}
          </View>
        </View>
        
        {/* Content Section: Overview */}
        <View style={styles.contentSectionContainer}>
          <Text style={styles.contentSectionTitle}>Overview</Text>
          <Text style={styles.contentSectionText}>
            {currentConcernDetails ? currentConcernDetails.overview : 'Loading overview...'}
          </Text>
          {/* Placeholder for learn more if needed */}
        </View>

        {/* New Consolidated Section: What You Can Do */}
        {currentConcernDetails && (
          <View style={styles.contentSectionContainer}>
            <Text style={styles.contentSectionTitle}>
              {currentConcernDetails._isProfileMetric ? 'Further Steps' : 'What You Can Do'}
            </Text>
            <Text style={styles.microcopyText}>
              {currentConcernDetails._isProfileMetric 
                ? 'Explore topics related to this measurement and what it means for your skin.'
                : 'Upgrade your routine with these evidence-based solutions for real improvement.'
              }
            </Text>
            
            {/* Profile Metrics: Show Related Topics */}
            {currentConcernDetails._isProfileMetric && currentConcernDetails.relatedTopics ? (
              currentConcernDetails.relatedTopics.map((topic, index) => (
                <View key={index} style={{ marginBottom: 12 }}>
                  <ListItem
                    title={topic.title}
                    subtitle={topic.description}
                    icon="book-open"
                    iconColor="#6E46FF"
                    showChevron={true}
                    onPress={() => {
                      // console.log(`Tapped on profile topic: ${topic.title}`);
                      
                      // Create more informative initial message
                      let initialMessage = '';
                      const metricDisplayName = formatMetricName(metricKey);
                      
                      if (topic.title.includes('Understanding') || topic.title.includes('Anatomy')) {
                        initialMessage = `Your ${metricDisplayName.toLowerCase()} provides insights into your skin's characteristics and aging patterns. Understanding the science behind this measurement can help you make better skincare decisions. Would you like me to explain how this analysis works and what factors influence it?`;
                      } else if (topic.title.includes('Products') || topic.title.includes('Choosing')) {
                        initialMessage = `Different skin types and ages require different approaches to skincare products and ingredients. Your ${metricDisplayName.toLowerCase()} of ${metricValue} suggests specific considerations for product selection. Would you like personalized guidance on choosing the right products for your skin?`;
                      } else if (topic.title.includes('Prevention') || topic.title.includes('Strategies')) {
                        initialMessage = `Preventing aging and maintaining skin health involves understanding your current skin condition and taking proactive steps. Based on your ${metricDisplayName.toLowerCase()}, there are specific strategies that can help. Would you like me to share evidence-based prevention tips tailored to your results?`;
                      } else if (topic.title.includes('Treatment') || topic.title.includes('Professional')) {
                        initialMessage = `Professional treatments can address specific concerns related to your ${metricDisplayName.toLowerCase()}. Understanding which options are most suitable for your skin can help you make informed decisions. Would you like to explore treatment options that align with your skin's needs?`;
                      } else if (topic.title.includes('Seasonal') || topic.title.includes('Environmental')) {
                        initialMessage = `Your skin's needs can change based on environmental factors, seasons, and lifestyle. Your ${metricDisplayName.toLowerCase()} indicates certain characteristics that may require adjustments over time. Would you like tips on adapting your routine to different conditions?`;
                      } else {
                        // Generic fallback
                        initialMessage = `${topic.description} This relates to your ${metricDisplayName.toLowerCase()} of ${metricValue}. Would you like me to provide more detailed information about this topic?`;
                      }
                      
                      router.push({
                        pathname: '/(authenticated)/aiChat',
                        params: { 
                          initialMessage: initialMessage,
                        }
                      });
                    }}
                  />
                </View>
              ))
            ) : (
              /* Score Metrics: Show What You Can Do */
              currentConcernDetails.whatYouCanDo && currentConcernDetails.whatYouCanDo.map((item, index) => {
                // Choose icon based on type to match routine
                let iconName = 'help-circle';
                let iconColor = '#666';
                
                if (item.type === 'product') {
                  iconName = 'bottle-tonic-outline';
                  iconColor = colors.primary;
                } else if (item.type === 'activity') {
                  iconName = 'shower-head';
                  iconColor = '#009688';
                } else if (item.type === 'nutrition') {
                  iconName = 'coffee';
                  iconColor = '#FF9800';
                }

                return (
                  <View key={index} style={{ marginBottom: 12 }}>
                    <ListItem
                      title={item.text}
                      icon={iconName}
                      iconColor={iconColor}
                      showChevron={true}
                      onPress={() => {
                        // console.log(`Tapped on recommendation: ${item.text}`);
                        const message = item.initialChatMessage || `Tell me more about how ${item.text.toLowerCase()} can help my skin.`;
                        router.push({
                          pathname: '/(authenticated)/aiChat',
                          params: { 
                            initialMessage: message,
                          }
                        });
                      }}
                    />
                  </View>
                );
              })
            )}
          </View>
        )}

        {/* Space at bottom for better scrolling */}
        <View style={{ height: 40 }} />
      </ScrollView>
      
      {/* Floating Tooltip */}
      <FloatingTooltip
        visible={tooltip.visible}
        x={tooltip.x}
        y={tooltip.y}
        content={tooltip.content}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    paddingRight: 10,
    paddingVertical: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#000',
  },
  trackButton: {
    padding: 4,
  },
  scrollContainer: {
    flex: 1,
  },
  metricCard: {
    marginVertical: 16,
    padding: 12,
    backgroundColor: '#fff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metricValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  metricValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginRight: 12,
    color: '#111', // Standardized color
  },
  tagContainer: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  tagText: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  metricDescription: {
    fontSize: 16,
    color: '#555',
    marginTop: 8, // Added margin for spacing
    textAlign: 'center', // Center description for icon types
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  placeholderText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  },
  infoText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  learnMoreButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },
  learnMoreText: {
    color: '#6E46FF',
    fontWeight: '500',
  },
  placeholderChart: {
    height: 200,
    backgroundColor: '#f9f9f9',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#eee',
    borderStyle: 'dashed',
  },
  metricDetailItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  metricDetailName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 8,
  },
  metricDetailValue: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  valueText: {
    fontSize: 18,
    fontWeight: '600',
  },
  subMetricsContainer: {
    marginTop: 12,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eee',
  },
  subMetricItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 4,
  },
  subMetricName: {
    fontSize: 14,
    color: '#555',
  },
  subMetricValue: {
    fontSize: 14,
    fontWeight: '500',
  },
  regionContainer: {
    marginBottom: 20,
  },
  regionTitle: {
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  // Score bar styles
  scoreBarContainer: {
    marginTop: 16,
  },
  scoreBarBackground: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  scoreBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  scoreBarLabelBad: {
    fontSize: 12,
    color: '#999',
  },
  scoreBarLabelGood: {
    fontSize: 12,
    color: '#999',
    textAlign: 'right',
  },
  
  // Distribution bar styles
  distributionContainer: {
    marginTop: 16,
  },
  distributionBar: {
    flexDirection: 'row',
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 8,
  },
  distributionSegment: {
    height: '100%',
  },
  distributionLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  distributionLabel: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  distributionLabelSelected: {
    color: '#6E46FF',
    fontWeight: '500',
  },
  
  // Numeric value styles
  numericContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  numericValue: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#333',
  },
  numericUnit: {
    fontSize: 14,
    color: '#777',
    marginTop: 4,
  },
  
  // Timeline chart styles
  timelineContainer: {
    height: 200,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#eee',
  },
  timelineBackground: {
    flex: 1,
    padding: 16,
    justifyContent: 'flex-end',
    backgroundColor: '#f5f5f5',
  },
  timelineBars: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'flex-end',
    height: 120,
    marginBottom: 8,
  },
  timelineBarColumn: {
    alignItems: 'center',
  },
  timelineBar: {
    width: 16,
    borderRadius: 8,
    marginHorizontal: 4,
  },
  timelineDate: {
    fontSize: 10,
    color: '#999',
    marginTop: 4,
  },
  timelinePlaceholder: {
    textAlign: 'center',
    marginTop: 16,
    color: '#777',
    fontStyle: 'italic',
  },
  timelineLegend: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  timelineLegendText: {
    fontSize: 12,
    color: '#777',
  },
  timelineButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timelineButtonText: {
    fontSize: 12,
    color: '#6E46FF',
    marginRight: 4,
  },
  categoryValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  // Styles for Icon/Category/Age type card
  iconTypeCardContent: {
    alignItems: 'center', // Center content for icon display
    paddingVertical: 10,
  },
  iconTypeValueText: {
    fontSize: 32, // Prominent value display
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  placeholderIcon: {
    marginVertical: 10,
  },
  trendPlaceholderContainer: {
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 10, // Adjusted padding if component has its own vertical padding
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 8,
    backgroundColor: '#f9f9f9',
  },
  trendPlaceholderText: {
    fontSize: 14,
    color: '#aaa',
    textAlign: 'center',
    paddingVertical: 20, // Add some padding if only text is shown
  },
  contentSectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
    padding: 0,
    backgroundColor: '#fff',
    borderRadius: 8,
  },
  contentSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  contentSectionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
  },
  microcopyText: {
    fontSize: 12,
    lineHeight: 18,
    color: '#777',
    marginBottom: 15,
    fontStyle: 'italic',
  },
  recommendationList: {
    marginTop: 10,
  },
  recommendationItem: {
    flexDirection: 'row',
    alignItems: 'center', // Vertically align items in the center
    justifyContent: 'space-between', // Push caret to the right
    marginBottom: 12,
    paddingVertical: 12, // Increased padding for better touch area
    paddingHorizontal: 8, // Added horizontal padding
    backgroundColor: '#f9f9f9', // Slight background for item
    borderRadius: 6,
  },
  recommendationItemContent: { // Wrapper for icon and text
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1, // Allow this part to take up available space
  },
  recommendationIcon: {
    marginRight: 12,
    marginTop: 2, // Align icon slightly better with multi-line text
  },
  recommendationText: {
    flex: 1, // Allow text to wrap
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  actionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 6,
  },
  actionIcon: {
    marginRight: 10,
  },
  actionTextContainer: {
    flex: 1,
  },
  actionText: {
    fontSize: 14,
    color: '#333',
  },
  ratingChip: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    borderWidth: 1,
    alignSelf: 'center',
  },
  ratingChipText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  profileMetricContent: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  profileValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#111',
    marginBottom: 12,
  },
  profileIcon: {
    marginBottom: 12,
  },
  profileDescription: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    textAlign: 'center',
  },
  // Mask image styles
  maskImageContainer: {
    alignItems: 'center',
    marginVertical: 12,
  },
  maskImage: {
    width: '100%',
    height: 300,
    borderRadius: 12,
  },
  maskImageDescription: {
    fontSize: 14,
    color: '#555',
    marginBottom: 12,
    textAlign: 'center',
  },
  maskImageNote: {
    fontSize: 12,
    color: '#777',
    marginTop: 8,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});
