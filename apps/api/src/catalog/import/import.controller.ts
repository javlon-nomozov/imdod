import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Post,
  Query,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import type { AccessTokenPayload } from '../../auth/types/auth.types';
import { ImportCommitDto } from './dto/import-commit.dto';
import { ImportPreviewDto } from './dto/import-preview.dto';
import { ExportService } from './export.service';
import { ImportService } from './import.service';
import { IMPORT_TEMPLATE } from './import.template';
import type { ImportCommitResult, ImportRowPreview } from './import.types';
import { ParseService, type ParsedRow } from './parse.service';

@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'MANAGER')
@Controller('catalog')
export class ImportController {
  constructor(
    private readonly parseService: ParseService,
    private readonly importService: ImportService,
    private readonly exportService: ExportService,
  ) {}

  @Post('import/preview')
  @UseInterceptors(FileInterceptor('file'))
  async preview(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body() dto: ImportPreviewDto,
  ): Promise<ImportRowPreview[]> {
    const rows = await this.parseInput(file, dto.text);
    return this.importService.preview(rows);
  }

  @Post('import/commit')
  commit(
    @Body() dto: ImportCommitDto,
    @CurrentUser() user: AccessTokenPayload,
  ): Promise<ImportCommitResult> {
    return this.importService.commit(dto.items, user.sub);
  }

  @Get('import/template')
  getTemplate(): typeof IMPORT_TEMPLATE {
    return IMPORT_TEMPLATE;
  }

  @Get('export')
  async export(@Query('format') format: string | undefined, @Res() res: Response): Promise<void> {
    const resolvedFormat = format === 'csv' ? 'csv' : 'xlsx';
    const { buffer, filename, contentType } = await this.exportService.export(resolvedFormat);
    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.send(buffer);
  }

  private async parseInput(
    file: Express.Multer.File | undefined,
    text: string | undefined,
  ): Promise<ParsedRow[]> {
    if (file) {
      const isXlsx = file.originalname.toLowerCase().endsWith('.xlsx');
      return isXlsx
        ? this.parseService.parseXlsx(file.buffer)
        : this.parseService.parseCsvText(file.buffer.toString('utf-8'));
    }
    if (text && text.trim().length > 0) {
      return this.parseService.parseCsvText(text);
    }
    throw new BadRequestException('Fayl yoki matn (text) yuborilishi shart');
  }
}
