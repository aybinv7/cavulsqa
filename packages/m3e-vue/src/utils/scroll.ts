/** Whether anything between the target and the root is scrolled away from its top. */
export function scrolledAncestor(target: EventTarget | null, root: HTMLElement): boolean {
  let node = target instanceof Element ? target : null;
  while (node && node !== root) {
    if (node instanceof HTMLElement && node.scrollTop > 0) return true;
    node = node.parentElement;
  }
  return false;
}
