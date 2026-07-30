import { Controller, Get, Param, Post, Query, UseGuards } from '@nestjs/common';
import type { StockMovement } from '@prisma/client';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListMovementsQueryDto } from './dto/list-movements.query.dto';
import { StockService } from './stock.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('stock')
export class StockController {
  constructor(private readonly stock: StockService) {}

  @Get('balance/:productId')
  async getBalance(
    @Param('productId') productId: string,
  ): Promise<{ productId: string; qty: number }> {
    const qty = await this.stock.getBalance(productId);
    return { productId, qty };
  }

  @Get('movements/:productId')
  listMovements(
    @Param('productId') productId: string,
    @Query() query: ListMovementsQueryDto,
  ): Promise<StockMovement[]> {
    return this.stock.listMovements(productId, query.limit, query.offset);
  }

  /** Kesh buzilgan holatlarni ta'mirlash uchun — ledgerdan qayta hisoblaydi. */
  @Roles('ADMIN', 'STOCKKEEPER')
  @Post('recalculate/:productId')
  async recalculate(
    @Param('productId') productId: string,
  ): Promise<{ productId: string; qty: number }> {
    const qty = await this.stock.recalculateBalance(productId);
    return { productId, qty };
  }
}
