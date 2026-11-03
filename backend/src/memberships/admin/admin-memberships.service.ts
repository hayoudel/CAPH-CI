import {
  BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MembershipStatus, Prisma } from '@prisma/client';
import { AuditService } from '../../audit/audit.service';
import { AuthService } from '../../auth/auth.service';
import { AuthenticatedUser } from '../../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../../common/dto/pagination.dto';
import { MailService } from '../../mail/mail.service';
import { PrismaService } from '../../prisma/prisma.service';
import { StorageService } from '../../storage/storage.service';
import { FEES_BY_CATEGORY, STATUS_LABELS } from '../membership.content';
import { RequestMeta } from '../memberships.service';
import {
  AssignDelegationDto, DecisionDto, ListMembershipsQueryDto, RecordPaymentDto, RegisterDto, RequestInfoDto, ReviewDocumentDto,
} from './dto/admin-memberships.dto';

const NOT_FOUND = { code: 'REQUEST_NOT_FOUND', message: 'Dossier introuvable.' };
/** Un dossier « reçu » ou « en examen » depuis plus longtemps est signalé comme en retard. */
const SLA_DAYS = 15;
/** Compteur des numéros de membre : stocké dans reference_counters avec la clé 0 (les années réelles sont > 2000). */
const MEMBER_COUNTER_KEY = 0;

interface DocSpec { type: string; label: string; requirement: string }
const ACTION_LABELS: Record<string, string> = {
  SUBMIT: 'Dossier déposé', RESUBMIT: 'Compléments transmis', WITHDRAW: 'Dossier retiré', START_REVIEW: 'Examen commencé',
  REQUEST_INFO: 'Compléments demandés', DECISION: 'Décision enregistrée', PAYMENT: 'Paiement enregistré', REGISTER: 'Adhésion enregistrée',
  DELEGATION: 'Délégation modifiée', DOC_REVIEW: 'Pièce examinée', DRAFT_EXPIRED: 'Brouillon expiré',
};

@Injectable()
export class AdminMembershipsService {
  private readonly appUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    private readonly auth: AuthService,
    config: ConfigService,
  ) {
    this.appUrl = config.get<string>('APP_URL') ?? 'http://localhost:5173';
  }

  // ───────────────────────────── Périmètre & accès ─────────────────────────────

  /** Le personnel de délégation ne voit que les dossiers de ses délégations. Les brouillons ne sont jamais visibles. */
  private scope(user: AuthenticatedUser): Prisma.MembershipRequestWhereInput {
    const base: Prisma.MembershipRequestWhereInput = { reference: { not: null }, status: { not: 'DRAFT' } };
    return user.isGlobalScope ? base : { ...base, delegationId: { in: user.delegationIds } };
  }

  private async load(user: AuthenticatedUser, id: string) {
    const req = await this.prisma.membershipRequest.findFirst({
      where: { id, ...this.scope(user) },
      include: {
        category: true,
        delegation: { select: { id: true, name: true } },
        documents: { where: { deletedAt: null }, include: { file: true }, orderBy: { createdAt: 'asc' } },
        decisions: { orderBy: { createdAt: 'desc' }, include: { recordedBy: { select: { firstName: true, lastName: true } } } },
        payments: { orderBy: { createdAt: 'desc' }, include: { recordedBy: { select: { firstName: true, lastName: true } } } },
      },
    });
    if (!req) throw new NotFoundException(NOT_FOUND);
    return req;
  }

  private specs(category: { requiredDocuments: Prisma.JsonValue }): DocSpec[] {
    return (category.requiredDocuments as unknown as DocSpec[]) ?? [];
  }

  private orgOf(data: Prisma.JsonValue) {
    return ((data as Record<string, any>)?.organization ?? {}) as Record<string, any>;
  }

  private daysSince(d: Date | null) {
    return d ? Math.floor((Date.now() - d.getTime()) / 86_400_000) : null;
  }

  private async transition(
    id: string, from: MembershipStatus[], to: MembershipStatus,
    event: { action: string; actorId: string; comment?: string | null },
    extra: Prisma.MembershipRequestUpdateInput = {},
  ) {
    // Mise à jour conditionnelle : si deux agents agissent en même temps, un seul passe.
    const res = await this.prisma.membershipRequest.updateMany({
      where: { id, status: { in: from } },
      data: { status: to, lastActionAt: new Date(), ...(extra as Prisma.MembershipRequestUncheckedUpdateManyInput) },
    });
    if (res.count !== 1) {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut du dossier a changé ou ne permet pas cette action. Actualisez la page.' });
    }
    await this.prisma.membershipEvent.create({
      data: { requestId: id, actorType: 'STAFF', actorId: event.actorId, action: event.action, fromStatus: from.length === 1 ? from[0] : undefined, toStatus: to, comment: event.comment ?? null },
    });
  }

  // ───────────────────────────── Liste & statistiques ─────────────────────────────

  async list(user: AuthenticatedUser, q: ListMembershipsQueryDto) {
    const where: Prisma.MembershipRequestWhereInput = {
      AND: [
        this.scope(user),
        q.status ? { status: q.status } : {},
        q.categoryId ? { categoryId: q.categoryId } : {},
        q.delegationId ? { delegationId: q.delegationId } : {},
        q.from || q.to ? { submittedAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: new Date(q.to.getTime() + 86_399_999) } : {}) } } : {},
        q.q
          ? {
              OR: [
                { reference: { contains: q.q, mode: 'insensitive' } },
                { applicantName: { contains: q.q, mode: 'insensitive' } },
                { applicantEmail: { contains: q.q, mode: 'insensitive' } },
                { data: { path: ['organization', 'name'], string_contains: q.q, mode: 'insensitive' } },
              ],
            }
          : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.membershipRequest.count({ where }),
      this.prisma.membershipRequest.findMany({
        where, ...pageArgs(q),
        orderBy: { submittedAt: q.sort === 'oldest' ? 'asc' : 'desc' },
        include: {
          category: { select: { code: true, label: true } },
          delegation: { select: { id: true, name: true } },
          documents: { where: { deletedAt: null }, select: { status: true } },
        },
      }),
    ]);
    return paginated(
      rows.map((r) => {
        const open = r.status === 'SUBMITTED' || r.status === 'UNDER_REVIEW';
        return {
          id: r.id, reference: r.reference, status: r.status, statusLabel: STATUS_LABELS[r.status],
          organizationName: this.orgOf(r.data).name ?? null, applicantName: r.applicantName, applicantEmail: r.applicantEmail,
          category: r.category, requestType: r.requestType, delegation: r.delegation,
          submittedAt: r.submittedAt, lastActionAt: r.lastActionAt, daysWaiting: this.daysSince(r.submittedAt),
          overdue: open && (this.daysSince(r.lastActionAt) ?? 0) > SLA_DAYS,
          documents: {
            total: r.documents.length,
            pending: r.documents.filter((d) => d.status === 'PENDING').length,
            rejected: r.documents.filter((d) => d.status === 'REJECTED').length,
          },
        };
      }),
      total, q,
    );
  }

  async stats(user: AuthenticatedUser) {
    const scope = this.scope(user);
    const [groups, overdue] = await Promise.all([
      this.prisma.membershipRequest.groupBy({ by: ['status'], where: scope, _count: { _all: true } }),
      this.prisma.membershipRequest.count({
        where: { AND: [scope, { status: { in: ['SUBMITTED', 'UNDER_REVIEW'] }, lastActionAt: { lt: new Date(Date.now() - SLA_DAYS * 86_400_000) } }] },
      }),
    ]);
    const byStatus = Object.fromEntries(Object.keys(STATUS_LABELS).map((s) => [s, 0])) as Record<string, number>;
    for (const g of groups) byStatus[g.status] = g._count._all;
    delete byStatus.DRAFT;
    return {
      total: Object.values(byStatus).reduce((a, b) => a + b, 0),
      byStatus, labels: STATUS_LABELS, overdue, overdueAfterDays: SLA_DAYS,
      toProcess: byStatus.SUBMITTED + byStatus.UNDER_REVIEW,
    };
  }

  // ───────────────────────────── Détail ─────────────────────────────

  async detail(user: AuthenticatedUser, id: string) {
    const req = await this.load(user, id);
    const specs = this.specs(req.category);
    const label = (t: string) => specs.find((s) => s.type === t)?.label ?? t;
    const org = this.orgOf(req.data);

    const [events, fees, similar, existingOrg, suggested] = await Promise.all([
      this.prisma.membershipEvent.findMany({ where: { requestId: id }, orderBy: { createdAt: 'asc' } }),
      this.prisma.feeSchedule.findMany({ where: { code: { in: FEES_BY_CATEGORY[req.category.code] ?? [] }, isActive: true }, orderBy: { code: 'asc' } }),
      org.name
        ? this.prisma.$queryRaw<{ id: string; reference: string; status: string }[]>`
            SELECT id, reference, status::text FROM membership_requests
            WHERE id <> ${id}::uuid AND reference IS NOT NULL AND status::text <> 'DRAFT'
              AND (lower(data->'organization'->>'name') = lower(${org.name})
                OR lower(data->'organization'->>'legalReference') = lower(${org.legalReference ?? ''}))
            LIMIT 10`
        : Promise.resolve([]),
      org.name
        ? this.prisma.organization.findFirst({
            where: { OR: [{ name: { equals: org.name, mode: 'insensitive' } }, ...(org.legalReference ? [{ legalReference: { equals: org.legalReference, mode: 'insensitive' as const } }] : [])] },
            select: { id: true, name: true, memberNumber: true },
          })
        : Promise.resolve(null),
      org.regionId ? this.prisma.delegation.findFirst({ where: { regionId: org.regionId, archivedAt: null }, select: { id: true, name: true } }) : Promise.resolve(null),
    ]);
    const actors = await this.prisma.user.findMany({
      where: { id: { in: [...new Set(events.map((e) => e.actorId).filter((x): x is string => !!x))] } },
      select: { id: true, firstName: true, lastName: true },
    });
    const actorName = (aid: string | null) => { const a = actors.find((x) => x.id === aid); return a ? `${a.firstName} ${a.lastName}` : null; };

    const requiredMissing = specs.filter((s) => s.requirement === 'REQUIRED' && !req.documents.some((d) => d.type === s.type && d.status !== 'REJECTED'));
    return {
      id: req.id, reference: req.reference, status: req.status, statusLabel: STATUS_LABELS[req.status],
      category: { code: req.category.code, label: req.category.label }, requestType: req.requestType, existingMemberNumber: req.existingMemberNumber,
      applicant: { name: req.applicantName, email: req.applicantEmail, phone: req.applicantPhone },
      data: req.data, delegation: req.delegation, delegationOverrideReason: req.delegationOverrideReason, suggestedDelegation: suggested,
      declarations: { acceptedAt: req.declarationsAcceptedAt, signerName: req.signerName, publicationConsent: req.publicationConsent },
      submittedAt: req.submittedAt, lastActionAt: req.lastActionAt, daysWaiting: this.daysSince(req.submittedAt),
      documents: req.documents.map((d) => ({
        id: d.id, type: d.type, label: label(d.type), requirement: specs.find((s) => s.type === d.type)?.requirement ?? null,
        status: d.status, reviewNote: d.reviewNote, reviewedAt: d.reviewedAt, uploadedAt: d.createdAt,
        file: { originalName: d.file.originalName, mimeType: d.file.mimeType, sizeBytes: d.file.sizeBytes, encrypted: d.file.encrypted },
      })),
      requiredDocumentsMissing: requiredMissing.map((s) => ({ type: s.type, label: s.label })),
      events: events.map((e) => ({
        id: e.id, date: e.createdAt, action: e.action, label: ACTION_LABELS[e.action] ?? e.action, actorType: e.actorType,
        actor: e.actorType === 'STAFF' ? actorName(e.actorId) : e.actorType === 'APPLICANT' ? 'Demandeur' : 'Système',
        fromStatus: e.fromStatus, toStatus: e.toStatus, comment: e.comment,
      })),
      decisions: req.decisions.map((d) => ({
        id: d.id, outcome: d.outcome, body: d.body, decisionReference: d.decisionReference, decidedAt: d.decidedAt, motive: d.motive,
        recordedBy: `${d.recordedBy.firstName} ${d.recordedBy.lastName}`, recordedAt: d.createdAt,
      })),
      payments: req.payments.map((p) => ({
        id: p.id, lines: p.lines, totalFcfa: p.totalFcfa, method: p.method, receiptNumber: p.receiptNumber, paidAt: p.paidAt,
        recordedBy: `${p.recordedBy.firstName} ${p.recordedBy.lastName}`,
      })),
      feesDue: { lines: fees.map((f) => ({ feeCode: f.code, label: f.label, amountFcfa: f.amountFcfa, periodicity: f.periodicity })), totalFcfa: fees.reduce((s, f) => s + f.amountFcfa, 0) },
      warnings: {
        otherRequests: similar,
        alreadyMember: existingOrg,
      },
      organizationId: req.organizationId, memberCardNumber: req.memberCardNumber,
      // Aide à l'interface : actions possibles dans l'état actuel.
      allowedActions: this.allowed(req.status, req.payments.length > 0),
    };
  }

  private allowed(status: MembershipStatus, hasPayment: boolean) {
    return {
      startReview: status === 'SUBMITTED' || status === 'ADJOURNED',
      requestInfo: status === 'SUBMITTED' || status === 'UNDER_REVIEW',
      reviewDocuments: status === 'SUBMITTED' || status === 'UNDER_REVIEW',
      decide: status === 'UNDER_REVIEW',
      recordPayment: status === 'ADMITTED_PAYMENT_PENDING' && !hasPayment,
      register: status === 'ADMITTED_PAYMENT_PENDING' && hasPayment,
    };
  }

  // ───────────────────────────── Pièces ─────────────────────────────

  /** Téléchargement contrôlé : chaque lecture d'une pièce est tracée dans le journal d'audit. */
  async downloadDocument(user: AuthenticatedUser, id: string, docId: string, meta: RequestMeta) {
    const req = await this.load(user, id);
    const doc = req.documents.find((d) => d.id === docId);
    if (!doc) throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: 'Pièce introuvable.' });
    let content: Buffer;
    try {
      content = await this.storage.read(doc.file.storageKey, doc.file.encrypted);
    } catch {
      throw new NotFoundException({ code: 'FILE_UNREADABLE', message: 'Le fichier est introuvable ou illisible.' });
    }
    await this.audit.log({
      action: 'membership.document.downloaded', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id,
      metadata: { documentId: docId, type: doc.type }, ...meta,
    });
    return { content, mimeType: doc.file.mimeType, filename: doc.file.originalName };
  }

  async reviewDocument(user: AuthenticatedUser, id: string, docId: string, dto: ReviewDocumentDto, meta: RequestMeta) {
    const req = await this.load(user, id);
    if (!this.allowed(req.status, false).reviewDocuments) {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'Les pièces ne peuvent être examinées que pendant l’instruction du dossier.' });
    }
    const doc = req.documents.find((d) => d.id === docId);
    if (!doc) throw new NotFoundException({ code: 'DOCUMENT_NOT_FOUND', message: 'Pièce introuvable.' });
    if (dto.status === 'REJECTED' && !dto.note) {
      throw new UnprocessableEntityException({ code: 'NOTE_REQUIRED', message: 'Indiquez le motif du refus de la pièce (le demandeur le verra).' });
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.membershipDocument.update({
        where: { id: docId },
        data: { status: dto.status, reviewNote: dto.status === 'REJECTED' ? dto.note : null, reviewedById: user.id, reviewedAt: now },
      }),
      this.prisma.membershipEvent.create({
        data: { requestId: id, actorType: 'STAFF', actorId: user.id, action: 'DOC_REVIEW', comment: `${doc.type} : ${dto.status}` },
      }),
    ]);
    await this.audit.log({
      action: 'membership.document.reviewed', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id,
      metadata: { documentId: docId, type: doc.type, status: dto.status }, ...meta,
    });
    return { id: docId, status: dto.status, reviewNote: dto.status === 'REJECTED' ? dto.note : null };
  }

  // ───────────────────────────── Instruction ─────────────────────────────

  async assignDelegation(user: AuthenticatedUser, id: string, dto: AssignDelegationDto, meta: RequestMeta) {
    const req = await this.load(user, id);
    if (!['SUBMITTED', 'UNDER_REVIEW', 'TO_COMPLETE', 'ADMITTED_PAYMENT_PENDING', 'ADJOURNED'].includes(req.status)) {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'La délégation ne peut plus être modifiée pour ce dossier.' });
    }
    const delegation = await this.prisma.delegation.findFirst({ where: { id: dto.delegationId, archivedAt: null } });
    if (!delegation) throw new UnprocessableEntityException({ code: 'DELEGATION_NOT_FOUND', message: 'Délégation inconnue.' });
    if (!user.isGlobalScope && !user.delegationIds.includes(delegation.id)) {
      throw new NotFoundException({ code: 'DELEGATION_NOT_FOUND', message: 'Délégation inconnue.' });
    }
    await this.prisma.$transaction([
      this.prisma.membershipRequest.update({ where: { id }, data: { delegationId: delegation.id, delegationOverrideReason: dto.reason ?? null, lastActionAt: new Date() } }),
      this.prisma.membershipEvent.create({
        data: { requestId: id, actorType: 'STAFF', actorId: user.id, action: 'DELEGATION', comment: `Délégation : ${delegation.name}${dto.reason ? ` (${dto.reason})` : ''}` },
      }),
    ]);
    await this.audit.log({
      action: 'membership.delegation.assigned', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id,
      metadata: { from: req.delegationId, to: delegation.id }, ...meta,
    });
    return { delegation: { id: delegation.id, name: delegation.name } };
  }

  async startReview(user: AuthenticatedUser, id: string, meta: RequestMeta) {
    const req = await this.load(user, id);
    await this.transition(id, ['SUBMITTED', 'ADJOURNED'], 'UNDER_REVIEW', { action: 'START_REVIEW', actorId: user.id });
    await this.audit.log({
      action: 'membership.review.started', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id,
      metadata: { from: req.status }, ...meta,
    });
    return { status: 'UNDER_REVIEW' as const, statusLabel: STATUS_LABELS.UNDER_REVIEW };
  }

  async requestInfo(user: AuthenticatedUser, id: string, dto: RequestInfoDto, meta: RequestMeta) {
    const req = await this.load(user, id);
    await this.transition(id, ['SUBMITTED', 'UNDER_REVIEW'], 'TO_COMPLETE', { action: 'REQUEST_INFO', actorId: user.id, comment: dto.message });
    void this.mail.send({
      to: req.applicantEmail,
      subject: `CAPH-CI — Dossier ${req.reference} : compléments demandés`,
      text:
        `Bonjour ${req.applicantName},\n\nPour poursuivre l'examen de votre dossier ${req.reference}, la CAPH-CI vous demande :\n\n${dto.message}\n\n` +
        `Complétez votre dossier avec votre code de suivi : ${this.appUrl}/adhesion/suivi`,
    });
    await this.audit.log({
      action: 'membership.info.requested', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id, ...meta,
    });
    return { status: 'TO_COMPLETE' as const, statusLabel: STATUS_LABELS.TO_COMPLETE };
  }

  // ───────────────────────────── Décision ─────────────────────────────

  /** Enregistre la décision officielle (CA / AG). Jamais automatique : c'est une personne habilitée qui la saisit. */
  async decide(user: AuthenticatedUser, id: string, dto: DecisionDto, meta: RequestMeta) {
    const req = await this.load(user, id);
    if (req.status !== 'UNDER_REVIEW') {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'Une décision ne peut être enregistrée que pour un dossier « en cours d’examen ».' });
    }
    if (dto.outcome !== 'ADMITTED' && !dto.motive) {
      throw new UnprocessableEntityException({ code: 'MOTIVE_REQUIRED', message: 'Le motif est obligatoire pour un ajournement ou un refus.' });
    }
    if (dto.decidedAt.getTime() > Date.now() + 86_400_000) {
      throw new UnprocessableEntityException({ code: 'DATE_IN_FUTURE', message: 'La date de la décision ne peut pas être dans le futur.' });
    }
    if (dto.outcome === 'ADMITTED') {
      const specs = this.specs(req.category);
      const notValidated = specs.filter((s) => s.requirement === 'REQUIRED' && !req.documents.some((d) => d.type === s.type && d.status === 'ACCEPTED'));
      if (notValidated.length) {
        throw new ConflictException({
          code: 'DOCUMENTS_NOT_VALIDATED',
          message: `Avant d'admettre, validez les pièces obligatoires : ${notValidated.map((s) => s.label).join(' ; ')}.`,
        });
      }
    }
    const next: MembershipStatus = dto.outcome === 'ADMITTED' ? 'ADMITTED_PAYMENT_PENDING' : dto.outcome;
    // Statut + événement + décision dans UNE transaction : tout passe, ou rien.
    await this.prisma.$transaction(async (tx) => {
      const res = await tx.membershipRequest.updateMany({ where: { id, status: 'UNDER_REVIEW' }, data: { status: next, lastActionAt: new Date() } });
      if (res.count !== 1) {
        throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut du dossier a changé. Actualisez la page.' });
      }
      await tx.membershipEvent.create({
        data: { requestId: id, actorType: 'STAFF', actorId: user.id, action: 'DECISION', fromStatus: 'UNDER_REVIEW', toStatus: next, comment: dto.outcome === 'ADMITTED' ? null : dto.motive },
      });
      await tx.membershipDecision.create({
        data: { requestId: id, outcome: dto.outcome, body: dto.body, decisionReference: dto.decisionReference, decidedAt: dto.decidedAt, motive: dto.motive ?? null, recordedById: user.id },
      });
    });
    const fees = FEES_BY_CATEGORY[req.category.code] ?? [];
    const text: Record<string, string> = {
      ADMITTED: `Votre demande est admise. Pour finaliser votre adhésion, le Secrétariat Permanent vous contactera pour le paiement des droits (${fees.length ? 'barème en vigueur' : ''}).`,
      ADJOURNED: `Votre demande est ajournée.\n\nMotif : ${dto.motive}`,
      REJECTED: `Votre demande n'a pas été retenue.\n\nMotif : ${dto.motive}`,
    };
    void this.mail.send({
      to: req.applicantEmail,
      subject: `CAPH-CI — Dossier ${req.reference} : décision`,
      text: `Bonjour ${req.applicantName},\n\nUne décision a été prise sur votre dossier ${req.reference}.\n\n${text[dto.outcome]}\n\nDétail : ${this.appUrl}/adhesion/suivi`,
    });
    await this.audit.log({
      action: 'membership.decision.recorded', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id,
      metadata: { outcome: dto.outcome, body: dto.body, decisionReference: dto.decisionReference }, ...meta,
    });
    return { status: next, statusLabel: STATUS_LABELS[next] };
  }

  // ───────────────────────────── Paiement & enregistrement ─────────────────────────────

  async recordPayment(user: AuthenticatedUser, id: string, dto: RecordPaymentDto, meta: RequestMeta) {
    const req = await this.load(user, id);
    if (req.status !== 'ADMITTED_PAYMENT_PENDING') {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le paiement s’enregistre pour un dossier admis, en attente de paiement.' });
    }
    if (req.payments.length) {
      throw new ConflictException({ code: 'PAYMENT_EXISTS', message: 'Un paiement est déjà enregistré pour ce dossier.' });
    }
    const allowed = FEES_BY_CATEGORY[req.category.code] ?? [];
    const codes = dto.feeCodes ?? allowed;
    if (codes.some((c) => !allowed.includes(c))) {
      throw new UnprocessableEntityException({ code: 'FEE_NOT_APPLICABLE', message: 'Une ligne du barème ne s’applique pas à cette catégorie.' });
    }
    const fees = await this.prisma.feeSchedule.findMany({ where: { code: { in: codes }, isActive: true } });
    if (fees.length !== codes.length) {
      throw new UnprocessableEntityException({ code: 'FEE_NOT_FOUND', message: 'Ligne de barème introuvable ou inactive.' });
    }
    const lines = fees.map((f) => ({ feeCode: f.code, label: f.label, amountFcfa: f.amountFcfa }));
    const totalFcfa = lines.reduce((s, l) => s + l.amountFcfa, 0);
    try {
      await this.prisma.$transaction([
        this.prisma.paymentRecord.create({
          data: {
            requestId: id, lines, totalFcfa, method: dto.method, receiptNumber: dto.receiptNumber,
            paidAt: dto.paidAt ?? new Date(), recordedById: user.id,
          },
        }),
        this.prisma.membershipRequest.update({ where: { id }, data: { lastActionAt: new Date() } }),
        this.prisma.membershipEvent.create({
          data: { requestId: id, actorType: 'STAFF', actorId: user.id, action: 'PAYMENT', comment: `Reçu ${dto.receiptNumber} — ${totalFcfa} FCFA` },
        }),
      ]);
    } catch (e) {
      if ((e as { code?: string }).code === 'P2002') {
        throw new ConflictException({ code: 'RECEIPT_EXISTS', message: 'Ce numéro de reçu existe déjà.' });
      }
      throw e;
    }
    await this.audit.log({
      action: 'membership.payment.recorded', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id,
      metadata: { receiptNumber: dto.receiptNumber, totalFcfa, method: dto.method }, ...meta,
    });
    return { lines, totalFcfa, receiptNumber: dto.receiptNumber };
  }

  /** Enregistrement final : crée l'organisation membre et invite son Président. */
  async register(user: AuthenticatedUser, id: string, dto: RegisterDto, meta: RequestMeta) {
    const req = await this.load(user, id);
    if (req.status !== 'ADMITTED_PAYMENT_PENDING') {
      throw new ConflictException({ code: 'INVALID_STATUS', message: 'Seul un dossier admis, en attente de paiement, peut être enregistré.' });
    }
    if (!req.decisions.some((d) => d.outcome === 'ADMITTED')) {
      throw new ConflictException({ code: 'NO_DECISION', message: 'Aucune décision d’admission enregistrée.' });
    }
    if (!req.payments.length) {
      throw new ConflictException({ code: 'PAYMENT_REQUIRED', message: 'Enregistrez d’abord le paiement des droits.' });
    }
    const data = (req.data ?? {}) as Record<string, any>;
    const org = data.organization ?? {};
    const rep = data.representative ?? {};
    const presidentEmail = (dto.presidentEmail ?? rep.email ?? '').toString().trim().toLowerCase();
    if (!org.name || !presidentEmail) {
      throw new UnprocessableEntityException({ code: 'INCOMPLETE_DATA', message: 'Le dossier ne contient pas le nom de l’organisation ou l’e-mail du représentant.' });
    }
    if (await this.prisma.user.findUnique({ where: { email: presidentEmail } })) {
      throw new ConflictException({ code: 'EMAIL_TAKEN', message: `Un compte existe déjà avec l'adresse ${presidentEmail}. Indiquez une autre adresse pour le Président (champ presidentEmail).` });
    }
    if (await this.prisma.organization.findFirst({ where: { name: { equals: org.name, mode: 'insensitive' } }, select: { id: true } })) {
      throw new ConflictException({ code: 'ORGANIZATION_EXISTS', message: 'Une organisation du même nom est déjà enregistrée.' });
    }
    let delegationId = dto.delegationId ?? req.delegationId ?? null;
    if (!delegationId && org.regionId) {
      delegationId = (await this.prisma.delegation.findFirst({ where: { regionId: org.regionId, archivedAt: null }, select: { id: true } }))?.id ?? null;
    }
    if (delegationId) {
      if (!(await this.prisma.delegation.findFirst({ where: { id: delegationId, archivedAt: null }, select: { id: true } }))) {
        throw new UnprocessableEntityException({ code: 'DELEGATION_NOT_FOUND', message: 'Délégation inconnue.' });
      }
      if (!user.isGlobalScope && !user.delegationIds.includes(delegationId)) {
        throw new NotFoundException(NOT_FOUND);
      }
    }
    const presidentRole = await this.prisma.role.findUniqueOrThrow({ where: { code: 'OPH_PRESIDENT' } });
    const parts = String(rep.name ?? org.name).trim().split(/\s+/);
    const firstName = parts[0];
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : parts[0];

    const result = await this.prisma.$transaction(async (tx) => {
      // Marqueur d'état : empêche deux enregistrements simultanés du même dossier.
      const claimed = await tx.membershipRequest.updateMany({
        where: { id, status: 'ADMITTED_PAYMENT_PENDING' },
        data: { status: 'REGISTERED', lastActionAt: new Date() },
      });
      if (claimed.count !== 1) {
        throw new ConflictException({ code: 'INVALID_STATUS', message: 'Le statut du dossier a changé. Actualisez la page.' });
      }
      const rows = await tx.$queryRaw<{ last: number }[]>`
        INSERT INTO reference_counters (year, last) VALUES (${MEMBER_COUNTER_KEY}, 1)
        ON CONFLICT (year) DO UPDATE SET last = reference_counters.last + 1 RETURNING last`;
      const memberNumber = `OPH-${String(rows[0].last).padStart(4, '0')}`;
      const now = new Date();
      const organization = await tx.organization.create({
        data: {
          name: org.name, acronym: org.acronym ?? null, legalReference: org.legalReference ?? null, status: 'ACTIVE',
          memberNumber, registeredAt: now, delegationId, regionId: org.regionId ?? null, commune: org.commune ?? null,
          address: org.address ?? null, phone: org.phone ?? null, email: org.email ?? null, website: org.website ?? null,
          interventionZone: org.interventionZone ?? null,
          // Annuaire : visible uniquement si le consentement a été donné au dépôt.
          isListed: req.publicationConsent, publicationConsentAt: req.publicationConsent ? req.declarationsAcceptedAt ?? now : null,
          domains: { connect: ((org.interventionDomainIds as string[]) ?? []).map((x) => ({ id: x })) },
          disabilityTypes: { connect: ((org.disabilityTypeIds as string[]) ?? []).map((x) => ({ id: x })) },
        },
      });
      const president = await tx.user.create({
        data: {
          email: presidentEmail, firstName, lastName, jobTitle: rep.function ?? null, phone: rep.phone ?? null, status: 'INVITED',
          membership: { create: { organizationId: organization.id, roleId: presidentRole.id } },
        },
      });
      await tx.membershipRequest.update({
        where: { id },
        data: { organizationId: organization.id, delegationId, memberCardNumber: dto.memberCardNumber ?? null },
      });
      await tx.membershipEvent.create({
        data: { requestId: id, actorType: 'STAFF', actorId: user.id, action: 'REGISTER', fromStatus: 'ADMITTED_PAYMENT_PENDING', toStatus: 'REGISTERED', comment: `N° de membre ${memberNumber}` },
      });
      return { organization, president, memberNumber };
    });

    await this.auth.sendInvitation(result.president.id);
    void this.mail.send({
      to: req.applicantEmail,
      subject: `CAPH-CI — Bienvenue ! Adhésion enregistrée (${req.reference})`,
      text:
        `Bonjour ${req.applicantName},\n\nL'adhésion de « ${result.organization.name} » à la CAPH-CI est enregistrée.\n` +
        `N° de membre : ${result.memberNumber}\n\nLe Président de l'organisation (${presidentEmail}) reçoit une invitation pour activer son accès à l'espace membre.\n` +
        `L'attestation d'adhésion et la carte de membre vous seront remises par le Secrétariat Permanent.`,
    });
    await this.audit.log({
      action: 'membership.registered', actorId: user.id, actorLabel: user.email, entityType: 'MembershipRequest', entityId: id,
      metadata: { organizationId: result.organization.id, memberNumber: result.memberNumber, presidentUserId: result.president.id }, ...meta,
    });
    return {
      status: 'REGISTERED' as const, statusLabel: STATUS_LABELS.REGISTERED,
      organization: { id: result.organization.id, name: result.organization.name, memberNumber: result.memberNumber },
      president: { id: result.president.id, email: presidentEmail, status: 'INVITED' },
    };
  }
}
