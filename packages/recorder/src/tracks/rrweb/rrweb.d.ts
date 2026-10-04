/**
 * `rrweb` 2.0.0-alpha.4 ships `typings` (the legacy alias), not `types`, and this workspace's
 * pnpm strict layout does not hoist rrweb's own `@rrweb/types` dependency into this package's
 * `node_modules` (it is not one of this package's declared dependencies). Both leave the type
 * checker unable to see `record` and `addCustomEvent` from a plain `import ... from "rrweb"`.
 * This augments the real module with the minimal surface this track uses, scoped to this
 * directory so no shared file needs editing.
 */
declare module "rrweb" {
  export interface RrwebEventWithTime {
    type: number;
    data: unknown;
    timestamp: number;
    delay?: number;
  }

  export interface RrwebRecordOptions {
    emit?: (event: RrwebEventWithTime, isCheckout?: boolean) => void;
    checkoutEveryNth?: number;
    checkoutEveryNms?: number;
    blockSelector?: string;
    maskTextSelector?: string;
    maskAllInputs?: boolean;
    inlineStylesheet?: boolean;
    recordCanvas?: boolean;
    recordCrossOriginIframes?: boolean;
    collectFonts?: boolean;
    inlineImages?: boolean;
  }

  export function record(options?: RrwebRecordOptions): (() => void) | undefined;
  export function addCustomEvent<T>(tag: string, payload: T): void;
}
