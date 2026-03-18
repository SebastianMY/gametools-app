import React from 'react';
import { StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { COLORS } from '../../styles/colors';
import { FONT_SIZE, FONT_WEIGHT } from '../../styles/theme';
import { TabName } from './useNavigation';
import DiceScreen from '../Dice/DiceScreen';
import ScoreScreen from '../Score/ScoreScreen';
import DrawScreen from '../Draw/DrawScreen';

// ─── Tab param list ───────────────────────────────────────────────────────────

export type RootTabParamList = {
  [K in Capitalize<TabName>]: undefined;
};

// ─── Navigator ────────────────────────────────────────────────────────────────

const Tab = createBottomTabNavigator<RootTabParamList>();

/**
 * BottomTabNavigator renders the three main application tabs: Dice, Score, Draw.
 *
 * Wrap your app root with this component. It manages its own navigation state
 * via React Navigation's built-in mechanism, keeping the active tab across
 * re-renders and providing cross-platform tab bar styling.
 *
 * Each tab has a descriptive `tabBarAccessibilityLabel` so that VoiceOver (iOS)
 * and TalkBack (Android) announce the tab's purpose rather than just its title.
 */
const BottomTabNavigator: React.FC = () => {
  return (
    <NavigationContainer>
      <Tab.Navigator
        initialRouteName="Dice"
        screenOptions={{
          tabBarActiveTintColor: COLORS.primary,
          tabBarInactiveTintColor: COLORS.textSecondary,
          tabBarStyle: styles.tabBar,
          tabBarLabelStyle: styles.tabBarLabel,
          headerStyle: styles.header,
          headerTitleStyle: styles.headerTitle,
          headerTintColor: COLORS.textPrimary,
        }}
      >
        <Tab.Screen
          name="Dice"
          component={DiceScreen}
          options={{
            title: 'Dice',
            tabBarLabel: 'Dice',
            tabBarAccessibilityLabel: 'Dice roller tab',
          }}
        />
        <Tab.Screen
          name="Score"
          component={ScoreScreen}
          options={{
            title: 'Score',
            tabBarLabel: 'Score',
            tabBarAccessibilityLabel: 'Score tracker tab',
          }}
        />
        <Tab.Screen
          name="Draw"
          component={DrawScreen}
          options={{
            title: 'Draw',
            tabBarLabel: 'Draw',
            tabBarAccessibilityLabel: 'Draw and select tab',
          }}
        />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  tabBar: {
    backgroundColor: COLORS.background,
    borderTopColor: COLORS.border,
    borderTopWidth: 1,
  },
  tabBarLabel: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.normal,
  },
  header: {
    backgroundColor: COLORS.background,
  },
  headerTitle: {
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});

export default BottomTabNavigator;
