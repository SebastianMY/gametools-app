/**
 * Draw Feature — Integration Tests
 *
 * Verifies: touch detection, color assignment from the palette, stability timer
 * behaviour, winner selection randomness, and haptic trigger.
 *
 * Coverage targets: useWinnerSelection, useTouchHandling (logic), RandomService,
 * VibrationService.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import { useWinnerSelection } from '../src/components/Draw/useWinnerSelection';
import RandomService from '../src/services/RandomService';
import VibrationService from '../src/services/VibrationService';
import { TOUCH_COLORS } from '../src/styles/colors';
import { TouchPoint } from '../src/components/Draw/useTouchHandling';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTouches = (count: number): TouchPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    x: 100 + i * 30,
    y: 200 + i * 30,
    color: TOUCH_COLORS[i % TOUCH_COLORS.length],
  }));

// ─── TOUCH_COLORS palette — color assignment ──────────────────────────────────

describe('TOUCH_COLORS — palette and color assignment', () => {
  it('contains exactly 8 distinct colors', () => {
    expect(TOUCH_COLORS).toHaveLength(8);
    expect(new Set(TOUCH_COLORS).size).toBe(8);
  });

  it('each entry is a valid hex color string', () => {
    TOUCH_COLORS.forEach(color => {
      expect(color).toMatch(/^#[0-9A-Fa-f]{6}$/);
    });
  });

  it('cycles correctly beyond 8 via modulo', () => {
    // Index 8 → same as index 0
    expect(TOUCH_COLORS[8 % 8]).toBe(TOUCH_COLORS[0]);
    // Index 9 → same as index 1
    expect(TOUCH_COLORS[9 % 8]).toBe(TOUCH_COLORS[1]);
    // Index 15 → same as index 7
    expect(TOUCH_COLORS[15 % 8]).toBe(TOUCH_COLORS[7]);
  });

  it('assigns distinct colors for 8 simultaneous touches', () => {
    const assigned = Array.from({ length: 8 }, (_, i) => TOUCH_COLORS[i % 8]);
    expect(new Set(assigned).size).toBe(8);
  });
});

// ─── RandomService.selectRandomItem ──────────────────────────────────────────

describe('RandomService.selectRandomItem — winner selection randomness', () => {
  it('returns null for an empty array', () => {
    expect(RandomService.selectRandomItem([])).toBeNull();
  });

  it('returns the only element for a single-item array', () => {
    const item = { id: 'solo' };
    expect(RandomService.selectRandomItem([item])).toBe(item);
  });

  it('returns an element that exists in the array', () => {
    const touches = makeTouches(5);
    const winner = RandomService.selectRandomItem(touches);
    expect(winner).not.toBeNull();
    expect(touches.some(t => t.id === winner!.id)).toBe(true);
  });

  it('produces random distribution across many selections', () => {
    const touches = makeTouches(4);
    const counts: Record<string, number> = { '1': 0, '2': 0, '3': 0, '4': 0 };

    for (let i = 0; i < 200; i++) {
      const winner = RandomService.selectRandomItem(touches);
      if (winner) counts[winner.id]++;
    }

    // Each touch should be selected at least once in 200 trials (P(never) ≈ (3/4)^200 ≈ 0)
    Object.values(counts).forEach(c => {
      expect(c).toBeGreaterThan(0);
    });
  });
});

// ─── VibrationService — haptic trigger ───────────────────────────────────────

describe('VibrationService — haptic feedback', () => {
  it('triggerNotification resolves without throwing', async () => {
    await expect(VibrationService.triggerNotification()).resolves.toBeUndefined();
  });

  it('triggerSuccess resolves without throwing', async () => {
    await expect(VibrationService.triggerSuccess()).resolves.toBeUndefined();
  });

  it('triggerError resolves without throwing', async () => {
    await expect(VibrationService.triggerError()).resolves.toBeUndefined();
  });
});

// ─── useWinnerSelection — stability and winner selection ─────────────────────

describe('useWinnerSelection — initial state', () => {
  it('starts with winnerId=null', () => {
    const { result } = renderHook(() => useWinnerSelection([]));
    expect(result.current.winnerId).toBeNull();
  });

  it('starts with stabilityProgress=0', () => {
    const { result } = renderHook(() => useWinnerSelection([]));
    expect(result.current.stabilityProgress).toBe(0);
  });

  it('starts with isSelecting=false', () => {
    const { result } = renderHook(() => useWinnerSelection([]));
    expect(result.current.isSelecting).toBe(false);
  });
});

describe('useWinnerSelection — selectWinner (manual trigger)', () => {
  it('is a no-op when no touches are active', () => {
    const { result } = renderHook(() => useWinnerSelection([]));
    act(() => {
      result.current.selectWinner();
    });
    expect(result.current.winnerId).toBeNull();
    expect(result.current.isSelecting).toBe(false);
  });

  it('sets isSelecting=true and picks a winner from active touches', async () => {
    const touches = makeTouches(3);
    const { result } = renderHook(() => useWinnerSelection(touches));

    await act(async () => {
      result.current.selectWinner();
    });

    // After selectWinner, winnerId should be one of the touch IDs.
    expect(touches.map(t => t.id)).toContain(result.current.winnerId);
  });

  it('selectWinner is idempotent when selection is already in progress', async () => {
    const touches = makeTouches(2);
    const { result } = renderHook(() => useWinnerSelection(touches));

    await act(async () => {
      result.current.selectWinner();
    });

    const firstWinner = result.current.winnerId;

    act(() => {
      // Second call should be a no-op.
      result.current.selectWinner();
    });

    expect(result.current.winnerId).toBe(firstWinner);
  });
});

describe('useWinnerSelection — animated values', () => {
  it('getAnimatedScale returns an Animated.Value for a touch ID', () => {
    const touches = makeTouches(2);
    const { result } = renderHook(() => useWinnerSelection(touches));
    const scaleVal = result.current.getAnimatedScale('1');
    // Animated.Value has a _value property
    expect(scaleVal).toBeDefined();
    expect(typeof (scaleVal as unknown as { _value: number })._value).toBe('number');
  });

  it('getAnimatedOpacity returns an Animated.Value for a touch ID', () => {
    const touches = makeTouches(2);
    const { result } = renderHook(() => useWinnerSelection(touches));
    const opacityVal = result.current.getAnimatedOpacity('1');
    expect(opacityVal).toBeDefined();
    expect(typeof (opacityVal as unknown as { _value: number })._value).toBe('number');
  });

  it('returns the same Animated.Value instance for the same touch ID', () => {
    const touches = makeTouches(1);
    const { result } = renderHook(() => useWinnerSelection(touches));
    const first = result.current.getAnimatedScale('1');
    const second = result.current.getAnimatedScale('1');
    expect(first).toBe(second);
  });

  it('returns distinct Animated.Value instances for different touch IDs', () => {
    const touches = makeTouches(2);
    const { result } = renderHook(() => useWinnerSelection(touches));
    const scale1 = result.current.getAnimatedScale('1');
    const scale2 = result.current.getAnimatedScale('2');
    expect(scale1).not.toBe(scale2);
  });
});

describe('useWinnerSelection — stability timer reset', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('stabilityProgress stays 0 when no touches are active', () => {
    const { result } = renderHook(() => useWinnerSelection([]));
    act(() => {
      jest.advanceTimersByTime(500);
    });
    expect(result.current.stabilityProgress).toBe(0);
  });

  it('stabilityProgress advances toward 1 while touches remain stable', async () => {
    const touches = makeTouches(2);
    const { result } = renderHook(() => useWinnerSelection(touches));

    act(() => {
      // Advance past STABILITY_POLL_INTERVAL_MS initial anchor setup + some progress
      jest.advanceTimersByTime(1500);
    });

    // Progress should be > 0 after 1.5 s of stability (of 3 s window)
    expect(result.current.stabilityProgress).toBeGreaterThan(0);
    expect(result.current.stabilityProgress).toBeLessThanOrEqual(1);
  });

  it('stabilityProgress resets to 0 when all touches are removed', async () => {
    const touches = makeTouches(2);
    const { result, rerender } = renderHook(
      (props: { touches: TouchPoint[] }) => useWinnerSelection(props.touches),
      { initialProps: { touches } },
    );

    act(() => {
      jest.advanceTimersByTime(1000);
    });

    // Remove all touches.
    rerender({ touches: [] });

    act(() => {
      jest.advanceTimersByTime(200);
    });

    expect(result.current.stabilityProgress).toBe(0);
  });

  it('winnerId is set after 3 seconds of stability', async () => {
    const touches = makeTouches(3);
    const { result } = renderHook(() => useWinnerSelection(touches));

    await act(async () => {
      jest.advanceTimersByTime(4000);
    });

    await waitFor(() => {
      expect(result.current.winnerId).not.toBeNull();
    });
  });
});
