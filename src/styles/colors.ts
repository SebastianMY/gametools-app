/**
 * Application color palette.
 *
 * Multi-touch colors (8 distinct colors) are used by the Draw feature to
 * differentiate simultaneous touch points (see ADR-016).
 * UI colors define the general interface appearance (light theme, per ADR-023).
 */

// ─── Multi-touch colors ──────────────────────────────────────────────────────

export const TOUCH_COLOR_RED = '#E53935';
export const TOUCH_COLOR_BLUE = '#1E88E5';
export const TOUCH_COLOR_YELLOW = '#FDD835';
export const TOUCH_COLOR_GREEN = '#43A047';
export const TOUCH_COLOR_PURPLE = '#8E24AA';
export const TOUCH_COLOR_ORANGE = '#FB8C00';
export const TOUCH_COLOR_PINK = '#E91E63';
export const TOUCH_COLOR_TEAL = '#00ACC1';

/**
 * Ordered palette of 8 multi-touch colors.
 * The Draw feature cycles through these using `palette[touchIndex % 8]`
 * when more than 8 simultaneous touches are detected.
 */
export const TOUCH_COLORS: readonly string[] = [
  TOUCH_COLOR_RED,
  TOUCH_COLOR_BLUE,
  TOUCH_COLOR_YELLOW,
  TOUCH_COLOR_GREEN,
  TOUCH_COLOR_PURPLE,
  TOUCH_COLOR_ORANGE,
  TOUCH_COLOR_PINK,
  TOUCH_COLOR_TEAL,
] as const;

// ─── Named color object (convenience export) ─────────────────────────────────

/** All application colors in a single named object for ergonomic imports. */
export const COLORS = {
  // Multi-touch palette
  touchRed: TOUCH_COLOR_RED,
  touchBlue: TOUCH_COLOR_BLUE,
  touchYellow: TOUCH_COLOR_YELLOW,
  touchGreen: TOUCH_COLOR_GREEN,
  touchPurple: TOUCH_COLOR_PURPLE,
  touchOrange: TOUCH_COLOR_ORANGE,
  touchPink: TOUCH_COLOR_PINK,
  touchTeal: TOUCH_COLOR_TEAL,

  // UI colors — light theme (ADR-023)
  /** Primary brand / accent color (game-table green). */
  primary: '#2E7D32',
  /** Secondary accent (warm gold). */
  secondary: '#F9A825',
  /** Default screen background. */
  background: '#FFFFFF',
  /** Surface (cards, modals). */
  surface: '#F5F5F5',
  /** High-emphasis text. */
  textPrimary: '#1A1A1A',
  /** Medium-emphasis text. */
  textSecondary: '#666666',
  /** Disabled / placeholder text. */
  textDisabled: '#9E9E9E',
  /** Destructive actions (delete, error). */
  error: '#C62828',
  /** Success state. */
  success: '#2E7D32',
  /** Dividers and borders. */
  border: '#E0E0E0',
  /** Overlay tint for modals. */
  overlay: 'rgba(0, 0, 0, 0.5)',
} as const;

export type ColorKey = keyof typeof COLORS;
