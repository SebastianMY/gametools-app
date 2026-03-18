/**
 * Custom hook for multi-touch detection using React Native's PanResponder.
 *
 * Tracks up to 10 simultaneous touch points, assigns each a unique color from
 * the 8-color palette (cycling with modulo when >8 touches are active), and
 * reports real-time coordinates in canvas-local space.
 *
 * Architecture references: ADR-005 (PanResponder), ADR-016 (color cycling),
 * ADR-017 (fallback strategy), FR-T-001 (10 touch points), FR-T-002 (circles),
 * NFR-P-002 (latency ≤100 ms).
 */

import { useRef, useState, useCallback } from 'react';
import { PanResponder, GestureResponderEvent, View } from 'react-native';
import { TOUCH_COLORS } from '../../styles/colors';

// ─── Public types ─────────────────────────────────────────────────────────────

/** A single active touch point tracked by the Draw feature. */
export interface TouchPoint {
  /** Touch identifier stringified for use as a React key. */
  id: string;
  /** X coordinate relative to the canvas view in dp. */
  x: number;
  /** Y coordinate relative to the canvas view in dp. */
  y: number;
  /** Color assigned from TOUCH_COLORS palette (ADR-016). */
  color: string;
}

export interface UseTouchHandlingResult {
  /** PanResponder instance — spread `panResponder.panHandlers` onto the canvas View. */
  panResponder: ReturnType<typeof PanResponder.create>;
  /** Currently active touch points in canvas-local coordinates. */
  activeTouches: TouchPoint[];
  /** Number of currently active touch points. */
  touchCount: number;
  /**
   * Call this whenever the canvas layout changes (pass to the canvas View's
   * `onLayout` prop) to keep the page-to-local coordinate conversion accurate.
   */
  updateCanvasOffset: () => void;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Manages multi-touch input for the Draw canvas.
 *
 * @param canvasRef - Ref attached to the canvas View; used to convert
 *                    page (screen-absolute) coordinates to canvas-local ones.
 */
export function useTouchHandling(
  canvasRef: React.RefObject<View>
): UseTouchHandlingResult {
  const [activeTouches, setActiveTouches] = useState<TouchPoint[]>([]);

  // ── Internal refs (no re-renders triggered on mutation) ───────────────────

  /**
   * Maps `String(touch.identifier)` → assigned color string.
   * Entries are added on first contact and removed on release.
   */
  const touchColorMapRef = useRef<Map<string, string>>(new Map());

  /**
   * Monotonically increasing counter of total touches ever started.
   * Drives the modulo color assignment described in ADR-016.
   */
  const colorCounterRef = useRef<number>(0);

  /**
   * Cached canvas origin in screen (page) coordinates.
   * Updated via `updateCanvasOffset` whenever the canvas is laid out.
   */
  const canvasOffsetRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  /**
   * Stable ref to the React state setter — enables PanResponder callbacks
   * (created once) to always call the current setter without stale closures.
   */
  const setActiveTouchesRef = useRef(setActiveTouches);
  setActiveTouchesRef.current = setActiveTouches;

  // ── Canvas offset ─────────────────────────────────────────────────────────

  /**
   * Reads the canvas View's position in the window and caches it.
   * Must be called after the view mounts and after any layout change so that
   * pageX/pageY values can be correctly converted to canvas-local coordinates.
   */
  const updateCanvasOffset = useCallback(() => {
    canvasRef.current?.measureInWindow((x, y) => {
      canvasOffsetRef.current = { x, y };
    });
  }, [canvasRef]);

  // ── PanResponder ──────────────────────────────────────────────────────────

  /**
   * Processes the full set of active touches from a native gesture event,
   * assigning colors to newly seen identifiers and updating React state.
   *
   * Called for both start/move events (all touches remain) and release/
   * terminate events (changed touches have already been released on native side
   * so `nativeEvent.touches` naturally excludes them).
   */
  const handleTouchEvent = (evt: GestureResponderEvent): void => {
    const { touches } = evt.nativeEvent;
    const colorMap = touchColorMapRef.current;

    // Assign a color to each touch we haven't seen before.
    touches.forEach(({ identifier }) => {
      const id = String(identifier);
      if (!colorMap.has(id)) {
        const colorIndex = colorCounterRef.current % TOUCH_COLORS.length;
        colorMap.set(id, TOUCH_COLORS[colorIndex]);
        colorCounterRef.current += 1;
      }
    });

    const { x: offsetX, y: offsetY } = canvasOffsetRef.current;

    const nextTouches: TouchPoint[] = touches.map(touch => ({
      id: String(touch.identifier),
      x: touch.pageX - offsetX,
      y: touch.pageY - offsetY,
      color: colorMap.get(String(touch.identifier)) ?? TOUCH_COLORS[0],
    }));

    setActiveTouchesRef.current(nextTouches);
  };

  /**
   * On release or termination, prune stale color assignments so the slot can
   * be reused if the same native identifier is recycled in a later gesture.
   */
  const handleTouchEnd = (evt: GestureResponderEvent): void => {
    const { changedTouches } = evt.nativeEvent;
    changedTouches.forEach(({ identifier }) => {
      touchColorMapRef.current.delete(String(identifier));
    });
    // nativeEvent.touches already excludes the released touches.
    handleTouchEvent(evt);
  };

  const panResponder = useRef(
    PanResponder.create({
      // Claim every touch on this view so we receive all simultaneous contacts.
      onStartShouldSetPanResponder: () => true,
      onStartShouldSetPanResponderCapture: () => true,
      onMoveShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponderCapture: () => true,

      onPanResponderGrant: evt => handleTouchEvent(evt),
      onPanResponderMove: evt => handleTouchEvent(evt),
      onPanResponderRelease: evt => handleTouchEnd(evt),
      onPanResponderTerminate: evt => handleTouchEnd(evt),
    })
  ).current;

  // ── Return value ──────────────────────────────────────────────────────────

  return {
    panResponder,
    activeTouches,
    touchCount: activeTouches.length,
    updateCanvasOffset,
  };
}
