import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsDate, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';
import { PERMISSIONS as P } from '../common/constants/permissions';
import { RequirePermissions } from '../common/decorators/permissions.decorator';
import { PaginationQueryDto, pageArgs, paginated } from '../common/dto/pagination.dto';
import { PrismaService } from '../prisma/prisma.service';

class AuditQueryDto extends PaginationQueryDto {
  @ApiPropertyOptional({ example: 'membership.', description: 'Début du code d’action (ex. membership., auth.login)' })
  @IsOptional() @IsString() @MaxLength(60) action?: string;
  @ApiPropertyOptional({ example: 'MembershipRequest' }) @IsOptional() @IsString() @MaxLength(60) entityType?: string;
  @ApiPropertyOptional() @IsOptional() @IsString() @MaxLength(60) entityId?: string;
  @ApiPropertyOptional() @IsOptional() @IsUUID() actorId?: string;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() from?: Date;
  @ApiPropertyOptional() @IsOptional() @Type(() => Date) @IsDate() to?: Date;
}

/** Consultation du journal d'audit (administrateur général). Le journal est en lecture seule : aucune modification possible. */
@ApiTags('Journal d’audit')
@ApiBearerAuth()
@Controller('admin/audit')
export class AuditAdminController {
  constructor(private readonly prisma: PrismaService) {}

  @Get() @RequirePermissions(P.AUDIT_READ)
  @ApiOperation({ summary: 'Journal d’audit (filtres : action, entité, auteur, dates)' })
  async list(@Query() q: AuditQueryDto) {
    const where = {
      ...(q.action ? { action: { startsWith: q.action } } : {}), ...(q.entityType ? { entityType: q.entityType } : {}),
      ...(q.entityId ? { entityId: q.entityId } : {}), ...(q.actorId ? { actorId: q.actorId } : {}),
      ...(q.from || q.to ? { createdAt: { ...(q.from ? { gte: q.from } : {}), ...(q.to ? { lte: new Date(q.to.getTime() + 86_399_999) } : {}) } } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.auditLog.count({ where }),
      this.prisma.auditLog.findMany({
        where, orderBy: { createdAt: 'desc' }, ...pageArgs(q),
        select: { id: true, createdAt: true, action: true, actorId: true, actorLabel: true, entityType: true, entityId: true, metadata: true, ip: true },
      }),
    ]);
    return paginated(rows, total, q);
  }
}
