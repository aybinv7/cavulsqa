import type { Router } from "framework7/types";
import type { Ref } from "vue";

interface ViewElement extends HTMLElement {
  f7View?: { router?: Router.Router };
}

/**
 * The router of the view an element sits in, found through the DOM: framework7-vue hands a router
 * to route components as a prop but provides nothing to their children, so a shared component
 * would otherwise need it threaded through every screen.
 */
export function useViewRouter(element: Ref<HTMLElement | null | undefined>) {
  const router = (): Router.Router | undefined =>
    (element.value?.closest(".view") as ViewElement | null)?.f7View?.router;

  return {
    router,
    back: () => {
      const current = router();
      if (current && current.history.length > 1) current.back();
    },
    navigate: (url: string) => router()?.navigate(url),
  };
}
