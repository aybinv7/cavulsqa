/**
 * Patches `history.pushState` and `history.replaceState` and listens for `popstate`, calling
 * `onChange` with `window.location.href` whenever the URL actually changes. Returns a `restore`
 * function that puts the original methods back and removes the listener; restoring is a no-op for
 * any method another patch has since replaced.
 */
export function installRouteChangeTracking(onChange: (url: string) => void): () => void {
  const originalPushState = history.pushState;
  const originalReplaceState = history.replaceState;
  let lastUrl = window.location.href;

  function emitIfChanged(): void {
    const url = window.location.href;
    if (url !== lastUrl) {
      lastUrl = url;
      onChange(url);
    }
  }

  function patchedPushState(this: History, ...args: Parameters<History["pushState"]>): void {
    originalPushState.apply(this, args);
    emitIfChanged();
  }

  function patchedReplaceState(this: History, ...args: Parameters<History["replaceState"]>): void {
    originalReplaceState.apply(this, args);
    emitIfChanged();
  }

  history.pushState = patchedPushState as History["pushState"];
  history.replaceState = patchedReplaceState as History["replaceState"];

  function onPopState(): void {
    emitIfChanged();
  }

  window.addEventListener("popstate", onPopState);

  return function restore(): void {
    if (history.pushState === patchedPushState) {
      history.pushState = originalPushState;
    }
    if (history.replaceState === patchedReplaceState) {
      history.replaceState = originalReplaceState;
    }
    window.removeEventListener("popstate", onPopState);
  };
}
