/**
 * useGameSession — custom hook for game session lifecycle and persistence.
 *
 * Encapsulates all StorageService interactions for the Score Tracker feature:
 *  - Creating new sessions (from player names) and immediately persisting them.
 *  - Loading individual sessions by ID.
 *  - Updating player scores (auto-save within 200 ms of the call).
 *  - Deleting sessions and refreshing the in-memory list.
 *  - Loading all saved sessions on mount (supports app-restart recovery).
 *
 * All persist operations handle errors gracefully (console.error, no crash).
 *
 * See architecture FR-S-007, FR-S-009, FR-S-012, NFR-R-001, NFR-P-004.
 */

import { useState, useCallback, useEffect } from 'react';

import { GameSession, Player } from '../../types';
import StorageService from '../../services/StorageService';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a unique ID using a timestamp combined with a random base-36 suffix.
 * Not cryptographically secure — suitable only for local session/player IDs.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UseGameSessionReturn {
  /** The currently active game session, or null if none is selected. */
  activeSession: GameSession | null;
  /** All persisted game sessions loaded from storage (sorted by lastModifiedAt desc). */
  allSessions: GameSession[];
  /** True while storage operations are in-flight on initial mount. */
  isLoading: boolean;
  /**
   * Creates a new GameSession from the provided player names, persists it
   * immediately via StorageService, and sets it as the activeSession.
   *
   * @param playerNames  Ordered list of display names (1–8).
   * @returns            The newly created GameSession.
   */
  createGameSession: (playerNames: string[]) => Promise<GameSession>;
  /**
   * Loads a session by ID from StorageService and sets it as the activeSession.
   *
   * @param sessionId  The unique ID of the session to load.
   */
  loadGameSession: (sessionId: string) => Promise<void>;
  /**
   * Updates a single player's score in the activeSession and immediately
   * persists the change via StorageService (within 200 ms).
   *
   * @param sessionId  Session to update (no-op if it doesn't match activeSession).
   * @param playerId   Player whose score is changing.
   * @param newScore   The new score value.
   */
  updatePlayerScore: (sessionId: string, playerId: string, newScore: number) => void;
  /**
   * Deletes a session from storage and removes it from the in-memory list.
   * If the deleted session was active, activeSession is cleared.
   *
   * @param sessionId  ID of the session to delete.
   */
  deleteGameSession: (sessionId: string) => Promise<void>;
  /**
   * Returns the current in-memory list of all sessions (no storage round-trip).
   * Use `refreshSessions` if you need a fresh load from storage.
   */
  getAllSessions: () => GameSession[];
  /**
   * Reloads all sessions from StorageService into allSessions.
   * Useful after returning to the list view or to force a refresh.
   */
  refreshSessions: () => Promise<void>;
  /**
   * Clears the activeSession without deleting it from storage.
   * Called when the user navigates back to the session list.
   */
  clearActiveSession: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages game session state and orchestrates all StorageService operations
 * for the Score Tracker feature.
 */
export function useGameSession(): UseGameSessionReturn {
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);
  const [allSessions, setAllSessions] = useState<GameSession[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ── Load sessions on mount ─────────────────────────────────────────────────

  /** Loads all sessions from storage and updates allSessions. */
  const refreshSessions = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const sessions = await StorageService.listAllGameSessions();
      setAllSessions(sessions);
    } catch (error) {
      console.error('[useGameSession] Failed to refresh sessions:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Sessions are loaded on mount to support returning to the Score tab after
  // an app restart (NFR-R-001 offline-first requirement).
  useEffect(() => {
    refreshSessions();
  }, [refreshSessions]);

  // ── Session CRUD ───────────────────────────────────────────────────────────

  const createGameSession = useCallback(
    async (playerNames: string[]): Promise<GameSession> => {
      const now = new Date().toISOString();
      const sessionId = generateId();

      const players: Player[] = playerNames.map(name => ({
        playerId: generateId(),
        name: name.trim(),
      }));

      const scores: { [playerId: string]: number } = {};
      players.forEach(player => {
        scores[player.playerId] = 0;
      });

      const session: GameSession = {
        sessionId,
        players,
        scores,
        createdAt: now,
        lastModifiedAt: now,
      };

      // Persist immediately (FR-S-007)
      try {
        await StorageService.saveGameSession(session);
      } catch (error) {
        console.error('[useGameSession] Failed to persist new session:', error);
      }

      // Update in-memory state
      setActiveSession(session);
      setAllSessions((prev: GameSession[]) => [session, ...prev]);

      return session;
    },
    [],
  );

  const loadGameSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      const session = await StorageService.loadGameSession(sessionId);
      if (session !== null) {
        setActiveSession(session);
      }
    } catch (error) {
      console.error('[useGameSession] Failed to load session:', error);
    }
  }, []);

  /**
   * Updates the active session's score synchronously (for immediate UI feedback,
   * per NFR-P-003) and fires a non-blocking save to StorageService.
   *
   * The save is initiated within the same event loop tick, satisfying the
   * ≤200 ms persistence requirement (NFR-P-004).
   */
  const updatePlayerScore = useCallback(
    (sessionId: string, playerId: string, newScore: number): void => {
      setActiveSession((prev: GameSession | null) => {
        if (prev === null || prev.sessionId !== sessionId) {
          return prev;
        }

        const updated: GameSession = {
          ...prev,
          scores: { ...prev.scores, [playerId]: newScore },
          lastModifiedAt: new Date().toISOString(),
        };

        // Non-blocking save — errors are logged but do not interrupt the UI.
        StorageService.saveGameSession(updated).catch((error: unknown) => {
          console.error('[useGameSession] Failed to persist score update:', error);
        });

        return updated;
      });
    },
    [],
  );

  const deleteGameSession = useCallback(async (sessionId: string): Promise<void> => {
    try {
      await StorageService.deleteGameSession(sessionId);
      setAllSessions((prev: GameSession[]) => prev.filter((s: GameSession) => s.sessionId !== sessionId));
      // Clear activeSession if the deleted session was the one being viewed.
      setActiveSession((prev: GameSession | null) => (prev?.sessionId === sessionId ? null : prev));
    } catch (error) {
      console.error('[useGameSession] Failed to delete session:', error);
    }
  }, []);

  const getAllSessions = useCallback((): GameSession[] => {
    return allSessions;
  }, [allSessions]);

  const clearActiveSession = useCallback((): void => {
    setActiveSession(null);
  }, []);

  return {
    activeSession,
    allSessions,
    isLoading,
    createGameSession,
    loadGameSession,
    updatePlayerScore,
    deleteGameSession,
    getAllSessions,
    refreshSessions,
    clearActiveSession,
  };
}
