import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { fileBody, sendFile, uploadOne } from '../common/utils/files';
import { CreateReportDto, ListReportsQueryDto, ReviewReportDto, UpdateReportDto } from './dto/reports.dto';
import { ReportsService } from './reports.service';

@ApiTags('Rapports')
@ApiBearerAuth()
@Controller('reports')
export class ReportsController {
  constructor(private readonly svc: ReportsService) {}

  @Get() @RequirePermissions(P.REPORT_READ)
  @ApiOperation({ summary: 'Rapports : ceux de mon organisation, ou ceux de mon périmètre pour le personnel' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListReportsQueryDto) { return this.svc.list(u, q); }

  @Get(':id') @RequirePermissions(P.REPORT_READ)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.get(u, id); }

  @Post() @RequirePermissions(P.REPORT_CREATE)
  @ApiOperation({ summary: 'Transmettre un rapport (résumé 600 caractères max, certification d’habilitation obligatoire)' })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateReportDto) { return this.svc.create(u, dto); }

  @Patch(':id') @RequirePermissions(P.REPORT_CREATE)
  @ApiOperation({ summary: 'Modifier un rapport reçu ou à corriger (une correction le renvoie à la CAPH-CI)' })
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateReportDto) { return this.svc.update(u, id, dto); }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @RequirePermissions(P.REPORT_CREATE)
  @ApiOperation({ summary: 'Supprimer un rapport tant qu’il n’est pas en traitement (reçu ou correction demandée)' })
  async remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { await this.svc.remove(u, id); }

  @Post(':id/attachments') @RequirePermissions(P.REPORT_CREATE) @UseInterceptors(uploadOne()) @ApiConsumes('multipart/form-data') @ApiBody(fileBody({}))
  @ApiOperation({ summary: 'Joindre un fichier (PDF, JPG ou PNG ; 5 maximum)' })
  attach(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) { return this.svc.addAttachment(u, id, file); }

  @Delete(':id/attachments/:attId') @RequirePermissions(P.REPORT_CREATE)
  detach(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string) { return this.svc.removeAttachment(u, id, attId); }

  @Get(':id/attachments/:attId/file') @RequirePermissions(P.REPORT_READ)
  async file(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string,
    @Res({ passthrough: true }) res: Response,
  ) { return sendFile(res, await this.svc.download(u, id, attId)); }

  @Post(':id/review') @HttpCode(HttpStatus.OK) @RequirePermissions(P.REPORT_REVIEW)
  @ApiOperation({ summary: 'Traiter un rapport : en traitement / traité / correction demandée (personnel)' })
  review(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewReportDto) { return this.svc.review(u, id, dto); }
}
