import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import type { ComputedRef, InjectionKey } from "vue";

export type AppTheme = "ios" | "md" | "auto";
export type AppMode = "light" | "dark";

export interface AppContext {
  theme: AppTheme;
  darkMode: AppMode;
  setTheme: (theme: AppTheme) => void;
  setDarkMode: (mode: AppMode) => Promise<void>;
}

export const AppContextKey: InjectionKey<ComputedRef<AppContext>> = Symbol("AppContext");

/**
 * Called once, by the shell. Both choices persist to local storage so the app opens the way it was
 * left.
 *
 * Switching iOS/Material reloads the page on purpose: Framework7 resolves theme-specific components
 * and CSS variables when it initialises, so flipping `f7.theme` afterwards leaves a half-converted
 * UI. Dark mode needs no reload - it is a class on the root plus the native status bar style.
 */
export const useAppThemeProvider = (): ComputedRef<AppContext> => {
  const theme = useLocalStorage<AppTheme>("app-theme", "auto");
  const darkMode = useLocalStorage<AppMode>(
    "app-dark-mode",
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light",
  );

  const setTheme = (next: AppTheme) => {
    theme.value = next;
    window.location.reload();
  };

  const setDarkMode = async (next: AppMode) => {
    darkMode.value = next;
    f7.setDarkMode(next === "dark");

    if (Capacitor.isNativePlatform()) {
      await StatusBar.setStyle({ style: next === "dark" ? Style.Dark : Style.Light });
    }
  };

  const appContext = computed<AppContext>(() => ({
    theme: theme.value,
    darkMode: darkMode.value,
    setTheme,
    setDarkMode,
  }));

  provide(AppContextKey, appContext);

  onMounted(() => {
    void setDarkMode(darkMode.value);
  });

  return appContext;
};

export const useAppTheme = (): ComputedRef<AppContext> => {
  const context = inject(AppContextKey);
  if (!context) {
    throw new Error("useAppTheme needs useAppThemeProvider() called in a parent component");
  }
  return context;
};
