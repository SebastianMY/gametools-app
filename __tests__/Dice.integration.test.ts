/**
 * Dice Feature — Integration Tests
 *
 * Verifies that the dice selector works correctly, roll generates valid random
 * values, state transitions are correct, and results are consistent.
 *
 * Coverage targets: useRollDice hook, RandomService.rollDice
 */

import { renderHook, act } from '@testing-library/react-native';
import { useRollDice } from '../src/components/Dice/useRollDice';
import RandomService from '../src/services/RandomService';

// ─── RandomService ────────────────────────────────────────────────────────────

describe('RandomService.rollDice', () => {
  it('returns the correct number of dice values', () => {
    const results = RandomService.rollDice(3);
    expect(results).toHaveLength(3);
  });

  it('returns values in [1, 6] for a standard d6', () => {
    const results = RandomService.rollDice(100);
    results.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    });
  });

  it('returns an empty array when count is 0', () => {
    expect(RandomService.rollDice(0)).toEqual([]);
  });

  it('returns an empty array when count is negative', () => {
    expect(RandomService.rollDice(-1)).toEqual([]);
  });

  it('respects custom sides', () => {
    const results = RandomService.rollDice(200, 4);
    results.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(4);
    });
  });

  it('produces different results across multiple rolls (statistical randomness)', () => {
    const roll1 = RandomService.rollDice(6).join(',');
    const roll2 = RandomService.rollDice(6).join(',');
    const roll3 = RandomService.rollDice(6).join(',');
    // At least one pair should differ after 3 independent 6-die rolls
    const allSame = roll1 === roll2 && roll2 === roll3;
    // Probability all three 6-die rolls are identical: (1/6)^5 * (1/6)^5 ≈ 1.5e-7
    expect(allSame).toBe(false);
  });
});

// ─── useRollDice — selector ───────────────────────────────────────────────────

describe('useRollDice — dice selector', () => {
  it('initialises with diceCount=1', () => {
    const { result } = renderHook(() => useRollDice());
    expect(result.current.diceCount).toBe(1);
  });

  it('updates diceCount on selectDiceCount', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(4);
    });
    expect(result.current.diceCount).toBe(4);
  });

  it('clamps diceCount to minimum 1', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(0);
    });
    expect(result.current.diceCount).toBe(1);
  });

  it('clamps diceCount to maximum 6', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(10);
    });
    expect(result.current.diceCount).toBe(6);
  });

  it('accepts all valid counts 1–6', () => {
    const { result } = renderHook(() => useRollDice());
    for (let count = 1; count <= 6; count++) {
      act(() => {
        result.current.selectDiceCount(count);
      });
      expect(result.current.diceCount).toBe(count);
    }
  });
});

// ─── useRollDice — rolling ────────────────────────────────────────────────────

describe('useRollDice — roll generates random values', () => {
  it('starts with empty diceValues before first roll', () => {
    const { result } = renderHook(() => useRollDice());
    expect(result.current.diceValues).toEqual([]);
  });

  it('starts with totalSum=0 before first roll', () => {
    const { result } = renderHook(() => useRollDice());
    expect(result.current.totalSum).toBe(0);
  });

  it('rolls the correct number of dice matching diceCount', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(3);
    });
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.diceValues).toHaveLength(3);
  });

  it('generates values between 1 and 6 inclusive', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(6);
    });
    act(() => {
      result.current.rollDice();
    });
    result.current.diceValues.forEach(val => {
      expect(val).toBeGreaterThanOrEqual(1);
      expect(val).toBeLessThanOrEqual(6);
    });
  });

  it('calculates totalSum as the sum of all diceValues', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(6);
    });
    act(() => {
      result.current.rollDice();
    });
    const expectedSum = result.current.diceValues.reduce((acc, v) => acc + v, 0);
    expect(result.current.totalSum).toBe(expectedSum);
  });

  it('isRolling is false after rollDice completes synchronously', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.isRolling).toBe(false);
  });

  it('updates results on repeated rolls', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(6);
    });
    act(() => {
      result.current.rollDice();
    });
    const firstSum = result.current.totalSum;

    // After 10 more rolls at 6 dice, total sum is very unlikely to stay identical
    let different = false;
    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.rollDice();
      });
      if (result.current.totalSum !== firstSum) {
        different = true;
        break;
      }
    }
    expect(different).toBe(true);
  });
});

// ─── useRollDice — animation state ───────────────────────────────────────────

describe('useRollDice — animation completes and results display', () => {
  it('diceValues array length matches diceCount=1 after roll', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.diceValues).toHaveLength(1);
  });

  it('diceValues array length matches diceCount=6 after roll', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(6);
    });
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.diceValues).toHaveLength(6);
  });

  it('rolling 1 die produces totalSum in range [1,6]', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(1);
    });
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.totalSum).toBeGreaterThanOrEqual(1);
    expect(result.current.totalSum).toBeLessThanOrEqual(6);
  });

  it('rolling 6 dice produces totalSum in range [6,36]', () => {
    const { result } = renderHook(() => useRollDice());
    act(() => {
      result.current.selectDiceCount(6);
    });
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.totalSum).toBeGreaterThanOrEqual(6);
    expect(result.current.totalSum).toBeLessThanOrEqual(36);
  });
});
