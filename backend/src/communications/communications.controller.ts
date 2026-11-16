import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CommunicationsService } from './communications.service';
import { CreateCommunicationDto, ListCommunicationsQueryDto, UpdateCommunicationDto } from './dto/communications.dto';

@ApiTags('Communications')
@ApiBearerAuth()
@Controller('communications')
export class CommunicationsController {
  constructor(private readonly svc: CommunicationsService) {}

  @Get() @RequirePermissions(P.COMMUNICATION_READ)
  @ApiOperation({ summary: 'Mes communications (filtre « non lues », recherche)' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListCommunicationsQueryDto) { return this.svc.list(u, q); }

  @Get('unread-count') @RequirePermissions(P.COMMUNICATION_READ)
  @ApiOperation({ summary: 'Nombre de communications non lues (pastille de la barre de navigation)' })
  unread(@CurrentUser() u: AuthenticatedUser) { return this.svc.unreadCount(u); }

  @Get(':id') @RequirePermissions(P.COMMUNICATION_READ)
  @ApiOperation({ summary: 'Lire une communication (elle est alors marquée comme lue)' })
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.get(u, id); }

  @Post(':id/read') @HttpCode(HttpStatus.OK) @RequirePermissions(P.COMMUNICATION_READ)
  read(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.markRead(u, id); }

  @Get(':id/stats') @RequirePermissions(P.COMMUNICATION_MANAGE)
  @ApiOperation({ summary: 'Suivi de lecture : destinataires, lus, non lus' })
  stats(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.stats(u, id); }

  @Post() @RequirePermissions(P.COMMUNICATION_MANAGE)
  @ApiOperation({ summary: 'Envoyer une communication (à tous, à des délégations ou à des organisations précises)' })
  create(@CurrentUser() u: AuthenticatedUser, @Body() dto: CreateCommunicationDto) { return this.svc.create(u, dto); }

  @Patch(':id') @RequirePermissions(P.COMMUNICATION_MANAGE)
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateCommunicationDto) { return this.svc.update(u, id, dto); }

  @Post(':id/archive') @HttpCode(HttpStatus.OK) @RequirePermissions(P.COMMUNICATION_MANAGE)
  archive(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setArchived(u, id, true); }

  @Post(':id/restore') @HttpCode(HttpStatus.OK) @RequirePermissions(P.COMMUNICATION_MANAGE)
  restore(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) { return this.svc.setArchived(u, id, false); }
}

@ApiTags('Site public')
@Public()
@Controller('public/communications')
export class PublicCommunicationsController {
  constructor(private readonly svc: CommunicationsService) {}

  @Get() @ApiOperation({ summary: 'Communiqués publics (communications externes adressées à tous)' })
  list(@Query() q: ListCommunicationsQueryDto) { return this.svc.listPublic(q); }
}
