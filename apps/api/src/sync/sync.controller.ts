import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { SyncChangesResponse, SyncRegisterSnapshot, SyncUserSnapshot } from '@imdod/sync';
import type { Sale, Shift } from '@prisma/client';
import { CurrentDevice } from '../auth/decorators/current-device.decorator';
import { DeviceGuard } from '../auth/guards/device.guard';
import type { DeviceContext } from '../auth/types/auth.types';
import { SyncChangesQueryDto } from './dto/sync-changes.query.dto';
import { SyncCloseShiftDto } from './dto/sync-close-shift.dto';
import { SyncCreateSaleDto } from './dto/sync-create-sale.dto';
import { SyncOpenShiftDto } from './dto/sync-open-shift.dto';
import { SyncService } from './sync.service';

/**
 * Faqat `DeviceGuard` — JWT yo'q. POS qurilmasi oflaynda yig'gan
 * hujjatlarini push qilishi/spravochnik tortib olishi uchun ishonch manbai
 * "qurilma tokeni to'g'ri" — kim ekanligini (`cashierId` va h.k.) qurilma
 * o'zi aniq maydon sifatida beradi, server faqat faolligini tekshiradi.
 */
@UseGuards(DeviceGuard)
@Controller('sync')
export class SyncController {
  constructor(private readonly sync: SyncService) {}

  @Get('register')
  getRegister(@CurrentDevice() device: DeviceContext): Promise<SyncRegisterSnapshot> {
    return this.sync.getRegisterSnapshot(device.registerId);
  }

  @Get('users')
  getUsers(): Promise<SyncUserSnapshot[]> {
    return this.sync.getUserSnapshots();
  }

  @Get('changes')
  getChanges(@Query() query: SyncChangesQueryDto): Promise<SyncChangesResponse> {
    return this.sync.getChanges(query.since, query.limit);
  }

  @Post('sales')
  createSale(
    @Body() dto: SyncCreateSaleDto,
    @CurrentDevice() device: DeviceContext,
  ): Promise<Sale> {
    return this.sync.createSale(dto, device);
  }

  @Post('shifts/open')
  openShift(@Body() dto: SyncOpenShiftDto): Promise<Shift> {
    return this.sync.openShift(dto);
  }

  @Post('shifts/:id/close')
  closeShift(@Param('id') id: string, @Body() dto: SyncCloseShiftDto): Promise<Shift> {
    return this.sync.closeShift(id, dto);
  }
}
