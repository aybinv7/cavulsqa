/** Whether anything between the target and the root is scrolled away from its top. */
export function scrolledAncestor(target: EventTarget | null, root: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== root) {
    if (node instanceof HTMLElement && node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return false;
}

/** The nearest ancestor that scrolls vertically - Framework7's `.page-content` included. */
export function scrollableAncestor(element: HTMLElement): HTMLElement | null {
  let node = element.parentElement;
  while (node) {
    const { overflowY } = getComputedStyle(node);
    if (overflowY === "auto" || overflowY === "scroll" || node.classList.contains("page-content"))
      return node;
    node = node.parentElement;
  }
  return null;
}
