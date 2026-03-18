import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import styles from './DiceScreen.styles';

/** Valid dice quantity options available in the selector. */
const DICE_OPTIONS = [1, 2, 3, 4, 5, 6] as const;
type DiceOption = (typeof DICE_OPTIONS)[number];

interface DiceSelectorProps {
  /** Currently selected number of dice (1–6). */
  selectedCount: number;
  /** Called when the user selects a new dice quantity. */
  onSelect: (count: number) => void;
}

/**
 * DiceSelector renders a row of 6 quantity buttons (1–6).
 *
 * The active selection is visually highlighted using the primary color.
 * Each button meets the 48×48 dp minimum touch target (see architecture §9.6).
 *
 * @example
 * <DiceSelector selectedCount={diceCount} onSelect={selectDiceCount} />
 */
const DiceSelector: React.FC<DiceSelectorProps> = ({ selectedCount, onSelect }) => {
  return (
    <View style={styles.selectorContainer}>
      <Text style={styles.selectorLabel}>Number of dice</Text>
      <View style={styles.selectorRow}>
        {DICE_OPTIONS.map((option: DiceOption) => {
          const isActive = option === selectedCount;
          return (
            <TouchableOpacity
              key={option}
              style={[styles.selectorButton, isActive && styles.selectorButtonActive]}
              onPress={() => onSelect(option)}
              accessibilityLabel={`${option} ${option === 1 ? 'die' : 'dice'}`}
              accessibilityHint={`Select ${option} ${option === 1 ? 'die' : 'dice'} to roll`}
              accessibilityRole="radio"
              accessibilityState={{ selected: isActive }}
            >
              <Text
                style={[
                  styles.selectorButtonText,
                  isActive && styles.selectorButtonTextActive,
                ]}
              >
                {option}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
};

export default DiceSelector;
