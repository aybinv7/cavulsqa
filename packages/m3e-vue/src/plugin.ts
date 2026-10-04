import type { App } from "vue";
import { M3E_CONFIG, createM3eConfig, type M3eConfig, type M3eOptions } from "./services/config.js";

export interface M3ePlugin {
  /** The same config every component injects - hand `overlays.closeTop` to the Android back handler. */
  readonly config: M3eConfig;
  install(app: App): void;
}

/**
 * Installs the services the components share: the overlay stack, the snackbar queue, the dialog
 * and action-sheet services, the reduced-motion override and the app's haptics. The app owns the
 * instance; nothing in the package holds one of its own.
 */
export function createM3e(options: M3eOptions = {}): M3ePlugin {
  const config = createM3eConfig(options);
  return {
    config,
    install(app: App) {
      app.provide(M3E_CONFIG, config);
    },
  };
}
