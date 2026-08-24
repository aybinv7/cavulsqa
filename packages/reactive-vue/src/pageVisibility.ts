import {
  getCurrentInstance,
  inject,
  onBeforeUnmount,
  onMounted,
  provide,
  ref,
  type ComponentInternalInstance,
  type InjectionKey,
  type Ref,
} from "vue";

/**
 * Framework7 emits these on the `.page` element. An app on another router passes its own.
 */
export interface PageVisibilityEvents {
  show: readonly string[];
  hide: readonly string[];
}

export const FRAMEWORK7_PAGE_EVENTS: PageVisibilityEvents = {
  show: ["page:beforein", "page:tabshow"],
  hide: ["page:beforeout", "page:tabhide"],
};

const PAGE_VISIBILITY_KEY: InjectionKey<Ref<boolean>> = Symbol("pageVisibility");

const ALWAYS_VISIBLE: { value: boolean } = { value: true };

const ownVisibility = new WeakMap<ComponentInternalInstance, Ref<boolean>>();

function resolvePageEl(node: unknown, pageSelector: string): HTMLElement | null {
  let current = node as Node | null;
  while (current) {
    if (current instanceof HTMLElement) {
      return current.matches(pageSelector) ? current : current.closest(pageSelector);
    }
    current = current.nextSibling;
  }
  return null;
}

/**
 * A page inside an inactive tab starts hidden. Everything else starts visible, including a page
 * whose surrounding view is not a tab at all.
 */
function initialVisibility(pageEl: HTMLElement): boolean {
  const view = pageEl.closest(".view");
  if (!view?.classList.contains("tab")) return true;
  return view.classList.contains("tab-active");
}

export interface ProvidePageVisibilityOptions {
  events?: PageVisibilityEvents;
  pageSelector?: string;
}

export function providePageVisibility(options: ProvidePageVisibilityOptions = {}): Ref<boolean> {
  const events = options.events ?? FRAMEWORK7_PAGE_EVENTS;
  const pageSelector = options.pageSelector ?? ".page";

  const isVisible = ref(true);
  const instance = getCurrentInstance();
  let pageEl: HTMLElement | null = null;

  const show = () => (isVisible.value = true);
  const hide = () => (isVisible.value = false);

  provide(PAGE_VISIBILITY_KEY, isVisible);
  if (instance) ownVisibility.set(instance, isVisible);

  onMounted(() => {
    pageEl = resolvePageEl(instance?.vnode.el ?? instance?.proxy?.$el, pageSelector);
    if (!pageEl) return;
    isVisible.value = initialVisibility(pageEl);
    for (const event of events.show) pageEl.addEventListener(event, show);
    for (const event of events.hide) pageEl.addEventListener(event, hide);
  });

  onBeforeUnmount(() => {
    if (!pageEl) return;
    for (const event of events.show) pageEl.removeEventListener(event, show);
    for (const event of events.hide) pageEl.removeEventListener(event, hide);
    pageEl = null;
  });

  return isVisible;
}

/**
 * The provider's own component reads its ref directly: `provide` is not visible to the component
 * that called it.
 */
export function usePageVisibility(): { value: boolean } {
  const instance = getCurrentInstance();
  if (!instance) return ALWAYS_VISIBLE;
  return ownVisibility.get(instance) ?? inject(PAGE_VISIBILITY_KEY, ALWAYS_VISIBLE);
}
