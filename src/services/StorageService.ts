/**
 * StorageService — Singleton wrapper around AsyncStorage for game session persistence.
 *
 * All game sessions are stored as serialized JSON with key `game_session_{sessionId}`.
 * See architecture ADR-002, ADR-007, and ADR-018 for design rationale.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { InteractionManager } from 'react-native';
import { GameSession } from '../types';

const SESSION_KEY_PREFIX = 'game_session_';

class StorageService {
  /**
   * Build the AsyncStorage key for a given session ID.
   */
  private buildKey(sessionId: string): string {
    return `${SESSION_KEY_PREFIX}${sessionId}`;
  }

  /**
   * Persist a game session to AsyncStorage as serialized JSON.
   * Silently no-ops on error.
   */
  async saveGameSession(session: GameSession): Promise<void> {
    try {
      const key = this.buildKey(session.sessionId);
      await AsyncStorage.setItem(key, JSON.stringify(session));
    } catch {
      // Gracefully ignore storage errors (no-op)
    }
  }

  /**
   * Retrieve a game session by ID from AsyncStorage.
   * Returns null if the session does not exist or an error occurs.
   */
  async loadGameSession(sessionId: string): Promise<GameSession | null> {
    try {
      const key = this.buildKey(sessionId);
      const raw = await AsyncStorage.getItem(key);
      if (raw === null) {
        return null;
      }
      return JSON.parse(raw) as GameSession;
    } catch {
      return null;
    }
  }

  /**
   * Remove a game session from AsyncStorage.
   * Silently no-ops on error.
   */
  async deleteGameSession(sessionId: string): Promise<void> {
    try {
      const key = this.buildKey(sessionId);
      await AsyncStorage.removeItem(key);
    } catch {
      // Gracefully ignore storage errors (no-op)
    }
  }

  /**
   * List all persisted game sessions, sorted by createdAt descending (newest first).
   * Returns an empty array if no sessions exist or an error occurs.
   */
  async listAllGameSessions(): Promise<GameSession[]> {
    try {
      const allKeys: readonly string[] = await AsyncStorage.getAllKeys();
      const sessionKeys = allKeys.filter((key: string) =>
        key.startsWith(SESSION_KEY_PREFIX)
      );

      if (sessionKeys.length === 0) {
        return [];
      }

      const pairs = await AsyncStorage.multiGet(sessionKeys);
      const sessions: GameSession[] = [];

      for (const [, raw] of pairs as [string, string | null][]) {
        if (raw !== null) {
          try {
            sessions.push(JSON.parse(raw) as GameSession);
          } catch {
            // Skip malformed entries
          }
        }
      }

      // Sort by createdAt descending (newest first)
      sessions.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );

      return sessions;
    } catch {
      return [];
    }
  }

  /**
   * Check whether a session with the given ID exists in AsyncStorage.
   * Returns false on error.
   */
  async sessionExists(sessionId: string): Promise<boolean> {
    try {
      const key = this.buildKey(sessionId);
      const raw = await AsyncStorage.getItem(key);
      return raw !== null;
    } catch {
      return false;
    }
  }

  /**
   * Delete all sessions whose createdAt timestamp is older than `retentionDays` days.
   * Per ADR-018, defaults to 60 days.
   * Silently no-ops on error.
   */
  async cleanupOldSessions(retentionDays: number = 60): Promise<void> {
    try {
      const sessions = await this.listAllGameSessions();
      const cutoffMs = retentionDays * 24 * 60 * 60 * 1000;
      const now = Date.now();

      const keysToDelete: string[] = [];
      for (const session of sessions) {
        const sessionAgeMs = now - new Date(session.createdAt).getTime();
        if (sessionAgeMs > cutoffMs) {
          keysToDelete.push(this.buildKey(session.sessionId));
        }
      }

      if (keysToDelete.length > 0) {
        await AsyncStorage.multiRemove(keysToDelete);
      }
    } catch {
      // Gracefully ignore cleanup errors (no-op)
    }
  }

  /**
   * Schedules stale session cleanup to run after all pending JS interactions
   * and animations complete, ensuring startup UI is never blocked.
   *
   * Per ADR-018 (60-day retention) and NFR-P-006 (app startup <3 s):
   * this is the preferred way to invoke cleanup on app launch.
   * Cleanup runs on the JS thread once the first frame renders and
   * animations finish — invisible to the user.
   */
  scheduleStartupCleanup(retentionDays: number = 60): void {
    InteractionManager.runAfterInteractions(() => {
      // Fire-and-forget: errors are swallowed inside cleanupOldSessions.
      this.cleanupOldSessions(retentionDays).catch(() => {
        // No-op: cleanupOldSessions already handles errors internally.
      });
    });
  }
}

export default new StorageService();
