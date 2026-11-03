import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ReportStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileAssetService } from '../storage/file-asset.service';
import { CreateReportDto, ListReportsQueryDto, ReviewReportDto, UpdateReportDto } from './dto/reports.dto';

const NOT_FOUND = { code: 'REPORT_NOT_FOUND', message: 'Rapport introuvable.' };
const MAX_ATTACHMENTS = 5;
const EDITABLE: ReportStatus[] = ['RECEIVED', 'CORRECTION_REQUESTED'];
const STATUS_LABELS: Record<ReportStatus, string> = {
  RECEIVED: 'Reçu', IN_PROCESS: 'En traitement', PROCESSED: 'Traité', CORRECTION_REQUESTED: 'Correction demandée',
};
const include = {
  organization: { select: { id: true, name: true } },
  author: { select: { firstName: true, lastName: true, email: true } },
  attachments: { include: { file: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ReportInclude;
type Row = Prisma.ReportGetPayload<{ include: typeof include }>;

/** Rapports transmis par les organisations à la CAPH-CI, et leur traitement par le personnel. */
@Injectable()
export class ReportsService {
  constructor(
    private readonly prisma: PrismaService, private readonly files: FileAssetService,
    private readonly audit: AuditService, private readonly mail: MailService,
  ) {}

  /** Une organisation ne voit que ses rapports ; le personnel voit ceux de son périmètre (délégations). */
  private scope(u: AuthenticatedUser): Prisma.ReportWhereInput {
    if (u.organizationId) return { organizationId: u.organizationId };
    return u.isGlobalScope ? {} : { organization: { delegationId: { in: u.delegationIds } } };
  }
  private requireOrg(u: AuthenticatedUser) {
    if (!u.organizationId) throw new ForbiddenException({ code: 'NO_ORGANIZATION', message: 'Réservé aux membres d’une organisation.' });
    return u.organizationId;
  }

  private view(r: Row) {
    return {
      id: r.id, organization: r.organization, type: r.type, title: r.title, summary: r.summary,
      periodStart: r.periodStart, periodEnd: r.periodEnd, status: r.status, statusLabel: STATUS_LABELS[r.status],
      reviewerNote: r.status === 'CORRECTION_REQUESTED' || r.reviewerNote ? r.reviewerNote : null,
      submittedAt: r.submittedAt, processedAt: r.processedAt, author: `${r.author.firstName} ${r.author.lastName}`,
      canEdit: EDITABLE.includes(r.status),
      attachments: r.attachments.map((a) => ({ id: a.id, originalName: a.file.originalName, mimeType: a.file.mimeType, sizeBytes: a.file.sizeBytes })),
    };
  }

  private async find(u: AuthenticatedUser, id: string) {
    const r = await this.prisma.report.findFirst({ where: { id, ...this.scope(u) }, include });
    if (!r) throw new NotFoundException(NOT_FOUND);
    return r;
  }
  private async findEditable(u: AuthenticatedUser, id: string) {
    this.requireOrg(u);
    const r = await this.find(u, id);
    if (!EDITABLE.includes(r.status)) {
      throw new ConflictException({ code: 'NOT_EDITABLE', message: 'Ce rapport est en cours de traitement et ne peut plus être modifié.' });
    }
    return r;
  }
  private checkPeriod(s?: Date | null, e?: Date | null) {
    if (s && e && e.getTime() < s.getTime()) {
      throw new UnprocessableEntityException({ code: 'INVALID_DATES', message: 'La fin de la période ne peut pas précéder son début.' });
    }
  }

  async list(u: AuthenticatedUser, q: ListReportsQueryDto) {
    const where: Prisma.ReportWhereInput = {
      AND: [
        this.scope(u), q.status ? { status: q.status } : {}, q.type ? { type: q.type } : {},
        q.organizationId && !u.organizationId ? { organizationId: q.organizationId } : {},
        q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { organization: { name: { contains: q.q, mode: 'insensitive' } } }] } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.report.count({ where }),
      this.prisma.report.findMany({ where, include, orderBy: { submittedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }

  async get(u: AuthenticatedUser, id: string) { return this.view(await this.find(u, id)); }

  async create(u: AuthenticatedUser, dto: CreateReportDto) {
    const organizationId = this.requireOrg(u);
    this.checkPeriod(dto.periodStart, dto.periodEnd);
    const { certifyAuthority: _c, ...data } = dto;
    const r = await this.prisma.report.create({
      data: { ...data, organizationId, authorId: u.id, certifiedAuthorityAt: new Date() }, include,
    });
    await this.audit.log({ action: 'report.submitted', actorId: u.id, actorLabel: u.email, entityType: 'Report', entityId: r.id, metadata: { organizationId } });
    return this.view(r);
  }

  /** Corriger un rapport « correction demandée » le renvoie automatiquement à la CAPH-CI. */
  async update(u: AuthenticatedUser, id: string, dto: UpdateReportDto) {
    const cur = await this.findEditable(u, id);
    this.checkPeriod(dto.periodStart ?? cur.periodStart, dto.periodEnd ?? cur.periodEnd);
    const r = await this.prisma.report.update({
      where: { id }, data: { ...dto, ...(cur.status === 'CORRECTION_REQUESTED' ? { status: 'RECEIVED', submittedAt: new Date() } : {}) }, include,
    });
    await this.audit.log({ action: 'report.updated', actorId: u.id, actorLabel: u.email, entityType: 'Report', entityId: id });
    return this.view(r);
  }

  async addAttachment(u: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    const cur = await this.findEditable(u, id);
    if (cur.attachments.length >= MAX_ATTACHMENTS) {
      throw new UnprocessableEntityException({ code: 'TOO_MANY_FILES', message: `${MAX_ATTACHMENTS} pièces jointes au maximum par rapport.` });
    }
    const asset = await this.files.create(file, u.id);
    await this.prisma.reportAttachment.create({ data: { reportId: id, fileId: asset.id } });
    await this.audit.log({ action: 'report.attachment_added', actorId: u.id, actorLabel: u.email, entityType: 'Report', entityId: id });
    return this.view(await this.find(u, id));
  }

  async removeAttachment(u: AuthenticatedUser, id: string, attId: string) {
    const cur = await this.findEditable(u, id);
    if (!cur.attachments.some((a) => a.id === attId)) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Pièce jointe introuvable.' });
    await this.prisma.reportAttachment.delete({ where: { id: attId } });
    await this.audit.log({ action: 'report.attachment_removed', actorId: u.id, actorLabel: u.email, entityType: 'Report', entityId: id });
    return this.view(await this.find(u, id));
  }

  async download(u: AuthenticatedUser, id: string, attId: string) {
    const r = await this.find(u, id);
    const a = r.attachments.find((x) => x.id === attId);
    if (!a) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Pièce jointe introuvable.' });
    if (!u.organizationId) {
      await this.audit.log({ action: 'report.attachment_downloaded', actorId: u.id, actorLabel: u.email, entityType: 'Report', entityId: id, metadata: { attachmentId: attId } });
    }
    return this.files.read(a.file);
  }

  async review(u: AuthenticatedUser, id: string, dto: ReviewReportDto) {
    if (u.organizationId) throw new ForbiddenException({ code: 'FORBIDDEN', message: "Vous n'avez pas l'autorisation d'effectuer cette action." });
    const cur = await this.find(u, id);
    const allowed: Record<ReportStatus, ReportStatus[]> = {
      RECEIVED: ['IN_PROCESS', 'PROCESSED', 'CORRECTION_REQUESTED'], IN_PROCESS: ['PROCESSED', 'CORRECTION_REQUESTED'],
      PROCESSED: [], CORRECTION_REQUESTED: [],
    };
    if (!allowed[cur.status].includes(dto.status)) {
      throw new ConflictException({ code: 'INVALID_STATUS', message: `Un rapport « ${STATUS_LABELS[cur.status].toLowerCase()} » ne peut pas passer à « ${STATUS_LABELS[dto.status].toLowerCase()} ».` });
    }
    if (dto.status === 'CORRECTION_REQUESTED' && !dto.note) {
      throw new UnprocessableEntityException({ code: 'NOTE_REQUIRED', message: 'Indiquez ce que l’organisation doit corriger.' });
    }
    const res = await this.prisma.report.updateMany({
      where: { id, status: cur.status },
      data: { status: dto.status, reviewerNote: dto.note ?? null, reviewedById: u.id, ...(dto.status === 'PROCESSED' ? { processedAt: new Date() } : {}) },
    });
    if (res.count !== 1) throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut a changé entre-temps. Actualisez la page.' });
    if (dto.status !== 'IN_PROCESS') {
      void this.mail.send({
        to: cur.author.email,
        subject: `CAPH-CI — Votre rapport « ${cur.title} » : ${STATUS_LABELS[dto.status].toLowerCase()}`,
        text: `Bonjour ${cur.author.firstName},\n\nVotre rapport « ${cur.title} » est désormais : ${STATUS_LABELS[dto.status]}.${dto.note ? `\n\nMessage de la CAPH-CI :\n${dto.note}` : ''}\n\nConnectez-vous à l'espace membre pour le consulter.`,
      });
    }
    await this.audit.log({ action: 'report.reviewed', actorId: u.id, actorLabel: u.email, entityType: 'Report', entityId: id, metadata: { from: cur.status, to: dto.status } });
    return this.view(await this.find(u, id));
  }
}
