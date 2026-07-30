import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';
import { buildInternalBarcode } from '@imdod/core';
import { generateDeviceToken, hashDeviceToken } from '../src/auth/device-token.util';

try {
  // Yangi Node versiyalarida qo'shimcha `dotenv` paketisiz .env yuklash
  // mumkin. `.env` fayli yo'q bo'lsa (masalan CI/Railway'da muhit
  // o'zgaruvchilari to'g'ridan-to'g'ri berilgan) jimgina davom etamiz.
  process.loadEnvFile();
} catch {
  // e'tiborsiz qoldiriladi
}

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const deviceSecret = process.env.DEVICE_TOKEN_SECRET;
  if (!deviceSecret) {
    throw new Error('DEVICE_TOKEN_SECRET .env faylida yo‘q');
  }

  const register = await prisma.register.upsert({
    where: { code: 'K01' },
    update: {},
    create: { code: 'K01', name: 'Bosh kassa' },
  });

  const rawDeviceToken = generateDeviceToken();
  await prisma.device.create({
    data: {
      registerId: register.id,
      name: 'Seed qurilmasi',
      tokenHash: hashDeviceToken(rawDeviceToken, deviceSecret),
    },
  });

  const adminPin = '1234';
  const adminPassword = 'admin12345';
  const admin = await prisma.user.upsert({
    where: { phone: '+998900000001' },
    update: {},
    create: {
      fullName: 'Admin',
      phone: '+998900000001',
      role: 'ADMIN',
      pinHash: await argon2.hash(adminPin),
      passwordHash: await argon2.hash(adminPassword),
    },
  });

  const cashierPin = '1111';
  const cashier = await prisma.user.upsert({
    where: { phone: '+998900000002' },
    update: {},
    create: {
      fullName: 'Birinchi kassir',
      phone: '+998900000002',
      role: 'CASHIER',
      pinHash: await argon2.hash(cashierPin),
    },
  });

  const stationery = await prisma.category.upsert({
    where: { id: 'seed-category-stationery' },
    update: {},
    create: { id: 'seed-category-stationery', nameUz: 'Kanstovar', nameRu: 'Канцтовары' },
  });
  const books = await prisma.category.upsert({
    where: { id: 'seed-category-books' },
    update: {},
    create: { id: 'seed-category-books', nameUz: 'Kitoblar', nameRu: 'Книги' },
  });

  const notebook = await prisma.product.upsert({
    where: { id: 'seed-product-notebook' },
    update: {},
    create: {
      id: 'seed-product-notebook',
      nameUz: 'Daftar 48 varaq',
      nameRu: 'Тетрадь 48 листов',
      unit: 'DONA',
      categoryId: stationery.id,
      costPrice: 3_000,
      retailPrice: 5_000,
      wholesalePrice: 4_000,
      minStock: 20_000,
    },
  });
  const pen = await prisma.product.upsert({
    where: { id: 'seed-product-pen' },
    update: {},
    create: {
      id: 'seed-product-pen',
      nameUz: 'Ruchka ko‘k',
      nameRu: 'Ручка синяя',
      unit: 'DONA',
      categoryId: stationery.id,
      costPrice: 1_000,
      retailPrice: 2_000,
      wholesalePrice: 1_500,
      minStock: 50_000,
    },
  });
  const pencil = await prisma.product.upsert({
    where: { id: 'seed-product-pencil' },
    update: {},
    create: {
      id: 'seed-product-pencil',
      nameUz: 'Qalam oddiy',
      nameRu: 'Карандаш простой',
      unit: 'DONA',
      categoryId: stationery.id,
      costPrice: 500,
      retailPrice: 1_000,
      wholesalePrice: 800,
      minStock: 50_000,
    },
  });
  const eraser = await prisma.product.upsert({
    where: { id: 'seed-product-eraser' },
    update: {},
    create: {
      id: 'seed-product-eraser',
      nameUz: 'O‘chirg‘ich',
      nameRu: 'Ластик',
      unit: 'DONA',
      categoryId: stationery.id,
      costPrice: 500,
      retailPrice: 1_500,
      wholesalePrice: 1_000,
      minStock: 30_000,
    },
  });
  const novel = await prisma.product.upsert({
    where: { id: 'seed-product-novel' },
    update: {},
    create: {
      id: 'seed-product-novel',
      nameUz: 'Badiiy kitob',
      nameRu: 'Художественная книга',
      unit: 'DONA',
      categoryId: books.id,
      costPrice: 15_000,
      retailPrice: 25_000,
      wholesalePrice: 20_000,
      minStock: 10_000,
    },
  });
  const notebookA5 = await prisma.product.upsert({
    where: { id: 'seed-product-notebook-a5' },
    update: {},
    create: {
      id: 'seed-product-notebook-a5',
      nameUz: 'Bloknot A5',
      nameRu: 'Блокнот A5',
      unit: 'DONA',
      categoryId: stationery.id,
      costPrice: 8_000,
      retailPrice: 14_000,
      wholesalePrice: 11_000,
      minStock: 15_000,
    },
  });

  const codes = {
    notebook: buildInternalBarcode(1),
    pen: buildInternalBarcode(2),
    novel: buildInternalBarcode(3),
    notebookA5: buildInternalBarcode(4),
    // Ataylab ikkita mahsulotga bog'langan bitta umumiy kod — ta'minotchi
    // generik shtrix-kod yopishtirgan holatni sinash uchun
    // (scan → 'multiple').
    shared: buildInternalBarcode(99),
  };

  await prisma.barcode.upsert({
    where: { code_productId: { code: codes.notebook, productId: notebook.id } },
    update: {},
    create: { code: codes.notebook, productId: notebook.id, isPrimary: true },
  });
  await prisma.barcode.upsert({
    where: { code_productId: { code: codes.pen, productId: pen.id } },
    update: {},
    create: { code: codes.pen, productId: pen.id, isPrimary: true },
  });
  await prisma.barcode.upsert({
    where: { code_productId: { code: codes.novel, productId: novel.id } },
    update: {},
    create: { code: codes.novel, productId: novel.id, isPrimary: true },
  });
  await prisma.barcode.upsert({
    where: { code_productId: { code: codes.notebookA5, productId: notebookA5.id } },
    update: {},
    create: { code: codes.notebookA5, productId: notebookA5.id, isPrimary: true },
  });
  await prisma.barcode.upsert({
    where: { code_productId: { code: codes.shared, productId: pencil.id } },
    update: {},
    create: { code: codes.shared, productId: pencil.id, isPrimary: true },
  });
  await prisma.barcode.upsert({
    where: { code_productId: { code: codes.shared, productId: eraser.id } },
    update: {},
    create: { code: codes.shared, productId: eraser.id, isPrimary: true },
  });

  console.log('\n=== SEED TAYYOR ===');
  console.log(`Kassa: ${register.code} (${register.name})`);
  console.log(`Qurilma tokeni (FAQAT BIR MARTA ko'rinadi): ${rawDeviceToken}`);
  console.log(`Admin: tel ${admin.phone}, parol "${adminPassword}", PIN "${adminPin}"`);
  console.log(`Kassir: tel ${cashier.phone}, PIN "${cashierPin}"`);
  console.log(
    `Umumiy shtrix-kod (ikkita mahsulotga tegishli — 'multiple' holatini sinash uchun): ${codes.shared}`,
  );
}

main()
  .catch((err: unknown) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
