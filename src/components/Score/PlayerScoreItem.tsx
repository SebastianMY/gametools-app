/**
 * PlayerScoreItem — a single row in the ScoreBoard showing one player's score.
 *
 * Displays the player's name, current score (large, prominent font), and two
 * buttons to increment (+) or decrement (−) the score by 1. Both buttons meet
 * the 48×48 dp minimum touch target requirement (NFR-A-001).
 */

import React, { useCallback } from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

import { Player } from '../../types';
import { formatScore } from '../../utils/formatters';
import { scoreStyles as styles } from './ScoreScreen.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface PlayerScoreItemProps {
  /** The player whose name and score are displayed. */
  player: Player;
  /** The player's current score value. */
  score: number;
  /**
   * Called when the user taps + or −.
   * Receives the player's ID and the new score value (current ± 1).
   */
  onScoreChange: (playerId: string, newScore: number) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Renders one player row with name, score display, and +/− score buttons.
 */
const PlayerScoreItem: React.FC<PlayerScoreItemProps> = ({
  player,
  score,
  onScoreChange,
}) => {
  const handleIncrement = useCallback(() => {
    onScoreChange(player.playerId, score + 1);
  }, [onScoreChange, player.playerId, score]);

  const handleDecrement = useCallback(() => {
    onScoreChange(player.playerId, score - 1);
  }, [onScoreChange, player.playerId, score]);

  return (
    <View style={styles.playerCard}>
      {/* Player name */}
      <Text
        style={styles.playerCardName}
        numberOfLines={1}
        ellipsizeMode="tail"
        accessibilityLabel={`${player.name}'s score: ${formatScore(score)}`}
      >
        {player.name}
      </Text>

      {/* Score adjustment controls */}
      <View style={styles.playerCardScoreArea}>
        {/* Decrement button */}
        <TouchableOpacity
          style={styles.scoreButton}
          onPress={handleDecrement}
          accessibilityLabel={`Decrease ${player.name}'s score`}
          accessibilityRole="button"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.scoreButtonLabel}>−</Text>
        </TouchableOpacity>

        {/* Current score */}
        <Text style={styles.playerCardScore} accessibilityElementsHidden>
          {formatScore(score)}
        </Text>

        {/* Increment button */}
        <TouchableOpacity
          style={styles.scoreButton}
          onPress={handleIncrement}
          accessibilityLabel={`Increase ${player.name}'s score`}
          accessibilityRole="button"
          hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}
        >
          <Text style={styles.scoreButtonLabel}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

export default PlayerScoreItem;
