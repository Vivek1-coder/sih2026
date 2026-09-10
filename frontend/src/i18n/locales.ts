import i18n, { translationKey } from './index';
export const supportedLanguages = [{ code: 'en-IN', label: 'EN' }, { code: 'hi-IN', label: 'हिंदी' }] as const;
export function translate(_language: string, key: string): string { return String(i18n.t(translationKey(key), { lng: _language.startsWith("hi") ? "hi" : "en" })); }
export default i18n;
