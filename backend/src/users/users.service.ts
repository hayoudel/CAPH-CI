import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthContextService } from '../auth/auth-context.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateStaffUserDto, ListUsersQueryDto, UpdateMeDto } from './dto/users.dto';

const userSelect = {
  id: true, email: true, firstName: true, lastName: true, phone: true, jobTitle: true,
  status: true, contactPreference: true, lastLoginAt: true, createdAt: true,
  roles: { select: { delegationId: true, role: { select: { code: true, label: true } } } },
  membership: { select: { organization: { select: { id: true, name: true } }, role: { select: { code: true, label: true } } } },
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    private readonly context: AuthContextService,
  ) {}

  /** Profil personnel + permissions (le frontend s'en sert pour masquer les actions interdites). */
  async me(user: AuthenticatedUser) {
    const u = await this.prisma.user.findUniqueOrThrow({ where: { id: user.id }, select: userSelect });
    return {
      ...u,
      permissions: user.permissions,
      organization: user.organizationId
        ? { id: user.organizationId, name: user.organizationName, role: user.organizationRole }
        : null,
    };
  }

  async updateMe(user: AuthenticatedUser, dto: UpdateMeDto) {
    // L'e-mail et les rôles ne sont PAS modifiables ici (liste blanche du DTO).
    await this.prisma.user.update({ where: { id: user.id }, data: dto });
    await this.audit.log({ action: 'user.profile.updated', actorId: user.id, entityType: 'User', entityId: user.id, metadata: { fields: Object.keys(dto) } });
    return this.me(user);
  }

  // ───────────────────────── Administration des comptes ─────────────────────────

  async list(q: ListUsersQueryDto) {
    const where: Prisma.UserWhereInput = {
      ...(q.status ? { status: q.status } : {}),
      ...(q.q
        ? { OR: [
            { email: { contains: q.q, mode: 'insensitive' } },
            { firstName: { contains: q.q, mode: 'insensitive' } },
            { lastName: { contains: q.q, mode: 'insensitive' } },
          ] }
        : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({ where, select: userSelect, orderBy: [{ lastName: 'asc' }, { firstName: 'asc' }], ...pageArgs(q) }),
      this.prisma.user.count({ where }),
    ]);
    return paginated(rows, total, q);
  }

  async createStaff(actor: AuthenticatedUser, dto: CreateStaffUserDto) {
    const roles = await this.prisma.role.findMany({ where: { code: { in: dto.roleCodes }, scope: 'GLOBAL' } });
    if (roles.length !== new Set(dto.roleCodes).size) {
      throw new BadRequestException({ code: 'INVALID_ROLE', message: 'Un ou plusieurs rôles sont inconnus ou ne sont pas des rôles du personnel.' });
    }
    if (roles.some((r) => r.code === 'DELEGATION_MANAGER') && !dto.delegationId) {
      throw new BadRequestException({ code: 'DELEGATION_REQUIRED', message: 'Un responsable de délégation doit être rattaché à une délégation.' });
    }
    if (dto.delegationId && !(await this.prisma.delegation.findUnique({ where: { id: dto.delegationId } }))) {
      throw new NotFoundException({ code: 'NOT_FOUND', message: 'Délégation introuvable.' });
    }
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Un compte existe déjà avec cette adresse e-mail.' });
    }

    const created = await this.prisma.user.create({
      data: {
        email: dto.email, firstName: dto.firstName, lastName: dto.lastName,
        jobTitle: dto.jobTitle, phone: dto.phone, status: 'INVITED',
        roles: {
          create: roles.map((r) => ({
            roleId: r.id,
            delegationId: r.code === 'DELEGATION_MANAGER' ? dto.delegationId : null,
          })),
        },
      },
      select: userSelect,
    });
    await this.auth.sendInvitation(created.id);
    await this.audit.log({
      action: 'user.created', actorId: actor.id, entityType: 'User', entityId: created.id,
      metadata: { roles: dto.roleCodes },
    });
    return created;
  }

  async setStatus(actor: AuthenticatedUser, id: string, status: 'ACTIVE' | 'DISABLED') {
    if (id === actor.id) {
      throw new BadRequestException({ code: 'SELF_STATUS', message: 'Vous ne pouvez pas modifier le statut de votre propre compte.' });
    }
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
    if (status === 'ACTIVE' && !user.passwordHash) {
      throw new BadRequestException({ code: 'NOT_ACTIVATED', message: "Ce compte n'a pas encore été activé par son titulaire (invitation en attente)." });
    }
    await this.prisma.user.update({ where: { id }, data: { status } });
    if (status === 'DISABLED') {
      // Coupe immédiatement toutes ses sessions.
      await this.prisma.refreshToken.updateMany({ where: { userId: id, revokedAt: null }, data: { revokedAt: new Date() } });
    }
    await this.audit.log({
      action: status === 'ACTIVE' ? 'user.activated' : 'user.disabled',
      actorId: actor.id, entityType: 'User', entityId: id,
    });
    return this.prisma.user.findUniqueOrThrow({ where: { id }, select: userSelect });
  }

  async resendInvitation(actor: AuthenticatedUser, id: string) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Utilisateur introuvable.' });
    if (user.status !== 'INVITED') {
      throw new BadRequestException({ code: 'NOT_INVITED', message: "Ce compte est déjà activé." });
    }
    await this.auth.sendInvitation(id);
    await this.audit.log({ action: 'user.invitation.resent', actorId: actor.id, entityType: 'User', entityId: id });
  }
}
