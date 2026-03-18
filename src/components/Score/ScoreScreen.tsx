/**
 * ScoreScreen — main entry point for the Score Tracker feature.
 *
 * Manages a three-view flow:
 *  1. **List view** (`GameSessionList`): shows all saved game sessions.
 *     Default view on first load and after returning from the board.
 *  2. **Form view** (`GameSessionForm`): collects player names and creates a
 *     new `GameSession` with scores initialized to 0.
 *  3. **Board view** (`ScoreBoard`): displays the active session's players and
 *     their scores, with +/− controls for live score tracking.
 *
 * All persistence (AsyncStorage via StorageService) is delegated to the
 * `useGameSession` hook — new sessions are saved when created, scores are
 * auto-saved on every change, and existing sessions are loaded on demand.
 */

import React, { useState, useCallback } from 'react';

import { GameSession } from '../../types';
import { useGameSession } from './useGameSession';
import GameSessionForm from './GameSessionForm';
import GameSessionList from './GameSessionList';
import ScoreBoard from './ScoreBoard';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The three distinct views the ScoreScreen can display. */
type ScoreView = 'list' | 'form' | 'board';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ScoreScreen orchestrates navigation between the session list, creation form,
 * and active game board views. Session state and persistence are managed by
 * the `useGameSession` hook.
 */
const ScoreScreen: React.FC = () => {
  const [view, setView] = useState<ScoreView>('list');

  const {
    activeSession,
    createGameSession,
    loadGameSession,
    updatePlayerScore,
    refreshSessions,
    clearActiveSession,
  } = useGameSession();

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Called by GameSessionList when the user taps "New Game". */
  const handleNewGame = useCallback(() => {
    setView('form');
  }, []);

  /**
   * Called by GameSessionForm when the user successfully submits the form.
   * Extracts player names from the pre-built session object and delegates
   * session creation (including ID generation and persistence) to the hook.
   */
  const handleCreateSession = useCallback(
    async (session: GameSession) => {
      const playerNames = session.players.map(p => p.name);
      await createGameSession(playerNames);
      setView('board');
    },
    [createGameSession],
  );

  /**
   * Called by GameSessionList when the user taps an existing session row.
   * Receives the fully loaded GameSession from StorageService via the list.
   */
  const handleLoadSession = useCallback(
    async (session: GameSession) => {
      // Re-load from storage to ensure we have the latest state (in case
      // another render cycle modified scores since the list was populated).
      await loadGameSession(session.sessionId);
      setView('board');
    },
    [loadGameSession],
  );

  /** Returns to the session list from the board view. */
  const handleBackToList = useCallback(async () => {
    clearActiveSession();
    // Refresh the list to reflect any score updates made during the session.
    await refreshSessions();
    setView('list');
  }, [clearActiveSession, refreshSessions]);

  /**
   * Called by ScoreBoard when the user taps +/− for a player.
   * Delegates to the hook which updates state and auto-saves within 200 ms
   * (NFR-P-004).
   */
  const handleScoreChange = useCallback(
    (playerId: string, newScore: number) => {
      if (activeSession === null) return;
      updatePlayerScore(activeSession.sessionId, playerId, newScore);
    },
    [activeSession, updatePlayerScore],
  );

  // ── Render: list view ──────────────────────────────────────────────────────

  if (view === 'list') {
    return (
      <GameSessionList
        onLoadSession={handleLoadSession}
        onNewGame={handleNewGame}
      />
    );
  }

  // ── Render: form view ──────────────────────────────────────────────────────

  if (view === 'form') {
    return <GameSessionForm onCreateSession={handleCreateSession} />;
  }

  // ── Render: game board view ────────────────────────────────────────────────

  if (activeSession === null) {
    // Safety fallback — should not occur in normal flow.
    setView('list');
    return null;
  }

  return (
    <ScoreBoard
      activeSession={activeSession}
      onScoreChange={handleScoreChange}
      onBack={handleBackToList}
    />
  );
};

export default ScoreScreen;
