import {
  Controller, Post, Get, UploadedFile, UseInterceptors,
  Body, UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  private pendingUploads = new Map<string, { filePath: string; filename: string }>();

  constructor(private importService: ImportService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload de arquivo para análise de colunas' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    const result = await this.importService.parseFile(file.path, file.originalname);
    const uploadId = randomUUID();
    this.pendingUploads.set(uploadId, { filePath: file.path, filename: file.originalname });
    return { uploadId, filename: file.originalname, headers: result.headers, rows: result.rows };
  }

  @Post('process')
  @ApiOperation({ summary: 'Processar importação com mapeamento de colunas' })
  async processImport(
    @Body() body: { uploadId: string; mapping: Record<string, string> },
    @Request() req: any,
  ) {
    if (!body.uploadId || !body.mapping) {
      throw new BadRequestException('uploadId e mapping são obrigatórios');
    }
    const pending = this.pendingUploads.get(body.uploadId);
    if (!pending) {
      throw new BadRequestException('Upload não encontrado ou já processado');
    }
    this.pendingUploads.delete(body.uploadId);
    return this.importService.processImport(
      pending.filePath,
      pending.filename,
      body.mapping,
      req.user.id,
      req.user.companyId,
    );
  }

  @Get('batches')
  @ApiOperation({ summary: 'Listar importações realizadas' })
  getBatches(@Request() req: any) {
    return this.importService.getImportBatches(req.user.id);
  }
}
