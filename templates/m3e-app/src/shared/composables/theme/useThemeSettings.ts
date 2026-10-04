import { applyColorScheme, applySystemTokens, setDarkMode } from "@cavulsqa/m3e-vue";
import { Capacitor } from "@capacitor/core";
import { StatusBar, Style } from "@capacitor/status-bar";
import { usePreferredDark, useStorage } from "@vueuse/core";
import {
  computed,
  effectScope,
  readonly,
  watch,
  type ComputedRef,
  type DeepReadonly,
  type Ref,
} from "vue";
import { EXTRA_COLORS, TYPEFACE } from "@/app/theme.config";
import { m3e } from "@/plugins/m3e.plugin";
import {
  CONTRAST_LEVELS,
  DEFAULT_THEME,
  parseThemeSettings,
  reducedMotionOverride,
  type ThemeSettings,
} from "@/shared/utils/theme/themeSettings";

const STORAGE_KEY = "app-theme";

interface ThemeState {
  settings: Ref<ThemeSettings>;
  isDark: ComputedRef<boolean>;
}

let state: ThemeState | null = null;

function readJson(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function paintColors(settings: ThemeSettings): void {
  try {
    applyColorScheme({
      seed: settings.seed,
      variant: settings.variant,
      contrast: CONTRAST_LEVELS[settings.contrast],
      extras: EXTRA_COLORS,
    });
  } catch (error) {
    console.error("[theme] colour generation failed; falling back to the brand seed", error);
    applyColorScheme({ seed: DEFAULT_THEME.seed, extras: EXTRA_COLORS });
  }
}

async function paintStatusBar(isDark: boolean): Promise<void> {
  if (!Capacitor.isNativePlatform()) return;
  try {
    await StatusBar.setStyle({ style: isDark ? Style.Dark : Style.Light });
  } catch (error) {
    console.warn("[theme] status bar style not applied", error);
  }
}

/**
 * Starts the theme once, before the app mounts: tokens and both colour modes are in the document
 * before the first paint, so there is no flash of an unthemed or wrong-mode screen. Colour changes
 * from the studio coalesce to one regeneration per frame however fast a slider moves.
 */
export function startTheme(): ThemeState {
  if (state) return state;
  const scope = effectScope(true);
  state = scope.run(() => {
    const settings = useStorage<ThemeSettings>(STORAGE_KEY, { ...DEFAULT_THEME }, undefined, {
      serializer: {
        read: (raw) => parseThemeSettings(readJson(raw)),
        write: (value) => JSON.stringify(value),
      },
      writeDefaults: false,
      mergeDefaults: false,
    });
    const prefersDark = usePreferredDark();
    const isDark = computed(
      () =>
        settings.value.mode === "dark" || (settings.value.mode === "system" && prefersDark.value),
    );

    applySystemTokens({ brandTypeface: TYPEFACE, plainTypeface: TYPEFACE });
    paintColors(settings.value);
    setDarkMode(isDark.value);

    let frame = 0;
    watch(
      () => [settings.value.seed, settings.value.variant, settings.value.contrast] as const,
      () => {
        if (frame) return;
        frame = requestAnimationFrame(() => {
          frame = 0;
          paintColors(settings.value);
        });
      },
    );

    watch(
      isDark,
      (dark) => {
        setDarkMode(dark);
        void paintStatusBar(dark);
      },
      { immediate: true },
    );

    watch(
      () => settings.value.motion,
      (motion) => (m3e.config.reducedMotion.value = reducedMotionOverride(motion)),
      { immediate: true },
    );

    return { settings, isDark };
  })!;
  return state;
}

export interface ThemeControls {
  settings: DeepReadonly<Ref<ThemeSettings>>;
  isDark: ComputedRef<boolean>;
  update: (patch: Partial<ThemeSettings>) => void;
  reset: () => void;
}

/** The persisted theme: read it anywhere, change it from the colour studio. */
export function useThemeSettings(): ThemeControls {
  const { settings, isDark } = startTheme();
  return {
    settings: readonly(settings),
    isDark,
    update: (patch) => {
      settings.value = parseThemeSettings({ ...settings.value, ...patch });
    },
    reset: () => {
      settings.value = { ...DEFAULT_THEME };
    },
  };
}
