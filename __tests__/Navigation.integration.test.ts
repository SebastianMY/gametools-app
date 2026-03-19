/**
 * Navigation — Integration Tests
 *
 * Verifies: tab switching, state isolation between tabs, and that the
 * useNavigation hook manages tab state correctly.
 *
 * Coverage targets: useNavigation hook, TabName type.
 */

import { renderHook, act } from '@testing-library/react-native';
import { useNavigation, TabName } from '../src/components/Navigation/useNavigation';

// ─── useNavigation — initial state ────────────────────────────────────────────

describe('useNavigation — initial state', () => {
  it('starts on the Dice tab by default', () => {
    const { result } = renderHook(() => useNavigation());
    expect(result.current.currentTab).toBe('dice');
  });

  it('exposes a setCurrentTab function', () => {
    const { result } = renderHook(() => useNavigation());
    expect(typeof result.current.setCurrentTab).toBe('function');
  });
});

// ─── useNavigation — tab switching ───────────────────────────────────────────

describe('useNavigation — tabs switch correctly', () => {
  it('switches to Score tab', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => {
      result.current.setCurrentTab('score');
    });
    expect(result.current.currentTab).toBe('score');
  });

  it('switches to Draw tab', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => {
      result.current.setCurrentTab('draw');
    });
    expect(result.current.currentTab).toBe('draw');
  });

  it('switches back to Dice tab from Score', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => {
      result.current.setCurrentTab('score');
    });
    act(() => {
      result.current.setCurrentTab('dice');
    });
    expect(result.current.currentTab).toBe('dice');
  });

  it('can cycle through all three tabs', () => {
    const { result } = renderHook(() => useNavigation());
    const tabs: TabName[] = ['dice', 'score', 'draw'];

    tabs.forEach(tab => {
      act(() => {
        result.current.setCurrentTab(tab);
      });
      expect(result.current.currentTab).toBe(tab);
    });
  });

  it('setting the same tab twice keeps the same value', () => {
    const { result } = renderHook(() => useNavigation());
    act(() => {
      result.current.setCurrentTab('score');
    });
    act(() => {
      result.current.setCurrentTab('score');
    });
    expect(result.current.currentTab).toBe('score');
  });
});

// ─── State isolation between hook instances ───────────────────────────────────

describe('useNavigation — state isolation between instances', () => {
  it('two instances have independent state', () => {
    const { result: r1 } = renderHook(() => useNavigation());
    const { result: r2 } = renderHook(() => useNavigation());

    act(() => {
      r1.current.setCurrentTab('score');
    });

    // r2 should not be affected.
    expect(r2.current.currentTab).toBe('dice');
  });

  it('switching in one instance does not affect a second instance', () => {
    const { result: r1 } = renderHook(() => useNavigation());
    const { result: r2 } = renderHook(() => useNavigation());

    act(() => {
      r2.current.setCurrentTab('draw');
    });

    expect(r1.current.currentTab).toBe('dice');
    expect(r2.current.currentTab).toBe('draw');
  });
});

// ─── Tab name type validation ─────────────────────────────────────────────────

describe('TabName type values', () => {
  it('dice is a valid TabName', () => {
    const tab: TabName = 'dice';
    expect(tab).toBe('dice');
  });

  it('score is a valid TabName', () => {
    const tab: TabName = 'score';
    expect(tab).toBe('score');
  });

  it('draw is a valid TabName', () => {
    const tab: TabName = 'draw';
    expect(tab).toBe('draw');
  });
});
