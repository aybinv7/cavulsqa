/**
 * The link between `M3TabPanels` and `M3Tabs`: while the panels are swiped they report their
 * position - 1.4 is 40% of the way from the second page to the third - and the tabs' indicator
 * follows it frame by frame. Plain listeners, not reactive state, so a swipe never re-renders the
 * page that holds both.
 */
export interface TabPager {
  follow(listener: (position: number) => void): () => void;
  update(position: number): void;
}

export function createTabPager(): TabPager {
  const listeners = new Set<(position: number) => void>();
  return {
    follow(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(position) {
      for (const listener of listeners) listener(position);
    },
  };
}
