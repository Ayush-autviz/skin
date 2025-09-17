// TrendChart.js
// Custom line chart component for skin type trends - Pixel Perfect

import React from 'react';
import { View, Text, StyleSheet, Dimensions, ScrollView } from 'react-native';
import { colors, spacing, typography } from '../../styles';

const { width } = Dimensions.get('window');
const CHART_WIDTH = width - 32;
const CHART_HEIGHT = 180;
const PADDING = 25;

// Exact data matching the screenshot pattern
const DEMO_DATA = [
  { time: 0, skinType: 'Combination' },
  { time: 1, skinType: 'Normal' },
  { time: 2, skinType: 'Dry' },
  { time: 3, skinType: 'Normal' },
  { time: 4, skinType: 'Normal' },
  { time: 5, skinType: 'Combination' },
  { time: 6, skinType: 'Normal' },
  { time: 7, skinType: 'Combination' },
  { time: 8, skinType: 'Dry' },
  { time: 9, skinType: 'Dry' },
];

// Reordered to match screenshot Y-axis (top to bottom)
const SKIN_TYPES = ['Oily', 'Combination', 'Normal', 'Dry'];

const TrendChart = () => {
  const getSkinTypeValue = (skinType) => {
    return SKIN_TYPES.indexOf(skinType);
  };

  const getChartCoordinates = (dataPoint) => {
    const chartAreaWidth = CHART_WIDTH - 2 * PADDING;
    const x = PADDING + (dataPoint.time / (DEMO_DATA.length - 1)) * chartAreaWidth;
    const skinTypeValue = getSkinTypeValue(dataPoint.skinType);
    const y = PADDING + (skinTypeValue / (SKIN_TYPES.length - 1)) * (CHART_HEIGHT - 2 * PADDING);
    return { x, y };
  };

  const renderDataPoints = () => {
    return DEMO_DATA.map((dataPoint, index) => {
      const { x, y } = getChartCoordinates(dataPoint);
      
      return (
        <View
          key={index}
          style={[
            styles.dataPoint,
            {
              left: x - 5,
              top: y - 5,
            }
          ]}
        />
      );
    });
  };

  const renderGridLines = () => {
    return SKIN_TYPES.map((skinType, index) => {
      const y = PADDING + (index / (SKIN_TYPES.length - 1)) * (CHART_HEIGHT - 2 * PADDING);
      return (
        <View
          key={skinType}
          style={[
            styles.gridLine,
            {
              top: y - 0.5,
              left: PADDING,
              width: CHART_WIDTH - 2 * PADDING,
            }
          ]}
        />
      );
    });
  };

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
    <View style={styles.container}>
      <Text style={styles.title}>Trend</Text>
      <View style={styles.chartContainer}>
        {/* Chart area with scroll */}
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          style={styles.scrollContainer}
          contentContainerStyle={styles.scrollContent}
        >
          <View style={styles.chartArea}>
            {/* Grid lines */}
            {renderGridLines()}
            
            {/* Simple curved line segments */}
            <View style={styles.lineContainer}>
              {DEMO_DATA.slice(0, -1).map((dataPoint, index) => {
                const current = getChartCoordinates(dataPoint);
                const next = getChartCoordinates(DEMO_DATA[index + 1]);
                
                const deltaX = next.x - current.x;
                const deltaY = next.y - current.y;
                
                // Simple curve with just 3 segments
                const segments = 3;
                
                return (
                  <View key={index}>
                    {Array.from({ length: segments }, (_, segIndex) => {
                      const t = segIndex / (segments - 1);
                      const nextT = (segIndex + 1) / (segments - 1);
                      
                      // Linear interpolation
                      const startX = current.x + deltaX * t;
                      const startY = current.y + deltaY * t;
                      const endX = current.x + deltaX * nextT;
                      const endY = current.y + deltaY * nextT;
                      
                      // Add a gentle upward curve
                      const curveAmount = 6; // Small curve
                      const curveFactor = Math.sin(t * Math.PI) * curveAmount;
                      const nextCurveFactor = Math.sin(nextT * Math.PI) * curveAmount;
                      
                      const curvedStartY = startY - curveFactor;
                      const curvedEndY = endY - nextCurveFactor;
                      
                      const segmentDeltaX = endX - startX;
                      const segmentDeltaY = curvedEndY - curvedStartY;
                      const segmentLength = Math.sqrt(segmentDeltaX * segmentDeltaX + segmentDeltaY * segmentDeltaY);
                      const segmentAngle = Math.atan2(segmentDeltaY, segmentDeltaX) * (180 / Math.PI);
                      
                      return (
                        <View
                          key={segIndex}
                          style={[
                            styles.curvedLineSegment,
                            {
                              left: startX,
                              top: curvedStartY - 1,
                              width: segmentLength,
                              transform: [{ rotate: `${segmentAngle}deg` }],
                            }
                          ]}
                        />
                      );
                    })}
                  </View>
                );
              })}
            </View>
            
            {/* Data points */}
            {renderDataPoints()}
          </View>
        </ScrollView>
        
        {/* Floating Y-axis labels over the chart */}
        <View style={styles.floatingYAxis}>
          {renderYAxisLabels()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 20,
    marginHorizontal: 16,
    marginVertical: 8,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  title: {
    fontSize: 20,
    fontWeight: '600',
    color: '#333333',
    marginBottom: 24,
    marginLeft: 4,
  },
  chartContainer: {
    position: 'relative',
    height: CHART_HEIGHT,
    width: '100%',
  },
  scrollContainer: {
    height: CHART_HEIGHT,
  },
  scrollContent: {
    minWidth: CHART_WIDTH,
  },
  chartArea: {
    position: 'relative',
    height: CHART_HEIGHT,
    width: CHART_WIDTH,
  },
  floatingYAxis: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  yAxisLabel: {
    position: 'absolute',
    fontSize: 12,
    fontWeight: '500',
    color: 'rgba(0, 0, 0, 0.6)',
    left: 8,
    width: 60,
    textAlign: 'left',
  },
  gridLine: {
    position: 'absolute',
    height: 1,
    backgroundColor: '#F0F0F0',
  },
  lineContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  lineSegment: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#8A7CA8',
    transformOrigin: 'left center',
  },
  curvedLineSegment: {
    position: 'absolute',
    height: 2.5,
    backgroundColor: '#8A7CA8',
    transformOrigin: 'left center',
  },
  dataPoint: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#8A7CA8',
    borderWidth: 2,
    borderColor: '#FFFFFF',
    shadowColor: '#8A7CA8',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
});

export default TrendChart;