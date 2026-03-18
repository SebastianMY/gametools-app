/**
 * ScoreScreen — main entry point for the Score Tracker feature.
 *
 * Manages a two-view flow:
 *  1. **Form view** (`GameSessionForm`): collects player names and creates a
 *     new `GameSession` with scores initialized to 0.
 *  2. **Board view**: displays the active session's players and their scores.
 *
 * Persistence (AsyncStorage) is intentionally omitted here; it will be added
 * in a follow-up task (TASK-010).
 */

import React, { useState, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { GameSession } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import GameSessionForm from './GameSessionForm';
import { scoreStyles as styles } from './ScoreScreen.styles';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * ScoreScreen conditionally renders either the `GameSessionForm` (when no
 * active session exists) or the game board (once a session has been created).
 */
const ScoreScreen: React.FC = () => {
  const [activeSession, setActiveSession] = useState<GameSession | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleCreateSession = useCallback((session: GameSession) => {
    setActiveSession(session);
  }, []);

  const handleNewGame = useCallback(() => {
    setActiveSession(null);
  }, []);

  // ── Render: form view ──────────────────────────────────────────────────────

  if (activeSession === null) {
    return <GameSessionForm onCreateSession={handleCreateSession} />;
  }

  // ── Render: game board view ────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.boardContainer}>
          {/* Header */}
          <View style={styles.boardHeader}>
            <Text style={styles.boardTitle}>Score Board</Text>
            <TouchableOpacity
              style={styles.newGameButton}
              onPress={handleNewGame}
              accessibilityLabel="Start a new game"
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
