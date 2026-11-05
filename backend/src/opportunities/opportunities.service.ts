import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FileAssetService } from '../storage/file-asset.service';
import { creationReview, decisionData, reviewScope } from '../common/utils/review';
import { CreateOpportunityDto, ListOpportunitiesQueryDto, UpdateOpportunityDto } from './dto/opportunities.dto';

const NOT_FOUND = { code: 'OPPORTUNITY_NOT_FOUND', message: 'Opportunité introuvable.' };
const select = {
  id: true, reference: true, title: true, summary: true, body: true, type: true, status: true, deadline: true, audience: true,
  modality: true, visibility: true, archivedAt: true, reviewStatus: true, reviewNote: true, organization: { select: { id: true, name: true } }, createdAt: true, sheetFile: { select: { originalName: true, mimeType: true, sizeBytes: true } },
} as const;

type Row = Prisma.OpportunityGetPayload<{ select: typeof select }>;

/** Appels à projets, formations, consultations, emplois… Une opportunité « ouverte » dont la date limite est passée apparaît comme « terminée ». */
@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService, private readonly files: FileAssetService, private readonly audit: AuditService) {}

  private view(r: Row) {
    const ended = r.status === 'OPEN' && !!r.deadline && r.deadline.getTime() < Date.now();
    const { sheetFile, ...rest } = r;
    return { ...rest, effectiveStatus: ended ? 'ENDED' : r.status, hasSheet: !!sheetFile, sheet: sheetFile };
  }

  private statusWhere(status?: string): Prisma.OpportunityWhereInput {
    const now = new Date();
    if (status === 'OPEN') return { status: 'OPEN', OR: [{ deadline: null }, { deadline: { gte: now } }] };
    if (status === 'ENDED') return { OR: [{ status: 'ENDED' }, { status: 'OPEN', deadline: { lt: now } }] };
    if (status === 'CLOSED') return { status: 'CLOSED' };
    return {};
  }

  private async list(base: Prisma.OpportunityWhereInput, q: ListOpportunitiesQueryDto) {
    const where: Prisma.OpportunityWhereInput = {
      AND: [
        base, this.statusWhere(q.status), q.type ? { type: q.type } : {}, q.review ? { reviewStatus: q.review } : {},
        q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { summary: { contains: q.q, mode: 'insensitive' } }, { reference: { contains: q.q, mode: 'insensitive' } }] } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.opportunity.count({ where }),
      this.prisma.opportunity.findMany({ where, select, orderBy: [{ deadline: { sort: 'asc', nulls: 'last' } }, { createdAt: 'desc' }], ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }

  private manages = (u: AuthenticatedUser) => u.permissions.includes('opportunity.manage');
  private memberScope(u: AuthenticatedUser, withArchived = false): Prisma.OpportunityWhereInput {
    return { ...(this.manages(u) && withArchived ? {} : { archivedAt: null }), ...reviewScope(u, this.manages(u)) };
  }

  listForMembers(u: AuthenticatedUser, q: ListOpportunitiesQueryDto) {
    return this.list(this.memberScope(u, q.includeArchived), q);
  }
  /** Site public : uniquement ce que le personnel a validé. */
  listPublic(q: ListOpportunitiesQueryDto) {
    return this.list({ archivedAt: null, visibility: 'PUBLIC', reviewStatus: 'APPROVED' }, { ...q, review: undefined, status: q.status ?? 'OPEN' });
  }

  private async find(id: string, scope: Prisma.OpportunityWhereInput) {
    const r = await this.prisma.opportunity.findFirst({ where: { id, ...scope }, select });
    if (!r) throw new NotFoundException(NOT_FOUND);
    return r;
  }
  async get(u: AuthenticatedUser, id: string) {
    return this.view(await this.find(id, this.memberScope(u, true)));
  }
  async getPublic(id: string) { return this.view(await this.find(id, { archivedAt: null, visibility: 'PUBLIC', reviewStatus: 'APPROVED' })); }

  private async sheetOf(id: string, scope: Prisma.OpportunityWhereInput) {
    const r = await this.prisma.opportunity.findFirst({ where: { id, ...scope }, include: { sheetFile: true } });
    if (!r?.sheetFile) throw new NotFoundException({ code: 'SHEET_NOT_FOUND', message: 'Aucune fiche à télécharger pour cette opportunité.' });
    return this.files.read(r.sheetFile);
  }
  sheet(u: AuthenticatedUser, id: string) { return this.sheetOf(id, this.memberScope(u, true)); }
  sheetPublic(id: string) { return this.sheetOf(id, { archivedAt: null, visibility: 'PUBLIC', reviewStatus: 'APPROVED' }); }

  async create(u: AuthenticatedUser, dto: CreateOpportunityDto) {
    const year = new Date().getFullYear();
    const created = await this.prisma.$transaction(async (tx) => {
      // Compteur dédié aux opportunités : clé négative (-année) pour ne jamais croiser celui des dossiers d'adhésion.
      const rows = await tx.$queryRaw<{ last: number }[]>`
        INSERT INTO reference_counters (year, last) VALUES (${-year}, 1)
        ON CONFLICT (year) DO UPDATE SET last = reference_counters.last + 1 RETURNING last`;
      return tx.opportunity.create({
        data: { ...dto, ...creationReview(u, this.manages(u)), reference: `OP-${year}-${String(rows[0].last).padStart(2, '0')}`, createdById: u.id }, select,
      });
    });
    await this.audit.log({ action: 'opportunity.created', actorId: u.id, actorLabel: u.email, entityType: 'Opportunity', entityId: created.id, metadata: { visibility: created.visibility, reviewStatus: created.reviewStatus } });
    return this.view(created);
  }

  async update(u: AuthenticatedUser, id: string, dto: UpdateOpportunityDto) {
    await this.find(id, {});
    const r = await this.prisma.opportunity.update({ where: { id }, data: dto, select });
    await this.audit.log({ action: 'opportunity.updated', actorId: u.id, actorLabel: u.email, entityType: 'Opportunity', entityId: id });
    return this.view(r);
  }

  /** Décision du personnel sur une opportunité proposée par une OPH. */
  async review(u: AuthenticatedUser, id: string, status: 'APPROVED' | 'REJECTED', note?: string) {
    await this.find(id, {});
    const r = await this.prisma.opportunity.update({ where: { id }, data: decisionData(u, status, note), select });
    await this.audit.log({ action: status === 'APPROVED' ? 'opportunity.approved' : 'opportunity.rejected', actorId: u.id, actorLabel: u.email, entityType: 'Opportunity', entityId: id });
    return this.view(r);
  }

  async attachSheet(u: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    await this.find(id, {});
    const asset = await this.files.create(file, u.id);
    const r = await this.prisma.opportunity.update({ where: { id }, data: { sheetFileId: asset.id }, select });
    await this.audit.log({ action: 'opportunity.sheet_attached', actorId: u.id, actorLabel: u.email, entityType: 'Opportunity', entityId: id });
    return this.view(r);
  }

  async setState(u: AuthenticatedUser, id: string, action: 'close' | 'reopen' | 'archive' | 'restore') {
    await this.find(id, {});
    const data: Prisma.OpportunityUpdateInput =
      action === 'close' ? { status: 'CLOSED' } : action === 'reopen' ? { status: 'OPEN' }
        : action === 'archive' ? { archivedAt: new Date() } : { archivedAt: null };
    const r = await this.prisma.opportunity.update({ where: { id }, data, select });
    await this.audit.log({ action: `opportunity.${action}`, actorId: u.id, actorLabel: u.email, entityType: 'Opportunity', entityId: id });
    return this.view(r);
  }
}
