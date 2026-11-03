import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { AuditService } from '../audit/audit.service';
import { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';
import { CreateEventDto, ListEventsQueryDto, UpdateEventDto } from './dto/events.dto';

const NOT_FOUND = { code: 'EVENT_NOT_FOUND', message: 'Événement introuvable.' };
const select = {
  id: true, type: true, title: true, description: true, startsAt: true, endsAt: true, mode: true, location: true, status: true, archivedAt: true,
  region: { select: { id: true, name: true } },
} as const;

/** Agenda : réunions, formations, assemblées… Un événement est « à venir » tant que sa fin (ou son début) n'est pas passée. */
@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService, private readonly audit: AuditService) {}

  private async list(base: Prisma.EventWhereInput, q: ListEventsQueryDto) {
    const now = new Date();
    const timeWhere: Prisma.EventWhereInput = q.past
      ? { OR: [{ endsAt: { lt: now } }, { endsAt: null, startsAt: { lt: now } }] }
      : { OR: [{ endsAt: { gte: q.from ?? now } }, { endsAt: null, startsAt: { gte: q.from ?? now } }] };
    const where: Prisma.EventWhereInput = {
      AND: [
        base, timeWhere,
        q.type ? { type: q.type } : {}, q.status ? { status: q.status } : {}, q.regionId ? { regionId: q.regionId } : {},
        q.to ? { startsAt: { lte: new Date(q.to.getTime() + 86_399_999) } } : {},
        q.q ? { OR: [{ title: { contains: q.q, mode: 'insensitive' } }, { location: { contains: q.q, mode: 'insensitive' } }] } : {},
      ],
    };
    const [total, rows] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({ where, select, orderBy: { startsAt: q.past ? 'desc' : 'asc' }, ...pageArgs(q) }),
    ]);
    return paginated(rows, total, q);
  }

  listForMembers(u: AuthenticatedUser, q: ListEventsQueryDto) {
    return this.list(u.permissions.includes('event.manage') && q.includeArchived ? {} : { archivedAt: null }, q);
  }
  listPublic(q: ListEventsQueryDto) { return this.list({ archivedAt: null, status: { not: 'CANCELLED' } }, { ...q, status: undefined }); }

  private async find(id: string, scope: Prisma.EventWhereInput = {}) {
    const e = await this.prisma.event.findFirst({ where: { id, ...scope }, select });
    if (!e) throw new NotFoundException(NOT_FOUND);
    return e;
  }
  get(u: AuthenticatedUser, id: string) { return this.find(id, u.permissions.includes('event.manage') ? {} : { archivedAt: null }); }

  private check(startsAt: Date, endsAt?: Date | null) {
    if (endsAt && endsAt.getTime() < startsAt.getTime()) {
      throw new UnprocessableEntityException({ code: 'INVALID_DATES', message: 'La fin de l’événement ne peut pas précéder son début.' });
    }
  }
  private async checkRegion(regionId?: string) {
    if (regionId && !(await this.prisma.region.findUnique({ where: { id: regionId } }))) {
      throw new UnprocessableEntityException({ code: 'INVALID_REFERENCE', message: 'Région inconnue.' });
    }
  }

  async create(u: AuthenticatedUser, dto: CreateEventDto) {
    this.check(dto.startsAt, dto.endsAt);
    await this.checkRegion(dto.regionId);
    const e = await this.prisma.event.create({ data: { ...dto, createdById: u.id }, select });
    await this.audit.log({ action: 'event.created', actorId: u.id, actorLabel: u.email, entityType: 'Event', entityId: e.id });
    return e;
  }

  async update(u: AuthenticatedUser, id: string, dto: UpdateEventDto) {
    const cur = await this.find(id);
    this.check(dto.startsAt ?? cur.startsAt, dto.endsAt ?? cur.endsAt);
    await this.checkRegion(dto.regionId);
    const e = await this.prisma.event.update({ where: { id }, data: dto, select });
    await this.audit.log({ action: 'event.updated', actorId: u.id, actorLabel: u.email, entityType: 'Event', entityId: id });
    return e;
  }

  async setState(u: AuthenticatedUser, id: string, action: 'cancel' | 'archive' | 'restore') {
    await this.find(id);
    const data: Prisma.EventUpdateInput = action === 'cancel' ? { status: 'CANCELLED' } : action === 'archive' ? { archivedAt: new Date() } : { archivedAt: null };
    const e = await this.prisma.event.update({ where: { id }, data, select });
    await this.audit.log({ action: `event.${action}`, actorId: u.id, actorLabel: u.email, entityType: 'Event', entityId: id });
    return e;
  }
}
