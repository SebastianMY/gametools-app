/**
 * useWinnerSelection — Core draw logic: stability detection, winner selection,
 * haptic feedback, and animation values for the Draw feature.
 *
 * Architecture references: ADR-004 (Animated API), ADR-006 (Expo Haptics),
 * ADR-011 (stability tolerance 5–10 mm), FR-T-004 through FR-T-012.
 */

import { useRef, useState, useEffect, useCallback } from 'react';
import { Animated } from 'react-native';
import { TouchPoint } from './useTouchHandling';
import VibrationService from '../../services/VibrationService';
import RandomService from '../../services/RandomService';

// ─── Constants ────────────────────────────────────────────────────────────────

/**
 * Maximum position drift in dp before a touch is considered unstable.
 * At a typical 160 dp/inch, 20 dp ≈ 3 mm — within the 5–10 mm range
 * specified in ADR-011.  Conservative threshold reduces false resets
 * from natural hand tremor.
 */
const STABILITY_THRESHOLD_DP = 20;

/** How long all touches must remain stable before selection triggers (ms). FR-T-004 */
const STABILITY_DURATION_MS = 3000;

/**
 * How often the stability check runs (ms).
 * 100 ms delivers smooth progress updates while keeping CPU overhead low;
 * far below the 3 s stability window so no event is missed. NFR-P-001.
 */
const STABILITY_POLL_INTERVAL_MS = 100;

/** Target scale factor for the winning circle animation. FR-T-006 */
const WINNER_SCALE = 1.75;

/** Duration of the winning circle scale animation (ms). FR-T-006 */
const WINNER_SCALE_DURATION = 400;

/** Duration of non-winner fade-out animations (ms). FR-T-007 */
const FADE_OUT_DURATION = 700;

/** Time the winner remains visible on screen before the canvas resets (ms). FR-T-008 */
const WINNER_DISPLAY_DURATION_MS = 2500;

// ─── Types ────────────────────────────────────────────────────────────────────

/** Per-touch Animated values managed by the hook. */
type AnimatedTouchValues = {
  scale: Animated.Value;
  opacity: Animated.Value;
};

export interface UseWinnerSelectionResult {
  /** ID of the selected winner touch, or null if no selection has been made. */
  winnerId: string | null;
  /**
   * Stability progress as a fraction in [0, 1].
   * 0 = timer just started; 1 = 3 seconds of stability reached.
   */
  stabilityProgress: number;
  /**
   * True while winner animations are running or the winner is being displayed.
   * Prevents a new draw from starting until the current one completes.
   */
  isSelecting: boolean;
  /**
   * Force immediate winner selection without waiting for the stability timer.
   * No-op when no touches are active or selection is already in progress.
   */
  selectWinner: () => void;
  /**
   * Returns the Animated.Value driving the scale transform of the given touch
   * circle.  Creates a fresh value (1.0) on first access for a new touch ID.
   */
  getAnimatedScale: (touchId: string) => Animated.Value;
  /**
   * Returns the Animated.Value driving the opacity of the given touch circle.
   * Creates a fresh value (1.0) on first access for a new touch ID.
   */
  getAnimatedOpacity: (touchId: string) => Animated.Value;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages stability detection, winner selection, haptic feedback, and
 * per-touch Animated values for the Draw feature canvas.
 *
 * @param activeTouches - Current active touch points from useTouchHandling.
 */
export function useWinnerSelection(
  activeTouches: TouchPoint[],
): UseWinnerSelectionResult {
  // ── React state (drives re-renders) ───────────────────────────────────────

  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [stabilityProgress, setStabilityProgress] = useState(0);

  // ── Mutable refs (no re-render on mutation) ───────────────────────────────

  /** Per-touch Animated.Values (scale + opacity). */
  const animatedValuesRef = useRef<Map<string, AnimatedTouchValues>>(new Map());

  /**
   * The canvas-local position each touch was at when the current stability
   * window started (or after the last reset). Used to measure drift.
   */
  const anchorPositionsRef = useRef<Map<string, { x: number; y: number }>>(
    new Map(),
  );

  /**
   * Timestamp (ms) at which the current stability window began.
   * Null when no stability window is active.
   */
  const stabilityStartTimeRef = useRef<number | null>(null);

  /** Guards against re-entrant selection. */
  const isSelectingRef = useRef(false);

  /**
   * Always-current snapshot of activeTouches for use inside interval callbacks
   * (avoids stale closure over React state).
   */
  const activeTouchesRef = useRef<TouchPoint[]>(activeTouches);
  activeTouchesRef.current = activeTouches;

  /** Touch IDs present in the previous render; used to detect additions/removals. */
  const prevTouchIdsRef = useRef<Set<string>>(new Set());

  // ── Animated value helpers ────────────────────────────────────────────────

  /** Returns existing or newly-created Animated values for a touch ID. */
  const getOrCreateAnimatedValues = useCallback(
    (id: string): AnimatedTouchValues => {
      if (!animatedValuesRef.current.has(id)) {
        animatedValuesRef.current.set(id, {
          scale: new Animated.Value(1),
          opacity: new Animated.Value(1),
        });
      }
      return animatedValuesRef.current.get(id)!;
    },
    [],
  );

  const getAnimatedScale = useCallback(
    (id: string): Animated.Value => getOrCreateAnimatedValues(id).scale,
    [getOrCreateAnimatedValues],
  );

  const getAnimatedOpacity = useCallback(
    (id: string): Animated.Value => getOrCreateAnimatedValues(id).opacity,
    [getOrCreateAnimatedValues],
  );

  // ── Reset ─────────────────────────────────────────────────────────────────

  /**
   * Resets all selection state so a new draw can begin immediately.
   * Called automatically after the winner has been displayed for
   * WINNER_DISPLAY_DURATION_MS. FR-T-009.
   */
  const resetAll = useCallback((): void => {
    // Restore all animated values so circles appear normally after reset.
    animatedValuesRef.current.forEach(vals => {
      vals.scale.setValue(1);
      vals.opacity.setValue(1);
    });
    animatedValuesRef.current.clear();
    anchorPositionsRef.current.clear();
    stabilityStartTimeRef.current = null;
    isSelectingRef.current = false;
    prevTouchIdsRef.current = new Set();
    setWinnerId(null);
    setIsSelecting(false);
    setStabilityProgress(0);
  }, []);

  // ── Winner selection ──────────────────────────────────────────────────────

  /**
   * Performs the full selection sequence:
   * 1. Locks selection (prevents re-entry).
   * 2. Triggers haptic notification. FR-T-005.
   * 3. Picks a random winner. FR-T-003.
   * 4. Animates winner scale-up and non-winner fade-out. FR-T-006, FR-T-007.
   * 5. After WINNER_DISPLAY_DURATION_MS, calls resetAll. FR-T-008.
   */
  const executeSelection = useCallback(
    async (touches: TouchPoint[]): Promise<void> => {
      if (touches.length === 0 || isSelectingRef.current) return;

      isSelectingRef.current = true;
      setIsSelecting(true);

      // Haptic feedback — graceful no-op on unsupported devices (ADR-020).
      await VibrationService.triggerNotification();

      const winner = RandomService.selectRandomItem(touches);
      if (!winner) {
        // Defensive: selectRandomItem returns null only for empty arrays,
        // guarded above, but handle gracefully.
        isSelectingRef.current = false;
        setIsSelecting(false);
        return;
      }

      setWinnerId(winner.id);

      // Build parallel animation: scale winner up, fade out all others.
      const animations: Animated.CompositeAnimation[] = touches.map(touch => {
        const vals = getOrCreateAnimatedValues(touch.id);
        if (touch.id === winner.id) {
          return Animated.timing(vals.scale, {
            toValue: WINNER_SCALE,
            duration: WINNER_SCALE_DURATION,
            useNativeDriver: true,
          });
        }
        return Animated.timing(vals.opacity, {
          toValue: 0,
          duration: FADE_OUT_DURATION,
          useNativeDriver: true,
        });
      });

      Animated.parallel(animations).start(() => {
        setTimeout(resetAll, WINNER_DISPLAY_DURATION_MS);
      });
    },
    [getOrCreateAnimatedValues, resetAll],
  );

  // ── Public selectWinner (Select Now button) ───────────────────────────────

  /**
   * Forces immediate winner selection, bypassing the stability timer.
   * No-op if selection is already in progress or no touches are active. FR-T-011.
   */
  const selectWinner = useCallback((): void => {
    if (isSelectingRef.current || activeTouchesRef.current.length === 0) return;
    stabilityStartTimeRef.current = null;
    setStabilityProgress(0);
    void executeSelection(activeTouchesRef.current);
  }, [executeSelection]);

  // ── Touch change tracking ─────────────────────────────────────────────────

  /**
   * Detects touch additions and removals.
   * - New touch during active window: resets stability timer.
   * - Touch removed with remaining touches: resets timer to 0. FR-T-010.
   * - All touches removed: stops the stability timer.
   */
  useEffect(() => {
    if (isSelectingRef.current) return;

    const currentIds = new Set(activeTouches.map(t => t.id));
    const prevIds = prevTouchIdsRef.current;

    // Remove anchors and animated values for lifted touches.
    let touchRemoved = false;
    prevIds.forEach(id => {
      if (!currentIds.has(id)) {
        touchRemoved = true;
        anchorPositionsRef.current.delete(id);
        animatedValuesRef.current.delete(id);
      }
    });

    // Ensure animated values exist for all current touches.
    activeTouches.forEach(t => getOrCreateAnimatedValues(t.id));

    if (activeTouches.length === 0) {
      // All fingers lifted — pause the stability timer. FR-T-010.
      stabilityStartTimeRef.current = null;
      setStabilityProgress(0);
    } else if (touchRemoved) {
      // At least one finger lifted while others remain — reset timer. FR-T-010.
      stabilityStartTimeRef.current = null;
      setStabilityProgress(0);
      // Capture current positions as new anchors for the fresh window.
      activeTouches.forEach(t => {
        anchorPositionsRef.current.set(t.id, { x: t.x, y: t.y });
      });
    }

    prevTouchIdsRef.current = currentIds;
  }, [activeTouches, getOrCreateAnimatedValues]);

  // ── Stability polling interval ────────────────────────────────────────────

  /**
   * Polls at STABILITY_POLL_INTERVAL_MS to:
   * 1. Initialize the stability window when the first touches appear.
   * 2. Check each touch for drift > STABILITY_THRESHOLD_DP; reset on instability.
   * 3. Update stabilityProgress [0, 1] for visual feedback.
   * 4. Trigger executeSelection once 3 seconds of stability is reached. FR-T-004.
   */
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (isSelectingRef.current) return;

      const touches = activeTouchesRef.current;
      if (touches.length === 0) {
        setStabilityProgress(0);
        return;
      }

      const now = Date.now();

      // Initialise stability window on the first poll after touches appear.
      if (stabilityStartTimeRef.current === null) {
        stabilityStartTimeRef.current = now;
        touches.forEach(t => {
          anchorPositionsRef.current.set(t.id, { x: t.x, y: t.y });
        });
        return;
      }

      // Check all active touches for drift beyond the tolerance threshold.
      let allStable = true;
      touches.forEach(t => {
        const anchor = anchorPositionsRef.current.get(t.id);
        if (!anchor) {
          // Touch appeared since last poll — treat as instability and anchor now.
          anchorPositionsRef.current.set(t.id, { x: t.x, y: t.y });
          allStable = false;
          return;
        }
        const dx = t.x - anchor.x;
        const dy = t.y - anchor.y;
        const drift = Math.sqrt(dx * dx + dy * dy);
        if (drift > STABILITY_THRESHOLD_DP) {
          // Update anchor so subsequent checks measure from new resting position.
          anchorPositionsRef.current.set(t.id, { x: t.x, y: t.y });
          allStable = false;
        }
      });

      if (!allStable) {
        // Restart the stability window.
        stabilityStartTimeRef.current = now;
        setStabilityProgress(0);
        return;
      }

      const elapsed = now - stabilityStartTimeRef.current;
      const progress = Math.min(elapsed / STABILITY_DURATION_MS, 1);
      setStabilityProgress(progress);

      if (elapsed >= STABILITY_DURATION_MS) {
        // Stability achieved — run selection and clear the window.
        stabilityStartTimeRef.current = null;
        setStabilityProgress(0);
        void executeSelection(touches);
      }
    }, STABILITY_POLL_INTERVAL_MS);

    return () => clearInterval(intervalId);
  }, [executeSelection]);

  // ── Return value ──────────────────────────────────────────────────────────

  return {
    winnerId,
    stabilityProgress,
    isSelecting,
    selectWinner,
    getAnimatedScale,
    getAnimatedOpacity,
  };
}
