import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CommunicationsService } from '../communications/communications.service';
import { DocumentsService } from '../documents/documents.service';
import { EventsService } from '../events/events.service';
import { AdminMembershipsService } from '../memberships/admin/admin-memberships.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

const page = (limit: number, extra: object = {}) => ({ page: 1, limit, ...extra }) as never;
const has = (u: AuthenticatedUser, p: string) => u.permissions.includes(p);

/** Tableau de bord : une seule route, le contenu dépend de qui est connecté et de ses droits. */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService, private readonly comms: CommunicationsService, private readonly events: EventsService,
    private readonly opps: OpportunitiesService, private readonly docs: DocumentsService, private readonly reports: ReportsService,
    private readonly memberships: AdminMembershipsService,
  ) {}

  private counts(rows: { status: string; _count: { _all: number } }[]) {
    return Object.fromEntries(rows.map((r) => [r.status, r._count._all]));
  }

  async get(u: AuthenticatedUser) {
    return u.organizationId ? this.member(u, u.organizationId) : this.staff(u);
  }

  private async member(u: AuthenticatedUser, organizationId: string) {
    const [org, unread, latest, events, opps, docs, reports, news] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, name: true, memberNumber: true, status: true, registeredAt: true, isListed: true } }),
      has(u, 'communication.read') ? this.comms.unreadCount(u) : null,
      has(u, 'communication.read') ? this.comms.list(u, page(3)) : null,
      has(u, 'event.read') ? this.events.listForMembers(u, page(3)) : null,
      has(u, 'opportunity.read') ? this.opps.listForMembers(u, page(3, { status: 'OPEN' })) : null,
      has(u, 'document.read') ? this.docs.list(u, page(3)) : null,
      has(u, 'report.read') ? this.prisma.report.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } }) : null,
      has(u, 'news.propose') ? this.prisma.newsProposal.groupBy({ by: ['status'], where: { organizationId }, _count: { _all: true } }) : null,
    ]);
    return {
      kind: 'MEMBER' as const, organization: org, role: u.organizationRole,
      unreadCommunications: unread?.unread ?? 0, latestCommunications: latest?.data ?? [],
      upcomingEvents: events?.data ?? [], openOpportunities: opps?.data ?? [], latestDocuments: docs?.data ?? [],
      reports: reports ? this.counts(reports) : null, newsProposals: news ? this.counts(news) : null,
    };
  }

  private async staff(u: AuthenticatedUser) {
    const orgScope = u.isGlobalScope ? {} : { delegationId: { in: u.delegationIds } };
    const [memberships, toReview, newsToReview, organizations, unread, events, opps] = await Promise.all([
      has(u, 'membership.read') ? this.memberships.stats(u) : null,
      has(u, 'report.review') ? Promise.all([this.reports.list(u, page(1, { status: 'RECEIVED' })), this.reports.list(u, page(1, { status: 'IN_PROCESS' }))]) : null,
      has(u, 'news.review') ? this.prisma.newsProposal.count({ where: { status: 'SUBMITTED' } }) : null,
      has(u, 'organization.read.all') ? this.prisma.organization.count({ where: { ...orgScope, archivedAt: null, status: 'ACTIVE' } }) : null,
      has(u, 'communication.read') ? this.comms.unreadCount(u) : null,
      has(u, 'event.read') ? this.events.listForMembers(u, page(5)) : null,
      has(u, 'opportunity.read') ? this.opps.listForMembers(u, page(5, { status: 'OPEN' })) : null,
    ]);
    return {
      kind: 'STAFF' as const, roles: u.roleCodes,
      memberships, reports: toReview ? { received: toReview[0].meta.total, inProcess: toReview[1].meta.total } : null,
      newsToReview, activeOrganizations: organizations, unreadCommunications: unread?.unread ?? null,
      upcomingEvents: events?.data ?? [], openOpportunities: opps?.data ?? [],
    };
  }
}
