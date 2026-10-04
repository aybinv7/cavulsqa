import { f7 } from "framework7-vue";
import { createI18n } from "vue-i18n";
import { textDirection } from "@/shared/utils/textDirection";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

export const LOCALES = ["en", "fr"] as const;
export type AppLocale = (typeof LOCALES)[number];

const STORAGE_KEY = "app-locale";

const isLocale = (value: unknown): value is AppLocale =>
  typeof value === "string" && (LOCALES as readonly string[]).includes(value);

function initialLocale(): AppLocale {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (isLocale(stored)) return stored;
  } catch {
    return "en";
  }
  const device = navigator.language.split("-")[0];
  return isLocale(device) ? device : "en";
}

/**
 * `"{count} line | {count} lines"` picks its form from the language's own plural rules: French
 * counts 0 as singular, English does not. A three-form message is `zero | one | other`.
 */
function pluralRule(locale: AppLocale) {
  const rules = new Intl.PluralRules(locale);
  return (count: number, forms: number) => {
    const one = rules.select(count) === "one";
    if (forms === 3) return count === 0 ? 0 : one ? 1 : 2;
    return one ? 0 : 1;
  };
}

/**
 * The document's language and direction follow the app's locale: `lang` picks fonts, hyphenation
 * and the screen reader's voice, and `dir` mirrors the layout, which the components read through
 * logical properties and `[dir="rtl"]`. A right-to-left locale needs no other change.
 */
function applyToDocument(locale: AppLocale): void {
  if (typeof document === "undefined") return;
  const direction = textDirection(locale);
  document.documentElement.lang = locale;
  document.documentElement.dir = direction;
  if (f7) f7.rtl = direction === "rtl";
}

export const i18n = createI18n({
  legacy: false,
  locale: initialLocale(),
  fallbackLocale: "en",
  messages: { en, fr },
  pluralRules: Object.fromEntries(LOCALES.map((locale) => [locale, pluralRule(locale)])),
});

applyToDocument(i18n.global.locale.value as AppLocale);

/** Switches language and remembers it; the device language is only the first-run default. */
export function setLocale(locale: AppLocale): void {
  i18n.global.locale.value = locale;
  applyToDocument(locale);
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    return;
  }
}
