/**
 * Utility functions for formatting data into human-readable strings.
 *
 * All formatters are pure functions with no side effects.
 */

// ─── Timestamp ────────────────────────────────────────────────────────────────

/**
 * Converts an ISO 8601 date-time string to a localized, human-readable string.
 *
 * The output format follows the device's default locale using the Intl API
 * (available on all modern iOS/Android JS engines):
 *   e.g. "Mar 18, 2026, 2:00 PM"
 *
 * @param isoString - A valid ISO 8601 date string (e.g. "2026-03-18T14:00:00Z").
 * @returns A human-readable date/time string, or "Unknown date" if parsing fails.
 *
 * @example
 * formatTimestamp('2026-03-18T14:00:00Z'); // "Mar 18, 2026, 2:00 PM"
 */
export function formatTimestamp(isoString: string): string {
  try {
    const date = new Date(isoString);

    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

    return date.toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return 'Unknown date';
  }
}

// ─── Score ────────────────────────────────────────────────────────────────────

/**
 * Formats a numeric score for display.
 *
 * Positive scores are rendered as-is; negative scores retain their minus sign.
 * Large numbers are formatted with locale-appropriate thousand separators.
 *
 * @param score - The integer score value.
 * @returns A formatted score string (e.g. "1,250" or "-42").
 *
 * @example
 * formatScore(1250);  // "1,250"
 * formatScore(-42);   // "-42"
 * formatScore(0);     // "0"
 */
export function formatScore(score: number): string {
  return score.toLocaleString();
}

// ─── Player count ─────────────────────────────────────────────────────────────

/**
 * Returns a human-readable player count label.
 *
 * @param count - Number of players in a session.
 * @returns Singular or plural label string (e.g. "1 player", "4 players").
 *
 * @example
 * formatPlayerCount(1); // "1 player"
 * formatPlayerCount(4); // "4 players"
 */
export function formatPlayerCount(count: number): string {
  return count === 1 ? '1 player' : `${count} players`;
}

// ─── Relative time ────────────────────────────────────────────────────────────

/**
 * Converts an ISO 8601 date-time string to a relative time description.
 *
 * Examples: "Just now", "5 minutes ago", "3 hours ago", "2 days ago".
 * Falls back to the absolute formatted date for older timestamps.
 *
 * @param isoString - A valid ISO 8601 date string.
 * @returns A relative-time string or an absolute formatted date.
 */
export function formatRelativeTime(isoString: string): string {
  try {
    const date = new Date(isoString);

    if (isNaN(date.getTime())) {
      return 'Unknown date';
    }

    const now = Date.now();
    const diffMs = now - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSeconds < 60) {
      return 'Just now';
    } else if (diffMinutes < 60) {
      return diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
    } else if (diffHours < 24) {
      return diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
    } else if (diffDays < 7) {
      return diffDays === 1 ? 'Yesterday' : `${diffDays} days ago`;
    }

    // Fall back to absolute date for older timestamps
    return formatTimestamp(isoString);
  } catch {
    return 'Unknown date';
  }
}
