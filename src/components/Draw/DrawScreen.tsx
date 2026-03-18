/**
 * DrawScreen — main component for the Draw (random winner selection) feature.
 *
 * Presents a full-screen interactive canvas where up to 10 players can place
 * a finger simultaneously.  Each touch is immediately represented by a unique
 * colored circle (FR-T-001, FR-T-002).  Stability detection and winner
 * selection are implemented in TASK-014.
 *
 * Architecture: ADR-005 (PanResponder), ADR-016 (color cycling).
 */

import React, { useRef } from 'react';
import { View, Text } from 'react-native';
import { useTouchHandling } from './useTouchHandling';
import TouchCanvas from './TouchCanvas';
import { styles } from './DrawScreen.styles';

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * DrawScreen mounts the instruction banner and the interactive TouchCanvas.
 *
 * It owns the canvas View ref (needed for coordinate conversion) and the
 * useTouchHandling hook, then delegates rendering circles to TouchCanvas.
 */
const DrawScreen: React.FC = () => {
  /**
   * Ref attached to the TouchCanvas root View.
   * Passed to useTouchHandling so it can call measureInWindow for
   * page-to-canvas coordinate conversion.
   */
  const canvasRef = useRef<View>(null);

  const { panResponder, activeTouches, updateCanvasOffset } =
    useTouchHandling(canvasRef);

  return (
    <View style={styles.container}>
      {/* Instruction banner ─────────────────────────────────────────────── */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsText}>
          Place your fingers and wait...
        </Text>
      </View>

      {/* Interactive canvas ─────────────────────────────────────────────── */}
      <TouchCanvas
        canvasRef={canvasRef}
        activeTouches={activeTouches}
        panHandlers={panResponder.panHandlers}
        onLayout={updateCanvasOffset}
      />
    </View>
  );
};

export default DrawScreen;
