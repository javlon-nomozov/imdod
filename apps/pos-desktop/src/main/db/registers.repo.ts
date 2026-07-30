import type { DatabaseSync } from 'node:sqlite';

export interface LocalRegister {
  id: string;
  code: string;
  lastReceiptSeq: number;
}

/**
 * Shu qurilmaga biriktirilgan YAGONA kassa haqidagi lokal nusxa.
 * `lastReceiptSeq` — chek raqamini OFLAYNDA generatsiya qilish uchun
 * mahalliy hisoblagich (serverning o'z nusxasidan mustaqil).
 */
export class RegistersRepo {
  constructor(private readonly db: DatabaseSync) {}

  upsert(register: LocalRegister): void {
    this.db
      .prepare(
        `INSERT INTO registers (id, code, lastReceiptSeq) VALUES (?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET code = excluded.code,
           lastReceiptSeq = MAX(registers.lastReceiptSeq, excluded.lastReceiptSeq)`,
      )
      .run(register.id, register.code, register.lastReceiptSeq);
  }

  get(id: string): LocalRegister | null {
    const row = this.db.prepare('SELECT * FROM registers WHERE id = ?').get(id) as
      | LocalRegister
      | undefined;
    return row ?? null;
  }

  /**
   * Shu qurilmaga tegishli YAGONA kassa — `GET /sync/register` har doim
   * faqat SHU qurilmaning o'z kassasini qaytaradi, shuning uchun jadvalda
   * hech qachon bir nechta qator bo'lmaydi.
   */
  getMine(): LocalRegister | null {
    const row = this.db.prepare('SELECT * FROM registers LIMIT 1').get() as LocalRegister | undefined;
    return row ?? null;
  }

  /** Keyingi chek raqami uchun ketma-ketlikni oshiradi va yangi qiymatni qaytaradi. */
  nextReceiptSeq(id: string): number {
    this.db.prepare('UPDATE registers SET lastReceiptSeq = lastReceiptSeq + 1 WHERE id = ?').run(id);
    const row = this.db
      .prepare('SELECT lastReceiptSeq FROM registers WHERE id = ?')
      .get(id) as { lastReceiptSeq: number } | undefined;
    if (!row) throw new Error('Register topilmadi');
    return row.lastReceiptSeq;
  }
}
