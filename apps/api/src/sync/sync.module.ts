import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SalesModule } from '../sales/sales.module';
import { ShiftsModule } from '../shifts/shifts.module';
import { SyncController } from './sync.controller';
import { SyncService } from './sync.service';

@Module({
  imports: [AuthModule, SalesModule, ShiftsModule],
  controllers: [SyncController],
  providers: [SyncService],
})
export class SyncModule {}
