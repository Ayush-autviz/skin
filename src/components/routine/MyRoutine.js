// mobile/src/components/MyRoutine.js
// Component to display and manage the user's routine items

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function MyRoutine() {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>My Routine feature coming soon</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex:1, justifyContent:'center', alignItems:'center', backgroundColor:'#FFF'},
  text:{ fontSize:18, fontWeight:'600', color:'#8B7355' }
}); 