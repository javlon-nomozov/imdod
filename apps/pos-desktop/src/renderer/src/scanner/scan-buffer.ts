/**
 * HID klaviatura-wedge shtrix-kod skanerlari belgilarni juda tez ketma-ket
 * yuborib, oxirida Enter bosadi. Bu — shu buferni DOM'dan mustaqil,
 * sof holda modellashtiradi (sinash uchun qulay).
 */

export const INTER_KEY_THRESHOLD_MS = 50;
export const MIN_SCAN_LENGTH = 4;

export interface ScanBufferState {
  chars: string[];
  lastTime: number | null;
  /** Bufer boshidan beri barcha oraliqlar chegaradan kichikmi. */
  timingLooksLikeScan: boolean;
}

export function createScanBuffer(): ScanBufferState {
  return { chars: [], lastTime: null, timingLooksLikeScan: true };
}

/** Yangi belgi kelganda buferni yangilaydi (o'zgarmas — yangi holat qaytaradi). */
export function pushChar(state: ScanBufferState, char: string, time: number): ScanBufferState {
  const delta = state.lastTime === null ? null : time - state.lastTime;
  const isStale = delta !== null && delta > INTER_KEY_THRESHOLD_MS;

  if (isStale && state.chars.length > 0) {
    // Bufer eskirgan (odam yozayotganday sekin) — yangisidan boshlanadi.
    return { chars: [char], lastTime: time, timingLooksLikeScan: true };
  }

  return {
    chars: [...state.chars, char],
    lastTime: time,
    timingLooksLikeScan: state.timingLooksLikeScan && !isStale,
  };
}

/** Enter kelganda: to'plangan bufer skan sifatida hisoblansinmi? */
export function shouldTreatAsScan(state: ScanBufferState): boolean {
  return state.chars.length >= MIN_SCAN_LENGTH && state.timingLooksLikeScan;
}

export function bufferToCode(state: ScanBufferState): string {
  return state.chars.join('');
}
