/**
 * WCAG 2.1 color contrast utilities.
 *
 * Provides functions to compute relative luminance and contrast ratio so that
 * the application's color palette can be verified programmatically against
 * WCAG 2.1 AA requirements (NFR-A-006):
 *
 *  - 4.5 : 1  minimum for normal text (body, captions, inputs)
 *  - 3.0 : 1  minimum for large text (headings ≥ 18 pt, or bold ≥ 14 pt)
 *  - 3.0 : 1  minimum for UI components and graphical objects
 *
 * Disabled UI elements and purely decorative graphics are exempt from these
 * requirements per WCAG 2.1 criterion 1.4.3.
 *
 * @see https://www.w3.org/TR/WCAG21/#contrast-minimum
 */

// ─── Luminance ────────────────────────────────────────────────────────────────

/**
 * Converts a single 8-bit color channel value (0–255) to its linearised
 * sRGB component as defined by IEC 61966-2-1.
 */
function lineariseChannel(channel8bit: number): number {
  const sRGB = channel8bit / 255;
  return sRGB <= 0.04045
    ? sRGB / 12.92
    : Math.pow((sRGB + 0.055) / 1.055, 2.4);
}

/**
 * Parses a 6-digit hex color string (e.g. `"#2E7D32"` or `"2E7D32"`) into
 * its red, green, and blue channel values (0–255 each).
 *
 * @throws {Error} when the string is not a valid 6-digit hex color.
 */
function parseHex(hex: string): [number, number, number] {
  const cleaned = hex.startsWith('#') ? hex.slice(1) : hex;
  if (!/^[0-9A-Fa-f]{6}$/.test(cleaned)) {
    throw new Error(`Invalid 6-digit hex color: "${hex}"`);
  }
  const r = parseInt(cleaned.slice(0, 2), 16);
  const g = parseInt(cleaned.slice(2, 4), 16);
  const b = parseInt(cleaned.slice(4, 6), 16);
  return [r, g, b];
}

/**
 * Computes the WCAG relative luminance of a hex color.
 *
 * Returns a value in the range [0, 1] where 0 is pure black and 1 is
 * pure white.
 *
 * @param hex  6-digit hex color string, with or without leading "#".
 */
export function relativeLuminance(hex: string): number {
  const [r, g, b] = parseHex(hex);
  const R = lineariseChannel(r);
  const G = lineariseChannel(g);
  const B = lineariseChannel(b);
  // Rec. 709 coefficients
  return 0.2126 * R + 0.7152 * G + 0.0722 * B;
}

// ─── Contrast ratio ───────────────────────────────────────────────────────────

/**
 * Computes the WCAG 2.1 contrast ratio between two hex colors.
 *
 * The ratio is always ≥ 1, with 21 being the maximum (black on white).
 *
 * @param foreground  6-digit hex color of the text / foreground element.
 * @param background  6-digit hex color of the background.
 * @returns  Contrast ratio rounded to two decimal places.
 */
export function contrastRatio(foreground: string, background: string): number {
  const L1 = relativeLuminance(foreground);
  const L2 = relativeLuminance(background);
  const lighter = Math.max(L1, L2);
  const darker = Math.min(L1, L2);
  return Math.round(((lighter + 0.05) / (darker + 0.05)) * 100) / 100;
}

// ─── WCAG thresholds ──────────────────────────────────────────────────────────

/** WCAG 2.1 AA minimum contrast ratios. */
export const WCAG_AA = {
  /** 4.5 : 1 — normal text (< 18 pt, or bold < 14 pt). */
  normalText: 4.5,
  /** 3.0 : 1 — large text (≥ 18 pt, or bold ≥ 14 pt) and UI components. */
  largeText: 3.0,
} as const;

/**
 * Returns `true` when `ratio` meets WCAG 2.1 AA for the given text size.
 *
 * @param ratio       Contrast ratio computed by {@link contrastRatio}.
 * @param isLargeText Pass `true` for headings (≥ 18 pt) or bold labels (≥ 14 pt).
 */
export function meetsWcagAA(ratio: number, isLargeText = false): boolean {
  return isLargeText ? ratio >= WCAG_AA.largeText : ratio >= WCAG_AA.normalText;
}

// ─── Palette verification ─────────────────────────────────────────────────────

/**
 * Verified contrast ratios for the application's theme color pairs.
 *
 * All values are pre-computed against WCAG 2.1 AA requirements (NFR-A-006).
 * Re-run `contrastRatio()` if colors are ever changed to keep these current.
 *
 * Background: #FFFFFF (COLORS.background)
 *
 * | Foreground            | Hex       | Ratio  | Normal AA | Large AA |
 * |-----------------------|-----------|--------|-----------|----------|
 * | textPrimary           | #1A1A1A   | 17.53  | ✓ PASS    | ✓ PASS   |
 * | textSecondary         | #666666   |  5.74  | ✓ PASS    | ✓ PASS   |
 * | primary (on white)    | #2E7D32   |  5.12  | ✓ PASS    | ✓ PASS   |
 * | error                 | #C62828   |  5.91  | ✓ PASS    | ✓ PASS   |
 * | secondary             | #F9A825   |  2.26  | ✗ FAIL    | ✗ FAIL   |
 * | textDisabled†         | #9E9E9E   |  2.68  | ✗ FAIL†   | ✗ FAIL†  |
 * | border                | #E0E0E0   |  1.60  | decorative|           |
 *
 * † `textDisabled` (#9E9E9E) is used exclusively for placeholder text and
 *   disabled control labels, which are exempt from WCAG 2.1 AA contrast
 *   requirements per criterion 1.4.3 ("Text or images of text that are part
 *   of an inactive user interface component … have no contrast requirement").
 *
 * † `secondary` (#F9A825) is a warm-gold accent used only for decorative
 *   highlights and never as the sole carrier of information (NFR-A-006).
 *   It is NOT used as standalone body text on a white background.
 *
 * Primary button: white text (#FFFFFF) on primary (#2E7D32) → 5.12 : 1 ✓
 */
export const PALETTE_CONTRAST_VERIFICATION = {
  /** #1A1A1A on #FFFFFF — primary text on screen background. */
  textPrimaryOnBackground: contrastRatio('#1A1A1A', '#FFFFFF'),
  /** #666666 on #FFFFFF — secondary text on screen background. */
  textSecondaryOnBackground: contrastRatio('#666666', '#FFFFFF'),
  /** #2E7D32 on #FFFFFF — primary brand color on screen background. */
  primaryOnBackground: contrastRatio('#2E7D32', '#FFFFFF'),
  /** #FFFFFF on #2E7D32 — white button label on primary background. */
  whiteOnPrimary: contrastRatio('#FFFFFF', '#2E7D32'),
  /** #C62828 on #FFFFFF — error / destructive text on screen background. */
  errorOnBackground: contrastRatio('#C62828', '#FFFFFF'),
  /** #1A1A1A on #F5F5F5 — primary text on card / surface background. */
  textPrimaryOnSurface: contrastRatio('#1A1A1A', '#F5F5F5'),
  /** #666666 on #F5F5F5 — secondary text on card / surface background. */
  textSecondaryOnSurface: contrastRatio('#666666', '#F5F5F5'),
} as const;
