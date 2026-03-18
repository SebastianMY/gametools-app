/**
 * ScoreScreen — main entry point for the Score Tracker feature.
 *
 * Manages a three-view flow:
 *  1. **List view** (`GameSessionList`): shows all saved game sessions.
 *     Default view on first load and after returning from the board.
 *  2. **Form view** (`GameSessionForm`): collects player names and creates a
 *     new `GameSession` with scores initialized to 0.
 *  3. **Board view**: displays the active session's players and their scores.
 *
 * Persistence (AsyncStorage via StorageService) is handled here — new sessions
 * are saved when created, and existing sessions are loaded on demand.
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { GameSession } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import StorageService from '../../services/StorageService';
import GameSessionForm from './GameSessionForm';
import GameSessionList from './GameSessionList';
import { scoreStyles as styles } from './ScoreScreen.styles';

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
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.boardContainer}>
          {/* Header */}
          <View style={styles.boardHeader}>
            <Text style={styles.boardTitle}>Score Board</Text>
            <TouchableOpacity
              style={styles.newGameButton}
              onPress={handleBackToList}
              accessibilityLabel="Return to saved games list"
              accessibilityRole="button"
            >
              <Text style={styles.newGameButtonLabel}>New Game</Text>
            </TouchableOpacity>
          </View>

          {/* Player score rows */}
          {activeSession.players.map(player => (
            <View key={player.playerId} style={styles.playerCard}>
              <Text
                style={styles.playerCardName}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {player.name}
              </Text>
              <Text style={styles.playerCardScore}>
                {activeSession.scores[player.playerId]}
              </Text>
            </View>
          ))}

          {/* Session metadata */}
          <Text style={styles.sessionInfo}>
            Session started {formatTimestamp(activeSession.createdAt)}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

export default ScoreScreen;
