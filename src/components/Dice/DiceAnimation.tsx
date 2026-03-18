import React, { useEffect, useRef, memo } from 'react';
import { Animated, Easing, View, Text, StyleSheet } from 'react-native';
import { COLORS } from '../../styles/colors';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT } from '../../styles/theme';
import { SHADOWS } from '../../styles/globalStyles';

/**
 * Props for the DiceAnimation component.
 */
export interface DiceAnimationProps {
  /** Whether a roll is currently in progress (triggers spinning animation). */
  isRolling: boolean;
  /** Number of dice being rolled (determines how many dice are rendered during animation). */
  diceCount: number;
  /** Final die values to display after the animation completes. */
  diceValues: number[];
  /**
   * Animation duration in milliseconds.
   * Must be in the range 500–1500ms (per ADR-019). Defaults to 1000ms.
   */
  duration?: number;
  /** Called when the spin animation finishes so the parent can commit the final values. */
  onAnimationComplete?: () => void;
}

/**
 * DiceAnimation renders animated dice chips using React Native's built-in
 * Animated API (per ADR-004).
 *
 * Behaviour:
 * - When `isRolling` is true, each die chip spins two full rotations with an
 *   easeOut curve and displays "?" as a placeholder value.
 * - When `isRolling` becomes false, the chips show the final `diceValues`
 *   without any transform applied.
 * - Nothing is rendered when there are no dice to display.
 *
 * @example
 * <DiceAnimation
 *   isRolling={isRolling}
 *   diceCount={diceCount}
 *   diceValues={diceValues}
 *   duration={1000}
 *   onAnimationComplete={handleAnimationComplete}
 * />
 */
const DiceAnimation: React.FC<DiceAnimationProps> = ({
  isRolling,
  diceCount,
  diceValues,
  duration = 1000,
  onAnimationComplete,
}) => {
  // Single Animated.Value drives all dice simultaneously so they rotate in sync.
  const spinValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!isRolling) return;

    // Reset to start of rotation arc before each new roll.
    spinValue.setValue(0);

    Animated.timing(spinValue, {
      toValue: 1,
      duration,
      // easeOut: fast at start, decelerates at end — gives a natural "slowing down" feel.
      easing: Easing.out(Easing.ease),
      // Offload interpolation to the native thread for 60 FPS per NFR-P-001.
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) {
        onAnimationComplete?.();
      }
    });
  }, [isRolling, duration, spinValue, onAnimationComplete]);

  // Interpolate the 0→1 progress value to two full 360° rotations (720°).
  const spin = spinValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '720deg'],
  });

  // Determine how many dice chips to render.
  // While rolling, use diceCount; when stopped, use the actual result count.
  const chipCount = isRolling ? diceCount : diceValues.length;

  if (chipCount === 0) {
    return null;
  }

  return (
    <View style={styles.diceValuesRow} accessibilityLabel="Dice results">
      {Array.from({ length: chipCount }, (_, index) => {
        const label = isRolling
          ? `Die ${index + 1} rolling`
          : `Die ${index + 1}: ${diceValues[index]}`;

        return (
          <Animated.View
            key={index}
            style={[
              styles.dieChip,
              // Apply spin transform only while rolling.
              isRolling && { transform: [{ rotate: spin }] },
            ]}
            accessibilityLabel={label}
          >
            <Text style={styles.dieChipText}>
              {isRolling ? '?' : diceValues[index]}
            </Text>
          </Animated.View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  diceValuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  dieChip: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  dieChipText: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
});

/**
 * DiceAnimation is memoized so parent re-renders (e.g. score state changes)
 * do not re-render or re-trigger the animation unless props actually change.
 * NFR-P-001: 60 FPS animation target.
 */
export default memo(DiceAnimation);
