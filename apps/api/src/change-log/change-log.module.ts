import { Module } from '@nestjs/common';
import { ChangeLogService } from './change-log.service';

@Module({
  providers: [ChangeLogService],
  exports: [ChangeLogService],
})
export class ChangeLogModule {}
