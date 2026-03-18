/**
 * GameSessionList — displays all saved game sessions.
 *
 * Loads sessions from StorageService on mount (and after each deletion).
 * Sessions are sorted by `lastModifiedAt` descending (most recent first).
 *
 * Props:
 *  - `onLoadSession` — called with the fully loaded `GameSession` when a
 *    session row is tapped.
 *  - `onNewGame` — called when the "New Game" button is tapped.
 */

import React, { useEffect, useState, useCallback, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';

import { GameSession } from '../../types';
import { formatTimestamp } from '../../utils/formatters';
import StorageService from '../../services/StorageService';
import { scoreStyles as styles } from './ScoreScreen.styles';
import { COLORS } from '../../styles/colors';

// ─── Types ────────────────────────────────────────────────────────────────────

interface GameSessionListProps {
  /** Called with the loaded GameSession when the user taps a session row. */
  onLoadSession: (session: GameSession) => void;
  /** Called when the user taps the "New Game" button. */
  onNewGame: () => void;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns a comma-separated string of player names from the session.
 * e.g. "Alice, Bob, Carol"
 */
function formatPlayerNames(session: GameSession): string {
  return session.players.map(p => p.name).join(', ');
}

/**
 * Returns a score summary string for the session.
 * e.g. "Alice: 25, Bob: 30"
 */
function formatScoreSummary(session: GameSession): string {
  return session.players
    .map(p => `${p.name}: ${session.scores[p.playerId] ?? 0}`)
    .join(', ');
}

/**
 * Sorts GameSession[] by `lastModifiedAt` descending (most recent first).
 * Returns a new array (does not mutate the input).
 */
function sortByLastModified(sessions: GameSession[]): GameSession[] {
  return [...sessions].sort(
    (a, b) =>
      new Date(b.lastModifiedAt).getTime() - new Date(a.lastModifiedAt).getTime(),
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

const GameSessionList: React.FC<GameSessionListProps> = ({
  onLoadSession,
  onNewGame,
}) => {
  const [sessions, setSessions] = useState<GameSession[]>([]);
  const [loading, setLoading] = useState(true);

  // ── Load sessions on mount ─────────────────────────────────────────────────

  const loadSessions = useCallback(async () => {
    setLoading(true);
    const all = await StorageService.listAllGameSessions();
    setSessions(sortByLastModified(all));
    setLoading(false);
  }, []);

  useEffect(() => {
    loadSessions();
  }, [loadSessions]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleTapSession = useCallback(
    async (sessionId: string) => {
      const session = await StorageService.loadGameSession(sessionId);
      if (session !== null) {
        onLoadSession(session);
      }
    },
    [onLoadSession],
  );

  const handleDeleteSession = useCallback(
    async (sessionId: string) => {
      await StorageService.deleteGameSession(sessionId);
      // Optimistically remove from local state without a full reload.
      setSessions(prev => prev.filter(s => s.sessionId !== sessionId));
    },
    [],
  );

  // ── Render: loading state ──────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[styles.screen, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.listContainer}>
          {/* Header row */}
          <View style={styles.listHeader}>
            <Text style={styles.listTitle}>Saved Games</Text>
            <TouchableOpacity
              style={styles.listNewGameButton}
              onPress={onNewGame}
              accessibilityLabel="Start a new game"
              accessibilityHint="Opens the player setup form to create a new game session"
              accessibilityRole="button"
            >
              <Text style={styles.listNewGameButtonLabel}>New Game</Text>
            </TouchableOpacity>
          </View>

          {/* Empty state */}
          {sessions.length === 0 && (
            <View style={styles.emptyStateContainer}>
              <Text style={styles.emptyStateText}>
                {'No saved games yet.\nTap "New Game" to get started!'}
              </Text>
            </View>
          )}

          {/* Session rows */}
          {sessions.map(session => (
            <View key={session.sessionId} style={styles.sessionCard}>
              <View style={styles.sessionCardRow}>
                {/* Tappable content area */}
                <TouchableOpacity
                  style={styles.sessionCardTouchable}
                  onPress={() => handleTapSession(session.sessionId)}
                  accessibilityLabel={`Load game with ${formatPlayerNames(session)}`}
                  accessibilityRole="button"
                  accessibilityHint="Tap to resume this game session"
                >
                  <View style={styles.sessionCardContent}>
                    <Text
                      style={styles.sessionCardPlayers}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatPlayerNames(session)}
                    </Text>
                    <Text
                      style={styles.sessionCardScores}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {formatScoreSummary(session)}
                    </Text>
                    <Text style={styles.sessionCardTimestamp}>
                      {formatTimestamp(session.lastModifiedAt)}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Delete button */}
                <TouchableOpacity
                  style={styles.sessionCardDeleteButton}
                  onPress={() => handleDeleteSession(session.sessionId)}
                  accessibilityLabel={`Delete game with ${formatPlayerNames(session)}`}
                  accessibilityHint="Permanently removes this saved game session"
                  accessibilityRole="button"
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.sessionCardDeleteLabel}>✕</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

/**
 * GameSessionList is memoized to prevent unnecessary re-renders when the
 * parent ScoreScreen updates state unrelated to this view. NFR-P-005.
 */
export default memo(GameSessionList);
