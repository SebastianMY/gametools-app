import React, { useEffect } from 'react';
import { StatusBar } from 'expo-status-bar';

import BottomTabNavigator from './components/Navigation/BottomTabNavigator';
import StorageService from './services/StorageService';

/**
 * Root application component.
 *
 * Renders the BottomTabNavigator which provides the three main feature tabs:
 * Dice, Score, and Draw. Feature screens are mounted inside the navigator.
 *
 * On mount, schedules AsyncStorage cleanup for sessions older than 60 days
 * (ADR-018) using InteractionManager so it never blocks the initial render
 * or startup animations (NFR-P-006).
 */
const App: React.FC = () => {
  useEffect(() => {
    // Schedule stale session cleanup after all startup interactions/animations
    // complete.  Uses InteractionManager internally so the UI thread is free
    // during the cold-launch critical path (NFR-P-006, <3 s cold-start target).
    StorageService.scheduleStartupCleanup();
  }, []);

  return (
    <>
      <BottomTabNavigator />
      <StatusBar style="auto" />
    </>
  );
};

export default App;
