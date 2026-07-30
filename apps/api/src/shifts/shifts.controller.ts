import { Body, Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { Shift } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import type { AccessTokenPayload } from '../auth/types/auth.types';
import { CloseShiftDto } from './dto/close-shift.dto';
import { OpenShiftDto } from './dto/open-shift.dto';
import { ShiftsService } from './shifts.service';

@UseGuards(JwtAuthGuard)
@Controller('shifts')
export class ShiftsController {
  constructor(private readonly shifts: ShiftsService) {}

  @Post('open')
  openShift(@Body() dto: OpenShiftDto, @CurrentUser() user: AccessTokenPayload): Promise<Shift> {
    return this.shifts.openShift(dto.id, dto.registerId, user.sub, dto.openingCash);
  }

  @Post(':id/close')
  closeShift(
    @Param('id') id: string,
    @Body() dto: CloseShiftDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<Shift> {
    return this.shifts.closeShift(id, user.sub, dto.closingCash);
  }

  @Get('current')
  getCurrent(@Query('registerId') registerId: string): Promise<Shift | null> {
    return this.shifts.getCurrentShift(registerId);
  }
}
