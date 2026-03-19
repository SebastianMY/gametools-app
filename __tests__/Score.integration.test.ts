/**
 * Score Feature — Integration Tests
 *
 * Verifies game session creation, player input validation, score modification,
 * persistence, and session loading via the useGameSession hook and StorageService.
 *
 * Coverage targets: useGameSession, StorageService, validation utilities.
 */

import { renderHook, act, waitFor } from '@testing-library/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useGameSession } from '../src/components/Score/useGameSession';
import StorageService from '../src/services/StorageService';
import {
  playerNameValidator,
  sessionIdValidator,
  playerCountValidator,
} from '../src/utils/validation';
import { GameSession } from '../src/types';

// AsyncStorage is auto-mocked by jest-expo via the mock package.
// The mock provides an in-memory store that resets between tests.

beforeEach(async () => {
  // Clear all storage between tests to ensure isolation.
  await AsyncStorage.clear();
});

// ─── playerNameValidator ──────────────────────────────────────────────────────

describe('playerNameValidator — input validation', () => {
  it('accepts a simple alphanumeric name', () => {
    expect(playerNameValidator('Alice').valid).toBe(true);
  });

  it('accepts a name with spaces and hyphens', () => {
    expect(playerNameValidator('Player 1-A').valid).toBe(true);
  });

  it('rejects an empty string', () => {
    const result = playerNameValidator('');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects a name longer than 20 characters', () => {
    const longName = 'A'.repeat(21);
    const result = playerNameValidator(longName);
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('accepts exactly 20 characters', () => {
    const name = 'A'.repeat(20);
    expect(playerNameValidator(name).valid).toBe(true);
  });

  it('rejects special characters like @', () => {
    const result = playerNameValidator('Alice@');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it('rejects special characters like #', () => {
    const result = playerNameValidator('Alice#Bob');
    expect(result.valid).toBe(false);
    expect(result.error).toBeTruthy();
  });
});

describe('sessionIdValidator', () => {
  it('accepts a non-empty session ID', () => {
    expect(sessionIdValidator('abc-123').valid).toBe(true);
  });

  it('rejects an empty string', () => {
    expect(sessionIdValidator('').valid).toBe(false);
  });

  it('rejects a whitespace-only string', () => {
    expect(sessionIdValidator('   ').valid).toBe(false);
  });
});

describe('playerCountValidator', () => {
  it('accepts counts between 1 and 8', () => {
    for (let i = 1; i <= 8; i++) {
      expect(playerCountValidator(i).valid).toBe(true);
    }
  });

  it('rejects count 0', () => {
    expect(playerCountValidator(0).valid).toBe(false);
  });

  it('rejects count 9', () => {
    expect(playerCountValidator(9).valid).toBe(false);
  });

  it('rejects non-integer counts', () => {
    expect(playerCountValidator(1.5).valid).toBe(false);
  });
});

// ─── StorageService ───────────────────────────────────────────────────────────

describe('StorageService — game session persistence', () => {
  const buildSession = (overrides: Partial<GameSession> = {}): GameSession => ({
    sessionId: 'test-session-1',
    players: [{ playerId: 'p1', name: 'Alice' }],
    scores: { p1: 0 },
    createdAt: new Date().toISOString(),
    lastModifiedAt: new Date().toISOString(),
    ...overrides,
  });

  it('saves and loads a game session by ID', async () => {
    const session = buildSession();
    await StorageService.saveGameSession(session);
    const loaded = await StorageService.loadGameSession(session.sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded?.sessionId).toBe(session.sessionId);
    expect(loaded?.players).toEqual(session.players);
  });

  it('returns null for a non-existent session ID', async () => {
    const result = await StorageService.loadGameSession('does-not-exist');
    expect(result).toBeNull();
  });

  it('sessionExists returns true for a saved session', async () => {
    const session = buildSession();
    await StorageService.saveGameSession(session);
    const exists = await StorageService.sessionExists(session.sessionId);
    expect(exists).toBe(true);
  });

  it('sessionExists returns false for a non-existent session', async () => {
    const exists = await StorageService.sessionExists('ghost-session');
    expect(exists).toBe(false);
  });

  it('deletes a session so it can no longer be loaded', async () => {
    const session = buildSession();
    await StorageService.saveGameSession(session);
    await StorageService.deleteGameSession(session.sessionId);
    const loaded = await StorageService.loadGameSession(session.sessionId);
    expect(loaded).toBeNull();
  });

  it('listAllGameSessions returns all saved sessions', async () => {
    const s1 = buildSession({ sessionId: 's1', createdAt: '2024-01-01T00:00:00.000Z' });
    const s2 = buildSession({ sessionId: 's2', createdAt: '2024-01-02T00:00:00.000Z' });
    await StorageService.saveGameSession(s1);
    await StorageService.saveGameSession(s2);
    const all = await StorageService.listAllGameSessions();
    expect(all).toHaveLength(2);
  });

  it('listAllGameSessions sorts sessions newest first', async () => {
    const older = buildSession({ sessionId: 'older', createdAt: '2024-01-01T00:00:00.000Z' });
    const newer = buildSession({ sessionId: 'newer', createdAt: '2024-06-01T00:00:00.000Z' });
    await StorageService.saveGameSession(older);
    await StorageService.saveGameSession(newer);
    const all = await StorageService.listAllGameSessions();
    expect(all[0].sessionId).toBe('newer');
    expect(all[1].sessionId).toBe('older');
  });

  it('listAllGameSessions returns empty array when no sessions exist', async () => {
    const all = await StorageService.listAllGameSessions();
    expect(all).toEqual([]);
  });

  it('overwrites an existing session on save', async () => {
    const session = buildSession({ scores: { p1: 0 } });
    await StorageService.saveGameSession(session);

    const updated = { ...session, scores: { p1: 42 } };
    await StorageService.saveGameSession(updated);

    const loaded = await StorageService.loadGameSession(session.sessionId);
    expect(loaded?.scores.p1).toBe(42);
  });

  it('cleanupOldSessions removes sessions older than retention period', async () => {
    // Session created 61 days ago
    const oldDate = new Date(Date.now() - 61 * 24 * 60 * 60 * 1000).toISOString();
    const old = buildSession({ sessionId: 'old-session', createdAt: oldDate });
    const fresh = buildSession({ sessionId: 'fresh-session' });

    await StorageService.saveGameSession(old);
    await StorageService.saveGameSession(fresh);

    await StorageService.cleanupOldSessions(60);

    const all = await StorageService.listAllGameSessions();
    expect(all.some(s => s.sessionId === 'old-session')).toBe(false);
    expect(all.some(s => s.sessionId === 'fresh-session')).toBe(true);
  });
});

// ─── useGameSession — session lifecycle ──────────────────────────────────────

describe('useGameSession — game creation', () => {
  it('creates a session with the provided player names', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice', 'Bob']);
    });

    expect(session).toBeDefined();
    expect(session!.players).toHaveLength(2);
    expect(session!.players.map(p => p.name)).toEqual(['Alice', 'Bob']);
  });

  it('initialises all player scores to 0', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice', 'Bob', 'Charlie']);
    });

    Object.values(session!.scores).forEach(score => {
      expect(score).toBe(0);
    });
  });

  it('sets the new session as activeSession', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createGameSession(['Alice']);
    });

    expect(result.current.activeSession).not.toBeNull();
    expect(result.current.activeSession?.players[0].name).toBe('Alice');
  });

  it('persists the session immediately to storage', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    const loaded = await StorageService.loadGameSession(session!.sessionId);
    expect(loaded).not.toBeNull();
    expect(loaded?.sessionId).toBe(session!.sessionId);
  });

  it('adds the new session to allSessions list', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.createGameSession(['Alice']);
    });

    expect(result.current.allSessions).toHaveLength(1);
  });

  it('trims whitespace from player names', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['  Alice  ', ' Bob ']);
    });

    expect(session!.players[0].name).toBe('Alice');
    expect(session!.players[1].name).toBe('Bob');
  });
});

describe('useGameSession — score modification', () => {
  it('updates a player score in the active session', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice', 'Bob']);
    });

    const aliceId = session!.players[0].playerId;

    act(() => {
      result.current.updatePlayerScore(session!.sessionId, aliceId, 15);
    });

    await waitFor(() => {
      expect(result.current.activeSession?.scores[aliceId]).toBe(15);
    });
  });

  it('ignores updatePlayerScore if sessionId does not match active session', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    const aliceId = session!.players[0].playerId;
    const initialScore = result.current.activeSession!.scores[aliceId];

    act(() => {
      result.current.updatePlayerScore('wrong-session-id', aliceId, 99);
    });

    expect(result.current.activeSession?.scores[aliceId]).toBe(initialScore);
  });

  it('updates lastModifiedAt on score change', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    const originalModifiedAt = session!.lastModifiedAt;
    const aliceId = session!.players[0].playerId;

    act(() => {
      result.current.updatePlayerScore(session!.sessionId, aliceId, 10);
    });

    await waitFor(() => {
      expect(result.current.activeSession?.lastModifiedAt).not.toBe(
        originalModifiedAt,
      );
    });
  });

  it('persists the updated score to storage', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    const aliceId = session!.players[0].playerId;

    act(() => {
      result.current.updatePlayerScore(session!.sessionId, aliceId, 50);
    });

    // Allow the non-blocking save promise to resolve.
    await waitFor(async () => {
      const loaded = await StorageService.loadGameSession(session!.sessionId);
      expect(loaded?.scores[aliceId]).toBe(50);
    });
  });
});

describe('useGameSession — session loading', () => {
  it('loads a session by ID and sets it as activeSession', async () => {
    // Pre-populate storage directly.
    const now = new Date().toISOString();
    const session: GameSession = {
      sessionId: 'pre-existing',
      players: [{ playerId: 'p1', name: 'Charlie' }],
      scores: { p1: 77 },
      createdAt: now,
      lastModifiedAt: now,
    };
    await StorageService.saveGameSession(session);

    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await act(async () => {
      await result.current.loadGameSession('pre-existing');
    });

    expect(result.current.activeSession?.sessionId).toBe('pre-existing');
    expect(result.current.activeSession?.scores.p1).toBe(77);
  });

  it('does not change activeSession when loading a non-existent session ID', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.activeSession).toBeNull();

    await act(async () => {
      await result.current.loadGameSession('ghost-id');
    });

    expect(result.current.activeSession).toBeNull();
  });

  it('loads all sessions from storage on mount', async () => {
    const now = new Date().toISOString();
    const sessions: GameSession[] = [
      {
        sessionId: 's1',
        players: [{ playerId: 'p1', name: 'A' }],
        scores: { p1: 0 },
        createdAt: now,
        lastModifiedAt: now,
      },
      {
        sessionId: 's2',
        players: [{ playerId: 'p2', name: 'B' }],
        scores: { p2: 5 },
        createdAt: now,
        lastModifiedAt: now,
      },
    ];

    await StorageService.saveGameSession(sessions[0]);
    await StorageService.saveGameSession(sessions[1]);

    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.allSessions).toHaveLength(2);
  });
});

describe('useGameSession — session deletion', () => {
  it('removes a session from allSessions after deletion', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    await act(async () => {
      await result.current.deleteGameSession(session!.sessionId);
    });

    expect(result.current.allSessions).toHaveLength(0);
  });

  it('clears activeSession when the active session is deleted', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    expect(result.current.activeSession).not.toBeNull();

    await act(async () => {
      await result.current.deleteGameSession(session!.sessionId);
    });

    expect(result.current.activeSession).toBeNull();
  });

  it('removes the session from storage on deletion', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    await act(async () => {
      await result.current.deleteGameSession(session!.sessionId);
    });

    const loaded = await StorageService.loadGameSession(session!.sessionId);
    expect(loaded).toBeNull();
  });
});

describe('useGameSession — clearActiveSession', () => {
  it('sets activeSession to null without deleting from storage', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    let session: GameSession | undefined;
    await act(async () => {
      session = await result.current.createGameSession(['Alice']);
    });

    act(() => {
      result.current.clearActiveSession();
    });

    expect(result.current.activeSession).toBeNull();

    // Session should still be in storage.
    const loaded = await StorageService.loadGameSession(session!.sessionId);
    expect(loaded).not.toBeNull();
  });
});

describe('useGameSession — refreshSessions', () => {
  it('reloads all sessions from storage', async () => {
    const { result } = renderHook(() => useGameSession());
    await waitFor(() => expect(result.current.isLoading).toBe(false));

    // Write a session directly to storage (simulating external write).
    const now = new Date().toISOString();
    const external: GameSession = {
      sessionId: 'external-s',
      players: [{ playerId: 'px', name: 'External' }],
      scores: { px: 0 },
      createdAt: now,
      lastModifiedAt: now,
    };
    await StorageService.saveGameSession(external);

    await act(async () => {
      await result.current.refreshSessions();
    });

    expect(result.current.allSessions.some(s => s.sessionId === 'external-s')).toBe(
      true,
    );
  });
});
