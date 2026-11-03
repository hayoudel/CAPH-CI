import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommunicationDto, ListCommunicationsQueryDto, UpdateCommunicationDto } from './dto/communications.dto';

const NOT_FOUND = { code: 'COMMUNICATION_NOT_FOUND', message: 'Communication introuvable.' };

/** Messages de la CAPH-CI vers les organisations, avec suivi de lecture. */
@Injectable()
export class CommunicationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private manages = (u: AuthenticatedUser) => u.permissions.includes('communication.manage');

  /** Qui peut voir quoi : une OPH voit ce qui vise toutes les OPH, sa propre organisation ou sa délégation. */
  private async visible(u: AuthenticatedUser, includeArchived = false): Promise<Prisma.CommunicationWhereInput> {
    const archived = this.manages(u) && includeArchived ? {} : { archivedAt: null };
    if (u.organizationId) {
      const org = await this.prisma.organization.findUnique({ where: { id: u.organizationId }, select: { delegationId: true } });
      return {
        ...archived,
        OR: [
          { audienceAll: true },
          { organizations: { some: { id: u.organizationId } } },
          ...(org?.delegationId ? [{ delegations: { some: { id: org.delegationId } } }] : []),
        ],
      };
    }
    if (this.manages(u) || u.isGlobalScope) return archived;
    return { ...archived, OR: [{ audienceAll: true }, { delegations: { some: { id: { in: u.delegationIds } } } }] };
  }

  private item(c: Prisma.CommunicationGetPayload<{ include: { reads: true; delegations: { select: { id: true; name: true } }; organizations: { select: { id: true; name: true } } } }>, u: AuthenticatedUser, full: boolean) {
    const manage = this.manages(u);
    return {
      id: c.id, kind: c.kind, category: c.category, title: c.title,
      ...(full ? { body: c.body } : { excerpt: c.body.length > 200 ? `${c.body.slice(0, 200)}…` : c.body }),
      senderLabel: c.senderLabel, publishedAt: c.publishedAt, archivedAt: manage ? c.archivedAt : undefined,
      isRead: c.reads.some((r) => r.userId === u.id),
      ...(manage ? { audienceAll: c.audienceAll, delegations: c.delegations, organizations: c.organizations } : {}),
    };
  }

  private include(u: AuthenticatedUser) {
    return {
      reads: { where: { userId: u.id } },
      delegations: { select: { id: true, name: true } },
      organizations: { select: { id: true, name: true } },
    } as const;
  }

  async list(u: AuthenticatedUser, q: ListCommunicationsQueryDto) {
    const where: Prisma.CommunicationWhereInput = {
      AND: [
        await this.visible(u, q.includeArchived),
        q.kind ? { kind: q.kind } : {},
        q.unread ? { reads: { none: { userId: u.id } } } : {},
        q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { body: { contains: q.q, mode: 'insensitive' } }] } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.communication.count({ where }),
      this.prisma.communication.findMany({ where, include: this.include(u), orderBy: { publishedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((c) => this.item(c, u, false)), total, q);
  }

  async unreadCount(u: AuthenticatedUser) {
    const unread = await this.prisma.communication.count({
      where: { AND: [await this.visible(u), { reads: { none: { userId: u.id } } }] },
    });
    return { unread };
  }

  private async find(u: AuthenticatedUser, id: string) {
    const c = await this.prisma.communication.findFirst({ where: { AND: [{ id }, await this.visible(u, true)] }, include: this.include(u) });
    if (!c) throw new NotFoundException(NOT_FOUND);
    return c;
  }

  /** Ouvrir une communication la marque comme lue (pour les membres d'une organisation). */
  async get(u: AuthenticatedUser, id: string) {
    const c = await this.find(u, id);
    if (u.organizationId && !c.reads.length) {
      await this.markRead(u, id);
      c.reads = [{ communicationId: id, userId: u.id, readAt: new Date() }];
    }
    return this.item(c, u, true);
  }

  async markRead(u: AuthenticatedUser, id: string) {
    await this.find(u, id);
    await this.prisma.communicationRead.upsert({
      where: { communicationId_userId: { communicationId: id, userId: u.id } }, update: {}, create: { communicationId: id, userId: u.id },
    });
    return { isRead: true };
  }

  private async assertTargets(delegationIds?: string[], organizationIds?: string[]) {
    if (delegationIds?.length && (await this.prisma.delegation.count({ where: { id: { in: delegationIds }, archivedAt: null } })) !== delegationIds.length) {
      throw new UnprocessableEntityException({ code: 'INVALID_TARGET', message: 'Une délégation ciblée est inconnue.' });
    }
    if (organizationIds?.length && (await this.prisma.organization.count({ where: { id: { in: organizationIds }, archivedAt: null } })) !== organizationIds.length) {
      throw new UnprocessableEntityException({ code: 'INVALID_TARGET', message: 'Une organisation ciblée est inconnue.' });
    }
  }

  async create(u: AuthenticatedUser, dto: CreateCommunicationDto) {
    const audienceAll = dto.audienceAll ?? true;
    if (!audienceAll && !dto.delegationIds?.length && !dto.organizationIds?.length) {
      throw new UnprocessableEntityException({ code: 'AUDIENCE_REQUIRED', message: 'Choisissez au moins une délégation ou une organisation destinataire.' });
    }
    await this.assertTargets(dto.delegationIds, dto.organizationIds);
    const c = await this.prisma.communication.create({
      data: {
        kind: dto.kind ?? 'INTERNAL', category: dto.category, title: dto.title, body: dto.body,
        ...(dto.senderLabel ? { senderLabel: dto.senderLabel } : {}), audienceAll, createdById: u.id,
        ...(audienceAll ? {} : {
          delegations: { connect: (dto.delegationIds ?? []).map((id) => ({ id })) },
          organizations: { connect: (dto.organizationIds ?? []).map((id) => ({ id })) },
        }),
      },
      include: this.include(u),
    });
    await this.audit.log({ action: 'communication.created', actorId: u.id, actorLabel: u.email, entityType: 'Communication', entityId: c.id, metadata: { audienceAll, kind: c.kind } });
    return this.item(c, u, true);
  }

  async update(u: AuthenticatedUser, id: string, dto: UpdateCommunicationDto) {
    const current = await this.find(u, id);
    const audienceAll = dto.audienceAll ?? current.audienceAll;
    const touchesAudience = dto.audienceAll !== undefined || dto.delegationIds || dto.organizationIds;
    if (touchesAudience && !audienceAll && !(dto.delegationIds?.length ?? current.delegations.length) && !(dto.organizationIds?.length ?? current.organizations.length)) {
      throw new UnprocessableEntityException({ code: 'AUDIENCE_REQUIRED', message: 'Choisissez au moins une délégation ou une organisation destinataire.' });
    }
    await this.assertTargets(dto.delegationIds, dto.organizationIds);
    const c = await this.prisma.communication.update({
      where: { id },
      data: {
        category: dto.category, title: dto.title, body: dto.body,
        ...(touchesAudience ? {
          audienceAll,
          delegations: { set: audienceAll ? [] : (dto.delegationIds ?? current.delegations.map((d) => d.id)).map((x) => ({ id: x })) },
          organizations: { set: audienceAll ? [] : (dto.organizationIds ?? current.organizations.map((o) => o.id)).map((x) => ({ id: x })) },
        } : {}),
      },
      include: this.include(u),
    });
    await this.audit.log({ action: 'communication.updated', actorId: u.id, actorLabel: u.email, entityType: 'Communication', entityId: id });
    return this.item(c, u, true);
  }

  async setArchived(u: AuthenticatedUser, id: string, archived: boolean) {
    await this.find(u, id);
    const c = await this.prisma.communication.update({ where: { id }, data: { archivedAt: archived ? new Date() : null }, include: this.include(u) });
    await this.audit.log({ action: archived ? 'communication.archived' : 'communication.restored', actorId: u.id, actorLabel: u.email, entityType: 'Communication', entityId: id });
    return this.item(c, u, true);
  }

  /** Suivi de lecture : combien de destinataires ont ouvert le message. */
  async stats(u: AuthenticatedUser, id: string) {
    const c = await this.find(u, id);
    const orgWhere: Prisma.OrganizationWhereInput = c.audienceAll
      ? { status: 'ACTIVE' }
      : { status: 'ACTIVE', OR: [{ id: { in: c.organizations.map((o) => o.id) } }, { delegationId: { in: c.delegations.map((d) => d.id) } }] };
    const memberWhere: Prisma.UserWhereInput = { status: 'ACTIVE', membership: { is: { organization: orgWhere } } };
    const [organizations, recipients, read, readOrgs] = await Promise.all([
      this.prisma.organization.count({ where: orgWhere }),
      this.prisma.user.count({ where: memberWhere }),
      this.prisma.communicationRead.count({ where: { communicationId: id, user: memberWhere } }),
      this.prisma.organization.count({ where: { ...orgWhere, members: { some: { user: { communicationReads: { some: { communicationId: id } } } } } } }),
    ]);
    return {
      id, title: c.title, organizations, organizationsReached: readOrgs, recipients, read,
      unread: Math.max(0, recipients - read), readRate: recipients ? Math.round((read / recipients) * 100) : 0,
    };
  }

  /** Communiqués EXTERNAL adressés à tous : visibles sur le site public. */
  async listPublic(q: ListCommunicationsQueryDto) {
    const where: Prisma.CommunicationWhereInput = { archivedAt: null, kind: 'EXTERNAL', audienceAll: true };
    const [total, rows] = await Promise.all([
      this.prisma.communication.count({ where }),
      this.prisma.communication.findMany({ where, orderBy: { publishedAt: 'desc' }, ...pageArgs(q), select: { id: true, category: true, title: true, body: true, senderLabel: true, publishedAt: true } }),
    ]);
    return paginated(rows, total, q);
  }
}
