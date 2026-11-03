import {
  BadRequestException, ForbiddenException, Injectable, NotFoundException, UnprocessableEntityException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { ListOrganizationsQueryDto, UpdateOrganizationDto, UpdateVisibilityDto } from './dto/organizations.dto';

const orgInclude = {
  region: { select: { id: true, name: true } },
  delegation: { select: { id: true, name: true } },
  domains: { select: { id: true, code: true, label: true }, orderBy: { sortOrder: 'asc' } },
  disabilityTypes: { select: { id: true, code: true, label: true }, orderBy: { sortOrder: 'asc' } },
  _count: { select: { members: true } },
} satisfies Prisma.OrganizationInclude;

const NOT_FOUND = { code: 'NOT_FOUND', message: 'Organisation introuvable.' };

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  /**
   * RÈGLE D'ISOLEMENT (centrale) : on ne voit une organisation que si c'est la sienne,
   * ou si l'on est du personnel dont le périmètre (global ou délégation) la couvre.
   * Sinon : 404 (on ne révèle même pas son existence).
   */
  async findReadable(user: AuthenticatedUser, id: string) {
    const org = await this.prisma.organization.findFirst({ where: { id, archivedAt: null }, include: orgInclude });
    if (!org) throw new NotFoundException(NOT_FOUND);
    const own = user.organizationId === id;
    const staff =
      user.permissions.includes('organization.read.all') &&
      (user.isGlobalScope || (!!org.delegationId && user.delegationIds.includes(org.delegationId)));
    if (!own && !staff) throw new NotFoundException(NOT_FOUND);
    return { org, own };
  }

  /** Écriture : uniquement sur SA propre OPH (ou administrateur général). Jamais sur celle d'un autre. */
  async findWritable(user: AuthenticatedUser, id: string) {
    const readable = await this.findReadable(user, id);
    if (!readable.own && !user.roleCodes.includes('ADMIN')) {
      throw new ForbiddenException({ code: 'FORBIDDEN', message: "Vous n'avez pas l'autorisation de modifier cette organisation." });
    }
    return readable.org;
  }

  async me(user: AuthenticatedUser) {
    if (!user.organizationId) {
      throw new NotFoundException({ code: 'NO_ORGANIZATION', message: "Aucune organisation n'est rattachée à votre compte." });
    }
    return this.view((await this.findReadable(user, user.organizationId)).org);
  }

  async get(user: AuthenticatedUser, id: string) {
    return this.view((await this.findReadable(user, id)).org);
  }

  private view(org: Prisma.OrganizationGetPayload<{ include: typeof orgInclude }>) {
    const { _count, ...rest } = org;
    return { ...rest, memberCount: _count.members };
  }

  async list(user: AuthenticatedUser, q: ListOrganizationsQueryDto) {
    const scope: Prisma.OrganizationWhereInput = user.isGlobalScope ? {} : { delegationId: { in: user.delegationIds } };
    const where: Prisma.OrganizationWhereInput = {
      ...scope,
      archivedAt: null,
      ...(q.status ? { status: q.status } : {}),
      ...(q.regionId ? { regionId: q.regionId } : {}),
      ...(q.delegationId ? { delegationId: q.delegationId } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { acronym: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({
        where, orderBy: { name: 'asc' }, ...pageArgs(q),
        select: {
          id: true, name: true, acronym: true, status: true, memberNumber: true, commune: true, isListed: true,
          region: { select: { name: true } }, delegation: { select: { name: true } },
        },
      }),
      this.prisma.organization.count({ where }),
    ]);
    return paginated(rows, total, q);
  }

  async update(user: AuthenticatedUser, id: string, dto: UpdateOrganizationDto) {
    const org = await this.findWritable(user, id);
    const { domainIds, disabilityTypeIds, regionId, ...fields } = dto;

    if (regionId && !(await this.prisma.region.findUnique({ where: { id: regionId } }))) {
      throw new BadRequestException({ code: 'INVALID_REFERENCE', message: 'Région inconnue.' });
    }
    await this.assertExist('interventionDomain', domainIds, 'Domaine d’intervention inconnu.');
    await this.assertExist('disabilityType', disabilityTypeIds, 'Type de handicap inconnu.');

    await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        ...fields,
        ...(regionId !== undefined ? { regionId } : {}),
        ...(domainIds ? { domains: { set: domainIds.map((d) => ({ id: d })) } } : {}),
        ...(disabilityTypeIds ? { disabilityTypes: { set: disabilityTypeIds.map((d) => ({ id: d })) } } : {}),
      },
    });
    await this.audit.log({
      action: 'organization.updated', actorId: user.id, entityType: 'Organization', entityId: org.id,
      metadata: { fields: Object.keys(dto) },
    });
    return this.get(user, id);
  }

  private async assertExist(model: 'interventionDomain' | 'disabilityType', ids: string[] | undefined, message: string) {
    if (!ids?.length) return;
    const unique = [...new Set(ids)];
    const count = await (this.prisma[model] as any).count({ where: { id: { in: unique } } });
    if (count !== unique.length) throw new BadRequestException({ code: 'INVALID_REFERENCE', message });
  }

  // ───────────────────────────── Visibilité (annuaire) ─────────────────────────────

  async getVisibility(user: AuthenticatedUser, id: string) {
    const { org } = await this.findReadable(user, id);
    return this.visibilityView(org);
  }

  private visibilityView(o: { isListed: boolean; publicationConsentAt: Date | null; publicEmail: string | null; publicPhone: string | null; fieldVisibility: Prisma.JsonValue }) {
    const v = (o.fieldVisibility ?? {}) as Record<string, boolean>;
    return {
      isListed: o.isListed,
      publicationConsent: !!o.publicationConsentAt,
      publicationConsentAt: o.publicationConsentAt,
      publicEmail: o.publicEmail,
      publicPhone: o.publicPhone,
      fieldVisibility: {
        publicEmail: !!v.publicEmail, publicPhone: !!v.publicPhone, postalAddress: !!v.postalAddress, website: !!v.website,
      },
    };
  }

  async updateVisibility(user: AuthenticatedUser, id: string, dto: UpdateVisibilityDto) {
    const org = await this.findWritable(user, id);

    let consentAt = org.publicationConsentAt;
    let isListed = dto.isListed ?? org.isListed;
    if (dto.publicationConsent === true && !consentAt) consentAt = new Date();
    if (dto.publicationConsent === false) { consentAt = null; isListed = false; } // retrait = retrait immédiat de l'annuaire
    if (isListed && !consentAt) {
      throw new UnprocessableEntityException({
        code: 'CONSENT_REQUIRED', message: "Le consentement de publication est nécessaire pour apparaître dans l'annuaire.",
      });
    }

    const current = (org.fieldVisibility ?? {}) as Record<string, boolean>;
    const fieldVisibility = { ...current, ...Object.fromEntries(Object.entries(dto.fieldVisibility ?? {}).filter(([, v]) => v !== undefined)) };

    const updated = await this.prisma.organization.update({
      where: { id: org.id },
      data: {
        isListed, publicationConsentAt: consentAt, fieldVisibility,
        ...(dto.publicEmail !== undefined ? { publicEmail: dto.publicEmail } : {}),
        ...(dto.publicPhone !== undefined ? { publicPhone: dto.publicPhone } : {}),
      },
    });
    await this.audit.log({
      action: 'organization.visibility.updated', actorId: user.id, entityType: 'Organization', entityId: org.id,
      metadata: { before: { isListed: org.isListed, ...current }, after: { isListed, ...fieldVisibility } },
    });
    return this.visibilityView(updated);
  }
}
