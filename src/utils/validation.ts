/**
 * Input validation utilities.
 *
 * All validators return a `ValidationResult` describing whether the input is
 * valid and, if not, a human-readable error message suitable for display.
 */

export interface ValidationResult {
  valid: boolean;
  error?: string;
}

/**
 * Regular expression for valid player names (per ADR-015).
 * Allows 1–20 characters: a-z, A-Z, 0-9, space, and hyphen.
 * Equivalent to /^[a-zA-Z0-9 \-]{1,20}$/ (hyphen placed at end to avoid escaping).
 */
const PLAYER_NAME_REGEX = /^[a-zA-Z0-9 -]{1,20}$/;

/**
 * Validates a player display name.
 *
 * Rules (ADR-015):
 * - Must not be empty.
 * - Must be at most 20 characters.
 * - Only alphanumeric characters, spaces, and hyphens are allowed.
 *
 * @param name - The raw string entered by the user.
 * @returns `{ valid: true }` on success, or `{ valid: false, error: string }` on failure.
 *
 * @example
 * playerNameValidator('Alice');         // { valid: true }
 * playerNameValidator('');             // { valid: false, error: '...' }
 * playerNameValidator('Alice#Bob');    // { valid: false, error: '...' }
 */
export function playerNameValidator(name: string): ValidationResult {
  if (!name || name.length === 0) {
    return { valid: false, error: 'Player name cannot be empty.' };
  }

  if (name.length > 20) {
    return {
      valid: false,
      error: 'Player name must be 20 characters or fewer.',
    };
  }

  if (!PLAYER_NAME_REGEX.test(name)) {
    return {
      valid: false,
      error:
        'Player name may only contain letters, numbers, spaces, and hyphens.',
    };
  }

  return { valid: true };
}

/**
 * Validates a session ID (non-empty string).
 *
 * @param sessionId - The session identifier to validate.
 * @returns `{ valid: true }` if non-empty, otherwise `{ valid: false, error }`.
 */
export function sessionIdValidator(sessionId: string): ValidationResult {
  if (!sessionId || sessionId.trim().length === 0) {
    return { valid: false, error: 'Session ID cannot be empty.' };
  }
  return { valid: true };
}

/**
 * Validates a player count.
 *
 * @param count - Number of players.
 * @param min  - Minimum allowed count (default: 1).
 * @param max  - Maximum allowed count (default: 8).
 * @returns `{ valid: true }` if within bounds, otherwise `{ valid: false, error }`.
 */
export function playerCountValidator(
  count: number,
  min: number = 1,
  max: number = 8,
): ValidationResult {
  if (!Number.isInteger(count) || count < min || count > max) {
    return {
      valid: false,
      error: `Player count must be a whole number between ${min} and ${max}.`,
    };
  }
  return { valid: true };
}
