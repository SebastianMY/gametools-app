import React from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRollDice } from './useRollDice';
import DiceSelector from './DiceSelector';
import styles from './DiceScreen.styles';

/**
 * DiceScreen is the main Dice feature component.
 *
 * Displays a dice quantity selector (1–6), a Roll button, and the results
 * of the most recent roll (individual die values and their sum).
 *
 * Accepts no props — all state is encapsulated in the useRollDice hook.
 * Animation behavior is wired up in TASK-008.
 *
 * @example
 * <DiceScreen />
 */
const DiceScreen: React.FC = () => {
  const { diceCount, isRolling, diceValues, totalSum, selectDiceCount, rollDice } =
    useRollDice();

  return (
    <ScrollView
      contentContainerStyle={styles.screen}
      keyboardShouldPersistTaps="handled"
    >
      {/* Selected dice count display */}
      <View style={styles.diceCountContainer}>
        <Text style={styles.diceCountLabel}>Rolling</Text>
        <Text
          style={styles.diceCountValue}
          accessibilityLabel={`${diceCount} ${diceCount === 1 ? 'die' : 'dice'} selected`}
        >
          {diceCount}
        </Text>
        <Text style={styles.diceCountLabel}>{diceCount === 1 ? 'die' : 'dice'}</Text>
      </View>

      {/* Dice quantity selector */}
      <DiceSelector selectedCount={diceCount} onSelect={selectDiceCount} />

      {/* Roll button */}
      <TouchableOpacity
        style={[styles.rollButton, isRolling && styles.rollButtonDisabled]}
        onPress={rollDice}
        disabled={isRolling}
        accessibilityLabel="Roll dice button, activates dice roll"
        accessibilityHint={`Rolls ${diceCount} ${diceCount === 1 ? 'die' : 'dice'} and shows results`}
        accessibilityRole="button"
        accessibilityState={{ disabled: isRolling }}
      >
        <Text style={styles.rollButtonLabel}>{isRolling ? 'Rolling…' : 'Roll'}</Text>
      </TouchableOpacity>

      {/* Roll results */}
      <View style={styles.resultsContainer}>
        <Text style={styles.resultsLabel}>Result</Text>

        {diceValues.length === 0 ? (
          <Text style={styles.emptyResultsText}>Tap Roll to start</Text>
        ) : (
          <>
            {/* Individual die values */}
            <View style={styles.diceValuesRow}>
              {diceValues.map((value, index) => (
                <View
                  key={index}
                  style={styles.dieChip}
                  accessibilityLabel={`Die ${index + 1}: ${value}`}
                >
                  <Text style={styles.dieChipText}>{value}</Text>
                </View>
              ))}
            </View>

            {/* Divider */}
            <View style={styles.sumDivider} />

            {/* Total sum */}
            <View style={styles.sumRow}>
              <Text style={styles.sumLabel}>Total</Text>
              <Text
                style={styles.sumValue}
                accessibilityLabel={`Total sum: ${totalSum}`}
              >
                {totalSum}
              </Text>
            </View>
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default DiceScreen;
