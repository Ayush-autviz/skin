// liqa.js
// LIQA WebView implementation route

/* ------------------------------------------------------
WHAT IT DOES
- Implements LIQA WebView integration
- Handles LIQA-specific camera flow
- Manages LIQA permissions and errors

DATA USED
- HAUT_API_KEY: API key for LIQA integration
- Camera permissions

DEV PRINCIPLES
- Keep LIQA implementation isolated
- Use vanilla JS
- Handle all WebView errors gracefully

NEXT STEPS
[ ] Implement error boundary
[ ] Add custom styling options
------------------------------------------------------*/

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default () => (
  <View style={styles.container}>
    <Text style={styles.text}>Feature coming soon</Text>
  </View>
);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#8B7355',
  },
}); 