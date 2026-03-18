import React, { useState, useCallback, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';
import { useRollDice } from './useRollDice';
import DiceSelector from './DiceSelector';
import DiceAnimation from './DiceAnimation';
import RandomService from '../../services/RandomService';
import styles from './DiceScreen.styles';

/** Default animation duration in milliseconds (per ADR-019). */
const ROLL_ANIMATION_DURATION_MS = 1000;

/**
 * DiceScreen is the main Dice feature component.
 *
 * Displays a dice quantity selector (1–6), a Roll button, and the results
 * of the most recent roll (individual die values and their sum), rendered
 * via the animated DiceAnimation component.
 *
 * Roll flow:
 *  1. User taps Roll → RandomService generates final values immediately.
 *  2. DiceAnimation runs a 1-second easeOut spin, showing "?" placeholders.
 *  3. Once the animation completes, final values are committed to state and
 *     the sum total is updated.
 *
 * This ensures the animation and the actual random values are always in sync,
 * and rapid re-rolls cannot create state conflicts (the Roll button is
 * disabled while `isRolling` is true).
 *
 * @example
 * <DiceScreen />
 */
const DiceScreen: React.FC = () => {
  // Dice count selection is delegated to the existing hook (reuses its
  // clamped 1–6 logic and stable selectDiceCount callback).
  const { diceCount, selectDiceCount } = useRollDice();

  // Animation / result state managed locally so we can decouple the timing
  // of RandomService value generation from the moment values are displayed.
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [diceValues, setDiceValues] = useState<number[]>([]);

  // Store the RandomService result in a ref so handleAnimationComplete can
  // read it without a stale closure (avoids adding pendingValues to its deps).
  const pendingValuesRef = useRef<number[]>([]);

  const totalSum = diceValues.reduce((acc, val) => acc + val, 0);

  /**
   * Initiate a roll:
   *  - Guard against rapid re-rolls while animation is still running.
   *  - Generate final values via RandomService upfront (no async needed).
   *  - Flip `isRolling` to true, which triggers DiceAnimation's useEffect.
   */
  const handleRoll = useCallback(() => {
    if (isRolling) return;

    pendingValuesRef.current = RandomService.rollDice(diceCount, 6);
    setIsRolling(true);
  }, [isRolling, diceCount]);

  /**
   * Called by DiceAnimation when its Animated.timing finishes.
   * Commits the pre-computed values to state and clears the rolling flag.
   */
  const handleAnimationComplete = useCallback(() => {
    setDiceValues(pendingValuesRef.current);
    setIsRolling(false);
  }, []);

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
        onPress={handleRoll}
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

        {!isRolling && diceValues.length === 0 ? (
          <Text style={styles.emptyResultsText}>Tap Roll to start</Text>
        ) : (
          <>
            {/* Animated dice chips — spins while rolling, shows values after */}
            <DiceAnimation
              isRolling={isRolling}
              diceCount={diceCount}
              diceValues={diceValues}
              duration={ROLL_ANIMATION_DURATION_MS}
              onAnimationComplete={handleAnimationComplete}
            />

            {/* Sum total — hidden while rolling to avoid showing stale sum */}
            {!isRolling && diceValues.length > 0 && (
              <>
                <View style={styles.sumDivider} />
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
          </>
        )}
      </View>
    </ScrollView>
  );
};

export default DiceScreen;
