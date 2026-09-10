import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

const modules = import.meta.glob('./{en,hi}/*.json', { eager: true, import: 'default' });
const resources: Record<string, Record<string, Record<string, string>>> = { en: {}, hi: {} };
for (const [path, entries] of Object.entries(modules)) {
  const [, language, namespace] = path.match(/\.\/(en|hi)\/(.+)\.json$/)!;
  resources[language][namespace] = entries as Record<string, string>;
}
void i18n.use(LanguageDetector).use(initReactI18next).init({
  resources, fallbackLng: 'en', supportedLngs: ['en', 'hi'], load: 'languageOnly',
  defaultNS: 'common', keySeparator: false,
  interpolation: { escapeValue: false },
  detection: { order: ['localStorage', 'navigator'], lookupLocalStorage: 'medikiosk-language', caches: ['localStorage'] },
  react: { useSuspense: false },
});

export function locale() { return i18n.resolvedLanguage === 'hi' ? 'hi-IN' : 'en-IN'; }
export function translationKey(key: string) {
  if (key.includes(':')) return key;
  const prefix = key.split('.')[0];
  const namespace = prefix === 'nav' || prefix === 'header' ? 'navbar' : prefix === 'lab' ? 'labAssistant' : prefix;
  if (resources.en.common?.[key]) return `common:${key}`;
  return `${namespace}:${key}`;
}
const legacyText = new Map<string, string>();
for (const [ns, entries] of Object.entries(resources.en)) {
  for (const [key, value] of Object.entries(entries)) legacyText.set(value, `${ns}:${key}`);
}
/** Translate keys and known legacy API text; never translate patient-entered data. */
export function ui(key: string, values?: Record<string, unknown>): string {
  const resolved = legacyText.get(key) ?? translationKey(key);
  return i18n.exists(resolved, values ?? {}) ? String(i18n.t(resolved, values ?? {})) : key;
}
export function errorText(message: string): string {
  if (!message) return '';
  if (/timeout|timed out|aborted/i.test(message)) return ui('errors:timeout');
  const resolved = legacyText.get(message) ?? translationKey(message);
  return i18n.exists(resolved) ? String(i18n.t(resolved)) : ui('errors:requestFailed');
}
export function questionText(id: string, fallback: string): string {
  const key = `questions:${id}`;
  return i18n.exists(key) ? String(i18n.t(key)) : fallback;
}
export function formatNumber(value: number, options?: Intl.NumberFormatOptions) {
  return new Intl.NumberFormat(locale(), options).format(value);
}
export function formatDate(value: string | Date, options: Intl.DateTimeFormatOptions = { dateStyle: 'medium' }) {
  const date = value instanceof Date ? value : new Date(value.length === 10 ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? ui('common:unknownDate') : new Intl.DateTimeFormat(locale(), options).format(date);
}
export default i18n;
