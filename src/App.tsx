import React from 'react';
import { StatusBar } from 'expo-status-bar';

import BottomTabNavigator from './components/Navigation/BottomTabNavigator';

/**
 * Root application component.
 *
 * Renders the BottomTabNavigator which provides the three main feature tabs:
 * Dice, Score, and Draw. Feature screens are mounted inside the navigator.
 */
const App: React.FC = () => {
  return (
    <>
      <BottomTabNavigator />
      <StatusBar style="auto" />
    </>
  );
};

export default App;
