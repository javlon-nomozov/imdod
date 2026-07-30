import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AuthModule } from './auth/auth.module';
import { CatalogModule } from './catalog/catalog.module';
import { PrismaModule } from './prisma/prisma.module';
import { HealthController } from './health.controller';
import { SalesModule } from './sales/sales.module';
import { ShiftsModule } from './shifts/shifts.module';
import { StockModule } from './stock/stock.module';
import { SyncModule } from './sync/sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    CatalogModule,
    StockModule,
    ShiftsModule,
    SalesModule,
    SyncModule,
    // Keyingi bosqichlarda: ReportsModule
  ],
  controllers: [HealthController],
})
export class AppModule {}
