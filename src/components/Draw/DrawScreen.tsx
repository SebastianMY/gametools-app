/**
 * DrawScreen — main component for the Draw (random winner selection) feature.
 *
 * Presents a full-screen interactive canvas where up to 10 players can place
 * a finger simultaneously.  Each touch is represented by an animated colored
 * circle (FR-T-001, FR-T-002).  After 3 seconds of touch stability (FR-T-004),
 * haptic feedback fires (FR-T-005), a random winner is selected (FR-T-003),
 * and winner/non-winner animations play (FR-T-006, FR-T-007).
 *
 * A "Select Now" button (FR-T-011) forces immediate selection at any time.
 *
 * Architecture: ADR-004 (Animated API), ADR-005 (PanResponder), ADR-016
 * (color cycling), ADR-020 (haptic fallback).
 */

import React, { useRef, useMemo, memo } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Animated,
} from 'react-native';
import { useTouchHandling } from './useTouchHandling';
import { useWinnerSelection } from './useWinnerSelection';
import { styles, CIRCLE_RADIUS } from './DrawScreen.styles';
import { COLORS } from '../../styles/colors';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS } from '../../styles/theme';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DrawScreen owns the canvas View ref, the multi-touch hook, and the winner
 * selection hook.  It renders animated circles directly (using Animated.View)
 * so that scale and opacity can be driven by the Animated API without needing
 * an extra component layer.
 */
const DrawScreen: React.FC = () => {
  /**
   * Ref attached to the canvas View.
   * Passed to useTouchHandling for page-to-canvas coordinate conversion.
   */
  const canvasRef = useRef<View>(null);

  const { panResponder, activeTouches, updateCanvasOffset } =
    useTouchHandling(canvasRef);

  const {
    winnerId,
    stabilityProgress,
    isSelecting,
    selectWinner,
    getAnimatedScale,
    getAnimatedOpacity,
  } = useWinnerSelection(activeTouches);

  // ── Derived display state ─────────────────────────────────────────────────

  /**
   * Memoized instruction text for the current draw phase.
   * Recomputes only when the relevant state values change, avoiding
   * unnecessary string allocations on every render. NFR-P-001.
   */
  const instructionText = useMemo((): string => {
    if (isSelecting && winnerId !== null) return 'Winner selected!';
    if (isSelecting) return 'Selecting...';
    if (activeTouches.length === 0) return 'Place your fingers and wait...';
    if (stabilityProgress > 0) {
      const elapsed = (stabilityProgress * 3).toFixed(1);
      return `Hold still... ${elapsed}s / 3.0s`;
    }
    return 'Hold still...';
  }, [isSelecting, winnerId, activeTouches.length, stabilityProgress]);

  /**
   * The "Select Now" button is shown only when at least one touch is active
   * and no selection is already in progress.  It requires ≥1 touch so there
   * is something to select from. FR-T-011.
   */
  const showSelectNow = useMemo(
    () => activeTouches.length >= 1 && !isSelecting,
    [activeTouches.length, isSelecting],
  );

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <View style={styles.container}>
      {/* Instruction / status banner ───────────────────────────────────── */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>{instructionText}</Text>

        {/* Stability progress bar — visible only while stability is building */}
        {stabilityProgress > 0 && !isSelecting && (
          <View style={localStyles.progressBarTrack}>
            <View
              style={[
                localStyles.progressBarFill,
                // Width is driven by React state (not Animated) so a plain
                // percentage string is acceptable here. The update rate
                // (every 100 ms) is smooth enough for a progress bar.
                { width: `${Math.round(stabilityProgress * 100)}%` },
              ]}
            />
          </View>
        )}
      </View>

      {/* Interactive touch canvas ──────────────────────────────────────── */}
      {/*
       * Circles are rendered as Animated.View elements so that scale and
       * opacity can be driven natively (useNativeDriver: true), achieving
       * 60 FPS on the UI thread without JS-side re-renders per frame.
       * ADR-004, NFR-P-001, NFR-P-002.
       */}
      <View
        ref={canvasRef}
        style={styles.canvas}
        onLayout={updateCanvasOffset}
        accessibilityLabel="Draw canvas"
        accessibilityHint="Place your fingers on this area to participate in the draw"
        // Spread PanResponder event handlers so every touch is captured.
        {...panResponder.panHandlers}
      >
        {activeTouches.map(touch => (
          <Animated.View
            key={touch.id}
            style={[
              styles.circle,
              {
                backgroundColor: touch.color,
                // Center the circle on the contact point.
                left: touch.x - CIRCLE_RADIUS,
                top: touch.y - CIRCLE_RADIUS,
                transform: [{ scale: getAnimatedScale(touch.id) }],
                opacity: getAnimatedOpacity(touch.id),
              },
            ]}
            // Circles must not intercept touch events themselves.
            pointerEvents="none"
          />
        ))}
      </View>

      {/* "Select Now" button — forces immediate winner selection ────────── */}
      {showSelectNow && (
        <TouchableOpacity
          style={localStyles.selectNowButton}
          onPress={selectWinner}
          accessibilityLabel="Select Now"
          accessibilityHint="Skips the 3-second timer and selects a winner immediately"
          accessibilityRole="button"
        >
          <Text style={localStyles.selectNowText}>Select Now</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Local styles (DrawScreen-specific additions) ─────────────────────────────

/**
 * Styles used only by DrawScreen that extend DrawScreen.styles.ts.
 * Keeping them here avoids modifying the shared styles file while still
 * keeping the stylesheet co-located with the component.
 */
const localStyles = StyleSheet.create({
  /**
   * Background track for the stability progress bar.
   * Sits below the instruction text, spans 80% of the banner width.
   */
  progressBarTrack: {
    marginTop: SPACING.xs,
    height: 6,
    width: '80%',
    backgroundColor: COLORS.border,
    borderRadius: BORDER_RADIUS.full,
    overflow: 'hidden',
  },

  /** Filled portion of the progress bar; width set dynamically via state. */
  progressBarFill: {
    height: '100%',
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.full,
  },

  /**
   * "Select Now" button container.
   * Sits outside the canvas so it does not interfere with touch tracking.
   */
  selectNowButton: {
    alignSelf: 'center',
    marginVertical: SPACING.sm,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.md,
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    minWidth: 160,
    alignItems: 'center',
  },

  /** Label inside the "Select Now" button. */
  selectNowText: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.background,
  },
});

/**
 * DrawScreen is memoized so that navigator re-renders (e.g. tab focus changes)
 * do not re-mount or re-render the canvas unnecessarily. NFR-P-002.
 */
export default memo(DrawScreen);
