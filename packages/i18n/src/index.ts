import { uz } from './uz.js';
import { ru } from './ru.js';
import type { Messages } from './uz.js';

export const LOCALES = ['uz', 'ru'] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = 'uz';

export const messages: Record<Locale, Messages> = { uz, ru };

export function getMessages(locale: string | undefined): Messages {
  return isLocale(locale) ? messages[locale] : messages[DEFAULT_LOCALE];
}

export function isLocale(value: unknown): value is Locale {
  return typeof value === 'string' && (LOCALES as readonly string[]).includes(value);
}

/** "Yuborilmagan: {count}" + { count: 3 } → "Yuborilmagan: 3" */
export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => {
    const value = values[key];
    return value === undefined ? match : String(value);
  });
}

export type { Messages };
export { uz, ru };
