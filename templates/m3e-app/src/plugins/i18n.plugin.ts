import { f7 } from "framework7-vue";
import { createI18n } from "vue-i18n";
import { textDirection } from "@/shared/utils/textDirection";
import ar from "@/locales/ar.json";
import en from "@/locales/en.json";
import fr from "@/locales/fr.json";

/**
 * Arabic is `ar-DZ`, not `ar`: Algeria writes Latin digits (bare `ar` formats ٠١٢) and its own month
 * names (جانفي, فيفري ...), and every date and number in the app is formatted with this tag.
 */
export const LOCALES = ["en", "fr", "ar-DZ"] as const;
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
  return fromDevice(navigator.language) ?? "en";
}

/** The app locale for a device language: the same language, whatever its region. */
export function fromDevice(tag: string): AppLocale | null {
  const language = tag.split("-")[0]?.toLowerCase();
  return LOCALES.find((locale) => locale.split("-")[0] === language) ?? null;
}

const SIX_FORMS = ["zero", "one", "two", "few", "many", "other"] as const;

/**
 * `"{count} line | {count} lines"` picks its form from the language's own plural rules: French
 * counts 0 as singular, English does not. A three-form message is `zero | one | other`, and a
 * six-form one is CLDR's full set, `zero | one | two | few | many | other`, which Arabic needs:
 * 3 to 10 take a plural, 11 to 99 a singular accusative, 100 the singular again.
 */
export function pluralRule(locale: AppLocale) {
  const rules = new Intl.PluralRules(locale);
  return (count: number, forms: number) => {
    const category = rules.select(count);
    if (forms === 6) return SIX_FORMS.indexOf(category as (typeof SIX_FORMS)[number]);
    const one = category === "one";
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
  messages: { en, fr, "ar-DZ": ar },
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
