import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import {
  ChangeMemberRoleDto, InviteMemberDto, ListOrganizationsQueryDto, UpdateOrganizationDto, UpdateVisibilityDto,
} from './dto/organizations.dto';
import { MembersService } from './members.service';
import { OrganizationsService } from './organizations.service';

@ApiTags('Organisations')
@ApiBearerAuth()
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly orgs: OrganizationsService, private readonly members: MembersService) {}

  @Get() @RequirePermissions(P.ORGANIZATION_READ_ALL)
  @ApiOperation({ summary: 'Lister les organisations de mon périmètre (personnel CAPH-CI)' })
  list(@CurrentUser() u: AuthenticatedUser, @Query() q: ListOrganizationsQueryDto) {
    return this.orgs.list(u, q);
  }

  @Get('me') @RequirePermissions(P.ORGANIZATION_READ)
  @ApiOperation({ summary: 'Le profil complet de MON organisation' })
  me(@CurrentUser() u: AuthenticatedUser) {
    return this.orgs.me(u);
  }

  @Get(':id')
  @ApiOperation({ summary: "Profil d'une organisation (la mienne, ou une de mon périmètre si personnel CAPH-CI). Sinon : 404." })
  get(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgs.get(u, id);
  }

  @Patch(':id') @RequirePermissions(P.ORGANIZATION_UPDATE)
  @ApiOperation({ summary: 'Modifier mon organisation (Président uniquement)' })
  update(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateOrganizationDto) {
    return this.orgs.update(u, id, dto);
  }

  // ── Visibilité dans l'annuaire ──
  @Get(':id/visibility') @RequirePermissions(P.ORGANIZATION_READ)
  @ApiOperation({ summary: "Paramètres de visibilité publique (annuaire)" })
  getVisibility(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.orgs.getVisibility(u, id);
  }

  @Patch(':id/visibility') @RequirePermissions(P.ORGANIZATION_VISIBILITY_UPDATE)
  @ApiOperation({ summary: "Contrôler ce qui apparaît dans l'annuaire, champ par champ (Président uniquement)" })
  updateVisibility(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: UpdateVisibilityDto) {
    return this.orgs.updateVisibility(u, id, dto);
  }

  // ── Membres de l'organisation ──
  @Get(':id/members') @RequirePermissions(P.ORGANIZATION_READ)
  @ApiOperation({ summary: "Membres de l'organisation (e-mails visibles du Président seulement)" })
  listMembers(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.members.list(u, id);
  }

  @Post(':id/members') @RequirePermissions(P.ORGANIZATION_MEMBERS_MANAGE)
  @ApiOperation({ summary: 'Ajouter un membre : un e-mail d’invitation lui est envoyé (Président uniquement)' })
  invite(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: InviteMemberDto) {
    return this.members.invite(u, id, dto);
  }

  @Patch(':id/members/:userId') @RequirePermissions(P.ORGANIZATION_MEMBERS_MANAGE)
  @ApiOperation({ summary: "Changer le rôle d'un membre (Contributeur ou Consultation)" })
  changeRole(
    @CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string,
    @Param('userId', ParseUUIDPipe) userId: string, @Body() dto: ChangeMemberRoleDto,
  ) {
    return this.members.changeRole(u, id, userId, dto.roleCode);
  }

  @Delete(':id/members/:userId') @HttpCode(HttpStatus.NO_CONTENT) @RequirePermissions(P.ORGANIZATION_MEMBERS_MANAGE)
  @ApiOperation({ summary: "Retirer un membre de l'organisation (son compte est désactivé)" })
  remove(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.members.remove(u, id, userId);
  }

  @Post(':id/members/:userId/resend-invitation') @HttpCode(HttpStatus.NO_CONTENT) @RequirePermissions(P.ORGANIZATION_MEMBERS_MANAGE)
  @ApiOperation({ summary: "Renvoyer l'invitation à un membre qui n'a pas encore activé son compte" })
  resend(@CurrentUser() u: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Param('userId', ParseUUIDPipe) userId: string) {
    return this.members.resendInvitation(u, id, userId);
  }
}
