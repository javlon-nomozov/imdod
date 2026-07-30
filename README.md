# Imdod

Kitob va kanstovar do'koni uchun savdo tizimi: **POS**, **mobil ilova**, **websayt** va **Telegram bot** — bitta umumiy backend ustida.

## Tizim qismlari

| Papka              | Nima                                            | Holat        |
| ------------------ | ----------------------------------------------- | ------------ |
| `apps/api`         | NestJS + PostgreSQL + Prisma                    | ✅ 1-bosqich |
| `apps/pos-desktop` | Electron + React, oflayn ishlaydigan kassa      | rejalashtir. |
| `apps/mobile`      | Expo — hisobot, skanerlash, mobil savdo         | rejalashtir. |
| `apps/web`         | Next.js — sayt, admin panel, Telegram Mini App  | rejalashtir. |
| `apps/bot`         | Telegram bot (grammY)                           | rejalashtir. |
| `packages/core`    | Savat, narx, to'lov, shtrix-kod — domen mantig' | ✅ tayyor    |
| `packages/i18n`    | uz / ru tarjimalar                              | ✅ tayyor    |

`packages/core` — hisob-kitobning yagona manbai. API, kassa, mobil ilova va bot **bir xil** kodni ishlatadi, shuning uchun kassadagi jami bilan serverdagi jami hech qachon farq qilmaydi.

## Ikki asosiy qoida

**1. Qoldiq hisoblanadi, saqlanmaydi.**
`StockMovement` — o'zgarmas jurnal, qoldiq shu jurnalning yig'indisi. Qo'shiluvchi sonlar (`+5`, `-1`) kelish tartibiga bog'liq emas — shuning uchun 5-6 kassa oflayn ishlagandan keyin sinxronlansa ham konflikt bo'lmaydi.

**2. Pul va miqdor — butun son.**
Pul → butun so'm (`12000`). Miqdor → mingdan bir ulush (`1.5 kg` = `1500`). Float ishlatilsa tiyinlar to'planib, smena yopilganda farq bo'lib chiqadi.

## Shtrix-kod haqida

Imdodda **bitta mahsulotda bir nechta kod** ham, **bitta kod bir nechta mahsulotda** ham bo'lishi mumkin (kanstovarda ta'minotchilar generik kod yopishtiradi). Shuning uchun skanerlash natijasi har doim ro'yxat: bitta topilsa darhol savatga, bir nechta topilsa kassir tanlaydi.

## Onlayn zakaz haqida

Saytdan/botdan berilgan zakaz **ombordan hech narsa kamaytirmaydi va rezerv qilmaydi**. Bu shunchaki yig'ish ro'yxati — xodim tovarni yig'ib qo'yadi. Mijoz kelgach tovar oddiy tarzda kassadan o'tadi; qoldiq faqat o'shanda kamayadi.

---

## Ishga tushirish

Kerakli dasturlar: **Node 22+**, **pnpm 9+**, **Docker Desktop**.

```bash
pnpm install                    # paketlarni o'rnatish
pnpm db:up                      # PostgreSQL'ni ko'tarish (Docker)
pnpm db:migrate                 # migratsiyalarni qo'llash
pnpm --filter api seed          # boshlang'ich ma'lumot: K01 kassa, qurilma tokeni, ADMIN/CASHIER, namunaviy tovarlar
pnpm --filter api dev           # API'ni ishga tushirish (http://localhost:3000)
```

Seed konsolga bir martalik qurilma tokenini chiqaradi — shu token bilan
`POST /auth/pos/login` (`x-device-token` sarlavhasi + PIN `1234` ADMIN
uchun) orqali kirish mumkin.

> ⚠️ Baza **5433**-portda turadi, 5432 emas — bu kompyuterda alohida o'rnatilgan PostgreSQL 5432 ni band qilgan. Sozlama: `docker-compose.yml` va `apps/api/.env`.

Kerakli buyruqlar:

```bash
pnpm test             # barcha testlar
pnpm typecheck        # TypeScript tekshiruvi
pnpm lint             # ESLint
pnpm db:studio        # bazani brauzerda ko'rish
pnpm db:down          # bazani to'xtatish
```

`.env` fayli kerak bo'lsa `.env.example` dan nusxa oling.

## Bosqichlar

- [x] **0** — Monorepo poydevori, Prisma sxemasi, `core` va `i18n`
- [x] **1** — API yadrosi: auth (qurilma tokeni + PIN + admin parol), rollar/guard'lar, katalog CRUD, ombor jurnali, smena, savdo (idempotent)
- [ ] **2** — POS desktop MVP (onlayn)
- [ ] **3** — Oflayn qatlam: SQLite mirror, outbox, sinxronizatsiya
- [ ] **4** — Ombor va ta'minot
- [ ] **5** — Mijozlar va nasiya
- [ ] **6** — Hisobotlar va admin panel
- [ ] **7** — Mobil ilova
- [ ] **8** — Websayt
- [ ] **9** — Telegram bot va Mini App
