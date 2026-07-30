import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { isValidRegisterCode, type UserRole } from '@imdod/core';
import { PrismaService } from '../prisma/prisma.service';
import { generateDeviceToken, hashDeviceToken } from './device-token.util';
import type { AccessTokenPayload, TokenPair } from './types/auth.types';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * Kassa PIN bilan kiradi — foydalanuvchi nomi so'ralmaydi. Shuning uchun
   * mos PINni faol foydalanuvchilar orasidan qidiramiz. Bu — chiziqli
   * (O(n)) qidiruv, ammo do'kon miqyosida (o'nlab kassir) muammo emas;
   * oldindan optimallashtirilmaydi.
   */
  async posLogin(deviceId: string, registerId: string, pin: string): Promise<TokenPair> {
    const users = await this.prisma.user.findMany({ where: { isActive: true, deletedAt: null } });
    for (const user of users) {
      if (await argon2.verify(user.pinHash, pin)) {
        return this.issueTokens({
          sub: user.id,
          role: user.role as UserRole,
          registerId,
          deviceId,
        });
      }
    }
    throw new UnauthorizedException('PIN noto‘g‘ri');
  }

  /** Admin panel uchun telefon + parol (faqat ADMIN/MANAGER). */
  async adminLogin(phone: string, password: string): Promise<TokenPair> {
    const user = await this.prisma.user.findFirst({
      where: { phone, isActive: true, deletedAt: null, passwordHash: { not: null } },
    });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, password))) {
      throw new UnauthorizedException('Telefon yoki parol noto‘g‘ri');
    }
    if (user.role !== 'ADMIN' && user.role !== 'MANAGER') {
      throw new UnauthorizedException('Bu foydalanuvchi panelga kira olmaydi');
    }
    return this.issueTokens({ sub: user.id, role: user.role as UserRole });
  }

  /**
   * Refresh token jadvali sxemada yo'q — bu qat'iyan stateless JWT.
   * Shuning uchun foydalanuvchi HAR refresh so'rovida qayta tekshiriladi:
   * xodim faolsizlantirilsa, keyingi refresh shu yerda bloklanadi (eski
   * access token esa qisqa TTL tufayli tez tugaydi — individual bekor
   * qilish yo'q, lekin ta'sir doirasi shu bilan chegaralanadi).
   */
  async refresh(refreshToken: string): Promise<TokenPair> {
    let payload: AccessTokenPayload & { typ: string };
    try {
      payload = this.jwt.verify(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }
    if (payload.typ !== 'refresh') {
      throw new UnauthorizedException('Refresh token yaroqsiz');
    }

    const user = await this.prisma.user.findUnique({ where: { id: payload.sub } });
    if (!user || !user.isActive || user.deletedAt) {
      throw new UnauthorizedException('Foydalanuvchi faol emas');
    }

    return this.issueTokens({
      sub: user.id,
      role: user.role as UserRole,
      registerId: payload.registerId,
      deviceId: payload.deviceId,
    });
  }

  /**
   * Yangi kassa qurilmasini ro'yxatdan o'tkazadi. `registerCode` mavjud
   * bo'lsa shu kassaga qo'shiladi (bitta kassada bir nechta qurilma
   * bo'lishi mumkin emas hozircha, lekin kod qayta ishlatiladi), bo'lmasa
   * yangi `Register` yaratiladi.
   */
  async provisionDevice(
    registerCode: string,
    registerName: string,
    deviceName: string,
  ): Promise<{ registerId: string; deviceId: string; rawToken: string }> {
    if (!isValidRegisterCode(registerCode)) {
      throw new BadRequestException('Kassa kodi noto‘g‘ri formatda (masalan: K01)');
    }

    const register = await this.prisma.register.upsert({
      where: { code: registerCode },
      update: {},
      create: { code: registerCode, name: registerName },
    });

    const rawToken = generateDeviceToken();
    const tokenHash = hashDeviceToken(
      rawToken,
      this.config.getOrThrow<string>('DEVICE_TOKEN_SECRET'),
    );
    const device = await this.prisma.device.create({
      data: { registerId: register.id, name: deviceName, tokenHash },
    });

    // Xom token faqat shu yerda, bir marta qaytariladi — hech qayerda
    // saqlanmaydi. Yo'qolsa, qurilmani bekor qilib yangisini chiqarish kerak.
    return { registerId: register.id, deviceId: device.id, rawToken };
  }

  issueTokens(payload: AccessTokenPayload): TokenPair {
    const accessToken = this.jwt.sign(
      { ...payload, typ: 'access' },
      {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
        expiresIn: this.config.get<string>('JWT_ACCESS_TTL') ?? '15m',
      },
    );
    const refreshToken = this.jwt.sign(
      { ...payload, typ: 'refresh' },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: this.config.get<string>('JWT_REFRESH_TTL') ?? '30d',
      },
    );
    return { accessToken, refreshToken };
  }
}
