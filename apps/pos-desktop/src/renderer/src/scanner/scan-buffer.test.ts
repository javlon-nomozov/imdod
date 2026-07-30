import { describe, expect, it } from 'vitest';
import {
  bufferToCode,
  createScanBuffer,
  pushChar,
  shouldTreatAsScan,
  type ScanBufferState,
} from './scan-buffer';

interface Keypress {
  char: string;
  delay: number;
}

function feed(keys: Keypress[]): ScanBufferState {
  let state = createScanBuffer();
  let time = 1000;
  for (const { char, delay } of keys) {
    time += delay;
    state = pushChar(state, char, time);
  }
  return state;
}

describe('scan-buffer', () => {
  it('tez ketma-ket belgilarni skan deb hisoblaydi', () => {
    const state = feed([
      { char: '2', delay: 0 },
      { char: '0', delay: 10 },
      { char: '0', delay: 10 },
      { char: '0', delay: 10 },
      { char: '1', delay: 10 },
    ]);
    expect(shouldTreatAsScan(state)).toBe(true);
    expect(bufferToCode(state)).toBe('20001');
  });

  it('sekin (odam) yozuvni skan deb hisoblamaydi', () => {
    const state = feed([
      { char: 'a', delay: 0 },
      { char: 'b', delay: 200 },
      { char: 'c', delay: 200 },
      { char: 'd', delay: 200 },
    ]);
    expect(shouldTreatAsScan(state)).toBe(false);
  });

  it('juda qisqa buferni skan deb hisoblamaydi', () => {
    const state = feed([
      { char: '1', delay: 0 },
      { char: '2', delay: 5 },
    ]);
    expect(shouldTreatAsScan(state)).toBe(false);
  });

  it('uzoq tanaffusdan keyingi tez qism yangi bufer sifatida hisoblanadi', () => {
    const state = feed([
      { char: 'x', delay: 0 },
      { char: '2', delay: 500 },
      { char: '0', delay: 10 },
      { char: '0', delay: 10 },
      { char: '1', delay: 10 },
    ]);
    expect(bufferToCode(state)).toBe('2001');
    expect(shouldTreatAsScan(state)).toBe(true);
  });
});
