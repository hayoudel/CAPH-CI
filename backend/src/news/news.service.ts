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
const EDITABLE: NewsStatus[] = ['DRAFT', 'SUBMITTED', 'CORRECTION'];
const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const LABELS: Record<NewsStatus, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'Soumise', IN_REVIEW: 'En cours de validation', CORRECTION: 'À corriger',
  APPROVED: 'Validée', REJECTED: 'Refusée', PUBLISHED: 'Publiée',
};
const include = {
  organization: { select: { id: true, name: true } },
  category: { select: { id: true, code: true, label: true } },
  author: { select: { firstName: true, lastName: true, email: true } },
  attachments: { include: { file: true }, orderBy: { createdAt: 'asc' } },
  cover: { select: { id: true, mimeType: true, originalName: true, storageKey: true, encrypted: true } },
  history: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.NewsProposalInclude;
type Row = Prisma.NewsProposalGetPayload<{ include: typeof include }>;
/** Référence du dossier, déduite de l'identifiant : ACT-2026-A1B2C3. */
const reference = (n: { id: string; createdAt: Date }) => `ACT-${n.createdAt.getFullYear()}-${n.id.slice(0, 6).toUpperCase()}`;

/** Les organisations proposent des actualités ; l'équipe communication les valide puis les publie. */
@Injectable()
export class NewsService {
  constructor(
    private readonly prisma: PrismaService, private readonly files: FileAssetService,
    private readonly audit: AuditService, private readonly mail: MailService,
  ) {}

  private view(n: Row) {
    return {
      id: n.id, reference: reference(n), organization: n.organization, category: n.category, title: n.title, summary: n.summary, description: n.description,
      newsDate: n.newsDate, hasCover: !!n.coverFileId,
      status: n.status, statusLabel: LABELS[n.status], reviewerNote: n.reviewerNote, createdAt: n.createdAt, submittedAt: n.submittedAt, reviewedAt: n.reviewedAt, updatedAt: n.updatedAt,
      history: n.history.map((h) => ({ id: h.id, status: h.toStatus, statusLabel: LABELS[h.toStatus], note: h.note, date: h.createdAt })),
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
      this.prisma.newsProposal.findMany({ where, include, orderBy: { updatedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }
  async getOwn(u: AuthenticatedUser, id: string) { return this.view(await this.findOwn(u, id)); }

  /** Une proposition doit être complète pour être soumise ; un brouillon peut être partiel. */
  private assertComplete(n: { title: string; description: string }) {
    if (n.title.trim().length < 5 || n.description.trim().length < 20) {
      throw new UnprocessableEntityException({ code: 'INCOMPLETE_NEWS', message: 'Pour soumettre, le titre (5 caractères minimum) et le contenu complet (20 caractères minimum) sont obligatoires.' });
    }
  }
  private async record(id: string, from: NewsStatus | null, to: NewsStatus, actorId: string, note?: string | null) {
    await this.prisma.newsStatusHistory.create({ data: { proposalId: id, fromStatus: from, toStatus: to, note: note ?? null, actorId } });
  }
  private data(dto: { categoryId?: string; summary?: string; description?: string; newsDate?: string; title?: string }) {
    const { newsDate, ...rest } = dto;
    return { ...rest, ...(newsDate ? { newsDate: new Date(newsDate) } : {}) };
  }

  /** `submit` (vrai par défaut) soumet à la validation ; faux enregistre un brouillon. */
  async create(u: AuthenticatedUser, dto: CreateNewsDto) {
    const { submit = true, ...fields } = dto;
    await this.checkCategory(dto.categoryId);
    if (submit) this.assertComplete({ title: dto.title, description: dto.description ?? '' });
    const status: NewsStatus = submit ? 'SUBMITTED' : 'DRAFT';
    const n = await this.prisma.newsProposal.create({
      data: { ...this.data(fields), title: dto.title, description: dto.description ?? '', status, submittedAt: submit ? new Date() : null, organizationId: this.orgId(u), authorId: u.id },
      include,
    });
    await this.record(n.id, null, status, u.id);
    await this.audit.log({ action: submit ? 'news.proposed' : 'news.drafted', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: n.id });
    return this.view(await this.findOwn(u, n.id));
  }

  /** Corriger une proposition « à corriger » la soumet de nouveau. Un brouillon reste un brouillon. */
  async update(u: AuthenticatedUser, id: string, dto: UpdateNewsDto) {
    const cur = await this.findOwnEditable(u, id);
    await this.checkCategory(dto.categoryId);
    const resubmit = cur.status === 'CORRECTION';
    if (cur.status !== 'DRAFT') {
      this.assertComplete({ title: dto.title ?? cur.title, description: dto.description ?? cur.description });
    }
    await this.prisma.newsProposal.update({
      where: { id }, data: { ...this.data(dto), ...(resubmit ? { status: 'SUBMITTED', submittedAt: new Date() } : {}) },
    });
    if (resubmit) await this.record(id, 'CORRECTION', 'SUBMITTED', u.id);
    await this.audit.log({ action: 'news.updated', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: id });
    return this.view(await this.findOwn(u, id));
  }

  /** Brouillon ou proposition à corriger → soumise à la validation. */
  async submit(u: AuthenticatedUser, id: string) {
    const cur = await this.findOwn(u, id);
    if (cur.status !== 'DRAFT' && cur.status !== 'CORRECTION') {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'Seul un brouillon ou une proposition à corriger peut être soumis.' });
    }
    this.assertComplete(cur);
    const res = await this.prisma.newsProposal.updateMany({ where: { id, status: cur.status }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    if (res.count !== 1) throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut a changé entre-temps. Actualisez la page.' });
    await this.record(id, cur.status, 'SUBMITTED', u.id);
    await this.audit.log({ action: 'news.proposed', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: id });
    return this.view(await this.findOwn(u, id));
  }

  /** Seul un brouillon peut être supprimé. */
  async removeDraft(u: AuthenticatedUser, id: string) {
    const cur = await this.findOwn(u, id);
    if (cur.status !== 'DRAFT') throw new ConflictException({ code: 'NOT_A_DRAFT', message: 'Seul un brouillon peut être supprimé.' });
    await this.prisma.newsProposal.delete({ where: { id } });
    for (const a of cur.attachments) await this.files.discard(a.file.id);
    if (cur.coverFileId) await this.files.discard(cur.coverFileId);
    await this.audit.log({ action: 'news.draft_deleted', actorId: u.id, actorLabel: u.email, entityType: 'NewsProposal', entityId: id });
  }

  async setCover(u: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    const cur = await this.findOwnEditable(u, id);
    const asset = await this.files.create(file, u.id);
    if (!IMAGE_TYPES.includes(asset.mimeType)) {
      await this.files.discard(asset.id);
      throw new UnprocessableEntityException({ code: 'INVALID_FILE_TYPE', message: 'L’image de couverture doit être un fichier JPG ou PNG.' });
    }
    await this.prisma.newsProposal.update({ where: { id }, data: { coverFileId: asset.id } });
    if (cur.coverFileId) await this.files.discard(cur.coverFileId);
    return this.view(await this.findOwn(u, id));
  }
  async removeCover(u: AuthenticatedUser, id: string) {
    const cur = await this.findOwnEditable(u, id);
    if (cur.coverFileId) {
      await this.prisma.newsProposal.update({ where: { id }, data: { coverFileId: null } });
      await this.files.discard(cur.coverFileId);
    }
    return this.view(await this.findOwn(u, id));
  }
  private async readCover(n: Row) {
    if (!n.cover) throw new NotFoundException({ code: 'COVER_NOT_FOUND', message: 'Pas d’image de couverture.' });
    return this.files.read(n.cover);
  }
  async coverOwn(u: AuthenticatedUser, id: string) { return this.readCover(await this.findOwn(u, id)); }
  async coverAny(id: string) { return this.readCover(await this.findAny(id)); }
  async coverPublic(id: string) {
    const n = await this.prisma.newsProposal.findFirst({ where: { id, status: 'PUBLISHED' }, include });
    if (!n) throw new NotFoundException(NOT_FOUND);
    return this.readCover(n);
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
    const att = cur.attachments.find((a) => a.id === attId);
    if (!att) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Pièce jointe introuvable.' });
    await this.prisma.newsAttachment.delete({ where: { id: attId } });
    await this.files.discard(att.file.id);
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
      status: q.status === 'DRAFT' ? { in: [] } : (q.status ?? { not: 'DRAFT' }), ...(q.organizationId ? { organizationId: q.organizationId } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { organization: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.newsProposal.count({ where }),
      this.prisma.newsProposal.findMany({ where, include, orderBy: { submittedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r)), total, q);
  }
  private async findAny(id: string) {
    const n = await this.prisma.newsProposal.findFirst({ where: { id, status: { not: 'DRAFT' } }, include }); // le personnel ne voit pas les brouillons
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
      DRAFT: [], SUBMITTED: ['IN_REVIEW', 'CORRECTION', 'APPROVED', 'REJECTED'], IN_REVIEW: ['CORRECTION', 'APPROVED', 'REJECTED'],
      APPROVED: ['PUBLISHED'], CORRECTION: [], REJECTED: [], PUBLISHED: [],
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
    await this.record(id, cur.status, dto.status, u.id, dto.note);
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
        select: { id: true, title: true, summary: true, description: true, newsDate: true, coverFileId: true, reviewedAt: true, category: { select: { code: true, label: true } }, organization: { select: { name: true } } },
      }),
    ]);
    return paginated(rows.map((r) => ({ id: r.id, title: r.title, summary: r.summary, description: r.description, newsDate: r.newsDate, hasCover: !!r.coverFileId, publishedAt: r.reviewedAt, category: r.category, organization: r.organization.name })), total, q);
  }
}
