import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { StockModule } from '../stock/stock.module';
import { BarcodesController } from './barcodes/barcodes.controller';
import { BarcodesService } from './barcodes/barcodes.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { ExportService } from './import/export.service';
import { ImportController } from './import/import.controller';
import { ImportService } from './import/import.service';
import { ParseService } from './import/parse.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

@Module({
  imports: [AuthModule, StockModule],
  controllers: [ProductsController, CategoriesController, BarcodesController, ImportController],
  providers: [
    ProductsService,
    CategoriesService,
    BarcodesService,
    ParseService,
    ImportService,
    ExportService,
  ],
  exports: [ProductsService, BarcodesService],
})
export class CatalogModule {}
