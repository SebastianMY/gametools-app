import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';

import { COLORS } from '../../styles/colors';
import { FONT_SIZE, FONT_WEIGHT, SPACING } from '../../styles/theme';
import { TabName } from './useNavigation';
import DiceScreen from '../Dice/DiceScreen';

const ScorePlaceholder: React.FC = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderTitle}>📊 Score</Text>
    <Text style={styles.placeholderSubtitle}>Coming soon</Text>
  </View>
);

const DrawPlaceholder: React.FC = () => (
  <View style={styles.placeholder}>
    <Text style={styles.placeholderTitle}>✋ Draw</Text>
    <Text style={styles.placeholderSubtitle}>Coming soon</Text>
  </View>
);

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
 * Placeholder screens for Score and Draw will be replaced by dedicated feature
 * screens in TASK-009 (Score) and TASK-013 (Draw). The Dice screen is now live.
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
          }}
        />
        <Tab.Screen
          name="Score"
          component={ScorePlaceholder}
          options={{
            title: 'Score',
            tabBarLabel: 'Score',
          }}
        />
        <Tab.Screen
          name="Draw"
          component={DrawPlaceholder}
          options={{
            title: 'Draw',
            tabBarLabel: 'Draw',
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
  placeholder: {
    flex: 1,
    backgroundColor: COLORS.background,
    alignItems: 'center',
    justifyContent: 'center',
    padding: SPACING.md,
  },
  placeholderTitle: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  placeholderSubtitle: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textSecondary,
  },
});

export default BottomTabNavigator;
