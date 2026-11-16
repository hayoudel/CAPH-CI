import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { FileAssetService } from '../storage/file-asset.service';
import { assertOwnerOrManager, creationReview, reviewScope } from '../common/utils/review';
import { CreateDocumentDto, ListDocumentsQueryDto, UpdateDocumentDto } from './dto/documents.dto';

const NOT_FOUND = { code: 'DOCUMENT_NOT_FOUND', message: 'Document introuvable.' };
const select = {
  id: true, title: true, description: true, category: true, accessLevel: true, isFeatured: true, publishedAt: true, archivedAt: true,
  reviewStatus: true, reviewNote: true, createdById: true, organization: { select: { id: true, name: true } },
  file: { select: { originalName: true, mimeType: true, sizeBytes: true } },
} as const;

/** Documents internes de la CAPH-CI (guides, formulaires, comptes rendus…), réservés aux membres connectés. */
@Injectable()
export class DocumentsService {
  constructor(private readonly prisma: PrismaService, private readonly files: FileAssetService, private readonly audit: AuditService) {}

  private manages = (u: AuthenticatedUser) => u.permissions.includes('document.manage');
  /** Le Consultant d'une OPH ne voit pas les documents réservés au Président et aux Contributeurs. */
  private seesContributorDocs = (u: AuthenticatedUser) =>
    !u.organizationId || ['OPH_PRESIDENT', 'OPH_DEPUTY', 'OPH_CONTRIBUTOR'].includes(u.organizationRole?.code ?? '');

  private visible(u: AuthenticatedUser, includeArchived = false): Prisma.InternalDocumentWhereInput {
    return {
      ...(this.manages(u) && includeArchived ? {} : { archivedAt: null }),
      ...(this.seesContributorDocs(u) ? {} : { accessLevel: 'MEMBERS' as const }),
      ...reviewScope(u, this.manages(u)),
    };
  }

  async list(u: AuthenticatedUser, q: ListDocumentsQueryDto) {
    const where: Prisma.InternalDocumentWhereInput = {
      AND: [
        this.visible(u, q.includeArchived),
        q.category ? { category: q.category } : {},
        q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { description: { contains: q.q, mode: 'insensitive' } }] } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.internalDocument.count({ where }),
      this.prisma.internalDocument.findMany({ where, select, orderBy: [{ isFeatured: 'desc' }, { publishedAt: 'desc' }], ...pageArgs(q) }),
    ]);
    return paginated(rows, total, q);
  }

  private async find(u: AuthenticatedUser, id: string) {
    const doc = await this.prisma.internalDocument.findFirst({ where: { id, ...this.visible(u, true) }, include: { file: true } });
    if (!doc) throw new NotFoundException(NOT_FOUND);
    return doc;
  }

  async get(u: AuthenticatedUser, id: string) {
    const { file, ...doc } = await this.find(u, id);
    return { ...doc, file: { originalName: file.originalName, mimeType: file.mimeType, sizeBytes: file.sizeBytes } };
  }

  async download(u: AuthenticatedUser, id: string) {
    return this.files.read((await this.find(u, id)).file);
  }

  async create(u: AuthenticatedUser, dto: CreateDocumentDto, file: Express.Multer.File | undefined) {
    const asset = await this.files.create(file, u.id);
    const manage = this.manages(u);
    // Document interne (jamais public) : publié tout de suite, sans validation. Une OPH ne choisit ni l'accès réservé ni la mise à la une.
    const own = manage ? dto : { ...dto, accessLevel: 'MEMBERS' as const, isFeatured: false };
    const doc = await this.prisma.internalDocument.create({
      data: { ...own, ...creationReview(u, manage, false), fileId: asset.id, createdById: u.id }, select,
    });
    await this.audit.log({ action: 'document.created', actorId: u.id, actorLabel: u.email, entityType: 'InternalDocument', entityId: doc.id, metadata: { reviewStatus: doc.reviewStatus } });
    return doc;
  }

  async update(u: AuthenticatedUser, id: string, dto: UpdateDocumentDto) {
    const cur = await this.find(u, id);
    assertOwnerOrManager(u, this.manages(u), cur);
    // Une OPH change le titre, la description et la catégorie ; l'accès réservé et la mise à la une restent au personnel.
    const data = this.manages(u) ? dto : { title: dto.title, description: dto.description, category: dto.category };
    const doc = await this.prisma.internalDocument.update({ where: { id }, data, select });
    await this.audit.log({ action: 'document.updated', actorId: u.id, actorLabel: u.email, entityType: 'InternalDocument', entityId: id });
    return doc;
  }

  /** « Supprimer » : le document disparaît pour tous ; le personnel peut le restaurer. */
  async remove(u: AuthenticatedUser, id: string) {
    const cur = await this.find(u, id);
    assertOwnerOrManager(u, this.manages(u), cur);
    await this.prisma.internalDocument.update({ where: { id }, data: { archivedAt: new Date() } });
    await this.audit.log({ action: 'document.deleted', actorId: u.id, actorLabel: u.email, entityType: 'InternalDocument', entityId: id });
  }

  async setArchived(u: AuthenticatedUser, id: string, archived: boolean) {
    await this.find(u, id);
    const doc = await this.prisma.internalDocument.update({ where: { id }, data: { archivedAt: archived ? new Date() : null }, select });
    await this.audit.log({ action: archived ? 'document.archived' : 'document.restored', actorId: u.id, actorLabel: u.email, entityType: 'InternalDocument', entityId: id });
    return doc;
  }
}
