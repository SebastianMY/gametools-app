/**
 * Shared TypeScript interfaces for the Game Companion application.
 *
 * See architecture Section 6 (High-Level Data Model) for field definitions.
 */

/**
 * Represents a single player within a game session.
 * Player names are validated to match /^[a-zA-Z0-9 \-]{1,20}$/ (see ADR-015).
 */
export interface Player {
  /** Unique identifier for the player within the session (UUID-like string). */
  playerId: string;
  /** Display name (1–20 characters: alphanumeric, spaces, and hyphens). */
  name: string;
}

/**
 * Represents a persisted game session managed by the Score Tracker feature.
 * Stored in AsyncStorage under the key `game_session_{sessionId}`.
 */
export interface GameSession {
  /** Unique identifier for the session (e.g. `Date.now() + '-' + uuid`). */
  sessionId: string;
  /** Ordered list of players participating in this session (1–8). */
  players: Player[];
  /** Map of playerId → current score for each player. */
  scores: { [playerId: string]: number };
  /** ISO 8601 timestamp recording when the session was first created. Immutable after creation. */
  createdAt: string;
  /** ISO 8601 timestamp updated every time a score changes. */
  lastModifiedAt: string;
}
