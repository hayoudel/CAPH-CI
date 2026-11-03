import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { NewsStatus, Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileAssetService } from '../storage/file-asset.service';
import { CreateNewsDto, ListNewsQueryDto, ReviewNewsDto, UpdateNewsDto } from './dto/news.dto';

const NOT_FOUND = { code: 'NEWS_NOT_FOUND', message: 'Proposition d’actualité introuvable.' };
const MAX_ATTACHMENTS = 5;
const EDITABLE: NewsStatus[] = ['SUBMITTED', 'CORRECTION'];
const LABELS: Record<NewsStatus, string> = {
  SUBMITTED: 'Soumise', CORRECTION: 'Correction demandée', APPROVED: 'Approuvée', REJECTED: 'Refusée', PUBLISHED: 'Publiée',
};
const include = {
  organization: { select: { id: true, name: true } },
  category: { select: { id: true, code: true, label: true } },
  author: { select: { firstName: true, lastName: true, email: true } },
  attachments: { include: { file: true }, orderBy: { createdAt: 'asc' } },
} satisfies Prisma.NewsProposalInclude;
type Row = Prisma.NewsProposalGetPayload<{ include: typeof include }>;

/** Les organisations proposent des actualités ; l'équipe communication les valide puis les publie. */
@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService, private readonly files: FileAssetService,
    private readonly audit: AuditService, private readonly mail: MailService,
  ) {}

  private view(n: Row) {
    return {
      id: n.id, organization: n.organization, category: n.category, title: n.title, description: n.description,
      status: n.status, statusLabel: LABELS[n.status], reviewerNote: n.reviewerNote, submittedAt: n.submittedAt, reviewedAt: n.reviewedAt,
      author: `${n.author.firstName} ${n.author.lastName}`, canEdit: EDITABLE.includes(n.status),
      attachments: n.attachments.map((a) => ({ id: a.id, originalName: a.file.originalName, mimeType: a.file.mimeType, sizeBytes: a.file.sizeBytes })),
    };
  }

  categories() { return this.prisma.newsCategory.findMany({ orderBy: { sortOrder: 'asc' }, select: { id: true, code: true, label: true } }); }

  private async checkCategory(id?: string) {
    if (id && !(await this.prisma.newsCategory.findUnique({ where: { id } }))) {
      throw new UnprocessableEntityException({ code: 'INVALID_REFERENCE', message: 'Catégorie inconnue.' });
    }
  }

  // ───────────── Côté organisation ─────────────

  private orgId(u: AuthenticatedUser) {
    if (!u.organizationId) throw new ForbiddenException({ code: 'NO_ORGANIZATION', message: 'Réservé aux membres d’une organisation.' });
    return u.organizationId;
  }
  private async findOwn(u: AuthenticatedUser, id: string) {
    const n = await this.prisma.newsProposal.findFirst({ where: { id, organizationId: this.orgId(u) }, include });
    if (!n) throw new NotFoundException(NOT_FOUND);
    return n;
  }
  private async findOwnEditable(u: AuthenticatedUser, id: string) {
    const n = await this.findOwn(u, id);
    if (!EDITABLE.includes(n.status)) {
      throw new ConflictException({ code: 'NOT_EDITABLE', message: 'Cette proposition a été traitée et ne peut plus être modifiée.' });
    }
    return n;
  }

  async listOwn(u: AuthenticatedUser, q: ListNewsQueryDto) {
    const where: Prisma.NewsProposalWhereInput = {
      organizationId: this.orgId(u), ...(q.status ? { status: q.status } : {}),
      ...(q.q ? { title: { contains: q.q, mode: 'insensitive' } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.newsProposal.count({ where }),
      this.prisma.newsProposal.findMany({ where, include, orderBy: { submittedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }
  async getOwn(u: AuthenticatedUser, id: string) { return this.view(await this.findOwn(u, id)); }

  async create(u: AuthenticatedUser, dto: CreateNewsDto) {
    await this.checkCategory(dto.categoryId);
    const n = await this.prisma.newsProposal.create({ data: { ...dto, organizationId: this.orgId(u), authorId: u.id }, include });
    await this.audit.log({ action: 'news.proposed', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: n.id });
    return this.view(n);
  }

  /** Corriger une proposition « correction demandée » la soumet de nouveau. */
  async update(u: AuthenticatedUser, id: string, dto: UpdateNewsDto) {
    const cur = await this.findOwnEditable(u, id);
    await this.checkCategory(dto.categoryId);
    const n = await this.prisma.newsProposal.update({
      where: { id }, data: { ...dto, ...(cur.status === 'CORRECTION' ? { status: 'SUBMITTED', submittedAt: new Date() } : {}) }, include,
    });
    await this.audit.log({ action: 'news.updated', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: id });
    return this.view(n);
  }

  async addAttachment(u: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    const cur = await this.findOwnEditable(u, id);
    if (cur.attachments.length >= MAX_ATTACHMENTS) {
      throw new UnprocessableEntityException({ code: 'TOO_MANY_FILES', message: `${MAX_ATTACHMENTS} pièces jointes au maximum.` });
    }
    const asset = await this.files.create(file, u.id);
    await this.prisma.newsAttachment.create({ data: { proposalId: id, fileId: asset.id } });
    return this.view(await this.findOwn(u, id));
  }

  async removeAttachment(u: AuthenticatedUser, id: string, attId: string) {
    const cur = await this.findOwnEditable(u, id);
    if (!cur.attachments.some((a) => a.id === attId)) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Pièce jointe introuvable.' });
    await this.prisma.newsAttachment.delete({ where: { id: attId } });
    return this.view(await this.findOwn(u, id));
  }

  async downloadOwn(u: AuthenticatedUser, id: string, attId: string) {
    const a = (await this.findOwn(u, id)).attachments.find((x) => x.id === attId);
    if (!a) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Pièce jointe introuvable.' });
    return this.files.read(a.file);
  }

  // ───────────── Côté équipe CAPH-CI ─────────────

  async listAll(q: ListNewsQueryDto) {
    const where: Prisma.NewsProposalWhereInput = {
      ...(q.status ? { status: q.status } : {}), ...(q.organizationId ? { organizationId: q.organizationId } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { organization: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.newsProposal.count({ where }),
      this.prisma.newsProposal.findMany({ where, include, orderBy: { submittedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }
  private async findAny(id: string) {
    const n = await this.prisma.newsProposal.findUnique({ where: { id }, include });
    if (!n) throw new NotFoundException(NOT_FOUND);
    return n;
  }
  async getAny(id: string) { return this.view(await this.findAny(id)); }

  async downloadAny(u: AuthenticatedUser, id: string, attId: string) {
    const a = (await this.findAny(id)).attachments.find((x) => x.id === attId);
    if (!a) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Pièce jointe introuvable.' });
    await this.audit.log({ action: 'news.attachment_downloaded', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: id, metadata: { attachmentId: attId } });
    return this.files.read(a.file);
  }

  async review(u: AuthenticatedUser, id: string, dto: ReviewNewsDto) {
    const cur = await this.findAny(id);
    const allowed: Record<NewsStatus, NewsStatus[]> = {
      SUBMITTED: ['CORRECTION', 'APPROVED', 'REJECTED'], APPROVED: ['PUBLISHED'], CORRECTION: [], REJECTED: [], PUBLISHED: [],
    };
    if (!allowed[cur.status].includes(dto.status)) {
      throw new ConflictException({ code: 'INVALID_STATUS', message: `Une proposition « ${LABELS[cur.status].toLowerCase()} » ne peut pas passer à « ${LABELS[dto.status].toLowerCase()} ».` });
    }
    if ((dto.status === 'CORRECTION' || dto.status === 'REJECTED') && !dto.note) {
      throw new UnprocessableEntityException({ code: 'NOTE_REQUIRED', message: 'Indiquez le motif ou les corrections demandées.' });
    }
    const res = await this.prisma.newsProposal.updateMany({
      where: { id, status: cur.status },
      data: { status: dto.status, reviewerNote: dto.note ?? null, reviewedById: u.id, reviewedAt: new Date() },
    });
    if (res.count !== 1) throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut a changé entre-temps. Actualisez la page.' });
    void this.mail.send({
      to: cur.author.email,
      subject: `CAPH-CI — Votre actualité « ${cur.title} » : ${LABELS[dto.status].toLowerCase()}`,
      text: `Bonjour ${cur.author.firstName},\n\nVotre proposition d'actualité « ${cur.title} » est désormais : ${LABELS[dto.status]}.${dto.note ? `\n\nMessage de la CAPH-CI :\n${dto.note}` : ''}`,
    });
    await this.audit.log({ action: 'news.reviewed', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: id, metadata: { from: cur.status, to: dto.status } });
    return this.view(await this.findAny(id));
  }

  // ───────────── Site public ─────────────

  async listPublic(q: ListNewsQueryDto) {
    const where: Prisma.NewsProposalWhereInput = { status: 'PUBLISHED' };
    const [total, rows] = await Promise.all([
      this.prisma.newsProposal.count({ where }),
      this.prisma.newsProposal.findMany({
        where, orderBy: { reviewedAt: 'desc' }, ...pageArgs(q),
        select: { id: true, title: true, description: true, reviewedAt: true, category: { select: { code: true, label: true } }, organization: { select: { name: true } } },
      }),
    ]);
    return paginated(rows.map((r) => ({ id: r.id, title: r.title, description: r.description, publishedAt: r.reviewedAt, category: r.category, organization: r.organization.name })), total, q);
  }
}
