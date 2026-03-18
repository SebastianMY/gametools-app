import { useState, useCallback } from 'react';

/**
 * State shape returned by the useRollDice hook.
 * Matches the Dice Feature public interface defined in architecture §8.1.
 */
export interface UseRollDiceResult {
  /** Number of dice to roll (1–6). */
  diceCount: number;
  /** Whether a roll is currently in progress (used by TASK-008 for animations). */
  isRolling: boolean;
  /** Individual die values from the most recent roll. Empty before first roll. */
  diceValues: number[];
  /** Sum of all dice values from the most recent roll. 0 before first roll. */
  totalSum: number;
  /** Update the number of dice to roll. Clamped to 1–6. */
  selectDiceCount: (count: number) => void;
  /** Trigger a dice roll. Generates random values for each die. */
  rollDice: () => void;
}

/**
 * Custom hook encapsulating Dice feature state and roll logic.
 *
 * Manages diceCount, isRolling, diceValues, and totalSum.
 * Animation integration (isRolling flag usage) is handled in TASK-008.
 *
 * @example
 * const { diceCount, diceValues, totalSum, selectDiceCount, rollDice } = useRollDice();
 */
export function useRollDice(): UseRollDiceResult {
  const [diceCount, setDiceCount] = useState<number>(1);
  const [isRolling, setIsRolling] = useState<boolean>(false);
  const [diceValues, setDiceValues] = useState<number[]>([]);
  const [totalSum, setTotalSum] = useState<number>(0);

  const selectDiceCount = useCallback((count: number) => {
    // Clamp to valid range 1–6
    const clamped = Math.min(6, Math.max(1, count));
    setDiceCount(clamped);
  }, []);

  const rollDice = useCallback(() => {
    if (isRolling) return;

    setIsRolling(true);

    // Generate random values (1–6) for each die.
    // TASK-008 will wrap this with animation; for now we apply results immediately.
    const values = Array.from({ length: diceCount }, () =>
      Math.floor(Math.random() * 6) + 1,
    );
    const sum = values.reduce((acc, val) => acc + val, 0);

    setDiceValues(values);
    setTotalSum(sum);
    setIsRolling(false);
  }, [diceCount, isRolling]);

  return {
    diceCount,
    isRolling,
    diceValues,
    totalSum,
    selectDiceCount,
    rollDice,
  };
}
