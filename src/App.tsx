import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { StatusBar } from 'expo-status-bar';

/**
 * Root application component.
 *
 * This is the entry point for all UI rendering.
 * Navigation and feature modules will be mounted here in subsequent tasks.
 */
const App: React.FC = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Companion</Text>
      <Text style={styles.subtitle}>Your portable game toolkit</Text>
      <StatusBar style="auto" />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
  },
});

export default App;
