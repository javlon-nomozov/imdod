import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { CurrentDevice } from '../auth/decorators/current-device.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { DeviceGuard } from '../auth/guards/device.guard';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import type { AccessTokenPayload, DeviceContext } from '../auth/types/auth.types';
import { CreateSaleDto } from './dto/create-sale.dto';
import { SalesService } from './sales.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('sales')
export class SalesController {
  constructor(private readonly sales: SalesService) {}

  // Faqat savdo yaratish qurilma tokenini talab qiladi — chek raqami va
  // ombor harakati qaysi kassaga tegishli ekanini shundan bilamiz.
  @UseGuards(DeviceGuard)
  @Roles('CASHIER', 'MANAGER', 'ADMIN')
  @Post()
  create(
    @Body() dto: CreateSaleDto,
    @CurrentUser() user: AccessTokenPayload,
    @CurrentDevice() device: DeviceContext,
  ) {
    return this.sales.createSale(dto, {
      userId: user.sub,
      registerId: device.registerId,
      deviceId: device.id,
    });
  }

  @Get(':id')
  getOne(@Param('id') id: string) {
    return this.sales.getSale(id);
  }
}
