// MetricsSeries_simple.js
// React Native component for displaying a time series visualization of a single skin metric.
// Designed for use in metric detail screens.

/* ------------------------------------------------------
WHAT IT DOES:
- Displays a horizontally scrollable time series for a specific skin metric.
- Shows data points as interactive dots.
- Y-axis guides for score reference (0-100), conditionally displayed.
- X-axis labels for dates, conditionally displayed.

PROPS:
- photos[]: Array of photo objects, sorted by timestamp (oldest to newest).
  Expected structure per photo: { id: string, timestamp: Date-compatible, metrics: { [metricKey]: number } }
- metricKeyToDisplay: String key for the metric to display (e.g., 'hydrationScore').
- chartHeight (optional): Number, height of the plot area (default: 120).
- pointsVisibleInWindow (optional): Number, ideal number of points in initial view (default: 7).
- dotSize (optional): Number, diameter of the data point dots (default: 10).
- onPointPress (optional): Function, callback when a data point is pressed, receives { photoId, metricKey, score, date }.
- onSelectionChange (optional): Function, callback when a data point is selected or deselected, receives { visible: boolean, dataPoint: object, barIndex?: number, position?: { x: number, y: number } }.
- showXAxisLabels (optional): Boolean, whether to display X-axis labels (default: true).
- showYAxisLabels (optional): Boolean, whether to display Y-axis labels (default: true).
- scrollToEnd (optional): Boolean, whether to scroll to the end of the series when component mounts (default: false).

DEVELOPMENT HISTORY:
- Initial simple version based on single-metric chart.
- 2025-05-06: Added showXAxisLabels and showYAxisLabels props for adaptable display.
------------------------------------------------------*/

// **LLM Notes**
// - Don't change the file name or its location.
// - Keep this documentation updated with each change.
// - Only change ONE piece of logic or UI at a time.
// - Assume you will introduce breaking changes if you change multiple things.

import React, { useMemo, useState, useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, TouchableOpacity } from 'react-native';

const { width: screenWidth } = Dimensions.get('window');

// Retain for mapping metricKey to a user-friendly label if needed, or pass title as prop
const METRIC_LABELS = {
  acneScore: 'Acne',
  eyeAge: 'Eye Age',
  eyeAreaCondition: 'Eyes',
  hydrationScore: 'Hydration',
  linesScore: 'Wrinkles',
  perceivedAge: 'Perceived Age',
  pigmentationScore: 'Pigmentation',
  poresScore: 'Pores',
  rednessScore: 'Redness',
  translucencyScore: 'Translucency',
  uniformnessScore: 'Texture'
};

const getColorForScore = (score) => {
  if (score === null || score === undefined) return '#E0E0E0'; // Light gray for missing data
  if (score >= 70) return '#4CAF50'; // Green for good
  if (score >= 50) return '#FFC107'; // Amber for fair
  return '#F44336'; // Red for bad
};

const MetricsSeries_simple = ({ 
  photos,
  metricKeyToDisplay,
  chartHeight = 130,
  pointsVisibleInWindow = 7,
  dotSize = 10,
  onPointPress,
  onSelectionChange,
  showYAxisLabels = true,
  scrollToEnd = false
}) => {
  const [selectedBarIndex, setSelectedBarIndex] = useState(null);
  const scrollViewRef = useRef(null);

  const processedData = useMemo(() => {
    if (!photos || !photos.length || !metricKeyToDisplay) return [];
    return photos
      .map(photo => {
        let dateValue;
        // const ts = photo.timestamp;
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

        
        // return {
        //   photoId: photo.id,
        //   date: dateValue,
        //   score: photo.metrics?.[metricKeyToDisplay] ?? null,
        // };
        return {
          photoId: photo.skin_result_id,
          date: dateValue,
          score: photo.skin_condition_score ?? null,
        };
      })
      .filter(item => item !== null);
  }, [photos, metricKeyToDisplay]);

  // Add useEffect to scroll to end when component mounts or data changes
  useEffect(() => {
    if (scrollToEnd && scrollViewRef.current && processedData.length > 0) {
      // Small delay to ensure ScrollView is rendered
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: false });
      }, 100);
    }
  }, [scrollToEnd, processedData.length]);


  console.log('🔵 photo in processedData of MetricsSeries_simple:', photos);


  if (!processedData.length) {
    return (
      <View style={[styles.container, { height: 150 }]}> {/* Fixed card height */}
        <View style={[styles.chartArea, { height: chartHeight, justifyContent: 'center' }]}> {/* No title */}
          <Text style={styles.noDataText}>No data available for this period.</Text>
        </View>
      </View>
    );
  }

  const barWidth = 10;
  const barRadius = 5;
  const barSlotWidth = 16;
  const plotAreaWidth = processedData.length * barSlotWidth;

  const formatDateLabel = (date) => {
    if (!date) return '';
    const d = typeof date === 'object' && date.seconds
      ? new Date(date.seconds * 1000)
      : new Date(date);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Calculate padding for top/bottom (e.g., 8px) to avoid bars touching card edge
  const verticalPadding = 8;
  const effectiveChartHeight = 112 - verticalPadding * 2; // Card height minus padding

  return (
    <View style={[styles.container, { height: 112, backgroundColor: "#ffffff", paddingVertical: verticalPadding }]}>
      <View style={[styles.chartWrapper, { height: effectiveChartHeight }]}> 
        {/* Y-Axis Labels (Static) */}
        {showYAxisLabels && (
          <View style={[styles.yAxisLabelsContainer, { height: effectiveChartHeight }]}> 
            <Text style={styles.yAxisLabel}>100</Text>
            <Text style={styles.yAxisLabel}>50</Text>
            <Text style={styles.yAxisLabel}>0</Text>
          </View>
        )}
        <ScrollView 
          ref={scrollViewRef}
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={[styles.scrollView, { height: effectiveChartHeight }]} 
          contentContainerStyle={styles.scrollViewContent}
        >
          <View style={[styles.plotArea, {
            width: plotAreaWidth,
            height: effectiveChartHeight,
            marginLeft: showYAxisLabels ? 0 : 4,
            marginRight: 4,
            overflow: 'visible',
          }]}> 
            {/* Y-Axis Grid Lines (Optional) - Render behind bars */}
            {processedData.length > 0 && (
              <>
                <View style={[styles.yAxisGridLine, { bottom: effectiveChartHeight / 2 }]} />
                <View style={[styles.yAxisGridLine, { bottom: effectiveChartHeight - 1 }]} />
                <View style={[styles.yAxisGridLine, { bottom: 0 }]} />
              </>
            )}
            {/* Data Points (Bars) */}
            {processedData.map((dataPoint, index) => {
              if (dataPoint.score === null) return null;
              const barHeight = (dataPoint.score / 100) * effectiveChartHeight;
              const xPosition = index * barSlotWidth;
              const isSelected = selectedBarIndex === index;
              
              return (
                <View key={dataPoint.photoId || index} style={{ position: 'absolute', left: xPosition, bottom: 0, width: barSlotWidth, alignItems: 'center' }}>
                  <TouchableOpacity
                    style={[
                      styles.bar,
                      {
                        width: barWidth,
                        height: barHeight,
                        borderRadius: barRadius,
                        backgroundColor: getColorForScore(dataPoint.score),
                        position: 'relative',
                      }
                    ]}
                    onPress={() => {
                      const newIndex = isSelected ? null : index;
                      setSelectedBarIndex(newIndex);
                      
                      // Pass selection data to parent component
                      if (onSelectionChange) {
                        if (newIndex !== null) {
                          onSelectionChange({
                            visible: true,
                            dataPoint,
                            barIndex: newIndex,
                            // Position will be calculated by parent
                          });
                        } else {
                          onSelectionChange({ visible: false });
                        }
                      }
                    }}
                    activeOpacity={0.7}
                  />
                </View>
              );
            })}
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: 10,
    height: 150,
    justifyContent: 'center',
    overflow: 'visible',
  },
  chartWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    overflow: 'visible',
  },
  yAxisLabelsContainer: {
    width: 35,
    paddingRight: 5,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  yAxisLabel: {
    fontSize: 10,
    color: '#777',
  },
  scrollView: {},
  scrollViewContent: {
    flexDirection: 'column',
    overflow: 'visible',
  },
  chartArea: {
    alignItems: 'center',
  },
  plotArea: {
    position: 'relative',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E0E0E0',
    overflow: 'visible',
  },
  bar: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  noDataText: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  xAxisGridLine: {
    position: 'absolute',
    bottom: 0,
    top: 0,
    width: 1,
    backgroundColor: '#F0F0F0',
  },
  yAxisGridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  sectionContainer: {
    marginHorizontal: 16,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#222',
    marginBottom: 8,
    marginLeft: 4,
  },
  metricCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 2,
    width: '100%',
    minHeight: 150, // or whatever matches your chart/card
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default MetricsSeries_simple;