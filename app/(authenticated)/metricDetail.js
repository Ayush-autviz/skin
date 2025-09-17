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

const dummyPhotos = [
  {
    skin_result_id: "1",
    created_at: { seconds: 1694457600, nanoseconds: 0 }, // Sep 12, 2023
    skin_type: "Dry",
  },
  {
    skin_result_id: "2",
    created_at: { seconds: 1695062400, nanoseconds: 0 }, // Sep 19, 2023
    skin_type: "Normal",
  },
  {
    skin_result_id: "3",
    created_at: { seconds: 1695667200, nanoseconds: 0 }, // Sep 26, 2023
    skin_type: "Combination",
  },
  {
    skin_result_id: "4",
    created_at: { seconds: 1696272000, nanoseconds: 0 }, // Oct 3, 2023
    skin_type: "Oily",
  },
  {
    skin_result_id: "5",
    created_at: { seconds: 1696876800, nanoseconds: 0 }, // Oct 10, 2023
    skin_type: "Dry",
  },
  {
    skin_result_id: "1",
    created_at: { seconds: 1694457600, nanoseconds: 0 }, // Sep 12, 2023
    skin_type: "Dry",
  },
  {
    skin_result_id: "2",
    created_at: { seconds: 1695062400, nanoseconds: 0 }, // Sep 19, 2023
    skin_type: "Normal",
  },
  {
    skin_result_id: "3",
    created_at: { seconds: 1695667200, nanoseconds: 0 }, // Sep 26, 2023
    skin_type: "Combination",
  },
  {
    skin_result_id: "4",
    created_at: { seconds: 1696272000, nanoseconds: 0 }, // Oct 3, 2023
    skin_type: "Oily",
  },
  {
    skin_result_id: "5",
    created_at: { seconds: 1696876800, nanoseconds: 0 }, // Oct 10, 2023
    skin_type: "Dry",
  },
  {
    skin_result_id: "1",
    created_at: { seconds: 1694457600, nanoseconds: 0 }, // Sep 12, 2023
    skin_type: "Dry",
  },
  {
    skin_result_id: "2",
    created_at: { seconds: 1695062400, nanoseconds: 0 }, // Sep 19, 2023
    skin_type: "Normal",
  },
  {
    skin_result_id: "3",
    created_at: { seconds: 1695667200, nanoseconds: 0 }, // Sep 26, 2023
    skin_type: "Combination",
  },
  {
    skin_result_id: "4",
    created_at: { seconds: 1696272000, nanoseconds: 0 }, // Oct 3, 2023
    skin_type: "Oily",
  },
  {
    skin_result_id: "5",
    created_at: { seconds: 1696876800, nanoseconds: 0 }, // Oct 10, 2023
    skin_type: "Dry",
  },
];

const SKIN_TYPES = ['Dry', 'Normal', 'Combinational', 'Oily'];


const CHART_HEIGHT = 180;
const PADDING = 25;


import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  SafeAreaView,
  StatusBar,
  Image,
  ActivityIndicator,
  Dimensions
} from 'react-native';
import SvgUri from 'react-native-svg-uri';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { ConditionalImage } from '../../src/utils/imageUtils';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { usePhotoContext } from '../../src/contexts/PhotoContext';
import ListItem from '../../src/components/ui/ListItem';
import FloatingTooltip from '../../src/components/ui/FloatingTooltip';
import { colors } from '../../src/styles';
import useAuthStore from '../../src/stores/authStore';
import { getSkinTrendScores, getHautMaskImages } from '../../src/services/newApiService';
import { LineChart } from 'react-native-chart-kit';

// Import the JSON data
import concernsData from '../../data/concerns.json';
import MetricsSeries_simple from '../../src/components/analysis/MetricsSeries_simple';
import MetricsSeries from '../../src/components/analysis/MetricsSeries';

// Helper functions for perceived age chart
const calculateActualAge = (birthDate) => {
  if (!birthDate) return null;
  const birth = birthDate instanceof Date ? birthDate : new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
};

const getAgeComparisonColor = (perceivedAge, actualAge) => {
  if (!actualAge || !perceivedAge) return '#222';
  
  const ageDifference = perceivedAge - actualAge;
  
  if (ageDifference > 5) {
    return '#FF3B30'; // Red - perceived age is more than 5 years greater than actual age
  } else if (ageDifference > 0) {
    return '#FFB340'; // Yellow - perceived age is greater than actual age but within 5 years
  } else {
    return '#34C759'; // Green - perceived age is less than or equal to actual age (good)
  }
};

const getColorForScore = (score) => {
  if (score <= 30) return '#FF3B30';
  if (score <= 70) return '#FFB340';
  return '#34C759';
};

// Helper function to generate light version of a color
const getLightColor = (hexColor) => {
  if (!hexColor || hexColor === '#999999') return '#f0f0f0';
  
  switch (hexColor) {
    case '#FF3B30': return '#FFEBEA'; // Light red
    case '#FFB340': return '#FFF4E6'; // Light amber  
    case '#34C759': return '#E8F5E8'; // Light green
    default: return '#f0f0f0';
  }
};

const PerceivedAgeChart = ({ photos }) => {
  const { profile } = useAuthStore();
  
  // Process photos to get perceived age data
  const processedData = photos.map(photo => {
    let dateValue;
    const ts = photo.created_at;
    if (ts?.seconds && typeof ts.seconds === 'number') {
      dateValue = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
    } else if (ts instanceof Date) {
      dateValue = ts;
    } else if (typeof ts === 'string' || typeof ts === 'number') {
      dateValue = new Date(ts);
    } else {
      return null;
    }
    
    if (!(dateValue instanceof Date && !isNaN(dateValue.getTime()))) {
      return null;
    }

    return {
      photoId: photo.skin_result_id,
      date: dateValue,
      score: photo.skin_condition_score ?? null,
    };
  }).filter(item => item !== null);

  if (!processedData.length) {
    return <Text style={styles.trendPlaceholderText}>No perceived age data available.</Text>;
  }

  // Chart constants
  const barWidth = 10;
  const barRadius = 5;
  const barSlotWidth = 16;
  const plotAreaWidth = processedData.length * barSlotWidth;
  const chartHeight = 48;

  return (
    <View style={{ height: chartHeight + 40 }}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
        style={{ height: chartHeight }}
        contentContainerStyle={{ 
          paddingTop: 28,
          paddingRight: 16
        }}
      >
        <View style={[styles.plotArea, { width: plotAreaWidth, height: chartHeight }]}>
  {/* Y-Axis Grid Lines and Labels */}
  <View style={styles.gridContainer}>
    <View style={[styles.yAxisGridLine, { bottom: chartHeight - 1 }]} />
    <View style={[styles.yAxisGridLine, { bottom: chartHeight / 2 }]} />
    <View style={[styles.yAxisGridLine, { bottom: 0 }]} />
  </View>
  
  {/* Y-Axis Labels */}
  <View style={styles.yAxisLabelsContainer}>
    <Text style={styles.yAxisLabel}>100</Text>
    <Text style={styles.yAxisLabel}>50</Text>
    <Text style={styles.yAxisLabel}>0</Text>
  </View>
          
          {/* Bars */}
          {processedData.map((scoreData, index) => {
            const actualAge = calculateActualAge(profile?.birth_date);
            const color = getAgeComparisonColor(scoreData.score, actualAge);
            
            if (!scoreData.score || scoreData.score === null) {
              // Render null data indicator
              const xPosition = index * barSlotWidth;
              return (
                <View
                  key={scoreData.photoId}
                  style={[
                    styles.nullBarContainer,
                    {
                      left: xPosition,
                      bottom: chartHeight / 2 - 2,
                    }
                  ]}
                >
                  <View style={styles.nullBar} />
                </View>
              );
            }
            
            // Calculate bar height and position
            const barHeight = (scoreData.score / 100) * chartHeight;
            const xPosition = index * barSlotWidth;
            const isRecent = index >= processedData.length - 3;
            
            return (
              <View key={scoreData.photoId} style={{ 
                position: 'absolute', 
                left: xPosition, 
                bottom: 0, 
                width: barSlotWidth, 
                alignItems: 'center'
              }}>
                <View
                  style={{
                    width: barSlotWidth,
                    height: chartHeight,
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                  }}
                >
                  {/* Light background bar with shadow */}
                  <View
                    style={[
                      styles.bar,
                      {
                        width: barWidth,
                        height: Math.max(barHeight, 2),
                        borderRadius: barRadius,
                        backgroundColor: getLightColor(color),
                        opacity: isRecent ? 1 : 0.7,
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.2,
                        shadowRadius: 2,
                        elevation: 2,
                      }
                    ]}
                  />
                  
                  {/* Dark circle at top of bar */}
                  <View
                    style={[
                      styles.barCircle,
                      {
                        backgroundColor: color,
                        opacity: isRecent ? 1 : 0.7,
                        position: 'absolute',
                        bottom: Math.max(barHeight - 3, -1),
                        shadowColor: '#000',
                        shadowOffset: { width: 0, height: 1 },
                        shadowOpacity: 0.3,
                        shadowRadius: 2,
                        elevation: 3,
                      }
                    ]}
                  />
                </View>
              </View>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
};

const SkinTypeTrendChart = ({ photos }) => {
  // Process photos to get skin type data


  console.log("🔵 photos of SkinTypeTrendChart: in metricDetail.js", photos);

  const processedData = photos.map(photo => {
    let dateValue;
    const ts = photo.created_at;
    if (ts?.seconds && typeof ts.seconds === 'number') {
      dateValue = new Date(ts.seconds * 1000 + (ts.nanoseconds ? ts.nanoseconds / 1000000 : 0));
    } else if (ts instanceof Date) {
      dateValue = ts;
    } else if (typeof ts === 'string' || typeof ts === 'number') {
      dateValue = new Date(ts);
    } else {
      return null;
    }
    
    if (!(dateValue instanceof Date && !isNaN(dateValue.getTime()))) {
      return null;
    }

    return {
      photoId: photo.skin_result_id,
      date: dateValue,
      skinType: photo.skin_condition_type || photo.skinType || null,
    };
  }).filter(item => item !== null);

  if (!processedData.length) {
    return <Text style={styles.trendPlaceholderText}>No skin type data available.</Text>;
  }

  // Map skin types to numeric values for chart
  const skinTypeMap = {
    'Oily': 1,           // bottom
    'Combinational': 2,  // above oily
    'Normal': 3,         // above combination
    'Dry': 4            // top
  };

  // Prepare data for chart
  const realData = processedData.map(item => {
    if (!item.skinType || item.skinType === 'Unknown') return 2;
    return skinTypeMap[item.skinType] || 2;
  });
  
  const chartData = {
    labels: processedData.map((_, index) => `${index + 1}`),
    datasets: [
      {
        // 👀 Real user data
        data: realData,
        color: () => `#8b7ba8`,
        strokeWidth: 3
      },
      {
        // 👻 Hidden scaling dataset
        data: [1, 4],
        color: () => `transparent`, // hide line
        withDots: false,            // hide dots
        strokeWidth: 0              // hide stroke
      }
    ]
  };

  console.log("🔵 chartData of SkinTypeTrendChart: in metricDetail.js", chartData);

  const screenWidth = Dimensions.get('window').width;
  const chartWidth = screenWidth - 32; // Account for margins

  const renderYAxisLabels = () => {
    return <View style={{ flexDirection: 'column', gap: 10,paddingVertical:7,paddingHorizontal:4 }}>
    {SKIN_TYPES.map((skinType, index) => {
      const y = PADDING + (index / (SKIN_TYPES.length - 1)) * (CHART_HEIGHT - 2 * PADDING);
      return (
<View
  style={{
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)", // light border
    borderRadius: 16, // makes pill shape
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignSelf: "flex-start", // shrink to text size
    opacity: 0.7, // highlight active one
  }}
>
  <Text
    key={skinType}
    style={{
      fontSize: 12,
      color: "#333",
      fontWeight: "500",
    }}
  >
    {skinType}
  </Text>
</View>
      );
    })}
    </View>
  };

  return (
    <View style={styles.skinTypeChartContainer}>
      <ScrollView 
        horizontal 
        showsHorizontalScrollIndicator={false}
      >
        <LineChart
          data={chartData}
          width={Math.max(chartWidth, processedData.length * 40)}
          height={160}
          chartConfig={{
            backgroundColor: '#fff',
            backgroundGradientFrom: '#fff',
            backgroundGradientTo: '#fff',
            decimalPlaces: 0,
            color: (opacity = 1) => `rgba(110, 70, 255, ${opacity})`,
            labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            style: {
              borderRadius: 16
            },
            propsForDots: {
              r: '6',                 // dot radius
              strokeWidth: '2',       // border thickness
              stroke: '#fff',      // border color (purple)
              fill: '#8b7ba8',           // inside color (white makes border pop)
            },
            propsForBackgroundLines: {
              strokeDasharray: '',
              stroke: '#E0E0E0'
            }
          }}
          style={{
            marginVertical: 8,
            borderRadius: 16,
            marginLeft: 0
          }}
          bezier 
          withVerticalLabels={false}   // ❌ removes Y-axis numbers
          withHorizontalLabels={false} // ❌ removes X-axis numbers
          withInnerLines={true}        // keep dashed lines if you want
          withOuterLines={false}       // removes border lines
          
          yLabelsOffset={0}            // no extra spacing for labels
           withDots={true}
           withShadow={false}
        //  withInnerLines={true}
        //  withOuterLines={true}
          withVerticalLines={false}
          withHorizontalLines={true}
          segments={3}
        //  fromZero={false}
          yAxisMin={1}
          yAxisMax={4}
         yAxisInterval={1}
          // formatYLabel={(value) => {
          //   const numValue = parseFloat(value);
          //   if (numValue === 1) return 'Dry';
          //   if (numValue === 2) return 'Normal';
          //   if (numValue === 3) return 'Combination';
          //   if (numValue === 4) return 'Oily';
          //   return '';
          // }}
          // formatXLabel={(value) => {
          //   const index = parseInt(value) - 1;
          //   if (index >= 0 && index < processedData.length) {
          //     const date = processedData[index].date;
          //     return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          //   }
          //   return value;
          // }}
        />

      </ScrollView>

      <View style={styles.floatingYAxis}>
          {renderYAxisLabels()}
       </View>
      
      {/* Legend */}

    </View>
  );
};

// Helper function to map metric keys to condition names for mask images
const getHeaderNameForMetric = (metricKey) => {
  const mapping = {
    'rednessScore': 'Redness',
    'hydrationScore': 'Dewiness', 
    'eyeAge': 'Perceived Eye Age',
    'poresScore': 'Visible Pores',
    'acneScore': 'Breakouts',
    'linesScore': 'Lines',
    'translucencyScore': 'Translucency',
    'pigmentationScore': 'Pigmentation',
    'uniformnessScore': 'Evenness',
    'eyeAreaCondition': 'Eye Area Condition',
    'perceivedAge': 'Perceived Age',
    'skinTone': 'Skin Tone',
    'skinType': 'Skin Type'
  };
  
  return mapping[metricKey] || null;
};

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

// Helper function to map metric keys to skin condition names for trend API
const getSkinConditionNameForMetric = (metricKey) => {
  const mapping = {
    'rednessScore': 'redness',
    'hydrationScore': 'hydration', 
    'eyeAge': 'eyes_age',
    'poresScore': 'pores',
    'acneScore': 'acne',
    'linesScore': 'lines',
    'translucencyScore': 'translucency',
    'pigmentationScore': 'pigmentation',
    'uniformnessScore': 'uniformness',
    'eyeAreaCondition': 'eye_bags',
    'perceivedAge': 'age',
    'skinTone': 'skin_tone',
    'skinType': 'skin_type'
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
  // return encodeURI(uriString);
};

export default function MetricDetailScreen() {
  const router = useRouter();
  const params = useLocalSearchParams();
  const { user, profile } = useAuthStore();
  
  // Extract parameters from navigation
  const { metricKey, metricValue, photoData } = params || {};
  console.log('🔵 metricKey in metricDetail:', params);

  const [backgroundImageLoading, setBackgroundImageLoading] = useState(true);
  const [maskImageLoading, setMaskImageLoading] = useState(false);
  const [maskImages, setMaskImages] = useState(null);
  const [maskImagesLoading, setMaskImagesLoading] = useState(false);

  
  
  // Parse the photoData if it's a string
  const parsedPhotoData = typeof photoData === 'string' ? JSON.parse(photoData) : photoData;

  console.log(parsedPhotoData,'parsed photo data');
  
  // Fetch mask images when component loads
  useEffect(() => {
    const fetchMaskImages = async () => {
      if (!parsedPhotoData?.hautUploadData?.imageId) {
        console.log('🔴 No imageId available for fetching mask images');
        return;
      }
      
      try {
        setMaskImagesLoading(true);
        console.log('🔵 Fetching mask images for imageId:', parsedPhotoData.hautUploadData.imageId);
        
        const maskImagesData = await getHautMaskImages(parsedPhotoData.hautUploadData.imageId);
        console.log('✅ Mask images fetched successfully:', maskImagesData);
        
        setMaskImages(maskImagesData);
      } catch (error) {
        console.error('🔴 Error fetching mask images:', error);
        setMaskImages(null);
      } finally {
        setMaskImagesLoading(false);
      }
    };
    
    fetchMaskImages();
  }, [parsedPhotoData?.hautUploadData?.imageId]);
  

  
  // State for whether the current concern is being tracked by the user
  const [isConcernTracked, setIsConcernTracked] = useState(false);
  // State for the detailed content of the current concern
  const [currentConcernDetails, setCurrentConcernDetails] = useState(null);
  // State for tooltip
  const [tooltip, setTooltip] = useState({ visible: false, x: 0, y: 0, content: {} });
  // State for skin trend scores
  const [trendScores, setTrendScores] = useState(null);
  const [isLoadingTrends, setIsLoadingTrends] = useState(false);
  


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

  // useEffect to fetch skin trend scores
  useEffect(() => {
    const fetchTrendScores = async () => {
      if (!metricKey) return;
      
      const skinConditionName = getSkinConditionNameForMetric(metricKey);
      if (!skinConditionName) {
        console.log('⚠️ No skin condition mapping found for metric:', metricKey);
        return;
      }

      setIsLoadingTrends(true);
      try {
        console.log('🔵 Fetching trend scores for:', skinConditionName);
        const response = await getSkinTrendScores({ 
          skin_condition_name: skinConditionName 
        });

        console.log('🔵 response of getSkinTrendScores:', response);
        
        if (response.success) {
          console.log('✅ Trend scores loaded:', response.data);
          setTrendScores(response.data);
        }
      } catch (error) {
        console.error('🔴 Error fetching trend scores:', error);
        setTrendScores(null);
      } finally {
        setIsLoadingTrends(false);
      }
    };

    fetchTrendScores();
  }, [metricKey]);

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
          {/* <Text style={styles.headerTitle}>{formatMetricName(metricKey)}</Text> */}
          <Text style={styles.headerTitle}>{getHeaderNameForMetric(metricKey)}</Text>
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
          {/* <Text style={styles.sectionTitle}>{getLatestPhotoDateString()}</Text> */}
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
                {/* <Text style={{ fontSize: 14, lineHeight: 20, color: '#555' }}>
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
                </Text> */}
                 <Text style={{ fontSize: 14, lineHeight: 20, color: '#555' }}>
                  {(() => {
                    // Special handling for perceived age - use age guidance logic
                    if (metricKey === 'perceivedAge' && currentConcernDetails?.ageGuidance) {
                      const actualAge = calculateActualAge(profile?.birth_date);
                      const perceivedAge = Number(metricValue);
                      
                      if (!actualAge || !perceivedAge || isNaN(perceivedAge)) {
                        return 'Unable to compare ages. Please ensure your birth date is set in your profile.';
                      }
                      
                      const ageDifference = perceivedAge - actualAge;
                      let guidanceText = currentConcernDetails.ageGuidance.matchesActual;
                      
                      if (ageDifference < -2) {
                        guidanceText = currentConcernDetails.ageGuidance.youngerThanActual;
                      } else if (ageDifference > 2) {
                        guidanceText = currentConcernDetails.ageGuidance.olderThanActual;
                      }
                      
                      return guidanceText;
                    }

                    // Special handling for eye age - use age considerations
                    if (metricKey === 'eyeAge' && currentConcernDetails?.ageConsiderations) {
                      // Display the age considerations content directly
                      // Since ageConsiderations contains general eye aging information, not age-specific ranges
                      // return currentConcernDetails.ageConsiderations.earlierAging || 
                      //        currentConcernDetails.ageConsiderations.prevention || 
                      //        'Your eye age indicates specific considerations for eye care and maintenance.';
                      const actualAge = calculateActualAge(profile?.birth_date);
                      const perceivedAge = Number(metricValue);
                      
                      if (!actualAge || !perceivedAge || isNaN(perceivedAge)) {
                        return 'Unable to compare ages. Please ensure your birth date is set in your profile.';
                      }
                      
                      const ageDifference = perceivedAge - actualAge;
                      let guidanceText = currentConcernDetails.ageGuidance.matchesActual;
                      
                      if (ageDifference < -2) {
                        guidanceText = currentConcernDetails.ageGuidance.youngerThanActual;
                      } else if (ageDifference > 2) {
                        guidanceText = currentConcernDetails.ageGuidance.olderThanActual;
                      }
                      
                      return guidanceText;
                    }

                    // Special handling for skin type - prioritize type descriptions
                    if (metricKey === 'skinType' && currentConcernDetails?.typeDescriptions) {
                      const typeDesc = currentConcernDetails.scoreLevels[metricValue];
                      if (typeDesc && typeDesc.text) {
                        return typeDesc.text;
                      }
                    }

                     // Special handling for skin tone - prioritize type descriptions
                     if (metricKey === 'skinTone' && currentConcernDetails?.toneDescriptions) {
                      const toneDesc = currentConcernDetails.toneDescriptions[metricValue];
                      if (toneDesc && toneDesc.description) {
                        return toneDesc.description;
                      }
                    }
                    
                    // For other profile metrics, use existing logic
                    if (currentConcernDetails.scoreLevels) {
                      // For categorical metrics (like skin type), try direct lookup
                      if (currentConcernDetails.metricType === 'category' && currentConcernDetails.scoreLevels[metricValue]) {
                        return currentConcernDetails.scoreLevels[metricValue].text;
                      }
                      
                      // For numeric metrics (like age), use range lookup
                      const numericValue = Number(metricValue);
                      if (!isNaN(numericValue)) {
                        const scoreLevel = metricHelpers.getScoreLevelForValue(currentConcernDetails.scoreLevels, numericValue);
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
          
          // Don't show mask image for perceived eye age
          if (metricKey === 'eyeAge') {
            return null;
          }
          
          // Check if we have mask images data - use fetched mask images
          let maskImageData = null;
          
          // First try to use the fetched mask images
          if (maskImages && Array.isArray(maskImages)) {
            maskImageData = maskImages.find(image => image.skin_condition_name === conditionName);
            // If not found, try to find any mask image
            if (!maskImageData && maskImages.length > 0) {
              maskImageData = maskImages[0];
            }
          }
          
          // Fallback to photo data if no fetched mask images
          if (!maskImageData) {
            if (parsedPhotoData?.maskImages) {
              maskImageData = parsedPhotoData.maskImages.filter(image => image.skin_condition_name === conditionName)[0];
              if (!maskImageData && parsedPhotoData.maskImages.length > 0) {
                maskImageData = parsedPhotoData.maskImages[0];
              }
            } else if (parsedPhotoData?.maskResults) {
              maskImageData = parsedPhotoData.maskResults.find(result => result.skin_condition_name === conditionName);
              if (!maskImageData && parsedPhotoData.maskResults.length > 0) {
                maskImageData = parsedPhotoData.maskResults[0];
              }
            }
          }
          
          // If no mask data, show the original photo instead
          if (conditionName && (maskImageData?.mask_img_url || parsedPhotoData?.storageUrl)) {
            return (
              <View style={{ marginHorizontal: 16 }}>
                <Text style={styles.sectionTitle}>Face Mask</Text>
                <View style={styles.metricCard}>
                  {/* <Text style={styles.maskImageDescription}>
                    This mask shows the analyzed areas for {formatMetricName(metricKey).toLowerCase()} on your face.
                  </Text> */}
                  
                  {/* Show loading indicator while fetching mask images */}
                  {maskImagesLoading && (
                    <View style={styles.maskImagesLoadingContainer}>
                      <ActivityIndicator size="small" color={colors.primary} />
                      <Text style={styles.maskImagesLoadingText}>Loading analysis data...</Text>
                    </View>
                  )}
                  
                  <View style={styles.maskImageContainer}>
                    {/* Background Image - Use storageUrl if mask data not available */}
                    <Image
                      source={{ uri: sanitizeS3Uri(maskImageData?.image_url || parsedPhotoData?.storageUrl) }}
                      style={styles.backgroundImage}
                      resizeMode="cover"
                      onError={(error) => {
                        console.log('🔴 Error loading background image:', error.nativeEvent.error);
                        setBackgroundImageLoading(false);
                      }}
                      onLoad={() => {
                        console.log('✅ Background image loaded successfully');
                        setBackgroundImageLoading(false);
                      }}
                    />
                    
                    {/* Loading indicator for background image */}
                    {backgroundImageLoading && (
                      <View style={styles.imageLoadingContainer}>
                        <ActivityIndicator size="large" color={colors.primary} />
                        <Text style={styles.loadingText}>Loading image...</Text>
                      </View>
                    )}
                    
                    {/* Conditional Image Overlay (SVG or regular image) - Only show if mask data exists */}
                    {maskImageData?.mask_img_url && (
                      <View style={styles.svgOverlay}>
                        <ConditionalImage
                          source={{ uri: sanitizeS3Uri(maskImageData.mask_img_url) }}
                          style={styles.svgOverlay}
                          width="100%"
                          height="100%"
                          onError={(error) => {
                            console.log('🔴 Error loading mask image:', error);
                            setMaskImageLoading(false);
                          }}
                          onLoad={() => {
                            console.log('✅ Mask image loaded successfully for:', conditionName);
                            setMaskImageLoading(false);
                          }}
                        />
                      </View>
                    )}
                  </View>
                  {/* <Text style={styles.maskImageNote}>
                    {maskImageData?.mask_img_url 
                      ? `Highlighted areas indicate regions where ${formatMetricName(metricKey).toLowerCase()} was detected and analyzed.`
                      : `Analysis visualization for ${formatMetricName(metricKey).toLowerCase()}.`
                    }
                  </Text> */}
                  {/* <Text style={styles.maskImageNote}> */}
                    {currentConcernDetails?.maskVerbiage && Array.isArray(currentConcernDetails.maskVerbiage) ? (
                      <View style={styles.maskVerbiageContainer}>
                        {currentConcernDetails.maskVerbiage.map((verbiage, index) => (
                          <View key={index} style={styles.maskVerbiageItem}>
                            <View style={styles.maskVerbiageBullet} />
                            <Text style={styles.maskVerbiageText}>
                              {verbiage}
                            </Text>
                          </View>
                        ))}
                      </View>
                    ) : (
                      currentConcernDetails?.maskVerbiage || `Analysis visualization for ${formatMetricName(metricKey).toLowerCase()}.`
                    )}
                  {/* </Text> */}
                </View>
              </View>
            );
          }
          return null;
        })()}
        
        {/* Trend/History Card - Show for skin score metrics and perceived age */}
        {(!currentConcernDetails?._isProfileMetric || metricKey === 'perceivedAge' || metricKey === 'eyeAge' || metricKey === 'skinType') && (
          <View style={{ marginHorizontal: 16 }}>
            <Text style={styles.sectionTitle}>Trend</Text>
            <View style={styles.metricCard}>
              {trendScores && trendScores.length > 0 ? (
                metricKey === 'perceivedAge' || metricKey === 'eyeAge' ? (
                  <PerceivedAgeChart photos={trendScores} />
                ) : metricKey === 'skinType' ? (
                  <SkinTypeTrendChart photos={trendScores} />
                ) : (
                  <MetricsSeries_simple
                    photos={trendScores}
                    metricKeyToDisplay={metricKey}
                    chartHeight={100}
                    pointsVisibleInWindow={5}
                    showXAxisLabels={true}
                    showYAxisLabels={true}
                    chartBackgroundColor="#F8F8F8"
                    scrollToEnd={true}
                    onSelectionChange={handleChartSelection}
                  />
                )
              ) : (
                <Text style={styles.trendPlaceholderText}>No trend data available.</Text>
              )}
            </View>
          </View>
        )}

        {/* Content Section: Overview or Age Guidance */}
        <View style={styles.contentSectionContainer}>
         
            <>
              <Text style={styles.contentSectionTitle}>Overview</Text>
              <Text style={styles.contentSectionText}>
                {currentConcernDetails ? currentConcernDetails.overview : 'Loading overview...'}
              </Text>
            </>
          
        </View>

        {/* Skin Type Details Section */}
        {metricKey === 'skinType' && currentConcernDetails?.typeDescriptions && (
          <View style={styles.contentSectionContainer}>
            <Text style={styles.contentSectionTitle}>Skin Type Details</Text>
            <View style={styles.descriptionCard}>
              {currentConcernDetails?.typeDescriptions[metricValue] && (
                <>
                  <View style={styles.descriptionHeader}>
                    {/* <View style={styles.descriptionIconContainer}>
                      <Feather name="droplet" size={20} color={colors.primary} />
                    </View> */}
                    <Text style={styles.descriptionTitle}>{metricValue}</Text>
                  </View>
                  <Text style={styles.descriptionText}>
                    {currentConcernDetails?.typeDescriptions[metricValue]?.description}
                  </Text>
                  {currentConcernDetails?.typeDescriptions[metricValue]?.characteristics && (
                    <View style={styles.characteristicsContainer}>
                      <Text style={styles.characteristicsTitle}>Key Characteristics:</Text>
                      {Array.isArray(currentConcernDetails?.typeDescriptions[metricValue]?.characteristics) ? (
                        currentConcernDetails.typeDescriptions[metricValue].characteristics.map((char, index) => (
                          <View key={index} style={styles.characteristicItem}>
                            <View style={styles.characteristicBullet} />
                            <Text style={styles.characteristicText}>{char}</Text>
                          </View>
                        ))
                      ) : (
                        <View style={styles.characteristicItem}>
                          <View style={styles.characteristicBullet} />
                          <Text style={styles.characteristicText}>
                            {currentConcernDetails?.typeDescriptions[metricValue]?.characteristics}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {currentConcernDetails?.typeDescriptions[metricValue]?.careApproach && (
                    <View style={styles.careApproachContainer}>
                      <Text style={styles.careApproachTitle}>Care Approach:</Text>
                      <Text style={styles.careApproachText}>
                        {currentConcernDetails.typeDescriptions[metricValue].careApproach}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* Skin Tone Details Section */}
        {metricKey === 'skinTone' && currentConcernDetails?.toneDescriptions && (
          <View style={styles.contentSectionContainer}>
            <Text style={styles.contentSectionTitle}>Skin Tone Details</Text>
            <View style={styles.descriptionCard}>
              {currentConcernDetails?.toneDescriptions[metricValue] && (
                <>
                  <View style={styles.descriptionHeader}>
                    {/* <View style={styles.descriptionIconContainer}>
                      <Feather name="palette" size={20} color={colors.primary} />
                    </View> */}
                    <Text style={styles.descriptionTitle}>{metricValue}</Text>
                  </View>
                  {/* <Text style={styles.descriptionText}>
                    {currentConcernDetails?.toneDescriptions[metricValue]?.description}
                  </Text> */}
                  {currentConcernDetails?.toneDescriptions[metricValue]?.characteristics && (
                    <View style={styles.characteristicsContainer}>
                      <Text style={styles.characteristicsTitle}>Key Characteristics:</Text>
                      {Array.isArray(currentConcernDetails?.toneDescriptions[metricValue]?.characteristics) ? (
                        currentConcernDetails.toneDescriptions[metricValue].characteristics.map((char, index) => (
                          <View key={index} style={styles.characteristicItem}>
                            <View style={styles.characteristicBullet} />
                            <Text style={styles.characteristicText}>{char}</Text>
                          </View>
                        ))
                      ) : (
                        <View style={styles.characteristicItem}>
                          <View style={styles.characteristicBullet} />
                          <Text style={styles.characteristicText}>
                            {currentConcernDetails?.toneDescriptions[metricValue]?.characteristics}
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                  {currentConcernDetails?.toneDescriptions[metricValue]?.considerations && (
                    <View style={styles.considerationsContainer}>
                      <Text style={styles.considerationsTitle}>Special Considerations:</Text>
                      <Text style={styles.considerationsText}>
                        {currentConcernDetails.toneDescriptions[metricValue].considerations}
                      </Text>
                    </View>
                  )}
                </>
              )}
            </View>
          </View>
        )}

        {/* New Consolidated Section: What You Can Do */}
        {/* {currentConcernDetails && (
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
                        
                        initialMessage = `${topic.description} This relates to your ${metricDisplayName.toLowerCase()} of ${metricValue}. Would you like me to provide more detailed information about this topic?`;
                      }
                      

                      const firstName = profile?.user_name || user?.user_name || 'there';
                      
                      router.push({
                        pathname: '/(authenticated)/threadChat',
                        params: {
                          chatType: 'general_chat',
                          initialMessage: initialMessage
                        }
                      });
                    }}
                  />
                </View>
              ))
            ) : (
              
              currentConcernDetails.whatYouCanDo && currentConcernDetails.whatYouCanDo.map((item, index) => {
                
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
                      
                        const message = item.initialChatMessage || `Tell me more about how ${item.text.toLowerCase()} can help my skin.`;
                      
                        const firstName = profile?.user_name || user?.user_name || 'there';
                        
                        router.push({
                          pathname: '/(authenticated)/threadChat',
                          params: {
                            chatType: 'general_chat',
                            initialMessage: message
                          }
                        });
                      }}
                    />
                  </View>
                );
              })
            )}
          </View>
        )} */}

                {/* Advice Details Section */}
        {currentConcernDetails?.advice && (
          <View style={styles.contentSectionContainer}>
            <Text style={styles.contentSectionTitle}>For your Consideration</Text>
            
            {/* Disclaimer - Moved to top with attractive styling */}
            {currentConcernDetails.advice?.disclaimer && (
              <View style={styles.disclaimerContainer}>
                <View style={styles.disclaimerIconContainer}>
                  <Feather name="info" size={20} color="#fff" />
                </View>
                <Text style={styles.disclaimerText}>{currentConcernDetails.advice.disclaimer}</Text>
              </View>
            )}
  
            {/* Ingredients */}
            {currentConcernDetails.advice?.ingredients && currentConcernDetails.advice.ingredients.length > 0 && (
              <View style={styles.adviceItem}>
                <Text style={styles.adviceLabel}>Key Ingredients</Text>
                {currentConcernDetails.advice.ingredients.map((ingredient, index) => {
                  // Parse ingredient to get name and description
                  const colonIndex = ingredient.indexOf(':');
                  const ingredientName = colonIndex > 0 ? ingredient.substring(0, colonIndex) : ingredient;
                  const ingredientDesc = colonIndex > 0 ? ingredient.substring(colonIndex + 1).trim() : '';
                  
                  // const handleIngredientPress = () => {
                  //   // Create a personalized message about the ingredient
                  //   let initialMessage = '';
                    
                  //   if (ingredientDesc) {
                  //     // If we have a description, use it to create a more specific message
                  //     initialMessage = `I'm interested in learning more about ${ingredientName}. ${ingredientDesc} Can you tell me more about how this ingredient works and how I can incorporate it into my skincare routine?`;
                  //   } else {
                  //     // Fallback message if no description
                  //     initialMessage = `I'd like to learn more about ${ingredientName} and how it can benefit my skin. Can you explain how this ingredient works and provide recommendations for products that contain it?`;
                  //   }
                    
                  //   // Navigate to thread chat
                  //   router.push({
                  //     pathname: '/(authenticated)/threadChat',
                  //     params: {
                  //       chatType: 'general_chat',
                  //       initialMessage: initialMessage
                  //     }
                  //   });
                  // };

                  return (
                    <View 
                      key={index} 
                      style={styles.adviceCard}
                      // onPress={handleIngredientPress}
                      activeOpacity={0.8}
                    >
                      <View style={styles.adviceCardContent}>
                        <View style={styles.adviceCardLeft}>
                          {/* <View style={styles.adviceCardIcon}>
                            <Feather name="bottle-tonic-outline" size={20} color={colors.primary} />
                          </View> */}
                          <View style={styles.adviceCardText}>
                            <Text style={styles.adviceCardTitle}>{ingredient}</Text>
                            {/* {ingredientDesc && (
                              <Text style={styles.adviceCardSubtitle}>{ingredientDesc}</Text>
                            )} */}
                          </View>
                        </View>
                        {/* <Feather name="chevron-right" size={20} color="#999" /> */}
                      </View>
                    </View>
                  );
                })}
              </View>
            )}

            {/* Behavior */}
            {currentConcernDetails.advice?.Behavior && currentConcernDetails.advice.Behavior.length > 0 && (
              <View style={styles.adviceItem}>
                <Text style={styles.adviceLabel}>Lifestyle Tips</Text>
                {currentConcernDetails.advice.Behavior.map((behavior, index) => (
                  <View key={index} style={styles.adviceListItem}>
                    <Text style={styles.adviceListItemText}>•</Text>
                    <Text style={styles.adviceListItemText}>{behavior}</Text>
                  </View>
                ))}
              </View>
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
    marginBottom: 0,
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
  
  // Simple advice styles
  disclaimerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    padding: 16,
    backgroundColor: '#e3f2fd',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#2196f3',
  },
  disclaimerIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#2196f3',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  disclaimerText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#1565c0',
    fontWeight: '500',
    flex: 1,
  },
  adviceItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  adviceLabel: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 16,
    color: '#333',
    textAlign: 'center',
  },
  adviceText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  adviceListItem: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  adviceListItemText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
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
    position: 'relative',
    width: 350,
    height: 350,
    borderRadius: 12,
    overflow: 'hidden',
  },
  maskImage: {
    width: 450,
    height: 450,
    borderRadius: 12,
  },
  backgroundImage: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  svgOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 10,
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
  // Trend scores styles
  trendScoresContainer: {
    marginTop: 12,
  },
  trendScoreItem: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
  },
  trendScoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  trendScoreDate: {
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  trendScoreValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  trendScoreBar: {
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  trendScoreBarFill: {
    height: '100%',
    backgroundColor: '#6E46FF',
    borderRadius: 3,
  },
  loadingContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageLoadingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 12,
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
    fontSize: 14,
  },
  maskLoadingContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    width: '100%',
    padding: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  maskLoadingText: {
    marginLeft: 5,
    color: '#666',
    fontSize: 12,
  },
  maskImagesLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
    backgroundColor: '#f8f8f8',
    borderRadius: 8,
    marginBottom: 10,
  },
  maskImagesLoadingText: {
    marginLeft: 8,
    color: '#666',
    fontSize: 14,
  },
  // Chart styles for perceived age
  plotArea: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    marginLeft: 24,
  },
    // Age Guidance styles
    ageGuidanceContainer: {
      marginTop: 20,
      paddingTop: 20,
      borderTopWidth: 1,
      borderTopColor: '#eee',
    },
    ageGuidanceTitle: {
      fontSize: 16,
      fontWeight: '600',
      color: '#333',
      marginBottom: 16,
      textAlign: 'center',
    },
    ageGuidanceContent: {
      alignItems: 'center',
    },
    ageComparisonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 20,
      flexWrap: 'wrap',
    },
    ageComparisonItem: {
      alignItems: 'center',
      marginHorizontal: 8,
      minWidth: 60,
    },
    ageComparisonLabel: {
      fontSize: 12,
      color: '#666',
      marginBottom: 4,
      textAlign: 'center',
      fontWeight: '500',
    },
    ageComparisonValue: {
      fontSize: 18,
      fontWeight: 'bold',
      color: '#333',
      textAlign: 'center',
    },
    ageComparisonDivider: {
      marginHorizontal: 8,
      paddingVertical: 4,
    },
    guidanceTextContainer: {
      backgroundColor: '#f8f9fa',
      padding: 16,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: '#e9ecef',
      width: '100%',
    },
    guidanceText: {
      fontSize: 14,
      lineHeight: 20,
      color: '#555',
      textAlign: 'center',
      fontStyle: 'italic',
    },
  
  gridContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    height: '100%',
    justifyContent: 'space-between',
  },
  yAxisGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#f0f0f0',
  },
  yAxisLabelsContainer: {
    position: 'absolute',
    left: -30,
    top: 0,
    bottom: 0,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
   // padding:10,
    color: '#999',
    fontWeight: '500',
   // textAlign: 'right',
  
  },
  nullBarContainer: {
    position: 'absolute',
    width: 16,
    height: 16,
    justifyContent: 'center',
    alignItems: 'center',
    transform: [{ translateX: -8 }, { translateY: -8 }],
  },
  nullBar: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#dddddd',
  },
  bar: {
    width: 10,
    height: 2,
    borderRadius: 5,
    backgroundColor: '#333',
    opacity: 0.7,
    borderWidth: 0,
    borderColor: 'transparent',
  },
  barCircle: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  adviceCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  adviceCardContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    flex: 1,
  },
  floatingYAxis: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  adviceCardLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
  },
  adviceCardIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    marginTop: 2,
  },
  adviceCardText: {
    flex: 1,
    paddingRight: 8,
  },
  adviceCardTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
    lineHeight: 20,
  },
  adviceCardSubtitle: {
    fontSize: 13,
    color: '#666',
    lineHeight: 18,
  },

  // Description card styles for skin type and tone
  descriptionCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#f0f0f0',
    marginBottom: 8,
  },
  descriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f5f5f5',
  },
  descriptionIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  descriptionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    flex: 1,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 22,
    color: '#555',
    marginBottom: 20,
    // textAlign: 'justify',
  },
  characteristicsContainer: {
    backgroundColor: '#fafbfc',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e8eaed',
  },
  characteristicsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  characteristicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  characteristicBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginTop: 8,
    marginRight: 12,
    flexShrink: 0,
  },
  characteristicText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
    flex: 1,
  },

  // Care Approach styles for skin type
  careApproachContainer: {
    backgroundColor: '#fff8f0',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ffe4b3',
    marginTop: 16,
  },
  careApproachTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#d97706',
    marginBottom: 8,
  },
  careApproachText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#92400e',
    textAlign: 'justify',
  },

  // Considerations styles for skin tone
  considerationsContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#bae6fd',
    marginTop: 16,
  },
  considerationsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  considerationsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#0c4a6e',
    textAlign: 'justify',
  },

  // Mask verbiage styles
  maskVerbiageContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    marginBottom: 10,
    paddingHorizontal: 16,
  },
  maskVerbiageItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 8,
    width: '100%',
  },
  maskVerbiageBullet: {
    width: 7,
    height: 7,
    borderRadius: 3,
    backgroundColor: colors.primary,
    marginRight: 10,
    marginTop: 8,
    flexShrink: 0,
  },
  maskVerbiageText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
    textAlign: 'left',
    fontWeight: '500',
    flex: 1,
    flexWrap: 'wrap',
  },

  // Skin Type Chart styles
  skinTypeChartContainer: {
   // backgroundColor: '#F8F8F8',
    borderRadius: 12,
   // padding: 8,
    position: 'relative',
  },
  skinTypeLegend: {
    alignItems: 'center',
    marginTop: 8,
    paddingHorizontal: 16,
  },
  skinTypeLegendText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },

});
