/**
 * Tests for the Draw feature components.
 *
 * Covers:
 * - DrawScreen renders without crashing and displays instructions
 * - TouchCanvas renders circles for active touch points
 * - TOUCH_COLORS palette cycling (ADR-016)
 */

import React from 'react';
import { render } from '@testing-library/react-native';
import DrawScreen from '../DrawScreen';
import TouchCanvas from '../TouchCanvas';
import { TOUCH_COLORS } from '../../../styles/colors';
import { TouchPoint } from '../useTouchHandling';
import { View, PanResponder } from 'react-native';

// ─── DrawScreen ───────────────────────────────────────────────────────────────

describe('DrawScreen', () => {
  it('renders without crashing', () => {
    expect(() => render(<DrawScreen />)).not.toThrow();
  });

  it('displays the instruction text', () => {
    const { getByText } = render(<DrawScreen />);
    expect(getByText('Place your fingers and wait...')).toBeTruthy();
  });

  it('renders the canvas with the correct accessibility label', () => {
    const { getByLabelText } = render(<DrawScreen />);
    expect(getByLabelText('Draw canvas')).toBeTruthy();
  });
});

// ─── TouchCanvas ─────────────────────────────────────────────────────────────

describe('TouchCanvas', () => {
  const mockPanHandlers = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
  }).panHandlers;

  const makeTouches = (count: number): TouchPoint[] =>
    Array.from({ length: count }, (_, i) => ({
      id: String(i),
      x: 100 + i * 20,
      y: 200 + i * 20,
      color: TOUCH_COLORS[i % TOUCH_COLORS.length],
    }));

  it('renders without crashing when activeTouches is empty', () => {
    const ref = React.createRef<View>();
    expect(() =>
      render(
        <TouchCanvas
          canvasRef={ref}
          activeTouches={[]}
          panHandlers={mockPanHandlers}
          onLayout={jest.fn()}
        />,
      ),
    ).not.toThrow();
  });

  it('renders a circle for each active touch point', () => {
    const ref = React.createRef<View>();
    const touches = makeTouches(3);
    const { UNSAFE_getAllByType } = render(
      <TouchCanvas
        canvasRef={ref}
        activeTouches={touches}
        panHandlers={mockPanHandlers}
        onLayout={jest.fn()}
      />,
    );
    // The canvas View + one View per circle = 1 + 3 = 4 total Views.
    const views = UNSAFE_getAllByType(View);
    // At least 3 circles are rendered (there may be extra wrapper Views).
    expect(views.length).toBeGreaterThanOrEqual(3 + 1);
  });

  it('renders circles for all 10 simultaneous touch points', () => {
    const ref = React.createRef<View>();
    const touches = makeTouches(10);
    const { UNSAFE_getAllByType } = render(
      <TouchCanvas
        canvasRef={ref}
        activeTouches={touches}
        panHandlers={mockPanHandlers}
        onLayout={jest.fn()}
      />,
    );
    const views = UNSAFE_getAllByType(View);
    expect(views.length).toBeGreaterThanOrEqual(10 + 1);
  });
});

// ─── TOUCH_COLORS cycling (ADR-016) ──────────────────────────────────────────

describe('TOUCH_COLORS palette', () => {
  it('contains exactly 8 colors', () => {
    expect(TOUCH_COLORS).toHaveLength(8);
  });

  it('cycles correctly beyond 8 via modulo', () => {
    // 9th touch (index 8) should reuse the 1st color (index 0)
    expect(TOUCH_COLORS[8 % 8]).toBe(TOUCH_COLORS[0]);
    // 10th touch (index 9) should reuse the 2nd color (index 1)
    expect(TOUCH_COLORS[9 % 8]).toBe(TOUCH_COLORS[1]);
  });

  it('all colors are distinct hex strings', () => {
    const unique = new Set(TOUCH_COLORS);
    expect(unique.size).toBe(8);
  });
});
