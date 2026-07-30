export interface MainSession {
  userId: string;
  fullName: string;
  role: string;
  registerId: string;
}

/**
 * PIN endi HAR DOIM main-processda tekshiriladi — shuning uchun "kim
 * kirgan" ma'lumoti ham shu yerda saqlanadi (JWT o'rniga). Faqat xotirada
 * — ilova qayta ishga tushsa kassir yana PIN kiritishi kerak (xavfsizlik
 * uchun ataylab shunday).
 */
let current: MainSession | null = null;

export function getSession(): MainSession | null {
  return current;
}

export function setSession(session: MainSession | null): void {
  current = session;
}
