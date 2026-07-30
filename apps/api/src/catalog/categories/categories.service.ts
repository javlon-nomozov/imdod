import { Injectable, NotFoundException } from '@nestjs/common';
import type { Category } from '@prisma/client';
import { ChangeLogService } from '../../change-log/change-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateCategoryDto } from './dto/create-category.dto';
import type { UpdateCategoryDto } from './dto/update-category.dto';

@Injectable()
export class CategoriesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly changeLog: ChangeLogService,
  ) {}

  create(dto: CreateCategoryDto): Promise<Category> {
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.create({ data: dto });
      await this.changeLog.record('Category', category.id, 'UPSERT', category, tx);
      return category;
    });
  }

  list(): Promise<Category[]> {
    return this.prisma.category.findMany({ orderBy: [{ sortOrder: 'asc' }, { nameUz: 'asc' }] });
  }

  async findById(id: string): Promise<Category> {
    const category = await this.prisma.category.findUnique({ where: { id } });
    if (!category) throw new NotFoundException('Kategoriya topilmadi');
    return category;
  }

  async update(id: string, dto: UpdateCategoryDto): Promise<Category> {
    await this.findById(id);
    return this.prisma.$transaction(async (tx) => {
      const category = await tx.category.update({ where: { id }, data: dto });
      await this.changeLog.record('Category', category.id, 'UPSERT', category, tx);
      return category;
    });
  }

  async remove(id: string): Promise<void> {
    await this.findById(id);
    await this.prisma.$transaction(async (tx) => {
      await tx.category.delete({ where: { id } });
      await this.changeLog.record('Category', id, 'DELETE', { id }, tx);
    });
  }
}
