import type { CapacitorConfig } from "@capacitor/cli";
import { existsSync } from "node:fs";
import { join } from "node:path";

for (const file of [".env.local", ".env"]) {
  const path = join(__dirname, file);
  if (existsSync(path)) process.loadEnvFile(path);
}

/** A flavour built for distribution never points at a laptop, whatever `.env.local` says. */
const DISTRIBUTED = new Set(["staging", "prod"]);

const liveReload =
  process.env.VITE_LIVE_RELOAD === "true" && !DISTRIBUTED.has(process.env.VITE_ENVIRONMENT ?? "");

/**
 * Live reload: the installed debug app loads the dev server instead of its bundled files, so an
 * edit shows on the device without a rebuild. With `adb reverse tcp:5173 tcp:5173` the device's
 * localhost is this machine's, so the default host needs no IP and no shared network.
 */
function liveReloadUrl(): string | undefined {
  if (!liveReload) return undefined;
  const scheme = process.env.VITE_LIVE_RELOAD_SCHEME ?? "http";
  const host = process.env.VITE_LIVE_RELOAD_HOST ?? "localhost";
  const port = process.env.VITE_LIVE_RELOAD_PORT ?? "5173";
  return `${scheme}://${host}:${port}`;
}

const config: CapacitorConfig = {
  appId: "com.example.m3e",
  appName: "M3E",
  webDir: "dist",
  server: {
    url: liveReloadUrl(),
    cleartext: liveReload,
  },
  plugins: {
    SplashScreen: { launchAutoHide: false },
    Keyboard: { resizeOnFullScreen: true },
    CapacitorSQLite: { androidIsEncryption: false },
  },
};

export default config;
