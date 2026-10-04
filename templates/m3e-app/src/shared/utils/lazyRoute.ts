import type { Router } from "framework7/types";
import { i18n } from "@/plugins/i18n.plugin";
import { m3e } from "@/plugins/m3e.plugin";

type RouteComponentModule = { default: unknown };

/**
 * Framework7 sets `allowPageChange = false` before calling a route's async hook and only restores
 * it from `resolve` or `reject`. A hook that settles neither - a chunk that fails to download, or a
 * module that throws while evaluating - leaves that view's router locked for the rest of the
 * session, so every later navigation and back press is silently ignored. Routing the import
 * through here guarantees the router is always released.
 *
 * A failed tap must not look like a dead button, so the failure also says so, with a reload: the
 * browser can keep a failed module import for the life of the document, which makes a plain retry
 * fail the same way.
 */
export function lazyRoute(
  load: () => Promise<RouteComponentModule>,
): Router.RouteParameters["async"] {
  return function routeAsync({ resolve, reject }) {
    load()
      .then((module) => {
        resolve({ component: module.default });
      })
      .catch((error: unknown) => {
        console.error("[router] Unable to load route component", error);
        reject();
        void reportFailure();
      });
  };
}

async function reportFailure(): Promise<void> {
  const { t } = i18n.global;
  const result = await m3e.config.snackbar.show({
    message: t("shell.routeFailed"),
    action: t("shell.reload"),
  });
  if (result === "action") window.location.reload();
}
