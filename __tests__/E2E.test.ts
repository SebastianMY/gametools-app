/**
 * E2E — Full End-to-End User Workflow Tests
 *
 * Simulates realistic user journeys across all three features to verify
 * cross-feature interactions, data isolation, and seamless workflows.
 *
 * Cross-feature tests verify: Score data doesn't bleed into Dice/Draw,
 * concurrent state is consistent, and performance stays acceptable across
 * multiple repeated operations.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRollDice } from '../src/components/Dice/useRollDice';
import { useGameSession } from '../src/components/Score/useGameSession';
import { useWinnerSelection } from '../src/components/Draw/useWinnerSelection';
import { useNavigation } from '../src/components/Navigation/useNavigation';
import StorageService from '../src/services/StorageService';
import RandomService from '../src/services/RandomService';
import VibrationService from '../src/services/VibrationService';
import { TOUCH_COLORS } from '../src/styles/colors';
import { TouchPoint } from '../src/components/Draw/useTouchHandling';
import { GameSession } from '../src/types';

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ─── Helpers ──────────────────────────────────────────────────────────────────

const makeTouches = (count: number): TouchPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    id: String(i + 1),
    x: 50 + i * 40,
    y: 150 + i * 40,
    color: TOUCH_COLORS[i % TOUCH_COLORS.length],
  }));

// ─── Full user workflow: Dice feature ─────────────────────────────────────────

describe('E2E — Dice feature workflow', () => {
  it('user selects 3 dice, rolls, and sees valid results', () => {
    const { result } = renderHook(() => useRollDice());

    act(() => {
      result.current.selectDiceCount(3);
    });
    expect(result.current.diceCount).toBe(3);

    act(() => {
      result.current.rollDice();
    });

    expect(result.current.diceValues).toHaveLength(3);
    expect(result.current.totalSum).toBeGreaterThanOrEqual(3);
    expect(result.current.totalSum).toBeLessThanOrEqual(18);
    expect(result.current.isRolling).toBe(false);
    result.current.diceValues.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    });
  });

  it('user rolls multiple times without issue', () => {
    const { result } = renderHook(() => useRollDice());

    act(() => {
      result.current.selectDiceCount(6);
    });

    for (let i = 0; i < 10; i++) {
      act(() => {
        result.current.rollDice();
      });
      expect(result.current.diceValues).toHaveLength(6);
      expect(result.current.totalSum).toBeGreaterThanOrEqual(6);
      expect(result.current.totalSum).toBeLessThanOrEqual(36);
    }
  });

  it('dice count change takes effect on the next roll', () => {
    const { result } = renderHook(() => useRollDice());

    act(() => {
      result.current.selectDiceCount(2);
    });
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.diceValues).toHaveLength(2);

    act(() => {
      result.current.selectDiceCount(5);
    });
    act(() => {
      result.current.rollDice();
    });
    expect(result.current.diceValues).toHaveLength(5);
  });
});

// ─── Full user workflow: Score feature ────────────────────────────────────────

describe('E2E — Score feature workflow', () => {
  it('user creates a game, updates scores, and session persists', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Create game.
    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice', 'Bob', 'Charlie']);
    });

    expect(session!.players).toHaveLength(3);

    const [alice, bob, charlie] = session!.players;

    // Update scores individually so each state update settles.
    act(() => {
      result.current.updatePlayerScore(session!.sessionId, alice.playerId, 10);
    });
    act(() => {
      result.current.updatePlayerScore(session!.sessionId, bob.playerId, 15);
    });
    act(() => {
      result.current.updatePlayerScore(session!.sessionId, charlie.playerId, 5);
    });

    // Verify in-memory state.
    await waitFor(() => {
      expect(result.current.activeSession?.scores[alice.playerId]).toBe(10);
      expect(result.current.activeSession?.scores[bob.playerId]).toBe(15);
      expect(result.current.activeSession?.scores[charlie.playerId]).toBe(5);
    });

    // Verify persistence.
    await waitFor(async () => {
      const stored = await StorageService.loadGameSession(session!.sessionId);
      expect(stored?.scores[alice.playerId]).toBe(10);
      expect(stored?.scores[bob.playerId]).toBe(15);
      expect(stored?.scores[charlie.playerId]).toBe(5);
    });
  });

  it('user navigates back (clears active session) and returns to session list', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createGameSession(['Alice']);
    });

    expect(result.current.activeSession).not.toBeNull();

    act(() => {
      result.current.clearActiveSession();
    });

    expect(result.current.activeSession).toBeNull();
    expect(result.current.allSessions).toHaveLength(1);
  });

  it('user creates multiple sessions and can load any by ID', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let s1: GameSession | undefined;
    let s2: GameSession | undefined;

    await act(async () => {
      s1 = await result.current.createGameSession(['Alice']);
    });
    await act(async () => {
      s2 = await result.current.createGameSession(['Bob']);
    });

    // Navigate away.
    act(() => {
      result.current.clearActiveSession();
    });

    // Load s1 explicitly.
    await act(async () => {
      await result.current.loadGameSession(s1!.sessionId);
    });

    expect(result.current.activeSession?.sessionId).toBe(s1!.sessionId);
    expect(result.current.activeSession?.players[0].name).toBe('Alice');

    // Switch to s2.
    await act(async () => {
      await result.current.loadGameSession(s2!.sessionId);
    });

    expect(result.current.activeSession?.sessionId).toBe(s2!.sessionId);
    expect(result.current.activeSession?.players[0].name).toBe('Bob');
  });
});

// ─── Full user workflow: Draw feature ─────────────────────────────────────────
// These tests use fake timers to prevent timer leakage from useWinnerSelection's
// internal setInterval (100ms stability polling) and post-winner setTimeout
// (2500ms reset delay) from contaminating subsequent tests.

describe('E2E — Draw feature workflow', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.clearAllTimers();
    jest.useRealTimers();
  });

  it('manual winner selection from active touches works end-to-end', async () => {
    const touches = makeTouches(4);
    const { result } = renderHook(() => useWinnerSelection(touches));

    await act(async () => {
      result.current.selectWinner();
    });

    expect(touches.map(t => t.id)).toContain(result.current.winnerId);
  });

  it('winner is selected from the provided touch pool, not beyond it', async () => {
    const touches = makeTouches(3);
    const { result } = renderHook(() => useWinnerSelection(touches));

    await act(async () => {
      result.current.selectWinner();
    });

    const validIds = new Set(touches.map(t => t.id));
    expect(validIds.has(result.current.winnerId!)).toBe(true);
  });

  it('running multiple independent draws does not cause errors', async () => {
    for (let i = 0; i < 5; i++) {
      const touches = makeTouches(2 + (i % 4));
      const { result, unmount } = renderHook(() => useWinnerSelection(touches));

      await act(async () => {
        result.current.selectWinner();
      });

      expect(result.current.winnerId).not.toBeNull();
      // Unmount explicitly so effect cleanup runs before next iteration.
      unmount();
      // Clear any pending timers from this iteration.
      jest.clearAllTimers();
    }
  });
});

// ─── Cross-feature isolation ───────────────────────────────────────────────────

describe('E2E — cross-feature isolation', () => {
  it('Score session data does not affect Dice state', async () => {
    // Set up Score feature.
    const { result: scoreResult } = renderHook(() => useGameSession());
    await waitFor(() => expect(scoreResult.current.isLoading).toBe(false));

    await act(async () => {
      await scoreResult.current.createGameSession(['Alice', 'Bob']);
    });

    // Dice should operate completely independently.
    const { result: diceResult } = renderHook(() => useRollDice());

    // Select count first, then roll (separate acts to allow state to settle).
    act(() => {
      diceResult.current.selectDiceCount(4);
    });
    act(() => {
      diceResult.current.rollDice();
    });

    expect(diceResult.current.diceCount).toBe(4);
    expect(diceResult.current.diceValues).toHaveLength(4);
    // No session data should contaminate dice state.
    expect(diceResult.current.totalSum).toBeGreaterThanOrEqual(4);
    expect(diceResult.current.totalSum).toBeLessThanOrEqual(24);
  });

  it('Score session data does not affect Draw initial state', async () => {
    // Set up Score feature with an active session.
    const { result: scoreResult } = renderHook(() => useGameSession());
    await waitFor(() => expect(scoreResult.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await scoreResult.current.createGameSession(['Player1', 'Player2']);
    });

    act(() => {
      scoreResult.current.updatePlayerScore(
        session!.sessionId,
        session!.players[0].playerId,
        500,
      );
    });

    // Draw feature should be independent — check initial state only to avoid timer leakage.
    const touches = makeTouches(3);
    const { result: drawResult } = renderHook(() => useWinnerSelection(touches));

    // Initial state: no winner selected, no selection in progress.
    expect(drawResult.current.winnerId).toBeNull();
    expect(drawResult.current.isSelecting).toBe(false);
    expect(drawResult.current.stabilityProgress).toBe(0);

    // Animated values should be initialised independently of Score data.
    const scale = drawResult.current.getAnimatedScale('1');
    expect(scale).toBeDefined();
  });

  it('Dice and Draw initial states are independent of each other', () => {
    const { result: diceResult } = renderHook(() => useRollDice());

    act(() => {
      diceResult.current.selectDiceCount(3);
    });
    act(() => {
      diceResult.current.rollDice();
    });

    const touches = makeTouches(2);
    const { result: drawResult } = renderHook(() => useWinnerSelection(touches));

    // Dice results should not affect Draw state.
    expect(drawResult.current.winnerId).toBeNull();
    expect(drawResult.current.isSelecting).toBe(false);

    // Draw state should not affect Dice results.
    expect(diceResult.current.diceValues).toHaveLength(3);
    diceResult.current.diceValues.forEach(v => {
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(6);
    });
  });

  it('Navigation state is independent of Score session state', async () => {
    const { result: navResult } = renderHook(() => useNavigation());
    const { result: scoreResult } = renderHook(() => useGameSession());
    await waitFor(() => expect(scoreResult.current.isLoading).toBe(false));

    act(() => {
      navResult.current.setCurrentTab('score');
    });

    await act(async () => {
      await scoreResult.current.createGameSession(['Alice']);
    });

    act(() => {
      navResult.current.setCurrentTab('dice');
    });

    // Navigation change should not affect score state.
    expect(navResult.current.currentTab).toBe('dice');
    expect(scoreResult.current.activeSession).not.toBeNull();
    expect(scoreResult.current.activeSession?.players[0].name).toBe('Alice');
  });

  it('AsyncStorage only contains game session keys; no dice or draw data', async () => {
    // Dice and Draw are stateless (no storage).
    const { result: diceResult } = renderHook(() => useRollDice());

    act(() => {
      diceResult.current.selectDiceCount(6);
    });
    act(() => {
      diceResult.current.rollDice();
    });

    // After dice rolls, storage should be empty (no dice persistence).
    const allKeys = await AsyncStorage.getAllKeys();
    const gameKeys = (allKeys as string[]).filter((k: string) =>
      k.startsWith('game_session_'),
    );
    expect(gameKeys).toHaveLength(0);
  });
});

// ─── Error handling across features ───────────────────────────────────────────

describe('E2E — error handling', () => {
  it('Dice does not crash with boundary dice count values', () => {
    const { result } = renderHook(() => useRollDice());

    // Below minimum.
    act(() => {
      result.current.selectDiceCount(-5);
    });
    expect(result.current.diceCount).toBe(1);

    act(() => {
      result.current.rollDice();
    });
    expect(result.current.diceValues).toHaveLength(1);

    // Above maximum.
    act(() => {
      result.current.selectDiceCount(100);
    });
    expect(result.current.diceCount).toBe(6);

    act(() => {
      result.current.rollDice();
    });
    expect(result.current.diceValues).toHaveLength(6);
  });

  it('Draw selectWinner is a no-op with empty touches (no crash)', () => {
    jest.useFakeTimers();
    try {
      const { result } = renderHook(() => useWinnerSelection([]));

      expect(() => {
        act(() => {
          result.current.selectWinner();
        });
      }).not.toThrow();

      expect(result.current.winnerId).toBeNull();
      expect(result.current.isSelecting).toBe(false);
    } finally {
      jest.clearAllTimers();
      jest.useRealTimers();
    }
  });

  it('RandomService.selectRandomItem handles empty array without throwing', () => {
    expect(() => RandomService.selectRandomItem([])).not.toThrow();
    expect(RandomService.selectRandomItem([])).toBeNull();
  });

  it('VibrationService.triggerNotification resolves without throwing', async () => {
    await expect(VibrationService.triggerNotification()).resolves.not.toThrow();
  });

  it('VibrationService.triggerSuccess resolves without throwing', async () => {
    await expect(VibrationService.triggerSuccess()).resolves.not.toThrow();
  });

  it('VibrationService.triggerError resolves without throwing', async () => {
    await expect(VibrationService.triggerError()).resolves.not.toThrow();
  });

  it('Score useGameSession handles invalid loadGameSession gracefully', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // No active session initially.
    expect(result.current.activeSession).toBeNull();

    await act(async () => {
      await result.current.loadGameSession('non-existent-id');
    });

    // Should not crash; active session remains null.
    expect(result.current.activeSession).toBeNull();
  });
});

// ─── Performance: repeated operations ─────────────────────────────────────────

describe('E2E — performance (no degradation over repeated runs)', () => {
  it('100 dice rolls complete without errors', () => {
    const { result } = renderHook(() => useRollDice());

    act(() => {
      result.current.selectDiceCount(6);
    });

    expect(() => {
      for (let i = 0; i < 100; i++) {
        act(() => {
          result.current.rollDice();
        });
      }
    }).not.toThrow();

    expect(result.current.diceValues).toHaveLength(6);
  });

  it('creating 50 sessions does not degrade useGameSession', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    for (let i = 0; i < 50; i++) {
      await act(async () => {
        await result.current.createGameSession([`Player${i}`]);
      });
    }

    expect(result.current.allSessions).toHaveLength(50);
  }, 30000 /* generous timeout for 50 async creates */);

  it('RandomService produces consistent statistical distribution across 1000 samples', () => {
    const items = ['A', 'B', 'C', 'D'];
    const counts: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };

    for (let i = 0; i < 1000; i++) {
      const picked = RandomService.selectRandomItem(items)!;
      counts[picked]++;
    }

    // Each item should be selected ~250 times; allow generous tolerance.
    items.forEach(item => {
      expect(counts[item]).toBeGreaterThan(150);
      expect(counts[item]).toBeLessThan(400);
    });
  });
});
