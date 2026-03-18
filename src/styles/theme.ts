/**
 * Design system constants: spacing, typography, and layout.
 *
 * All values use density-independent pixels (dp) so they scale correctly
 * across iOS and Android screen densities.
 */

// ─── Spacing ─────────────────────────────────────────────────────────────────

/**
 * Base-8 spacing scale (in dp).
 * Use these constants instead of magic numbers throughout the codebase.
 */
export const SPACING = {
  /** 8 dp — tight gaps, icon padding */
  xs: 8,
  /** 16 dp — standard padding / margin */
  sm: 16,
  /** 24 dp — section spacing */
  md: 24,
  /** 32 dp — large layout gaps */
  lg: 32,
} as const;

export type SpacingKey = keyof typeof SPACING;

// ─── Typography ───────────────────────────────────────────────────────────────

/** Font size scale (in sp, which equals dp on most devices). */
export const FONT_SIZE = {
  /** 12 sp — captions, helper text */
  caption: 12,
  /** 16 sp — body text, inputs */
  body: 16,
  /** 20 sp — sub-headings */
  subheading: 20,
  /** 24 sp — screen headings */
  heading: 24,
} as const;

/** Font weight tokens mapped to React Native weight strings. */
export const FONT_WEIGHT = {
  normal: '400' as const,
  bold: '700' as const,
} as const;

/** Combined typography object for convenient single-import access. */
export const TYPOGRAPHY = {
  fontSize: FONT_SIZE,
  fontWeight: FONT_WEIGHT,
} as const;

export type FontSizeKey = keyof typeof FONT_SIZE;
export type FontWeightKey = keyof typeof FONT_WEIGHT;

// ─── Border radius ────────────────────────────────────────────────────────────

/**
 * Standard border-radius values (in dp).
 * Keeps corners consistent across cards, buttons, and inputs.
 */
export const BORDER_RADIUS = {
  /** 4 dp — subtle rounding (inputs, chips) */
  sm: 4,
  /** 8 dp — standard rounding (buttons, list items) */
  md: 8,
  /** 16 dp — prominent rounding (cards, modals) */
  lg: 16,
  /** 9999 dp — fully circular (avatar, FAB) */
  full: 9999,
} as const;

export type BorderRadiusKey = keyof typeof BORDER_RADIUS;

// ─── Layout ───────────────────────────────────────────────────────────────────

/** Common layout constants. */
export const LAYOUT = {
  /** Minimum touch target size (48 dp — Material Design standard, see architecture §9.6). */
  minTouchTarget: 48,
  /** Maximum content width on large screens. */
  maxContentWidth: 480,
} as const;
