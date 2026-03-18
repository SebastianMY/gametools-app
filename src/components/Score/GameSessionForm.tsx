/**
 * GameSessionForm — form for creating a new game session.
 *
 * Allows the user to enter 1–8 player names, validates each name using
 * `playerNameValidator`, and calls `onCreateSession` with a fully
 * initialized `GameSession` when the user taps "Create Game".
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import { GameSession, Player } from '../../types';
import { playerNameValidator } from '../../utils/validation';
import { scoreStyles as styles } from './ScoreScreen.styles';

// ─── Constants ────────────────────────────────────────────────────────────────

const MIN_PLAYERS = 1;
const MAX_PLAYERS = 8;
const DEFAULT_PLAYER_COUNT = 2;

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Generates a short random ID using timestamp + random base-36 suffix.
 * Not cryptographically secure — suitable only for local session/player IDs.
 */
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerField {
  /** Stable key for React list rendering. */
  key: string;
  value: string;
}

interface GameSessionFormProps {
  /** Called when the user successfully creates a game session. */
  onCreateSession: (session: GameSession) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Form that collects player names and emits a `GameSession` on submission.
 *
 * - Renders 1–8 player name inputs with add/remove controls.
 * - Validates each name with `playerNameValidator`; shows inline error messages.
 * - "Create Game" button is disabled until all names are valid and non-empty.
 */
const GameSessionForm: React.FC<GameSessionFormProps> = ({ onCreateSession }) => {
  const [players, setPlayers] = useState<PlayerField[]>(() =>
    Array.from({ length: DEFAULT_PLAYER_COUNT }, () => ({ key: generateId(), value: '' })),
  );

  // ── Derived state ──────────────────────────────────────────────────────────

  /** Validation result for each player field (indexed in sync with `players`). */
  const validationResults = players.map(p => playerNameValidator(p.value));

  /** True only when every field is filled and valid. */
  const isFormValid = validationResults.every(r => r.valid);

  const canAddPlayer = players.length < MAX_PLAYERS;
  const canRemovePlayer = players.length > MIN_PLAYERS;

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleNameChange = useCallback((index: number, text: string) => {
    setPlayers(prev => {
      const next = [...prev];
      next[index] = { ...next[index], value: text };
      return next;
    });
  }, []);

  const handleAddPlayer = useCallback(() => {
    if (!canAddPlayer) return;
    setPlayers(prev => [...prev, { key: generateId(), value: '' }]);
  }, [canAddPlayer]);

  const handleRemovePlayer = useCallback(
    (index: number) => {
      if (!canRemovePlayer) return;
      setPlayers(prev => prev.filter((_, i) => i !== index));
    },
    [canRemovePlayer],
  );

  const handleCreateGame = useCallback(() => {
    if (!isFormValid) return;

    const now = new Date().toISOString();
    const sessionId = generateId();

    const sessionPlayers: Player[] = players.map(p => ({
      playerId: generateId(),
      name: p.value.trim(),
    }));

    const scores: { [playerId: string]: number } = {};
    sessionPlayers.forEach(player => {
      scores[player.playerId] = 0;
    });

    const session: GameSession = {
      sessionId,
      players: sessionPlayers,
      scores,
      createdAt: now,
      lastModifiedAt: now,
    };

    onCreateSession(session);
  }, [isFormValid, players, onCreateSession]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <KeyboardAvoidingView
      style={styles.screen}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.formContainer}>
          <Text style={styles.formTitle}>New Game</Text>
          <Text style={styles.formSubtitle}>
            Enter player names to start a new game session.
          </Text>

          {/* Player name fields */}
          {players.map((player, index) => {
            const result = validationResults[index];
            const showError = player.value.length > 0 && !result.valid;

            return (
              <View key={player.key} style={styles.playerRow}>
                {/* Player number label */}
                <Text style={styles.playerIndexLabel}>{index + 1}</Text>

                {/* Input + error message */}
                <View style={styles.playerInputWrapper}>
                  <TextInput
                    style={[styles.playerInput, showError && styles.playerInputError]}
                    value={player.value}
                    onChangeText={text => handleNameChange(index, text)}
                    placeholder={`Player ${index + 1} name`}
                    placeholderTextColor="#9E9E9E"
                    maxLength={20}
                    returnKeyType="next"
                    autoCapitalize="words"
                    autoCorrect={false}
                    accessibilityLabel={`Player ${index + 1} name`}
                    accessibilityHint="Enter a name using letters, numbers, spaces, or hyphens"
                  />
                  {showError && result.error != null && (
                    <Text style={styles.playerInputErrorText} accessibilityRole="alert">
                      {result.error}
                    </Text>
                  )}
                </View>

                {/* Remove button */}
                <TouchableOpacity
                  style={[
                    styles.removeButton,
                    !canRemovePlayer && styles.removeButtonDisabled,
                  ]}
                  onPress={() => handleRemovePlayer(index)}
                  disabled={!canRemovePlayer}
                  accessibilityLabel={`Remove player ${index + 1}`}
                  accessibilityHint="Removes this player from the game session"
                  accessibilityRole="button"
                  accessibilityState={{ disabled: !canRemovePlayer }}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Text style={styles.removeButtonLabel}>−</Text>
                </TouchableOpacity>
              </View>
            );
          })}

          {/* Player count hint */}
          <Text style={styles.playerCountHint}>
            {players.length} / {MAX_PLAYERS} players
          </Text>

          {/* Add player button */}
          <TouchableOpacity
            style={[styles.addPlayerButton, !canAddPlayer && styles.addPlayerButtonDisabled]}
            onPress={handleAddPlayer}
            disabled={!canAddPlayer}
            accessibilityLabel="Add another player"
            accessibilityHint={`Adds a new player input field (maximum ${MAX_PLAYERS} players)`}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canAddPlayer }}
          >
            <Text
              style={[
                styles.addPlayerButtonLabel,
                !canAddPlayer && styles.addPlayerButtonLabelDisabled,
              ]}
            >
              + Add Player
            </Text>
          </TouchableOpacity>

          {/* Create Game button */}
          <TouchableOpacity
            style={[styles.createButton, !isFormValid && styles.createButtonDisabled]}
            onPress={handleCreateGame}
            disabled={!isFormValid}
            accessibilityLabel="Create Game button"
            accessibilityHint="Creates a new game session with the entered player names and opens the score board"
            accessibilityRole="button"
            accessibilityState={{ disabled: !isFormValid }}
          >
            <Text style={styles.createButtonLabel}>Create Game</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default GameSessionForm;
