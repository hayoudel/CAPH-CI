import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma, ProjectStatus } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { FileAssetService } from '../storage/file-asset.service';
import { CreateProjectDto, ListProjectsQueryDto, ProgressDto, ReviewProjectDto, UpdateProjectDto } from './dto/project.dto';

const NOT_FOUND = { code: 'PROJECT_NOT_FOUND', message: 'Projet introuvable.' };
const MAX_ATTACHMENTS = 5;
const IMAGE_TYPES = ['image/jpeg', 'image/png'];
const EDITABLE: ProjectStatus[] = ['DRAFT', 'TO_COMPLETE'];
/** Statuts visibles par toutes les organisations (le reste n'est visible que par l'organisation porteuse et le personnel). */
const SHARED: ProjectStatus[] = ['VALIDATED', 'ONGOING', 'COMPLETED'];
const PENDING: ProjectStatus[] = ['SUBMITTED', 'IN_REVIEW', 'TO_COMPLETE'];
const LABELS: Record<ProjectStatus, string> = {
  DRAFT: 'Brouillon', SUBMITTED: 'Soumis', IN_REVIEW: 'En cours de validation', TO_COMPLETE: 'À compléter',
  VALIDATED: 'Validé', REJECTED: 'Refusé', ONGOING: 'En cours', COMPLETED: 'Terminé',
};
const ALLOWED: Record<ProjectStatus, ProjectStatus[]> = {
  DRAFT: [], SUBMITTED: ['IN_REVIEW', 'TO_COMPLETE', 'VALIDATED', 'REJECTED'], IN_REVIEW: ['TO_COMPLETE', 'VALIDATED', 'REJECTED'],
  TO_COMPLETE: [], VALIDATED: ['ONGOING'], ONGOING: ['COMPLETED'], REJECTED: [], COMPLETED: [],
};
const include = {
  organization: { select: { id: true, name: true } },
  author: { select: { firstName: true, lastName: true, email: true } },
  attachments: { include: { file: true }, orderBy: { createdAt: 'asc' } },
  cover: { select: { id: true, mimeType: true, originalName: true, storageKey: true, encrypted: true } },
  history: { orderBy: { createdAt: 'asc' } },
} satisfies Prisma.ProjectInclude;
type Row = Prisma.ProjectGetPayload<{ include: typeof include }>;
const reference = (p: { id: string; createdAt: Date }) => `PRJ-${p.createdAt.getFullYear()}-${p.id.slice(0, 6).toUpperCase()}`;
const day = (d?: string) => (d ? new Date(d) : undefined);

/** Les OPH (Président / Suppléant) proposent des projets ; le personnel CAPH-CI les valide puis suit leur avancement. */
@Injectable()
export class ProjectsService {
  constructor(
    private readonly prisma: PrismaService, private readonly files: FileAssetService,
    private readonly audit: AuditService, private readonly mail: MailService,
  ) {}

  /** `mine` : l'appelant est de l'organisation porteuse → il voit tout ; sinon seulement l'essentiel d'un projet partagé. */
  private view(p: Row, mine: boolean, staff = false) {
    const full = mine || staff;
    return {
      id: p.id, reference: reference(p), organization: p.organization, title: p.title, description: p.description,
      zone: p.zone, startDate: p.startDate, endDate: p.endDate, objectives: p.objectives, beneficiaries: p.beneficiaries,
      context: p.context, expectedResults: p.expectedResults, partners: p.partners,
      budgetXof: full ? p.budgetXof : null, hasCover: !!p.coverFileId,
      status: p.status, statusLabel: LABELS[p.status], progress: p.progress, results: p.results,
      isDemo: p.isDemo, isMine: mine, canEdit: mine && EDITABLE.includes(p.status),
      reviewerNote: full ? p.reviewerNote : null, createdAt: p.createdAt, submittedAt: full ? p.submittedAt : null, reviewedAt: full ? p.reviewedAt : null, updatedAt: p.updatedAt,
      history: full ? p.history.map((h) => ({ id: h.id, status: h.toStatus, statusLabel: LABELS[h.toStatus], note: h.note, date: h.createdAt })) : [],
      author: full ? `${p.author.firstName} ${p.author.lastName}` : null,
      attachments: full ? p.attachments.map((a) => ({ id: a.id, originalName: a.file.originalName, mimeType: a.file.mimeType, sizeBytes: a.file.sizeBytes })) : [],
    };
  }

  private orgId(u: AuthenticatedUser) {
    if (!u.organizationId) throw new ForbiddenException({ code: 'NO_ORGANIZATION', message: 'Réservé aux membres d’une organisation.' });
    return u.organizationId;
  }
  /** Projet visible par l'appelant : le sien (tout statut) ou un projet partagé d'une autre organisation. */
  private async findVisible(u: AuthenticatedUser, id: string) {
    const org = this.orgId(u);
    const p = await this.prisma.project.findFirst({ where: { id, OR: [{ organizationId: org }, { status: { in: SHARED } }] }, include });
    if (!p) throw new NotFoundException(NOT_FOUND);
    return p;
  }
  private async findOwn(u: AuthenticatedUser, id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, organizationId: this.orgId(u) }, include });
    if (!p) throw new NotFoundException(NOT_FOUND);
    return p;
  }
  private async findOwnEditable(u: AuthenticatedUser, id: string) {
    const p = await this.findOwn(u, id);
    if (!EDITABLE.includes(p.status)) {
      throw new ConflictException({ code: 'NOT_EDITABLE', message: 'Ce projet a été soumis et ne peut plus être modifié.' });
    }
    return p;
  }

  async list(u: AuthenticatedUser, q: ListProjectsQueryDto) {
    const org = this.orgId(u);
    const filter = q.filter ?? 'ALL';
    // Tous : les projets de mon organisation (brouillons compris) + les projets partagés par les autres.
    const byFilter: Record<string, Prisma.ProjectWhereInput> = {
      ALL: { OR: [{ organizationId: org }, { status: { in: SHARED } }] },
      ONGOING: { status: 'ONGOING' },
      COMPLETED: { status: 'COMPLETED' },
      PENDING: { organizationId: org, status: { in: PENDING } },
      MINE: { organizationId: org },
    };
    const where: Prisma.ProjectWhereInput = {
      AND: [byFilter[filter], q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { zone: { contains: q.q, mode: 'insensitive' } }, { organization: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}],
    };
    const [total, rows] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({ where, include, orderBy: { updatedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r, r.organizationId === org)), total, q);
  }
  async get(u: AuthenticatedUser, id: string) {
    const p = await this.findVisible(u, id);
    return this.view(p, p.organizationId === u.organizationId);
  }

  private assertComplete(p: { title: string; description: string; objectives?: string | null; zone?: string | null; startDate?: Date | null }) {
    const missing: string[] = [];
    if (p.title.trim().length < 5) missing.push('le nom du projet');
    if (p.description.trim().length < 20) missing.push('la description détaillée (20 caractères minimum)');
    if (!p.objectives?.trim()) missing.push('les objectifs');
    if (!p.zone?.trim()) missing.push('la zone d’intervention');
    if (!p.startDate) missing.push('la date de début');
    if (missing.length) throw new UnprocessableEntityException({ code: 'INCOMPLETE_PROJECT', message: `Pour soumettre, renseignez : ${missing.join(', ')}.` });
  }
  private assertDates(start?: Date | null, end?: Date | null) {
    if (start && end && end < start) throw new UnprocessableEntityException({ code: 'INVALID_DATES', message: 'La date de fin doit être postérieure à la date de début.' });
  }
  private async record(id: string, from: ProjectStatus | null, to: ProjectStatus, actorId: string, note?: string | null) {
    await this.prisma.projectStatusHistory.create({ data: { projectId: id, fromStatus: from, toStatus: to, note: note ?? null, actorId } });
  }
  private data(dto: UpdateProjectDto) {
    const { startDate, endDate, ...rest } = dto;
    return { ...rest, ...(startDate ? { startDate: day(startDate) } : {}), ...(endDate ? { endDate: day(endDate) } : {}) };
  }

  async create(u: AuthenticatedUser, dto: CreateProjectDto) {
    const { submit = true, ...fields } = dto;
    this.assertDates(day(dto.startDate), day(dto.endDate));
    if (submit) this.assertComplete({ title: dto.title, description: dto.description ?? '', objectives: dto.objectives, zone: dto.zone, startDate: day(dto.startDate) });
    const status: ProjectStatus = submit ? 'SUBMITTED' : 'DRAFT';
    const p = await this.prisma.project.create({
      data: { ...this.data(fields), title: dto.title, description: dto.description ?? '', status, submittedAt: submit ? new Date() : null, organizationId: this.orgId(u), authorId: u.id },
    });
    await this.record(p.id, null, status, u.id);
    await this.audit.log({ action: submit ? 'project.proposed' : 'project.drafted', actorId: u.id, actorLabel: u.email, entityType: 'Project', entityId: p.id });
    return this.view(await this.findOwn(u, p.id), true);
  }

  /** Un brouillon reste un brouillon ; un projet « à compléter » est renvoyé avec « Soumettre ». */
  async update(u: AuthenticatedUser, id: string, dto: UpdateProjectDto) {
    const cur = await this.findOwnEditable(u, id);
    this.assertDates(day(dto.startDate) ?? cur.startDate, day(dto.endDate) ?? cur.endDate);
    if (cur.status !== 'DRAFT') {
      this.assertComplete({ title: dto.title ?? cur.title, description: dto.description ?? cur.description, objectives: dto.objectives ?? cur.objectives, zone: dto.zone ?? cur.zone, startDate: day(dto.startDate) ?? cur.startDate });
    }
    await this.prisma.project.update({ where: { id }, data: this.data(dto) });
    await this.audit.log({ action: 'project.updated', actorId: u.id, actorLabel: u.email, entityType: 'Project', entityId: id });
    return this.view(await this.findOwn(u, id), true);
  }

  async submit(u: AuthenticatedUser, id: string) {
    const cur = await this.findOwn(u, id);
    if (!EDITABLE.includes(cur.status)) throw new ConflictException({ code: 'INVALID_STATUS', message: 'Seul un brouillon ou un projet à compléter peut être soumis.' });
    this.assertComplete(cur);
    const res = await this.prisma.project.updateMany({ where: { id, status: cur.status }, data: { status: 'SUBMITTED', submittedAt: new Date() } });
    if (res.count !== 1) throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut a changé entre-temps. Actualisez la page.' });
    await this.record(id, cur.status, 'SUBMITTED', u.id);
    await this.audit.log({ action: 'project.proposed', actorId: u.id, actorLabel: u.email, entityType: 'Project', entityId: id });
    return this.view(await this.findOwn(u, id), true);
  }

  async removeDraft(u: AuthenticatedUser, id: string) {
    const cur = await this.findOwn(u, id);
    if (cur.status !== 'DRAFT') throw new ConflictException({ code: 'NOT_A_DRAFT', message: 'Seul un brouillon peut être supprimé.' });
    await this.prisma.project.delete({ where: { id } });
    for (const a of cur.attachments) await this.files.discard(a.file.id);
    if (cur.coverFileId) await this.files.discard(cur.coverFileId);
    await this.audit.log({ action: 'project.draft_deleted', actorId: u.id, actorLabel: u.email, entityType: 'Project', entityId: id });
  }

  // ───── Fichiers ─────
  async setCover(u: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    const cur = await this.findOwnEditable(u, id);
    const asset = await this.files.create(file, u.id);
    if (!IMAGE_TYPES.includes(asset.mimeType)) {
      await this.files.discard(asset.id);
      throw new UnprocessableEntityException({ code: 'INVALID_FILE_TYPE', message: 'L’image de couverture doit être un fichier JPG ou PNG.' });
    }
    await this.prisma.project.update({ where: { id }, data: { coverFileId: asset.id } });
    if (cur.coverFileId) await this.files.discard(cur.coverFileId);
    return this.view(await this.findOwn(u, id), true);
  }
  async removeCover(u: AuthenticatedUser, id: string) {
    const cur = await this.findOwnEditable(u, id);
    if (cur.coverFileId) {
      await this.prisma.project.update({ where: { id }, data: { coverFileId: null } });
      await this.files.discard(cur.coverFileId);
    }
    return this.view(await this.findOwn(u, id), true);
  }
  private async readCover(p: Row) {
    if (!p.cover) throw new NotFoundException({ code: 'COVER_NOT_FOUND', message: 'Pas d’image de couverture.' });
    return this.files.read(p.cover);
  }
  async cover(u: AuthenticatedUser, id: string) { return this.readCover(await this.findVisible(u, id)); }
  async coverAny(id: string) { return this.readCover(await this.findAny(id)); }

  async addAttachment(u: AuthenticatedUser, id: string, file: Express.Multer.File | undefined) {
    const cur = await this.findOwnEditable(u, id);
    if (cur.attachments.length >= MAX_ATTACHMENTS) {
      throw new UnprocessableEntityException({ code: 'TOO_MANY_FILES', message: `${MAX_ATTACHMENTS} documents au maximum.` });
    }
    const asset = await this.files.create(file, u.id);
    await this.prisma.projectAttachment.create({ data: { projectId: id, fileId: asset.id } });
    return this.view(await this.findOwn(u, id), true);
  }
  async removeAttachment(u: AuthenticatedUser, id: string, attId: string) {
    const cur = await this.findOwnEditable(u, id);
    const att = cur.attachments.find((a) => a.id === attId);
    if (!att) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Document introuvable.' });
    await this.prisma.projectAttachment.delete({ where: { id: attId } });
    await this.files.discard(att.file.id);
    return this.view(await this.findOwn(u, id), true);
  }
  async downloadOwn(u: AuthenticatedUser, id: string, attId: string) {
    const a = (await this.findOwn(u, id)).attachments.find((x) => x.id === attId);
    if (!a) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Document introuvable.' });
    return this.files.read(a.file);
  }

  // ───── Côté personnel CAPH-CI (API pour l'équipe backoffice) ─────
  private async findAny(id: string) {
    const p = await this.prisma.project.findFirst({ where: { id, status: { not: 'DRAFT' } }, include });
    if (!p) throw new NotFoundException(NOT_FOUND);
    return p;
  }
  async listAll(q: ListProjectsQueryDto) {
    const where: Prisma.ProjectWhereInput = {
      status: q.status === 'DRAFT' ? { in: [] } : (q.status ?? { not: 'DRAFT' }), ...(q.organizationId ? { organizationId: q.organizationId } : {}),
      ...(q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { organization: { name: { contains: q.q, mode: 'insensitive' } } }] } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.project.count({ where }),
      this.prisma.project.findMany({ where, include, orderBy: { submittedAt: 'desc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows.map((r) => this.view(r, false, true)), total, q);
  }
  async getAny(id: string) { return this.view(await this.findAny(id), false, true); }
  async downloadAny(u: AuthenticatedUser, id: string, attId: string) {
    const a = (await this.findAny(id)).attachments.find((x) => x.id === attId);
    if (!a) throw new NotFoundException({ code: 'ATTACHMENT_NOT_FOUND', message: 'Document introuvable.' });
    await this.audit.log({ action: 'project.attachment_downloaded', actorId: u.id, actorLabel: u.email, entityType: 'Project', entityId: id, metadata: { attachmentId: attId } });
    return this.files.read(a.file);
  }

  async review(u: AuthenticatedUser, id: string, dto: ReviewProjectDto) {
    const cur = await this.findAny(id);
    if (!ALLOWED[cur.status].includes(dto.status)) {
      throw new ConflictException({ code: 'INVALID_STATUS', message: `Un projet « ${LABELS[cur.status].toLowerCase()} » ne peut pas passer à « ${LABELS[dto.status].toLowerCase()} ».` });
    }
    if ((dto.status === 'TO_COMPLETE' || dto.status === 'REJECTED') && !dto.note) {
      throw new UnprocessableEntityException({ code: 'NOTE_REQUIRED', message: 'Indiquez le motif ou les éléments à compléter.' });
    }
    const res = await this.prisma.project.updateMany({
      where: { id, status: cur.status },
      data: {
        status: dto.status, reviewerNote: dto.note ?? null, reviewedById: u.id, reviewedAt: new Date(),
        ...(dto.progress !== undefined && ['VALIDATED', 'ONGOING', 'COMPLETED'].includes(dto.status) ? { progress: dto.progress } : {}),
        ...(dto.results !== undefined ? { results: dto.results } : {}),
      },
    });
    if (res.count !== 1) throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut a changé entre-temps. Actualisez la page.' });
    await this.record(id, cur.status, dto.status, u.id, dto.note);
    void this.mail.send({
      to: cur.author.email,
      subject: `CAPH-CI — Votre projet « ${cur.title} » : ${LABELS[dto.status].toLowerCase()}`,
      text: `Bonjour ${cur.author.firstName},\n\nVotre projet « ${cur.title} » est désormais : ${LABELS[dto.status]}.${dto.note ? `\n\nMessage de la CAPH-CI :\n${dto.note}` : ''}`,
    });
    await this.audit.log({ action: 'project.reviewed', actorId: u.id, actorLabel: u.email, entityType: 'Project', entityId: id, metadata: { from: cur.status, to: dto.status } });
    return this.getAny(id);
  }

  /** Mise à jour de l'avancement et des résultats d'un projet validé, en cours ou terminé (sans changer son statut). */
  async setProgress(u: AuthenticatedUser, id: string, dto: ProgressDto) {
    const cur = await this.findAny(id);
    if (!['VALIDATED', 'ONGOING', 'COMPLETED'].includes(cur.status)) {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'L’avancement ne peut être renseigné que pour un projet validé, en cours ou terminé.' });
    }
    await this.prisma.project.update({ where: { id }, data: { ...(dto.progress !== undefined ? { progress: dto.progress } : {}), ...(dto.results !== undefined ? { results: dto.results } : {}) } });
    await this.audit.log({ action: 'project.progress_updated', actorId: u.id, actorLabel: u.email, entityType: 'Project', entityId: id });
    return this.getAny(id);
  }
}
