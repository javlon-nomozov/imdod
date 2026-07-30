#!/usr/bin/env node
// Ikkala format (CJS+ESM) chiqaradigan paketlar uchun `dist/cjs` va
// `dist/esm` ichiga Node'ga qaysi biri qaysi turda ekanini aytadigan
// belgi fayllar qo'yadi ("dual package hazard"ning standart yechimi).
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const packageDir = process.argv[2];
if (!packageDir) {
  console.error('Foydalanish: node write-dual-package-markers.mjs <paket-papkasi>');
  process.exit(1);
}

for (const [subdir, type] of [
  ['cjs', 'commonjs'],
  ['esm', 'module'],
]) {
  const dir = join(packageDir, 'dist', subdir);
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'package.json'), JSON.stringify({ type }, null, 2) + '\n');
}
