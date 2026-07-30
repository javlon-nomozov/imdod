import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';
import { hashDeviceToken } from '../device-token.util';
import type { DeviceContext } from '../types/auth.types';

const DEVICE_TOKEN_HEADER = 'x-device-token';

/**
 * POS qurilmasini tanib oladi. `x-device-token` sarlavhasidagi xom tokenni
 * hash qilib, `Device.tokenHash` bo'yicha qidiradi va `request.device`ga
 * `{ id, registerId }` qo'yadi — shundan keyin kassir PIN bilan kiradi.
 */
@Injectable()
export class DeviceGuard implements CanActivate {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & { device?: DeviceContext }>();
    const rawToken = request.headers[DEVICE_TOKEN_HEADER];
    if (typeof rawToken !== 'string' || rawToken.length === 0) {
      throw new UnauthorizedException('Qurilma tokeni topilmadi');
    }

    const tokenHash = hashDeviceToken(
      rawToken,
      this.config.getOrThrow<string>('DEVICE_TOKEN_SECRET'),
    );
    const device = await this.prisma.device.findUnique({ where: { tokenHash } });
    if (!device || device.revokedAt) {
      throw new UnauthorizedException('Qurilma tokeni yaroqsiz yoki bekor qilingan');
    }

    // Monitoring uchun — qachon so'nggi marta ulanganini yangilaymiz.
    await this.prisma.device.update({
      where: { id: device.id },
      data: { lastSeenAt: new Date() },
    });

    request.device = { id: device.id, registerId: device.registerId };
    return true;
  }
}
