import { useState } from 'react';
import { DEFAULT_LOCALE, getMessages, interpolate, type Locale, type Messages } from '@imdod/i18n';

export interface UseTResult {
  t: Messages;
  locale: Locale;
  interpolate: typeof interpolate;
}

/** Til tanlash UI'si keyingi bosqichda — hozircha standart 'uz'. */
export function useT(): UseTResult {
  const [locale] = useState<Locale>(DEFAULT_LOCALE);
  return { t: getMessages(locale), locale, interpolate };
}
