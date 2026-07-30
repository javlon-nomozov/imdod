# syntax=docker/dockerfile:1

# Imdod API — Railway uchun konteyner.
#
# Nega Debian (slim) va Alpine emas? Prisma va `argon2` (parol hashlash)
# native kutubxonalar. Ularning musl (Alpine) uchun tayyor binarlari
# ishonchsiz — build paytida emas, server ishga tushganda qulaydi.
# Debian glibc bilan bu muammo umuman yo'q.

FROM node:22-slim AS base
ENV PNPM_HOME="/pnpm"
ENV PATH="/pnpm:$PATH"
# Prisma query engine OpenSSL'ga tayanadi.
RUN apt-get update \
  && apt-get install -y --no-install-recommends openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*
RUN corepack enable
WORKDIR /app

# ─── Bog'liqliklar ────────────────────────────────────────────────────
# Avval faqat manifestlarni ko'chiramiz. Kod o'zgarganda, lekin
# bog'liqliklar o'zgarmaganda Docker shu qatlamni keshdan oladi.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml .npmrc ./
COPY apps/api/package.json ./apps/api/
COPY packages/core/package.json ./packages/core/
COPY packages/i18n/package.json ./packages/i18n/
COPY packages/sync/package.json ./packages/sync/
RUN pnpm install --frozen-lockfile

# ─── Build ────────────────────────────────────────────────────────────
FROM deps AS build
COPY . .
RUN pnpm --filter @imdod/api exec prisma generate
# Faqat @imdod/api va uning bog'liqliklarini (core, i18n) quramiz —
# `pnpm build` (turbo, filtersiz) BUTUN monorepoga (jumladan
# apps/pos-desktop'ga) urinardi, lekin bu konteyner faqat api uchun
# bog'liqliklarni o'rnatgan (yuqoridagi `deps` bosqichi) — pos-desktop
# node_modules'siz qolib, build muvaffaqiyatsiz tugardi. `...` — api
# ishlashi uchun kerakli barcha ichki paketlarni ham quradi (core → i18n → api).
RUN pnpm exec turbo run build --filter=@imdod/api...

# ─── Ishga tushirish ──────────────────────────────────────────────────
# node_modules to'liq ko'chiriladi (dev bog'liqliklar bilan) — chunki
# Prisma CLI deploy paytida migratsiyalarni qo'llash uchun kerak.
FROM base AS runtime
ENV NODE_ENV=production
COPY --from=build /app /app

# Root bo'lib ishlamaymiz.
USER node

EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]
