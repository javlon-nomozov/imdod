import {
  CanActivate,
  type ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import type { AccessTokenPayload } from '../types/auth.types';

/** `Authorization: Bearer <access token>`ni tekshiradi va `request.user`ga payloadni qo'yadi. */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request & { user?: AccessTokenPayload }>();
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Token topilmadi');
    }

    const token = header.slice('Bearer '.length);
    let payload: AccessTokenPayload & { typ: string };
    try {
      payload = this.jwt.verify(token, {
        secret: this.config.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });
    } catch {
      throw new UnauthorizedException("Token yaroqsiz yoki muddati o'tgan");
    }

    // Refresh tokenning shu endpointga yuborilishining oldini olamiz —
    // ikkalasi ham `JwtService` orqali chiqarilgani uchun `typ` claim kerak.
    if (payload.typ !== 'access') {
      throw new UnauthorizedException('Token turi noto‘g‘ri');
    }

    request.user = payload;
    return true;
  }
}
