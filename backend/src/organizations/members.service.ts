import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AuditService } from '../audit/audit.service';
import { AuthService } from '../auth/auth.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { InviteMemberDto, MemberRoleCode } from './dto/organizations.dto';
import { OrganizationsService } from './organizations.service';

const memberSelect = {
  userId: true,
  role: { select: { code: true, label: true } },
  user: { select: { id: true, firstName: true, lastName: true, jobTitle: true, email: true, status: true, lastLoginAt: true } },
} as const;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgs: OrganizationsService,
    private readonly auth: AuthService,
    private readonly audit: AuditService,
  ) {}

  private canManage(user: AuthenticatedUser, own: boolean) {
    return user.permissions.includes('organization.members.manage') && (own || user.roleCodes.includes('ADMIN'));
  }

  /** Seul le Président (ou l'administrateur CAPH-CI) nomme, change ou retire un Suppléant. */
  private assertCanTouchDeputy(user: AuthenticatedUser, roleCode: string) {
    if (roleCode !== 'OPH_DEPUTY') return;
    const allowed = user.organizationRole?.code === 'OPH_PRESIDENT' || user.roleCodes.includes('ADMIN');
    if (!allowed) {
      throw new ForbiddenException({ code: 'DEPUTY_PRESIDENT_ONLY', message: 'Seul le Président peut nommer, modifier ou retirer un Suppléant.' });
    }
  }

  /** Tous les membres de l'OPH voient la liste ; seul le Président voit e-mails et dernière connexion. */
  async list(user: AuthenticatedUser, orgId: string) {
    const { own } = await this.orgs.findReadable(user, orgId);
    const manage = this.canManage(user, own);
    const rows = await this.prisma.organizationMember.findMany({ where: { organizationId: orgId }, select: memberSelect });
    return rows
      .map((m) => ({
        userId: m.userId, firstName: m.user.firstName, lastName: m.user.lastName, jobTitle: m.user.jobTitle,
        role: m.role, status: m.user.status,
        ...(manage ? { email: m.user.email, lastLoginAt: m.user.lastLoginAt } : {}),
      }))
      .sort((a, b) => (a.role.code === 'OPH_PRESIDENT' ? -1 : b.role.code === 'OPH_PRESIDENT' ? 1 : a.lastName.localeCompare(b.lastName)));
  }

  async invite(user: AuthenticatedUser, orgId: string, dto: InviteMemberDto) {
    const org = await this.orgs.findWritable(user, orgId);
    this.assertCanTouchDeputy(user, dto.roleCode);
    if (await this.prisma.user.findUnique({ where: { email: dto.email } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: 'Un compte existe déjà avec cette adresse e-mail.' });
    }
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: dto.roleCode } });
    const created = await this.prisma.user.create({
      data: {
        email: dto.email, firstName: dto.firstName, lastName: dto.lastName, jobTitle: dto.jobTitle, status: 'INVITED',
        membership: { create: { organizationId: org.id, roleId: role.id } },
      },
    });
    await this.auth.sendInvitation(created.id);
    await this.audit.log({
      action: 'organization.member.invited', actorId: user.id, entityType: 'Organization', entityId: org.id,
      metadata: { userId: created.id, role: dto.roleCode },
    });
    return { userId: created.id, firstName: created.firstName, lastName: created.lastName, email: created.email, status: created.status, role: { code: role.code, label: role.label } };
  }

  private async target(user: AuthenticatedUser, orgId: string, userId: string) {
    const org = await this.orgs.findWritable(user, orgId);
    const m = await this.prisma.organizationMember.findFirst({ where: { organizationId: org.id, userId }, select: memberSelect });
    if (!m) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Membre introuvable.' });
    if (m.role.code === 'OPH_PRESIDENT') {
      throw new BadRequestException({ code: 'PRESIDENT_PROTECTED', message: "Le Président de l'OPH ne peut pas être modifié ou retiré ici." });
    }
    this.assertCanTouchDeputy(user, m.role.code);
    if (m.userId === user.id) {
      throw new BadRequestException({ code: 'SELF_ACTION', message: 'Vous ne pouvez pas modifier votre propre rôle ou vous retirer vous-même.' });
    }
    return { org, m };
  }

  async changeRole(user: AuthenticatedUser, orgId: string, userId: string, roleCode: MemberRoleCode) {
    const { org, m } = await this.target(user, orgId, userId);
    this.assertCanTouchDeputy(user, roleCode);
    const role = await this.prisma.role.findUniqueOrThrow({ where: { code: roleCode } });
    await this.prisma.organizationMember.update({ where: { userId }, data: { roleId: role.id } });
    await this.audit.log({
      action: 'organization.member.role_changed', actorId: user.id, entityType: 'Organization', entityId: org.id,
      metadata: { userId, from: m.role.code, to: roleCode },
    });
    return { userId, role: { code: role.code, label: role.label } };
  }

  /** Retire le membre de l'OPH ET désactive son compte (ses sessions sont coupées aussitôt). */
  async remove(user: AuthenticatedUser, orgId: string, userId: string) {
    const { org } = await this.target(user, orgId, userId);
    await this.prisma.$transaction([
      this.prisma.organizationMember.delete({ where: { userId } }),
      this.prisma.user.update({ where: { id: userId }, data: { status: 'DISABLED' } }),
      this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } }),
    ]);
    await this.audit.log({
      action: 'organization.member.removed', actorId: user.id, entityType: 'Organization', entityId: org.id, metadata: { userId },
    });
  }

  async resendInvitation(user: AuthenticatedUser, orgId: string, userId: string) {
    const { org, m } = await this.target(user, orgId, userId);
    if (m.user.status !== 'INVITED') {
      throw new BadRequestException({ code: 'NOT_INVITED', message: 'Ce compte est déjà activé.' });
    }
    await this.auth.sendInvitation(userId);
    await this.audit.log({ action: 'organization.member.invitation_resent', actorId: user.id, entityType: 'Organization', entityId: org.id, metadata: { userId } });
  }
}
