import { Controller, Get } from '@nestjs/common';
import { PrismaService } from './prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * POS qurilmalari shu endpoint orqali "server bormi" deb tekshiradi.
   * Baza bilan ulanishni ham tekshiradi — API tirik, lekin baza o'lik
   * bo'lsa qurilma oflayn rejimda qolgani ma'qul.
   */
  @Get()
  async check(): Promise<{ status: string; time: string }> {
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: 'ok', time: new Date().toISOString() };
  }
}
