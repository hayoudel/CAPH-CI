import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { fileBody, sendFile, uploadOne } from '../common/utils/files';
import { CreateProjectDto, ListProjectsQueryDto, ProgressDto, ReviewProjectDto, UpdateProjectDto } from './dto/project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('Projets (organisations)')
@ApiBearerAuth()
@Controller('projects')
export class ProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get() @RequirePermissions(P.PROJECT_READ)
  @ApiOperation({ summary: 'Projets partagés (validés, en cours, terminés) et projets de mon organisation' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListProjectsQueryDto) { return this.svc.list(u, q); }

  @Get(':id') @RequirePermissions(P.PROJECT_READ)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.get(u, id); }

  @Post() @RequirePermissions(P.PROJECT_PROPOSE)
  @ApiOperation({ summary: 'Proposer un projet (submit=false : brouillon)' })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateProjectDto) { return this.svc.create(u, dto); }

  @Patch(':id') @RequirePermissions(P.PROJECT_PROPOSE)
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateProjectDto) { return this.svc.update(u, id, dto); }

  @Post(':id/submit') @HttpCode(HttpStatus.OK) @RequirePermissions(P.PROJECT_PROPOSE)
  @ApiOperation({ summary: 'Soumettre un brouillon (ou un projet à compléter) à la validation' })
  submit(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.submit(u, id); }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @RequirePermissions(P.PROJECT_PROPOSE)
  async remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { await this.svc.removeDraft(u, id); }

  @Get(':id/cover') @RequirePermissions(P.PROJECT_READ)
  async cover(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) { return sendFile(res, await this.svc.cover(u, id)); }

  @Post(':id/cover') @RequirePermissions(P.PROJECT_PROPOSE) @UseInterceptors(uploadOne()) @ApiConsumes('multipart/form-data') @ApiBody(fileBody({}))
  setCover(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) { return this.svc.setCover(u, id, file); }

  @Delete(':id/cover') @RequirePermissions(P.PROJECT_PROPOSE)
  removeCover(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.removeCover(u, id); }

  @Post(':id/attachments') @RequirePermissions(P.PROJECT_PROPOSE) @UseInterceptors(uploadOne()) @ApiConsumes('multipart/form-data') @ApiBody(fileBody({}))
  @ApiOperation({ summary: 'Joindre un document complémentaire (PDF, JPG ou PNG ; 5 maximum)' })
  attach(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) { return this.svc.addAttachment(u, id, file); }

  @Delete(':id/attachments/:attId') @RequirePermissions(P.PROJECT_PROPOSE)
  detach(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string) { return this.svc.removeAttachment(u, id, attId); }

  @Get(':id/attachments/:attId/file') @RequirePermissions(P.PROJECT_READ)
  async file(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string,
    @Res({ passthrough: true }) res: Response,
  ) { return sendFile(res, await this.svc.downloadOwn(u, id, attId)); }
}

@ApiTags('Projets (personnel CAPH-CI)')
@ApiBearerAuth()
@Controller('admin/projects')
export class AdminProjectsController {
  constructor(private readonly svc: ProjectsService) {}

  @Get() @RequirePermissions(P.PROJECT_REVIEW)
  @ApiOperation({ summary: 'Tous les projets soumis (filtre par statut ou organisation)' })
  list(@Query() q: ListProjectsQueryDto) { return this.svc.listAll(q); }

  @Get(':id') @RequirePermissions(P.PROJECT_REVIEW)
  @ApiOperation({ summary: 'Détail d’un projet soumis, avec l’historique de traitement' })
  get(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getAny(id); }

  @Get(':id/cover') @RequirePermissions(P.PROJECT_REVIEW)
  async cover(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) { return sendFile(res, await this.svc.coverAny(id)); }

  @Get(':id/attachments/:attId/file') @RequirePermissions(P.PROJECT_REVIEW)
  async file(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('attId', ParseUUIDPipe) attId: string,
    @Res({ passthrough: true }) res: Response,
  ) { return sendFile(res, await this.svc.downloadAny(u, id, attId)); }

  @Post(':id/review') @HttpCode(HttpStatus.OK) @RequirePermissions(P.PROJECT_REVIEW)
  @ApiOperation({ summary: 'Changer le statut : en validation, à compléter, validé, refusé, puis en cours et terminé' })
  review(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ReviewProjectDto) { return this.svc.review(u, id, dto); }

  @Post(':id/progress') @HttpCode(HttpStatus.OK) @RequirePermissions(P.PROJECT_REVIEW)
  @ApiOperation({ summary: 'Renseigner l’avancement (%) et les résultats d’un projet validé, en cours ou terminé' })
  progress(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: ProgressDto) { return this.svc.setProgress(u, id, dto); }
}
