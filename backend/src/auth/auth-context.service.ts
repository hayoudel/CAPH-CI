import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';

const roleWithPerms = { include: { permissions: { include: { permission: true } } } } as const;

/**
 * Reconstruit le contexte d'autorisation depuis la base à chaque requête :
 * un compte désactivé ou un rôle retiré prend effet IMMÉDIATEMENT (pas d'attente d'expiration du jeton).
 */
@Injectable()
export class AuthContextService {
  constructor(private readonly prisma: PrismaService) {}

  async load(userId: string): Promise<AuthenticatedUser | null> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        roles: { include: { role: roleWithPerms } },
        membership: {
          include: { role: roleWithPerms, organization: { select: { id: true, name: true, status: true } } },
        },
      },
    });
    if (!user || user.status !== 'ACTIVE') return null;

    const permissions = new Set<string>();
    const roleCodes: string[] = [];
    const delegationIds: string[] = [];
    let isGlobalScope = false;

    for (const ur of user.roles) {
      roleCodes.push(ur.role.code);
      ur.role.permissions.forEach((rp) => permissions.add(rp.permission.code));
      if (ur.delegationId) delegationIds.push(ur.delegationId);
      else isGlobalScope = true;
    }

    // Les droits liés à une OPH n'existent que si l'OPH est ACTIVE (pas suspendue ni archivée).
    let organizationId: string | null = null;
    let organizationName: string | null = null;
    let organizationRole: AuthenticatedUser['organizationRole'] = null;
    const m = user.membership;
    if (m && m.organization.status === 'ACTIVE') {
      organizationId = m.organization.id;
      organizationName = m.organization.name;
      organizationRole = { code: m.role.code, label: m.role.label };
      roleCodes.push(m.role.code);
      m.role.permissions.forEach((rp) => permissions.add(rp.permission.code));
    }

    return {
      id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName,
      permissions: [...permissions].sort(), roleCodes, organizationId, organizationName,
      organizationRole, delegationIds, isGlobalScope,
    };
  }
}
