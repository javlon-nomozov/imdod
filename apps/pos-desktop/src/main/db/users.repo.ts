import type { DatabaseSync } from 'node:sqlite';
import * as argon2 from 'argon2';

export interface LocalUser {
  id: string;
  fullName: string;
  role: string;
  pinHash: string;
  isActive: boolean;
}

interface UserRow {
  id: string;
  fullName: string;
  role: string;
  pinHash: string;
  isActive: number;
}

/**
 * PIN endi HAR DOIM shu yerda (Electron main-process) tekshiriladi —
 * online yoki oflayn farqi yo'q. `pinHash` serverdan `GET /sync/users`
 * orqali davriy tortib olinadi (Stage 3 arxitektura qarori).
 */
export class UsersRepo {
  constructor(private readonly db: DatabaseSync) {}

  upsert(user: LocalUser): void {
    this.db
      .prepare(
        `INSERT INTO users (id, fullName, role, pinHash, isActive) VALUES (?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET fullName = excluded.fullName, role = excluded.role,
           pinHash = excluded.pinHash, isActive = excluded.isActive`,
      )
      .run(user.id, user.fullName, user.role, user.pinHash, user.isActive ? 1 : 0);
  }

  /** To'liq ro'yxatni almashtiradi — `GET /sync/users` har doim faol foydalanuvchilarning TO'LIQ holatini beradi. */
  replaceAll(users: LocalUser[]): void {
    this.db.exec('DELETE FROM users');
    for (const user of users) this.upsert(user);
  }

  list(): LocalUser[] {
    const rows = this.db.prepare('SELECT * FROM users').all() as unknown as UserRow[];
    return rows.map((r) => ({ ...r, isActive: r.isActive === 1 }));
  }

  async verifyPin(pin: string): Promise<LocalUser | null> {
    const rows = this.db.prepare('SELECT * FROM users WHERE isActive = 1').all() as unknown as UserRow[];
    for (const row of rows) {
      if (await argon2.verify(row.pinHash, pin)) {
        return { ...row, isActive: row.isActive === 1 };
      }
    }
    return null;
  }
}
