/**
 * Styles for the Draw feature.
 *
 * See architecture ADR-005, ADR-016 for Draw feature design decisions.
 * All values use density-independent pixels (dp) for cross-platform consistency.
 */

import { StyleSheet } from 'react-native';
import { COLORS } from '../../styles/colors';
import { SPACING, FONT_SIZE, FONT_WEIGHT } from '../../styles/theme';

// ─── Touch circle constants ───────────────────────────────────────────────────

/**
 * Diameter of each touch circle in dp (within the 50–100 dp range per spec).
 * A 70 dp circle is large enough to be clearly visible but does not dominate
 * the screen on small devices.
 */
export const CIRCLE_DIAMETER = 70;

/** Radius of each touch circle, used for centering on the touch point. */
export const CIRCLE_RADIUS = CIRCLE_DIAMETER / 2;

// ─── Stylesheet ───────────────────────────────────────────────────────────────

export const styles = StyleSheet.create({
  /** Root container: fills the available screen below the navigation header. */
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },

  /** Wrapper for the instruction text at the top of the screen. */
  instructionsContainer: {
    paddingVertical: SPACING.sm,
    paddingHorizontal: SPACING.md,
    alignItems: 'center',
  },

  /** Instruction text shown to the user before any touch is detected. */
  instructionsText: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textSecondary,
    textAlign: 'center',
  },

  /**
   * The tappable canvas area that fills remaining space.
   * `overflow: 'hidden'` clips circles at canvas boundaries.
   */
  canvas: {
    flex: 1,
    backgroundColor: COLORS.surface,
    overflow: 'hidden',
  },

  /**
   * Individual touch circle — absolutely positioned inside the canvas.
   * backgroundColor and position are set dynamically per touch point.
   */
  circle: {
    position: 'absolute',
    width: CIRCLE_DIAMETER,
    height: CIRCLE_DIAMETER,
    borderRadius: CIRCLE_RADIUS,
    opacity: 0.9,
  },
});
