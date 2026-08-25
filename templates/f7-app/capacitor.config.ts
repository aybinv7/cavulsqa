import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.example.app",
  appName: "App",
  webDir: "dist",
  plugins: {
    SplashScreen: { launchAutoHide: false },
    Keyboard: { resizeOnFullScreen: true },
    CapacitorSQLite: { androidIsEncryption: false },
  },
};

export default config;
