/**
 * TouchCanvas — the interactive drawing area for the Draw feature.
 *
 * Renders an opaque surface that receives all touch events via the provided
 * PanResponder handlers and draws a colored circle (CIRCLE_DIAMETER dp) for
 * every active touch point in real-time.
 *
 * Architecture: FR-T-002 (colored circles), NFR-P-002 (latency ≤100 ms).
 */

import React, { memo } from 'react';
import { View, PanResponderInstance } from 'react-native';
import { TouchPoint } from './useTouchHandling';
import { styles, CIRCLE_RADIUS } from './DrawScreen.styles';

// ─── Types ────────────────────────────────────────────────────────────────────

interface TouchCanvasProps {
  /** Ref attached to the root View; used by useTouchHandling to measure offset. */
  canvasRef: React.RefObject<View>;
  /** Active touch points with canvas-local coordinates and assigned colors. */
  activeTouches: TouchPoint[];
  /** Spread from PanResponder.panHandlers to wire up touch event handling. */
  panHandlers: PanResponderInstance['panHandlers'];
  /**
   * Called when the canvas layout changes; triggers a coordinate recalculation
   * inside useTouchHandling so touch circles remain accurately positioned.
   */
  onLayout: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * TouchCanvas renders the full-flex canvas surface and positions a colored
 * circle at each active touch point.  Circles are centered on the contact
 * coordinate by offsetting by CIRCLE_RADIUS in both axes.
 *
 * The component is purely presentational: all touch logic lives in
 * `useTouchHandling`.
 */
const TouchCanvas: React.FC<TouchCanvasProps> = ({
  canvasRef,
  activeTouches,
  panHandlers,
  onLayout,
}) => {
  return (
    <View
      ref={canvasRef}
      style={styles.canvas}
      onLayout={onLayout}
      accessibilityLabel="Draw canvas"
      accessibilityHint="Place your fingers on this area to participate in the draw"
      // Spread PanResponder event handlers onto the view.
      {...panHandlers}
    >
      {activeTouches.map(touch => (
        <View
          key={touch.id}
          style={[
            styles.circle,
            {
              backgroundColor: touch.color,
              // Center the circle on the touch contact point.
              left: touch.x - CIRCLE_RADIUS,
              top: touch.y - CIRCLE_RADIUS,
            },
          ]}
          // Circles must not intercept touch events themselves.
          pointerEvents="none"
        />
      ))}
    </View>
  );
};

/**
 * TouchCanvas is memoized to prevent re-renders when parent state (e.g.
 * winnerId, isSelecting) changes but activeTouches and panHandlers remain
 * stable. NFR-P-002: multi-touch rendering at 60 FPS.
 */
export default memo(TouchCanvas);
