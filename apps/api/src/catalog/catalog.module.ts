import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { BarcodesController } from './barcodes/barcodes.controller';
import { BarcodesService } from './barcodes/barcodes.service';
import { CategoriesController } from './categories/categories.controller';
import { CategoriesService } from './categories/categories.service';
import { ProductsController } from './products/products.controller';
import { ProductsService } from './products/products.service';

@Module({
  imports: [AuthModule],
  controllers: [ProductsController, CategoriesController, BarcodesController],
  providers: [ProductsService, CategoriesService, BarcodesService],
  exports: [ProductsService, BarcodesService],
})
export class CatalogModule {}
