import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { DirectoryQueryDto } from './dto/directory.dto';
import { publicOrganizationSelect, toPublicOrganization } from './public-organization.mapper';

/** Une OPH n'est publique que si : active, non archivée, listée ET consentement enregistré. */
const PUBLIC_ONLY: Prisma.OrganizationWhereInput = {
  isListed: true, publicationConsentAt: { not: null }, status: 'ACTIVE', archivedAt: null,
};

@Injectable()
export class DirectoryService {
  constructor(private readonly prisma: PrismaService) {}

  async list(q: DirectoryQueryDto) {
    const where: Prisma.OrganizationWhereInput = {
      ...PUBLIC_ONLY,
      ...(q.regionId ? { regionId: q.regionId } : {}),
      ...(q.domainId ? { domains: { some: { id: q.domainId } } } : {}),
      ...(q.disabilityTypeId ? { disabilityTypes: { some: { id: q.disabilityTypeId } } } : {}),
      ...(q.q ? { OR: [{ name: { contains: q.q, mode: 'insensitive' } }, { acronym: { contains: q.q, mode: 'insensitive' } }] } : {}),
    };
    const [rows, total] = await this.prisma.$transaction([
      this.prisma.organization.findMany({ where, select: publicOrganizationSelect, orderBy: { name: 'asc' }, ...pageArgs(q) }),
      this.prisma.organization.count({ where }),
    ]);
    return paginated(rows.map(toPublicOrganization), total, q);
  }

  async get(id: string) {
    const org = await this.prisma.organization.findFirst({ where: { id, ...PUBLIC_ONLY }, select: publicOrganizationSelect });
    if (!org) throw new NotFoundException({ code: 'NOT_FOUND', message: 'Organisation introuvable.' });
    return toPublicOrganization(org);
  }

  /** Listes pour alimenter les filtres de recherche. */
  async filters() {
    const [regions, domains, disabilityTypes] = await this.prisma.$transaction([
      this.prisma.region.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }),
      this.prisma.interventionDomain.findMany({ select: { id: true, label: true }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.disabilityType.findMany({ select: { id: true, label: true }, orderBy: { sortOrder: 'asc' } }),
    ]);
    return { regions, domains, disabilityTypes };
  }
}
