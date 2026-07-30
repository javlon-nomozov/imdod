/**
 * Matnni solishtirish uchun "kanonik" ko'rinishga keltiradi.
 *
 * Import paytida bir xil mahsulot turlicha yozilgan bo'lishi mumkin:
 * katta/kichik harf, ortiqcha bo'shliq, yoki bir safar lotin ("Daftar"),
 * bir safar kirill ("Дафтар") yozuvida. Aniq lingvistik tarjima shart
 * emas — faqat FUZZY solishtirish uchun "bir xilroq" ko'rinish kerak,
 * shuning uchun apostrof kabi belgilar ham farq sifatida hisoblanmaydi.
 */

const CYRILLIC_TO_LATIN: Record<string, string> = {
  а: 'a',
  б: 'b',
  в: 'v',
  г: 'g',
  д: 'd',
  е: 'e',
  ё: 'yo',
  ж: 'j',
  з: 'z',
  и: 'i',
  й: 'y',
  к: 'k',
  л: 'l',
  м: 'm',
  н: 'n',
  о: 'o',
  п: 'p',
  р: 'r',
  с: 's',
  т: 't',
  у: 'u',
  ф: 'f',
  х: 'x',
  ц: 'ts',
  ч: 'ch',
  ш: 'sh',
  щ: 'shch',
  ъ: '',
  ы: 'i',
  ь: '',
  э: 'e',
  ю: 'yu',
  я: 'ya',
  ў: 'o',
  ғ: 'g',
  қ: 'q',
  ҳ: 'h',
};

function transliterate(text: string): string {
  return text
    .split('')
    .map((ch) => CYRILLIC_TO_LATIN[ch] ?? ch)
    .join('');
}

/** Katta/kichik harf, kirill/lotin va tinish belgilari farqini bir xillashtiradi. */
export function normalizeProductName(name: string): string {
  return transliterate(name.toLowerCase())
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .replace(/\s+/g, ' ');
}

/** Ikki satr orasidagi tahrirlash masofasi (dinamik dasturlash, standart algoritm). */
export function levenshteinDistance(a: string, b: string): number {
  const m = a.length;
  const n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;

  let prev: number[] = [];
  for (let j = 0; j <= n; j++) prev.push(j);
  let curr: number[] = new Array(n + 1).fill(0);

  for (let i = 1; i <= m; i++) {
    curr[0] = i;
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      const deletion = (prev[j] ?? 0) + 1;
      const insertion = (curr[j - 1] ?? 0) + 1;
      const substitution = (prev[j - 1] ?? 0) + cost;
      curr[j] = Math.min(deletion, insertion, substitution);
    }
    const tmp = prev;
    prev = curr;
    curr = tmp;
  }

  return prev[n] ?? 0;
}

/** 0..1 oralig'ida o'xshashlik: 1 = aynan bir xil, 0 = umuman mos emas. */
export function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  return 1 - levenshteinDistance(a, b) / maxLen;
}
