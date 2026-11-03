import {
  ConflictException, HttpException, HttpStatus, Injectable, Logger, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Cron } from '@nestjs/schedule';
import { MembershipStatus, Prisma } from '@prisma/client';
import { timingSafeEqual } from 'crypto';
import { basename } from 'path';
import { AuditService } from '../audit/audit.service';
import { hashToken, newToken } from '../auth/token.util';
import { MailService } from '../mail/mail.service';
import { PrismaService } from '../prisma/prisma.service';
import { detectFileType, StorageService } from '../storage/storage.service';
import {
  CreateRequestDto, SubmitRequestDto, TrackRequestDto, UpdateRequestDto,
} from './dto/memberships.dto';
import {
  CONDITIONS, DATA_PROTECTION_NOTICE, EDITABLE_STATUSES, ELIGIBILITY, FEES_BY_CATEGORY, OPEN_STATUSES, PROCEDURE, STATUS_LABELS,
} from './membership.content';
import { FieldError, missingOrganisationFields, ORGANISATION_FIELDS, sanitizeOrganisationData } from './organisation.spec';

export interface RequestMeta { ip?: string; userAgent?: string }
type Req = 'REQUIRED' | 'RECOMMENDED' | 'OPTIONAL' | 'AFTER_ADMISSION';
interface DocSpec { type: string; label: string; requirement: Req }

const MAX_FILES_PER_TYPE = 3;
const MAX_OPEN_DRAFTS_PER_EMAIL = 5;
const DRAFT_TTL_DAYS = 30;
/** Catégories pour lesquelles un formulaire est implémenté. */
const SUPPORTED_CATEGORIES = new Set(['PM_ORGANISATION']);
/** Pièces d'identité : chiffrées au repos. */
const SENSITIVE_DOC_TYPES = new Set(['REPRESENTATIVE_ID', 'IDENTITY']);

const NOT_FOUND = { code: 'REQUEST_NOT_FOUND', message: 'Aucun dossier ne correspond à ces informations.' };
const EVENT_LABELS: Record<string, string> = {
  SUBMIT: 'Dossier déposé', RESUBMIT: 'Compléments transmis', START_REVIEW: 'Examen du dossier commencé',
  REQUEST_INFO: 'Compléments demandés', DECISION: 'Décision enregistrée', PAYMENT: 'Paiement enregistré', REGISTER: 'Adhésion enregistrée',
};
const OUTCOME_LABELS = { ADMITTED: 'Admis', ADJOURNED: 'Ajourné', REJECTED: 'Refusé' } as const;

@Injectable()
export class MembershipsService {
  private readonly logger = new Logger(MembershipsService.name);
  private readonly secret: string;
  private readonly appUrl: string;
  private readonly notifyEmail?: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
    private readonly audit: AuditService,
    config: ConfigService,
  ) {
    this.secret = config.getOrThrow<string>('JWT_REFRESH_SECRET');
    this.appUrl = config.getOrThrow<string>('APP_URL').replace(/\/$/, '');
    this.notifyEmail = config.get<string>('MEMBERSHIP_NOTIFY_EMAIL') || undefined;
  }

  private h = (t: string) => hashToken(t, this.secret);

  // ─────────────────────────── Informations publiques ───────────────────────────

  async categories() {
    const rows = await this.prisma.membershipCategory.findMany({
      orderBy: { sortOrder: 'asc' }, select: { code: true, label: true, description: true, isActive: true },
    });
    return rows.map((c) => ({ ...c, isOpen: c.isActive && SUPPORTED_CATEGORIES.has(c.code) }));
  }

  async requirements(code: string) {
    const category = await this.prisma.membershipCategory.findUnique({ where: { code } });
    if (!category) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Catégorie inconnue.' });
    const feeCodes = FEES_BY_CATEGORY[code] ?? [];
    const [fees, regions, delegations, domains, disabilityTypes] = await this.prisma.$transaction([
      this.prisma.feeSchedule.findMany({
        where: { code: { in: feeCodes }, isActive: true }, orderBy: { amountFcfa: 'desc' },
        select: { code: true, label: true, amountFcfa: true, periodicity: true },
      }),
      this.prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.delegation.findMany({ where: { archivedAt: null }, select: { id: true, name: true, regionId: true }, orderBy: { name: 'asc' } }),
      this.prisma.interventionDomain.findMany({ select: { id: true, label: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.disabilityType.findMany({ select: { id: true, label: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    const open = category.isActive && SUPPORTED_CATEGORIES.has(code);
    return {
      category: { code: category.code, label: category.label, description: category.description, isOpen: open },
      eligibility: ELIGIBILITY,
      conditions: CONDITIONS,
      procedure: PROCEDURE,
      documents: category.requiredDocuments,
      fees,
      feesNotice: 'Barème du Règlement intérieur 2026 (transitoire). Les droits sont dus après acceptation du dossier ; paiement échelonné possible.',
      declarations: {
        acceptAccuracy: 'Je déclare exacts les renseignements fournis et je sollicite mon adhésion à la CAPH-CI.',
        acceptStatutes: 'J’accepte les statuts, le règlement intérieur, les politiques institutionnelles et les obligations liées à ma catégorie.',
        acceptDataProcessing: DATA_PROTECTION_NOTICE,
      },
      fields: SUPPORTED_CATEGORIES.has(code) ? ORGANISATION_FIELDS : null,
      options: { regions, delegations, domains, disabilityTypes },
    };
  }

  // ───────────────────────────── Accès au dossier (code de suivi) ─────────────────────────────

  /** Un dossier n'est accessible qu'avec son code de suivi. Mauvais code ou dossier inconnu : même 404. */
  private async authorize(id: string, code: string | undefined) {
    const req = await this.prisma.membershipRequest.findUnique({
      where: { id },
      include: { category: true, documents: { where: { deletedAt: null }, include: { file: true }, orderBy: { createdAt: 'asc' } } },
    });
    const expected = Buffer.from(req?.trackingTokenHash ?? '0'.repeat(64), 'hex');
    const given = Buffer.from(this.h(code && code.length <= 200 ? code : 'invalid'), 'hex');
    const ok = !!req && expected.length === given.length && timingSafeEqual(expected, given);
    if (!ok || !req) throw new NotFoundException(NOT_FOUND);
    return req;
  }

  private assertEditable(status: MembershipStatus) {
    if (!EDITABLE_STATUSES.includes(status)) {
      throw new ConflictException({ code: 'NOT_EDITABLE', message: 'Ce dossier ne peut plus être modifié. Suivez son avancement avec votre référence.' });
    }
  }

  private docSpecs(category: { requiredDocuments: Prisma.JsonValue }): DocSpec[] {
    return (category.requiredDocuments as unknown as DocSpec[]) ?? [];
  }

  private view(req: Awaited<ReturnType<MembershipsService['authorize']>>) {
    const specs = this.docSpecs(req.category);
    const label = (t: string) => specs.find((s) => s.type === t)?.label ?? t;
    const data = (req.data ?? {}) as Record<string, any>;
    const missingFields = missingOrganisationFields(data);
    if (!req.delegationId) missingFields.push({ field: 'delegationId', message: 'Délégation territoriale : champ obligatoire.' });
    if (req.requestType === 'RENEWAL' && !req.existingMemberNumber) {
      missingFields.push({ field: 'existingMemberNumber', message: 'N° de membre : obligatoire pour un renouvellement.' });
    }
    const missingDocuments = specs
      .filter((s) => s.requirement === 'REQUIRED' && !req.documents.some((d) => d.type === s.type))
      .map((s) => ({ type: s.type, label: s.label }));
    return {
      id: req.id,
      reference: req.reference,
      status: req.status,
      statusLabel: STATUS_LABELS[req.status],
      canEdit: EDITABLE_STATUSES.includes(req.status),
      category: { code: req.category.code, label: req.category.label },
      requestType: req.requestType,
      existingMemberNumber: req.existingMemberNumber,
      applicant: { name: req.applicantName, email: req.applicantEmail, phone: req.applicantPhone },
      delegationId: req.delegationId,
      delegationOverrideReason: req.delegationOverrideReason,
      data,
      documents: req.documents.map((d) => ({
        id: d.id, type: d.type, label: label(d.type), originalName: d.file.originalName,
        sizeBytes: d.file.sizeBytes, mimeType: d.file.mimeType, status: d.status,
        reviewNote: d.status === 'REJECTED' ? d.reviewNote : null,
      })),
      documentSpecs: specs,
      completeness: { missingFields, missingDocuments, complete: missingFields.length === 0 && missingDocuments.length === 0 },
      submittedAt: req.submittedAt,
      updatedAt: req.updatedAt,
    };
  }

  // ─────────────────────────────────── Brouillon ───────────────────────────────────

  async create(dto: CreateRequestDto, meta: RequestMeta) {
    const category = await this.prisma.membershipCategory.findUnique({ where: { code: dto.categoryCode } });
    if (!category) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Catégorie inconnue.' });
    if (!category.isActive || !SUPPORTED_CATEGORIES.has(category.code)) {
      throw new UnprocessableEntityException({ code: 'CATEGORY_CLOSED', message: 'Les demandes de cette catégorie ne sont pas encore ouvertes.' });
    }
    const drafts = await this.prisma.membershipRequest.count({ where: { applicantEmail: dto.applicantEmail, status: 'DRAFT' } });
    if (drafts >= MAX_OPEN_DRAFTS_PER_EMAIL) {
      throw new ConflictException({ code: 'TOO_MANY_DRAFTS', message: 'Plusieurs brouillons sont déjà en cours avec cette adresse. Reprenez-en un ou contactez la CAPH-CI.' });
    }
    const trackingCode = newToken();
    const created = await this.prisma.membershipRequest.create({
      data: {
        categoryId: category.id, requestType: dto.requestType ?? 'FIRST',
        applicantName: dto.applicantName, applicantEmail: dto.applicantEmail, applicantPhone: dto.applicantPhone ?? null,
        trackingTokenHash: this.h(trackingCode),
        events: { create: { actorType: 'APPLICANT', action: 'CREATE', toStatus: 'DRAFT' } },
      },
    });
    void this.mail.send({
      to: created.applicantEmail,
      subject: 'CAPH-CI — Votre demande d’adhésion est commencée',
      text:
        `Bonjour ${created.applicantName},\n\nVotre demande d'adhésion à la CAPH-CI est enregistrée en brouillon.\n` +
        `Elle sera conservée ${DRAFT_TTL_DAYS} jours sans modification.\n\n` +
        `CODE DE SUIVI (à conserver, il est personnel) : ${trackingCode}\n\n` +
        `Pour reprendre votre saisie : ${this.appUrl}/adhesion/reprendre?id=${created.id}&code=${trackingCode}\n\n` +
        `Ce message ne vaut pas dépôt du dossier : l'adhésion n'est examinée qu'après soumission.`,
    });
    await this.audit.log({ action: 'membership.request.created', actorLabel: created.applicantEmail, entityType: 'MembershipRequest', entityId: created.id, ...meta });
    return { id: created.id, status: created.status, trackingCode, expiresInDays: DRAFT_TTL_DAYS };
  }

  async get(id: string, code: string | undefined) {
    return this.view(await this.authorize(id, code));
  }

  async update(id: string, code: string | undefined, dto: UpdateRequestDto) {
    const req = await this.authorize(id, code);
    this.assertEditable(req.status);
    const errors: FieldError[] = [];
    const update: Prisma.MembershipRequestUpdateInput = { lastActionAt: new Date() };

    if (dto.requestType) update.requestType = dto.requestType;
    if (dto.existingMemberNumber !== undefined) update.existingMemberNumber = dto.existingMemberNumber;
    if (dto.delegationOverrideReason !== undefined) update.delegationOverrideReason = dto.delegationOverrideReason;
    if (dto.applicantName) update.applicantName = dto.applicantName;
    if (dto.applicantPhone !== undefined) update.applicantPhone = dto.applicantPhone;

    if (dto.delegationId !== undefined) {
      if (dto.delegationId && !(await this.prisma.delegation.findFirst({ where: { id: dto.delegationId, archivedAt: null } }))) {
        errors.push({ field: 'delegationId', message: 'Délégation inconnue.' });
      } else {
        update.delegation = dto.delegationId ? { connect: { id: dto.delegationId } } : { disconnect: true };
      }
    }

    if (dto.data !== undefined) {
      const { data: clean, errors: formatErrors } = sanitizeOrganisationData(dto.data);
      errors.push(...formatErrors);
      const org = clean.organization ?? {};
      errors.push(...(await this.checkReferences(org)));
      if (errors.length === 0) {
        const merged: Record<string, Record<string, unknown>> = { ...((req.data ?? {}) as Record<string, Record<string, unknown>>) };
        for (const [section, fields] of Object.entries(clean)) {
          const next = { ...(merged[section] ?? {}), ...fields };
          for (const k of Object.keys(next)) if (next[k] === '') delete next[k]; // "" = effacer le champ
          merged[section] = next;
        }
        update.data = merged as Prisma.InputJsonValue;
      }
    }

    if (errors.length) {
      throw new UnprocessableEntityException({ code: 'VALIDATION_ERROR', message: errors });
    }
    await this.prisma.membershipRequest.update({ where: { id }, data: update });
    return this.get(id, code);
  }

  private async checkReferences(org: Record<string, unknown>): Promise<FieldError[]> {
    const errors: FieldError[] = [];
    if (typeof org.regionId === 'string' && org.regionId && !(await this.prisma.region.findUnique({ where: { id: org.regionId } }))) {
      errors.push({ field: 'organization.regionId', message: 'Région inconnue.' });
    }
    const checkList = async (key: 'interventionDomainIds' | 'disabilityTypeIds', model: 'interventionDomain' | 'disabilityType', label: string) => {
      const ids = org[key];
      if (!Array.isArray(ids) || !ids.length) return;
      const unique = [...new Set(ids as string[])];
      const count = await (this.prisma[model] as any).count({ where: { id: { in: unique } } });
      if (count !== unique.length) errors.push({ field: `organization.${key}`, message: `${label} : valeur inconnue.` });
    };
    await checkList('interventionDomainIds', 'interventionDomain', "Domaine d'intervention");
    await checkList('disabilityTypeIds', 'disabilityType', 'Type de handicap');
    return errors;
  }

  // ─────────────────────────────────── Pièces jointes ───────────────────────────────────

  async uploadDocument(id: string, code: string | undefined, type: string, file: Express.Multer.File | undefined, meta: RequestMeta) {
    const req = await this.authorize(id, code);
    this.assertEditable(req.status);
    const spec = this.docSpecs(req.category).find((s) => s.type === type);
    if (!spec || spec.requirement === 'AFTER_ADMISSION') {
      throw new UnprocessableEntityException({ code: 'INVALID_DOCUMENT_TYPE', message: 'Ce type de pièce n’est pas attendu pour cette demande.' });
    }
    if (!file || !file.buffer?.length) {
      throw new UnprocessableEntityException({ code: 'FILE_REQUIRED', message: 'Aucun fichier reçu.' });
    }
    const detected = detectFileType(file.buffer);
    if (!detected) {
      throw new UnprocessableEntityException({ code: 'INVALID_FILE_TYPE', message: 'Format non accepté. Envoyez un fichier PDF, JPG ou PNG.' });
    }
    if (req.documents.filter((d) => d.type === type).length >= MAX_FILES_PER_TYPE) {
      throw new UnprocessableEntityException({ code: 'TOO_MANY_FILES', message: `Vous pouvez joindre ${MAX_FILES_PER_TYPE} fichiers au maximum pour cette pièce. Supprimez-en un d’abord.` });
    }

    const stored = await this.storage.save(file.buffer, SENSITIVE_DOC_TYPES.has(type));
    const safeName = (basename(file.originalname || `piece.${detected.ext}`).replace(/[^\p{L}\p{N}._ ()-]/gu, '_') || `piece.${detected.ext}`).slice(0, 150);
    try {
      const doc = await this.prisma.membershipDocument.create({
        data: {
          type, request: { connect: { id: req.id } },
          file: { create: { storageKey: stored.storageKey, originalName: safeName, mimeType: detected.mime, sizeBytes: file.size, sha256: stored.sha256, encrypted: stored.encrypted } },
        },
        include: { file: true },
      });
      await this.prisma.membershipRequest.update({ where: { id: req.id }, data: { lastActionAt: new Date() } });
      await this.audit.log({
        action: 'membership.document.uploaded', actorLabel: req.applicantEmail, entityType: 'MembershipRequest', entityId: req.id,
        metadata: { type, mime: detected.mime, size: file.size, encrypted: stored.encrypted }, ...meta,
      });
      return { id: doc.id, type: doc.type, label: spec.label, originalName: doc.file.originalName, sizeBytes: doc.file.sizeBytes, mimeType: doc.file.mimeType, status: doc.status };
    } catch (e) {
      await this.storage.remove(stored.storageKey);
      throw e;
    }
  }

  async deleteDocument(id: string, code: string | undefined, docId: string, meta: RequestMeta) {
    const req = await this.authorize(id, code);
    this.assertEditable(req.status);
    const doc = req.documents.find((d) => d.id === docId);
    if (!doc) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Pièce introuvable.' });
    if (doc.status === 'ACCEPTED') {
      throw new ConflictException({ code: 'DOCUMENT_ACCEPTED', message: 'Cette pièce a été acceptée par la CAPH-CI et ne peut plus être retirée.' });
    }
    const now = new Date();
    await this.prisma.$transaction([
      this.prisma.membershipDocument.update({ where: { id: doc.id }, data: { deletedAt: now } }),
      this.prisma.fileAsset.update({ where: { id: doc.fileId }, data: { deletedAt: now } }),
      this.prisma.membershipRequest.update({ where: { id: req.id }, data: { lastActionAt: now } }),
    ]);
    await this.storage.remove(doc.file.storageKey);
    await this.audit.log({ action: 'membership.document.deleted', actorLabel: req.applicantEmail, entityType: 'MembershipRequest', entityId: req.id, metadata: { type: doc.type }, ...meta });
  }

  // ─────────────────────────────────── Soumission ───────────────────────────────────

  async submit(id: string, code: string, dto: SubmitRequestDto, meta: RequestMeta) {
    const req = await this.authorize(id, code);
    this.assertEditable(req.status);
    const v = this.view(req);

    const errors: FieldError[] = [
      ...v.completeness.missingFields,
      ...v.completeness.missingDocuments.map((d) => ({ field: `documents.${d.type}`, message: `Pièce obligatoire manquante : ${d.label}.` })),
    ];
    if (errors.length) {
      throw new UnprocessableEntityException({ code: 'INCOMPLETE_REQUEST', message: errors });
    }

    const org = (req.data as Record<string, any>).organization;
    await this.assertNoConflict(req.id, req.requestType, org.name, org.legalReference);

    const result = await this.prisma.$transaction(async (tx) => {
      let reference = req.reference;
      if (!reference) {
        // Compteur annuel incrémenté de façon atomique : deux dépôts simultanés n'obtiennent jamais la même référence.
        const year = new Date().getFullYear();
        const rows = await tx.$queryRaw<{ last: number }[]>`
          INSERT INTO reference_counters (year, last) VALUES (${year}, 1)
          ON CONFLICT (year) DO UPDATE SET last = reference_counters.last + 1 RETURNING last`;
        reference = `CAPH-${year}-${String(rows[0].last).padStart(6, '0')}`;
      }
      const resubmission = req.status === 'TO_COMPLETE';
      const now = new Date();
      await tx.membershipRequest.update({
        where: { id: req.id },
        data: {
          reference, status: 'SUBMITTED', submittedAt: req.submittedAt ?? now, lastActionAt: now,
          declarationsAcceptedAt: now, declarationIp: meta.ip, signerName: dto.signerName,
          ...(dto.publicationConsent !== undefined ? { publicationConsent: dto.publicationConsent } : {}),
        },
      });
      await tx.membershipEvent.create({
        data: { requestId: req.id, actorType: 'APPLICANT', action: resubmission ? 'RESUBMIT' : 'SUBMIT', fromStatus: req.status, toStatus: 'SUBMITTED' },
      });
      return { reference, submittedAt: req.submittedAt ?? now };
    });

    void this.mail.send({
      to: req.applicantEmail,
      subject: `CAPH-CI — Dossier ${result.reference} bien reçu`,
      text:
        `Bonjour ${req.applicantName},\n\nVotre dossier d'adhésion est bien reçu.\n\n` +
        `RÉFÉRENCE : ${result.reference}\nCODE DE SUIVI : ${code}\n\n` +
        `Suivre votre dossier : ${this.appUrl}/adhesion/suivi\n\n` +
        `Important : la réception du dossier ne vaut pas admission. Votre demande sera examinée par les instances compétentes de la CAPH-CI ; vous serez informé(e) de la décision.`,
    });
    if (this.notifyEmail) {
      void this.mail.send({
        to: this.notifyEmail,
        subject: `Nouvelle demande d'adhésion ${result.reference} — ${org.name}`,
        text: `Un dossier vient d'être déposé : ${result.reference} (${org.name}). À traiter dans l'espace de gestion des adhésions.`,
      });
    }
    await this.audit.log({
      action: 'membership.request.submitted', actorLabel: req.applicantEmail, entityType: 'MembershipRequest', entityId: req.id,
      metadata: { reference: result.reference }, ...meta,
    });
    return { reference: result.reference, status: 'SUBMITTED' as const, statusLabel: STATUS_LABELS.SUBMITTED, submittedAt: result.submittedAt };
  }

  /** Une organisation ne peut pas avoir deux dossiers ouverts, ni redemander une première adhésion si elle est déjà membre. */
  private async assertNoConflict(requestId: string, type: 'FIRST' | 'RENEWAL', name: string, legalReference: string) {
    const open = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT id FROM membership_requests
      WHERE id <> ${requestId}::uuid AND status::text = ANY(${OPEN_STATUSES.filter((s) => s !== 'DRAFT')})
        AND (lower(data->'organization'->>'name') = lower(${name})
          OR lower(data->'organization'->>'legalReference') = lower(${legalReference}))
      LIMIT 1`;
    if (open.length) {
      throw new ConflictException({ code: 'DUPLICATE_REQUEST', message: 'Un dossier est déjà en cours d’examen pour cette organisation. Suivez-le avec sa référence ou contactez la CAPH-CI.' });
    }
    if (type === 'FIRST') {
      const member = await this.prisma.organization.findFirst({
        where: { archivedAt: null, OR: [{ name: { equals: name, mode: 'insensitive' } }, { legalReference: { equals: legalReference, mode: 'insensitive' } }] },
        select: { id: true },
      });
      if (member) {
        throw new ConflictException({ code: 'ALREADY_MEMBER', message: 'Cette organisation est déjà membre de la CAPH-CI. Pour continuer, choisissez « Renouvellement » ou contactez le Secrétariat Permanent.' });
      }
    }
  }

  async withdraw(id: string, code: string | undefined, meta: RequestMeta) {
    const req = await this.authorize(id, code);
    if (!['DRAFT', 'SUBMITTED', 'TO_COMPLETE'].includes(req.status)) {
      throw new ConflictException({ code: 'NOT_WITHDRAWABLE', message: 'Ce dossier ne peut plus être retiré. Contactez la CAPH-CI.' });
    }
    await this.prisma.$transaction([
      this.prisma.membershipRequest.update({ where: { id }, data: { status: 'WITHDRAWN', lastActionAt: new Date() } }),
      this.prisma.membershipEvent.create({ data: { requestId: id, actorType: 'APPLICANT', action: 'WITHDRAW', fromStatus: req.status, toStatus: 'WITHDRAWN' } }),
    ]);
    await this.audit.log({ action: 'membership.request.withdrawn', actorLabel: req.applicantEmail, entityType: 'MembershipRequest', entityId: id, ...meta });
    return { status: 'WITHDRAWN' as const, statusLabel: STATUS_LABELS.WITHDRAWN };
  }

  // ───────────────────────────────── Suivi public ─────────────────────────────────

  /** Ne révèle que : statut, messages de l'équipe, état des pièces, décision. Jamais le contenu du dossier. */
  async track(dto: TrackRequestDto) {
    const req = await this.prisma.membershipRequest.findUnique({
      where: { reference: dto.reference },
      include: {
        category: { select: { label: true, requiredDocuments: true } },
        documents: { where: { deletedAt: null }, select: { type: true, status: true, reviewNote: true } },
        events: { orderBy: { createdAt: 'asc' } },
        decisions: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    const expected = Buffer.from(req?.trackingTokenHash ?? '0'.repeat(64), 'hex');
    const given = Buffer.from(this.h(dto.code), 'hex');
    const ok = !!req && req.applicantEmail === dto.email && expected.length === given.length && timingSafeEqual(expected, given);
    if (!ok || !req) throw new NotFoundException(NOT_FOUND);

    const specs = this.docSpecs(req.category);
    const decision = req.decisions[0];
    return {
      reference: req.reference,
      category: req.category.label,
      status: req.status,
      statusLabel: STATUS_LABELS[req.status],
      canEdit: EDITABLE_STATUSES.includes(req.status),
      submittedAt: req.submittedAt,
      lastActionAt: req.lastActionAt,
      timeline: req.events
        .filter((e) => EVENT_LABELS[e.action])
        .map((e) => ({ date: e.createdAt, label: EVENT_LABELS[e.action] })),
      messages: req.events
        .filter((e) => e.actorType === 'STAFF' && e.comment && ['REQUEST_INFO', 'DECISION'].includes(e.action))
        .map((e) => ({ date: e.createdAt, text: e.comment })),
      documents: req.documents.map((d) => ({
        label: specs.find((s) => s.type === d.type)?.label ?? d.type,
        status: d.status,
        note: d.status === 'REJECTED' ? d.reviewNote : null,
      })),
      decision: decision
        ? { outcome: decision.outcome, outcomeLabel: OUTCOME_LABELS[decision.outcome], decidedAt: decision.decidedAt, motive: decision.motive }
        : null,
    };
  }

  // ───────────────────────────── Nettoyage des brouillons ─────────────────────────────

  /** Brouillons inactifs depuis 30 jours : retirés, données et fichiers effacés (minimisation des données). */
  @Cron('0 3 * * *')
  async purgeExpiredDrafts() {
    const limit = new Date(Date.now() - DRAFT_TTL_DAYS * 86_400_000);
    const drafts = await this.prisma.membershipRequest.findMany({
      where: { status: 'DRAFT', lastActionAt: { lt: limit } },
      include: { documents: { where: { deletedAt: null }, include: { file: true } } },
    });
    for (const d of drafts) {
      const now = new Date();
      await this.prisma.$transaction([
        this.prisma.membershipDocument.updateMany({ where: { requestId: d.id, deletedAt: null }, data: { deletedAt: now } }),
        this.prisma.fileAsset.updateMany({ where: { id: { in: d.documents.map((x) => x.fileId) } }, data: { deletedAt: now } }),
        this.prisma.membershipRequest.update({ where: { id: d.id }, data: { status: 'WITHDRAWN', data: {}, applicantPhone: null } }),
        this.prisma.membershipEvent.create({ data: { requestId: d.id, actorType: 'SYSTEM', action: 'DRAFT_EXPIRED', fromStatus: 'DRAFT', toStatus: 'WITHDRAWN' } }),
      ]);
      for (const doc of d.documents) await this.storage.remove(doc.file.storageKey).catch((e) => this.logger.warn(`Suppression fichier : ${e.message}`));
    }
    if (drafts.length) this.logger.log(`${drafts.length} brouillon(s) expiré(s) nettoyé(s)`);
    return drafts.length;
  }
}
