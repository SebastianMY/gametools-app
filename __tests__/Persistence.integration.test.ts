/**
 * Persistence — Integration Tests
 *
 * Verifies: session saved after score change, session loads after app restart
 * (simulated by re-mounting the hook), multiple sessions remain independent,
 * and storage errors are handled gracefully.
 *
 * Coverage targets: StorageService, useGameSession (persistence paths).
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameSession } from '../src/components/Score/useGameSession';
import StorageService from '../src/services/StorageService';
import { GameSession } from '../src/types';

beforeEach(async () => {
  await AsyncStorage.clear();
});

// ─── Session persists after score change ─────────────────────────────────────

describe('Persistence — session saved after score change', () => {
  it('persists updated score to AsyncStorage', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice', 'Bob']);
    });

    const aliceId = session!.players[0].playerId;

    act(() => {
      result.current.updatePlayerScore(session!.sessionId, aliceId, 42);
    });

    // Wait for the non-blocking persistence to settle.
    await waitFor(async () => {
      const stored = await StorageService.loadGameSession(session!.sessionId);
      expect(stored?.scores[aliceId]).toBe(42);
    });
  });

  it('updates lastModifiedAt in persisted session after score change', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    const aliceId = session!.players[0].playerId;
    const originalTs = (await StorageService.loadGameSession(session!.sessionId))!
      .lastModifiedAt;

    act(() => {
      result.current.updatePlayerScore(session!.sessionId, aliceId, 1);
    });

    await waitFor(async () => {
      const stored = await StorageService.loadGameSession(session!.sessionId);
      expect(stored?.lastModifiedAt).not.toBe(originalTs);
    });
  });

  it('persists multiple sequential score updates correctly', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    const aliceId = session!.players[0].playerId;

    for (const score of [5, 10, 25, 100]) {
      act(() => {
        result.current.updatePlayerScore(session!.sessionId, aliceId, score);
      });
    }

    await waitFor(async () => {
      const stored = await StorageService.loadGameSession(session!.sessionId);
      expect(stored?.scores[aliceId]).toBe(100);
    });
  });
});

// ─── Session loads after app restart (re-mount) ───────────────────────────────

describe('Persistence — session loads after app restart simulation', () => {
  it('restores all sessions on hook re-mount (simulated restart)', async () => {
    // First mount: create sessions.
    const { result: firstMount, unmount } = renderHook(() => useGameSession());
    await waitFor(() => expect(firstMount.current.isLoading).toBe(false));

    let s1: GameSession | undefined;
    let s2: GameSession | undefined;
    await act(async () => {
      s1 = await firstMount.current.createGameSession(['Alice', 'Bob']);
    });
    await act(async () => {
      s2 = await firstMount.current.createGameSession(['Charlie']);
    });

    unmount(); // Simulate app "closing".

    // Second mount: verify sessions are restored.
    const { result: secondMount } = renderHook(() => useGameSession());
    await waitFor(() => expect(secondMount.current.isLoading).toBe(false));

    const ids = secondMount.current.allSessions.map(s => s.sessionId);
    expect(ids).toContain(s1!.sessionId);
    expect(ids).toContain(s2!.sessionId);
  });

  it('restores persisted scores after re-mount', async () => {
    const { result: firstMount, unmount } = renderHook(() => useGameSession());
    await waitFor(() => expect(firstMount.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await firstMount.current.createGameSession(['Alice']);
    });

    const aliceId = session!.players[0].playerId;

    act(() => {
      firstMount.current.updatePlayerScore(session!.sessionId, aliceId, 88);
    });

    await waitFor(async () => {
      const stored = await StorageService.loadGameSession(session!.sessionId);
      expect(stored?.scores[aliceId]).toBe(88);
    });

    unmount();

    // Reload via StorageService directly (simulates loading after restart).
    const restored = await StorageService.loadGameSession(session!.sessionId);
    expect(restored?.scores[aliceId]).toBe(88);
  });

  it('isLoading is true initially then false after sessions load', async () => {
    const { result } = renderHook(() => useGameSession());
    // Initially loading.
    expect(result.current.isLoading).toBe(true);
    // Eventually resolves.
    await waitFor(() => expect(result.current.isLoading).toBe(false));
  });
});

// ─── Multiple sessions are independent ───────────────────────────────────────

describe('Persistence — multiple sessions are independent', () => {
  it('score changes in one session do not affect another', async () => {
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

    // Update score in s1.
    act(() => {
      result.current.updatePlayerScore(
        s1!.sessionId,
        s1!.players[0].playerId,
        99,
      );
    });

    // s2 in storage should be unchanged.
    await waitFor(async () => {
      const storedS2 = await StorageService.loadGameSession(s2!.sessionId);
      expect(storedS2?.scores[s2!.players[0].playerId]).toBe(0);
    });
  });

  it('deleting one session does not affect another', async () => {
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

    await act(async () => {
      await result.current.deleteGameSession(s1!.sessionId);
    });

    const remaining = result.current.allSessions;
    expect(remaining.some(s => s.sessionId === s2!.sessionId)).toBe(true);
    expect(remaining.some(s => s.sessionId === s1!.sessionId)).toBe(false);
  });

  it('each session stores its own distinct player list', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let s1: GameSession | undefined;
    let s2: GameSession | undefined;

    await act(async () => {
      s1 = await result.current.createGameSession(['Alice', 'Bob']);
    });
    await act(async () => {
      s2 = await result.current.createGameSession(['Charlie', 'Diana', 'Eve']);
    });

    const loaded1 = await StorageService.loadGameSession(s1!.sessionId);
    const loaded2 = await StorageService.loadGameSession(s2!.sessionId);

    expect(loaded1?.players).toHaveLength(2);
    expect(loaded2?.players).toHaveLength(3);
  });
});

// ─── Storage error handling ───────────────────────────────────────────────────

describe('Persistence — storage errors handled gracefully', () => {
  it('loadGameSession returns null when AsyncStorage throws', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(
      new Error('Storage unavailable'),
    );

    const result = await StorageService.loadGameSession('any-id');
    expect(result).toBeNull();

    spy.mockRestore();
  });

  it('saveGameSession does not throw when AsyncStorage throws', async () => {
    const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(
      new Error('Quota exceeded'),
    );

    const now = new Date().toISOString();
    const session: GameSession = {
      sessionId: 'err-session',
      players: [{ playerId: 'p1', name: 'Alice' }],
      scores: { p1: 0 },
      createdAt: now,
      lastModifiedAt: now,
    };

    await expect(StorageService.saveGameSession(session)).resolves.toBeUndefined();

    spy.mockRestore();
  });

  it('listAllGameSessions returns empty array when AsyncStorage throws', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getAllKeys').mockRejectedValueOnce(
      new Error('Keys unavailable'),
    );

    const result = await StorageService.listAllGameSessions();
    expect(result).toEqual([]);

    spy.mockRestore();
  });

  it('deleteGameSession does not throw when AsyncStorage throws', async () => {
    const spy = jest.spyOn(AsyncStorage, 'removeItem').mockRejectedValueOnce(
      new Error('Remove failed'),
    );

    await expect(
      StorageService.deleteGameSession('any-id'),
    ).resolves.toBeUndefined();

    spy.mockRestore();
  });

  it('sessionExists returns false when AsyncStorage throws', async () => {
    const spy = jest.spyOn(AsyncStorage, 'getItem').mockRejectedValueOnce(
      new Error('Storage error'),
    );

    const result = await StorageService.sessionExists('any-id');
    expect(result).toBe(false);

    spy.mockRestore();
  });

  it('useGameSession continues to work after storage errors during creation', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Simulate storage failure during save.
    const spy = jest.spyOn(AsyncStorage, 'setItem').mockRejectedValueOnce(
      new Error('Quota exceeded'),
    );

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    // Session should still be returned and set as active even if persist failed.
    expect(session).toBeDefined();
    expect(result.current.activeSession).not.toBeNull();

    spy.mockRestore();
  });
});
