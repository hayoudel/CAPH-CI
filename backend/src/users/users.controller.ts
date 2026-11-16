import { Body, Controller, Get, HttpCode, HttpStatus, Param, ParseUUIDPipe, Patch, Post, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiCookieAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { Request } from 'express';
import { AuthService } from '../auth/auth.service';
import { metaOf, REFRESH_COOKIE } from '../auth/auth.controller';
import { ChangePasswordDto } from '../auth/dto/auth.dto';
import { PERMISSIONS } from '../common/constants/permissions';
import { AuthenticatedUser, CurrentUser } from '../common/decorators/current-user.decorator';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { CreateStaffUserDto, ListUsersQueryDto, SetUserStatusDto, UpdateMeDto } from './dto/users.dto';
import { UsersService } from './users.service';

@ApiTags('Utilisateurs')
@ApiBearerAuth()
@Controller('users/me')
export class UsersController {
  constructor(private readonly users: UsersService, private readonly auth: AuthService) {}

  @Get()
  @ApiOperation({ summary: 'Mon profil, mon organisation et mes permissions' })
  me(@CurrentUser() user: AuthenticatedUser) {
    return this.users.me(user);
  }

  @Patch()
  @ApiOperation({ summary: 'Modifier mon profil (prénom, nom, téléphone, fonction, préférence de contact)' })
  update(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateMeDto) {
    return this.users.updateMe(user, dto);
  }

  @Post('password') @HttpCode(HttpStatus.NO_CONTENT) @ApiCookieAuth(REFRESH_COOKIE)
  @ApiOperation({ summary: 'Changer mon mot de passe (mes autres appareils sont déconnectés)' })
  async changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto, @Req() req: Request) {
    await this.auth.changePassword(user.id, dto.currentPassword, dto.newPassword, req.cookies?.[REFRESH_COOKIE], { ...metaOf(req) });
  }
}

@ApiTags('Administration — Utilisateurs')
@ApiBearerAuth()
@Controller('admin/users')
@RequirePermissions(PERMISSIONS.USER_MANAGE)
export class AdminUsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @ApiOperation({ summary: 'Lister les comptes (filtre statut, recherche, pagination)' })
  list(@Query() q: ListUsersQueryDto) {
    return this.users.list(q);
  }

  @Post()
  @ApiOperation({ summary: 'Créer un compte du personnel CAPH-CI (invitation envoyée par e-mail)' })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateStaffUserDto) {
    return this.users.createStaff(actor, dto);
  }

  @Patch(':id/status')
  @ApiOperation({ summary: 'Activer ou désactiver un compte (désactiver coupe aussitôt ses sessions)' })
  setStatus(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string, @Body() dto: SetUserStatusDto) {
    return this.users.setStatus(actor, id, dto.status);
  }

  @Post(':id/resend-invitation') @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: "Renvoyer le lien d'activation d'un compte invité" })
  resend(@CurrentUser() actor: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.users.resendInvitation(actor, id);
  }
}
