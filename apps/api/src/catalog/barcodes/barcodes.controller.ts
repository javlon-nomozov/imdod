import { Body, Controller, Delete, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { ScanOutcome } from '@imdod/core';
import type { Barcode, Product } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { BarcodesService } from './barcodes.service';
import { AttachBarcodeDto } from './dto/attach-barcode.dto';
import { ScanQueryDto } from './dto/scan-query.dto';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class BarcodesController {
  constructor(private readonly barcodes: BarcodesService) {}

  @Roles('ADMIN', 'MANAGER')
  @Post('products/:productId/barcodes')
  attach(@Param('productId') productId: string, @Body() dto: AttachBarcodeDto): Promise<Barcode> {
    return this.barcodes.attach(productId, dto.code, dto.isPrimary);
  }

  @Roles('ADMIN', 'MANAGER')
  @Delete('barcodes/:id')
  detach(@Param('id') id: string): Promise<void> {
    return this.barcodes.detach(id);
  }

  /** POS shtrix-kod skanerlaganda shu endpointni chaqiradi. */
  @Get('catalog/scan')
  scan(@Query() query: ScanQueryDto): Promise<ScanOutcome<Product>> {
    return this.barcodes.scan(query.code);
  }
}
