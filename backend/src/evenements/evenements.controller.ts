import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequireAnyPermission, RequirePermissions } from '../common/decorators/permissions.decorator';
import { RejectContentDto } from '../common/utils/review';
import { CreateEvenementDto, ListEvenementsQueryDto, UpdateEvenementDto } from './dto/evenements.dto';
import { EvenementsService } from './evenements.service';

@ApiTags('Événements')
@ApiBearerAuth()
@Controller('evenements')
export class EvenementsController {
  constructor(private readonly svc: EvenementsService) {}

  @Get() @RequirePermissions(P.EVENT_READ)
  @ApiOperation({ summary: 'Événements (à venir par défaut ; past=true pour les événements passés)' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListEvenementsQueryDto) { return this.svc.listForMembers(u, q); }

  @Get(':id') @RequirePermissions(P.EVENT_READ)
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.get(u, id); }

  @Post() @RequireAnyPermission(P.EVENT_MANAGE, P.EVENT_PROPOSE)
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateEvenementDto) { return this.svc.create(u, dto); }

  @Post(':id/approve') @HttpCode(HttpStatus.OK) @RequirePermissions(P.EVENT_MANAGE)
  @ApiOperation({ summary: 'Valider un événement proposé par une OPH' })
  approve(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.review(u, id, 'APPROVED'); }

  @Post(':id/reject') @HttpCode(HttpStatus.OK) @RequirePermissions(P.EVENT_MANAGE)
  @ApiOperation({ summary: 'Refuser un événement proposé par une OPH (motif obligatoire)' })
  reject(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: RejectContentDto) { return this.svc.review(u, id, 'REJECTED', dto.note); }

  @Patch(':id') @RequireAnyPermission(P.EVENT_MANAGE, P.EVENT_PROPOSE)
  @ApiOperation({ summary: 'Modifier un événement (OPH : seulement les siens ; un événement validé repasse en attente de validation)' })
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateEvenementDto) { return this.svc.update(u, id, dto); }

  @Delete(':id') @HttpCode(HttpStatus.NO_CONTENT) @RequireAnyPermission(P.EVENT_MANAGE, P.EVENT_PROPOSE)
  @ApiOperation({ summary: 'Supprimer un événement (OPH : seulement les siens)' })
  async remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { await this.svc.remove(u, id); }

  @Post(':id/cancel') @HttpCode(HttpStatus.OK) @RequirePermissions(P.EVENT_MANAGE)
  cancel(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setState(u, id, 'cancel'); }
  @Post(':id/archive') @HttpCode(HttpStatus.OK) @RequirePermissions(P.EVENT_MANAGE)
  archive(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setState(u, id, 'archive'); }
  @Post(':id/restore') @HttpCode(HttpStatus.OK) @RequirePermissions(P.EVENT_MANAGE)
  restore(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setState(u, id, 'restore'); }
}

@ApiTags('Site public')
@Public()
@Controller('public/evenements')
export class PublicEvenementsController {
  constructor(private readonly svc: EvenementsService) {}

  @Get() @ApiOperation({ summary: 'Événements publics (événements à venir, hors annulés)' })
  list(@Query() q: ListEvenementsQueryDto) { return this.svc.listPublic(q); }
}
