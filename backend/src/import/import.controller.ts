import {
  Controller, Post, Get, UploadedFile, UseInterceptors,
  Body, UseGuards, Request, BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiConsumes } from '@nestjs/swagger';
import { ImportService } from './import.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@ApiTags('Import')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('import')
export class ImportController {
  constructor(private importService: ImportService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload de arquivo para análise de colunas' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) throw new BadRequestException('Arquivo não enviado');
    const result = await this.importService.parseFile(file.path, file.originalname);
    return { ...result, filename: file.originalname, path: file.path };
  }

  @Post('process')
  @ApiOperation({ summary: 'Processar importação com mapeamento de colunas' })
  async processImport(
    @Body() body: { filePath: string; filename: string; mapping: Record<string, string> },
    @Request() req: any,
  ) {
    if (!body.filePath || !body.mapping) {
      throw new BadRequestException('filePath e mapping são obrigatórios');
    }
    return this.importService.processImport(
      body.filePath,
      body.filename,
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
