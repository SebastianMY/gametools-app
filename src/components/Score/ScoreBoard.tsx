/**
 * ScoreBoard — the active game view displaying all players and their scores.
 *
 * Receives the active `GameSession` as a prop and renders:
 *   - A header with player count and session creation timestamp.
 *   - One `PlayerScoreItem` per player.
 *   - A scrollable layout so the board works for 1–8 players on any screen size.
 *
 * Score mutations are communicated upward through `onScoreChange`; this
 * component is intentionally stateless with respect to scores — the parent
 * (ScoreScreen) owns the authoritative session state.
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView } from 'react-native';

import { GameSession } from '../../types';
import { formatPlayerCount, formatTimestamp } from '../../utils/formatters';
import { scoreStyles as styles } from './ScoreScreen.styles';
import PlayerScoreItem from './PlayerScoreItem';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ScoreBoardProps {
  /** The currently active game session to display. */
  activeSession: GameSession;
  /**
   * Called when a player's score changes.
   * @param playerId  The ID of the player whose score changed.
   * @param newScore  The new score value (old ± 1).
   */
  onScoreChange: (playerId: string, newScore: number) => void;
  /** Called when the user taps the "Back" button to return to the session list. */
  onBack: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders the full score-tracking board for an active game session.
 */
const ScoreBoard: React.FC<ScoreBoardProps> = ({
  activeSession,
  onScoreChange,
  onBack,
}) => {
  const playerCount = activeSession.players.length;

  // Stable reference passed to each PlayerScoreItem — the child calls this
  // with its own playerId and the new score, so no per-item binding is needed
  // here (PlayerScoreItem handles that internally).
  const handleScoreChange = useCallback(
    (playerId: string, newScore: number) => {
      onScoreChange(playerId, newScore);
    },
    [onScoreChange],
  );

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.boardContainer}>
          {/* Header row: title group + back button */}
          <View style={styles.boardHeader}>
            <View style={styles.boardTitleGroup}>
              <Text style={styles.boardTitle}>Score Board</Text>
              <Text style={styles.boardSubtitle}>
                {formatPlayerCount(playerCount)} · Started{' '}
                {formatTimestamp(activeSession.createdAt)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.newGameButton}
              onPress={onBack}
              accessibilityLabel="Return to saved games list"
              accessibilityRole="button"
            >
              <Text style={styles.newGameButtonLabel}>All Games</Text>
            </TouchableOpacity>
          </View>

          {/* One row per player */}
          {activeSession.players.map(player => (
            <PlayerScoreItem
              key={player.playerId}
              player={player}
              score={activeSession.scores[player.playerId] ?? 0}
              onScoreChange={handleScoreChange}
            />
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default ScoreBoard;
