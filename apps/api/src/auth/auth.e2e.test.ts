import type { INestApplication } from '@nestjs/common';
import * as argon2 from 'argon2';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PrismaService } from '../prisma/prisma.service';
import { resetDb } from '../test/reset-db';
import { createTestApp } from '../test/test-app';
import { generateDeviceToken, hashDeviceToken } from './device-token.util';

interface TokenPairResponse {
  accessToken: string;
  refreshToken: string;
}

/**
 * HTTP darajasida — guard'lar (DeviceGuard/JwtAuthGuard/RolesGuard) real
 * so'rov-javob orqali sinaladi. `supertest` o'rniga `app.listen(0)` +
 * ichki `fetch` ishlatiladi — qo'shimcha bog'liqlik kerak emas.
 */
describe('Auth HTTP oqimi', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let baseUrl: string;

  beforeEach(async () => {
    app = await createTestApp();
    prisma = app.get(PrismaService);
    await resetDb(prisma);
    await app.listen(0);
    const address = app.getHttpServer().address();
    const port = typeof address === 'object' && address !== null ? address.port : 0;
    baseUrl = `http://127.0.0.1:${port}`;
  });

  afterEach(async () => {
    await app.close();
  });

  it('to‘g‘ri PIN token beradi, noto‘g‘ri PIN rad etadi', async () => {
    const register = await prisma.register.create({ data: { code: 'T01', name: 'Test' } });
    const secret = process.env.DEVICE_TOKEN_SECRET;
    if (!secret) throw new Error('DEVICE_TOKEN_SECRET .env faylida yo‘q');
    const rawToken = generateDeviceToken();
    await prisma.device.create({
      data: {
        registerId: register.id,
        name: 'Test qurilma',
        tokenHash: hashDeviceToken(rawToken, secret),
      },
    });
    await prisma.user.create({
      data: { fullName: 'Kassir', role: 'CASHIER', pinHash: await argon2.hash('4321') },
    });

    const ok = await fetch(`${baseUrl}/auth/pos/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': rawToken },
      body: JSON.stringify({ pin: '4321' }),
    });
    expect(ok.status).toBe(201);
    const body = (await ok.json()) as TokenPairResponse;
    expect(body.accessToken).toBeTruthy();

    const bad = await fetch(`${baseUrl}/auth/pos/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': rawToken },
      body: JSON.stringify({ pin: '0000' }),
    });
    expect(bad.status).toBe(401);
  });

  it('RolesGuard: CASHIER /auth/devices chaqira olmaydi', async () => {
    const register = await prisma.register.create({ data: { code: 'T02', name: 'Test2' } });
    const secret = process.env.DEVICE_TOKEN_SECRET;
    if (!secret) throw new Error('DEVICE_TOKEN_SECRET .env faylida yo‘q');
    const rawToken = generateDeviceToken();
    await prisma.device.create({
      data: {
        registerId: register.id,
        name: 'Test qurilma 2',
        tokenHash: hashDeviceToken(rawToken, secret),
      },
    });
    await prisma.user.create({
      data: { fullName: 'Kassir2', role: 'CASHIER', pinHash: await argon2.hash('1212') },
    });

    const login = await fetch(`${baseUrl}/auth/pos/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-device-token': rawToken },
      body: JSON.stringify({ pin: '1212' }),
    });
    const { accessToken } = (await login.json()) as TokenPairResponse;

    const res = await fetch(`${baseUrl}/auth/devices`, {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${accessToken}` },
      body: JSON.stringify({ registerCode: 'K99', registerName: 'Yangi', deviceName: 'D' }),
    });
    expect(res.status).toBe(403);
  });
});
