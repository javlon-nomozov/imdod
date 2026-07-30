import * as argon2 from 'argon2';
import type { Device, PrismaClient, Product, Register, User, UserRole } from '@prisma/client';
import { generateDeviceToken, hashDeviceToken } from '../auth/device-token.util';

export function createRegister(prisma: PrismaClient, code = 'T01'): Promise<Register> {
  return prisma.register.create({ data: { code, name: `Test ${code}` } });
}

export async function createDevice(
  prisma: PrismaClient,
  registerId: string,
  secret: string,
): Promise<{ device: Device; rawToken: string }> {
  const rawToken = generateDeviceToken();
  const device = await prisma.device.create({
    data: { registerId, name: 'Test qurilma', tokenHash: hashDeviceToken(rawToken, secret) },
  });
  return { device, rawToken };
}

export async function createUser(
  prisma: PrismaClient,
  opts: { role?: UserRole; pin?: string; phone?: string; password?: string } = {},
): Promise<User> {
  return prisma.user.create({
    data: {
      fullName: 'Test foydalanuvchi',
      phone: opts.phone,
      role: opts.role ?? 'CASHIER',
      pinHash: await argon2.hash(opts.pin ?? '1234'),
      passwordHash: opts.password ? await argon2.hash(opts.password) : undefined,
    },
  });
}

export function createProduct(
  prisma: PrismaClient,
  opts: { retailPrice?: number; costPrice?: number } = {},
): Promise<Product> {
  return prisma.product.create({
    data: {
      nameUz: 'Test mahsulot',
      nameRu: 'Тест товар',
      unit: 'DONA',
      retailPrice: opts.retailPrice ?? 10_000,
      costPrice: opts.costPrice ?? 6_000,
    },
  });
}
