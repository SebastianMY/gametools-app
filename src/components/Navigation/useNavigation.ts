import { useState } from 'react';

/**
 * The three main tabs available in the application.
 * Matches the currentTab state defined in the Navigation component spec (architecture §3).
 */
export type TabName = 'dice' | 'score' | 'draw';

export interface UseNavigationResult {
  /** Currently active tab identifier. */
  currentTab: TabName;
  /** Switch to the given tab. */
  setCurrentTab: (tab: TabName) => void;
}

/**
 * Custom hook for managing bottom tab navigation state.
 *
 * Provides the active tab and a setter to switch tabs.
 * State persists across component re-renders (React useState semantics).
 *
 * @example
 * const { currentTab, setCurrentTab } = useNavigation();
 */
export function useNavigation(): UseNavigationResult {
  const [currentTab, setCurrentTab] = useState<TabName>('dice');
  return { currentTab, setCurrentTab };
}
