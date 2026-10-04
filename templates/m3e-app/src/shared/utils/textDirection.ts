const RIGHT_TO_LEFT = new Set(["ar", "arc", "ckb", "dv", "fa", "he", "ps", "sd", "ug", "ur", "yi"]);

interface TextInfoLocale {
  getTextInfo?: () => { direction?: string };
  textInfo?: { direction?: string };
}

/**
 * Which way a language is written. Asks the engine first (`Intl.Locale` text info), then a list of
 * the right-to-left scripts' languages, so Arabic lays out mirrored even on a WebView that predates
 * the API.
 */
export function textDirection(locale: string): "ltr" | "rtl" {
  try {
    const info = new Intl.Locale(locale) as Intl.Locale & TextInfoLocale;
    const direction = (info.getTextInfo?.() ?? info.textInfo)?.direction;
    if (direction === "rtl" || direction === "ltr") return direction;
  } catch {
    return "ltr";
  }
  return RIGHT_TO_LEFT.has(locale.split(/[-_]/)[0]!.toLowerCase()) ? "rtl" : "ltr";
}
