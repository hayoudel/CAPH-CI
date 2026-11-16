import { Injectable } from '@nestjs/common';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CommunicationsService } from '../communications/communications.service';
import { DocumentsService } from '../documents/documents.service';
import { EventsService } from '../events/events.service';
import { AdminMembershipsService } from '../memberships/admin/admin-memberships.service';
import { OpportunitiesService } from '../opportunities/opportunities.service';
import { PrismaService } from '../prisma/prisma.service';
import { ReportsService } from '../reports/reports.service';

const NEWS_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'Soumise', IN_REVIEW: 'En cours de validation', CORRECTION: 'À corriger', APPROVED: 'Validée', REJECTED: 'Refusée', PUBLISHED: 'Publiée',
};
const PROJECT_LABELS: Record<string, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'Soumis', IN_REVIEW: 'En cours de validation', TO_COMPLETE: 'À compléter', VALIDATED: 'Validé', REJECTED: 'Refusé', ONGOING: 'En cours', COMPLETED: 'Terminé',
};
const REPORT_LABELS: Record<string, string> = { RECEIVED: 'Reçu', IN_PROCESS: 'En traitement', PROCESSED: 'Traité', CORRECTION_REQUESTED: 'À corriger' };
/** Statuts posés par le personnel (décision ou demande) : ils alimentent les notifications du membre. */
const NEWS_DECISIONS = ['CORRECTION', 'APPROVED', 'REJECTED', 'PUBLISHED'] as const;
const PROJECT_DECISIONS = ['TO_COMPLETE', 'VALIDATED', 'REJECTED', 'ONGOING', 'COMPLETED'] as const;
const NEEDS_ACTION = ['CORRECTION', 'TO_COMPLETE', 'CORRECTION_REQUESTED'];
const RECENT_DAYS = 45;

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
    const now = new Date();
    const since = new Date(now.getTime() - RECENT_DAYS * 86_400_000);
    const canNews = has(u, 'news.propose'), canProject = has(u, 'project.read'), canReport = has(u, 'report.read');
    const [org, unread, latest, events, opps, docs, reports, news, projects, deadlines, newsHist, projHist, reportsDone, demo] = await Promise.all([
      this.prisma.organization.findUniqueOrThrow({ where: { id: organizationId }, select: { id: true, name: true, memberNumber: true, status: true, registeredAt: true, isListed: true } }),
      has(u, 'communication.read') ? this.comms.unreadCount(u) : null,
      has(u, 'communication.read') ? this.comms.list(u, page(3)) : null,
      has(u, 'event.read') ? this.events.listForMembers(u, page(3)) : null,
      has(u, 'opportunity.read') ? this.opps.listForMembers(u, page(3, { status: 'OPEN' })) : null,
      has(u, 'document.read') ? this.docs.list(u, page(3)) : null,
      canReport ? this.prisma.report.findMany({ where: { organizationId }, orderBy: { submittedAt: 'desc' }, select: { id: true, title: true, status: true, submittedAt: true, isDemo: true } }) : null,
      canNews ? this.prisma.newsProposal.findMany({ where: { organizationId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, status: true, updatedAt: true, submittedAt: true, isDemo: true } }) : null,
      canProject ? this.prisma.project.findMany({ where: { organizationId }, orderBy: { updatedAt: 'desc' }, select: { id: true, title: true, status: true, progress: true, startDate: true, endDate: true, isDemo: true } }) : null,
      has(u, 'opportunity.read') ? this.prisma.opportunity.findMany({
        where: { status: 'OPEN', archivedAt: null, reviewStatus: 'APPROVED', deadline: { gte: now } }, orderBy: { deadline: 'asc' }, take: 6, select: { id: true, title: true, deadline: true },
      }) : null,
      canNews ? this.prisma.newsStatusHistory.findMany({
        where: { proposal: { organizationId }, toStatus: { in: [...NEWS_DECISIONS] }, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 8,
        select: { toStatus: true, note: true, createdAt: true, proposal: { select: { id: true, title: true, status: true } } },
      }) : null,
      canProject ? this.prisma.projectStatusHistory.findMany({
        where: { project: { organizationId }, toStatus: { in: [...PROJECT_DECISIONS] }, createdAt: { gte: since } }, orderBy: { createdAt: 'desc' }, take: 8,
        select: { toStatus: true, note: true, createdAt: true, project: { select: { id: true, title: true, status: true } } },
      }) : null,
      canReport ? this.prisma.report.findMany({
        where: { organizationId, status: { in: ['CORRECTION_REQUESTED', 'PROCESSED'] }, updatedAt: { gte: since } }, orderBy: { updatedAt: 'desc' }, take: 8,
        select: { id: true, title: true, status: true, reviewerNote: true, updatedAt: true },
      }) : null,
      this.hasDemo(),
    ]);

    // Notifications : décisions et demandes de correction du personnel, les plus récentes d'abord.
    const notifications = [
      ...(newsHist ?? []).map((h) => ({ kind: 'news' as const, id: h.proposal.id, title: h.proposal.title, status: h.toStatus, statusLabel: NEWS_LABELS[h.toStatus], note: h.note, date: h.createdAt, needsAction: NEEDS_ACTION.includes(h.toStatus) && h.proposal.status === h.toStatus, link: `/espace/actualites/${h.proposal.id}` })),
      ...(projHist ?? []).map((h) => ({ kind: 'project' as const, id: h.project.id, title: h.project.title, status: h.toStatus, statusLabel: PROJECT_LABELS[h.toStatus], note: h.note, date: h.createdAt, needsAction: NEEDS_ACTION.includes(h.toStatus) && h.project.status === h.toStatus, link: `/espace/projets/${h.project.id}` })),
      ...(reportsDone ?? []).map((r) => ({ kind: 'report' as const, id: r.id, title: r.title, status: r.status, statusLabel: REPORT_LABELS[r.status], note: r.reviewerNote, date: r.updatedAt, needsAction: r.status === 'CORRECTION_REQUESTED', link: `/espace/rapports/${r.id}` })),
    ].sort((x, y) => y.date.getTime() - x.date.getTime()).slice(0, 8);

    const mine = (projects ?? []);
    const echeances = [
      ...(deadlines ?? []).map((o) => ({ kind: 'opportunity' as const, id: o.id, title: o.title, date: o.deadline!, link: `/espace/opportunites/${o.id}` })),
      ...mine.filter((p) => ['VALIDATED', 'ONGOING'].includes(p.status) && p.endDate && p.endDate >= now)
        .map((p) => ({ kind: 'project' as const, id: p.id, title: p.title, date: p.endDate!, link: `/espace/projets/${p.id}` })),
    ].sort((x, y) => x.date.getTime() - y.date.getTime()).slice(0, 6);

    return {
      kind: 'MEMBER' as const, organization: org, role: u.organizationRole, hasDemoData: demo,
      unreadCommunications: unread?.unread ?? 0, latestCommunications: latest?.data ?? [],
      upcomingEvents: events?.data ?? [], openOpportunities: opps?.data ?? [], latestDocuments: docs?.data ?? [],
      reports: reports ? this.counts(this.group(reports)) : null, newsProposals: news ? this.counts(this.group(news)) : null,
      myProjects: projects ? {
        ongoing: mine.filter((p) => p.status === 'ONGOING').slice(0, 4).map((p) => ({ id: p.id, title: p.title, progress: p.progress, startDate: p.startDate, endDate: p.endDate, isDemo: p.isDemo })),
        pending: mine.filter((p) => ['SUBMITTED', 'IN_REVIEW', 'TO_COMPLETE'].includes(p.status)).slice(0, 4).map((p) => ({ id: p.id, title: p.title, status: p.status, statusLabel: PROJECT_LABELS[p.status], isDemo: p.isDemo })),
        counts: Object.fromEntries(Object.entries(mine.reduce<Record<string, number>>((a, p) => ({ ...a, [p.status]: (a[p.status] ?? 0) + 1 }), {}))),
      } : null,
      myNews: news ? news.slice(0, 4).map((n) => ({ id: n.id, title: n.title, status: n.status, statusLabel: NEWS_LABELS[n.status], date: n.submittedAt ?? n.updatedAt, isDemo: n.isDemo })) : null,
      myReports: reports ? reports.slice(0, 4).map((r) => ({ id: r.id, title: r.title, status: r.status, statusLabel: REPORT_LABELS[r.status], date: r.submittedAt, isDemo: r.isDemo })) : null,
      upcomingDeadlines: echeances, notifications,
    };
  }

  private group(rows: { status: string }[]) {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.status, (m.get(r.status) ?? 0) + 1);
    return [...m].map(([status, n]) => ({ status, _count: { _all: n } }));
  }

  /** Vrai si l'espace contient des données de démonstration (pour le signaler clairement à l'écran). */
  private async hasDemo() {
    const w = { where: { isDemo: true }, select: { id: true } };
    const found = await Promise.all([
      this.prisma.opportunity.findFirst(w), this.prisma.event.findFirst(w), this.prisma.project.findFirst(w), this.prisma.newsProposal.findFirst(w), this.prisma.report.findFirst(w),
    ]);
    return found.some(Boolean);
  }

  private async staff(u: AuthenticatedUser) {
    const orgScope = u.isGlobalScope ? {} : { delegationId: { in: u.delegationIds } };
    const [memberships, toReview, newsToReview, organizations, unread, events, opps, contentsToReview] = await Promise.all([
      has(u, 'membership.read') ? this.memberships.stats(u) : null,
      has(u, 'report.review') ? Promise.all([this.reports.list(u, page(1, { status: 'RECEIVED' })), this.reports.list(u, page(1, { status: 'IN_PROCESS' }))]) : null,
      has(u, 'news.review') ? this.prisma.newsProposal.count({ where: { status: { in: ['SUBMITTED', 'IN_REVIEW'] } } }) : null,
      has(u, 'organization.read.all') ? this.prisma.organization.count({ where: { ...orgScope, archivedAt: null, status: 'ACTIVE' } }) : null,
      has(u, 'communication.read') ? this.comms.unreadCount(u) : null,
      has(u, 'event.read') ? this.events.listForMembers(u, page(5)) : null,
      has(u, 'opportunity.read') ? this.opps.listForMembers(u, page(5, { status: 'OPEN' })) : null,
      this.pendingContents(u),
    ]);
    return {
      kind: 'STAFF' as const, roles: u.roleCodes,
      memberships, reports: toReview ? { received: toReview[0].meta.total, inProcess: toReview[1].meta.total } : null,
      newsToReview, activeOrganizations: organizations, unreadCommunications: unread?.unread ?? null,
      upcomingEvents: events?.data ?? [], openOpportunities: opps?.data ?? [], contentsToReview,
    };
  }

  /** Opportunités et événements proposés par des OPH, en attente de validation (selon les droits du personnel). */
  private async pendingContents(u: AuthenticatedUser) {
    const where = { reviewStatus: 'PENDING' as const, archivedAt: null };
    const [opportunities, events] = await Promise.all([
      has(u, 'opportunity.manage') ? this.prisma.opportunity.count({ where }) : 0,
      has(u, 'event.manage') ? this.prisma.event.count({ where }) : 0,
    ]);
    return { opportunities, events, total: opportunities + events };
  }
}
