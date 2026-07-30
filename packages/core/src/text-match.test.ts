import { describe, expect, it } from 'vitest';
import { levenshteinDistance, normalizeProductName, similarity } from './text-match';

describe('normalizeProductName', () => {
  it('katta-kichik harf va ortiqcha bo‘shliqni bir xillashtiradi', () => {
    expect(normalizeProductName('  Daftar   48  ')).toBe('daftar 48');
  });

  it('kirill yozuvini lotinga o‘giradi', () => {
    expect(normalizeProductName('Дафтар')).toBe('daftar');
  });

  it('apostrof va tinish belgilarini bo‘sh joyga almashtiradi', () => {
    expect(normalizeProductName("O'chirg'ich")).toBe('o chirg ich');
  });
});

describe('levenshteinDistance', () => {
  it('bir xil satrlar uchun 0 qaytaradi', () => {
    expect(levenshteinDistance('daftar', 'daftar')).toBe(0);
  });

  it('bitta harf farqini to‘g‘ri hisoblaydi', () => {
    expect(levenshteinDistance('daftar', 'daftr')).toBe(1);
  });
});

describe('similarity', () => {
  it('bir xil nom lotin va kirill yozuvida ham yuqori score beradi', () => {
    const score = similarity(normalizeProductName('Daftar'), normalizeProductName('Дафтар'));
    expect(score).toBeGreaterThan(0.8);
  });

  it('butunlay boshqa nomlar uchun past score beradi', () => {
    const score = similarity(normalizeProductName('Daftar'), normalizeProductName('Ruchka'));
    expect(score).toBeLessThan(0.5);
  });

  it('aynan bir xil satr uchun 1 qaytaradi', () => {
    expect(similarity('daftar', 'daftar')).toBe(1);
  });
});
