/**
 * Styles for the Score feature screens.
 *
 * Extends globalStyles with Score-specific layout and component styles.
 * All values use theme constants (COLORS, SPACING, FONT_SIZE, etc.) —
 * no magic numbers.
 */

import { StyleSheet } from 'react-native';
import { COLORS } from '../../styles/colors';
import { SPACING, FONT_SIZE, FONT_WEIGHT, BORDER_RADIUS, LAYOUT } from '../../styles/theme';
import { SHADOWS } from '../../styles/globalStyles';

// ─── Shared ──────────────────────────────────────────────────────────────────

export const scoreStyles = StyleSheet.create({
  // ── Screen containers ──────────────────────────────────────────────────────
  screen: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  scrollContent: {
    flexGrow: 1,
    padding: SPACING.sm,
  },

  // ── Form ───────────────────────────────────────────────────────────────────
  formContainer: {
    flex: 1,
    padding: SPACING.sm,
  },
  formTitle: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: SPACING.xs,
  },
  formSubtitle: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.normal,
    color: COLORS.textSecondary,
    marginBottom: SPACING.md,
  },

  // ── Player row ─────────────────────────────────────────────────────────────
  playerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: SPACING.xs,
  },
  playerIndexLabel: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textSecondary,
    width: 24,
    marginTop: 14, // align with text input center
    textAlign: 'center',
  },
  playerInputWrapper: {
    flex: 1,
    marginHorizontal: SPACING.xs,
  },
  playerInput: {
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: BORDER_RADIUS.sm,
    paddingHorizontal: SPACING.sm,
    paddingVertical: SPACING.xs,
    fontSize: FONT_SIZE.body,
    color: COLORS.textPrimary,
    backgroundColor: COLORS.background,
    minHeight: LAYOUT.minTouchTarget,
  },
  playerInputError: {
    borderColor: COLORS.error,
  },
  playerInputErrorText: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.error,
    marginTop: 4,
    marginLeft: 4,
  },

  // ── Remove player button ───────────────────────────────────────────────────
  removeButton: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
    marginTop: 4,
  },
  removeButtonDisabled: {
    opacity: 0.4,
  },
  removeButtonLabel: {
    fontSize: FONT_SIZE.subheading,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.bold,
    lineHeight: FONT_SIZE.subheading,
  },

  // ── Add player button ──────────────────────────────────────────────────────
  addPlayerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    borderStyle: 'dashed',
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    marginTop: SPACING.xs,
    marginBottom: SPACING.sm,
  },
  addPlayerButtonDisabled: {
    borderColor: COLORS.border,
  },
  addPlayerButtonLabel: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  addPlayerButtonLabelDisabled: {
    color: COLORS.textDisabled,
  },

  // ── Player count hint ──────────────────────────────────────────────────────
  playerCountHint: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },

  // ── Create Game button ─────────────────────────────────────────────────────
  createButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs,
    paddingHorizontal: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: SPACING.sm,
    ...SHADOWS.sm,
  },
  createButtonDisabled: {
    backgroundColor: COLORS.textDisabled,
  },
  createButtonLabel: {
    color: COLORS.background,
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
  },

  // ── Game board ─────────────────────────────────────────────────────────────
  boardContainer: {
    flex: 1,
    padding: SPACING.sm,
  },
  boardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  boardTitle: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  boardSubtitle: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
    marginTop: 2,
  },
  boardTitleGroup: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  newGameButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
  },
  newGameButtonLabel: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
  },
  playerCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    flexDirection: 'row',
    alignItems: 'center',
    ...SHADOWS.sm,
  },
  playerCardName: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    flex: 1,
    marginRight: SPACING.xs,
  },
  playerCardScoreArea: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: SPACING.xs,
  },
  playerCardScore: {
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.primary,
    minWidth: 48,
    textAlign: 'center',
  },
  scoreButton: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.surface,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  scoreButtonLabel: {
    fontSize: FONT_SIZE.subheading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    lineHeight: FONT_SIZE.subheading,
  },
  sessionInfo: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginTop: SPACING.sm,
  },

  // ── Session list ───────────────────────────────────────────────────────────
  listContainer: {
    flex: 1,
    padding: SPACING.sm,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: SPACING.sm,
  },
  listTitle: {
    fontSize: FONT_SIZE.heading,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
  },
  listNewGameButton: {
    backgroundColor: COLORS.primary,
    borderRadius: BORDER_RADIUS.md,
    paddingVertical: SPACING.xs / 2,
    paddingHorizontal: SPACING.sm,
    minHeight: LAYOUT.minTouchTarget,
    alignItems: 'center',
    justifyContent: 'center',
    ...SHADOWS.sm,
  },
  listNewGameButtonLabel: {
    fontSize: FONT_SIZE.caption,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.background,
  },
  sessionCard: {
    backgroundColor: COLORS.surface,
    borderRadius: BORDER_RADIUS.lg,
    padding: SPACING.sm,
    marginBottom: SPACING.xs,
    ...SHADOWS.sm,
  },
  sessionCardTouchable: {
    flex: 1,
  },
  sessionCardRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  sessionCardContent: {
    flex: 1,
    marginRight: SPACING.xs,
  },
  sessionCardPlayers: {
    fontSize: FONT_SIZE.body,
    fontWeight: FONT_WEIGHT.bold,
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  sessionCardScores: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textSecondary,
    marginBottom: 4,
  },
  sessionCardTimestamp: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.textDisabled,
  },
  sessionCardDeleteButton: {
    width: LAYOUT.minTouchTarget,
    height: LAYOUT.minTouchTarget,
    borderRadius: BORDER_RADIUS.full,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.background,
    borderWidth: 1,
    borderColor: COLORS.border,
  },
  sessionCardDeleteLabel: {
    fontSize: FONT_SIZE.caption,
    color: COLORS.error,
    fontWeight: FONT_WEIGHT.bold,
  },
  emptyStateContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: SPACING.lg,
  },
  emptyStateText: {
    fontSize: FONT_SIZE.body,
    color: COLORS.textSecondary,
    textAlign: 'center',
    marginBottom: SPACING.sm,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
