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
 * Persistence (AsyncStorage via StorageService) is handled here — new sessions
 * are saved when created, and existing sessions are loaded on demand.
 */

import React, { useState, useCallback } from 'react';

import { GameSession } from '../../types';
import StorageService from '../../services/StorageService';
import GameSessionForm from './GameSessionForm';
import GameSessionList from './GameSessionList';
import ScoreBoard from './ScoreBoard';

// ─── Types ────────────────────────────────────────────────────────────────────

/** The three distinct views the ScoreScreen can display. */
type ScoreView = 'list' | 'form' | 'board';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ScoreScreen orchestrates navigation between the session list, creation form,
 * and active game board views.
 */
const ScoreScreen: React.FC = () => {
  const [view, setView] = useState<ScoreView>('list');
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  /** Called by GameSessionList when the user taps "New Game". */
  const handleNewGame = useCallback(() => {
    setView('form');
  }, []);

  /**
   * Called by GameSessionForm when the user successfully creates a session.
   * Persists the session to StorageService, then shows the board.
   */
  const handleCreateSession = useCallback(async (session: GameSession) => {
    await StorageService.saveGameSession(session);
    setActiveSession(session);
    setView('board');
  }, []);

  /**
   * Called by GameSessionList when the user taps an existing session row.
   * Receives the fully loaded GameSession from StorageService.
   */
  const handleLoadSession = useCallback((session: GameSession) => {
    setActiveSession(session);
    setView('board');
  }, []);

  /** Returns to the session list from the board view. */
  const handleBackToList = useCallback(() => {
    setActiveSession(null);
    setView('list');
  }, []);

  /**
   * Called by ScoreBoard when the user taps +/− for a player.
   * Updates the activeSession scores immediately (within 50 ms, per NFR-P-003).
   * Persistence is handled separately in TASK-012.
   */
  const handleScoreChange = useCallback((playerId: string, newScore: number) => {
    setActiveSession(prev => {
      if (prev === null) return prev;
      return {
        ...prev,
        scores: { ...prev.scores, [playerId]: newScore },
        lastModifiedAt: new Date().toISOString(),
      };
    });
  }, []);

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
