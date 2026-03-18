import { StyleSheet } from 'react-native';
import { COLORS } from '../../styles/colors';
import { SPACING, BORDER_RADIUS, FONT_SIZE, FONT_WEIGHT, LAYOUT } from '../../styles/theme';
import { SHADOWS } from '../../styles/globalStyles';

/**
 * Styles for the Dice feature screens and components.
 *
 * All values reference theme constants to remain consistent with the
 * design system (see architecture §9 and globalStyles.ts).
 */
const styles = StyleSheet.create({
  // ── Screen container ────────────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
    padding: SPACING.sm,
    alignItems: 'center',
  },

  // ── Dice count display ──────────────────────────────────────────────────────
  diceCountContainer: {
    marginTop: SPACING.lg,
    alignItems: 'center',
    marginBottom: SPACING.md,
  },
  diceCountLabel: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  diceCountValue: {
    fontSize: 72,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    lineHeight: 80,
  },

  // ── Selector ─────────────────────────────────────────────────────────────────
  selectorContainer: {
    width: '100%',
    marginBottom: SPACING.lg,
  },
  selectorLabel: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textSecondary,
    marginBottom: SPACING.xs,
    textTransform: 'uppercase',
    letterSpacing: 1,
    textAlign: 'center',
  },
  selectorRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: SPACING.xs,
  },
  selectorButton: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    borderRadius: BORDER_RADIUS.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    ...SHADOWS.sm,
  },
  selectorButtonActive: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
  },
  selectorButtonText: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  selectorButtonTextActive: {
    color: COLORS.background,
  },

  // ── Roll button ───────────────────────────────────────────────────────────────
  rollButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.lg,
    minHeight: LAYOUT.minTouchTarget,
    minWidth: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SPACING.lg,
    ...SHADOWS.md,
  },
  rollButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  rollButtonLabel: {
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.background,
    letterSpacing: 1,
  },

  // ── Results area ─────────────────────────────────────────────────────────────
  resultsContainer: {
    width: '100%',
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  resultsLabel: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: SPACING.xs,
  },
  diceValuesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  dieChip: {
    width: 44,
    height: 44,
    borderRadius: BORDER_RADIUS.md,
    backgroundColor: COLORS.background,
    borderWidth: 1.5,
    borderColor: COLORS.border,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  dieChipText: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  sumDivider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: COLORS.border,
    width: '80%',
    marginBottom: SPACING.xs,
  },
  sumRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: SPACING.xs,
  },
  sumLabel: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textSecondary,
  },
  sumValue: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },

  // ── Empty state ───────────────────────────────────────────────────────────────
  emptyResultsText: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textDisabled,
    fontStyle: 'italic',
  },
});

export default styles;
