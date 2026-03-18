/**
 * Shared style utilities — reusable StyleSheet fragments for common UI patterns.
 *
 * Import individual style objects (e.g. `buttonStyles`, `cardStyles`) and
 * spread or extend them in feature-level StyleSheet.create() calls.
 */

import { StyleSheet } from 'react-native';
import { COLORS } from './colors';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, LAYOUT } from './theme';

// ─── Shadows ──────────────────────────────────────────────────────────────────

/**
 * Cross-platform shadow presets.
 * On Android, `elevation` drives the shadow; on iOS, the shadow* props are used.
 */
export const SHADOWS = {
  sm: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 2,
  },
  md: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.16,
    shadowRadius: 4,
    elevation: 4,
  },
  lg: {
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
} as const;

// ─── Shared styles ────────────────────────────────────────────────────────────

export const globalStyles = StyleSheet.create({
  // ── Layout helpers ──────────────────────────────────────────────────────────
  flex1: {
    flex: 1,
  },
  centered: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  screenContainer: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
  },

  // ── Card ─────────────────────────────────────────────────────────────────────
  card: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    ...SHADOWS.sm,
  },
  cardElevated: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    ...SHADOWS.md,
  },

  // ── Buttons ───────────────────────────────────────────────────────────────────
  buttonPrimary: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonSecondary: {
    backgroundColor: 'transparent',
    borderRadius: BORDER_RADIUS.md,
    borderWidth: 1,
    borderColor: COLORS.primary,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonDanger: {
    backgroundColor: COLORS.error,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonLabel: {
    color: COLORS.background,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
  },
  buttonLabelSecondary: {
    color: COLORS.primary,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
  },

  // ── Typography ────────────────────────────────────────────────────────────────
  heading: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  subheading: {
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  body: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textPrimary,
  },
  caption: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textSecondary,
  },

  // ── Divider ───────────────────────────────────────────────────────────────────
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    marginVertical: SPACING.xs,
  },
});
