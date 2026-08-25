import id from "@/content/locales/id.json";
import en from "@/content/locales/en.json";

type Dict = Record<string, string>;

const dicts: Record<string, Dict> = { id: id as Dict, en: en as Dict };
const LOCALE_KEY = "robika.locale";

export function getLocale(): string {
  if (typeof window === "undefined") return "id";
  return localStorage.getItem(LOCALE_KEY) ?? "id";
}

export function setLocale(locale: "id" | "en"): void {
  localStorage.setItem(LOCALE_KEY, locale);
}

/** Terjemahkan kunci dengan placeholder {nama}. Fallback: id -> kunci mentah. */
export function t(key: string, params?: Record<string, string | number>): string {
  const dict = dicts[getLocale()] ?? dicts.id;
  let text = dict[key] ?? dicts.id[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replaceAll(`{${k}}`, String(v));
    }
  }
  return text;
}
