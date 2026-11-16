import {
  Delete,
  Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Res, UploadedFile, UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequireAnyPermission, RequirePermissions } from '../common/decorators/permissions.decorator';
import { RejectContentDto } from '../common/utils/review';
import { fileBody, sendFile, uploadOne } from '../common/utils/files';
import { CreateOpportunityDto, ListOpportunitiesQueryDto, UpdateOpportunityDto } from './dto/opportunities.dto';
import { OpportunitiesService } from './opportunities.service';

@ApiTags('Opportunités')
@ApiBearerAuth()
@Controller('opportunities')
export class OpportunitiesController {
  constructor(private readonly svc: OpportunitiesService) {}

  @Get() @RequirePermissions(P.OPPORTUNITY_READ)
  @ApiOperation({ summary: 'Opportunités (type, statut, recherche). Une opportunité dont la date limite est passée apparaît « terminée ».' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListOpportunitiesQueryDto) { return this.svc.listForMembers(u, q); }

  @Get(':id') @RequirePermissions(P.OPPORTUNITY_READ)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.get(u, id); }

  @Get(':id/sheet') @RequirePermissions(P.OPPORTUNITY_READ)
  @ApiOperation({ summary: 'Télécharger la fiche de l’opportunité' })
  async sheet(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) {
    return sendFile(res, await this.svc.sheet(u, id));
  }

  @Post() @RequireAnyPermission(P.OPPORTUNITY_MANAGE, P.OPPORTUNITY_PROPOSE)
  @ApiOperation({ summary: 'Publier une opportunité (référence OP-AAAA-NN générée automatiquement)', description: 'Personnel : publiée tout de suite. Président / Suppléant d’une OPH : envoyée « en attente de validation ».' })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateOpportunityDto) { return this.svc.create(u, dto); }

  @Post(':id/approve') @HttpCode(HttpStatus.OK) @RequirePermissions(P.OPPORTUNITY_MANAGE)
  @ApiOperation({ summary: 'Valider une opportunité proposée par une OPH' })
  approve(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.review(u, id, 'APPROVED'); }

  @Post(':id/reject') @HttpCode(HttpStatus.OK) @RequirePermissions(P.OPPORTUNITY_MANAGE)
  @ApiOperation({ summary: 'Refuser une opportunité proposée par une OPH (motif obligatoire)' })
  reject(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectContentDto) { return this.svc.review(u, id, 'REJECTED', dto.note); }

  @Patch(':id') @RequireAnyPermission(P.OPPORTUNITY_MANAGE, P.OPPORTUNITY_PROPOSE)
  @ApiOperation({ summary: 'Modifier une opportunité (OPH : seulement les siennes ; une opportunité validée repasse en attente de validation)' })
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOpportunityDto) { return this.svc.update(u, id, dto); }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @RequireAnyPermission(P.OPPORTUNITY_MANAGE, P.OPPORTUNITY_PROPOSE)
  @ApiOperation({ summary: 'Supprimer une opportunité (OPH : seulement les siennes)' })
  async remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { await this.svc.remove(u, id); }

  @Post(':id/sheet') @RequirePermissions(P.OPPORTUNITY_MANAGE) @UseInterceptors(uploadOne()) @ApiConsumes('multipart/form-data') @ApiBody(fileBody({}))
  @ApiOperation({ summary: 'Joindre ou remplacer la fiche (PDF, JPG ou PNG)' })
  sheetUpload(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @UploadedFile() file: Express.Multer.File) {
    return this.svc.attachSheet(u, id, file);
  }

  @Post(':id/close') @HttpCode(HttpStatus.OK) @RequirePermissions(P.OPPORTUNITY_MANAGE)
  close(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setState(u, id, 'close'); }
  @Post(':id/reopen') @HttpCode(HttpStatus.OK) @RequirePermissions(P.OPPORTUNITY_MANAGE)
  reopen(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setState(u, id, 'reopen'); }
  @Post(':id/archive') @HttpCode(HttpStatus.OK) @RequirePermissions(P.OPPORTUNITY_MANAGE)
  archive(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setState(u, id, 'archive'); }
  @Post(':id/restore') @HttpCode(HttpStatus.OK) @RequirePermissions(P.OPPORTUNITY_MANAGE)
  restore(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setState(u, id, 'restore'); }
}

/** Opportunités marquées « PUBLIC » : consultables sans connexion (site public). */
@ApiTags('Site public')
@Public()
@Controller('public/opportunities')
export class PublicOpportunitiesController {
  constructor(private readonly svc: OpportunitiesService) {}

  @Get() @ApiOperation({ summary: 'Opportunités publiques ouvertes' })
  list(@Query() q: ListOpportunitiesQueryDto) { return this.svc.listPublic(q); }
  @Get(':id') get(@Param('id', ParseUUIDPipe) id: string) { return this.svc.getPublic(id); }
  @Get(':id/sheet')
  async sheet(@Param('id', ParseUUIDPipe) id: string, @Res({ passthrough: true }) res: Response) { return sendFile(res, await this.svc.sheetPublic(id)); }
}
